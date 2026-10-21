(function () {
  "use strict";

  var products = window.CUPAL_PRODUCTS || [];
  var storeData = window.CUPAL_STORES || {};
  var watsons = Array.isArray(storeData.watsons) ? storeData.watsons : [];

  var state = {
    view: "qa",
    productId: "",
    faqKey: "",
    faqShowHidden: false,
    storeRegion: "",
    storeDistrict: "",
    storeQuery: ""
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

  function telHref(tel) {
    var t = String(tel || "").replace(/\D/g, "");
    return t ? "tel:+852" + t : "";
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
  function fillProductSelects() {
    var opts = '<option value="">— 請選擇產品 —</option>' +
      products.map(function (p) {
        return '<option value="' + escapeHtml(p.id) + '">' + escapeHtml(p.nameZh) + "</option>";
      }).join("");
    ["#productSelect", "#storeProductSelect"].forEach(function (sel) {
      var el = $(sel);
      if (el) el.innerHTML = opts;
    });
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
      return;
    }
    box.className = "product-card";
    box.innerHTML =
      '<div class="pc-emoji" aria-hidden="true">' + escapeHtml(p.emoji || "📦") + "</div>" +
      '<p class="pc-title">' + escapeHtml(p.nameZh) + "</p>" +
      '<p class="pc-meta">' + escapeHtml(p.category || "") + "　｜　" + escapeHtml(p.form || "") + "</p>" +
      (p.keyIngredients && p.keyIngredients.length
        ? '<p class="pc-meta">成份重點：' + escapeHtml(p.keyIngredients.join("、")) + "</p>"
        : "") +
      (p.disclaimer
        ? '<p class="pc-meta" style="margin-top:6px">' + escapeHtml(p.disclaimer) + "</p>"
        : "");

    if (staff) {
      if (isStaff() && p.staffNotes) {
        staff.classList.remove("hidden");
        staff.innerHTML =
          '<h3>職員備註 <span class="badge">只職員見</span></h3>' +
          '<div class="staff-answer-body">' + nl2br(p.staffNotes) + "</div>";
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
  function syncStoreProductSelect() {
    var sp = $("#storeProductSelect");
    var qa = $("#productSelect");
    if (sp && qa && qa.value && !sp.value) sp.value = qa.value;
    if (sp && sp.value) state.productId = sp.value;
    renderProductMeta();
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
    return watsons.filter(function (s) {
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
          (s.tel || "")
        ).toLowerCase();
        if (blob.indexOf(q) === -1) return false;
      }
      return true;
    });
  }

  function renderStores() {
    var note = $("#directoryNote");
    if (note) {
      note.textContent =
        (storeData.salesPointsNote ||
          "電話簿非該產品一定有貨——請致電確認。") +
        " 共 " +
        watsons.length +
        " 間屈臣氏電話紀錄。";
    }

    var regionList = state.storeRegion
      ? watsons.filter(function (s) { return regionOfStore(s) === state.storeRegion; })
      : watsons;
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
        (state.storeRegion ? "（" + (REGION_LABEL[state.storeRegion] || "") + "）" : "") +
        "｜電話簿 ≠ 庫存";
    }

    var box = $("#storeList");
    if (!box) return;
    if (!list.length) {
      box.innerHTML = '<p class="count">呢個篩選暫時冇分店。可試「全部」或清搜尋。</p>';
      return;
    }
    box.innerHTML = list
      .map(function (s) {
        var tel = telHref(s.tel);
        return (
          '<article class="store-card">' +
          "<h4>" +
          escapeHtml(s.name) +
          "</h4>" +
          "<p>" +
          escapeHtml(s.district || "") +
          "　｜　" +
          escapeHtml(REGION_LABEL[regionOfStore(s)] || "") +
          "</p>" +
          "<p>" +
          escapeHtml(s.address || "") +
          "</p>" +
          '<div class="store-actions">' +
          (tel
            ? '<a href="' + tel + '">📞 ' + escapeHtml(s.tel) + "</a>"
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

    $$(".region-chip").forEach(function (b) {
      b.addEventListener("click", function () {
        state.storeRegion = b.getAttribute("data-region") || "";
        state.storeDistrict = "";
        $$(".region-chip").forEach(function (x) {
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
        if (!confirm("確定還原預設內容？（清走本機新增／隱藏問題同職員備註；唔改帳密）")) return;
        cms().resetCms();
        var msg = $("#cmsResetMsg");
        if (msg) {
          msg.textContent = "已還原。";
          msg.classList.remove("hidden");
        }
        renderFaqGrid();
        renderStoreNotes();
      });
  }

  function init() {
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
