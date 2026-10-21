# 古寶 Cupal · 客服速查

靜態品牌客服（書面繁體粵語）：產品目錄＋成份／功效／用法／注意問答、邊度買、屈臣氏門店電話簿、寄賣／非上架貨、職員登入 CMS。

**唔係**叮叮客服嘅 fork 部署——獨立專案；結構同 UX 參考叮叮，品牌白藍系。

## 本機預覽

```bash
cd cupal-cs
python3 -m http.server 8765
```

瀏覽器開 `http://127.0.0.1:8765/`

## 職員登入（預設）

| 項目 | 值 |
|------|-----|
| 帳號 | `CUPAL` |
| 密碼 | `cupal2026` |

可喺「帳戶設定」改帳密（存在本機 `localStorage`；密碼以 SHA-256 儲存）。Session 用 `sessionStorage`。

登入後可：隱藏／新增 FAQ、睇產品職員備註（含 SKU／寄賣碼／參考標準價）、門店職員備註、還原 CMS 內容。

## 資料檔

| 路徑 | 內容 |
|------|------|
| `data/products.js` | 產品＋FAQ（含寄賣貨；claim-safe） |
| `data/stores.js` | 屈臣氏電話簿（非庫存；含寄賣推廣員店標誌） |
| `docs/consign-promoter-stores.jpg` | 用戶提供：有寄賣推廣員嘅屈臣氏名單 |
| `docs/consignment-notes.md` | 寄賣落貨規則摘要 |
| `assets/js/admin-auth.js` | 登入 |
| `assets/js/cms.js` | FAQ／備註本機 CMS |
| `assets/js/app.js` | 介面（分類 chips、寄賣徽章） |

## 寄賣貨

- 分類 chips（兩層）：
  - 第一層：全部｜屈臣氏貨｜寄賣貨
  - 第二層（只喺「寄賣貨」出現）：寄賣全部｜寄賣保健｜調理系列｜兒童｜美容｜真威龍｜外用
  - 屈臣氏貨 = `watsonsShelf`（12 款英雄／上架線）；寄賣貨 = `consignment && !watsonsShelf`（純寄賣／非上架）
- 寄賣產品有「寄賣／非上架」徽章
- 公開邊度買：非上架／職員落貨／專賣／HKTVmall／官網（以實際為準）
- **參考標準價只職員可見**，公開唔當現售網價
- 打單：逢星期三及五 11:30am 前；3+1／5+2 以標準價；贈品價不高於購買品
- 成份：只跟官網／HKTVmall／The Club／威發／REBOOT YOUR 公開頁或實物標籤；找不到就寫轉介句
- 「調理個」系列公開品牌為 **REBOOT YOUR**，唔硬標古寶

## 寄賣推廣員店

門店頁可篩「有寄賣推廣員」（9 間：CNT／TPH／SPT／LFS／KPO3／MPL／NYL／DPL／DH2）。
卡片顯示營業時間、店碼／店號同「寄賣推廣員」徽章。揀寄賣貨時會提示可篩呢啲店。

## 合規重點

- 保健品 ≠ 註冊藥物；安宮（HKC-18196）係註冊中成藥，話術極克制
- 按摩膏／真威龍藥油：樟腦／G6PD／幼童不宜（跟標籤）
- 液體鈣／磷蝦油：甲殼類敏感
- Fortigel 等：法定未註冊卸責方向
- 價格：參考或職員標準價；以門市／落貨價簽為準
- 電話簿 ≠ 該產品有貨
- 「有寄賣推廣員」店：用戶名單（截至 2026-10-22）；唔等於即時有貨或推廣員一定在場

## GitHub Pages

Repo：`lingling3899/cupal-cs`  
預期網址：`https://lingling3899.github.io/cupal-cs/`

部署：`main` 分支根目錄作 Pages source。Cache bust：`?v=20261022b`

## 已知缺口

- 產品圖：暫用 emoji 佔位
- 部分寄賣 SKU 未找到完整公開成份頁（見職員備註／FAQ 轉介句）
- UC II／部分渠道價〔待核價〕
- Mannings 電話簿暫緩
- 未做「知識」分頁（可後加）
- 屈臣氏電話未必齊全；請用官方搵店補

---

參考用途，非醫療建議。官網：[cupal.com.hk](https://www.cupal.com.hk/)
