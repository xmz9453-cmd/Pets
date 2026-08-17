\# PHASE 20 — 訂單管理區塊定義與實作規格

\# Order Block Definition and Implementation Specification



\## Document Information



| 項目 | 內容 |

|---|---|

| Phase | PHASE 20 |

| 中文名稱 | 訂單管理 |

| 英文名稱 | Order |

| Document Type | Business Block Definition and Implementation Specification |

| Version | v1.0 |

| Status | \*\*FREEZE\*\* |

| Decision Range | Q1–Q40 |

| Freeze Date | 2026-08-16 |

| Filename | `PHASE-20-訂單管理區塊定義與實作規格-Order-Block-Definition-and-Implementation-Specification-v1.0.md` |



\---



\# 1. Document Purpose



本文件定義 MVP 第一版的：



> \*\*Order — 訂單管理 Business Block\*\*



Order 的核心責任為：



> \*\*管理客戶這次實際購買了什麼。\*\*



本文件正式定義：



\- Order Business Responsibility

\- Order Business Boundary

\- Order Source

\- Order Lifecycle

\- Order Status

\- Order Item

\- Service Item

\- Product Item

\- Item Snapshot

\- Quantity

\- Price

\- Subtotal

\- Order Total

\- Checkout

\- Order Cancellation

\- Customer Reference

\- Appointment Reference

\- Product / Service Reference

\- Order Note

\- Payment Boundary

\- Partial Payment Boundary

\- UI

\- API

\- Database Boundary

\- Backend Architecture

\- Validation

\- Error Handling

\- Testing

\- Browser Verification

\- Cross-Block Integration

\- Happy Path

\- Definition of Done

\- MVP Exclusion



本文件為 PHASE 20 正式 Freeze 文件。



\---



\# 2. Phase Status



PHASE 20 已完成：



```text

Batch 1

→ Q1–Q10

→ PROVISIONAL



Batch 2

→ Q11–Q20

→ PROVISIONAL



Batch 3

→ Q21–Q30

→ PROVISIONAL



Batch 4

→ Q31–Q40

→ PROVISIONAL



Phase Review

→ 完成



PHASE 20

→ FREEZE

```



本文件發布後：



> \*\*PHASE 20 Order Block 正式 FREEZE。\*\*



後續實作必須以本文件為基準。



\---



\# 3. Project Baseline



PHASE 20 必須承接既有 Phase Freeze：



```text

PHASE 1 FREEZE

&#x20;       ↓

PHASE 2 FREEZE

&#x20;       ↓

PHASE 3 FREEZE

&#x20;       ↓

PHASE 4 FREEZE

&#x20;       ↓

PHASE 5 FREEZE

&#x20;       ↓

PHASE 6 FREEZE

&#x20;       ↓

PHASE 7 FREEZE

&#x20;       ↓

PHASE 8 FREEZE

&#x20;       ↓

PHASE 9 FREEZE

&#x20;       ↓

PHASE 10 FREEZE

&#x20;       ↓

PHASE 11 FREEZE

&#x20;       ↓

PHASE 12 FREEZE

&#x20;       ↓

PHASE 13 FREEZE

&#x20;       ↓

PHASE 14 FREEZE

&#x20;       ↓

PHASE 15 FREEZE

&#x20;       ↓

PHASE 16 FREEZE

&#x20;       ↓

PHASE 17 FREEZE

&#x20;       ↓

PHASE 18 FREEZE

&#x20;       ↓

PHASE 19 FREEZE

&#x20;       ↓

PHASE 20 FREEZE

```



本 Phase 不重新設計前面已 Freeze 的：



\- MVP Product Definition

\- MVP Scope

\- Business Workflow

\- Business Block Map

\- Business Block Responsibility

\- Technical Architecture

\- Technical Baseline

\- Customer Block

\- Pet Block

\- Service Block

\- Appointment Block

\- Daily Operations Block

\- Grooming Block

\- Boarding Block



\---



\# 4. Technical Baseline



PHASE 20 必須遵守既有技術架構。



\## Frontend



\- Next.js

\- JavaScript

\- Bootstrap



\## Backend



\- Express.js

\- JavaScript



\## Database



\- MySQL



\## Database Driver



\- mysql2



\## Testing



\- Jest

\- Supertest



\## ORM



> 不使用 ORM。



\## Architecture



```text

Next.js

&#x20;   ↓

Express.js API

&#x20;   ↓

Business Logic

&#x20;   ↓

Data Access

&#x20;   ↓

mysql2

&#x20;   ↓

MySQL

```



\---



\# 5. Order Responsibility



Order 的核心責任：



> \*\*管理客戶這次實際購買了什麼。\*\*



Order 負責：



\- 建立訂單

\- 管理 Order Item

\- 管理 Service Item

\- 管理 Product Item

\- 管理 Order Source

\- 管理 Quantity

\- 管理成交價格

\- 管理 Item Subtotal

\- 管理 Order Total

\- 管理 Order Status

\- 管理 Checkout

\- 管理 Order Cancel

\- 保存 Customer Reference

\- 保存必要 Appointment Reference

\- 保存 Service / Product Reference

\- 保存交易 Snapshot

\- 保存基本 Order Note

\- 提供訂單查詢

\- 提供訂單 Detail

\- 與 Payment Block 進行交易銜接



\---



\# 6. Order Boundary



Order 不負責：



\- Customer Master Data

\- Pet Master Data

\- Service Master Data

\- Product Master Data

\- Appointment Management

\- Grooming Execution

\- Boarding Lifecycle

\- Daily Operations Core Data

\- Payment Core Logic

\- Notification

\- Inventory

\- Accounting

\- Tax Engine

\- CRM

\- Coupon System

\- Membership System

\- Loyalty / Points System



Order 只負責：



> \*\*交易內容本身。\*\*



\---



\# 7. Core Principle



Order 的核心定義：



> \*\*Order = 客戶這次實際購買了什麼。\*\*



因此：



```text

Appointment

=

客戶預約了什麼



Grooming

=

實際美容執行了什麼



Boarding

=

實際住宿發生了什麼



Order

=

客戶這次購買了什麼



Payment

=

客戶怎麼付款、付了多少

```



各 Block 必須保持責任分離。



\---



\# 8. Order and Appointment



Order：



> 不強制依賴 Appointment。



可以存在：



```text

Appointment

&#x20;   ↓

Order

```



也可以存在：



```text

Walk-in

&#x20;   ↓

Order

```



因此：



> \*\*Order ≠ Appointment\*\*



Appointment 只是 Order 的可能來源之一。



\---



\# 9. Order Source



第一版至少區分：



```text

APPOINTMENT

WALK\_IN

```



\## APPOINTMENT



代表：



> Order 由既有 Appointment 所產生。



例如：



```text

Appointment

&#x20;   ↓

美容服務

&#x20;   ↓

Order

```



\## WALK\_IN



代表：



> 客戶沒有透過 Appointment，而是在現場直接產生交易。



例如：



```text

Walk-in

&#x20;   ↓

Product

&#x20;   ↓

Order

```



\---



\# 10. Order Item



一張 Order：



> 可以包含一個或多個 Order Item。



例如：



```text

Order #1001



Item 1

美容服務



Item 2

住宿服務



Item 3

商品 A



Item 4

商品 B

```



因此：



> \*\*Order 是交易容器。\*\*



Order Item 是：



> 客戶這次購買的個別項目。



\---



\# 11. Order Item Type



第一版至少支援：



```text

SERVICE

PRODUCT

```



\## SERVICE



代表：



> 客戶購買店家提供的 Service。



例如：



\- Grooming Service

\- Boarding Service



\## PRODUCT



代表：



> 客戶購買店內商品。



例如：



\- 寵物食品

\- 寵物用品

\- 其他已建立於 Product Master 的商品



\---



\# 12. Mixed Order



一張 Order 可以同時包含：



```text

SERVICE

\+

PRODUCT

```



例如：



```text

美容服務

\+

住宿服務

\+

寵物零食

\+

寵物用品

```



全部可以存在於：



> 同一張 Order。



不需要因為 Item Type 不同而拆成多張 Order。



\---



\# 13. Order Item Reference



Order Item 必須保存必要的來源 Reference。



Service Item：



```text

Service Reference

```



Product Item：



```text

Product Reference

```



如果 Service Item 來自 Appointment：



```text

Appointment Reference

```



可以保存必要來源關係。



\---



\# 14. Appointment Reference



如果 Order 來自 Appointment：



> 必須保存必要的 Appointment Reference。



概念：



```text

Appointment

&#x20;   ↑

&#x20;   │ Reference

&#x20;   │

Order

```



但 Appointment：



> 不成為所有 Order 的必要條件。



\---



\# 15. Customer Reference



Order 必須保存：



> Customer Reference。



概念：



```text

Customer

&#x20;   ↑

&#x20;   │ Customer ID

&#x20;   │

Order

```



Customer Master：



> 仍由 Customer Block 負責。



Order：



> 不建立第二套 Customer Master。



\---



\# 16. Pet Reference



如果交易項目與特定 Pet 有關：



> 可以保存必要 Pet Reference。



例如：



```text

美容服務

&#x20;   ↓

Pet A

```



Boarding Service：



```text

住宿

&#x20;   ↓

Pet A

```



但 Pet Master：



> 仍由 Pet Block 負責。



\---



\# 17. Service Reference



Service Item：



> 應引用 Service Master。



概念：



```text

Service Master

&#x20;   ↓

Service Reference

&#x20;   ↓

Order Item

```



但交易成立時：



> 必須保存成交 Snapshot。



\---



\# 18. Product Reference



Product Item：



> 應引用 Product Master。



概念：



```text

Product Master

&#x20;   ↓

Product Reference

&#x20;   ↓

Order Item

```



同時：



> 保存成交 Snapshot。



\---



\# 19. Transaction Snapshot



Order Item 必須保存當時成交所需的資訊。



至少包含概念：



```text

Item Type

Reference

Item Name Snapshot

Unit Price

Quantity

Subtotal

```



目的：



> 保留歷史交易真實內容。



\---



\# 20. Snapshot Principle



假設：



```text

2026-08-16



美容服務

價格 = 800

```



建立 Order：



```text

Order Item

Name = 美容服務

Unit Price = 800

```



之後 Service Master 修改：



```text

美容服務

價格 = 900

```



原 Order：



> 仍然必須維持 800。



因此：



> \*\*歷史 Order 不應依賴 Master Data 的目前價格重新計算。\*\*



\---



\# 21. Quantity



Order Item 第一版：



> 支援 Quantity。



例如：



```text

商品 A × 2

```



計算：



```text

Unit Price × Quantity

```



Service Item：



> 通常 Quantity = 1。



但資料模型仍保持統一 Quantity 概念。



\---



\# 22. Unit Price



Unit Price：



> 代表該 Order Item 當下的成交單價。



建立 Order 時：



> Backend 必須驗證與決定價格。



Frontend：



> 不具有最終價格決定權。



\---



\# 23. Subtotal



每個 Order Item：



```text

Subtotal

=

Unit Price × Quantity

```



例如：



```text

Unit Price = 300

Quantity = 2



Subtotal = 600

```



Subtotal：



> 必須由 Backend 計算。



\---



\# 24. Order Total



Order Total：



```text

Order Total

=

Σ Order Item Subtotal

```



例如：



```text

美容

800



住宿

1,200



商品

300



\----------------

Order Total

2,300

```



Order Total：



> 由 Backend Business Logic 計算。



\---



\# 25. Frontend Price Security



Frontend 可以：



> 顯示價格。



Frontend 不可以成為：



> 最終價格決定來源。



禁止：



```text

Frontend

&#x20;   ↓

任意 Total

&#x20;   ↓

Backend

&#x20;   ↓

直接寫入 Database

```



正確方向：



```text

Order Items

&#x20;   ↓

Backend Business Logic

&#x20;   ↓

取得合法價格

&#x20;   ↓

計算 Subtotal

&#x20;   ↓

計算 Total

&#x20;   ↓

Database

```



\---



\# 26. Manual Price Adjustment



第一版：



> 不提供一般人工任意調價。



也不建立：



\- 議價系統

\- 特殊價格規則

\- 個人化價格

\- 動態折扣

\- 權限式人工改價



原因：



> 避免 MVP 過早進入複雜價格政策。



\---



\# 27. Discount Boundary



第一版不建立：



\- Coupon

\- Promotion Engine

\- Loyalty Discount

\- Membership Discount

\- Complex Discount Rule



Order 第一版維持：



```text

Quantity

×

Unit Price

=

Subtotal

```



```text

Σ Subtotal

=

Order Total

```



\---



\# 28. Tax Boundary



第一版：



> 不建立獨立稅務計算引擎。



不包含：



\- 稅率管理

\- 稅務規則引擎

\- 發票整合

\- 複雜會計計算

\- 稅務報表系統



Order 只維持：



> MVP 所需的基本交易金額。



\---



\# 29. Order Status



第一版 Order Status：



```text

DRAFT

OPEN

COMPLETED

CANCELLED

```



\---



\# 30. DRAFT



DRAFT：



> 代表 Order 已開始建立，但尚未進入正式交易確認。



用途：



> 支援 Checkout 前的編輯流程。



\---



\# 31. OPEN



OPEN：



> 代表 Order 已建立並可進行編輯／確認。



在 OPEN 狀態：



\- 可以新增 Item

\- 可以移除 Item

\- 可以修改 Quantity

\- 可以進行 Checkout

\- 可以依規則取消



\---



\# 32. COMPLETED



COMPLETED：



> 代表 Order 的交易內容已確認完成。



重要：



> \*\*COMPLETED 不等於已付款。\*\*



因此：



```text

Order Status

=

COMPLETED

```



不代表：



```text

Payment Status

=

PAID

```



Payment 由 Payment Block 負責。



\---



\# 33. CANCELLED



CANCELLED：



> 代表 Order 已取消。



取消後：



> 保留 Order Record。



不得透過一般 Hard Delete 消除歷史交易。



\---



\# 34. Order Status and Payment Status



兩個概念必須分離：



```text

Order Status

=

訂單交易內容生命週期

```



```text

Payment Status

=

付款生命週期

```



例如：



```text

Order

COMPLETED



Payment

PARTIAL

```



可以合法存在。



\---



\# 35. Order Lifecycle



第一版核心流程：



```text

DRAFT

&#x20;   ↓

OPEN

&#x20;   ↓

COMPLETED

```



取消：



```text

DRAFT

&#x20;   ↓

CANCELLED

```



或：



```text

OPEN

&#x20;   ↓

CANCELLED

```



不應任意允許：



```text

COMPLETED

&#x20;   ↓

OPEN

```



或：



```text

CANCELLED

&#x20;   ↓

COMPLETED

```



\---



\# 36. Order Editing



DRAFT / OPEN：



> 可以依 Business Rule 編輯。



可以：



\- 新增 Item

\- 移除 Item

\- 修改 Quantity

\- 修改必要 Note



價格：



> 仍由 Backend Business Rule 控制。



\---



\# 37. Completed Order Editing



COMPLETED：



> 不允許一般修改。



原因：



\- 保護交易歷史

\- 保護 Payment 關係

\- 避免 Report 不一致

\- 避免修改已確認成交內容



如確實需要修正：



> 必須依 Change Request 或後續明確定義的交易修正規則處理。



\---



\# 38. Order Cancellation



第一版：



> 支援 Order Cancel。



基本：



```text

DRAFT

&#x20;   ↓

CANCELLED

```



```text

OPEN

&#x20;   ↓

CANCELLED

```



但：



> 不允許所有狀態任意取消。



\---



\# 39. Payment Existing Rule



如果 Order 已經存在 Payment：



> 不可以只修改 Order Status 而忽略 Payment。



例如：



```text

Order

1,500



Payment

1,000

```



此時不能簡單：



```text

Order

→ CANCELLED

```



而不處理：



> 已存在的 Payment 關係。



實際 Payment 處理：



> 由 Payment Block 定義。



\---



\# 40. Hard Delete



第一版：



> 不提供一般 Order Hard Delete。



原因：



> Order 是交易歷史。



取消：



```text

Status = CANCELLED

```



而不是：



```text

DELETE FROM orders

```



\---



\# 41. Checkout



Order 必須提供：



> \*\*獨立 Checkout 操作。\*\*



基本流程：



```text

建立 Order

&#x20;   ↓

DRAFT / OPEN

&#x20;   ↓

確認 Items

&#x20;   ↓

確認金額

&#x20;   ↓

Checkout

&#x20;   ↓

COMPLETED

&#x20;   ↓

Payment

```



\---



\# 42. Checkout Confirmation



Checkout 時：



> 必須再次確認交易內容。



至少確認：



\- Customer

\- Items

\- Item Type

\- Item Name

\- Quantity

\- Unit Price

\- Subtotal

\- Order Total

\- Note



\---



\# 43. Checkout Responsibility



Checkout 負責：



> 確認 Order 的交易內容已經可以進入完成狀態。



Checkout 不負責：



\- Payment Method

\- Payment Amount

\- Payment Status

\- Payment Record



這些由：



> Payment Block



負責。



\---



\# 44. Payment Relationship



基本關係：



```text

Order

&#x20;   ↓

Payment

```



但：



> Payment 不等於 Order。



一張 Order：



> 可以有一個或多個 Payment Record。



\---



\# 45. Partial Payment



第一版支援部分付款。



例如：



```text

Order Total

=

1,500

```



```text

Payment #1

=

1,000

```



剩餘：



```text

500

```



實際付款計算：



> 由 Payment Block 負責。



\---



\# 46. Payment Responsibility Boundary



Order 只需要提供：



```text

Order Total

```



Payment 負責：



```text

Paid Amount

Payment Method

Payment Status

Remaining Amount

Payment Records

```



Order 不建立第二套 Payment Logic。



\---



\# 47. Customer without Appointment



Walk-in Product Order：



> 不需要 Appointment。



基本：



```text

Customer

&#x20;   ↓

Walk-in

&#x20;   ↓

Product

&#x20;   ↓

Order

```



如果 Customer 尚不存在：



> 依既有 Customer Block 規則處理。



不得在 Order 建立第二套 Customer Master。



\---



\# 48. Walk-in Product Order



第一版必須支援：



```text

客戶進店

&#x20;   ↓

選擇商品

&#x20;   ↓

建立 Order

&#x20;   ↓

確認 Quantity

&#x20;   ↓

Checkout

&#x20;   ↓

Payment

```



這是 MVP 正式 Happy Path。



\---



\# 49. Service Order



Service Order 可以由既有 Appointment 流程產生：



```text

Appointment

&#x20;   ↓

實際服務

&#x20;   ↓

Order

```



Order Item：



```text

SERVICE

```



並保存：



> 必要 Service Reference。



\---



\# 50. Grooming Integration



Grooming：



> 負責實際美容執行。



Order：



> 負責美容服務的交易內容。



概念：



```text

Grooming

&#x20;   ↓

服務完成

&#x20;   ↓

Order

```



Order 不負責：



\- 洗澡

\- 吹毛

\- 剪毛

\- 美容執行狀態



\---



\# 51. Boarding Integration



Boarding：



> 負責實際住宿生命週期。



Order：



> 負責住宿服務的交易內容。



概念：



```text

Boarding

&#x20;   ↓

住宿完成／確認

&#x20;   ↓

Order

```



Order 不負責：



\- Check-in

\- Stay

\- Daily Care

\- Check-out



\---



\# 52. Product Integration



Product：



> 負責 Product Master。



Order：



> 負責 Product Transaction。



概念：



```text

Product Master

&#x20;   ↓

Order Item

&#x20;   ↓

Transaction Snapshot

```



Product 不取代 Order。



Order 也不取代 Product Master。



\---



\# 53. Order Note



第一版支援：



> 基本 Order Note。



用途：



\- 結帳備註

\- 客戶交代事項

\- 商品交易備註

\- 現場交易備註



不建立：



> CRM Note System。



\---



\# 54. Order Timestamp



Order 至少保存：



```text

Created At

Updated At

Completed At

```



Created At：



> Order 建立時間。



Updated At：



> Order 最後更新時間。



Completed At：



> Order 完成 Checkout 的時間。



\---



\# 55. Order List



第一版 Order List 至少支援：



\- Order ID

\- Customer

\- Date

\- Status



基本搜尋。



\---



\# 56. Order Detail



Order Detail 至少顯示：



```text

Order ID

Customer

Source

Status

Created At

Updated At

Completed At



Order Items

&#x20;   ├── Type

&#x20;   ├── Reference

&#x20;   ├── Name

&#x20;   ├── Quantity

&#x20;   ├── Unit Price

&#x20;   └── Subtotal



Order Total



Note

```



\---



\# 57. Order UI



第一版至少提供：



```text

Order List

Order Create

Order Edit

Order Detail

Checkout

```



\---



\# 58. Order Create



Create UI：



> 使用者可以建立 Order。



基本流程：



```text

選 Customer

&#x20;   ↓

選 Order Source

&#x20;   ↓

加入 Item

&#x20;   ↓

設定 Quantity

&#x20;   ↓

Backend 計算價格

&#x20;   ↓

顯示 Subtotal

&#x20;   ↓

顯示 Total

&#x20;   ↓

保存

```



\---



\# 59. Order Edit



DRAFT / OPEN：



> 可以進行基本編輯。



至少：



\- 新增 Item

\- 移除 Item

\- 修改 Quantity

\- 修改 Note



價格：



> 不由 Frontend 任意決定。



\---



\# 60. Checkout UI



Checkout UI 至少顯示：



```text

Customer

Order Items

Quantity

Unit Price

Subtotal

Order Total

```



並提供：



> 確認完成交易。



Checkout 成功後：



```text

Order

→

COMPLETED

```



\---



\# 61. Quick Actions



依 Status 顯示操作。



例如：



```text

DRAFT

&#x20;   ↓

Edit

Checkout

Cancel

```



```text

OPEN

&#x20;   ↓

Edit

Checkout

Cancel

```



```text

COMPLETED

&#x20;   ↓

View

```



```text

CANCELLED

&#x20;   ↓

View

```



不得無條件顯示所有操作。



\---



\# 62. API



第一版採：



> \*\*REST API\*\*



至少提供：



```text

GET    /api/orders

GET    /api/orders/:id

POST   /api/orders

PATCH  /api/orders/:id

```



並需要提供必要的：



\- Checkout 操作

\- Cancel 操作

\- Order Item 管理操作



實際 Endpoint 命名必須保持一致的 REST API 設計原則。



\---



\# 63. API Responsibility



Order API 負責：



\- Order List

\- Order Detail

\- Order Create

\- Order Edit

\- Order Item

\- Checkout

\- Cancel

\- Order Business Validation



Order API：



> 不負責 Payment Core Logic。



\---



\# 64. Controller Responsibility



Controller 負責：



\- HTTP Request

\- Parameters

\- Body Parsing

\- 呼叫 Business Logic

\- Response Mapping

\- HTTP Status



Controller：



> 不承擔主要 Order Business Rules。



\---



\# 65. Business Logic Responsibility



Order Business Logic 負責：



\- Create Order

\- Create Item

\- Edit Order

\- Quantity Validation

\- Price Resolution

\- Snapshot Creation

\- Subtotal Calculation

\- Total Calculation

\- Checkout

\- Cancel

\- Status Transition

\- Payment Boundary Validation

\- Cross-Block Coordination



\---



\# 66. Data Access Responsibility



Data Access 負責：



\- SQL

\- SELECT

\- INSERT

\- UPDATE

\- Order List

\- Order Detail

\- Order Item

\- Search

\- Filtering

\- Pagination

\- Sorting



Data Access：



> 不承擔主要 Business Rules。



\---



\# 67. Database Ownership



Order 必須擁有自己的交易資料來源。



概念：



```text

Order

&#x20;   ↓

Order Items

```



Order 保存：



\- Order Identity

\- Customer Reference

\- Order Source

\- Status

\- Amount

\- Timestamps

\- Note



Order Item 保存：



\- Item Type

\- Service / Product Reference

\- Appointment Reference if applicable

\- Pet Reference if applicable

\- Item Name Snapshot

\- Unit Price

\- Quantity

\- Subtotal



\---



\# 68. Database Principle



Order Database：



> 必須保存交易當下必要資訊。



不能完全依賴：



```text

Service Master

Product Master

```



來重建歷史 Order。



\---



\# 69. Master Data Boundary



Service：



> Service Block 管理。



Product：



> Product Block 管理。



Customer：



> Customer Block 管理。



Pet：



> Pet Block 管理。



Order：



> 只保存必要 Reference + Transaction Snapshot。



\---



\# 70. ORM Policy



Order：



> 不使用 ORM。



Database Access：



> 使用 mysql2。



\---



\# 71. Validation Architecture



Order Validation：



```text

Frontend Validation

&#x20;       ↓

Backend Validation

&#x20;       ↓

Business Rule

&#x20;       ↓

Database Constraint

```



Frontend Validation：



> 只負責提升操作體驗。



Backend Validation：



> 必須重新執行。



\---



\# 72. Create Validation



建立 Order 至少確認：



\- Customer Reference 合法

\- Source 合法

\- Order Item 存在

\- Item Type 合法

\- Service Reference 合法

\- Product Reference 合法

\- Quantity 合法

\- Item Source 合法

\- Appointment Reference 若存在則合法

\- Pet Reference 若存在則合法

\- 價格合法

\- 金額計算正確



\---



\# 73. Quantity Validation



Quantity：



> 必須是合法值。



第一版不得接受：



```text

0

負數

無效數值

```



Backend 必須驗證。



\---



\# 74. Price Validation



Price：



> 不應直接信任 Frontend。



Backend：



> 必須從合法 Master Data 取得或驗證價格。



建立 Item Snapshot 後：



> 保存當下成交價格。



\---



\# 75. Checkout Validation



Checkout 前至少確認：



\- Order 存在

\- Status 合法

\- Order 至少有一個 Item

\- Item 資料完整

\- Quantity 合法

\- Unit Price 合法

\- Subtotal 正確

\- Total 正確

\- Customer Reference 合法

\- 必要 Source Reference 合法



成功後：



```text

OPEN

&#x20;   ↓

COMPLETED

```



\---



\# 76. Cancel Validation



Cancel 前至少確認：



\- Order 存在

\- Status 可取消

\- Payment 關係符合規則

\- 操作者具有權限



不允許：



```text

COMPLETED

→

一般 Cancel

```



而忽略既有 Payment。



\---



\# 77. Invalid Status Transition



Backend 必須拒絕不合法 Transition。



例如：



```text

COMPLETED

→ OPEN

```



```text

CANCELLED

→ COMPLETED

```



```text

COMPLETED

→ CANCELLED

```



不得直接成功。



\---



\# 78. Error Handling



至少需要能表示：



\- Order Not Found

\- Customer Not Found

\- Service Not Found

\- Product Not Found

\- Invalid Order Source

\- Invalid Item Type

\- Invalid Quantity

\- Invalid Price

\- Invalid Amount

\- Invalid Status

\- Invalid Status Transition

\- Order Empty

\- Order Already Completed

\- Order Already Cancelled

\- Payment Conflict

\- Permission Denied

\- Required Data Missing



不得只回傳：



```text

500 Internal Server Error

```



而沒有可理解的 Business Error。



\---



\# 79. Business Error Examples



概念錯誤：



```text

ORDER\_NOT\_FOUND

CUSTOMER\_NOT\_FOUND

SERVICE\_NOT\_FOUND

PRODUCT\_NOT\_FOUND

ORDER\_EMPTY

INVALID\_ORDER\_SOURCE

INVALID\_ITEM\_TYPE

INVALID\_QUANTITY

INVALID\_ORDER\_STATUS

INVALID\_STATUS\_TRANSITION

ORDER\_ALREADY\_COMPLETED

ORDER\_ALREADY\_CANCELLED

ORDER\_PAYMENT\_CONFLICT

```



實際 Error Code 命名必須在工程實作時保持一致。



\---



\# 80. Unit Test



使用：



> Jest



至少測試：



\- Create Order

\- Create Item

\- Service Item

\- Product Item

\- Mixed Order

\- Quantity

\- Price Snapshot

\- Subtotal

\- Total

\- Checkout

\- Cancel

\- Status Transition

\- Payment Boundary

\- Validation

\- Error Handling



\---



\# 81. API Integration Test



使用：



> Jest + Supertest



至少測試：



```text

GET    /api/orders

GET    /api/orders/:id

POST   /api/orders

PATCH  /api/orders/:id

```



以及：



\- Checkout

\- Cancel

\- Item 操作

\- Validation

\- Error Handling

\- Database Result



\---



\# 82. Browser Verification



Browser 必須實際驗證：



```text

Order List

&#x20;   ↓

Create Order

&#x20;   ↓

Select Customer

&#x20;   ↓

Add Service / Product

&#x20;   ↓

Quantity

&#x20;   ↓

確認 Item

&#x20;   ↓

確認 Total

&#x20;   ↓

Checkout

&#x20;   ↓

COMPLETED

```



\---



\# 83. Walk-in Browser Verification



必須驗證：



```text

Walk-in

&#x20;   ↓

選 Customer

&#x20;   ↓

選 Product

&#x20;   ↓

建立 Order

&#x20;   ↓

Checkout

&#x20;   ↓

COMPLETED

&#x20;   ↓

Payment

```



\---



\# 84. Mixed Order Browser Verification



必須驗證：



```text

Service

\+

Product

&#x20;   ↓

One Order

&#x20;   ↓

Checkout

&#x20;   ↓

COMPLETED

```



確認：



> Service 與 Product 可以存在於同一張 Order。



\---



\# 85. Payment Integration Verification



至少驗證：



```text

Order

&#x20;   ↓

COMPLETED

&#x20;   ↓

Payment

```



以及：



```text

Order Total

=

1,500



Payment

=

1,000



Remaining

=

500

```



確認：



> Order 不直接管理 Payment Core Logic。



\---



\# 86. Historical Price Verification



必須驗證：



```text

建立 Order

&#x20;   ↓

Unit Price = 800

&#x20;   ↓

完成 Order

&#x20;   ↓

修改 Service Master Price = 900

&#x20;   ↓

查看歷史 Order

```



結果必須仍然：



```text

Unit Price = 800

```



\---



\# 87. Order History Verification



Browser 必須可以查看：



\- Order ID

\- Customer

\- Order Source

\- Status

\- Items

\- Quantity

\- Unit Price

\- Subtotal

\- Total

\- Created At

\- Completed At



\---



\# 88. Cross-Block Verification



至少驗證：



```text

Appointment

&#x20;   ↓

Grooming / Boarding

&#x20;   ↓

Order

&#x20;   ↓

Checkout

&#x20;   ↓

Payment

```



以及：



```text

Walk-in

&#x20;   ↓

Product

&#x20;   ↓

Order

&#x20;   ↓

Payment

```



確認各 Block Responsibility 沒有互相取代。



\---



\# 89. Order Happy Path — Service



```text

Appointment

&#x20;   ↓

實際服務完成

&#x20;   ↓

建立 Order

&#x20;   ↓

加入 Service Item

&#x20;   ↓

取得 Service Price

&#x20;   ↓

建立 Price Snapshot

&#x20;   ↓

計算 Subtotal

&#x20;   ↓

計算 Order Total

&#x20;   ↓

Checkout

&#x20;   ↓

COMPLETED

&#x20;   ↓

Payment

```



\---



\# 90. Order Happy Path — Product



```text

Customer

&#x20;   ↓

Walk-in

&#x20;   ↓

選擇 Product

&#x20;   ↓

建立 Order

&#x20;   ↓

加入 Product Item

&#x20;   ↓

取得 Product Price

&#x20;   ↓

建立 Price Snapshot

&#x20;   ↓

計算 Subtotal

&#x20;   ↓

計算 Order Total

&#x20;   ↓

Checkout

&#x20;   ↓

COMPLETED

&#x20;   ↓

Payment

```



\---



\# 91. Order Happy Path — Mixed



```text

Customer

&#x20;   ↓

Service

\+

Product

&#x20;   ↓

One Order

&#x20;   ↓

Multiple Order Items

&#x20;   ↓

Calculate Subtotals

&#x20;   ↓

Calculate Total

&#x20;   ↓

Checkout

&#x20;   ↓

COMPLETED

&#x20;   ↓

Payment

```



\---



\# 92. Order and Payment Boundary Example



合法：



```text

Order Total

=

2,000



Order Status

=

COMPLETED



Payment

=

PARTIAL



Paid

=

1,000



Remaining

=

1,000

```



這代表：



> Order 已確認交易內容，但 Payment 尚未完成。



\---



\# 93. Order Data Integrity



Order 必須維持：



```text

Order Total

=

Σ Order Item Subtotal

```



且：



```text

Subtotal

=

Unit Price × Quantity

```



Database 與 Backend 必須共同確保：



> 交易金額不被任意修改。



\---



\# 94. Report Integration



Order 是 Report 的重要資料來源。



Report 可以使用：



\- Order Count

\- Order Total

\- Service Sales

\- Product Sales

\- Date

\- Customer



但：



> Report 不修改 Order。



\---



\# 95. Order Responsibility Summary



Order：



> \*\*管理交易內容。\*\*



Service：



> 管理服務定義。



Product：



> 管理商品定義。



Appointment：



> 管理預約。



Grooming：



> 管理美容執行。



Boarding：



> 管理住宿生命週期。



Payment：



> 管理付款。



Report：



> 讀取營運資料進行統計。



\---



\# 96. MVP Explicitly Excluded



PHASE 20 不包含：



\- 完整 POS ERP

\- 複雜 Discount Engine

\- Coupon System

\- Membership Pricing

\- Loyalty Points

\- Tax Engine

\- Accounting System

\- Invoice System

\- E-invoice Integration

\- Third-party Payment Gateway

\- Complex Refund Engine

\- Complex Return System

\- Multi-currency

\- Multi-tax

\- Promotion Engine

\- Advanced Pricing Engine

\- Automated Revenue Recognition

\- Full Accounting Integration

\- BI Query Engine



這些不屬於：



> MVP v1.0 Order Block。



\---



\# 97. Definition of Done



PHASE 20 Order Block 的實作完成條件：



\- Order Responsibility 完成

\- Order Boundary 完成

\- Order Source 完成

\- Order Status 完成

\- Order Lifecycle 完成

\- Order Item 完成

\- Service Item 完成

\- Product Item 完成

\- Quantity 完成

\- Unit Price 完成

\- Subtotal 完成

\- Order Total 完成

\- Transaction Snapshot 完成

\- Customer Reference 完成

\- Appointment Reference 完成

\- Pet Reference 完成

\- Service Reference 完成

\- Product Reference 完成

\- Order Note 完成

\- Checkout 完成

\- Cancel 完成

\- Payment Boundary 完成

\- Partial Payment Integration 完成

\- Order List 完成

\- Order Create 完成

\- Order Edit 完成

\- Order Detail 完成

\- Order Database 完成

\- Order Item Database 完成

\- Backend Business Logic 完成

\- Data Access 完成

\- REST API 完成

\- Validation 完成

\- Error Handling 完成

\- Unit Test 完成

\- API Integration Test 完成

\- Browser Verification 完成

\- Walk-in Product Flow 完成

\- Service Order Flow 完成

\- Mixed Order Flow 完成

\- Payment Integration Verification 完成

\- Historical Price Verification 完成

\- Cross-Block Integration 完成

\- Order Happy Path 通過

\- Order Block PASS



\---



\# 98. Decision Summary



PHASE 20 Q1～Q40：



> \*\*全部採用 AI 推薦答案。\*\*



核心決策：



```text

Order

=

客戶這次實際購買了什麼

```



Order 不強制依賴 Appointment：



```text

Appointment

&#x20;   ↓

Order

```



與：



```text

Walk-in

&#x20;   ↓

Order

```



均為合法流程。



Order 可以包含：



```text

SERVICE

\+

PRODUCT

```



同一張 Order 可以包含多個 Order Item。



\---



\# 99. Financial Boundary Summary



核心公式：



```text

Subtotal

=

Unit Price × Quantity

```



```text

Order Total

=

Σ Subtotal

```



金額：



> 由 Backend 計算。



Order：



> 不負責 Payment Core Logic。



Payment：



> 負責付款。



因此：



```text

Order

≠

Payment

```



且：



```text

Order Status

≠

Payment Status

```



\---



\# 100. Freeze Statement



本文件代表：



> \*\*PHASE 20 — Order 訂單管理區塊定義與實作規格 v1.0 正式 FREEZE。\*\*



Freeze 範圍包含：



\- Order Responsibility

\- Order Boundary

\- Order Source

\- Order Lifecycle

\- Order Status

\- Order Item

\- Service Item

\- Product Item

\- Customer Reference

\- Pet Reference

\- Appointment Reference

\- Service Reference

\- Product Reference

\- Transaction Snapshot

\- Quantity

\- Unit Price

\- Subtotal

\- Order Total

\- Checkout

\- Cancel

\- Payment Boundary

\- Partial Payment Boundary

\- Order Note

\- Order UI

\- Order API

\- Order Database Boundary

\- Backend Architecture

\- Validation

\- Error Handling

\- Testing

\- Browser Verification

\- Cross-Block Integration

\- Happy Path

\- Definition of Done

\- MVP Exclusion



後續實作必須以本文件為基準。



\---



\# 101. Change Request Rule



Freeze 後若需修改，必須提出：



1\. 哪個 Freeze 決策需要修改

2\. 發生什麼問題

3\. 為什麼原方案不可行

4\. 新方案

5\. 影響範圍

6\. 是否值得重新開啟 Freeze



未經確認：



> 不得自行修改 PHASE 20 Freeze。



如果只是：



> 另一種設計比較漂亮



不得因此推翻 Freeze。



\---



\# 102. Phase Completion



目前專案狀態：



```text

PHASE 1  FREEZE

PHASE 2  FREEZE

PHASE 3  FREEZE

PHASE 4  FREEZE

PHASE 5  FREEZE

PHASE 6  FREEZE

PHASE 7  FREEZE

PHASE 8  FREEZE

PHASE 9  FREEZE

PHASE 10 FREEZE

PHASE 11 FREEZE

PHASE 12 FREEZE

PHASE 13 FREEZE

PHASE 14 FREEZE

PHASE 15 FREEZE

PHASE 16 FREEZE

PHASE 17 FREEZE

PHASE 18 FREEZE

PHASE 19 FREEZE

PHASE 20 FREEZE

```



目前：



> \*\*20 / 20 已完成至 PHASE 20 Freeze。\*\*



Order Block 正式完成：



```text

Definition

\+

Decision

\+

Review

\+

Specification

\+

Freeze

```



\---



\# END OF DOCUMENT

