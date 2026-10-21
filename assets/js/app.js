(function () {
  "use strict";

  var products = window.CUPAL_PRODUCTS || [];
  var storeData = window.CUPAL_STORES || {};
  var watsons = Array.isArray(storeData.watsons) ? storeData.watsons : [];

  var state = {
    view: "qa",
    productId: "",
    productChannel: "",
    productSubFilter: "",
    faqKey: "",
    faqShowHidden: false,
    storeRegion: "",
    storeDistrict: "",
    storeQuery: "",
    storePromoterOnly: false
  };

  var REGION_LABEL = { "": "全部", hk: "香港", kln: "九龍", nt: "新界" };
  var DISTRICT_REGION = {
    中西: "hk", 灣仔: "hk", 東: "hk", 南: "hk",
    油尖旺: "kln", 深水埗: "kln", 九龍城: "kln", 黃大仙: "kln", 觀塘: "kln",
    葵青: "nt", 荃灣: "nt", 屯門: "nt", 元朗: "nt", 北: "nt",
    大埔: "nt", 沙田: "nt", 西貢: "nt", 離島: "nt"
  };

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function auth() { return window.CupalAdminAuth || null; }
  function cms() { return window.CupalCms || null; }
  function isStaff() { return !!(auth() && auth().isLoggedIn()); }

  function escapeHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function nl2br(s) {
    return escapeHtml(s).replace(/\n/g, "<br>");
  }

  function resolveIngredientBundle(p) {
    if (!p) return { ingredients: [], benefits: [] };
    var cmsNotes = cms() ? cms().getIngredientNotes(p.id) : null;
    var cmsIngs = cmsNotes && Array.isArray(cmsNotes.ingredients) ? cmsNotes.ingredients : [];
    var cmsBens = cmsNotes && Array.isArray(cmsNotes.benefits) ? cmsNotes.benefits : [];
    if (cmsIngs.length || cmsBens.length) {
      return { ingredients: cmsIngs, benefits: cmsBens };
    }
    return {
      ingredients: Array.isArray(p.ingredientDetails) ? p.ingredientDetails : [],
      benefits: Array.isArray(p.benefits) ? p.benefits : []
    };
  }

  function staffIngredientCardsHtml(p, opts) {
    opts = opts || {};
    var bundle = resolveIngredientBundle(p);
    var ings = bundle.ingredients;
    if (!ings.length) return "";
    var editable = !!opts.editable;
    return (
      '<div class="sip-ing-grid">' +
      ings
        .map(function (ing) {
          var role = String(ing.role || "");
          var warn = /⚠|注意|樟腦|排除|毒性|G6PD|蠶豆/.test(
            role + (ing.note || "") + (ing.detail || "")
          );
          var roleCls = warn ? "sip-role warn" : "sip-role";
          var html =
            '<article class="sip-ing-card">' +
            '<div class="sip-ing-top">' +
            '<span class="sip-ing-name">' +
            escapeHtml(ing.name) +
            "</span>" +
            (role ? '<span class="' + roleCls + '">' + escapeHtml(role) + "</span>" : "") +
            "</div>" +
            (ing.detail
              ? '<p class="sip-ing-detail">' + escapeHtml(ing.detail) + "</p>"
              : "");
          if (ing.benefit) {
            html += '<p class="sip-ing-benefit">好處：' + escapeHtml(ing.benefit) + "</p>";
          }
          if (ing.note) {
            html += '<p class="sip-ing-note">注意：' + escapeHtml(ing.note) + "</p>";
          }
          if (editable && ing.id) {
            html +=
              '<button type="button" class="sip-ing-del" data-ing-del="' +
              escapeHtml(ing.id) +
              '">刪除</button>';
          }
          html += "</article>";
          return html;
        })
        .join("") +
      "</div>"
    );
  }

  function staffBenefitsListHtml(p) {
    var bundle = resolveIngredientBundle(p);
    var bens = bundle.benefits;
    if (!bens.length) return "";
    return (
      '<ul class="sip-benefits">' +
      bens.map(function (b) { return "<li>" + escapeHtml(b) + "</li>"; }).join("") +
      "</ul>"
    );
  }

  function renderStaffIngredientPanel(p) {
    var el = $("#staffIngredientPanel");
    var form = $("#ingNoteForm");
    var logged = isStaff();
    if (el) {
      el.classList.toggle("hidden", !logged);
      el.classList.add("admin-only");
      if (!logged) {
        el.innerHTML = "";
      } else if (!p) {
        el.innerHTML = '<p class="sip-empty">請先揀產品，再編輯成份拆解。</p>';
      } else {
        var cards = staffIngredientCardsHtml(p, { editable: true });
        var bens = staffBenefitsListHtml(p);
        var body =
          '<div class="sip-head"><span class="staff-badge">職員</span> 成份拆解註解</div>' +
          '<p class="sip-sub">CS 話術拆解 · 訪客睇唔到 · 請以包裝標籤為準</p>';
        if (!cards && !bens) {
          body += '<p class="sip-empty">呢款暫時未有拆解資料——用下面表單加入。</p>';
        } else {
          if (cards) body += '<div class="sip-section-title">成份</div>' + cards;
          if (bens) body += '<div class="sip-section-title">優點</div>' + bens;
        }
        el.innerHTML = body;
      }
    }
    if (form) {
      form.classList.toggle("hidden", !(logged && p));
      form.classList.add("admin-only");
      if (logged && p) {
        var notes = cms() ? cms().getIngredientNotes(p.id) : { benefits: [] };
        var ta = $("#ingBenefitsText");
        if (ta && document.activeElement !== ta) {
          ta.value = (notes.benefits || []).join("\n");
        }
      }
    }
  }

  function staffIngredientAnswerHtml(p) {
    if (!isStaff() || !p) return "";
    var cards = staffIngredientCardsHtml(p, { editable: false });
    var bens = staffBenefitsListHtml(p);
    if (!cards && !bens) return "";
    return (
      '<div class="staff-ing-answer" role="note">' +
      '<strong><span class="staff-badge">職員</span> 成份／優點拆解</strong>' +
      (cards ? '<div class="sip-section-title">成份</div>' + cards : "") +
      (bens ? '<div class="sip-section-title">優點</div>' + bens : "") +
      "</div>"
    );
  }


  function getProduct(id) {
    var pid = id || state.productId || ($("#productSelect") && $("#productSelect").value);
    return products.find(function (p) { return p.id === pid; }) || null;
  }

  function normalizeDistrict(d) {
    return String(d || "").trim().replace(/區$/u, "").replace(/\s+/g, "");
  }

  function regionOfStore(s) {
    if (!s) return "";
    var d = normalizeDistrict(s.district);
    if (d && DISTRICT_REGION[d]) return DISTRICT_REGION[d];
    var addr = String(s.address || "");
    if (/九龍/.test(addr)) return "kln";
    if (/新界|屯門|元朗|沙田|大埔|荃灣|葵涌|青衣|將軍澳|天水圍|上水|粉嶺|東涌|馬鞍山|離島/.test(addr)) return "nt";
    if (/香港|中環|銅鑼灣|北角|香港仔|柴灣|筲箕灣|灣仔|西環|上環/.test(addr)) return "hk";
    return "";
  }

  function mapsUrl(s) {
    var q = [s.name, s.address].filter(Boolean).join(" ");
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);
  }

  function primaryTelDigits(tel) {
    var s = String(tel || "");
    var m = s.match(/\d[\d\s-]{6,}\d/);
    if (m) return m[0].replace(/\D/g, "");
    return s.replace(/\D/g, "").slice(0, 8);
  }

  function telHref(tel) {
    var dig = primaryTelDigits(tel);
    return dig ? "tel:+852" + dig : "";
  }

  function formatTelDisplay(tel) {
    return String(tel || "").trim();
  }

  /* ---- views ---- */
  function setView(name) {
    state.view = name;
    $$(".nav-tabs button[data-view]").forEach(function (b) {
      b.classList.toggle("active", b.getAttribute("data-view") === name);
    });
    ["qa", "stores", "about", "login", "account"].forEach(function (v) {
      var el = $("#view-" + v);
      if (el) el.classList.toggle("hidden", v !== name);
    });
    if (name === "stores") {
      syncStoreProductSelect();
      renderStores();
      renderStoreNotes();
    }
    closeLoginDropdown();
  }

  function refreshAdminUi() {
    var logged = isStaff();
    $$(".admin-only").forEach(function (el) {
      el.classList.toggle("hidden", !logged);
    });
    var btn = $("#headerLoginBtn");
    if (btn) {
      btn.classList.toggle("is-in", logged);
      btn.setAttribute("aria-label", logged ? "職員選單" : "職員登入");
      var outI = btn.querySelector(".hdr-icon-out");
      var inI = btn.querySelector(".hdr-icon-in");
      var dot = btn.querySelector(".hdr-login-dot");
      if (outI) outI.classList.toggle("hidden", logged);
      if (inI) inI.classList.toggle("hidden", !logged);
      if (dot) dot.classList.toggle("hidden", !logged);
    }
    var hint = $("#footerStaffHint");
    if (hint) hint.textContent = logged ? "職員已登入（本機 session）" : "職員：撳右上角圖示登入";
    renderFaqGrid();
    renderProductMeta();
    if (state.faqKey) showAnswer(state.faqKey);
    renderStoreNotes();
  }

  function closeLoginDropdown() {
    var dd = $("#loginDropdown");
    if (dd) dd.classList.add("hidden");
    var btn = $("#headerLoginBtn");
    if (btn) btn.setAttribute("aria-expanded", "false");
  }

  /* ---- product / FAQ ---- */
  function isWatsonsShelf(p) {
    return !!(p && p.watsonsShelf);
  }

  function isPureConsign(p) {
    return !!(p && p.consignment && !p.watsonsShelf);
  }

  function productChannelTag(p) {
    if (isWatsonsShelf(p)) return " 〔屈臣氏〕";
    if (isPureConsign(p)) return " 〔寄賣〕";
    if (p && p.consignment) return " 〔寄賣〕";
    return "";
  }

  function productMatchesFilter(p) {
    var ch = state.productChannel || "";
    var sub = state.productSubFilter || "";
    if (!ch) return true;
    if (ch === "watsons") return isWatsonsShelf(p);
    if (ch === "consign") {
      if (!isPureConsign(p)) return false;
      if (!sub) return true;
      return p.filterGroup === sub;
    }
    return true;
  }

  function filteredProducts() {
    return products.filter(function (p) { return productMatchesFilter(p); });
  }

  function syncConsignSubChips() {
    var subWrap = $("#productConsignSubChips");
    if (!subWrap) return;
    var show = state.productChannel === "consign";
    subWrap.classList.toggle("hidden", !show);
    if (show) subWrap.removeAttribute("hidden");
    else subWrap.setAttribute("hidden", "");
    if (!show) {
      state.productSubFilter = "";
      $$("#productConsignSubChips .filter-chip").forEach(function (b) {
        var on = (b.getAttribute("data-sub") || "") === "";
        b.classList.toggle("active", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    }
  }

  function afterProductFilterChange() {
    syncConsignSubChips();
    fillProductSelects();
    renderProductMeta();
    renderFaqGrid();
    var ap = $("#answerPanel");
    if (ap) {
      ap.className = "answer empty";
      ap.innerHTML = "揀咗產品後，撳上面問題掣即睇答案。";
    }
    state.faqKey = "";
  }

  function fillProductSelects() {
    var list = filteredProducts();
    var opts = '<option value="">— 請選擇產品 —</option>' +
      list.map(function (p) {
        var tag = productChannelTag(p);
        return '<option value="' + escapeHtml(p.id) + '">' + escapeHtml(p.nameZh) + tag + "</option>";
      }).join("");
    var sel = $("#productSelect");
    if (sel) {
      var prev = state.productId || sel.value;
      sel.innerHTML = opts;
      if (prev && list.some(function (p) { return p.id === prev; })) {
        sel.value = prev;
      } else {
        sel.value = "";
        state.productId = "";
        state.faqKey = "";
      }
    }
    var storeOpts = '<option value="">— 請選擇產品 —</option>' +
      list.map(function (p) {
        var tag = productChannelTag(p);
        return '<option value="' + escapeHtml(p.id) + '">' + escapeHtml(p.nameZh) + tag + "</option>";
      }).join("");
    var storeSel = $("#storeProductSelect");
    if (storeSel) {
      var sp = state.productId || storeSel.value;
      storeSel.innerHTML = storeOpts;
      if (sp && list.some(function (p) { return p.id === sp; })) storeSel.value = sp;
      else storeSel.value = "";
    }
  }

  function bindProductFilters() {
    var chWrap = $("#productChannelChips");
    if (chWrap && !chWrap._bound) {
      chWrap._bound = true;
      chWrap.addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-channel]");
        if (!btn) return;
        state.productChannel = btn.getAttribute("data-channel") || "";
        state.productSubFilter = "";
        $$("#productChannelChips .filter-chip").forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("active", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        afterProductFilterChange();
      });
    }
    var subWrap = $("#productConsignSubChips");
    if (subWrap && !subWrap._bound) {
      subWrap._bound = true;
      subWrap.addEventListener("click", function (e) {
        var btn = e.target.closest("button[data-sub]");
        if (!btn) return;
        if (state.productChannel !== "consign") return;
        state.productSubFilter = btn.getAttribute("data-sub") || "";
        $$("#productConsignSubChips .filter-chip").forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("active", on);
          b.setAttribute("aria-pressed", on ? "true" : "false");
        });
        afterProductFilterChange();
      });
    }
  }

  function renderProductMeta() {
    var p = getProduct();
    var box = $("#productMeta");
    var staff = $("#staffNotesPanel");
    if (!box) return;
    if (!p) {
      box.className = "product-card empty";
      box.innerHTML = "請先揀一款產品，再撳下面問題掣。";
      if (staff) { staff.classList.add("hidden"); staff.innerHTML = ""; }
      renderStaffIngredientPanel(null);
      return;
    }
    box.className = "product-card";
    var consignBadge = isPureConsign(p)
      ? '<span class="badge-consign">寄賣／非上架</span>'
      : (isWatsonsShelf(p) ? '<span class="badge-watsons">屈臣氏貨</span>' : "");
    var links = "";
    if (p.officialUrl) {
      links += '<a href="' + escapeHtml(p.officialUrl) + '" target="_blank" rel="noopener">公開產品／系列頁</a>';
    }
    if (p.hktvSearchUrl) {
      links += (links ? "　｜　" : "") +
        '<a href="' + escapeHtml(p.hktvSearchUrl) + '" target="_blank" rel="noopener">HKTVmall 搜尋</a>';
    }
    box.innerHTML =
      '<div class="pc-emoji" aria-hidden="true">' + escapeHtml(p.emoji || "📦") + "</div>" +
      '<p class="pc-title">' + escapeHtml(p.nameZh) + consignBadge + "</p>" +
      '<p class="pc-meta">' + escapeHtml(p.category || "") + "　｜　" + escapeHtml(p.form || "") + "</p>" +
      (p.keyIngredients && p.keyIngredients.length
        ? '<p class="pc-meta">成份重點：' + escapeHtml(p.keyIngredients.join("、")) + "</p>"
        : "") +
      (p.disclaimer
        ? '<p class="pc-meta" style="margin-top:6px">' + escapeHtml(p.disclaimer) + "</p>"
        : "") +
      (links ? '<p class="pc-meta" style="margin-top:6px">' + links + "</p>" : "");

    if (staff) {
      var staffBits = [];
      if (p.skuCode || p.consignCode || p.standardPrice != null) {
        staffBits.push(
          '<div class="staff-codes">' +
          (p.skuCode ? "SKU <code>" + escapeHtml(p.skuCode) + "</code>　" : "") +
          (p.consignCode ? "寄賣碼 <code>" + escapeHtml(String(p.consignCode)) + "</code>　" : "") +
          (p.standardPrice != null ? "參考標準價 <strong>$" + escapeHtml(String(p.standardPrice)) + "</strong>（以落貨／門市為準，唔對外當現售網價）" : "") +
          "</div>"
        );
      }
      if (p.staffNotes) {
        staffBits.push('<div class="staff-answer-body">' + nl2br(p.staffNotes) + "</div>");
      }
      if (isStaff() && staffBits.length) {
        staff.classList.remove("hidden");
        staff.innerHTML =
          '<h3>職員備註 <span class="badge">只職員見</span></h3>' +
          staffBits.join("");
      } else {
        staff.classList.add("hidden");
        staff.innerHTML = "";
      }
    }

    var sp = $("#storeProductMeta");
    if (sp) {
      if (!p) {
        sp.className = "product-card compact empty";
        sp.innerHTML = "";
      } else {
        sp.className = "product-card compact";
        sp.innerHTML =
          '<p class="pc-title">' + escapeHtml(p.emoji || "") + " " + escapeHtml(p.nameZh) + "</p>" +
          '<p class="pc-meta">' + escapeHtml(p.whereToBuy || "") + "</p>";
      }
    }

    renderStaffIngredientPanel(p);
  }

  function faqKeyFor(p, faqId) {
    return (p ? p.id : "x") + "::" + faqId;
  }

  function renderFaqGrid() {
    var grid = $("#faqGrid");
    if (!grid) return;
    var p = getProduct();
    var c = cms();
    var logged = isStaff();
    var hidden = c ? c.getFaqHidden() : [];
    var parts = [];

    if (!p) {
      grid.innerHTML = '<p class="count" style="grid-column:1/-1">請先揀產品。</p>';
      return;
    }

    (p.faqs || []).forEach(function (f) {
      var key = faqKeyFor(p, f.id);
      var isHid = hidden.indexOf(key) !== -1;
      if (isHid && !(logged && state.faqShowHidden)) return;
      var active = state.faqKey === key ? " active" : "";
      var hidCls = isHid ? " is-hidden-admin" : "";
      var ops = "";
      if (logged) {
        ops =
          '<span class="faq-admin-ops"><button type="button" data-faq-hide="' +
          escapeHtml(key) +
          '">' +
          (isHid ? "顯示" : "隱藏") +
          "</button></span>";
      }
      parts.push(
        '<button type="button" class="faq-card' +
          active +
          hidCls +
          '" data-q="' +
          escapeHtml(key) +
          '"><span class="faq-ico" aria-hidden="true">' +
          escapeHtml(f.icon || "❓") +
          '</span><span class="faq-label">' +
          escapeHtml(f.label) +
          "</span>" +
          ops +
          "</button>"
      );
    });

    if (c) {
      c.getFaqCustom()
        .filter(function (item) {
          return !item.productId || item.productId === p.id;
        })
        .forEach(function (item) {
          var key = "custom:" + item.id;
          var isHid = hidden.indexOf(key) !== -1;
          if (isHid && !(logged && state.faqShowHidden)) return;
          var active = state.faqKey === key ? " active" : "";
          var hidCls = isHid ? " is-hidden-admin" : "";
          var ops = "";
          if (logged) {
            ops =
              '<span class="faq-admin-ops">' +
              '<button type="button" data-faq-hide="' +
              escapeHtml(key) +
              '">' +
              (isHid ? "顯示" : "隱藏") +
              "</button>" +
              '<button type="button" data-faq-del="' +
              escapeHtml(item.id) +
              '">刪</button></span>';
          }
          parts.push(
            '<button type="button" class="faq-card' +
              active +
              hidCls +
              '" data-q="' +
              escapeHtml(key) +
              '"><span class="faq-ico" aria-hidden="true">' +
              escapeHtml(item.icon || "❓") +
              '</span><span class="faq-label">' +
              escapeHtml(item.label) +
              "</span>" +
              ops +
              "</button>"
          );
        });
    }

    grid.innerHTML = parts.join("") || '<p class="count" style="grid-column:1/-1">暫時冇可見問題。</p>';
  }

  function showAnswer(key) {
    var box = $("#answerPanel");
    if (!box) return;
    state.faqKey = key;
    var p = getProduct();
    var html = "";
    var c = cms();

    if (String(key).startsWith("custom:")) {
      var item = c && c.getFaqCustomById(String(key).slice(7));
      if (!item) {
        box.className = "answer empty";
        box.innerHTML = "呢條自訂問題已唔見咗。";
        return;
      }
      html =
        (p ? "【" + escapeHtml(p.nameZh) + "】" : "") +
        escapeHtml(item.label) +
        "<br><br>" +
        nl2br(item.answer) +
        (isStaff() ? '<div class="meta">職員新增答案（本機儲存）</div>' : "");
      box.className = "answer";
      box.innerHTML = html;
      renderFaqGrid();
      return;
    }

    if (!p) {
      box.className = "answer empty";
      box.innerHTML = "請先選擇產品。";
      return;
    }

    var faqId = String(key).split("::")[1] || "";
    var f = (p.faqs || []).find(function (x) { return x.id === faqId; });
    if (!f) {
      box.className = "answer empty";
      box.innerHTML = "請選擇問題。";
      return;
    }

    html =
      "【" +
      escapeHtml(p.nameZh) +
      "】" +
      escapeHtml(f.label) +
      "<br><br>" +
      nl2br(f.answer);

    if (faqId === "where") {
      html +=
        '<div class="meta">' +
        '<button type="button" class="chip" id="answerGoStores">去門店電話簿 →</button>' +
        (storeData.officialSite
          ? '<a class="btn-link" href="' +
            escapeHtml(storeData.officialSite) +
            '" target="_blank" rel="noopener">古寶官網</a>'
          : "") +
        (storeData.hktvmallSearch
          ? '<a class="btn-link" href="' +
            escapeHtml(storeData.hktvmallSearch) +
            '" target="_blank" rel="noopener">HKTVmall 搜古寶</a>'
          : "") +
        "</div>";
    } else if (p.priceNote && (faqId === "about" || faqId === "where")) {
      html += '<div class="meta">' + escapeHtml(p.priceNote) + "</div>";
    }

    if (p.officialUrl && faqId !== "where") {
      html +=
        '<div class="meta"><a class="btn-link" href="' +
        escapeHtml(p.officialUrl) +
        '" target="_blank" rel="noopener">參考官網相關頁</a></div>';
    }

    if (isStaff() && f.staffAnswer) {
      html +=
        '<div class="staff-answer-note" role="note"><strong><span class="staff-badge">職員</span> 職員備註</strong>（訪客睇唔到）' +
        '<div class="staff-answer-body">' +
        nl2br(f.staffAnswer) +
        "</div></div>";
    } else if (isStaff() && p.staffNotes && faqId === "about") {
      html +=
        '<div class="staff-answer-note" role="note"><strong><span class="staff-badge">職員</span> 職員備註</strong>' +
        '<div class="staff-answer-body">' +
        nl2br(p.staffNotes) +
        "</div></div>";
    }

    if (faqId === "ingredients") {
      html += staffIngredientAnswerHtml(p);
    }

    html += '<div class="meta">請以包裝標籤／說明書為準；參考用途，非醫療建議。</div>';

    box.className = "answer";
    box.innerHTML = html;
    var go = $("#answerGoStores");
    if (go) {
      go.addEventListener("click", function () {
        setView("stores");
        var sp = $("#storeProductSelect");
        if (sp && state.productId) sp.value = state.productId;
        syncStoreProductSelect();
        renderStores();
      });
    }
    renderFaqGrid();
  }

  /* ---- stores ---- */

  function setPromoterFilter(on, opts) {
    opts = opts || {};
    state.storePromoterOnly = !!on;
    $$("#promoterChips .region-chip").forEach(function (x) {
      var isOn;
      if (x.getAttribute("data-promoter") === "1") isOn = state.storePromoterOnly;
      else isOn = !state.storePromoterOnly;
      x.classList.toggle("active", isOn);
      x.setAttribute("aria-pressed", isOn ? "true" : "false");
    });
    if (!opts.skipRender) renderStores();
  }

  function selectedStoreProduct() {
    var sp = $("#storeProductSelect");
    var id = (sp && sp.value) || state.productId || "";
    if (!id) return null;
    for (var i = 0; i < products.length; i++) {
      if (products[i].id === id) return products[i];
    }
    return null;
  }

  function isConsignStoreProduct(p) {
    return !!(p && p.consignment && !p.watsonsShelf);
  }

  function applyConsignStoreLock() {
    var p = selectedStoreProduct();
    var lock = isConsignStoreProduct(p);
    var chips = $("#promoterChips");
    if (chips) chips.classList.toggle("locked-consign", lock);
    $$("#promoterChips .region-chip").forEach(function (x) {
      var isAll = x.getAttribute("data-promoter") !== "1";
      if (lock && isAll) {
        x.classList.add("hidden");
        x.setAttribute("aria-hidden", "true");
      } else {
        x.classList.remove("hidden");
        x.removeAttribute("aria-hidden");
      }
      x.disabled = !!(lock && isAll);
    });
    if (lock) setPromoterFilter(true, { skipRender: true });
    return lock;
  }

  function maybeHintPromoterForProduct() {
    var p = selectedStoreProduct() || getProduct();
    var hint = $("#promoterSoftHint");
    if (!hint) return;
    if (isConsignStoreProduct(p)) {
      hint.classList.remove("hidden");
      hint.innerHTML =
        "寄賣貨實體店：只顯示<strong>9 間有推廣員嘅屈臣氏</strong>（唔等於即時有貨或推廣員一定在場——請致電確認）。";
    } else if (p && p.consignment) {
      hint.classList.remove("hidden");
      hint.innerHTML =
        "呢款亦有寄賣落貨碼；門店電話簿預設全部屈臣氏，可撳「有寄賣推廣員」睇推廣員店。";
    } else {
      hint.classList.add("hidden");
      hint.innerHTML = "";
    }
  }

  function syncStoreProductSelect() {
    var sp = $("#storeProductSelect");
    var qa = $("#productSelect");
    if (sp && qa && qa.value && !sp.value) sp.value = qa.value;
    if (sp && sp.value) state.productId = sp.value;
    applyConsignStoreLock();
    renderProductMeta();
    maybeHintPromoterForProduct();
  }

  function uniqueDistricts(list) {
    var set = {};
    list.forEach(function (s) {
      var d = s.district || "其他";
      set[d] = true;
    });
    return Object.keys(set).sort(function (a, b) {
      return a.localeCompare(b, "zh-Hant");
    });
  }

  function filteredStores() {
    var consignLock = isConsignStoreProduct(selectedStoreProduct());
    var promoterOnly = state.storePromoterOnly || consignLock;
    var list = watsons.filter(function (s) {
      if (promoterOnly && !s.consignPromoter) return false;
      if (state.storeRegion && regionOfStore(s) !== state.storeRegion) return false;
      if (state.storeDistrict && String(s.district || "") !== state.storeDistrict) return false;
      if (state.storeQuery) {
        var q = state.storeQuery.toLowerCase();
        var blob = (
          (s.name || "") +
          " " +
          (s.address || "") +
          " " +
          (s.district || "") +
          " " +
          (s.tel || "") +
          " " +
          (s.watsonsCode || "") +
          " " +
          (s.watsonsStoreNo || "")
        ).toLowerCase();
        if (blob.indexOf(q) === -1) return false;
      }
      return true;
    });
    /* 推廣員篩選／寄賣貨鎖定時，電話簿重複紀錄按店碼去重，顯示 9 間 */
    if (promoterOnly) {
      var seen = {};
      list = list.filter(function (s) {
        var k = s.watsonsCode || s.id;
        if (seen[k]) return false;
        seen[k] = true;
        return true;
      });
      list.sort(function (a, b) {
        return String(a.watsonsCode || "").localeCompare(String(b.watsonsCode || ""));
      });
    }
    return list;
  }

  function renderStores() {
    applyConsignStoreLock();
    var note = $("#directoryNote");
    if (note) {
      var meta = storeData.consignPromoters || {};
      var promoterN = watsons.filter(function (s) { return s.consignPromoter; }).length;
      var uniqCodes = {};
      watsons.forEach(function (s) {
        if (s.consignPromoter && s.watsonsCode) uniqCodes[s.watsonsCode] = true;
      });
      var uniqN = Object.keys(uniqCodes).length;
      var base =
        (storeData.salesPointsNote ||
          "電話簿非該產品一定有貨——請致電確認。") +
        " 共 " +
        watsons.length +
        " 間屈臣氏電話紀錄。";
      if (isConsignStoreProduct(selectedStoreProduct())) {
        note.textContent =
          "寄賣貨實體店只顯示有推廣員嘅屈臣氏（共 " +
          uniqN +
          " 間）" +
          (meta.asOf ? "；名單截至 " + meta.asOf : "") +
          "。唔等於即時有貨或推廣員一定在場——請致電確認。";
      } else {
        if (uniqN) {
          base +=
            " 其中 " +
            uniqN +
            " 間標明有寄賣產品推廣員" +
            (meta.asOf ? "（名單截至 " + meta.asOf + "）" : "") +
            "——排更／在場請致電確認。";
        }
        note.textContent = base;
      }
    }

    var consignLock = isConsignStoreProduct(selectedStoreProduct());
    var promoterOnly = state.storePromoterOnly || consignLock;
    var regionSource = promoterOnly
      ? watsons.filter(function (s) { return s.consignPromoter; })
      : watsons;
    var regionList = state.storeRegion
      ? regionSource.filter(function (s) { return regionOfStore(s) === state.storeRegion; })
      : regionSource;
    var districts = uniqueDistricts(regionList);
    var distSel = $("#districtSelect");
    if (distSel) {
      var cur = state.storeDistrict;
      distSel.innerHTML =
        '<option value="">全部分區內地區</option>' +
        districts
          .map(function (d) {
            return (
              '<option value="' +
              escapeHtml(d) +
              '"' +
              (d === cur ? " selected" : "") +
              ">" +
              escapeHtml(d) +
              "</option>"
            );
          })
          .join("");
      if (cur && districts.indexOf(cur) === -1) {
        state.storeDistrict = "";
        distSel.value = "";
      }
    }

    var list = filteredStores();
    var count = $("#storeCount");
    if (count) {
      count.textContent =
        "顯示 " +
        list.length +
        " 間" +
        (state.storePromoterOnly ? "（有寄賣推廣員）" : "") +
        (state.storeRegion ? "（" + (REGION_LABEL[state.storeRegion] || "") + "）" : "") +
        "｜電話簿 ≠ 庫存";
    }

    var box = $("#storeList");
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<p class="count">呢個篩選暫時冇分店。可試「全部屈臣氏」或清搜尋。</p>';
      return;
    }
    box.innerHTML = list
      .map(function (s) {
        var tel = telHref(s.tel);
        var badge = s.consignPromoter
          ? '<span class="badge-promoter">寄賣推廣員</span>'
          : "";
        var metaBits = [];
        if (s.hours) metaBits.push("營業 " + s.hours);
        if (s.watsonsCode) metaBits.push("店碼 " + s.watsonsCode);
        if (s.watsonsStoreNo) metaBits.push("No. " + s.watsonsStoreNo);
        var metaLine = metaBits.length
          ? "<p class=\"store-meta\">" + escapeHtml(metaBits.join("　｜　")) + "</p>"
          : "";
        return (
          '<article class="store-card' +
          (s.consignPromoter ? " has-promoter" : "") +
          '">' +
          "<h4>" +
          escapeHtml(s.name) +
          badge +
          "</h4>" +
          "<p>" +
          escapeHtml(s.district || "") +
          "　｜　" +
          escapeHtml(REGION_LABEL[regionOfStore(s)] || "") +
          "</p>" +
          "<p>" +
          escapeHtml(s.address || "") +
          "</p>" +
          metaLine +
          '<div class="store-actions">' +
          (tel
            ? '<a href="' + tel + '">📞 ' + escapeHtml(formatTelDisplay(s.tel)) + "</a>"
            : "") +
          '<a href="' +
          escapeHtml(mapsUrl(s)) +
          '" target="_blank" rel="noopener">地圖</a>' +
          "</div></article>"
        );
      })
      .join("");
  }

  function renderStoreNotes() {
    var panel = $("#storesStaffNotes");
    var listEl = $("#storesNotesList");
    if (!panel || !listEl) return;
    if (!isStaff()) {
      panel.classList.add("hidden");
      return;
    }
    panel.classList.remove("hidden");
    var notes = (cms() && cms().getStoreNotes()) || [];
    listEl.innerHTML = notes.length
      ? notes
          .map(function (n) {
            return (
              "<li>" +
              escapeHtml(n.text) +
              ' <button type="button" data-note-del="' +
              escapeHtml(n.id) +
              '">刪</button></li>'
            );
          })
          .join("")
      : "<li>（未有備註）</li>";
  }

  function renderSalesPoints() {
    var ul = $("#salesPointsList");
    if (!ul) return;
    var items = [
      "屈臣氏（電話簿見下方；非全線一定有古寶）",
      "HKTVmall（搜「古寶」；授權賣家為準）",
      "古寶官網 cupal.com.hk",
      "各大藥房／專賣",
      "The Club（部分 SKU，如液體鈣）"
    ];
    ul.innerHTML = items.map(function (t) { return "<li>" + escapeHtml(t) + "</li>"; }).join("");
  }

  /* ---- events ---- */
  function bind() {
    $$(".nav-tabs button[data-view]").forEach(function (b) {
      b.addEventListener("click", function () {
        setView(b.getAttribute("data-view"));
      });
    });

    var ps = $("#productSelect");
    if (ps) {
      ps.addEventListener("change", function () {
        state.productId = ps.value;
        state.faqKey = "";
        var box = $("#answerPanel");
        if (box) {
          box.className = "answer empty";
          box.innerHTML = "揀咗產品後，撳上面問題掣即睇答案。";
        }
        renderProductMeta();
        renderFaqGrid();
        var sp = $("#storeProductSelect");
        if (sp) sp.value = ps.value;
      });
    }

    var sps = $("#storeProductSelect");
    if (sps) {
      sps.addEventListener("change", function () {
        state.productId = sps.value;
        var qa = $("#productSelect");
        if (qa) qa.value = sps.value;
        renderProductMeta();
        maybeHintPromoterForProduct();
      });
    }

    $("#faqGrid") &&
      $("#faqGrid").addEventListener("click", function (e) {
        var hideBtn = e.target.closest("[data-faq-hide]");
        if (hideBtn && isStaff() && cms()) {
          e.preventDefault();
          e.stopPropagation();
          var k = hideBtn.getAttribute("data-faq-hide");
          if (cms().isFaqHidden(k)) cms().showFaq(k);
          else cms().hideFaq(k);
          renderFaqGrid();
          return;
        }
        var delBtn = e.target.closest("[data-faq-del]");
        if (delBtn && isStaff() && cms()) {
          e.preventDefault();
          e.stopPropagation();
          cms().removeFaqCustom(delBtn.getAttribute("data-faq-del"));
          if (state.faqKey === "custom:" + delBtn.getAttribute("data-faq-del")) {
            state.faqKey = "";
            $("#answerPanel").className = "answer empty";
            $("#answerPanel").innerHTML = "問題已刪除。";
          }
          renderFaqGrid();
          return;
        }
        var card = e.target.closest(".faq-card[data-q]");
        if (card) showAnswer(card.getAttribute("data-q"));
      });

    var addBtn = $("#faqAddBtn");
    var addForm = $("#faqAddForm");
    if (addBtn && addForm) {
      addBtn.addEventListener("click", function () {
        addForm.classList.toggle("hidden");
      });
      $("#faqAddCancel") &&
        $("#faqAddCancel").addEventListener("click", function () {
          addForm.classList.add("hidden");
        });
      addForm.addEventListener("submit", function (e) {
        e.preventDefault();
        if (!isStaff() || !cms()) return;
        var res = cms().addFaqCustom({
          productId: state.productId || ($("#productSelect") && $("#productSelect").value) || "",
          label: $("#faqNewLabel").value,
          icon: $("#faqNewIcon").value,
          answer: $("#faqNewAnswer").value
        });
        var msg = $("#faqAddMsg");
        if (!res.ok) {
          if (msg) {
            msg.textContent = res.error || "失敗";
            msg.classList.remove("hidden");
          }
          return;
        }
        $("#faqNewLabel").value = "";
        $("#faqNewAnswer").value = "";
        addForm.classList.add("hidden");
        if (msg) msg.classList.add("hidden");
        renderFaqGrid();
      });
    }

    $("#faqToggleHiddenBtn") &&
      $("#faqToggleHiddenBtn").addEventListener("click", function () {
        state.faqShowHidden = !state.faqShowHidden;
        this.textContent = state.faqShowHidden ? "隱藏已隱藏" : "顯示已隱藏";
        renderFaqGrid();
      });

    $("#goStoresBtn") &&
      $("#goStoresBtn").addEventListener("click", function () {
        setView("stores");
      });

    $$("#promoterChips .region-chip").forEach(function (b) {
      b.addEventListener("click", function () {
        setPromoterFilter(b.getAttribute("data-promoter") === "1");
        maybeHintPromoterForProduct();
      });
    });

    $$("#regionChips .region-chip").forEach(function (b) {
      b.addEventListener("click", function () {
        state.storeRegion = b.getAttribute("data-region") || "";
        state.storeDistrict = "";
        $$("#regionChips .region-chip").forEach(function (x) {
          var on = x === b;
          x.classList.toggle("active", on);
          x.setAttribute("aria-pressed", on ? "true" : "false");
        });
        renderStores();
      });
    });

    $("#districtSelect") &&
      $("#districtSelect").addEventListener("change", function () {
        state.storeDistrict = this.value;
        renderStores();
      });

    $("#storeSearch") &&
      $("#storeSearch").addEventListener("input", function () {
        state.storeQuery = this.value.trim();
        renderStores();
      });

    $("#storesNoteForm") &&
      $("#storesNoteForm").addEventListener("submit", function (e) {
        e.preventDefault();
        if (!isStaff() || !cms()) return;
        var input = $("#storesNoteInput");
        var res = cms().addStoreNote(input.value);
        if (res.ok) {
          input.value = "";
          renderStoreNotes();
        }
      });

    $("#storesNotesList") &&
      $("#storesNotesList").addEventListener("click", function (e) {
        var btn = e.target.closest("[data-note-del]");
        if (btn && cms()) {
          cms().removeStoreNote(btn.getAttribute("data-note-del"));
          renderStoreNotes();
        }
      });

    /* login header */
    var hdr = $("#headerLoginBtn");
    if (hdr) {
      hdr.addEventListener("click", function (e) {
        e.stopPropagation();
        if (!isStaff()) {
          setView("login");
          return;
        }
        var dd = $("#loginDropdown");
        if (!dd) return;
        var open = dd.classList.contains("hidden");
        dd.classList.toggle("hidden", !open);
        hdr.setAttribute("aria-expanded", open ? "true" : "false");
      });
    }

    document.addEventListener("click", function () {
      closeLoginDropdown();
    });
    $("#loginDropdown") &&
      $("#loginDropdown").addEventListener("click", function (e) {
        e.stopPropagation();
        var item = e.target.closest("[data-dd-action]");
        if (!item) return;
        var act = item.getAttribute("data-dd-action");
        if (act === "account") setView("account");
        if (act === "logout" && auth()) {
          auth().logout();
          refreshAdminUi();
          setView("qa");
        }
        closeLoginDropdown();
      });

    $("#loginForm") &&
      $("#loginForm").addEventListener("submit", async function (e) {
        e.preventDefault();
        if (!auth()) return;
        var ok = await auth().login($("#loginUser").value, $("#loginPass").value);
        var err = $("#loginError");
        if (!ok) {
          if (err) err.classList.remove("hidden");
          return;
        }
        if (err) err.classList.add("hidden");
        $("#loginPass").value = "";
        refreshAdminUi();
        setView("qa");
      });

    $("#accountForm") &&
      $("#accountForm").addEventListener("submit", async function (e) {
        e.preventDefault();
        if (!auth()) return;
        var msg = $("#accountMsg");
        var p1 = $("#acctNewPass").value;
        var p2 = $("#acctNewPass2").value;
        if (p1 !== p2) {
          if (msg) {
            msg.textContent = "兩次新密碼唔一致";
            msg.classList.remove("hidden");
            msg.style.color = "var(--danger)";
          }
          return;
        }
        var res = await auth().changeCredentials(
          $("#acctCurrentPass").value,
          $("#acctNewUser").value,
          p1
        );
        if (msg) {
          msg.style.color = res.ok ? "var(--green)" : "var(--danger)";
          msg.textContent = res.ok ? "已儲存。下次請用新帳密登入。" : res.error || "失敗";
          msg.classList.remove("hidden");
        }
        if (res.ok) {
          $("#acctCurrentPass").value = "";
          $("#acctNewPass").value = "";
          $("#acctNewPass2").value = "";
        }
      });

    $("#cmsResetBtn") &&
      $("#cmsResetBtn").addEventListener("click", function () {
        if (!isStaff() || !cms()) return;
        if (!confirm("確定還原預設內容？（清走本機新增／隱藏問題同職員備註／成份拆解；唔改帳密）")) return;
        cms().resetCms();
        var msg = $("#cmsResetMsg");
        if (msg) {
          msg.textContent = "已還原。";
          msg.classList.remove("hidden");
        }
        renderFaqGrid();
        renderStoreNotes();
        renderProductMeta();
        if (state.faqKey) showAnswer(state.faqKey);
      });

    $("#ingNoteForm") &&
      $("#ingNoteForm").addEventListener("submit", function (e) {
        e.preventDefault();
        if (!isStaff() || !cms()) return;
        var p = getProduct();
        if (!p) return;
        var res = cms().addIngredient(p.id, {
          name: $("#ingName").value,
          role: $("#ingRole").value,
          detail: $("#ingDetail").value,
          benefit: $("#ingBenefit").value,
          note: $("#ingNote").value
        });
        var msg = $("#ingNoteMsg");
        if (!res.ok) {
          if (msg) {
            msg.textContent = res.error || "失敗";
            msg.style.color = "var(--danger)";
            msg.classList.remove("hidden");
          }
          return;
        }
        $("#ingName").value = "";
        $("#ingRole").value = "";
        $("#ingDetail").value = "";
        $("#ingBenefit").value = "";
        $("#ingNote").value = "";
        if (msg) {
          msg.textContent = "已加入。";
          msg.style.color = "var(--green)";
          msg.classList.remove("hidden");
        }
        renderStaffIngredientPanel(p);
        if (state.faqKey && String(state.faqKey).indexOf("::ingredients") !== -1) {
          showAnswer(state.faqKey);
        }
      });

    $("#ingBenefitsSave") &&
      $("#ingBenefitsSave").addEventListener("click", function () {
        if (!isStaff() || !cms()) return;
        var p = getProduct();
        if (!p) return;
        var raw = ($("#ingBenefitsText") && $("#ingBenefitsText").value) || "";
        var lines = raw.split(/\n/).map(function (s) { return s.trim(); }).filter(Boolean);
        cms().setBenefits(p.id, lines);
        var msg = $("#ingNoteMsg");
        if (msg) {
          msg.textContent = "優點已儲存。";
          msg.style.color = "var(--green)";
          msg.classList.remove("hidden");
        }
        renderStaffIngredientPanel(p);
        if (state.faqKey && String(state.faqKey).indexOf("::ingredients") !== -1) {
          showAnswer(state.faqKey);
        }
      });

    $("#staffIngredientPanel") &&
      $("#staffIngredientPanel").addEventListener("click", function (e) {
        var btn = e.target.closest("[data-ing-del]");
        if (!btn || !isStaff() || !cms()) return;
        var p = getProduct();
        if (!p) return;
        cms().removeIngredient(p.id, btn.getAttribute("data-ing-del"));
        renderStaffIngredientPanel(p);
        if (state.faqKey && String(state.faqKey).indexOf("::ingredients") !== -1) {
          showAnswer(state.faqKey);
        }
      });

    document.addEventListener("click", function (e) {
      var btn = e.target.closest(".password-toggle");
      if (!btn) return;
      var wrap = btn.closest(".password-field");
      var input = wrap && wrap.querySelector("input");
      if (!input) return;
      var show = input.type === "password";
      input.type = show ? "text" : "password";
      btn.setAttribute("aria-pressed", show ? "true" : "false");
      btn.setAttribute("aria-label", show ? "隱藏密碼" : "顯示密碼");
      var eyeShow = btn.querySelector(".eye-show");
      var eyeHide = btn.querySelector(".eye-hide");
      if (eyeShow) eyeShow.classList.toggle("hidden", show);
      if (eyeHide) eyeHide.classList.toggle("hidden", !show);
    });
  }

  function init() {
    bindProductFilters();
    syncConsignSubChips();
    fillProductSelects();
    renderSalesPoints();
    renderProductMeta();
    renderFaqGrid();
    renderStores();
    bind();
    refreshAdminUi();
    setView("qa");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
