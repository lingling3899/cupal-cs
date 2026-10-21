(function () {
  "use strict";

  var PREFIX = "cupal_cms_";
  var KEYS = {
    faqCustom: PREFIX + "faq_custom",
    faqHidden: PREFIX + "faq_hidden",
    notesStores: PREFIX + "notes_stores"
  };

  function readJson(key, fallback) {
    try {
      var raw = localStorage.getItem(key);
      if (!raw) return fallback;
      var parsed = JSON.parse(raw);
      return parsed == null ? fallback : parsed;
    } catch (e) {
      return fallback;
    }
  }

  function writeJson(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  }

  function uid(prefix) {
    return (
      (prefix || "id") +
      "_" +
      Date.now().toString(36) +
      "_" +
      Math.random().toString(36).slice(2, 8)
    );
  }

  function getFaqCustom() {
    var list = readJson(KEYS.faqCustom, []);
    return Array.isArray(list) ? list : [];
  }

  function setFaqCustom(list) {
    return writeJson(KEYS.faqCustom, Array.isArray(list) ? list : []);
  }

  function getFaqHidden() {
    var list = readJson(KEYS.faqHidden, []);
    return Array.isArray(list) ? list : [];
  }

  function setFaqHidden(list) {
    return writeJson(KEYS.faqHidden, Array.isArray(list) ? list : []);
  }

  function isFaqHidden(key) {
    return getFaqHidden().indexOf(String(key)) !== -1;
  }

  function hideFaq(key) {
    var list = getFaqHidden();
    var k = String(key);
    if (list.indexOf(k) === -1) {
      list.push(k);
      setFaqHidden(list);
    }
  }

  function showFaq(key) {
    setFaqHidden(getFaqHidden().filter(function (k) { return k !== String(key); }));
  }

  function addFaqCustom(item) {
    var list = getFaqCustom();
    var row = {
      id: uid("faq"),
      productId: String(item.productId || "").trim(),
      label: String(item.label || "").trim(),
      icon: String(item.icon || "❓").trim() || "❓",
      answer: String(item.answer || "").trim(),
      createdAt: new Date().toISOString()
    };
    if (!row.label || !row.answer) return { ok: false, error: "請填題目同答案" };
    list.push(row);
    setFaqCustom(list);
    return { ok: true, item: row };
  }

  function removeFaqCustom(id) {
    setFaqCustom(getFaqCustom().filter(function (x) { return x.id !== id; }));
  }

  function getFaqCustomById(id) {
    return getFaqCustom().find(function (x) { return x.id === id; }) || null;
  }

  function getStoreNotes() {
    var list = readJson(KEYS.notesStores, []);
    return Array.isArray(list) ? list : [];
  }

  function setStoreNotes(list) {
    return writeJson(KEYS.notesStores, Array.isArray(list) ? list : []);
  }

  function addStoreNote(text) {
    var t = String(text || "").trim();
    if (!t) return { ok: false, error: "請填備註" };
    var list = getStoreNotes();
    list.unshift({ id: uid("note"), text: t, at: new Date().toISOString() });
    setStoreNotes(list);
    return { ok: true };
  }

  function removeStoreNote(id) {
    setStoreNotes(getStoreNotes().filter(function (n) { return n.id !== id; }));
  }

  function resetCms() {
    Object.keys(KEYS).forEach(function (k) {
      try {
        localStorage.removeItem(KEYS[k]);
      } catch (e) {
        /* ignore */
      }
    });
  }

  window.CupalCms = {
    getFaqCustom: getFaqCustom,
    getFaqHidden: getFaqHidden,
    isFaqHidden: isFaqHidden,
    hideFaq: hideFaq,
    showFaq: showFaq,
    addFaqCustom: addFaqCustom,
    removeFaqCustom: removeFaqCustom,
    getFaqCustomById: getFaqCustomById,
    getStoreNotes: getStoreNotes,
    addStoreNote: addStoreNote,
    removeStoreNote: removeStoreNote,
    resetCms: resetCms
  };
})();
