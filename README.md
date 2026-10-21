# 古寶 Cupal · 客服速查

靜態品牌客服 MVP（書面繁體粵語）：產品目錄＋成份／功效／用法／注意問答、邊度買、屈臣氏門店電話簿、職員登入 CMS。

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

登入後可：隱藏／新增 FAQ、睇產品職員備註、門店職員備註、還原 CMS 內容。

## 資料檔

| 路徑 | 內容 |
|------|------|
| `data/products.js` | 12 款 SKU＋FAQ（claim-safe） |
| `data/stores.js` | 屈臣氏電話簿（非庫存） |
| `assets/js/admin-auth.js` | 登入 |
| `assets/js/cms.js` | FAQ／備註本機 CMS |
| `assets/js/app.js` | 介面 |

## 合規重點

- 保健品 ≠ 註冊藥物；安宮（HKC-18196）係註冊中成藥，話術極克制
- 按摩膏：樟腦／G6PD／≤6 歲不宜
- 液體鈣：甲殼類敏感
- Fortigel 等：法定未註冊卸責方向
- 價格：參考或〔待核價〕；以門市價簽為準
- 電話簿 ≠ 該產品有貨

## GitHub Pages

Repo：`lingling3899/cupal-cs`  
預期網址：`https://lingling3899.github.io/cupal-cs/`

部署：`main` 分支根目錄作 Pages source。

## 已知缺口

- 產品圖：暫用 emoji 佔位
- UC II／部分渠道價〔待核價〕
- Mannings 電話簿暫緩
- 未做「知識」分頁（可後加）
- 屈臣氏電話未必齊全；請用官方搵店補

---

參考用途，非醫療建議。官網：[cupal.com.hk](https://www.cupal.com.hk/)
