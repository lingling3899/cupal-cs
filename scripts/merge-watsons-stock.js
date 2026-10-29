#!/usr/bin/env node
/**
 * Merge Watsons store-stock scrape JSON into data/stock-snapshot.js
 *
 * Usage:
 *   node scripts/merge-watsons-stock.js [rawJsonPath]
 *
 * Raw shape (same as zihua):
 * {
 *   asOf, source?, coverageNote?,
 *   products: {
 *     [productId]: {
 *       watsonsCode|code, watsonsUrl|url,
 *       storeCount?,
 *       stores: [{ name, address, district?, region?, stockStatus, tel? }]
 *     }
 *   }
 * }
 *
 * Never writes quantity / 件數. Fuzzy-matches CUPAL_STORES.watsons for tel
 * (strip 「屈臣氏 · 」 prefix).
 */
"use strict";

var fs = require("fs");
var path = require("path");

var ROOT = path.resolve(__dirname, "..");
var DEFAULT_RAW = path.join(ROOT, "data", "raw-watsons-stock-20261029.json");
var STORES_JS = path.join(ROOT, "data", "stores.js");
var OUT_JS = path.join(ROOT, "data", "stock-snapshot.js");

var KNOWN_BP = {
  fortigel: "BP_818870",
  "strength-muscle": "BP_203520",
  "allergy-probiotic": "BP_281790",
  angong: "BP_816782",
  "joint-msm": "BP_221658",
  nmn: "BP_814265"
};

function loadStores() {
  var t = fs.readFileSync(STORES_JS, "utf8");
  var g = { window: {} };
  // eslint-disable-next-line no-new-func
  Function("window", t)(g.window);
  var data = g.window.CUPAL_STORES || {};
  return Array.isArray(data.watsons) ? data.watsons : [];
}

function stripBrand(name) {
  return String(name || "")
    .replace(/^屈臣氏\s*[·•．.]\s*/u, "")
    .replace(/\s+/g, "")
    .trim();
}

function findTel(book, snap) {
  if (snap && snap.tel) return String(snap.tel).trim();
  var sn = stripBrand(snap && snap.name);
  var sa = String((snap && snap.address) || "").replace(/\s+/g, "");
  var i, b, bn, ba;
  for (i = 0; i < book.length; i++) {
    b = book[i];
    bn = stripBrand(b.name);
    if (sn && bn && (bn === sn || bn.indexOf(sn) !== -1 || sn.indexOf(bn) !== -1)) {
      return b.tel || "";
    }
  }
  if (sa.length >= 8) {
    for (i = 0; i < book.length; i++) {
      b = book[i];
      ba = String(b.address || "").replace(/\s+/g, "");
      if (ba && (ba.indexOf(sa.slice(0, 12)) !== -1 || sa.indexOf(ba.slice(0, 12)) !== -1)) {
        return b.tel || "";
      }
    }
  }
  return "";
}

function normalizeStatus(s) {
  var t = String(s || "").trim();
  if (!t) return "有存貨";
  // keep Watsons wording; never invent quantity
  return t;
}

function main() {
  var rawPath = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_RAW;
  if (!fs.existsSync(rawPath)) {
    console.error("Raw JSON not found:", rawPath);
    console.error("Leaving stock-snapshot.js unchanged (empty shell expected until scrape lands).");
    process.exit(2);
  }
  var raw = JSON.parse(fs.readFileSync(rawPath, "utf8"));
  var book = loadStores();
  var asOf = String(raw.asOf || "2026-10-29").trim();
  var productsIn = raw.products || {};
  var productsOut = {};
  var summary = [];

  Object.keys(productsIn).sort().forEach(function (pid) {
    var entry = productsIn[pid] || {};
    var storesIn = Array.isArray(entry.stores) ? entry.stores : [];
    var stores = storesIn.map(function (s) {
      var out = {
        name: String(s.name || "").trim(),
        address: String(s.address || "").trim(),
        district: String(s.district || "").trim(),
        stockStatus: normalizeStatus(s.stockStatus)
      };
      if (s.region) out.region = String(s.region).trim();
      var tel = findTel(book, s);
      if (tel) out.tel = tel;
      // deliberately omit quantity / stockQty / count
      return out;
    }).filter(function (s) { return s.name; });

    var code = entry.watsonsCode || entry.code || KNOWN_BP[pid] || "";
    var url = entry.watsonsUrl || entry.url || "";
    productsOut[pid] = {
      watsons: {
        code: code,
        url: url,
        storeCount: typeof entry.storeCount === "number" ? entry.storeCount : stores.length,
        stores: stores
      }
    };
    // sync storeCount to actual list length (authoritative)
    productsOut[pid].watsons.storeCount = stores.length;
    summary.push(pid + "\t" + code + "\t" + stores.length);
  });

  var banner =
    "/**\n" +
    " * 古寶 Cupal 客服 — 屈臣氏門市庫存快照（靜態）。\n" +
    " * asOf／watsonsAsOf 有值＝該渠道已載入；請勿當 live stock。\n" +
    " * 只含「有存貨／就嚟賣晒」舖；無庫存舖唔會出現。\n" +
    " * 屈臣氏庫存查詢只覆蓋約 177 間（非電話簿全部 288）——唔好將未列出嘅舖標「沒有此產品」。\n" +
    " *\n" +
    " * 來源：" + path.basename(rawPath) + "（" + asOf + "）；tel 優先 scrape，否則電話簿 fuzzy match。\n" +
    " * 由 scripts/merge-watsons-stock.js 產生——唔好手改數量欄（本檔唔存件數）。\n" +
    " */\n";

  var payload = {
    asOf: asOf,
    watsonsAsOf: asOf,
    source: raw.source || "watsons.com.hk 查看門市庫存",
    disclaimer: "快照非即時庫存；到舖前請致電確認。覆蓋約 177 間，非電話簿全部。",
    coverageNote: raw.coverageNote || "Checker covers ~177 stores, not full phone book 288",
    products: productsOut
  };

  var body = "window.CUPAL_STOCK = " + JSON.stringify(payload, null, 2) + ";\n";
  fs.writeFileSync(OUT_JS, banner + body, "utf8");

  var sumPath = rawPath.replace(/\.json$/i, "-summary.txt");
  var sumText =
    "Watsons HK 查看門市庫存  as of " + asOf + "\n" +
    "Source: " + (raw.source || "watsons.com.hk") + "\n" +
    "Coverage: checker lists about 177 stores, not the full phone book of 288.\n" +
    "Only in-stock / low-stock stores listed. No quantities.\n\n" +
    summary.join("\n") + "\n";
  fs.writeFileSync(sumPath, sumText, "utf8");

  console.log("Wrote", OUT_JS);
  console.log("Products:");
  summary.forEach(function (line) { console.log(" ", line); });
}

main();
