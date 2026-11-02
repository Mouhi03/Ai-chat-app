"""
Fournisseurs d'IA : Google Gemini (API cloud) et Ollama (modèles locaux).

Les deux fournisseurs exposent la même interface :
    chat(model, system, messages, opts, stream)  -> générateur de morceaux de texte
    list_models(...)                             -> [{"id": str, "vision": bool}]
    test(...)                                    -> dict décrivant l'état de la connexion

Format neutre des messages :
    {"role": "user" | "assistant", "text": str, "images": [{"mime": str, "data": bytes}]}
"""

import base64
import json

import requests


class ProviderError(Exception):
    """Erreur normalisée : `code` est traduit côté interface, `detail` est technique."""

    def __init__(self, code, detail=""):
        super().__init__(detail or code)
        self.code = code
        self.detail = detail


class ThinkFilter:
    """Retire les blocs <think>...</think> que certains modèles locaux insèrent dans le texte."""

    OPEN, CLOSE = "<think>", "</think>"

    def __init__(self):
        self.buf = ""
        self.inside = False

    def feed(self, text):
        self.buf += text
        out = ""
        while True:
            if self.inside:
                end = self.buf.find(self.CLOSE)
                if end == -1:
                    self.buf = self.buf[-(len(self.CLOSE) - 1):]
                    return out
                self.buf = self.buf[end + len(self.CLOSE):].lstrip("\n")
                self.inside = False
            else:
                start = self.buf.find(self.OPEN)
                if start != -1:
                    out += self.buf[:start]
                    self.buf = self.buf[start + len(self.OPEN):]
                    self.inside = True
                    continue
                hold = 0
                for n in range(min(len(self.OPEN) - 1, len(self.buf)), 0, -1):
                    if self.OPEN.startswith(self.buf[-n:]):
                        hold = n
                        break
                out += self.buf[: len(self.buf) - hold]
                self.buf = self.buf[len(self.buf) - hold:]
                return out

    def flush(self):
        out = "" if self.inside else self.buf
        self.buf = ""
        return out


# --------------------------------------------------------------------------- #
# Google Gemini
# --------------------------------------------------------------------------- #
class GeminiProvider:
    name = "gemini"

    def __init__(self, api_key=None):
        self.api_key = api_key
        self._client = None

    @property
    def configured(self):
        return bool(self.api_key)

    def _make_client(self, key):
        from google import genai

        return genai.Client(api_key=key)

    def client(self):
        if not self.api_key:
            raise ProviderError("no_key")
        if self._client is None:
            self._client = self._make_client(self.api_key)
        return self._client

    def set_key(self, key):
        self.api_key = key or None
        self._client = None

    def validate(self, key):
        """Vérifie qu'une clé est acceptée par Google (lève ProviderError sinon)."""
        client = self._make_client(key)
        try:
            next(iter(client.models.list()), None)
        except Exception as exc:  # noqa: BLE001
            raise self.map_error(exc) from exc

    @staticmethod
    def map_error(exc):
        msg = str(exc)
        low = msg.lower()
        code = getattr(exc, "code", None)
        if "api key not valid" in low or "api_key_invalid" in low or code in (401, 403):
            return ProviderError("bad_key", msg[:300])
        if code == 404 or "not_found" in low or "is not found" in low:
            return ProviderError("model_not_found", msg[:300])
        if code == 429 or "resource_exhausted" in low or "quota" in low:
            return ProviderError("quota", msg[:300])
        if code == 413 or "too large" in low:
            return ProviderError("too_large", msg[:300])
        if "connecterror" in type(exc).__name__.lower() or "connection" in low or "name resolution" in low:
            return ProviderError("network", msg[:300])
        return ProviderError("generic", msg[:300])

    def chat(self, model, system, messages, opts, stream=True):
        from google.genai import types

        client = self.client()
        contents = []
        for m in messages:
            parts = [
                types.Part.from_bytes(data=i["data"], mime_type=i["mime"])
                for i in m.get("images", [])
            ]
            parts.append(types.Part.from_text(text=m["text"] or " "))
            contents.append(
                types.Content(role="user" if m["role"] == "user" else "model", parts=parts)
            )
        config = types.GenerateContentConfig(
            system_instruction=system,
            temperature=opts["temperature"],
            max_output_tokens=opts["max_tokens"],
        )
        try:
            if stream:
                for chunk in client.models.generate_content_stream(
                    model=model, contents=contents, config=config
                ):
                    text = chunk.text or ""
                    if text:
                        yield text
            else:
                resp = client.models.generate_content(model=model, contents=contents, config=config)
                if resp.text:
                    yield resp.text
        except ProviderError:
            raise
        except Exception as exc:  # noqa: BLE001
            raise self.map_error(exc) from exc

    def list_models(self):
        client = self.client()
        try:
            names = sorted(
                m.name.replace("models/", "")
                for m in client.models.list()
                if "gemini" in m.name
                and "generateContent" in (getattr(m, "supported_actions", None) or [])
            )
        except Exception as exc:  # noqa: BLE001
            raise self.map_error(exc) from exc
        banned = ("embed", "tts", "image", "live", "audio", "robotics", "computer-use")
        return [{"id": n, "vision": True} for n in names if not any(b in n.lower() for b in banned)]

    def test(self):
        if not self.configured:
            return {"ok": False, "code": "no_key"}
        models = self.list_models()
        return {"ok": True, "detail": f"{len(models)}"}


# --------------------------------------------------------------------------- #
# Ollama (local)
# --------------------------------------------------------------------------- #
VISION_NAME_HINTS = ("llava", "vision", "-vl", "vl:", "bakllava", "moondream", "minicpm-v", "gemma3", "gemma4")


class OllamaProvider:
    name = "ollama"

    def __init__(self):
        self._caps = {}

    @staticmethod
    def _url(host, path):
        return host.rstrip("/") + path

    def version(self, host):
        try:
            r = requests.get(self._url(host, "/api/version"), timeout=(2, 4))
            r.raise_for_status()
            return r.json().get("version", "")
        except requests.RequestException as exc:
            raise ProviderError("ollama_unreachable", host) from exc

    def capabilities(self, host, model):
        key = (host, model)
        if key in self._caps:
            return self._caps[key]
        caps = None
        try:
            r = requests.post(self._url(host, "/api/show"), json={"model": model}, timeout=(2, 8))
            if r.status_code == 404:
                raise ProviderError("ollama_model_missing", model)
            if r.status_code == 200:
                caps = r.json().get("capabilities")
        except requests.RequestException as exc:
            raise ProviderError("ollama_unreachable", host) from exc
        if caps is None:  # anciennes versions d'Ollama : heuristique sur le nom
            low = model.lower()
            caps = [] if "embed" in low else ["completion"]
            if any(h in low for h in VISION_NAME_HINTS):
                caps.append("vision")
        self._caps[key] = set(caps)
        return self._caps[key]

    def list_models(self, host):
        try:
            r = requests.get(self._url(host, "/api/tags"), timeout=(2, 6))
            r.raise_for_status()
            names = sorted(m.get("name") or m.get("model") for m in r.json().get("models", []))
        except requests.RequestException as exc:
            raise ProviderError("ollama_unreachable", host) from exc
        out = []
        for n in names:
            caps = self.capabilities(host, n)
            if "completion" in caps:
                out.append({"id": n, "vision": "vision" in caps})
        return out

    def test(self, host):
        version = self.version(host)
        models = self.list_models(host)
        return {"ok": True, "detail": version, "count": len(models)}

    @staticmethod
    def _http_error(resp, model):
        try:
            msg = resp.json().get("error", "") or resp.text
        except ValueError:
            msg = resp.text
        low = msg.lower()
        if resp.status_code == 404 or ("model" in low and "not found" in low):
            return ProviderError("ollama_model_missing", model)
        if "image" in low and ("not support" in low or "does not" in low):
            return ProviderError("vision_unsupported", model)
        return ProviderError("generic", msg[:300])

    def chat(self, model, system, messages, opts, stream=True):
        host = opts["host"]
        has_images = any(m.get("images") for m in messages)
        if has_images and "vision" not in self.capabilities(host, model):
            raise ProviderError("vision_unsupported", model)

        payload_messages = [{"role": "system", "content": system}]
        for m in messages:
            item = {"role": m["role"], "content": m["text"]}
            if m.get("images"):
                item["images"] = [base64.b64encode(i["data"]).decode() for i in m["images"]]
            payload_messages.append(item)

        payload = {
            "model": model,
            "messages": payload_messages,
            "stream": bool(stream),
            "options": {
                "temperature": opts["temperature"],
                "num_predict": opts["max_tokens"],
                "num_ctx": opts["num_ctx"],
            },
        }
        filt = ThinkFilter()
        try:
            with requests.post(
                self._url(host, "/api/chat"), json=payload, stream=bool(stream), timeout=(5, 600)
            ) as resp:
                if resp.status_code != 200:
                    raise self._http_error(resp, model)
                if stream:
                    for line in resp.iter_lines():
                        if not line:
                            continue
                        obj = json.loads(line)
                        if obj.get("error"):
                            raise ProviderError("generic", str(obj["error"])[:300])
                        piece = (obj.get("message") or {}).get("content") or ""
                        if piece:
                            out = filt.feed(piece)
                            if out:
                                yield out
                else:
                    piece = (resp.json().get("message") or {}).get("content") or ""
                    out = filt.feed(piece)
                    if out:
                        yield out
            tail = filt.flush()
            if tail:
                yield tail
        except ProviderError:
            raise
        except requests.ConnectionError as exc:
            raise ProviderError("ollama_unreachable", host) from exc
        except requests.Timeout as exc:
            raise ProviderError("timeout", host) from exc
        except (requests.RequestException, ValueError) as exc:
            raise ProviderError("generic", str(exc)[:300]) from exc
