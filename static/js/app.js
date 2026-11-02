/* ==========================================================================
   AI Chat - front-end logic (vanilla JavaScript)
   ========================================================================== */
"use strict";

/* ---------- icons (inline SVG, Lucide-style) ---------- */
const ICONS = {
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
  sliders: '<path d="M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4"/>',
  download: '<path d="M12 3v12m0 0-4-4m4 4 4-4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon: '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v4"/>',
  send: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M4 16V5a2 2 0 0 1 2-2h11"/>',
  refresh: '<path d="M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6"/>',
  pencil: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  chat: '<path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  cloud: '<path d="M17.5 19a4.5 4.5 0 1 0-1.4-8.8A6 6 0 1 0 5 14.5 4 4 0 0 0 6 19z"/>',
  server: '<rect x="3" y="3" width="18" height="7" rx="2"/><rect x="3" y="14" width="18" height="7" rx="2"/><path d="M7 6.5h.01M7 17.5h.01"/>',
  alert: '<circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/>',
  arrowdown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
};
function icon(name, size = 18) {
  return `<svg class="svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ""}</svg>`;
}

/* ---------- i18n ---------- */
const I18N = {
  en: {
    newChat: "New chat", searchChats: "Search", settings: "Settings", export: "Export conversation",
    toggleTheme: "Toggle theme", attachImage: "Attach image", voice: "Voice input", send: "Send", stop: "Stop",
    placeholder: "Message", hint: "Enter to send, Shift+Enter for a new line. Paste or drop images to attach them.",
    welcomeSub: "Ask a question, paste some text, or attach an image to analyze.",
    hello: "How can I help?", helloName: "How can I help, {name}?", dropHere: "Drop images to attach",
    tabGeneral: "General", tabProvider: "Provider", tabBehavior: "Behavior", tabMemory: "Memory", tabData: "Data",
    uiLanguage: "Interface language", theme: "Theme", themeDark: "Dark", themeLight: "Light", themeAuto: "System",
    accent: "Accent color", fontSize: "Text size", userName: "Your name (optional)", userNamePh: "How should I address you?",
    streaming: "Stream responses as they are generated",
    provider: "Provider", model: "Model", providerSettings: "Provider settings",
    gemSub: "Google cloud models. Requires an API key.", ollSub: "Models running locally on your machine.",
    gemHelp: "Create a free key at <a href=\"https://aistudio.google.com/apikey\" target=\"_blank\" rel=\"noopener noreferrer\">aistudio.google.com/apikey</a>. The key is verified with Google, then stored on this computer only (data/secrets.json). It is never sent back to the browser.",
    apiKey: "API key", keyPh: "Paste your Gemini API key", saveKey: "Save", removeKey: "Remove",
    keyFromApp: "Key saved in the app ({k})", keyFromEnv: "Key loaded from the .env file ({k}). Saving a key here overrides it.", keyNone: "No key set.",
    keySaved: "Key verified and saved.", keyRemoved: "Key removed.", confirmRemoveKey: "Remove the saved API key?",
    ollHost: "Server address", ollVision: "Vision model (for images)",
    ollVisionHelp: "Used automatically when a message contains an image. Install one with: ollama pull llava",
    sameModel: "Same as the main model", numCtx: "Context window (tokens)", numCtxHelp: "Larger values remember more but use more memory.",
    testConn: "Test connection", testing: "Testing...", testOkGemini: "Connected. {n} models available.",
    testOkOllama: "Connected to Ollama {v}. {n} models installed.",
    keyOk: "API key detected", keyMissing: "API key not found", ollOk: "Connected (Ollama {v})", ollDown: "Unreachable at {host}",
    noModels: "No models found", autoModel: "Automatic",
    personality: "Personality", p_balanced: "Balanced", p_concise: "Concise", p_friendly: "Friendly", p_teacher: "Teacher",
    p_developer: "Developer", p_custom: "Custom", customPrompt: "Custom instructions",
    customPromptPh: "For example: You are a technical writer. Answer in short, precise sentences.",
    replyLanguage: "Reply language", rl_auto: "Same as my message", temperature: "Creativity",
    temperatureHelp: "Low values are precise, high values are more creative.", maxTokens: "Maximum response length",
    contextMessages: "Messages kept in context", useMemory: "Use long-term memory",
    memoryHelp: "Facts saved here are shared with the assistant in every conversation. You can also type <code>remember: I live in Casablanca</code> in the chat.",
    memoryPh: "Add a fact about yourself", add: "Add", memoryEmpty: "No saved facts yet.", memorySaved: "Saved to memory: {fact}",
    exportChat: "Export current conversation", exportMd: "Download as Markdown", dangerZone: "Danger zone",
    wipeHelp: "Deletes every conversation and uploaded image. Settings and memory are kept.", wipe: "Delete all conversations",
    today: "Today", yesterday: "Yesterday", earlier: "Earlier", noChats: "No conversations",
    rename: "Rename", delete: "Delete", renamePrompt: "New name:", confirmDelete: "Delete this conversation?",
    confirmWipe: "Delete ALL conversations? This cannot be undone.",
    copy: "Copy", copied: "Copied", regenerate: "Regenerate", interrupted: "stopped", you: "You", assistant: "Assistant",
    imagesMax: "A maximum of {n} images can be attached.", imageBad: "File skipped: not a supported image.",
    micUnsupported: "Voice input is not supported by this browser. Try Chrome or Edge.",
    chatDeleted: "Conversation deleted", allDeleted: "All conversations deleted",
    setupGemini: "Gemini is selected but no API key is set. Add one in Settings, Provider, or switch to Ollama.",
    setupOllama: "Ollama is selected but cannot be reached at {host}. Start Ollama, or switch to the Gemini API.",
    setupNoModel: "Ollama is running but no model is installed. Run: ollama pull llama3.2",
    cards: [
      { t: "Summarize text", d: "Condense an article or document into key points.", p: "Summarize the following text in a few bullet points:\n\n" },
      { t: "Explain a concept", d: "Get a clear explanation with examples.", p: "Explain the following concept clearly, with a simple example: " },
      { t: "Write or review code", d: "Generate, debug or improve code in any language.", p: "Review this code and suggest improvements:\n\n" },
      { t: "Analyze an image", d: "Describe a screenshot, chart or photograph.", p: "__image__" },
    ],
    err_no_key: "No Gemini API key set. Add one in Settings, Provider.",
    err_bad_key: "The Gemini API key was rejected. Check it in Settings, Provider.",
    err_bad_key_format: "This does not look like a valid API key.",
    err_model_not_found: "This model does not exist or is no longer available. Choose another one in the model menu.",
    err_quota: "Rate limit or quota reached. Please wait a moment and try again.",
    err_too_large: "The request is too large. Try a smaller image.",
    err_network: "Network error. Check your internet connection.",
    err_ollama_unreachable: "Cannot reach Ollama at {d}. Make sure Ollama is running.",
    err_ollama_model_missing: "The model \"{d}\" is not installed. Run: ollama pull {d}",
    err_ollama_no_models: "No Ollama model is installed. Run: ollama pull llama3.2",
    err_vision_unsupported: "The model \"{d}\" cannot read images. Select a vision model in Settings, Provider (for example llava).",
    err_timeout: "The model took too long to respond.", err_empty: "The model returned an empty response. Try increasing the maximum response length or choose another model.",
    err_generic: "Unexpected error: {d}", err_empty_message: "The message is empty.", err_too_long: "The message is too long.",
    err_too_many_images: "Too many images attached.", err_bad_image: "One of the images is invalid.",
    err_image_too_large: "One of the images is too large.", err_chat_not_found: "Conversation not found.",
    err_nothing_to_regenerate: "Nothing to regenerate.", err_empty_title: "The title cannot be empty.", err_bad_request: "Invalid request.",
  },
  fr: {
    newChat: "Nouvelle conversation", searchChats: "Rechercher", settings: "Paramètres", export: "Exporter la conversation",
    toggleTheme: "Changer de thème", attachImage: "Joindre une image", voice: "Dictée vocale", send: "Envoyer", stop: "Arrêter",
    placeholder: "Message", hint: "Entrée pour envoyer, Maj+Entrée pour un retour à la ligne. Colle ou dépose des images pour les joindre.",
    welcomeSub: "Pose une question, colle un texte ou joins une image à analyser.",
    hello: "Comment puis-je vous aider ?", helloName: "Comment puis-je vous aider, {name} ?", dropHere: "Dépose les images pour les joindre",
    tabGeneral: "Général", tabProvider: "Fournisseur", tabBehavior: "Comportement", tabMemory: "Mémoire", tabData: "Données",
    uiLanguage: "Langue de l'interface", theme: "Thème", themeDark: "Sombre", themeLight: "Clair", themeAuto: "Système",
    accent: "Couleur d'accent", fontSize: "Taille du texte", userName: "Votre prénom (facultatif)", userNamePh: "Comment dois-je vous appeler ?",
    streaming: "Afficher les réponses au fur et à mesure",
    provider: "Fournisseur", model: "Modèle", providerSettings: "Paramètres du fournisseur",
    gemSub: "Modèles cloud de Google. Nécessite une clé API.", ollSub: "Modèles exécutés localement sur votre machine.",
    gemHelp: "Créez une clé gratuite sur <a href=\"https://aistudio.google.com/apikey\" target=\"_blank\" rel=\"noopener noreferrer\">aistudio.google.com/apikey</a>. La clé est vérifiée auprès de Google, puis stockée uniquement sur cet ordinateur (data/secrets.json). Elle n'est jamais renvoyée au navigateur.",
    apiKey: "Clé API", keyPh: "Collez votre clé API Gemini", saveKey: "Enregistrer", removeKey: "Supprimer",
    keyFromApp: "Clé enregistrée dans l'application ({k})", keyFromEnv: "Clé chargée depuis le fichier .env ({k}). En enregistrer une ici la remplace.", keyNone: "Aucune clé définie.",
    keySaved: "Clé vérifiée et enregistrée.", keyRemoved: "Clé supprimée.", confirmRemoveKey: "Supprimer la clé API enregistrée ?",
    ollHost: "Adresse du serveur", ollVision: "Modèle vision (pour les images)",
    ollVisionHelp: "Utilisé automatiquement quand un message contient une image. Pour en installer un : ollama pull llava",
    sameModel: "Identique au modèle principal", numCtx: "Fenêtre de contexte (tokens)", numCtxHelp: "Une valeur élevée retient plus de choses mais consomme plus de mémoire.",
    testConn: "Tester la connexion", testing: "Test en cours...", testOkGemini: "Connecté. {n} modèles disponibles.",
    testOkOllama: "Connecté à Ollama {v}. {n} modèles installés.",
    keyOk: "Clé API détectée", keyMissing: "Clé API introuvable", ollOk: "Connecté (Ollama {v})", ollDown: "Injoignable à l'adresse {host}",
    noModels: "Aucun modèle trouvé", autoModel: "Automatique",
    personality: "Personnalité", p_balanced: "Équilibrée", p_concise: "Concise", p_friendly: "Amicale", p_teacher: "Pédagogue",
    p_developer: "Développeur", p_custom: "Personnalisée", customPrompt: "Instructions personnalisées",
    customPromptPh: "Par exemple : Tu es un rédacteur technique. Réponds par des phrases courtes et précises.",
    replyLanguage: "Langue des réponses", rl_auto: "Comme mon message", temperature: "Créativité",
    temperatureHelp: "Une valeur basse donne des réponses précises, une valeur haute des réponses plus créatives.", maxTokens: "Longueur maximale des réponses",
    contextMessages: "Messages conservés en contexte", useMemory: "Utiliser la mémoire à long terme",
    memoryHelp: "Les informations enregistrées ici sont transmises à l'assistant dans toutes les conversations. Vous pouvez aussi écrire <code>retiens: j'habite à Casablanca</code> dans le chat.",
    memoryPh: "Ajouter une information vous concernant", add: "Ajouter", memoryEmpty: "Aucune information enregistrée.", memorySaved: "Enregistré en mémoire : {fact}",
    exportChat: "Exporter la conversation actuelle", exportMd: "Télécharger en Markdown", dangerZone: "Zone sensible",
    wipeHelp: "Supprime toutes les conversations et les images envoyées. Les paramètres et la mémoire sont conservés.", wipe: "Supprimer toutes les conversations",
    today: "Aujourd'hui", yesterday: "Hier", earlier: "Plus ancien", noChats: "Aucune conversation",
    rename: "Renommer", delete: "Supprimer", renamePrompt: "Nouveau nom :", confirmDelete: "Supprimer cette conversation ?",
    confirmWipe: "Supprimer TOUTES les conversations ? Cette action est irréversible.",
    copy: "Copier", copied: "Copié", regenerate: "Régénérer", interrupted: "interrompu", you: "Vous", assistant: "Assistant",
    imagesMax: "Maximum {n} images par message.", imageBad: "Fichier ignoré : format d'image non pris en charge.",
    micUnsupported: "La dictée vocale n'est pas prise en charge par ce navigateur. Essayez Chrome ou Edge.",
    chatDeleted: "Conversation supprimée", allDeleted: "Toutes les conversations ont été supprimées",
    setupGemini: "Gemini est sélectionné mais aucune clé API n'est définie. Ajoutez-en une dans Paramètres, Fournisseur, ou passez sur Ollama.",
    setupOllama: "Ollama est sélectionné mais injoignable à l'adresse {host}. Démarrez Ollama, ou passez sur l'API Gemini.",
    setupNoModel: "Ollama fonctionne mais aucun modèle n'est installé. Lancez : ollama pull llama3.2",
    cards: [
      { t: "Résumer un texte", d: "Condenser un article ou un document en points clés.", p: "Résume le texte suivant en quelques points :\n\n" },
      { t: "Expliquer un concept", d: "Obtenir une explication claire avec des exemples.", p: "Explique clairement le concept suivant, avec un exemple simple : " },
      { t: "Écrire ou relire du code", d: "Générer, déboguer ou améliorer du code.", p: "Relis ce code et propose des améliorations :\n\n" },
      { t: "Analyser une image", d: "Décrire une capture d'écran, un graphique ou une photo.", p: "__image__" },
    ],
    err_no_key: "Aucune clé API Gemini définie. Ajoutez-en une dans Paramètres, Fournisseur.",
    err_bad_key: "La clé API Gemini a été refusée. Vérifiez-la dans Paramètres, Fournisseur.",
    err_bad_key_format: "Cela ne ressemble pas à une clé API valide.",
    err_model_not_found: "Ce modèle n'existe pas ou n'est plus disponible. Choisissez-en un autre dans le menu du modèle.",
    err_quota: "Limite de requêtes ou quota atteint. Patientez un instant puis réessayez.",
    err_too_large: "La requête est trop volumineuse. Essayez avec une image plus petite.",
    err_network: "Erreur réseau. Vérifiez votre connexion Internet.",
    err_ollama_unreachable: "Impossible de joindre Ollama à l'adresse {d}. Vérifiez qu'Ollama est démarré.",
    err_ollama_model_missing: "Le modèle \"{d}\" n'est pas installé. Lancez : ollama pull {d}",
    err_ollama_no_models: "Aucun modèle Ollama n'est installé. Lancez : ollama pull llama3.2",
    err_vision_unsupported: "Le modèle \"{d}\" ne peut pas lire les images. Choisissez un modèle vision dans Paramètres, Fournisseur (par exemple llava).",
    err_timeout: "Le modèle a mis trop de temps à répondre.", err_empty: "Le modèle a renvoyé une réponse vide. Augmentez la longueur maximale des réponses ou changez de modèle.",
    err_generic: "Erreur inattendue : {d}", err_empty_message: "Le message est vide.", err_too_long: "Le message est trop long.",
    err_too_many_images: "Trop d'images jointes.", err_bad_image: "Une des images est invalide.",
    err_image_too_large: "Une des images est trop volumineuse.", err_chat_not_found: "Conversation introuvable.",
    err_nothing_to_regenerate: "Rien à régénérer.", err_empty_title: "Le titre ne peut pas être vide.", err_bad_request: "Requête invalide.",
  },
};

const ACCENTS = ["#3b82f6", "#6366f1", "#8b5cf6", "#14b8a6", "#10b981", "#f59e0b", "#f43f5e", "#64748b"];
const MAX_IMAGES = 3;
const PROVIDER_NAMES = { gemini: "Gemini", ollama: "Ollama" };

/* ---------- state ---------- */
const state = {
  chats: [], currentId: null, messages: [], settings: null, memory: [],
  attachments: [], streaming: false, abort: null, filter: "",
  providers: { gemini: { configured: false }, ollama: { reachable: false } },
  models: { gemini: null, ollama: null },   // null = not loaded yet
};

const $ = (s, root = document) => root.querySelector(s);
const $$ = (s, root = document) => [...root.querySelectorAll(s)];
const el = {};

/* ---------- helpers ---------- */
function lang() {
  const pref = state.settings?.ui_language || "auto";
  if (pref === "fr" || pref === "en") return pref;
  return (navigator.language || "en").toLowerCase().startsWith("fr") ? "fr" : "en";
}
function t(key, vars = {}) {
  let s = I18N[lang()][key] ?? I18N.en[key] ?? key;
  if (typeof s !== "string") return s;
  for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
  return s;
}
function errText(code, detail = "") {
  const key = "err_" + code;
  if (I18N.en[key]) return t(key, { d: detail });
  return detail || code;
}
function esc(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
function toast(msg, isErr = false) {
  const d = document.createElement("div");
  d.className = "toast" + (isErr ? " err" : "");
  d.textContent = msg;
  el.toasts.appendChild(d);
  setTimeout(() => d.remove(), isErr ? 6000 : 2200);
}
class ApiError extends Error { constructor(msg, code) { super(msg); this.code = code; } }
async function api(path, opts = {}) {
  const res = await fetch(path, {
    headers: opts.body ? { "Content-Type": "application/json" } : undefined,
    ...opts,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  if (!res.ok) {
    let data = {};
    try { data = await res.json(); } catch (_) { /* ignore */ }
    throw new ApiError(errText(data.code, data.error) || res.statusText, data.code);
  }
  return res.json();
}
const fmtTime = ts => new Date(ts).toLocaleTimeString(lang(), { hour: "2-digit", minute: "2-digit" });
const debounce = (fn, ms) => { let h; return (...a) => { clearTimeout(h); h = setTimeout(() => fn(...a), ms); }; };
function hydrateIcons(root = document) {
  $$("[data-icon]", root).forEach(n => { n.innerHTML = icon(n.dataset.icon, Number(n.dataset.size) || 18); });
}

/* ---------- markdown ---------- */
function renderMarkdown(text) {
  if (!window.marked || !window.DOMPurify) {
    return `<p>${esc(text).replace(/\n/g, "<br>")}</p>`;   // offline fallback
  }
  const raw = window.marked.parse(text, { breaks: true, gfm: true });
  const tpl = document.createElement("template");
  tpl.innerHTML = window.DOMPurify.sanitize(raw);
  tpl.content.querySelectorAll("a").forEach(a => { a.target = "_blank"; a.rel = "noopener noreferrer"; });
  tpl.content.querySelectorAll("pre").forEach(pre => {
    const code = pre.querySelector("code");
    if (!code) return;
    const language = ([...code.classList].find(c => c.startsWith("language-")) || "").replace("language-", "");
    if (window.hljs) {
      try {
        code.innerHTML = language && window.hljs.getLanguage(language)
          ? window.hljs.highlight(code.textContent, { language }).value
          : window.hljs.highlightAuto(code.textContent).value;
      } catch (_) { /* ignore */ }
    }
    const wrap = document.createElement("div");
    wrap.className = "code-block";
    wrap.innerHTML = `<div class="code-head"><span>${esc(language || "code")}</span><button class="code-copy" data-act="copy-code">${icon("copy", 13)}<span>${t("copy")}</span></button></div>`;
    pre.replaceWith(wrap);
    wrap.appendChild(pre);
  });
  const div = document.createElement("div");
  div.appendChild(tpl.content);
  return div.innerHTML;
}

/* ---------- appearance ---------- */
function applyTheme() {
  const pref = state.settings.theme;
  const theme = pref === "auto" ? (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark") : pref;
  document.documentElement.dataset.theme = theme;
  const ti = $("#themeIcon");
  if (ti) ti.innerHTML = icon(theme === "dark" ? "sun" : "moon", 18);
}
function applyAppearance() {
  const s = state.settings;
  applyTheme();
  document.documentElement.style.setProperty("--accent", s.accent);
  document.documentElement.style.setProperty("--font-size", s.font_size + "px");
  document.documentElement.lang = lang();
  applyI18n();
  updateWelcome();
  updateChip();
  renderChatList();
}
function applyI18n() {
  $$("[data-i18n]").forEach(n => { n.textContent = t(n.dataset.i18n); });
  $$("[data-i18n-placeholder]").forEach(n => { n.placeholder = t(n.dataset.i18nPlaceholder); });
  $$("[data-i18n-title]").forEach(n => { n.title = t(n.dataset.i18nTitle); });
  $("#memoryHelp").innerHTML = t("memoryHelp");
  $("#gemHelp").innerHTML = t("gemHelp");
  if (!state.streaming) el.sendBtn.title = t("send");
  renderMemory();
  renderProviderUI();
}

/* ---------- provider / model UI ---------- */
function activeProvider() { return state.settings.provider; }
function activeModelName() {
  const s = state.settings;
  if (s.provider === "gemini") return s.gemini_model;
  return s.ollama_model || t("autoModel");
}
function providerReady() {
  const p = activeProvider();
  if (p === "gemini") return state.providers.gemini.configured;
  return state.providers.ollama.reachable && (state.models.ollama === null || state.models.ollama.length > 0);
}
function providerState() {
  // returns { cls, text } describing the connection of a given provider
  return name => {
    if (name === "gemini") {
      return state.providers.gemini.configured
        ? { cls: "ok", text: t("keyOk") } : { cls: "bad", text: t("keyMissing") };
    }
    const o = state.providers.ollama;
    if (!o.reachable) return { cls: "bad", text: t("ollDown", { host: o.host || state.settings.ollama_host }) };
    if (state.models.ollama && state.models.ollama.length === 0) return { cls: "warn", text: t("noModels") };
    return { cls: "ok", text: t("ollOk", { v: o.version || "" }) };
  };
}
function updateChip() {
  if (!state.settings) return;
  const p = activeProvider();
  const st = providerState()(p);
  $("#chipProvider").textContent = p === "gemini" ? "Gemini API" : "Ollama";
  $("#chipModel").textContent = activeModelName();
  $("#chipModel").title = activeModelName();
  $("#chipDot").className = "dot " + st.cls;
  $("#sidebarDot").className = "dot " + st.cls;
  $("#sidebarConnText").textContent = `${PROVIDER_NAMES[p]}: ${st.text}`;
  updateSetupNotice();
}
function updateSetupNotice() {
  const p = activeProvider();
  let msg = "";
  if (p === "gemini" && !state.providers.gemini.configured) msg = t("setupGemini");
  else if (p === "ollama" && !state.providers.ollama.reachable) msg = t("setupOllama", { host: state.providers.ollama.host || state.settings.ollama_host });
  else if (p === "ollama" && state.models.ollama && state.models.ollama.length === 0) msg = t("setupNoModel");
  // l'écran d'accueil est détaché du DOM quand une conversation est ouverte : on passe par sa référence
  el.welcome.querySelector("#setupNotice").hidden = !msg;
  el.welcome.querySelector("#setupText").textContent = msg;
}

async function refreshProviders() {
  try { state.providers = await api("/api/providers"); } catch (_) { /* ignore */ }
  updateChip();
  renderProviderUI();
}
async function loadModels(provider = activeProvider(), { force = false } = {}) {
  if (state.models[provider] !== null && !force) return state.models[provider];
  try {
    const host = encodeURIComponent(state.settings.ollama_host);
    const data = await api(`/api/models?provider=${provider}&host=${host}`);
    state.models[provider] = data.models;
  } catch (_) { state.models[provider] = state.models[provider] || []; }
  // first run with Ollama: select the first installed model automatically
  if (provider === "ollama" && !state.settings.ollama_model && state.models.ollama.length) {
    state.settings.ollama_model = state.models.ollama[0].id;
    saveSettings();
  }
  updateChip();
  renderProviderUI();
  renderPopover();
  return state.models[provider];
}

function fillSelect(sel, items, current, { blank = null } = {}) {
  const ids = items.map(m => m.id);
  const opts = [];
  if (blank !== null) opts.push(`<option value="">${esc(blank)}</option>`);
  const list = current && !ids.includes(current) && current !== "" ? [{ id: current }, ...items] : items;
  list.forEach(m => opts.push(`<option value="${esc(m.id)}">${esc(m.id)}</option>`));
  if (!opts.length) opts.push(`<option value="">${esc(t("noModels"))}</option>`);
  sel.innerHTML = opts.join("");
  sel.value = current || (blank !== null ? "" : (items[0]?.id || ""));
}

function renderProviderUI() {
  if (!state.settings) return;
  const s = state.settings, p = s.provider;
  $$("#providerCards .pcard").forEach(c => c.classList.toggle("active", c.dataset.provider === p));
  $("#gemSection").hidden = p !== "gemini";
  $("#ollSection").hidden = p !== "ollama";

  const ps = providerState();
  const g = ps("gemini"), o = ps("ollama");
  $("#gemDot").className = "dot " + g.cls; $("#gemStatus").textContent = g.text;
  $("#ollDot").className = "dot " + o.cls; $("#ollStatus").textContent = o.text;

  const gp = state.providers.gemini || {};
  $("#keyInfo").textContent = gp.source === "app" ? t("keyFromApp", { k: gp.masked })
    : gp.source === "env" ? t("keyFromEnv", { k: gp.masked }) : t("keyNone");
  $("#keyRemove").hidden = gp.source !== "app";
  fillSelect($("#s_gemini_model"), state.models.gemini || [], s.gemini_model);
  const oll = state.models.ollama || [];
  fillSelect($("#s_ollama_model"), oll, s.ollama_model);
  fillSelect($("#s_ollama_vision_model"), oll.filter(m => m.vision), s.ollama_vision_model, { blank: t("sameModel") });
  $("#s_ollama_host").value = s.ollama_host;
  $("#s_num_ctx").value = s.num_ctx;
  $("#v_num_ctx").textContent = s.num_ctx;
  renderPopover();
}

function renderPopover() {
  if (!state.settings) return;
  const s = state.settings, p = s.provider;
  $$("#popProviders button").forEach(b => b.classList.toggle("active", b.dataset.provider === p));
  const list = state.models[p] || [];
  fillSelect($("#popModel"), list, p === "gemini" ? s.gemini_model : s.ollama_model);
  const st = providerState()(p);
  $("#popStatus").innerHTML = `<span class="dot ${st.cls}"></span><span>${esc(st.text)}</span>`;
}
function togglePopover(force) {
  const pop = $("#modelPop");
  const open = force ?? !pop.classList.contains("show");
  pop.classList.toggle("show", open);
  $("#modelChip").setAttribute("aria-expanded", open);
  if (open) { renderPopover(); loadModels(activeProvider()); }
}

async function switchProvider(name) {
  state.settings.provider = name;
  await saveSettingsNow();
  updateChip(); renderProviderUI(); renderPopover();
  await refreshProviders();
  await loadModels(name, { force: true });
}

async function saveKey() {
  const input = $("#keyInput"), out = $("#keyResult");
  const key = input.value.trim();
  if (!key) return;
  out.className = "test-result"; out.textContent = t("testing");
  $("#keySave").disabled = true;
  try {
    await api("/api/providers/gemini/key", { method: "PUT", body: { key } });
    input.value = "";
    out.className = "test-result ok"; out.textContent = t("keySaved");
    await refreshProviders();
    await loadModels("gemini", { force: true });
  } catch (e) { out.className = "test-result bad"; out.textContent = e.message; }
  $("#keySave").disabled = false;
}
async function removeKey() {
  if (!confirm(t("confirmRemoveKey"))) return;
  try {
    await api("/api/providers/gemini/key", { method: "DELETE" });
    const out = $("#keyResult"); out.className = "test-result ok"; out.textContent = t("keyRemoved");
    await refreshProviders();
    await loadModels("gemini", { force: true });
  } catch (e) { toast(e.message, true); }
}

async function testConnection() {
  const out = $("#testResult");
  out.className = "test-result"; out.textContent = t("testing");
  $("#testBtn").disabled = true;
  try {
    const r = await api("/api/providers/test", { method: "POST", body: { provider: activeProvider(), host: state.settings.ollama_host } });
    if (r.ok) {
      out.className = "test-result ok";
      out.textContent = activeProvider() === "gemini" ? t("testOkGemini", { n: r.detail }) : t("testOkOllama", { v: r.detail, n: r.count });
    } else {
      out.className = "test-result bad";
      out.textContent = errText(r.code, r.detail);
    }
  } catch (e) { out.className = "test-result bad"; out.textContent = e.message; }
  $("#testBtn").disabled = false;
  await refreshProviders();
  await loadModels(activeProvider(), { force: true });
}

/* ---------- conversation list ---------- */
function groupOf(ts) {
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (ts >= startToday) return "today";
  if (ts >= startToday - 86400000) return "yesterday";
  return "earlier";
}
function chatTitle(c) { return c.count === 0 ? t("newChat") : c.title; }

function renderChatList() {
  const q = state.filter.toLowerCase();
  const list = state.chats.filter(c => !q || chatTitle(c).toLowerCase().includes(q));
  if (!list.length) { el.chatList.innerHTML = `<div class="empty-list">${t("noChats")}</div>`; return; }
  let html = "", last = "";
  for (const c of list) {
    const g = groupOf(c.updated);
    if (g !== last) { html += `<div class="group-label">${t(g)}</div>`; last = g; }
    html += `<div class="chat-item ${c.id === state.currentId ? "active" : ""}" data-id="${c.id}">
      <span class="name">${esc(chatTitle(c))}</span>
      <span class="acts">
        <button class="mini" data-act="rename" title="${t("rename")}">${icon("pencil", 14)}</button>
        <button class="mini" data-act="delete" title="${t("delete")}">${icon("trash", 14)}</button>
      </span></div>`;
  }
  el.chatList.innerHTML = html;
}
async function refreshChats() { state.chats = await api("/api/chats"); renderChatList(); }

async function newChat() {
  const empty = state.chats.find(c => c.count === 0);
  if (empty) { await openChat(empty.id); el.input.focus(); return; }
  const chat = await api("/api/chats", { method: "POST" });
  state.chats.unshift(chat);
  await openChat(chat.id);
  el.input.focus();
}
async function openChat(id) {
  if (state.streaming) stopStreaming();
  const chat = await api(`/api/chats/${id}`);
  state.currentId = id;
  state.messages = chat.messages;
  localStorage.setItem("lastChat", id);
  renderMessages();
  renderChatList();
  setTitle(chat);
  closeSidebar();
}
function setTitle(chat) { el.chatTitle.textContent = chatTitle(chat); }
async function deleteChat(id) {
  if (!confirm(t("confirmDelete"))) return;
  await api(`/api/chats/${id}`, { method: "DELETE" });
  state.chats = state.chats.filter(c => c.id !== id);
  if (state.currentId === id) {
    if (state.chats.length) await openChat(state.chats[0].id); else await newChat();
  }
  renderChatList();
  toast(t("chatDeleted"));
}
async function renameChat(id) {
  const c = state.chats.find(x => x.id === id);
  const name = prompt(t("renamePrompt"), c ? c.title : "");
  if (!name || !name.trim()) return;
  await api(`/api/chats/${id}`, { method: "PATCH", body: { title: name.trim() } });
  await refreshChats();
  if (id === state.currentId) el.chatTitle.textContent = name.trim();
}

/* ---------- messages ---------- */
function userInitial() { return esc((state.settings.user_name || t("you")).charAt(0).toUpperCase()); }
function updateWelcome() {
  const n = state.settings?.user_name;
  el.welcomeTitle.textContent = n ? t("helloName", { name: n }) : t("hello");
  const sub = el.welcome.querySelector('[data-i18n="welcomeSub"]');
  if (sub) sub.textContent = t("welcomeSub");
  el.cards.innerHTML = "";
  (t("cards") || []).forEach(c => {
    const b = document.createElement("button");
    b.className = "card";
    b.innerHTML = `<span class="card-title">${esc(c.t)}</span><span class="card-desc">${esc(c.d)}</span>`;
    b.onclick = () => {
      if (c.p === "__image__") { el.fileInput.click(); return; }
      el.input.value = c.p; autoGrow(); el.input.focus();
      el.input.setSelectionRange(c.p.length, c.p.length);
    };
    el.cards.appendChild(b);
  });
  updateSetupNotice();
}

function messageHTML(m, isLast) {
  const isUser = m.role === "user";
  if (m.kind === "memory") {
    return `<div class="note-inner">${icon("check", 15)}<span>${esc(t("memorySaved", { fact: m.content }))}</span></div>`;
  }
  const images = (m.images || []).map(f => `<img src="/uploads/${esc(f)}" alt="" data-act="zoom">`).join("");
  const sub = !isUser && m.model ? `<span class="sub">${esc(m.model)}</span>` : "";
  const flag = m.interrupted ? `<span class="flag">${t("interrupted")}</span>` : "";
  const content = isUser ? esc(m.content) : renderMarkdown(m.content);
  const regen = !isUser && isLast ? `<button class="act" data-act="regen">${icon("refresh", 14)}<span>${t("regenerate")}</span></button>` : "";
  return `
    <div class="avatar">${isUser ? userInitial() : icon("chat", 15)}</div>
    <div class="msg-body">
      <div class="msg-head"><span class="who">${isUser ? t("you") : t("assistant")}</span>${sub}${flag}<span class="time">${fmtTime(m.ts)}</span></div>
      ${images ? `<div class="msg-images">${images}</div>` : ""}
      ${content ? `<div class="content ${isUser ? "" : "md"}">${content}</div>` : ""}
      <div class="actions"><button class="act" data-act="copy">${icon("copy", 14)}<span>${t("copy")}</span></button>${regen}</div>
    </div>`;
}
function renderMessages() {
  const box = el.messages;
  box.innerHTML = "";
  if (!state.messages.length) {
    box.appendChild(el.welcome);
    el.welcome.style.display = "";
    updateWelcome();
    return;
  }
  el.welcome.style.display = "none";
  const lastBot = state.messages.map(m => m.role === "assistant" && !m.kind).lastIndexOf(true);
  state.messages.forEach((m, i) => {
    const d = document.createElement("div");
    d.className = `msg ${m.kind === "memory" ? "note" : m.role === "user" ? "user" : "bot"}${i === state.messages.length - 1 ? " last" : ""}`;
    d.dataset.id = m.id;
    d.innerHTML = messageHTML(m, i === lastBot && i === state.messages.length - 1);
    box.appendChild(d);
  });
  scrollToBottom(true);
}
function scrollToBottom(instant = false) {
  el.messages.style.scrollBehavior = instant ? "auto" : "smooth";
  el.messages.scrollTop = el.messages.scrollHeight;
}
function nearBottom() {
  const m = el.messages;
  return m.scrollHeight - m.scrollTop - m.clientHeight < 140;
}

/* ---------- sending & streaming ---------- */
function setStreaming(on) {
  state.streaming = on;
  el.sendBtn.classList.toggle("stop", on);
  el.sendBtn.innerHTML = icon(on ? "stop" : "send", 18);
  el.sendBtn.title = on ? t("stop") : t("send");
}
function stopStreaming() { if (state.abort) state.abort.abort(); }

async function sendMessage({ regenerate = false } = {}) {
  if (state.streaming) { stopStreaming(); return; }
  const text = el.input.value.trim();
  const images = regenerate ? [] : [...state.attachments];
  if (!regenerate && !text && !images.length) return;
  if (!state.currentId) await newChat();

  if (!regenerate) {
    el.input.value = ""; autoGrow();
    state.attachments = []; renderAttachments();
    el.welcome.style.display = "none";
    if (el.welcome.parentNode === el.messages) el.welcome.remove();
    const tmp = document.createElement("div");
    tmp.className = "msg user"; tmp.id = "pendingUser";
    tmp.innerHTML = `<div class="avatar">${userInitial()}</div>
      <div class="msg-body">
        <div class="msg-head"><span class="who">${t("you")}</span><span class="time">${fmtTime(Date.now())}</span></div>
        ${images.length ? `<div class="msg-images">${images.map(u => `<img src="${u}" alt="">`).join("")}</div>` : ""}
        ${text ? `<div class="content">${esc(text)}</div>` : ""}</div>`;
    el.messages.appendChild(tmp);
  } else {
    const last = state.messages[state.messages.length - 1];
    if (last && last.role === "assistant") {
      state.messages.pop();
      el.messages.querySelector(`.msg[data-id="${last.id}"]`)?.remove();
    }
  }

  const bot = document.createElement("div");
  bot.className = "msg bot streaming";
  bot.innerHTML = `<div class="avatar">${icon("chat", 15)}</div>
    <div class="msg-body"><div class="msg-head"><span class="who">${t("assistant")}</span><span class="sub" id="liveModel"></span></div>
    <div class="content md"><span class="typing"><i></i><i></i><i></i></span></div></div>`;
  el.messages.appendChild(bot);
  scrollToBottom();

  const bubble = $(".content", bot);
  let acc = "", raf = 0, gotText = false, finished = false, errorMsg = null;
  const paint = () => {
    raf = 0;
    const stick = nearBottom();
    bubble.innerHTML = renderMarkdown(acc);
    if (stick) scrollToBottom(true);
  };

  state.abort = new AbortController();
  setStreaming(true);

  try {
    const res = await fetch(`/api/chats/${state.currentId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, images, regenerate }),
      signal: state.abort.signal,
    });
    if (!res.ok) {
      let data = {};
      try { data = await res.json(); } catch (_) { /* ignore */ }
      throw new Error(errText(data.code, data.error) || res.statusText);
    }
    if ((res.headers.get("content-type") || "").includes("application/json")) {
      const data = await res.json();      // "remember: ..." command
      bot.remove(); $("#pendingUser")?.remove();
      state.messages = data.chat.messages;
      renderMessages();
      await refreshChats();
      setTitle(data.chat);
      loadMemory();
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buf.indexOf("\n\n")) !== -1) {
        const chunk = buf.slice(0, idx).trim();
        buf = buf.slice(idx + 2);
        if (!chunk.startsWith("data:")) continue;
        const ev = JSON.parse(chunk.slice(5).trim());
        if (ev.type === "meta") {
          state.messages.push(ev.user_message);
          const pending = $("#pendingUser");
          if (pending) { pending.dataset.id = ev.user_message.id; pending.id = ""; pending.querySelectorAll("img").forEach(i => { i.dataset.act = "zoom"; }); }
          el.chatTitle.textContent = ev.title;
          const lm = $("#liveModel"); if (lm && ev.model) lm.textContent = ev.model;
          refreshChats();
        } else if (ev.type === "delta") {
          gotText = true; acc += ev.text;
          if (!raf) raf = requestAnimationFrame(paint);
        } else if (ev.type === "done") {
          finished = true; state.messages.push(ev.message);
        } else if (ev.type === "error") {
          errorMsg = errText(ev.code, ev.message);
          if (["ollama_unreachable", "no_key", "bad_key"].includes(ev.code)) refreshProviders();
        }
      }
    }
  } catch (err) {
    if (err.name !== "AbortError") errorMsg = err.message || String(err);
  } finally {
    if (raf) cancelAnimationFrame(raf);
    setStreaming(false);
    state.abort = null;
  }

  bot.classList.remove("streaming");
  if (errorMsg) {
    if (!gotText) { bot.classList.add("error"); bubble.textContent = errorMsg; }
    else toast(errorMsg, true);
  }
  if (finished || gotText) {
    try {
      const chat = await api(`/api/chats/${state.currentId}`);
      state.messages = chat.messages;
      renderMessages();
    } catch (_) { /* ignore */ }
  } else if (!errorMsg) {
    bot.remove();
  }
  refreshChats();
}

/* ---------- message actions ---------- */
function copyText(text) {
  const done = () => toast(t("copied"));
  const fallback = () => {
    const ta = document.createElement("textarea");
    ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand("copy"); done(); } catch (_) { /* ignore */ }
    ta.remove();
  };
  if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(done).catch(fallback);
  else fallback();
}

/* ---------- images ---------- */
function readFile(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file);
  });
}
function loadImg(src) {
  return new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src; });
}
async function compressImage(file) {
  const src = await readFile(file);
  if (file.type === "image/gif") return src.length < 2_800_000 ? src : null;
  const img = await loadImg(src);
  const scale = Math.min(1, 1280 / Math.max(img.width, img.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  for (const q of [0.88, 0.75, 0.6, 0.45]) {
    const url = canvas.toDataURL("image/jpeg", q);
    if (url.length < 2_800_000) return url;
  }
  return null;
}
async function addFiles(files) {
  for (const f of files) {
    if (!f.type.startsWith("image/")) { toast(t("imageBad"), true); continue; }
    if (state.attachments.length >= MAX_IMAGES) { toast(t("imagesMax", { n: MAX_IMAGES }), true); break; }
    try {
      const url = await compressImage(f);
      if (url) state.attachments.push(url); else toast(t("imageBad"), true);
    } catch (_) { toast(t("imageBad"), true); }
  }
  renderAttachments();
  el.input.focus();
}
function renderAttachments() {
  el.attachments.innerHTML = state.attachments.map((u, i) =>
    `<div class="att"><img src="${u}" alt=""><button data-i="${i}" aria-label="remove">${icon("x", 11)}</button></div>`).join("");
}

/* ---------- input ---------- */
function autoGrow() {
  el.input.style.height = "auto";
  el.input.style.height = Math.min(el.input.scrollHeight, 180) + "px";
}
let recognition = null;
function toggleMic() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast(t("micUnsupported"), true); return; }
  if (recognition) { recognition.stop(); return; }
  recognition = new SR();
  const rl = state.settings.reply_language;
  recognition.lang = { fr: "fr-FR", en: "en-US", es: "es-ES", de: "de-DE", ar: "ar-SA" }[rl] || (lang() === "fr" ? "fr-FR" : "en-US");
  recognition.interimResults = true;
  const base = el.input.value ? el.input.value + " " : "";
  recognition.onresult = e => { el.input.value = base + [...e.results].map(r => r[0].transcript).join(""); autoGrow(); };
  const end = () => { recognition = null; el.micBtn.classList.remove("recording"); };
  recognition.onend = end; recognition.onerror = end;
  recognition.start();
  el.micBtn.classList.add("recording");
}

/* ---------- sidebar (mobile) ---------- */
function openSidebar() { el.sidebar.classList.add("open"); el.backdrop.classList.add("show"); }
function closeSidebar() { el.sidebar.classList.remove("open"); el.backdrop.classList.remove("show"); }

/* ---------- settings ---------- */
const SETTING_FIELDS = ["ui_language", "theme", "font_size", "user_name", "stream", "gemini_model", "ollama_host", "ollama_model",
  "ollama_vision_model", "num_ctx", "personality", "custom_prompt", "reply_language", "temperature", "max_tokens", "context_messages", "use_memory"];
const RELABEL = new Set(["ui_language", "theme", "font_size", "user_name", "gemini_model", "ollama_model"]);

async function saveSettingsNow() {
  try { state.settings = (await api("/api/settings", { method: "PUT", body: state.settings })).settings; }
  catch (e) { toast(e.message, true); }
}
const saveSettings = debounce(saveSettingsNow, 350);

function readField(id) {
  const n = $("#s_" + id);
  if (n.type === "checkbox") return n.checked;
  if (n.type === "range") return Number(n.value);
  return n.value;
}
function fillSettingsForm() {
  const s = state.settings;
  SETTING_FIELDS.forEach(k => {
    const n = $("#s_" + k);
    if (!n || n.tagName === "SELECT" && k.includes("model")) return;   // model lists are filled separately
    if (n.type === "checkbox") n.checked = !!s[k]; else n.value = s[k];
    const v = $("#v_" + k);
    if (v) v.textContent = k === "font_size" ? s[k] + " px" : s[k];
  });
  $("#customPromptField").hidden = s.personality !== "custom";
  $$(".swatch").forEach(sw => sw.classList.toggle("active", sw.dataset.color.toLowerCase() === s.accent.toLowerCase()));
  renderProviderUI();
}
function onSettingChange(key) {
  state.settings[key] = readField(key);
  const v = $("#v_" + key);
  if (v) v.textContent = key === "font_size" ? state.settings[key] + " px" : state.settings[key];
  if (key === "personality") $("#customPromptField").hidden = state.settings.personality !== "custom";
  if (RELABEL.has(key)) applyAppearance();
  saveSettings();
}
const onHostChange = debounce(async () => {
  await saveSettingsNow();
  state.models.ollama = null;
  await refreshProviders();
  await loadModels("ollama", { force: true });
}, 700);

function openSettings(tab) {
  fillSettingsForm();
  if (tab) selectTab(tab);
  el.settingsModal.classList.add("show");
  togglePopover(false);
  loadMemory();
  refreshProviders();
  loadModels("gemini");
  loadModels("ollama");
}
function closeSettings() { el.settingsModal.classList.remove("show"); }
function selectTab(name) {
  $$("#tabs .tab").forEach(x => x.classList.toggle("active", x.dataset.tab === name));
  $$(".pane").forEach(p => p.classList.toggle("active", p.dataset.pane === name));
}

/* ---------- memory ---------- */
async function loadMemory() { try { state.memory = await api("/api/memory"); renderMemory(); } catch (_) { /* ignore */ } }
function renderMemory() {
  const ul = $("#memList");
  if (!ul) return;
  if (!state.memory.length) { ul.innerHTML = `<li class="none">${t("memoryEmpty")}</li>`; return; }
  ul.innerHTML = state.memory.map(m =>
    `<li><span>${esc(m.text)}</span><button class="mini" data-mid="${m.id}" title="${t("delete")}">${icon("trash", 14)}</button></li>`).join("");
}
async function addMemory() {
  const input = $("#memInput");
  const text = input.value.trim();
  if (!text) return;
  state.memory = await api("/api/memory", { method: "POST", body: { text } });
  input.value = "";
  renderMemory();
}
function exportChat() {
  if (!state.currentId || !state.messages.length) return;
  window.location.href = `/api/chats/${state.currentId}/export?lang=${lang()}`;
}

/* ---------- init ---------- */
async function init() {
  Object.assign(el, {
    sidebar: $("#sidebar"), backdrop: $("#backdrop"), chatList: $("#chatList"), chatTitle: $("#chatTitle"),
    messages: $("#messages"), welcome: $("#welcome"), cards: $("#cards"), welcomeTitle: $("#welcomeTitle"),
    input: $("#input"), sendBtn: $("#sendBtn"), micBtn: $("#micBtn"), fileInput: $("#fileInput"),
    attachments: $("#attachments"), settingsModal: $("#settingsModal"), toasts: $("#toasts"),
    scrollDown: $("#scrollDown"), dropOverlay: $("#dropOverlay"), lightbox: $("#lightbox"),
  });
  hydrateIcons();
  $("#swatches").innerHTML = ACCENTS.map(c => `<button class="swatch" data-color="${c}" style="background:${c}" aria-label="${c}"></button>`).join("");

  try { state.settings = (await api("/api/settings")).settings; }
  catch (_) {
    state.settings = { ui_language: "auto", theme: "dark", accent: "#3b82f6", font_size: 15, provider: "ollama", gemini_model: "", ollama_host: "http://localhost:11434",
      ollama_model: "", ollama_vision_model: "", num_ctx: 8192, user_name: "", personality: "balanced", reply_language: "auto" };
  }
  applyAppearance();
  loadMemory();
  refreshProviders().then(() => loadModels(activeProvider()));

  /* events */
  $("#newChatBtn").onclick = () => { newChat(); closeSidebar(); };
  $("#openSidebar").onclick = openSidebar;
  $("#closeSidebar").onclick = closeSidebar;
  el.backdrop.onclick = closeSidebar;
  $("#openSettings").onclick = () => { openSettings(); closeSidebar(); };
  $("#topSettings").onclick = () => openSettings();
  $("#closeSettings").onclick = closeSettings;
  el.settingsModal.addEventListener("mousedown", e => { if (e.target === el.settingsModal) closeSettings(); });
  $("#exportBtn").onclick = exportChat;
  $("#exportBtn2").onclick = exportChat;
  $("#themeBtn").onclick = () => {
    state.settings.theme = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    applyAppearance(); fillSettingsForm(); saveSettings();
  };
  $("#chatSearch").addEventListener("input", e => { state.filter = e.target.value; renderChatList(); });

  el.chatList.addEventListener("click", e => {
    const item = e.target.closest(".chat-item");
    if (!item) return;
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (act === "delete") deleteChat(item.dataset.id);
    else if (act === "rename") renameChat(item.dataset.id);
    else openChat(item.dataset.id);
  });

  el.messages.addEventListener("click", e => {
    const act = e.target.closest("[data-act]")?.dataset.act;
    if (!act) return;
    const node = e.target.closest(".msg");
    if (act === "copy-code") copyText(e.target.closest(".code-block").querySelector("code").textContent);
    else if (act === "copy") {
      const m = state.messages.find(x => x.id === node?.dataset.id);
      copyText(m ? m.content : $(".content", node).innerText);
    } else if (act === "regen") sendMessage({ regenerate: true });
    else if (act === "zoom") { $("#lightboxImg").src = e.target.src; el.lightbox.classList.add("show"); }
  });
  el.lightbox.onclick = () => el.lightbox.classList.remove("show");
  el.messages.addEventListener("scroll", () => el.scrollDown.classList.toggle("show", !nearBottom()));
  el.scrollDown.onclick = () => scrollToBottom();

  el.input.addEventListener("input", autoGrow);
  el.input.addEventListener("keydown", e => {
    if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendMessage(); }
  });
  el.sendBtn.onclick = () => sendMessage();
  el.micBtn.onclick = toggleMic;
  $("#attachBtn").onclick = () => el.fileInput.click();
  el.fileInput.onchange = () => { addFiles([...el.fileInput.files]); el.fileInput.value = ""; };
  el.attachments.addEventListener("click", e => {
    const b = e.target.closest("button[data-i]");
    if (!b) return;
    state.attachments.splice(Number(b.dataset.i), 1);
    renderAttachments();
  });

  document.addEventListener("paste", e => {
    const files = [...(e.clipboardData?.files || [])].filter(f => f.type.startsWith("image/"));
    if (files.length) { e.preventDefault(); addFiles(files); }
  });
  let depth = 0;
  window.addEventListener("dragenter", e => { if (e.dataTransfer?.types?.includes("Files")) { depth++; el.dropOverlay.classList.add("show"); } });
  window.addEventListener("dragleave", () => { depth = Math.max(0, depth - 1); if (!depth) el.dropOverlay.classList.remove("show"); });
  window.addEventListener("dragover", e => e.preventDefault());
  window.addEventListener("drop", e => {
    e.preventDefault(); depth = 0; el.dropOverlay.classList.remove("show");
    if (e.dataTransfer?.files?.length) addFiles([...e.dataTransfer.files]);
  });

  /* model popover */
  $("#modelChip").onclick = e => { e.stopPropagation(); togglePopover(); };
  $("#modelPop").addEventListener("click", e => e.stopPropagation());
  document.addEventListener("click", () => togglePopover(false));
  $("#popProviders").addEventListener("click", e => { const b = e.target.closest("button[data-provider]"); if (b) switchProvider(b.dataset.provider); });
  $("#popModel").addEventListener("change", e => {
    state.settings[activeProvider() === "gemini" ? "gemini_model" : "ollama_model"] = e.target.value;
    updateChip(); renderProviderUI(); saveSettings();
  });
  $("#popMore").onclick = () => openSettings("provider");
  $("#setupBtn").onclick = () => openSettings("provider");

  /* settings */
  $$("#tabs .tab").forEach(tab => tab.onclick = () => selectTab(tab.dataset.tab));
  SETTING_FIELDS.forEach(k => {
    const n = $("#s_" + k);
    if (!n) return;
    const evt = n.type === "range" || n.type === "text" || n.tagName === "TEXTAREA" ? "input" : "change";
    n.addEventListener(evt, () => { onSettingChange(k); if (k === "ollama_host") onHostChange(); });
  });
  $("#providerCards").addEventListener("click", e => { const c = e.target.closest(".pcard"); if (c) switchProvider(c.dataset.provider); });
  $("#testBtn").onclick = testConnection;
  $("#keySave").onclick = saveKey;
  $("#keyRemove").onclick = removeKey;
  $("#keyInput").addEventListener("keydown", e => { if (e.key === "Enter") saveKey(); });
  $("#swatches").addEventListener("click", e => {
    const sw = e.target.closest(".swatch");
    if (!sw) return;
    state.settings.accent = sw.dataset.color;
    applyAppearance(); fillSettingsForm(); saveSettings();
  });
  $("#memAdd").onclick = addMemory;
  $("#memInput").addEventListener("keydown", e => { if (e.key === "Enter") addMemory(); });
  $("#memList").addEventListener("click", async e => {
    const b = e.target.closest("button[data-mid]");
    if (!b) return;
    state.memory = await api(`/api/memory/${b.dataset.mid}`, { method: "DELETE" });
    renderMemory();
  });
  $("#wipeBtn").onclick = async () => {
    if (!confirm(t("confirmWipe"))) return;
    await api("/api/data", { method: "DELETE" });
    state.chats = []; state.currentId = null; state.messages = [];
    closeSettings();
    await newChat();
    toast(t("allDeleted"));
  };

  document.addEventListener("keydown", e => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") { e.preventDefault(); newChat(); }
    if (e.key === "Escape") {
      if (el.lightbox.classList.contains("show")) el.lightbox.classList.remove("show");
      else if (el.settingsModal.classList.contains("show")) closeSettings();
      else if ($("#modelPop").classList.contains("show")) togglePopover(false);
      else closeSidebar();
    }
  });
  matchMedia("(prefers-color-scheme: light)").addEventListener?.("change", () => { if (state.settings.theme === "auto") applyTheme(); });

  await refreshChats();
  const last = localStorage.getItem("lastChat");
  if (last && state.chats.some(c => c.id === last)) await openChat(last);
  else if (state.chats.length) await openChat(state.chats[0].id);
  else await newChat();
}

document.addEventListener("DOMContentLoaded", init);
