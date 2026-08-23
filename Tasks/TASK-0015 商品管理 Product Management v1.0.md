\# TASK-0015 FREEZE — 商品管理 Product Management v1.0



\## 1. Document Information



| Field | Value |

|---|---|

| Task | TASK-0015 |

| 中文名稱 | 商品管理 |

| English Name | Product Management |

| Version | v1.0 |

| Project | New MVP — 小型寵物美容／寵物住宿工作室 MVP |

| Block | Block 12 — Product |

| Status | FREEZE |

| Decision | Q1–Q60 全部確認 |

| Decision Result | 60 / 60 Confirmed |

| Previous Task | TASK-0014 — Payment Execution / Payment Management |

| Dependency | TASK-0013 — Order Execution |

| Formal File Name | TASK-0015 商品管理 Product Management v1.0.md |



\---



\## 2. Task Objective



TASK-0015 負責建立 MVP 所需的基本商品主資料管理能力。



Product 的核心定位：



> 管理店家可銷售的基本商品資料，並提供 Active Product 給 Order 使用。



Product 不負責建立完整 POS、Inventory、Procurement 或其他企業級商品管理能力。



\---



\## 3. Scope



\### 3.1 Product Master Data



Product 最基本資料：



\- Product Name

\- Sale Price

\- Active / Inactive

\- Created At

\- Updated At



Product Name：



\- 必填

\- 不得為空

\- 儲存前應處理前後空白



Sale Price：



\- 必填

\- 必須為有效數字

\- 必須大於 0

\- 使用固定兩位小數的金額模型



\---



\## 4. Product Lifecycle



Product 只支援兩種狀態：



\- Active

\- Inactive



\### 4.1 Active



Active Product：



\- 可以被 Order 使用

\- 可以加入新的 Order

\- 可以正常顯示於 Product 管理介面



\### 4.2 Inactive



Inactive Product：



\- 不可以加入新的 Order

\- 仍保留於 Product 管理列表

\- 可以重新啟用

\- 不影響既有 Order

\- 不影響既有 Order Item

\- 不影響既有 Payment



\---



\## 5. Product CRUD



MVP 必須提供：



\- Create Product

\- Read Product

\- Update Product

\- Enable Product

\- Disable Product



不提供：



\- Hard Delete

\- Product Delete UI



Product 停用取代實體刪除。



\---



\## 6. Product User Interface



\### 6.1 Product Management UI



需要提供獨立 Product Management UI。



基本能力：



\- Product List

\- Product Create

\- Product Edit

\- Active / Inactive Status

\- Enable

\- Disable



\### 6.2 Product List



Product List 至少顯示：



| 欄位 |

|---|

| 商品名稱 |

| 售價 |

| 狀態 |

| 操作 |



MVP 不需要顯示：



\- Product ID

\- SKU

\- Barcode

\- Cost

\- Inventory



\### 6.3 Product Create / Edit



Create 與 Edit 使用同一套基本 Form。



輸入欄位：



\- 商品名稱

\- 售價



Edit 可以修改：



\- 商品名稱

\- 售價



建立 Product 後：



> 預設為 Active。



\### 6.4 Disable



停用 Product 時需要簡單確認。



停用後：



\- Status → Inactive

\- 不可加入新的 Order

\- 既有 Order 不受影響



\### 6.5 Enable



重新啟用 Product：



\- Status → Active

\- 可以重新加入新的 Order



重新啟用不需要額外確認。



\---



\## 7. Product List Behavior



Product List：



\- 顯示 Active Product

\- 顯示 Inactive Product

\- 清楚標示目前狀態



MVP 不需要：



\- Pagination

\- Search

\- Filter

\- Sort

\- Bulk Operation



\---



\## 8. Order Integration



TASK-0015 與 TASK-0013 Order Execution 的核心關係：



&#x20;   Product

&#x20;       ↓

&#x20;   Active Product

&#x20;       ↓

&#x20;   Order Item



只有 Active Product 可以加入新的 Order。



Backend 必須 enforce：



\- Product 必須存在

\- Product 必須 Active

\- Product ID 必須有效



不得只依賴 Frontend 驗證。



\---



\## 9. Transaction Price



建立 Order Item 時：



> Product Sale Price → Order Item Transaction Price



Product 的 Sale Price 是商品主資料。



Order Item 的 Transaction Price 是交易當下的實際價格。



例如：



&#x20;   Product

&#x20;   商品名稱：洗毛精

&#x20;   Sale Price：300



&#x20;   ↓



&#x20;   建立 Order



&#x20;   Order Item

&#x20;   商品：洗毛精

&#x20;   Transaction Price：300



如果之後 Product Sale Price 修改為 350：



&#x20;   Existing Order Item

&#x20;   Transaction Price：300



既有 Order 不得因 Product 改價而改變。



\---



\## 10. Product Price Modification



Product 可以修改 Sale Price。



價格修改：



\- 只影響未來建立的 Order

\- 不修改既有 Order

\- 不修改既有 Order Item

\- 不修改既有 Transaction Price

\- 不修改既有 Payment



\---



\## 11. Product Disable and Historical Orders



Product 停用後：



&#x20;   New Order

&#x20;       ↓

&#x20;   不可使用該 Product



但：



&#x20;   Existing Order

&#x20;       ↓

&#x20;   仍可查看



Product 停用不得破壞：



\- Order

\- Order Item

\- Transaction Price

\- Payment

\- Payment History



\---



\## 12. Authorization



依目前 MVP 簡化角色模型：



| Role | Product Read | Product Manage |

|---|---:|---:|

| Owner | Yes | Yes |

| Front Desk | Yes | No |

| Groomer | Yes | No |



Product Management 屬於店家主資料管理。



Owner：



\- 可以建立 Product

\- 可以修改 Product

\- 可以啟用 Product

\- 可以停用 Product



Front Desk：



\- 可以讀取 Product

\- 不可以管理 Product



Groomer：



\- 可以讀取 Product

\- 不可以管理 Product



\---



\## 13. Validation



\### 13.1 Product Name



必須：



\- Required

\- 不得為空

\- 儲存前 trim 前後空白



\### 13.2 Sale Price



必須：



\- Required

\- 為有效數字

\- 大於 0

\- 使用固定兩位小數



\### 13.3 Product Reference



所有相關 API 必須驗證：



\- Product 是否存在

\- Product ID 是否有效

\- Product 狀態是否允許目前操作



\---



\## 14. API Business Rules



Backend 必須 enforce：



1\. Product Name 不得為空。

2\. Sale Price 必須大於 0。

3\. Product 必須存在。

4\. Inactive Product 不得加入新的 Order。

5\. Existing Order 不受 Product Status 影響。

6\. Product Price 修改不得修改歷史 Order Item。

7\. 未授權角色不得管理 Product。

8\. Frontend Validation 不得取代 Backend Validation。



Frontend Validation：



> 負責使用者體驗。



Backend Validation：



> 負責真正的 Business Rule Enforcement。



\---



\## 15. Data Model Scope



TASK-0015 只建立 Product 所需的最小資料模型。



核心資料：



&#x20;   Product

&#x20;   ├── id

&#x20;   ├── name

&#x20;   ├── price

&#x20;   ├── status

&#x20;   ├── created\_at

&#x20;   └── updated\_at



不建立：



\- Inventory tables

\- Supplier tables

\- Procurement tables

\- Product Category tables

\- Product Brand tables

\- Barcode tables

\- Analytics tables

\- Audit Log tables



\---



\## 16. Out of Scope



TASK-0015 明確排除：



\- Inventory

\- Stock Quantity

\- Stock Movement

\- Procurement

\- Supplier Management

\- Barcode

\- SKU

\- POS

\- Product Images

\- Product Description

\- Product Category

\- Product Brand

\- CSV Import

\- CSV Export

\- Bulk Enable / Disable

\- Audit Log

\- Product Analytics

\- Cost Price

\- Gross Margin

\- Product Dashboard



\---



\## 17. Traditional Chinese UI Requirement



TASK-0015 UI 必須遵守：



> Traditional Chinese UI Localization Baseline v1.0



所有使用者可見文字必須使用繁體中文。



包含：



\- Page Title

\- Labels

\- Buttons

\- Status

\- Validation Error

\- Success Message

\- Confirmation Message

\- Empty State

\- API Error Display



不得新增不必要的英文 UI。



Technical identifiers 可以維持英文，包括：



\- API Route

\- Database Field

\- JavaScript Variable

\- Internal Identifier



\---



\## 18. Testing Scope



\### 18.1 Product API



必須測試：



\- Create

\- Read

\- Update

\- Enable

\- Disable

\- Validation

\- Authorization



\### 18.2 Product / Order Integration



必須驗證：



\- Active Product 可以加入 Order

\- Inactive Product 不可以加入新的 Order

\- 不存在的 Product ID 被拒絕

\- Product 改價不影響既有 Order

\- Product 停用不影響既有 Order



\### 18.3 UI



必須驗證：



\- Product List

\- Product Create

\- Product Edit

\- Product Enable

\- Product Disable

\- Validation

\- Traditional Chinese UI



\### 18.4 Regression



必須確認既有功能不因 TASK-0015 受到破壞：



\- Customer

\- Pet

\- Appointment

\- Daily Operations

\- Grooming

\- Boarding

\- Order

\- Payment



\---



\## 19. Existing Freeze Boundary



TASK-0015 必須維持與既有 Freeze TASK 的邊界。



\### TASK-0013 — Order Execution



Order 負責：



\- Order

\- Order Item

\- Transaction Price

\- Order Transaction Data



\### TASK-0014 — Payment Execution / Payment Management



Payment 負責：



\- Payment

\- Payment Amount

\- Payment Method

\- Payment Status

\- Payment History

\- Payment Void



\### TASK-0015 — Product Management



Product 負責：



\- Product Master Data

\- Product Price

\- Product Status

\- Product Availability to Order



不得將 Order 或 Payment 的責任重新移入 Product。



\---



\## 20. Scope Integrity



TASK-0015 不得：



\- 重新設計 TASK-0013

\- 重新設計 TASK-0014

\- 修改既有 Order Business Model

\- 修改既有 Payment Business Model

\- 新增 Inventory 系統

\- 新增 POS 系統

\- 新增 Procurement 系統

\- 新增 Supplier 系統

\- 新增 Product Analytics

\- 擴張 MVP Scope



如果 Coding 或 Verification 發現既有功能的真正 Integration Bug：



> 應依實際問題判定為 Bug / Integration Issue / Scope Gap，而不得藉 TASK-0015 擅自擴張功能。



\---



\## 21. Definition of Done



TASK-0015 必須達成：



\- \[ ] Product DB schema 完成

\- \[ ] Product API 完成

\- \[ ] Product Authorization 完成

\- \[ ] Product Validation 完成

\- \[ ] Product CRUD 完成

\- \[ ] Enable / Disable 完成

\- \[ ] Active Product → Order Integration 完成

\- \[ ] Transaction Price 行為正確

\- \[ ] Product UI 完成

\- \[ ] Traditional Chinese UI 完成

\- \[ ] Targeted Tests PASS

\- \[ ] Full Regression PASS

\- \[ ] Browser E2E PASS（適用時）

\- \[ ] Scope Verification PASS

\- \[ ] 無未解決 Blocking Issue

\- \[ ] Human Acceptance PASS

\- \[ ] Formal Engineering Document 完成

\- \[ ] TASK-0015 Freeze



\---



\## 22. Decision Record



TASK-0015 Decision 共 60 題。



| Batch | Questions | Result |

|---|---:|---|

| Batch 1 | Q1–Q15 | 全部採用 AI Recommendation |

| Batch 2 | Q16–Q30 | 全部採用 AI Recommendation |

| Batch 3 | Q31–Q45 | 全部採用 AI Recommendation |

| Batch 4 | Q46–Q60 | 全部採用 AI Recommendation |



Decision Final Result：



> 60 / 60 Confirmed



\---



\## 23. Final Scope Statement



TASK-0015 正式 Scope：



> 提供店家基本商品主資料管理，讓 Active Product 可以被 Order 使用；保留歷史交易價格與資料一致性，不建立 Inventory、POS、Procurement、Supplier Management 或 Product Analytics。



\---



\## 24. Freeze Status



TASK-0015 Decision：



> COMPLETE



TASK-0015 Scope：



> CONFIRMED



TASK-0015 Human Freeze Confirmation：



> PASS



TASK-0015 Status：



> FREEZE



TASK-0015 Version：



> v1.0



\---



\## 25. Freeze Boundary



自 TASK-0015 FREEZE 起：



\- 已確認 Scope 不得自行擴張。

\- 已確認 Out of Scope 不得自行加入。

\- 已確認 Product Business Rules 不得自行修改。

\- 已確認 Order / Payment 邊界不得自行改寫。

\- Coding 必須依本正式文件執行。

\- Verification 必須依本正式文件與 Definition of Done 執行。

\- 任何新增需求應進入後續 TASK 或正式變更流程。



\---



\## 26. Final Status



TASK-0015：



> \*\*FREEZE\*\*



正式名稱：



> \*\*TASK-0015 商品管理 Product Management v1.0\*\*



本文件為 TASK-0015 Coding 階段之正式工程規格基準。
