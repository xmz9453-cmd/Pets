\# PHASE 16 — Appointment 預約管理區塊定義與實作規格



\## Document Information



| 項目 | 內容 |

|---|---|

| Phase | PHASE 16 |

| Module | Appointment |

| 中文名稱 | 預約管理 |

| 英文名稱 | Appointment Management |

| Document Type | Business Block Definition and Implementation Specification |

| Version | v1.0 |

| Status | \*\*FREEZE\*\* |

| Decision Range | Q1–Q40 |

| Freeze Date | 2026-08-16 |

| Filename | `PHASE-16-預約管理區塊定義與實作規格-Appointment-Management-Block-Definition-and-Implementation-Specification-v1.0.md` |



\---



\# 1. Document Purpose



本文件定義 MVP 第一版的：



> \*\*Appointment — 預約管理 Business Block\*\*



本文件將 PHASE 16 Q1～Q40 的正式決策整理為可供後續工程實作使用的規格。



Appointment 的核心責任為：



> \*\*記錄客戶預約了哪一隻 Pet、什麼 Service、什麼日期與時間。\*\*



Appointment 是預約事件，不負責實際美容執行、實際住宿生命週期、訂單交易或付款。



\---



\# 2. Phase Status



PHASE 16 已完成：



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



PHASE 16

→ FREEZE

```



本文件發布後：



> \*\*PHASE 16 Appointment Block 正式 Freeze。\*\*



後續不得因單純設計偏好而自行推翻本文件。



如需修改，必須依 Change Request 規則處理。



\---



\# 3. Project Baseline



本 Phase 必須承接既有 Phase Freeze：



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

```



本 Phase 不重新設計前面已 Freeze 的 Business Responsibility、MVP Scope 或 Technical Architecture。



\---



\# 4. Technical Baseline



PHASE 16 必須遵守既有技術架構。



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



\# 5. Appointment Responsibility



Appointment 的核心責任：



> \*\*客戶預約了什麼、什麼時間來。\*\*



Appointment 負責：



\- Customer 關聯

\- Pet 關聯

\- Appointment Date

\- Appointment Start Time

\- Appointment Items

\- Service Snapshot

\- Service Price Snapshot

\- Appointment Status

\- 基本預約時間衝突檢查

\- Created At

\- Updated At



\---



\# 6. Appointment Boundary



Appointment 不負責：



\- Customer Master Data

\- Pet Master Data

\- Service Master Data

\- Grooming 實際執行

\- Boarding 實際入住

\- Boarding 實際退房

\- Order

\- Payment

\- 複雜排班

\- 複雜容量管理

\- 自動派工

\- 完整 Audit Log

\- LINE API

\- 線上自助預約平台



\---



\# 7. Appointment 與 Customer



Customer：



> 誰是客戶。



Appointment：



> 這位客戶預約了什麼。



Appointment 必須保存：



```text

Customer ID

```



不透過 Pet 反查 Customer 作為唯一來源。



概念關係：



```text

Customer

&#x20;   ↓

Appointment

```



\---



\# 8. Appointment 與 Pet



Pet：



> 哪一隻寵物。



Appointment 必須保存：



```text

Pet ID

```



正式 Appointment：



> 不允許沒有 Pet。



因此：



```text

Customer

&#x20;   ↓

Pet

&#x20;   ↓

Appointment

```



一個 Customer 可以有多隻 Pet。



\---



\# 9. Appointment 與 Service



Service：



> 店家提供什麼服務。



Appointment：



> 客戶預約了什麼服務。



兩者不是同一個 Business Block。



```text

Service

&#x20;   ↓

Appointment Item

```



新的 Appointment：



> 只能選擇 ACTIVE Service。



INACTIVE Service：



> 不可建立新的 Appointment。



但既有 Appointment：



> 不受 Service 停用影響。



\---



\# 10. Appointment 與 Grooming



Appointment：



> 預約事件。



Grooming：



> 實際美容執行。



因此：



```text

Appointment

&#x20;   ↓

Grooming

```



只是業務上的關聯。



Appointment 不管理：



\- 洗澡

\- 吹毛

\- 剪毛

\- 拍照

\- 美容執行狀態



這些屬於 Grooming Block。



\---



\# 11. Appointment 與 Boarding



Appointment：



> 住宿預約。



Boarding：



> 實際住宿生命週期。



```text

Appointment

&#x20;   ↓

Boarding

&#x20;   ↓

入住

&#x20;   ↓

住宿中

&#x20;   ↓

退房

```



Appointment 不管理實際入住與退房。



\---



\# 12. Appointment 與 Order



Order：



> 客戶這次買了什麼。



Appointment 可以產生 Order 的服務來源。



例如：



```text

Appointment

&#x20;   ↓

Service

&#x20;   ↓

Order Item

```



但：



> Order 不強制依賴 Appointment。



Walk-in 也可以直接形成 Service Order。



\---



\# 13. Appointment Status



MVP 第一版 Appointment Status 固定為：



```text

PENDING

CONFIRMED

CANCELLED

COMPLETED

```



不將以下狀態放入 Appointment：



```text

ARRIVED

IN\_SERVICE

```



因為這些屬於 Daily Operations / Grooming 等其他 Block 的責任。



\---



\# 14. Default Appointment Status



新建立 Appointment：



```text

Status = PENDING

```



業務概念：



```text

建立預約

&#x20;   ↓

PENDING

&#x20;   ↓

店家確認

&#x20;   ↓

CONFIRMED

```



\---



\# 15. Appointment Status Lifecycle



基本生命週期：



```text

PENDING

&#x20;   ↓

CONFIRMED

&#x20;   ↓

COMPLETED

```



取消：



```text

PENDING

&#x20;   ↓

CANCELLED

```



或：



```text

CONFIRMED

&#x20;   ↓

CANCELLED

```



CANCELLED：



> 為終止狀態。



COMPLETED：



> 為完成狀態。



\---



\# 16. Status Transition Rules



\## PENDING



可以：



\- 修改

\- 確認

\- 取消



不可以直接：



```text

PENDING

→ COMPLETED

```



\---



\## CONFIRMED



可以：



\- 修改

\- 取消

\- 進入後續營運流程



\---



\## CANCELLED



為終止狀態。



不恢復：



```text

CANCELLED

→ CONFIRMED

```



如果客戶重新預約：



> 建立新的 Appointment。



\---



\## COMPLETED



為完成狀態。



不得再作為正常進行中的預約修改。



\---



\# 17. Appointment Cancellation



取消 Appointment：



> 不進行 Hard Delete。



改為：



```text

Status = CANCELLED

```



保留原始資料。



因此：



```text

Appointment

&#x20;   ↓

CANCELLED

```



仍可供歷史資料查看。



\---



\# 18. Appointment Modification



Appointment 可以修改。



在尚未完成／取消前，可以修改：



\- Appointment Date

\- Appointment Start Time

\- Pet

\- Service Items



修改目的：



> 支援實際營運中的改期、改時間、換 Pet、增加／移除服務。



\---



\# 19. COMPLETED Modification Rule



Appointment 已：



```text

COMPLETED

```



後：



> 不允許修改核心預約資料。



核心資料包括：



\- Pet

\- Service Items

\- Appointment Date

\- Appointment Start Time



避免破壞歷史預約紀錄。



\---



\# 20. CANCELLED Modification Rule



Appointment 已：



```text

CANCELLED

```



後：



> 不恢復成正常進行中的 Appointment。



若需要新的預約：



> 建立新的 Appointment。



\---



\# 21. Appointment Multiple Services



一筆 Appointment：



> 可以包含多個 Service。



例如：



```text

Appointment

2026-08-20 14:00

Pet = Momo



&#x20;   ├── 洗澡

&#x20;   ├── 剪毛

&#x20;   └── 指甲修剪

```



不應將同一次預約強制拆成多筆 Appointment。



\---



\# 22. Appointment Items



多 Service Appointment 採：



```text

Appointment

&#x20;   ↓

Appointment Items

&#x20;   ↓

Service

```



每一個 Appointment Item 代表：



> 該次 Appointment 中的一個服務。



\---



\# 23. Appointment Item Responsibility



Appointment Item 負責保存該次預約所選 Service 的必要歷史資料。



至少包含概念：



```text

Service ID

Service Name Snapshot

Service Price Snapshot

```



\---



\# 24. Service Name Snapshot



Appointment Item：



> 必須保存建立／選擇當下的 Service Name Snapshot。



原因：



Service Master Data 未來可能修改名稱。



例如：



```text

原名稱：

全套美容



後來修改：

豪華全套美容

```



歷史 Appointment 不應被 Master Data 修改任意改寫。



\---



\# 25. Service Price Snapshot



Appointment Item：



> 必須保存建立／選擇當下的 Service Price Snapshot。



例如：



```text

建立 Appointment 時：



Service Price = 1000

```



之後 Service：



```text

1000 → 1200

```



舊 Appointment：



> 仍保留 1000 的預約價格 Snapshot。



\---



\# 26. Appointment Price Responsibility



Service：



> 提供基本服務價格。



Appointment Item：



> 保存該次預約的 Service Price Snapshot。



Order：



> 保存實際交易價格。



Payment：



> 保存付款資料。



因此：



```text

Service

&#x20;   ↓

Basic Price



Appointment Item

&#x20;   ↓

Appointment Price Snapshot



Order

&#x20;   ↓

Actual Transaction Price



Payment

&#x20;   ↓

Payment Amount

```



\---



\# 27. Service Price on Appointment Creation



建立 Appointment 時：



> 取得當時 ACTIVE Service 的基本價格。



不得單純在日後重新讀取最新 Service Price 取代歷史價格。



\---



\# 28. Service Modification in Appointment



若使用者修改 Appointment Service Item：



```text

原 Service

&#x20;   ↓

移除 / 替換

&#x20;   ↓

新 Service

```



新 Service：



> 必須重新取得當時 ACTIVE Service 的基本價格。



並建立新的：



```text

Service Name Snapshot

Service Price Snapshot

```



\---



\# 29. Appointment Date



Appointment 必須保存：



> Appointment Date。



代表：



> 預約發生的日期。



\---



\# 30. Appointment Start Time



Appointment 必須保存：



> Appointment Start Time。



代表：



> 客戶預約的開始時間。



\---



\# 31. Appointment End Time



MVP 第一版：



> 不要求使用者人工輸入 End Time。



基本預估 End Time：



```text

Start Time

\+

Estimated Duration

=

Estimated End Time

```



End Time 為：



> 預估資訊，而非複雜排程引擎的結果。



\---



\# 32. Duration Calculation



每個 Service 有基本 Duration。



若一筆 Appointment 有多個 Service：



> 基本預估 Duration 使用各 Service Duration 的總和。



例如：



```text

洗澡

60 分鐘



剪毛

60 分鐘



總預估

120 分鐘

```



\---



\# 33. Duration Boundary



Duration 不代表：



> 系統已經建立完整排程。



MVP 第一版不建立：



\- Groomer 排班引擎

\- Room Capacity

\- Resource Scheduling

\- Dynamic Scheduling

\- Automatic Dispatch



\---



\# 34. Appointment Conflict Check



MVP 提供：



> 基本 Appointment Time Conflict Validation。



目的：



> 避免明顯的時間重疊。



但不建立完整排程系統。



\---



\# 35. Conflict Time Range



基本衝突判斷：



```text

Appointment Start Time

\+

Estimated Duration

=

Estimated Time Range

```



以此作為基本衝突檢查依據。



\---



\# 36. Conflict Status



基本時間衝突檢查主要針對：



```text

PENDING

CONFIRMED

```



不計入：



```text

CANCELLED

COMPLETED

```



因此：



```text

CANCELLED

→ 不佔用預約時間



COMPLETED

→ 不阻擋新預約

```



\---



\# 37. Conflict Scope



MVP 只做：



> 基本時間區間衝突檢查。



不建立：



\- Groomer Capacity

\- Room Capacity

\- Service Capacity

\- Pet Type Capacity

\- Staff Shift Engine

\- Automatic Scheduling

\- Optimization Algorithm



\---



\# 38. Appointment Created At



Appointment 必須保存：



```text

Created At

```



用途：



> 記錄 Appointment 建立時間。



\---



\# 39. Appointment Updated At



Appointment 必須保存：



```text

Updated At

```



用途：



> 記錄 Appointment 最近一次修改時間。



\---



\# 40. Audit Log Boundary



MVP 第一版：



> 不建立完整 Audit Log。



Created At / Updated At 足以支援第一版基本資料管理。



未來若需要完整：



\- 修改人

\- 修改前值

\- 修改後值

\- 修改原因

\- 完整歷史紀錄



應透過新版本或 Change Request 處理。



\---



\# 41. Appointment Data Definition



第一版 Appointment 核心資料：



| 欄位 | Required | 說明 |

|---|---:|---|

| Appointment ID | Yes | Appointment 唯一識別 |

| Customer ID | Yes | 預約客戶 |

| Pet ID | Yes | 預約寵物 |

| Appointment Date | Yes | 預約日期 |

| Start Time | Yes | 預約開始時間 |

| Status | Yes | PENDING / CONFIRMED / CANCELLED / COMPLETED |

| Created At | Yes | 建立時間 |

| Updated At | Yes | 修改時間 |



Appointment Items：



| 欄位 | Required | 說明 |

|---|---:|---|

| Appointment Item ID | Yes | Item 唯一識別 |

| Appointment ID | Yes | 所屬 Appointment |

| Service ID | Yes | 原始 Service |

| Service Name Snapshot | Yes | 當時服務名稱 |

| Service Price Snapshot | Yes | 當時服務價格 |



\---



\# 42. Appointment Create Rules



建立 Appointment 必須：



1\. Customer 存在。

2\. Pet 存在。

3\. Pet 必須具有有效關聯。

4\. 至少有一個 Service Item。

5\. Service 必須存在。

6\. Service 必須為 ACTIVE。

7\. Appointment Date 必填。

8\. Appointment Start Time 必填。

9\. Status 預設 PENDING。

10\. 取得 Service Name Snapshot。

11\. 取得 Service Price Snapshot。

12\. 執行基本時間衝突檢查。



\---



\# 43. Appointment Edit Rules



在：



```text

PENDING

CONFIRMED

```



狀態下，可以進行符合 Business Rules 的修改。



可修改：



\- Date

\- Start Time

\- Pet

\- Service Items



修改 Service Item 時：



> 重新取得新的 ACTIVE Service 資訊。



\---



\# 44. Appointment Status Update Rules



Status 修改必須經過 Business Logic。



不允許前端直接繞過規則修改任意狀態。



例如：



```text

PENDING

→ CONFIRMED

```



合法。



```text

PENDING

→ COMPLETED

```



不合法。



```text

CANCELLED

→ CONFIRMED

```



不合法。



\---



\# 45. Appointment Search



Appointment List 支援：



\- Date

\- Status

\- Customer

\- Pet



\---



\# 46. Appointment Default List



Appointment List 預設：



> 顯示近期 PENDING / CONFIRMED Appointment。



目的：



> 讓櫃台快速查看即將到來的預約。



歷史資料仍可透過 Filter / Search 查詢。



\---



\# 47. Appointment Calendar View



MVP 第一版提供：



> 基本 Calendar View。



Calendar 用於：



> 查看 Appointment Date / Time。



不提供：



\- Drag \& Drop 排程

\- Resource Calendar

\- Groomer Capacity

\- Room Capacity

\- 自動排程



\---



\# 48. Appointment UI



第一版至少提供：



```text

Appointment List

Appointment Form

Appointment Detail

Calendar View

```



Calendar View：



> 為 Appointment 的另一種操作／檢視方式，不形成新的 Business Block。



\---



\# 49. Appointment List



List 至少顯示：



\- Appointment Date

\- Start Time

\- Customer

\- Pet

\- Service

\- Status



多 Service 時：



> 應能清楚表示該 Appointment 包含多個 Service。



\---



\# 50. Appointment Form



Create / Edit：



> 使用同一套 Form 概念。



例如：



```text

Appointment Form

├── Create

└── Edit

```



Create / Edit 可依狀態控制：



\- 欄位

\- 初始值

\- 操作按鈕

\- 可修改範圍



\---



\# 51. Appointment Detail



Appointment Detail 至少可以查看：



\- Customer

\- Pet

\- Appointment Date

\- Start Time

\- Estimated Duration

\- Service Items

\- Service Name Snapshot

\- Service Price Snapshot

\- Status

\- Created At

\- Updated At



\---



\# 52. Appointment Create Flow



基本操作：



```text

Appointment List

&#x20;   ↓

新增 Appointment

&#x20;   ↓

選擇 Customer

&#x20;   ↓

選擇 Pet

&#x20;   ↓

選擇 Service

&#x20;   ↓

選擇 Date

&#x20;   ↓

選擇 Start Time

&#x20;   ↓

執行 Validation

&#x20;   ↓

建立 Appointment

&#x20;   ↓

Status = PENDING

```



\---



\# 53. Appointment Edit Flow



```text

Appointment Detail

&#x20;   ↓

編輯

&#x20;   ↓

修改 Date / Time / Pet / Service Items

&#x20;   ↓

Validation

&#x20;   ↓

Conflict Check

&#x20;   ↓

取得新的 Service Snapshot

&#x20;   ↓

儲存

&#x20;   ↓

Updated At 更新

```



\---



\# 54. Appointment Cancel Flow



```text

Appointment Detail

&#x20;   ↓

取消

&#x20;   ↓

確認

&#x20;   ↓

Business Rule Validation

&#x20;   ↓

Status = CANCELLED

&#x20;   ↓

Updated At 更新

```



不刪除資料。



\---



\# 55. Appointment Confirm Flow



```text

PENDING

&#x20;   ↓

確認預約

&#x20;   ↓

Business Rule Validation

&#x20;   ↓

Status = CONFIRMED

```



不建立獨立 Confirm Endpoint。



使用：



```text

PATCH /api/appointments/:id

```



\---



\# 56. Appointment API



第一版 REST API：



```text

GET    /api/appointments

GET    /api/appointments/:id

POST   /api/appointments

PATCH  /api/appointments/:id

```



\---



\# 57. Appointment List API



```text

GET /api/appointments

```



至少支援：



\- Date Filter

\- Status Filter

\- Customer Filter

\- Pet Filter

\- Pagination



\---



\# 58. Appointment Detail API



```text

GET /api/appointments/:id

```



用途：



> 取得單一 Appointment 與其 Appointment Items。



\---



\# 59. Appointment Create API



```text

POST /api/appointments

```



用途：



> 建立 Appointment。



建立時必須套用：



\- Customer Validation

\- Pet Validation

\- Service Validation

\- Status Rule

\- Service Snapshot Rule

\- Price Snapshot Rule

\- Time Conflict Rule



\---



\# 60. Appointment Update API



```text

PATCH /api/appointments/:id

```



用途：



> 修改 Appointment。



可依 Business Rules 修改：



\- Date

\- Start Time

\- Pet

\- Service Items

\- Status



不代表所有欄位在所有 Status 下都可修改。



\---



\# 61. Appointment Cancel API Boundary



不建立：



```text

DELETE /api/appointments/:id

```



也不建立必要的：



```text

POST /api/appointments/:id/cancel

```



取消使用：



```text

PATCH /api/appointments/:id

```



修改：



```text

status = CANCELLED

```



\---



\# 62. Appointment Confirm API Boundary



不建立：



```text

POST /api/appointments/:id/confirm

```



使用：



```text

PATCH /api/appointments/:id

```



修改：



```text

status = CONFIRMED

```



Business Logic 負責驗證 Status Transition。



\---



\# 63. Backend Architecture



Appointment Backend：



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



\# 64. Controller Responsibility



Controller 負責：



\- HTTP Request

\- Parameters

\- Request Mapping

\- 呼叫 Business Logic

\- Response Mapping

\- HTTP Status



Controller：



> 不承擔主要 Appointment Business Rules。



\---



\# 65. Business Logic Responsibility



Business Logic 負責：



\- Appointment Create

\- Appointment Update

\- Status Transition

\- Cancellation

\- Confirmation

\- Service Validation

\- Pet Validation

\- Customer Validation

\- Service Snapshot

\- Price Snapshot

\- Duration Calculation

\- Time Conflict Check



\---



\# 66. Data Access Responsibility



Data Access 負責：



\- SQL

\- Appointment SELECT

\- Appointment INSERT

\- Appointment UPDATE

\- Appointment Item INSERT

\- Appointment Item UPDATE

\- Filter

\- Pagination

\- Database Access



Data Access：



> 不承擔主要 Business Rules。



\---



\# 67. ORM Policy



Appointment Block：



> 不使用 ORM。



Database Access：



> 使用 mysql2。



\---



\# 68. Validation Architecture



Appointment Validation：



```text

Frontend Validation

&#x20;       ↓

Backend Validation

&#x20;       ↓

Business Rule

&#x20;       ↓

Database Constraint

```



不能只依賴 Frontend Validation。



\---



\# 69. Appointment Validation



至少驗證：



\- Customer 存在

\- Pet 存在

\- Pet 可用

\- 至少一個 Service Item

\- Service 存在

\- Service 為 ACTIVE

\- Date 必填

\- Start Time 必填

\- Status 合法

\- Price Snapshot 正確

\- Service Name Snapshot 正確

\- Time Conflict 合法



\---



\# 70. Database Constraint



Database 應提供必要 Constraint，例如：



\- Primary Key

\- Foreign Key

\- NOT NULL

\- ENUM / CHECK 等適當限制

\- 必要 Index

\- Appointment Item 關聯完整性



但：



> Database Constraint 不取代 Business Logic。



\---



\# 71. Testing Strategy



Appointment Block 至少包含：



```text

Unit Test

\+

API Integration Test

\+

Browser Verification

```



\---



\# 72. Unit Test



Unit Test 至少驗證：



\- Create Appointment

\- Update Appointment

\- Status Transition

\- Cancel Rule

\- Confirm Rule

\- Service Validation

\- Pet Validation

\- Price Snapshot

\- Service Name Snapshot

\- Duration Calculation

\- Conflict Detection



Testing Framework：



> Jest



\---



\# 73. API Integration Test



使用：



> Jest + Supertest



至少驗證：



```text

GET /api/appointments

GET /api/appointments/:id

POST /api/appointments

PATCH /api/appointments/:id

```



並驗證：



\- HTTP Status

\- Request Validation

\- Response Structure

\- Business Rule

\- Status Transition

\- Conflict Detection

\- Database Result

\- Error Handling



\---



\# 74. Browser Verification



Browser 必須實際驗證：



```text

Appointment List

&#x20;   ↓

新增 Appointment

&#x20;   ↓

建立成功

&#x20;   ↓

搜尋 / Filter

&#x20;   ↓

查看 Detail

&#x20;   ↓

編輯 Date / Time

&#x20;   ↓

編輯 Service

&#x20;   ↓

確認 Appointment

&#x20;   ↓

取消 Appointment

&#x20;   ↓

確認 CANCELLED

```



\---



\# 75. Calendar Verification



Browser 必須驗證：



```text

Appointment

&#x20;   ↓

Date / Time

&#x20;   ↓

Calendar View

```



確認：



\- 日期正確

\- 時間正確

\- Appointment 顯示正確

\- Status 顯示正確



\---



\# 76. Conflict Verification



Browser / API 必須驗證：



```text

Appointment A

14:00

Duration 120



Appointment B

15:00

```



在符合衝突條件時：



> 第二筆 Appointment 必須被阻止。



同時：



```text

CANCELLED Appointment

```



不應繼續阻擋新的預約。



\---



\# 77. Historical Snapshot Verification



必須驗證：



```text

Service

Price = 1000

Name = 全套美容

&#x20;   ↓

建立 Appointment

&#x20;   ↓

Appointment Item Snapshot

Price = 1000

Name = 全套美容

&#x20;   ↓

修改 Service

Price = 1200

Name = 豪華全套美容

&#x20;   ↓

舊 Appointment

仍顯示：

Price = 1000

Name = 全套美容

```



\---



\# 78. Appointment Happy Path



完整 Happy Path：



```text

Appointment List

&#x20;       ↓

新增 Appointment

&#x20;       ↓

選擇 Customer

&#x20;       ↓

選擇 Pet

&#x20;       ↓

選擇 Service

&#x20;       ↓

選擇 Date

&#x20;       ↓

選擇 Start Time

&#x20;       ↓

Validation

&#x20;       ↓

建立成功

&#x20;       ↓

Status = PENDING

&#x20;       ↓

查看 Detail

&#x20;       ↓

確認

&#x20;       ↓

Status = CONFIRMED

&#x20;       ↓

修改預約

&#x20;       ↓

儲存成功

&#x20;       ↓

取消

&#x20;       ↓

確認

&#x20;       ↓

Status = CANCELLED

```



\---



\# 79. Appointment Block PASS Criteria



Appointment Block 必須完整通過：



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

Appointment Block PASS

```



所有必要層級均通過後，才可視為：



> \*\*Appointment Block PASS\*\*



\---



\# 80. Definition of Done



PHASE 16 Appointment Block 的實作完成條件：



\- Appointment Database 結構完成

\- Appointment Item 結構完成

\- Appointment Data Access 完成

\- Appointment Business Logic 完成

\- Appointment API 完成

\- Appointment Validation 完成

\- Status Lifecycle 完成

\- Service Snapshot 完成

\- Price Snapshot 完成

\- Duration Calculation 完成

\- Basic Conflict Check 完成

\- Appointment UI 完成

\- Calendar View 完成

\- Unit Test 完成

\- API Integration Test 完成

\- Browser Verification 完成

\- Happy Path 通過

\- Appointment Block PASS



\---



\# 81. MVP Explicitly Excluded



PHASE 16 不包含：



\- Drag \& Drop Scheduling

\- Resource Calendar

\- Groomer Capacity Planning

\- Room Capacity Planning

\- Complex Staff Scheduling

\- Automatic Dispatch

\- Scheduling Optimization

\- Dynamic Pricing

\- Membership Pricing

\- Coupon

\- Promotion Engine

\- Complete Audit Log

\- LINE API

\- Online Self-Service Booking

\- Third-Party Payment Gateway



這些不屬於 PHASE 16 MVP v1.0。



\---



\# 82. Decision Summary



PHASE 16 Q1～Q40 全部採用 AI 推薦方案。



核心決策：



```text

Appointment

=

客戶預約了什麼、什麼時間來

```



```text

Required Relationship

=

Customer

\+

Pet

\+

Service

```



```text

Multiple Services

=

Appointment

\+

Appointment Items

```



```text

Status

=

PENDING

CONFIRMED

CANCELLED

COMPLETED

```



```text

Default Status

=

PENDING

```



```text

Cancellation

=

Status = CANCELLED

```



```text

Multiple Service

=

Service Name Snapshot

\+

Service Price Snapshot

```



```text

Time

=

Appointment Date

\+

Start Time

\+

Estimated Duration

```



```text

Conflict

=

Basic Time Conflict Check

```



```text

UI

=

List

\+

Form

\+

Detail

\+

Calendar

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



\# 83. Freeze Statement



本文件代表：



> \*\*PHASE 16 — Appointment 預約管理區塊定義與實作規格 v1.0 正式 FREEZE。\*\*



Freeze 範圍包含：



\- Appointment Responsibility

\- Appointment Boundary

\- Customer Relationship

\- Pet Relationship

\- Service Relationship

\- Appointment Items

\- Service Snapshot

\- Price Snapshot

\- Status Lifecycle

\- Date / Time

\- Duration

\- Conflict Check

\- Modification Rules

\- Cancellation Rules

\- UI

\- Calendar View

\- API

\- Backend Responsibility

\- Validation

\- Testing

\- Browser Verification

\- PASS Criteria

\- MVP Exclusion



後續實作必須以本文件為基準。



若實作過程發現：



\- Bug

\- 原決策互相矛盾

\- 技術實作限制



可依 Change Request 規則提出。



若只是：



> 「另一種設計比較漂亮」



不得因此推翻本 Freeze。



\---



\# 84. Phase Completion



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

```



Appointment Block 正式完成 Phase 定義與實作規格 Freeze。



\---



\# END OF DOCUMENT

