"""
AI Chat - backend Flask.

- Deux fournisseurs interchangeables : Google Gemini (API) ou Ollama (local)
- Conversations multiples, streaming (Server-Sent Events), images
- Paramètres persistants, mémoire long terme
"""

import base64
import json
import mimetypes
import os
import re
import threading
import time
import uuid
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
from flask import (
    Flask,
    Response,
    abort,
    jsonify,
    render_template,
    request,
    send_from_directory,
    stream_with_context,
)

from providers import GeminiProvider, OllamaProvider, ProviderError

load_dotenv()

BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = Path(os.getenv("DATA_DIR", BASE_DIR / "data"))
UPLOAD_DIR = DATA_DIR / "uploads"
DATA_DIR.mkdir(parents=True, exist_ok=True)
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

CHATS_FILE = DATA_DIR / "chats.json"
MEMORY_FILE = DATA_DIR / "memory.json"
SETTINGS_FILE = DATA_DIR / "settings.json"
SECRETS_FILE = DATA_DIR / "secrets.json"  # clé API saisie dans l'interface (jamais renvoyée au navigateur)

MAX_IMAGES_PER_MESSAGE = 3
MAX_IMAGE_BYTES = 3 * 1024 * 1024
ALLOWED_IMAGE_TYPES = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif"}

app = Flask(__name__)
app.config["MAX_CONTENT_LENGTH"] = 25 * 1024 * 1024
_lock = threading.RLock()


# --------------------------------------------------------------------------- #
# Configuration & fournisseurs
# --------------------------------------------------------------------------- #
def normalize_host(raw):
    """Accepte 'localhost:11434', '0.0.0.0:11434' ou une URL complète (convention OLLAMA_HOST)."""
    raw = (raw or "").strip() or "http://localhost:11434"
    if not re.match(r"^https?://", raw):
        raw = "http://" + raw
    raw = raw.replace("://0.0.0.0", "://localhost").rstrip("/")
    return raw


ENV_GEMINI_KEY = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
DEFAULT_OLLAMA_HOST = normalize_host(os.getenv("OLLAMA_HOST"))
KEY_RE = re.compile(r"[A-Za-z0-9_\-]{20,128}")


def read_secrets():
    try:
        with open(SECRETS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return {}


def write_secrets(data):
    tmp = Path(str(SECRETS_FILE) + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f)
    try:
        os.chmod(tmp, 0o600)  # lisible uniquement par l'utilisateur (ignoré sous Windows)
    except OSError:
        pass
    os.replace(tmp, SECRETS_FILE)


def active_gemini_key():
    """Priorité à la clé saisie dans l'interface, sinon celle du fichier .env."""
    saved = read_secrets().get("gemini_api_key")
    if saved:
        return saved, "app"
    if ENV_GEMINI_KEY:
        return ENV_GEMINI_KEY, "env"
    return None, None


def mask_key(key):
    return "..." + key[-4:] if key else ""


def default_provider():
    wanted = os.getenv("DEFAULT_PROVIDER", "").strip().lower()
    if wanted in ("gemini", "ollama"):
        return wanted
    return "gemini" if active_gemini_key()[0] else "ollama"


gemini = GeminiProvider(None)


def apply_gemini_key():
    key, source = active_gemini_key()
    gemini.set_key(key)
    return key, source


apply_gemini_key()
ollama = OllamaProvider()
PROVIDERS = {"gemini": gemini, "ollama": ollama}

GEMINI_FALLBACK_MODELS = ["gemini-3.5-flash", "gemini-3-flash-preview"]

PERSONALITIES = {
    "balanced": "Be clear, helpful and well structured. Adapt the length to the question.",
    "concise": (
        "Keep answers concise and easy to read. Use short paragraphs (1-2 lines max) "
        "and bullet points when possible. Avoid walls of text."
    ),
    "friendly": "Be warm, casual and encouraging, like a friendly companion.",
    "teacher": (
        "Act as a patient teacher: explain step by step, use simple examples and "
        "check understanding with a short question at the end when relevant."
    ),
    "developer": (
        "Act as a senior software engineer: give precise, practical answers, "
        "show code in fenced code blocks and mention edge cases briefly."
    ),
}

DEFAULT_SETTINGS = {
    "ui_language": "auto",  # auto | fr | en
    "theme": "dark",  # dark | light | auto
    "accent": "#3b82f6",
    "font_size": 15,
    "provider": default_provider(),  # gemini | ollama
    "gemini_model": os.getenv("GEMINI_MODEL", "gemini-3.5-flash"),
    "ollama_host": DEFAULT_OLLAMA_HOST,
    "ollama_model": os.getenv("OLLAMA_MODEL", ""),  # vide = premier modèle installé
    "ollama_vision_model": os.getenv("OLLAMA_VISION_MODEL", ""),  # vide = même modèle
    "num_ctx": 8192,
    "temperature": 0.7,
    "max_tokens": 4096,
    "context_messages": 20,
    "personality": "balanced",
    "custom_prompt": "",
    "reply_language": "auto",
    "user_name": "",
    "stream": True,
    "use_memory": True,
}


# --------------------------------------------------------------------------- #
# Stockage JSON (écriture atomique + verrou)
# --------------------------------------------------------------------------- #
def load_json(path, default):
    try:
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def save_json(path, data):
    tmp = Path(str(path) + ".tmp")
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    os.replace(tmp, path)


def now_ts():
    return int(time.time() * 1000)


def new_id():
    return uuid.uuid4().hex[:12]


def make_title(text):
    text = re.sub(r"\s+", " ", text or "").strip()
    if not text:
        return "New chat"
    return text[:48] + ("..." if len(text) > 48 else "")


def get_settings():
    saved = load_json(SETTINGS_FILE, {})
    merged = dict(DEFAULT_SETTINGS)
    merged.update({k: v for k, v in saved.items() if k in DEFAULT_SETTINGS})
    merged["ollama_host"] = normalize_host(merged["ollama_host"])
    return merged


MODEL_RE = r"[\w./:@+-]{0,120}"


def sanitize_settings(incoming):
    out = get_settings()

    def pick(key, allowed):
        if incoming.get(key) in allowed:
            out[key] = incoming[key]

    pick("ui_language", {"auto", "fr", "en"})
    pick("theme", {"dark", "light", "auto"})
    pick("provider", {"gemini", "ollama"})
    pick("reply_language", {"auto", "fr", "en", "es", "ar", "de"})
    pick("personality", set(PERSONALITIES) | {"custom"})

    accent = incoming.get("accent")
    if isinstance(accent, str) and re.fullmatch(r"#[0-9a-fA-F]{6}", accent):
        out["accent"] = accent

    for key, (lo, hi, cast) in {
        "font_size": (12, 20, int),
        "temperature": (0.0, 1.5, float),
        "max_tokens": (256, 8192, int),
        "context_messages": (2, 60, int),
        "num_ctx": (2048, 131072, int),
    }.items():
        if key in incoming:
            try:
                out[key] = max(lo, min(hi, cast(incoming[key])))
            except (TypeError, ValueError):
                pass

    for key in ("gemini_model", "ollama_model", "ollama_vision_model"):
        val = incoming.get(key)
        if isinstance(val, str) and re.fullmatch(MODEL_RE, val):
            out[key] = val
    if isinstance(incoming.get("ollama_host"), str) and re.fullmatch(
        r"(https?://)?[\w.\-]+(:\d{1,5})?/?", incoming["ollama_host"].strip()
    ):
        out["ollama_host"] = normalize_host(incoming["ollama_host"])

    if isinstance(incoming.get("custom_prompt"), str):
        out["custom_prompt"] = incoming["custom_prompt"][:2000]
    if isinstance(incoming.get("user_name"), str):
        out["user_name"] = incoming["user_name"].strip()[:50]
    for key in ("stream", "use_memory"):
        if isinstance(incoming.get(key), bool):
            out[key] = incoming[key]
    return out


def public_chat(chat, with_messages=True):
    data = {
        "id": chat["id"],
        "title": chat["title"],
        "created": chat["created"],
        "updated": chat["updated"],
        "count": len(chat["messages"]),
    }
    if with_messages:
        data["messages"] = chat["messages"]
    return data


def error_response(code, status=400, detail=""):
    return jsonify({"error": detail or code, "code": code}), status


# --------------------------------------------------------------------------- #
# Migration depuis les anciennes versions
# --------------------------------------------------------------------------- #
def migrate_legacy():
    """Importe le tout premier format (chats.json à la racine, lignes "User: ...")."""
    legacy = BASE_DIR / "chats.json"
    if CHATS_FILE.exists() or not legacy.exists():
        return
    old = load_json(legacy, {})
    chats = {}
    for _, lines in old.items():
        if not isinstance(lines, list) or not lines:
            continue
        messages = []
        for line in lines:
            if not isinstance(line, str):
                continue
            if line.startswith("User: "):
                messages.append({"id": new_id(), "role": "user", "content": line[6:], "images": [], "ts": now_ts()})
            elif line.startswith("AI: "):
                messages.append({"id": new_id(), "role": "assistant", "content": line[4:], "images": [], "ts": now_ts()})
        if messages:
            cid = new_id()
            chats[cid] = {
                "id": cid,
                "title": make_title(messages[0]["content"]),
                "created": now_ts(),
                "updated": now_ts(),
                "messages": messages,
            }
    if chats:
        save_json(CHATS_FILE, chats)
    old_memory = load_json(BASE_DIR / "long-term.json", None)
    if old_memory is None:
        old_memory = load_json(BASE_DIR / "long_term.json", [])
    if old_memory and not MEMORY_FILE.exists():
        save_json(MEMORY_FILE, [{"id": new_id(), "text": t} for t in old_memory if isinstance(t, str)])


migrate_legacy()


# --------------------------------------------------------------------------- #
# Images
# --------------------------------------------------------------------------- #
DATA_URL_RE = re.compile(r"^data:(image/[a-zA-Z+.-]+);base64,(.+)$", re.DOTALL)


def save_image_from_data_url(data_url):
    match = DATA_URL_RE.match(data_url or "")
    if not match:
        raise ValueError("bad_image")
    mime, b64 = match.group(1).lower(), match.group(2)
    if mime not in ALLOWED_IMAGE_TYPES:
        raise ValueError("bad_image")
    try:
        raw = base64.b64decode(b64, validate=True)
    except Exception:  # noqa: BLE001
        raise ValueError("bad_image")
    if len(raw) > MAX_IMAGE_BYTES:
        raise ValueError("image_too_large")
    name = f"{new_id()}.{ALLOWED_IMAGE_TYPES[mime]}"
    (UPLOAD_DIR / name).write_bytes(raw)
    return name


@app.route("/uploads/<path:filename>")
def uploads(filename):
    return send_from_directory(UPLOAD_DIR, filename)


# --------------------------------------------------------------------------- #
# Construction du prompt
# --------------------------------------------------------------------------- #
LANG_NAMES = {"fr": "French", "en": "English", "es": "Spanish", "ar": "Arabic", "de": "German"}


def build_system_prompt(settings):
    parts = ["You are a helpful AI assistant inside a chat web app. Use Markdown when it helps readability."]
    if settings["personality"] == "custom" and settings["custom_prompt"].strip():
        parts.append(settings["custom_prompt"].strip())
    else:
        parts.append(PERSONALITIES.get(settings["personality"], PERSONALITIES["balanced"]))

    if settings["reply_language"] in LANG_NAMES:
        parts.append(f"Always answer in {LANG_NAMES[settings['reply_language']]}.")
    else:
        parts.append("Answer in the same language as the user's last message.")

    if settings["user_name"]:
        parts.append(f"The user's name is {settings['user_name']}.")

    if settings["use_memory"]:
        facts = [m["text"] for m in load_json(MEMORY_FILE, []) if isinstance(m, dict)]
        if facts:
            parts.append("Things you know about the user:\n" + "\n".join(f"- {f}" for f in facts))

    parts.append(f"Current date: {datetime.now().strftime('%A %d %B %Y')}.")
    return "\n\n".join(parts)


def build_history(chat, settings):
    """Historique -> format neutre. Les images de la dernière question illustrée
    restent jointes pour permettre les questions de suivi."""
    visible = [m for m in chat["messages"] if not m.get("kind")]
    history = visible[-settings["context_messages"]:]
    last_image_idx = max(
        (i for i, m in enumerate(history) if m["role"] == "user" and m.get("images")),
        default=None,
    )
    out, has_images = [], False
    for i, m in enumerate(history):
        item = {"role": m["role"], "text": m["content"], "images": []}
        if m["role"] == "user" and m.get("images"):
            if i == last_image_idx:
                for f in m["images"]:
                    path = UPLOAD_DIR / Path(f).name
                    if path.exists():
                        mime = mimetypes.guess_type(path.name)[0] or "image/jpeg"
                        item["images"].append({"mime": mime, "data": path.read_bytes()})
                        has_images = True
                if not item["text"]:
                    item["text"] = "Describe this image."
            else:
                item["text"] = (item["text"] + "\n" if item["text"] else "") + "[image sent earlier]"
        out.append(item)
    return out, has_images


def pick_model(settings, has_images):
    if settings["provider"] == "gemini":
        return settings["gemini_model"]
    main = settings["ollama_model"]
    if not main:
        models = ollama.list_models(settings["ollama_host"])
        if not models:
            raise ProviderError("ollama_no_models", settings["ollama_host"])
        main = models[0]["id"]
    if has_images:
        return settings["ollama_vision_model"] or main
    return main


# --------------------------------------------------------------------------- #
# Pages & état
# --------------------------------------------------------------------------- #
@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/providers")
def providers_status():
    settings = get_settings()
    key, source = active_gemini_key()
    info = {
        "gemini": {"configured": gemini.configured, "source": source, "masked": mask_key(key)},
        "ollama": {"host": settings["ollama_host"]},
    }
    try:
        info["ollama"]["version"] = ollama.version(settings["ollama_host"])
        info["ollama"]["reachable"] = True
    except ProviderError:
        info["ollama"]["reachable"] = False
    return jsonify(info)


@app.route("/api/providers/test", methods=["POST"])
def providers_test():
    body = request.get_json(silent=True) or {}
    settings = get_settings()
    name = body.get("provider") or settings["provider"]
    host = normalize_host(body.get("host") or settings["ollama_host"])
    try:
        if name == "gemini":
            result = gemini.test()
        elif name == "ollama":
            result = ollama.test(host)
        else:
            return error_response("bad_request")
        return jsonify(result)
    except ProviderError as exc:
        return jsonify({"ok": False, "code": exc.code, "detail": exc.detail})


@app.route("/api/providers/gemini/key", methods=["PUT"])
def set_gemini_key():
    """Enregistre une clé saisie dans l'interface, après l'avoir vérifiée auprès de Google."""
    key = ((request.get_json(silent=True) or {}).get("key") or "").strip()
    if not KEY_RE.fullmatch(key):
        return error_response("bad_key_format")
    try:
        gemini.validate(key)
    except ProviderError as exc:
        return error_response(exc.code, 400, exc.detail)
    with _lock:
        secrets = read_secrets()
        secrets["gemini_api_key"] = key
        write_secrets(secrets)
        apply_gemini_key()
    return jsonify({"ok": True, "source": "app", "masked": mask_key(key)})


@app.route("/api/providers/gemini/key", methods=["DELETE"])
def delete_gemini_key():
    """Supprime la clé saisie dans l'interface (la clé du .env, si elle existe, reprend le relais)."""
    with _lock:
        secrets = read_secrets()
        secrets.pop("gemini_api_key", None)
        write_secrets(secrets)
        key, source = apply_gemini_key()
    return jsonify({"ok": True, "source": source, "masked": mask_key(key)})


@app.route("/api/models")
def models():
    settings = get_settings()
    name = request.args.get("provider") or settings["provider"]
    host = normalize_host(request.args.get("host") or settings["ollama_host"])
    try:
        if name == "gemini":
            if not gemini.configured:
                return jsonify({"models": [{"id": m, "vision": True} for m in GEMINI_FALLBACK_MODELS], "live": False, "code": "no_key"})
            return jsonify({"models": gemini.list_models(), "live": True})
        if name == "ollama":
            return jsonify({"models": ollama.list_models(host), "live": True})
    except ProviderError as exc:
        fallback = [{"id": m, "vision": True} for m in GEMINI_FALLBACK_MODELS] if name == "gemini" else []
        return jsonify({"models": fallback, "live": False, "code": exc.code})
    return error_response("bad_request")


# --------------------------------------------------------------------------- #
# Conversations
# --------------------------------------------------------------------------- #
@app.route("/api/chats", methods=["GET"])
def list_chats():
    with _lock:
        chats = load_json(CHATS_FILE, {})
    items = sorted(chats.values(), key=lambda c: c["updated"], reverse=True)
    return jsonify([public_chat(c, with_messages=False) for c in items])


@app.route("/api/chats", methods=["POST"])
def create_chat():
    with _lock:
        chats = load_json(CHATS_FILE, {})
        cid = new_id()
        chats[cid] = {"id": cid, "title": "New chat", "created": now_ts(), "updated": now_ts(), "messages": []}
        save_json(CHATS_FILE, chats)
    return jsonify(public_chat(chats[cid]))


@app.route("/api/chats/<cid>", methods=["GET"])
def get_chat(cid):
    with _lock:
        chats = load_json(CHATS_FILE, {})
    if cid not in chats:
        abort(404)
    return jsonify(public_chat(chats[cid]))


@app.route("/api/chats/<cid>", methods=["PATCH"])
def rename_chat(cid):
    title = ((request.get_json(silent=True) or {}).get("title") or "").strip()[:80]
    if not title:
        return error_response("empty_title")
    with _lock:
        chats = load_json(CHATS_FILE, {})
        if cid not in chats:
            abort(404)
        chats[cid]["title"] = title
        save_json(CHATS_FILE, chats)
    return jsonify(public_chat(chats[cid], with_messages=False))


@app.route("/api/chats/<cid>", methods=["DELETE"])
def delete_chat(cid):
    with _lock:
        chats = load_json(CHATS_FILE, {})
        chat = chats.pop(cid, None)
        if chat is None:
            abort(404)
        save_json(CHATS_FILE, chats)
        used = {f for c in chats.values() for m in c["messages"] for f in m.get("images", [])}
        for m in chat["messages"]:
            for f in m.get("images", []):
                if f not in used:
                    (UPLOAD_DIR / Path(f).name).unlink(missing_ok=True)
    return jsonify({"ok": True})


@app.route("/api/chats/<cid>/export")
def export_chat(cid):
    with _lock:
        chats = load_json(CHATS_FILE, {})
    if cid not in chats:
        abort(404)
    chat = chats[cid]
    fr = request.args.get("lang") == "fr"
    names = {"user": "Vous" if fr else "You", "assistant": "Assistant"}
    lines = [f"# {chat['title']}", ""]
    for m in chat["messages"]:
        stamp = datetime.fromtimestamp(m["ts"] / 1000).strftime("%Y-%m-%d %H:%M")
        lines += [f"**{names[m['role']]}** - {stamp}", ""]
        if m.get("images"):
            lines += [f"_({len(m['images'])} image(s))_", ""]
        lines += [m["content"], "", "---", ""]
    filename = re.sub(r"[^\w-]+", "_", chat["title"]).strip("_") or "conversation"
    return Response(
        "\n".join(lines),
        mimetype="text/markdown; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}.md"'},
    )


# --------------------------------------------------------------------------- #
# Envoi d'un message (streaming SSE)
# --------------------------------------------------------------------------- #
def sse(payload):
    return f"data: {json.dumps(payload, ensure_ascii=False)}\n\n"


MEMORY_RE = re.compile(r"^\s*(remember|retiens|souviens-toi)\s*:\s*(.+)$", re.IGNORECASE | re.DOTALL)


@app.route("/api/chats/<cid>/messages", methods=["POST"])
def send_message(cid):
    body = request.get_json(silent=True) or {}
    text = (body.get("text") or "").strip()
    images_in = body.get("images") or []
    regenerate = bool(body.get("regenerate"))
    settings = get_settings()

    if settings["provider"] == "gemini" and not gemini.configured:
        return error_response("no_key")
    if not regenerate and not text and not images_in:
        return error_response("empty_message")
    if len(text) > 12000:
        return error_response("too_long")
    if not isinstance(images_in, list) or len(images_in) > MAX_IMAGES_PER_MESSAGE:
        return error_response("too_many_images")

    with _lock:
        chats = load_json(CHATS_FILE, {})
        if cid not in chats:
            return error_response("chat_not_found", 404)
        chat = chats[cid]

        if regenerate:
            while chat["messages"] and chat["messages"][-1]["role"] == "assistant":
                chat["messages"].pop()
            if not chat["messages"]:
                return error_response("nothing_to_regenerate")
            user_msg = chat["messages"][-1]
        else:
            match = MEMORY_RE.match(text) if not images_in else None
            if match:
                fact = match.group(2).strip()[:300]
                memory = load_json(MEMORY_FILE, [])
                memory.append({"id": new_id(), "text": fact})
                save_json(MEMORY_FILE, memory)
                chat["messages"].append({"id": new_id(), "role": "user", "content": text, "images": [], "ts": now_ts(), "kind": "memory_cmd"})
                chat["messages"].append({"id": new_id(), "role": "assistant", "content": fact, "images": [], "ts": now_ts(), "kind": "memory"})
                chat["updated"] = now_ts()
                if len(chat["messages"]) == 2:
                    chat["title"] = make_title(text)
                save_json(CHATS_FILE, chats)
                return jsonify({"memory": True, "chat": public_chat(chat)})

            try:
                saved = [save_image_from_data_url(u) for u in images_in]
            except ValueError as e:
                return error_response(str(e))
            user_msg = {"id": new_id(), "role": "user", "content": text, "images": saved, "ts": now_ts()}
            chat["messages"].append(user_msg)
            if len(chat["messages"]) == 1:
                chat["title"] = make_title(text or "Image")
        chat["updated"] = now_ts()
        save_json(CHATS_FILE, chats)
        history, has_images = build_history(chat, settings)
        system_prompt = build_system_prompt(settings)
        title = chat["title"]

    provider_name = settings["provider"]
    provider = PROVIDERS[provider_name]

    def persist_reply(content, model, interrupted=False):
        with _lock:
            chats_now = load_json(CHATS_FILE, {})
            if cid not in chats_now:
                return None
            msg = {
                "id": new_id(),
                "role": "assistant",
                "content": content,
                "images": [],
                "ts": now_ts(),
                "model": model,
                "provider": provider_name,
            }
            if interrupted:
                msg["interrupted"] = True
            chats_now[cid]["messages"].append(msg)
            chats_now[cid]["updated"] = now_ts()
            save_json(CHATS_FILE, chats_now)
            return msg

    opts = {
        "temperature": settings["temperature"],
        "max_tokens": settings["max_tokens"],
        "num_ctx": settings["num_ctx"],
        "host": settings["ollama_host"],
    }

    @stream_with_context
    def generate():
        model, failure = None, None
        try:
            model = pick_model(settings, has_images)
        except ProviderError as exc:
            failure = exc
        yield sse({"type": "meta", "user_message": user_msg, "title": title, "model": model, "provider": provider_name})
        if failure:
            yield sse({"type": "error", "code": failure.code, "message": failure.detail})
            return

        collected, done, gen = "", False, None
        try:
            gen = provider.chat(model, system_prompt, history, opts, stream=settings["stream"])
            for piece in gen:
                collected += piece
                yield sse({"type": "delta", "text": piece})
            collected = collected.strip()
            if not collected:
                yield sse({"type": "error", "code": "empty", "message": ""})
            else:
                msg = persist_reply(collected, model)
                done = True
                yield sse({"type": "done", "message": msg})
        except GeneratorExit:
            if collected.strip() and not done:
                persist_reply(collected.strip(), model, interrupted=True)
            raise
        except ProviderError as exc:
            yield sse({"type": "error", "code": exc.code, "message": exc.detail})
        except Exception as exc:  # noqa: BLE001
            app.logger.exception("Erreur inattendue pendant la génération")
            yield sse({"type": "error", "code": "generic", "message": str(exc)[:300]})
        finally:
            if gen is not None:
                gen.close()

    return Response(
        generate(),
        mimetype="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )


# --------------------------------------------------------------------------- #
# Paramètres, mémoire, données
# --------------------------------------------------------------------------- #
@app.route("/api/settings", methods=["GET"])
def read_settings():
    return jsonify({"settings": get_settings(), "gemini_configured": gemini.configured})


@app.route("/api/settings", methods=["PUT"])
def write_settings():
    with _lock:
        new = sanitize_settings(request.get_json(silent=True) or {})
        save_json(SETTINGS_FILE, new)
    return jsonify({"settings": new})


@app.route("/api/memory", methods=["GET"])
def read_memory():
    return jsonify(load_json(MEMORY_FILE, []))


@app.route("/api/memory", methods=["POST"])
def add_memory():
    text = ((request.get_json(silent=True) or {}).get("text") or "").strip()[:300]
    if not text:
        return error_response("empty_message")
    with _lock:
        memory = load_json(MEMORY_FILE, [])
        memory.append({"id": new_id(), "text": text})
        save_json(MEMORY_FILE, memory)
    return jsonify(memory)


@app.route("/api/memory/<mid>", methods=["DELETE"])
def delete_memory(mid):
    with _lock:
        memory = [m for m in load_json(MEMORY_FILE, []) if m.get("id") != mid]
        save_json(MEMORY_FILE, memory)
    return jsonify(memory)


@app.route("/api/data", methods=["DELETE"])
def wipe_data():
    with _lock:
        save_json(CHATS_FILE, {})
        for f in UPLOAD_DIR.iterdir():
            if f.is_file():
                f.unlink()
    return jsonify({"ok": True})


if __name__ == "__main__":
    debug = os.getenv("FLASK_DEBUG", "1") == "1"
    port = int(os.getenv("PORT", "5000"))
    app.run(host="127.0.0.1", port=port, debug=debug, threaded=True)
