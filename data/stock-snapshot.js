/**
 * 古寶 Cupal 客服 — 屈臣氏門市庫存快照（靜態）。
 * asOf／watsonsAsOf 有值＝該渠道已載入；請勿當 live stock。
 * 只含「有存貨／就嚟賣晒」舖；無庫存舖唔會出現。
 * 屈臣氏庫存查詢只覆蓋約 177 間（非電話簿全部 288）——唔好將未列出嘅舖標「沒有此產品」。
 *
 * 填入：將 data/raw-watsons-stock-YYYYMMDD.json 用 scripts/merge-watsons-stock.js merge。
 * 預期產品鍵（有獨立 PDP）：fortigel、strength-muscle、allergy-probiotic、angong、joint-msm、nmn
 * （prostic-l／ucii／pro-calcium 暫無獨立門市庫存快照，除非 raw JSON 有。）
 *
 * 目前：空殼——等 raw-watsons-stock-20261029.json；唔好假造舖名／間數。
 */
window.CUPAL_STOCK = {
  "asOf": "",
  "watsonsAsOf": "",
  "source": "watsons.com.hk 查看門市庫存",
  "disclaimer": "快照非即時庫存；到舖前請致電確認。覆蓋約 177 間，非電話簿全部。",
  "coverageNote": "Checker covers ~177 stores, not full phone book 288",
  "products": {}
};
