/* ==========================================================================
   PageBuilder — store.js
   Tiny localStorage-backed data layer. No backend, no accounts, no payments.
   Keys:
     pagebuilder:draft    -> the site currently being edited
     (Legacy "bizlaunch:*" keys are still read once and migrated.)
   ========================================================================== */

(function () {
  "use strict";

  var DRAFT_KEY = "pagebuilder:draft";

  function read(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) {
      return fallback;
    }
  }

  function write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      // Most likely QuotaExceededError from a large base64 logo.
      return false;
    }
  }

  function uid(prefix) {
    return (prefix || "id") + "_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  /* ---------- Draft (the site being edited) ---------- */

  function blankDraft(templateId) {
    return {
      id: uid("draft"),
      template: templateId || "restaurant",
      name: "",
      tagline: "",
      description: "",
      logo: "",
      whatsapp: "",
      phone: "",
      email: "",
      address: "",
      hours: "",
      primary: "#5346d1",
      accent: "#b8f14b",
      category: "General",
      creator: "",
      published: false,
      items: []
    };
  }

  function loadDraft(templateId) {
    var draft = read(DRAFT_KEY, null);
    if (draft && typeof draft === "object") {
      // Merge in any keys added since the draft was saved.
      var base = blankDraft(draft.template);
      for (var k in base) {
        if (draft[k] === undefined) draft[k] = base[k];
      }
      if (templateId && templateId !== draft.template) draft.template = templateId;
      if (!Array.isArray(draft.items)) draft.items = [];
      return draft;
    }
    return blankDraft(templateId);
  }

  function saveDraft(draft) {
    return write(DRAFT_KEY, draft);
  }

  function clearDraft() {
    try { localStorage.removeItem(DRAFT_KEY); } catch (e) { /* ignore */ }
  }

  /* ---------- Export ---------- */

  window.Store = {
    uid: uid,
    blankDraft: blankDraft,
    loadDraft: loadDraft,
    saveDraft: saveDraft,
    clearDraft: clearDraft
  };
})();