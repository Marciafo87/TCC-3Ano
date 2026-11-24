/* ==========================================================================
   NLX Store — camada de dados compartilhada entre o site e o painel.
   Ordem de prioridade (vence o mais recente por meta.updatedAt):
     1. Conteúdo salvo neste navegador pelo painel (localStorage)
     2. Conteúdo publicado em data/content.js
     3. Conteúdo demonstrativo de data/defaults.js
   ========================================================================== */
(function () {
  "use strict";
  var KEY = "nlx:data:v1";
  var NLX = (window.NLX = window.NLX || {});

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function readLocal() {
    try {
      var raw = localStorage.getItem(KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  /* Garante que todas as chaves do padrão existam (útil após atualizações). */
  function fill(data, def) {
    Object.keys(def).forEach(function (k) {
      if (data[k] === undefined || data[k] === null) { data[k] = clone(def[k]); return; }
      var isObj = def[k] && typeof def[k] === "object" && !Array.isArray(def[k]);
      if (isObj && typeof data[k] === "object" && !Array.isArray(data[k])) fill(data[k], def[k]);
    });
    return data;
  }

  function load() {
    var def = clone(window.NLX_DEFAULTS || {});
    var local = readLocal();
    var pub = window.NLX_PUBLISHED ? clone(window.NLX_PUBLISHED) : null;
    var t = function (d) { return (d && d.meta && d.meta.updatedAt) || 0; };
    var chosen = null, source = "default";
    if (local && pub) {
      if (t(pub) > t(local)) { chosen = pub; source = "published"; } else { chosen = local; source = "local"; }
    } else if (local) { chosen = local; source = "local"; }
    else if (pub) { chosen = pub; source = "published"; }
    var data = chosen ? fill(chosen, def) : def;
    return { data: data, source: source };
  }

  function save(data, action) {
    data.meta = data.meta || { log: [] };
    data.meta.updatedAt = Date.now();
    data.meta.log = data.meta.log || [];
    if (action) {
      data.meta.log.unshift({ at: data.meta.updatedAt, action: action });
      data.meta.log = data.meta.log.slice(0, 20);
    }
    var json = JSON.stringify(data);
    try {
      localStorage.setItem(KEY, json);
    } catch (e) {
      var err = new Error("Espaço de armazenamento do navegador esgotado. Remova ou substitua imagens grandes e tente novamente.");
      err.code = "QUOTA";
      throw err;
    }
    try { window.dispatchEvent(new CustomEvent("nlx:saved")); } catch (e) {}
    return json.length;
  }

  function reset() {
    try { localStorage.removeItem(KEY); } catch (e) {}
  }

  function hasLocal() { return !!readLocal(); }

  function usageBytes() {
    try { var r = localStorage.getItem(KEY); return r ? r.length * 2 : 0; } catch (e) { return 0; }
  }

  function validate(obj) {
    if (!obj || typeof obj !== "object") return "O arquivo não contém um objeto JSON válido.";
    var required = ["site", "texts", "areas", "projects", "talks"];
    for (var i = 0; i < required.length; i++) {
      if (!(required[i] in obj)) return "Backup incompleto: falta a seção \"" + required[i] + "\".";
    }
    if (!Array.isArray(obj.projects) || !Array.isArray(obj.talks)) return "Formato inválido de projetos ou palestras.";
    return "";
  }

  function uid(prefix) {
    return (prefix || "id") + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  NLX.Store = { KEY: KEY, load: load, save: save, reset: reset, hasLocal: hasLocal, usageBytes: usageBytes, validate: validate, clone: clone, uid: uid };

  /* ---------- utilidades compartilhadas ---------- */
  NLX.esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  };
  NLX.safeUrl = function (u) {
    u = String(u || "").trim();
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(u)) return u;
    if (/^assets\/[\w\-\/.]+$/i.test(u)) return (window.NLX_BASE || "") + u;
    return "";
  };
  NLX.norm = function (s) {
    return String(s || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  };
})();
