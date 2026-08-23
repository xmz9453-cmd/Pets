\# TASK-0015 FREEZE — 商品管理 Product Management v1.0



\## 1. Document Information



| Field | Value |

|---|---|

| Task | TASK-0015 |

| 中文名稱 | 商品管理 |

| English Name | Product Management |

| Version | v1.0 |

| Status | FREEZE |

| Project | 寵物美容／寵物住宿工作室 MVP |

| Previous Task | TASK-0014 — 付款執行與付款管理 Payment Execution Payment Management |

| Related Task | TASK-0013 — 訂單執行 Order Execution |

| Document Filename | TASK-0015 商品管理 Product Management v1.0.md |

| Acceptance Status | Human Acceptance PASS |

| Freeze Status | FREEZE |



\---



\## 2. Task Objective



TASK-0015 負責 MVP 中的商品管理能力。



本 Task 的目的為：



\- 建立基本商品主檔管理。

\- 支援商品新增、查詢、編輯。

\- 支援商品啟用與停用。

\- 建立 Owner-only 商品管理權限。

\- 讓 Front Desk 與 Groomer 可以讀取商品，但不得管理商品。

\- 建立商品繁體中文管理介面。

\- 確保建立新商品訂單項目時，交易價格由 Backend 依當下 Active Product Sale Price 決定。

\- 保留既有 Order Item 的歷史交易價格，不因商品後續改價而變更。



本 Task 不建立完整 POS、Inventory 或商品進銷存系統。



\---



\## 3. Scope



\### 3.1 Product Management



本 Task 包含：



\- Product List

\- Product Detail / Edit

\- Product Create

\- Product Update

\- Product Enable

\- Product Disable

\- Product status display

\- Product price validation

\- Product name validation



\### 3.2 Authorization



Product 管理權限：



| Role | Read Product | Create | Update | Enable / Disable |

|---|---:|---:|---:|---:|

| Owner | PASS | PASS | PASS | PASS |

| Front Desk | PASS | DENY | DENY | DENY |

| Groomer | PASS | DENY | DENY | DENY |



Product 寫入管理為 Owner-only。



\---



\## 4. Product Data Requirements



\### 4.1 Product Name



商品名稱：



\- 必須存在。

\- 不得為空白。

\- 前後空白必須 trim。

\- trim 後不得為空字串。



\### 4.2 Sale Price



商品售價：



\- 必須為有效數值。

\- 必須大於 0。

\- 必須以固定兩位小數語意處理。

\- 不接受 0 元商品作為有效商品售價。



\### 4.3 Product Status



Product 必須具有啟用／停用生命週期。



允許狀態：



\- 啟用中

\- 已停用



狀態操作必須透過專用 Enable / Disable API。



一般 Product Update 不得藉由一般編輯流程任意改變 lifecycle status。



\---



\## 5. Existing Schema Compatibility



TASK-0015 沿用既有 Product schema。



既有 `011\_create\_products\_and\_orders.sql` 已建立：



\- products

\- orders

\- order\_items



既有 Product schema 中的相容欄位必須保留。



尤其既有 `species` 欄位與 Order 的物種相關驗證存在既有契約，因此不得為了縮減 Product model 而任意刪除。



本 Task 不新增另一套 Product schema。



\---



\## 6. API Requirements



\### 6.1 Product List



提供 Product List API。



用途：



\- Product Management UI 取得商品清單。

\- Order 建立流程取得可用商品。

\- 既有角色讀取商品資訊。



\### 6.2 Product Get



提供單一 Product 查詢能力。



\### 6.3 Product Create



建立商品。



必須：



\- 驗證商品名稱。

\- trim 商品名稱。

\- 驗證 Sale Price。

\- 確認 Sale Price > 0。

\- 建立有效 Product。



\### 6.4 Product Update



更新既有商品。



必須：



\- 驗證商品名稱。

\- trim 商品名稱。

\- 驗證 Sale Price。

\- 確認 Sale Price > 0。

\- 不透過一般 Update API 任意修改 lifecycle status。



\### 6.5 Product Enable



提供 Product 啟用 API。



啟用後：



\- Product status = enabled。

\- Product 可供新訂單商品選擇使用。



\### 6.6 Product Disable



提供 Product 停用 API。



停用後：



\- Product status = disabled。

\- Product 不得作為新訂單的可用商品。

\- 既有 Order Item 不得被刪除或修改。



\---



\## 7. Order Integration



\### 7.1 Active Product Price Source



建立新 Product Order Item 時：



> Backend 必須從資料庫讀取目前 Active Product 的 Sale Price。



不得將前端 request 所提供的商品價格直接視為可信交易價格來源。



流程：



Product

→ Active Product Sale Price

→ Order Creation

→ Order Item

→ `transaction\_price`



\### 7.2 Backend Business Rule



Backend 必須重新取得 Product 的目前售價。



因此即使前端 request 嘗試提供其他價格：



\- Backend 不得以偽造的 request price 取代 Product Sale Price。

\- 新 Order Item 的 `transaction\_price` 必須由目前 Product Sale Price 決定。



\### 7.3 Disabled Product



停用商品不得建立新的 Product Order Item。



\### 7.4 Historical Transaction Price



Order Item 的：



> `transaction\_price`



為建立該筆交易當下的歷史價格。



因此：



\- Product 後續改價，不得修改既有 Order Item。

\- Product 後續停用，不得刪除既有 Order Item。

\- 既有 Order 必須持續顯示原始交易價格。



\---



\## 8. Transaction and Data Integrity



建立新 Product Order Item 時，Product Sale Price 的讀取與 Order Item 建立必須遵守既有 Order transaction integrity。



必要時：



\- 使用 transaction。

\- 使用適當的 row lock。

\- 發生錯誤時 rollback。

\- 不允許產生部分完成的 Order。



既有 Order Item 的歷史資料不得因 Product 管理操作而被回寫。



\---



\## 9. UI Requirements



\### 9.1 Product Management Page



提供商品管理頁面。



必要內容：



\- 商品列表

\- 商品名稱

\- 售價

\- 商品狀態

\- 新增商品

\- 編輯商品

\- 啟用

\- 停用

\- 停用確認

\- 載入狀態

\- 空資料狀態

\- 成功訊息

\- 錯誤訊息



\### 9.2 Role-based UI



Owner：



\- 顯示商品管理操作。

\- 可以新增。

\- 可以編輯。

\- 可以啟用。

\- 可以停用。



Front Desk：



\- 可以讀取商品。

\- 不顯示管理操作。



Groomer：



\- 可以讀取商品。

\- 不顯示管理操作。



UI 權限控制不能取代 Backend authorization。



Backend 必須同步 enforce Owner-only 寫入權限。



\### 9.3 Traditional Chinese UI



Product Management UI 必須遵守：



> Traditional Chinese UI Localization Baseline v1.0



介面不得以英文作為主要使用者可見操作文字。



必要操作應使用一致的繁體中文：



\- 商品管理

\- 商品列表

\- 商品名稱

\- 售價

\- 啟用中

\- 已停用

\- 新增

\- 編輯

\- 啟用

\- 停用

\- 儲存

\- 取消

\- 確認



\---



\## 10. Out of Scope



TASK-0015 不包含：



\- Inventory

\- Stock Quantity Management

\- Purchase Management

\- Supplier Management

\- SKU System

\- Barcode System

\- Product Category Management

\- Warehouse Management

\- POS System

\- Advanced Product Analytics

\- Product Profit Analysis

\- Accounting

\- Invoice System

\- Refund System

\- Payment Gateway

\- Dashboard

\- Marketplace

\- Online Product Store

\- Multi-tenant Product Catalog

\- Enterprise Product Permission System



不得因 Product Management 而擴張至完整商品進銷存系統。



\---



\## 11. Files and Implementation Scope



TASK-0015 實作包含：



\### New Files



\- `frontend/pages/products.js`

\- `testing/tests/product.test.js`



\### Modified Files



\- `backend/src/data/product.repository.js`

\- `backend/src/services/product.service.js`

\- `backend/src/controllers/product.controller.js`

\- `backend/src/routes/product.routes.js`

\- `backend/src/services/order.service.js`

\- `frontend/api/client.js`

\- `frontend/pages/index.js`

\- `testing/tests/order.test.js`



\### Database



沿用既有：



\- `database/migrations/011\_create\_products\_and\_orders.sql`



本 Task 未新增 Product 專用 migration。



\---



\## 12. Testing



\### 12.1 Targeted Tests



Product / Order focused tests：



\- 12 tests passed



涵蓋：



\- Product CRUD

\- Product validation

\- Owner-only authorization

\- Enable / Disable

\- Product price source

\- Disabled Product rejection

\- Historical transaction price preservation



\### 12.2 Full Regression



Full regression：



\- 15 suites passed

\- 73 tests passed



結果：



> PASS



\### 12.3 Frontend Build



Frontend build：



> PASS



Next.js 已成功建立 Product Management page。



\---



\## 13. Browser E2E Verification



Browser E2E 已實際驗證：



\### Login



\- Login PASS



\### Product Navigation



\- Product page navigation PASS

\- Traditional Chinese navigation PASS



\### Product Create



\- Product name input PASS

\- Sale price input PASS

\- Save PASS

\- Product displayed PASS



\### Product Update



\- Edit Product PASS

\- Sale Price updated to `350.00` PASS

\- Updated price displayed PASS



\### Product Disable



\- Disable action PASS

\- Confirmation PASS

\- Status displayed as `已停用` PASS



\### Disabled Product Order Rule



\- Disabled Product does not appear in new Product Order selection PASS



\### Product Enable



\- Enable action PASS

\- Status returned to `啟用中` PASS



\### Historical Order



\- Existing Order remains visible PASS

\- Existing Product Order Item remains visible PASS

\- Existing historical transaction information preserved PASS



\---



\## 14. Static Verification



\### Backend Check



> PASS



\### Frontend Build



> PASS



\### Git Diff Check



`git diff --check`：



> PASS



No whitespace error detected.



\### Scope Verification



確認未新增下列範圍：



\- Inventory

\- POS

\- SKU

\- Barcode

\- Supplier

\- Analytics

\- Payment expansion

\- Accounting

\- Invoice

\- Refund

\- Dashboard



結果：



> PASS



\---



\## 15. Regression Protection



TASK-0015 不得破壞：



\- Customer

\- Pet

\- Service

\- Appointment

\- Daily Operations

\- Grooming

\- Boarding

\- Order

\- Payment

\- Existing Product Order Item history



Full regression 已驗證：



> 15 suites / 73 tests PASS



\---



\## 16. Acceptance Criteria



\### Product Management



\- \[x] Product list available

\- \[x] Product create available

\- \[x] Product update available

\- \[x] Product enable available

\- \[x] Product disable available

\- \[x] Product status displayed

\- \[x] Product name validation

\- \[x] Product price validation

\- \[x] Sale Price must be greater than zero



\### Authorization



\- \[x] Owner can manage Product

\- \[x] Front Desk cannot manage Product

\- \[x] Groomer cannot manage Product

\- \[x] Read access remains available



\### Order Integration



\- \[x] Active Product Sale Price is read by Backend

\- \[x] New Product Order Item uses current Product Sale Price

\- \[x] Client-supplied price cannot override Backend business rule

\- \[x] Disabled Product cannot be selected for new Product Order Item

\- \[x] Existing transaction price remains historical

\- \[x] Product price changes do not modify existing Order Item transaction price



\### UI



\- \[x] Product Management UI implemented

\- \[x] Traditional Chinese UI implemented

\- \[x] Loading state implemented

\- \[x] Empty state implemented

\- \[x] Success state implemented

\- \[x] Error state implemented

\- \[x] Enable / Disable confirmation implemented



\### Verification



\- \[x] Backend check PASS

\- \[x] Frontend build PASS

\- \[x] Targeted tests PASS

\- \[x] Full regression PASS

\- \[x] Browser E2E PASS

\- \[x] Scope verification PASS

\- \[x] Git diff check PASS



\---



\## 17. Human Acceptance



TASK-0015 已完成 Human Acceptance。



Acceptance Result：



> PASS



Human Acceptance 狀態：



> TASK-0015 Human Acceptance PASS



\---



\## 18. Git Status



TASK-0015 完成時：



\- Git commit 未建立。

\- TASK-0015 不得自行建立新的 Git checkpoint。

\- 原有 TASK-0013 / TASK-0014 未提交工作內容不得被回復或覆寫。

\- 未經使用者指示不得清理既有 untracked files。

\- 本文件進入正式保存流程後，再依既定 Git checkpoint 流程處理。



\---



\## 19. Freeze Boundary



TASK-0015 Freeze 後，以下內容視為正式基準：



\- Product Management Scope

\- Product CRUD

\- Product Enable / Disable

\- Owner-only Product Management

\- Front Desk / Groomer Read-only

\- Product validation

\- Active Product Sale Price business rule

\- Order Item transaction price preservation

\- Disabled Product restriction

\- Traditional Chinese Product Management UI

\- 已驗證的測試與 Browser E2E 結果



任何後續變更應透過新的 TASK 處理，不得直接修改本 Freeze Scope。



\---



\## 20. Definition of Done



TASK-0015 Definition of Done：



\- \[x] Product Management functionality implemented

\- \[x] Product CRUD implemented

\- \[x] Product Enable / Disable implemented

\- \[x] Owner-only authorization implemented

\- \[x] Front Desk / Groomer read-only behavior implemented

\- \[x] Product validation implemented

\- \[x] Order Product integration implemented

\- \[x] Active Product Sale Price enforced by Backend

\- \[x] Historical transaction price preserved

\- \[x] Traditional Chinese UI implemented

\- \[x] Targeted tests PASS

\- \[x] Full regression PASS

\- \[x] Frontend build PASS

\- \[x] Browser E2E PASS

\- \[x] Scope verification PASS

\- \[x] Human Acceptance PASS

\- \[x] No unresolved blocking issue



\---



\## 21. Final Status



TASK-0015：



> \*\*FREEZE\*\*



正式名稱：



> \*\*TASK-0015 商品管理 Product Management v1.0\*\*



Freeze Result：



> \*\*PASS\*\*



TASK-0015 正式完成並進入 Freeze 狀態。
