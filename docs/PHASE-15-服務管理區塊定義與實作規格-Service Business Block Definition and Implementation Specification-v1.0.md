\# PHASE 15 — Service 服務管理區塊定義與實作規格



\## Document Information



| 項目 | 內容 |

|---|---|

| Phase | PHASE 15 |

| Module | Service |

| 中文名稱 | 服務管理 |

| 英文名稱 | Service Management |

| Document Type | Business Block Definition and Implementation Specification |

| Version | v1.0 |

| Status | \*\*FREEZE\*\* |

| Decision Range | Q1–Q40 |

| Freeze Date | 2026-08-16 |



\---



\# 1. Document Purpose



本文件定義 MVP 第一版的：



> \*\*Service — 服務管理 Business Block\*\*



本文件將 PHASE 15 討論結果正式整理為可供後續工程實作使用的規格。



Service 的核心責任為：



> \*\*定義店家提供什麼服務。\*\*



Service 是店家的服務 Master Data，不負責實際美容執行、實際住宿生命週期、訂單交易或付款。



\---



\# 2. Phase Status



PHASE 15 已完成：



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



PHASE 15

→ FREEZE

```



本文件發布後：



> PHASE 15 Service Block 規格正式 Freeze。



後續不得因單純設計偏好而自行推翻本文件。



如需修改，必須依 Change Request 規則處理。



\---



\# 3. Project Baseline



本 Phase 必須承接既有 Phase Freeze。



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

```



本 Phase 不重新設計前面已 Freeze 的 Business Responsibility、MVP Scope 或 Technical Architecture。



\---



\# 4. Technical Baseline



PHASE 15 必須遵守 PHASE 6 已 Freeze 的技術架構。



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



\# 5. Business Block Responsibility



\## 5.1 Service Responsibility



Service 負責：



> \*\*店家提供什麼服務。\*\*



Service 管理：



\- Service Name

\- Service Type

\- Pet Type applicability

\- Description

\- Basic Price

\- Basic Duration

\- Status

\- Display Order

\- Created At

\- Updated At



\---



\# 6. Service Boundary



Service 不負責：



\- Appointment 管理

\- Grooming 實際執行

\- Boarding 實際入住

\- Boarding 實際退房

\- Order 管理

\- Payment

\- 最終交易價格計算

\- 複雜價格引擎

\- 複雜容量排程

\- 自動派工

\- 會員折扣

\- 優惠券

\- 動態定價

\- Inventory



\---



\# 7. Service 與其他 Block 的關係



\## 7.1 Customer



Customer：



> 誰是客戶。



Service：



> 店家提供什麼服務。



兩者不直接形成 Owner relationship。



\---



\## 7.2 Pet



Pet：



> 哪一隻寵物。



Service 可以定義適用的 Pet Type：



```text

DOG

CAT

BOTH

```



Service 不擁有 Pet。



\---



\## 7.3 Appointment



Appointment：



> 客戶預約了什麼、什麼時間來。



Service：



> 店家提供什麼服務。



兩者關係：



```text

Customer

&#x20;   ↓

Pet

&#x20;   ↓

Appointment

&#x20;   ↓

Service

```



重要：



> Service 不等於 Appointment。



\---



\## 7.4 Grooming



Service：



> 定義提供什麼美容服務。



Grooming：



> 管理實際美容執行。



例如：



```text

Service

全套美容

&#x20;   ↓

Appointment

&#x20;   ↓

Grooming

接單

→ 洗澡

→ 吹毛

→ 剪毛

→ 拍照

→ 完成

```



Service 不管理 Grooming 執行狀態。



\---



\## 7.5 Boarding



Service：



> 定義提供什麼住宿服務。



Boarding：



> 管理實際住宿生命週期。



```text

Service

住宿服務

&#x20;   ↓

Appointment

&#x20;   ↓

Boarding

入住

→ 住宿中

→ 退房

```



Service 不管理入住與退房。



\---



\## 7.6 Order



Order：



> 客戶這次買了什麼。



Service 可以成為 Order Item 的來源。



因此：



```text

Appointment

&#x20;   ↓

Service

&#x20;   ↓

Order Item

```



以及：



```text

Walk-in

&#x20;   ↓

Service

&#x20;   ↓

Order Item

```



均可成立。



Order 不強制依賴 Appointment。



\---



\## 7.7 Payment



Payment：



> 客戶怎麼付款、付了多少。



Service 不負責 Payment。



Service 只提供基本價格。



\---



\# 8. Service Type



MVP 第一版 Service Type 固定為：



```text

GROOMING

BOARDING

```



不得在 MVP 第一版自行增加其他 Service Type。



如未來需要其他服務類型，應透過版本變更或 Change Request 處理。



\---



\# 9. Pet Type Applicability



Service 可以指定適用的 Pet Type：



```text

DOG

CAT

BOTH

```



例如：



```text

狗狗洗澡

→ DOG



貓咪洗澡

→ CAT



犬貓基礎清潔

→ BOTH

```



Service 的 Pet Type 可以修改。



修改後：



> 新建立的業務資料依新設定處理。



歷史資料不得因 Master Data 修改而被任意改寫。



\---



\# 10. Service Data Definition



第一版 Service 核心資料如下：



| 欄位 | Required | 說明 |

|---|---:|---|

| Service ID | Yes | Service 唯一識別 |

| Name | Yes | 服務名稱 |

| Type | Yes | GROOMING / BOARDING |

| Pet Type | Yes | DOG / CAT / BOTH |

| Description | No | 服務簡短說明 |

| Price | Yes | 基本服務價格 |

| Duration | Yes | 基本預估服務時間 |

| Display Order | Yes | 顯示排序 |

| Status | Yes | ACTIVE / INACTIVE |

| Created At | Yes | 建立時間 |

| Updated At | Yes | 更新時間 |



\---



\# 11. Service ID



Service 必須具有唯一 Service ID。



Service ID 為系統識別依據。



Service Name：



> 不要求全系統唯一。



不得使用 Service Name 作為資料唯一識別。



\---



\# 12. Service Name



Service Name：



\- Required

\- 一般文字

\- 不要求全系統唯一



例如：



```text

基礎美容

全套美容

洗澡

住宿

```



Service Name 不應承擔 Service Code 的功能。



\---



\# 13. Service Code



MVP 第一版：



> \*\*不建立 Service Code。\*\*



不要求：



```text

GR001

GR002

BD001

```



等額外編碼。



未來如確實需要，可透過 Change Request 或新版本增加。



\---



\# 14. Description



Description：



> Optional。



用途：



> 提供店家簡短說明服務內容。



第一版使用一般短文字。



不建立：



\- Rich Text Editor

\- HTML Content

\- 圖文內容系統

\- 複雜內容管理



\---



\# 15. Price



Service 必須保存：



> \*\*Basic Service Price\*\*



Price：



\- Required

\- 可以為 0

\- 不允許負數



例如：



```text

Price = 0

```



可以表示免費服務。



\---



\# 16. Price Responsibility



Service Price：



> 代表基本服務價格。



Service 不負責：



\- 折扣

\- 優惠券

\- 會員價格

\- 特殊加價

\- 動態定價

\- 最終付款金額



因此：



```text

Service

&#x20;   ↓

Basic Price



Order

&#x20;   ↓

Actual Transaction Price

```



\---



\# 17. Price 與 Appointment



Appointment 建立時：



> 取得當時 Service Price 作為該次預約的基本價格。



Service 未來調價：



```text

舊 Service Price

1000



新 Service Price

1200

```



不得因此直接改寫已建立的歷史 Appointment 業務資料。



\---



\# 18. Price 與 Order



Order 保存：



> 本次實際交易價格。



因此 Service 與 Order 的責任不同：



```text

Service

→ 提供基本價格



Order

→ 保存本次實際交易價格

```



未來即使加入特殊價格，也不應直接修改 Service Master Data 的責任。



\---



\# 19. Duration



Service 保存：



> 基本預估服務時間。



Duration 用於提供營運上的基本服務時間資訊。



MVP 第一版不建立：



\- 複雜排程引擎

\- 動態服務時間

\- 依人員計算時間

\- 依容量計算時間

\- 自動排程最佳化



\---



\# 20. Boarding Duration



Boarding Service 可以保存基本 Duration。



但實際住宿期間由：



> Appointment / Boarding



負責。



因此：



```text

Service

→ 基本服務時間資訊



Boarding

→ 實際入住

→ 住宿中

→ 退房

```



Service 不管理實際住宿生命週期。



\---



\# 21. Display Order



Service 支援簡單：



> Display Order



例如：



```text

1\. 洗澡

2\. 基礎美容

3\. 全套美容

```



用途：



> 控制 Service 在 UI 中的基本顯示順序。



不建立複雜分類排序系統。



\---



\# 22. Service Category



MVP 第一版：



> \*\*不建立 Service Category Master。\*\*



目前 Service Type：



```text

GROOMING

BOARDING

```



已足以支援第一版需求。



不得因 UI 分類需求自行增加 Category Business Block。



\---



\# 23. Service Status



Service Status 只有：



```text

ACTIVE

INACTIVE

```



\---



\# 24. Default Status



新建立 Service：



```text

Status = ACTIVE

```



\---



\# 25. Service Activation



ACTIVE Service：



> 可以提供給新的業務流程使用。



例如：



\- 新 Appointment 選擇

\- 新 Order Item 選擇



\---



\# 26. Service Deactivation



INACTIVE Service：



> 代表店家目前不再提供新的服務。



停用後：



> 不可以建立新的 Appointment 使用該 Service。



但：



> 不影響已存在的 Appointment。



\---



\# 27. Hard Delete



MVP 第一版：



> \*\*不提供一般 Hard Delete。\*\*



Service 停用使用：



```text

Status = INACTIVE

```



資料保留。



\---



\# 28. Historical Data



Service 被停用後：



> 歷史 Appointment 仍必須能查看該 Service。



例如：



```text

2026-08-01

Appointment

Service = 全套美容

Status = INACTIVE

```



仍應正常顯示：



> 全套美容



不能因 Service 現在為 INACTIVE 而破壞歷史資料可讀性。



\---



\# 29. Service Search



Service List 支援基本 Search / Filter：



\- Name

\- Type

\- Status



不建立：



\- 全欄位全文搜尋

\- 複雜搜尋語法

\- Advanced Search Engine



\---



\# 30. Service List



Service List 預設：



> 顯示 ACTIVE Service。



使用者可以：



> 切換查看 INACTIVE Service。



\---



\# 31. Pagination



Service List：



> 支援基本 Pagination。



不建立複雜 Server-side Data Grid。



\---



\# 32. Service UI



第一版至少提供：



```text

Service List

Service Form

Service Detail

```



\---



\# 33. Service UI Operations



主要操作：



```text

新增

→ 搜尋

→ 查看

→ 編輯

→ 停用

```



\---



\# 34. Create / Edit Form



Create 與 Edit：



> 使用同一套 Form 概念。



例如：



```text

Service Form

├── Create

└── Edit

```



依操作模式控制：



\- 初始值

\- 可編輯欄位

\- Submit Action



不建立兩套完全獨立的 Service Form。



\---



\# 35. Service Detail



Service Detail 至少應能查看：



\- Service Name

\- Service Type

\- Pet Type

\- Description

\- Basic Price

\- Duration

\- Display Order

\- Status

\- Created At

\- Updated At



\---



\# 36. Service Deactivation UI



停用 Service：



> 必須使用明確操作。



建議流程：



```text

Service Detail

&#x20;   ↓

停用

&#x20;   ↓

確認

&#x20;   ↓

Status = INACTIVE

```



避免使用者誤停用。



\---



\# 37. Service API



第一版 REST API：



```text

GET    /api/services

GET    /api/services/:id

POST   /api/services

PATCH  /api/services/:id

```



\---



\# 38. Service List API



```text

GET /api/services

```



用途：



> 取得 Service List。



至少支援：



\- Name Search

\- Type Filter

\- Status Filter

\- Pagination



\---



\# 39. Service Detail API



```text

GET /api/services/:id

```



用途：



> 取得單一 Service 詳細資料。



\---



\# 40. Service Create API



```text

POST /api/services

```



用途：



> 建立新的 Service。



建立時至少驗證：



\- Name

\- Type

\- Pet Type

\- Price

\- Duration

\- Display Order

\- Status



並套用 Business Rules。



\---



\# 41. Service Update API



```text

PATCH /api/services/:id

```



用途：



> 修改 Service。



可用於：



\- 修改 Name

\- 修改 Type

\- 修改 Pet Type

\- 修改 Description

\- 修改 Price

\- 修改 Duration

\- 修改 Display Order

\- 修改 Status



\---



\# 42. Service Deactivation API



不建立：



```text

DELETE /api/services/:id

```



也不建立必要的：



```text

POST /api/services/:id/deactivate

```



第一版使用：



```text

PATCH /api/services/:id

```



修改：



```text

status = INACTIVE

```



\---



\# 43. Backend Architecture



Service Backend 遵循：



```text

Controller

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



\# 44. Controller Responsibility



Controller 負責：



\- 接收 HTTP Request

\- 取得 Request Parameters

\- 呼叫 Business Logic

\- 回傳 HTTP Response

\- 基本 Request / Response Mapping



Controller：



> 不承擔大量 Business Logic。



\---



\# 45. Business Logic Responsibility



Business Logic 負責：



\- Service 建立規則

\- Service 更新規則

\- Service Status 規則

\- Price Validation

\- Type Validation

\- Pet Type Validation

\- INACTIVE Service 行為

\- 與既有業務資料的邊界處理



\---



\# 46. Data Access Responsibility



Data Access 負責：



\- SQL

\- INSERT

\- SELECT

\- UPDATE

\- Filtering

\- Pagination

\- Database Access



Data Access：



> 不承擔主要 Business Rules。



\---



\# 47. ORM Policy



Service Block：



> 不使用 ORM。



Database Access：



> 使用 mysql2。



\---



\# 48. Validation Architecture



Service Validation 採：



```text

Frontend Validation

&#x20;       ↓

Backend Validation

&#x20;       ↓

Business Rule

&#x20;       ↓

Database Constraint

```



任何一層都不能被視為唯一安全防線。



\---



\# 49. Price Validation



Price：



```text

Price >= 0

```



允許：



```text

0

```



不允許：



```text

Price < 0

```



\---



\# 50. Status Validation



Status 僅允許：



```text

ACTIVE

INACTIVE

```



不得寫入任意自由文字。



\---



\# 51. Type Validation



Type 僅允許：



```text

GROOMING

BOARDING

```



\---



\# 52. Pet Type Validation



Pet Type 僅允許：



```text

DOG

CAT

BOTH

```



\---



\# 53. Service Business Rules



第一版 Service Business Rules：



1\. Service 必須有 Service ID。

2\. Name 必填。

3\. Type 必須為 GROOMING 或 BOARDING。

4\. Pet Type 必須為 DOG、CAT 或 BOTH。

5\. Description 選填。

6\. Price 必填。

7\. Price 可以為 0。

8\. Price 不得為負數。

9\. Duration 必須存在。

10\. Status 必須為 ACTIVE 或 INACTIVE。

11\. 新建立 Service 預設 ACTIVE。

12\. Service Name 不要求全系統唯一。

13\. Service 不建立 Service Code。

14\. Service 不建立 Category。

15\. Service 不提供一般 Hard Delete。

16\. INACTIVE Service 不可供新的 Appointment 選擇。

17\. 既有 Appointment 不因 Service 停用而失效。

18\. 歷史資料仍可查看已停用 Service。

19\. Service 不負責最終交易價格。

20\. Service 不負責 Grooming 實際執行。

21\. Service 不負責 Boarding 實際生命週期。

22\. Service 不負責 Payment。

23\. MVP 不建立複雜容量排程。



\---



\# 54. Testing Strategy



Service Block 至少包含：



```text

Unit Test

\+

API Integration Test

\+

Browser Verification

```



\---



\# 55. Unit Test



Unit Test 至少驗證：



\- Service 建立

\- Service 更新

\- Price Validation

\- Status Validation

\- Type Validation

\- Pet Type Validation

\- INACTIVE Service 規則

\- 基本 Business Rules



Testing Framework：



> Jest



\---



\# 56. API Integration Test



使用：



> Jest + Supertest



至少驗證：



```text

GET /api/services

GET /api/services/:id

POST /api/services

PATCH /api/services/:id

```



並驗證：



\- HTTP Status

\- Request Validation

\- Response Structure

\- Business Rule

\- Database Result

\- Error Handling



\---



\# 57. Browser Verification



Browser 必須實際驗證：



```text

Service List

&#x20;   ↓

新增 Service

&#x20;   ↓

建立成功

&#x20;   ↓

搜尋

&#x20;   ↓

查看 Detail

&#x20;   ↓

編輯

&#x20;   ↓

停用

&#x20;   ↓

確認 INACTIVE

&#x20;   ↓

Default List 行為正確

```



\---



\# 58. Service Browser Happy Path



完整 Happy Path：



```text

Service List

&#x20;     ↓

新增 Service

&#x20;     ↓

輸入 Service Data

&#x20;     ↓

Submit

&#x20;     ↓

建立成功

&#x20;     ↓

回到 Service List

&#x20;     ↓

搜尋 Service

&#x20;     ↓

開啟 Detail

&#x20;     ↓

編輯 Service

&#x20;     ↓

儲存

&#x20;     ↓

停用 Service

&#x20;     ↓

確認

&#x20;     ↓

Status = INACTIVE

&#x20;     ↓

Default List 不再顯示

&#x20;     ↓

切換查看 INACTIVE

&#x20;     ↓

Service 仍可查看

```



\---



\# 59. Historical Verification



必須驗證：



```text

Service ACTIVE

&#x20;   ↓

建立相關 Appointment

&#x20;   ↓

Service INACTIVE

&#x20;   ↓

原 Appointment 仍存在

&#x20;   ↓

原 Appointment 仍可查看 Service

```



不得因 Service 停用而破壞歷史資料。



\---



\# 60. Service Block PASS Criteria



Service Block 必須完整通過：



```text

Database

&#x20;   ↓

Backend

&#x20;   ↓

API Test

&#x20;   ↓

Frontend

&#x20;   ↓

Browser Verification

&#x20;   ↓

Service Block PASS

```



所有必要層級均通過後，才可視為：



> \*\*Service Block PASS\*\*



\---



\# 61. Definition of Done



PHASE 15 Service Block 的實作完成條件：



\- Service Database 結構完成

\- Service Data Access 完成

\- Service Business Logic 完成

\- Service API 完成

\- Service Validation 完成

\- Service UI 完成

\- Service Unit Test 完成

\- Service API Integration Test 完成

\- Browser Verification 完成

\- ACTIVE / INACTIVE 行為正確

\- Price Rule 正確

\- Service Type 正確

\- Pet Type Rule 正確

\- Historical Service Reference 正確

\- Service Block Happy Path 通過



\---



\# 62. MVP Explicitly Excluded



PHASE 15 不包含：



\- Service Code

\- Service Category Master

\- Dynamic Pricing

\- Member Pricing

\- Discount Engine

\- Coupon

\- Promotion Engine

\- Complex Duration Engine

\- Capacity Planning

\- Scheduling Engine

\- Automatic Dispatch

\- Inventory

\- Supplier

\- Purchasing

\- Accounting

\- Payment Gateway

\- Advanced Analytics



這些不屬於 PHASE 15 MVP v1.0。



\---



\# 63. Decision Summary



PHASE 15 Q1–Q40 全部採用 AI 推薦方案。



核心決策如下：



```text

Service

=

店家提供什麼服務

```



```text

Service Type

=

GROOMING / BOARDING

```



```text

Pet Type

=

DOG / CAT / BOTH

```



```text

Price

=

Basic Service Price

```



```text

Duration

=

Basic Estimated Duration

```



```text

Status

=

ACTIVE / INACTIVE

```



```text

Delete

=

不提供一般 Hard Delete

```



```text

API

=

GET List

GET Detail

POST

PATCH

```



```text

Testing

=

Unit

\+

API Integration

\+

Browser Verification

```



\---



\# 64. Freeze Statement



本文件代表：



> \*\*PHASE 15 — Service 服務管理區塊定義與實作規格 v1.0 正式 FREEZE。\*\*



Freeze 範圍包含：



\- Service Responsibility

\- Service Boundary

\- Service Data

\- Service Type

\- Pet Type

\- Price

\- Duration

\- Status

\- Display Order

\- Service Relationship

\- Service UI

\- Service API

\- Backend Responsibility

\- Validation

\- Testing

\- Browser Verification

\- PASS Criteria

\- MVP Exclusion



後續實作必須以本文件為基準。



若實作過程發現：



\- Bug

\- 原決策矛盾

\- 技術實作限制



可依 Change Request 規則提出。



若只是：



> 「另一種設計比較漂亮」



不得因此推翻本 Freeze。



\---



\# 65. Next Phase Boundary



PHASE 15 完成後：



```text

PHASE 1

FREEZE

&#x20;   ↓

...

&#x20;   ↓

PHASE 13

Customer

FREEZE

&#x20;   ↓

PHASE 14

Pet

FREEZE

&#x20;   ↓

PHASE 15

Service

FREEZE

```



Service Block 正式進入後續實作建置階段。



下一個 Phase 必須承接本文件，不得重新設計已 Freeze 的 Service Responsibility。



\# END OF DOCUMENT

