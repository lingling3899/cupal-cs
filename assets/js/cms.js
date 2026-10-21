(function () {
  "use strict";

  var PREFIX = "cupal_cms_";
  var KEYS = {
    faqCustom: PREFIX + "faq_custom",
    faqHidden: PREFIX + "faq_hidden",
    notesStores: PREFIX + "notes_stores",
    ingNotes: PREFIX + "ing_notes"
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

  /* ---- Ingredient breakdown notes (staff) ---- */
  function emptyIngNotes() {
    return { ingredients: [], benefits: [], updatedAt: null };
  }

  function getAllIngredientNotes() {
    var map = readJson(KEYS.ingNotes, {});
    return map && typeof map === "object" && !Array.isArray(map) ? map : {};
  }

  function getIngredientNotes(productId) {
    var pid = String(productId || "").trim();
    if (!pid) return emptyIngNotes();
    var row = getAllIngredientNotes()[pid];
    if (!row || typeof row !== "object") return emptyIngNotes();
    return {
      ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
      benefits: Array.isArray(row.benefits) ? row.benefits : [],
      updatedAt: row.updatedAt || null
    };
  }

  function setIngredientNotes(productId, data) {
    var pid = String(productId || "").trim();
    if (!pid) return false;
    var map = getAllIngredientNotes();
    var next = {
      ingredients: Array.isArray(data && data.ingredients) ? data.ingredients : [],
      benefits: Array.isArray(data && data.benefits) ? data.benefits : [],
      updatedAt: new Date().toISOString()
    };
    map[pid] = next;
    return writeJson(KEYS.ingNotes, map);
  }

  function addIngredient(productId, fields) {
    var pid = String(productId || "").trim();
    var name = String((fields && fields.name) || "").trim();
    if (!pid) return { ok: false, error: "請先揀產品" };
    if (!name) return { ok: false, error: "請填成份名" };
    var notes = getIngredientNotes(pid);
    var row = {
      id: uid("ing"),
      name: name,
      role: String((fields && fields.role) || "").trim(),
      detail: String((fields && fields.detail) || "").trim(),
      benefit: String((fields && fields.benefit) || "").trim(),
      note: String((fields && fields.note) || "").trim()
    };
    notes.ingredients.push(row);
    setIngredientNotes(pid, notes);
    return { ok: true, item: row };
  }

  function updateIngredient(productId, id, fields) {
    var pid = String(productId || "").trim();
    var iid = String(id || "");
    if (!pid || !iid) return { ok: false, error: "缺少產品或成份" };
    var notes = getIngredientNotes(pid);
    var found = null;
    notes.ingredients = notes.ingredients.map(function (ing) {
      if (ing.id !== iid) return ing;
      found = {
        id: ing.id,
        name: fields && fields.name != null ? String(fields.name).trim() : ing.name,
        role: fields && fields.role != null ? String(fields.role).trim() : ing.role,
        detail: fields && fields.detail != null ? String(fields.detail).trim() : ing.detail,
        benefit: fields && fields.benefit != null ? String(fields.benefit).trim() : ing.benefit,
        note: fields && fields.note != null ? String(fields.note).trim() : ing.note
      };
      if (!found.name) found.name = ing.name;
      return found;
    });
    if (!found) return { ok: false, error: "搵唔到呢個成份" };
    setIngredientNotes(pid, notes);
    return { ok: true, item: found };
  }

  function removeIngredient(productId, id) {
    var pid = String(productId || "").trim();
    var iid = String(id || "");
    if (!pid || !iid) return;
    var notes = getIngredientNotes(pid);
    notes.ingredients = notes.ingredients.filter(function (ing) { return ing.id !== iid; });
    setIngredientNotes(pid, notes);
  }

  function setBenefits(productId, stringArray) {
    var pid = String(productId || "").trim();
    if (!pid) return { ok: false, error: "請先揀產品" };
    var notes = getIngredientNotes(pid);
    var list = Array.isArray(stringArray) ? stringArray : [];
    notes.benefits = list
      .map(function (s) { return String(s || "").trim(); })
      .filter(Boolean);
    setIngredientNotes(pid, notes);
    return { ok: true, benefits: notes.benefits };
  }

  function addBenefit(productId, text) {
    var t = String(text || "").trim();
    if (!t) return { ok: false, error: "請填優點" };
    var notes = getIngredientNotes(productId);
    notes.benefits.push(t);
    setIngredientNotes(productId, notes);
    return { ok: true };
  }

  function removeBenefit(productId, index) {
    var notes = getIngredientNotes(productId);
    var i = Number(index);
    if (!isFinite(i) || i < 0 || i >= notes.benefits.length) return;
    notes.benefits.splice(i, 1);
    setIngredientNotes(productId, notes);
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
    getIngredientNotes: getIngredientNotes,
    setIngredientNotes: setIngredientNotes,
    addIngredient: addIngredient,
    updateIngredient: updateIngredient,
    removeIngredient: removeIngredient,
    setBenefits: setBenefits,
    addBenefit: addBenefit,
    removeBenefit: removeBenefit,
    resetCms: resetCms
  };
})();
