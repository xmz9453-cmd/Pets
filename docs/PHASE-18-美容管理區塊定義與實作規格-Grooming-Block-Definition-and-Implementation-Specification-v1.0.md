\# PHASE 18 — 美容管理區塊定義與實作規格

\# Grooming Block Definition and Implementation Specification



\## Document Information



| 項目 | 內容 |

|---|---|

| Phase | PHASE 18 |

| 中文名稱 | 美容管理 |

| 英文名稱 | Grooming |

| Document Type | Business Block Definition and Implementation Specification |

| Version | v1.0 |

| Status | \*\*FREEZE\*\* |

| Decision Range | Q1–Q40 |

| Freeze Date | 2026-08-16 |

| Filename | `PHASE-18-美容管理區塊定義與實作規格-Grooming-Block-Definition-and-Implementation-Specification-v1.0.md` |



\---



\# 1. Document Purpose



本文件定義 MVP 第一版的：



> \*\*Grooming — 美容管理 Business Block\*\*



Grooming 的核心責任為：



> \*\*實際美容執行。\*\*



本文件定義 Grooming 的：



\- Business Responsibility

\- Business Boundary

\- Lifecycle

\- Status

\- Data Responsibility

\- Service Handling

\- Groomer Handling

\- UI

\- API

\- Database Boundary

\- Validation

\- Error Handling

\- Testing

\- Browser Verification

\- Cross-Block Integration

\- Happy Path

\- Definition of Done



本文件為 PHASE 18 正式 Freeze 文件。



\---



\# 2. Phase Status



PHASE 18 已完成：



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



PHASE 18

→ FREEZE

```



本文件發布後：



> \*\*PHASE 18 Grooming Block 正式 FREEZE。\*\*



後續實作必須以本文件為基準。



\---



\# 3. Project Baseline



PHASE 18 必須承接既有 Phase Freeze：



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

\- Appointment Block

\- Daily Operations Block



\---



\# 4. Technical Baseline



PHASE 18 必須遵守既有技術架構。



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



\# 5. Grooming Responsibility



Grooming 的核心責任：



> \*\*管理實際美容工作的執行與結果。\*\*



Grooming 負責：



\- 建立實際美容工作

\- 參考原始 Appointment Service

\- 記錄實際執行 Service

\- 指定主要 Groomer

\- 記錄 Actual Start Time

\- 記錄 Actual Completion Time

\- 記錄美容前基本 Note

\- 記錄美容後 Result / Note

\- 保存基本 Photo Reference

\- 管理 Grooming Status

\- 管理美容工作取消

\- 提供美容工作查詢

\- 與 Daily Operations 進行工作銜接



\---



\# 6. Grooming Boundary



Grooming 不負責：



\- Customer Master Data

\- Pet Master Data

\- Service Master Data

\- Appointment Master Data

\- Daily Operations 核心資料

\- Order 核心交易資料

\- Payment 核心付款資料

\- Notification 實際發送

\- 完整庫存

\- 完整排班

\- 自動派工

\- 醫療管理

\- 完整寵物健康管理

\- 完整照片管理系統



\---



\# 7. Core Principle



Grooming 必須遵守：



```text

Appointment

=

客戶原本預約什麼



Grooming

=

實際執行什麼美容

```



因此：



> \*\*Appointment ≠ Grooming\*\*



兩者是不同 Business Responsibility。



\---



\# 8. Grooming Record



第一版：



> 一筆 Grooming 對應一筆實際美容工作。



Grooming 必須能追溯：



```text

這次美容是誰的 Appointment

&#x20;       ↓

哪一隻 Pet

&#x20;       ↓

原本預約什麼

&#x20;       ↓

實際做了什麼

&#x20;       ↓

誰執行

&#x20;       ↓

什麼時間開始

&#x20;       ↓

什麼時間完成

&#x20;       ↓

最後結果

```



\---



\# 9. Grooming Creation



Grooming 的建立：



> Appointment 確認後可以準備，實際進入美容工作時建立／進入執行生命週期。



Grooming 不應：



\- 在 Customer 建立時建立

\- 在 Pet 建立時建立

\- 等到 Payment 完成後才建立



Grooming 是：



> 實際美容工作的資料來源。



\---



\# 10. Relationship with Appointment



基本關係：



```text

Appointment

&#x20;   ↓

原始預約 Service

&#x20;   ↓

Grooming

&#x20;   ↓

實際美容 Service

```



Appointment 提供：



> 原始預約資訊。



Grooming 提供：



> 實際執行資訊。



\---



\# 11. Original Appointment Service



Grooming 必須保留：



> 原本 Appointment 所預約的 Service。



目的：



> 保留原始預約歷史。



不得因為實際服務發生變化而直接覆蓋原始 Appointment Service。



\---



\# 12. Actual Service



Grooming 必須記錄：



> 實際執行的 Service。



原因：



預約內容與實際執行內容可能不同。



例如：



```text

Appointment

→ 洗澡 + 剪毛



實際 Grooming

→ 洗澡 + 基礎修剪

```



因此：



> 原始預約與實際執行必須可以區分。



\---



\# 13. Multiple Service Items



一個 Grooming：



> 可以包含多個實際 Service Item。



例如：



```text

洗澡

\+

剪毛

\+

指甲

```



可以屬於：



> 同一次 Grooming 工作。



不要求每個 Service 一定建立完全獨立的 Grooming。



\---



\# 14. Service Reference



Grooming 的 Service Item：



> 保存 Service ID 與當次實際執行所需的必要資訊。



Service Master Data：



> 仍由 Service Block 負責。



Grooming 不複製完整 Service Master Data。



\---



\# 15. Service Price Snapshot



Grooming 可以保存：



> 當次實際服務價格 Snapshot。



原因：



Service Master Data 的價格未來可能改變。



歷史資料不應因 Service Master Data 改價而失去原本的歷史意義。



\---



\# 16. Order Responsibility



Grooming：



> 不負責最終收費金額。



責任：



```text

Grooming

→ 實際做了什麼



Order

→ 客戶這次買了什麼



Payment

→ 客戶怎麼付款

```



Grooming 可以提供實際服務資訊給 Order。



但：



> Order 核心交易資料由 Order Block 負責。



\---



\# 17. Grooming Status



第一版 Grooming Status：



```text

PENDING

IN\_PROGRESS

COMPLETED

CANCELLED

```



\---



\# 18. PENDING



PENDING 代表：



> Grooming 工作已建立／準備，但尚未開始實際美容。



基本流程：



```text

Grooming Created

&#x20;   ↓

PENDING

```



\---



\# 19. IN\_PROGRESS



IN\_PROGRESS 代表：



> 美容工作已經開始實際執行。



基本流程：



```text

PENDING

&#x20;   ↓

開始美容

&#x20;   ↓

IN\_PROGRESS

```



\---



\# 20. COMPLETED



COMPLETED 代表：



> 本次 Grooming 實際美容工作已完成。



完成時至少確認：



\- Actual Groomer

\- Actual Service

\- Actual Completion Time

\- Result / Note



\---



\# 21. CANCELLED



CANCELLED 代表：



> Grooming 工作被取消。



取消後：



> 保留 Grooming Record。



不得 Hard Delete。



\---



\# 22. Grooming Status Boundary



Grooming Status：



> 只表達美容工作本身的生命週期。



不複製 Daily Operations Status。



因此不建立：



```text

WAITING

CHECKED\_IN

WAITING\_PICKUP

```



作為 Grooming Status。



這些屬於：



> Daily Operations。



\---



\# 23. Grooming vs Daily Operations



兩者責任：



```text

Daily Operations

=

今日現場營運進度



Grooming

=

美容工作執行進度

```



例如：



```text

Daily Operations

&#x20;   Status = IN\_PROGRESS



Grooming

&#x20;   Status = IN\_PROGRESS

```



兩者可能同時處於 IN\_PROGRESS，但代表不同概念。



\---



\# 24. Check-in Relationship



Grooming 開始前：



> 必須完成必要的 Daily Operations Check-in 流程。



基本流程：



```text

Appointment

&#x20;   ↓

Daily Operations

&#x20;   ↓

CHECKED\_IN

&#x20;   ↓

Grooming

&#x20;   ↓

IN\_PROGRESS

```



Grooming 不取代 Check-in。



\---



\# 25. Actual Start Time



Grooming 必須記錄：



> \*\*Actual Start Time\*\*



這與 Appointment 預約時間不同。



例如：



```text

Appointment Time

=

14:00



Grooming Actual Start Time

=

14:12

```



兩者必須分開。



\---



\# 26. Actual Completion Time



Grooming 完成時必須記錄：



> \*\*Actual Completion Time\*\*



此資料用於：



\- 歷史紀錄

\- 基本營運統計

\- 工作時間分析

\- 後續 Report



\---



\# 27. Groomer Responsibility



Grooming 必須記錄：



> 實際執行的主要 Groomer。



第一版：



> 一個 Grooming 指定一位主要 Groomer。



\---



\# 28. Groomer Change



實際營運可能發生：



```text

原 Groomer

&#x20;   ↓

臨時無法處理

&#x20;   ↓

另一位 Groomer 接手

```



因此：



> 允許有權限的 Staff 修改實際 Groomer。



但不建立：



\- 自動派工引擎

\- 複雜多人 Assignment Workflow

\- Capacity Optimization

\- 排班引擎



\---



\# 29. Pre-Grooming Note



Grooming 必須提供：



> 基本美容前狀況 Note。



可以記錄：



\- 毛況

\- 特殊狀況

\- 客戶交代事項

\- 美容前注意事項



第一版只需要：



> 基本文字備註。



不建立完整醫療／健康檢查系統。



\---



\# 30. Grooming Result



Grooming 完成後：



> 必須可以記錄基本 Result / Note。



例如：



\- 實際美容結果

\- 特殊狀況

\- 美容過程備註

\- 需要提醒下次美容的事項



\---



\# 31. Photo Reference



既有業務流程包含：



```text

美容

→ Photo

```



因此第一版：



> 預留基本 Photo Reference 能力。



但不建立：



\- 完整相簿

\- 圖片分類

\- 圖片 AI 分析

\- 圖片編輯

\- 圖片版本管理

\- 完整 Digital Asset Management



\---



\# 32. Pet History



Grooming UI：



> 必須提供基本 Pet 歷史查看入口。



用途：



> 協助美容師了解過去美容紀錄與特殊注意事項。



Pet Master Data：



> 仍由 Pet Block 負責。



Grooming 不建立第二套 Pet History Master Data。



\---



\# 33. Grooming UI



第一版主要 UI：



```text

Grooming List

&#x20;   ↓

Grooming Work Card

&#x20;   ↓

Grooming Work Detail

```



主要目的：



> 讓美容師可以快速處理目前的美容工作。



\---



\# 34. Grooming Work Card



工作卡片至少顯示：



\- Pet

\- Customer

\- Appointment Service

\- Actual Service

\- Groomer

\- Status

\- 必要操作



\---



\# 35. Grooming Work Detail



工作頁至少包含：



```text

Pet

Customer

Appointment Service

Actual Service

Pre-Grooming Note

Groomer

Status

Actual Start Time

Actual Completion Time

Result / Note

Photo Reference

Quick Actions

```



\---



\# 36. UI 操作原則



Grooming UI：



> 優先以工作操作為核心。



避免：



\- 大量不必要欄位

\- ERP 式複雜表單

\- 非美容相關資料

\- 複雜設定



原則：



> \*\*美容師能快速看到、快速操作、快速完成。\*\*



\---



\# 37. Grooming Quick Actions



依目前 Status 提供必要操作。



例如：



```text

PENDING

&#x20;   ↓

開始美容



IN\_PROGRESS

&#x20;   ↓

完成美容



COMPLETED

&#x20;   ↓

查看結果



CANCELLED

&#x20;   ↓

僅查看

```



不允許無條件顯示所有操作。



\---



\# 38. Grooming Permissions



第一版：



> Owner、Front Desk、實際 Groomer 可以依 Business Rule 操作 Grooming。



不同操作：



> 必須依權限與狀態控制。



不得：



> 讓所有登入 Staff 無限制修改所有 Grooming 資料。



\---



\# 39. Completed Grooming Edit



Grooming 完成後：



> 允許有權限的 Staff 修改。



適用於：



\- 補充 Note

\- 修正 Groomer

\- 修正實際執行資訊

\- 修正其他必要 Grooming Record



但：



> 不得透過 Grooming 任意改寫已完成的 Order / Payment 交易資料。



\---



\# 40. Grooming Cancellation



取消 Grooming：



```text

Grooming Status

=

CANCELLED

```



資料：



> 保留。



不得：



```text

DELETE Grooming

```



原因：



> 取消也是歷史事件。



\---



\# 41. Grooming Completion



完成 Grooming 時，至少確認：



```text

Grooming Status

=

COMPLETED



Actual Completion Time

=

有值



Actual Groomer

=

有值



Actual Service

=

有值



Result / Note

=

可保存

```



\---



\# 42. Daily Operations Integration



Grooming 完成後：



```text

Grooming

&#x20;   Status = COMPLETED

&#x20;       ↓

Daily Operations

&#x20;   Status = WAITING\_PICKUP

```



這代表：



> 美容工作已完成，但客戶尚未完成取件流程。



\---



\# 43. Customer Pickup Boundary



Customer Pickup：



> 不屬於 Grooming 核心責任。



由：



> Daily Operations



負責後續現場營運流程。



\---



\# 44. Order Integration



Grooming 完成後：



```text

Grooming

&#x20;   ↓

實際服務資訊

&#x20;   ↓

Order

```



Order 負責：



> 客戶這次實際購買的交易內容。



\---



\# 45. Payment Integration



Payment：



> 不由 Grooming 負責。



流程：



```text

Grooming

&#x20;   ↓

Order

&#x20;   ↓

Payment

```



Payment Block 負責：



\- 付款方式

\- 付款金額

\- 付款狀態

\- Payment Record



\---



\# 46. Notification Integration



若美容完成需要通知客戶：



```text

Grooming

&#x20;   ↓

美容完成事件

&#x20;   ↓

Daily Operations / Notification

&#x20;   ↓

Notification Block

&#x20;   ↓

實際通知

```



Grooming：



> 不建立第二套 Notification 系統。



\---



\# 47. Grooming API



第一版採：



> \*\*REST API\*\*



至少提供：



```text

GET    /api/groomings

GET    /api/groomings/:id

POST   /api/groomings

PATCH  /api/groomings/:id

```



\---



\# 48. API Responsibility



Grooming API 負責：



\- Grooming List

\- Grooming Detail

\- Grooming Create

\- Grooming Edit

\- Grooming Status 操作

\- Grooming Business Validation



實際操作：



> 必須經過 Grooming Business Logic。



\---



\# 49. API Boundary



Grooming API 不取代：



\- Customer API

\- Pet API

\- Service API

\- Appointment API

\- Daily Operations API

\- Order API

\- Payment API



Grooming API：



> 只負責 Grooming Business Responsibility。



\---



\# 50. Database



Grooming：



> 必須使用獨立 Database Table。



原因：



```text

Appointment

≠

Grooming

```



因此 Grooming 必須有自己的資料來源。



\---



\# 51. Database Ownership



Grooming Database 主要保存：



\- Grooming Identity

\- Appointment Reference

\- Grooming Status

\- Actual Groomer Reference

\- Actual Start Time

\- Actual Completion Time

\- Pre-Grooming Note

\- Result / Note

\- Actual Service Reference

\- 必要 Service Snapshot

\- Photo Reference



\---



\# 52. Master Data Reference



Grooming 不應完整複製：



\- Customer

\- Pet

\- Service

\- Staff



而應使用必要 Reference。



概念：



```text

Customer

&#x20;   ↑

Reference



Pet

&#x20;   ↑

Reference



Service

&#x20;   ↑

Reference



Staff

&#x20;   ↑

Reference

```



\---



\# 53. Data Conflict Rule



若 Grooming 顯示資料與 Master Data 發生衝突：



> 原始資料所屬 Block 擁有最終決定權。



例如：



```text

Customer

→ Customer Block



Pet

→ Pet Block



Service

→ Service Block



Staff

→ Staff / Authentication Block

```



Grooming：



> 不得凌駕 Master Data。



\---



\# 54. Database Principle



Grooming 必須遵守：



> \*\*最小必要資料原則。\*\*



避免：



```text

Customer Copy

Pet Copy

Service Copy

Staff Copy

Appointment Copy

```



形成第二套資料來源。



\---



\# 55. Backend Architecture



Grooming Backend：



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



跨 Block 操作：



```text

Grooming Business Logic

&#x20;       ↓

其他 Block Business Logic / Data Access

```



不得直接繞過其他 Block 的 Business Rule。



\---



\# 56. Controller Responsibility



Controller 負責：



\- HTTP Request

\- Request Parameters

\- Request Mapping

\- 呼叫 Business Logic

\- Response Mapping

\- HTTP Status



Controller：



> 不承擔主要 Grooming Business Rules。



\---



\# 57. Business Logic Responsibility



Grooming Business Logic 負責：



\- Create Grooming

\- Status Transition

\- Start Grooming

\- Complete Grooming

\- Cancel Grooming

\- Edit Grooming

\- Groomer Assignment

\- Service Validation

\- Completion Validation

\- Permission Validation

\- Cross-Block Coordination



\---



\# 58. Data Access Responsibility



Data Access 負責：



\- SQL

\- SELECT

\- INSERT

\- UPDATE

\- List

\- Detail

\- Filter

\- Sorting

\- Pagination



Data Access：



> 不承擔主要 Business Rules。



\---



\# 59. ORM Policy



Grooming：



> 不使用 ORM。



Database Access：



> 使用 mysql2。



\---



\# 60. Validation Architecture



Grooming Validation：



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



> 不是安全邊界。



Backend：



> 必須重新驗證。



\---



\# 61. Create Validation



建立 Grooming 時至少確認：



\- Appointment 存在

\- Appointment 狀態合法

\- Pet Reference 有效

\- Service Reference 有效

\- Groomer Reference 有效（若指定）

\- Grooming 不違反既有 Business Rule

\- 必要欄位有效



\---



\# 62. Start Validation



開始 Grooming 前：



> 必須符合必要營運前置條件。



基本：



```text

Appointment

&#x20;   ↓

Daily Operations Check-in

&#x20;   ↓

Grooming PENDING

&#x20;   ↓

Grooming IN\_PROGRESS

```



不得無條件跳過必要流程。



\---



\# 63. Complete Validation



完成 Grooming 前：



至少確認：



\- Grooming 存在

\- Status = IN\_PROGRESS

\- Actual Groomer 存在

\- Actual Service 存在

\- Actual Completion Time 有效

\- Completion 操作合法



完成後：



```text

Grooming

=

COMPLETED

```



並觸發必要的 Daily Operations Integration。



\---



\# 64. Invalid Transition



必須拒絕不合法的 Status Transition。



例如：



```text

COMPLETED

→ IN\_PROGRESS

```



或：



```text

CANCELLED

→ COMPLETED

```



不得直接成功。



\---



\# 65. Error Handling



錯誤必須清楚表示：



\- Grooming Not Found

\- Appointment Not Found

\- Invalid Status

\- Invalid Status Transition

\- Grooming Already Completed

\- Grooming Already Cancelled

\- Invalid Service

\- Invalid Groomer

\- Permission Denied

\- Required Data Missing



不得讓 Frontend 只能看到：



```text

500 Internal Server Error

```



而不知道真正原因。



\---



\# 66. Unit Test



Grooming Unit Test 至少驗證：



\- Create

\- Status Transition

\- Start

\- Complete

\- Cancel

\- Edit

\- Groomer Assignment

\- Service Validation

\- Invalid Operation

\- Permission



Testing Framework：



> Jest



\---



\# 67. API Integration Test



使用：



> Jest + Supertest



至少驗證：



\- GET List

\- GET Detail

\- POST Create

\- PATCH Edit

\- Status Operation

\- Business Validation

\- Error Handling

\- Permission

\- Database Result



\---



\# 68. Browser Verification



Browser 必須實際驗證：



```text

Grooming List

&#x20;   ↓

查看 Grooming

&#x20;   ↓

建立 / 開始 Grooming

&#x20;   ↓

指定 Groomer

&#x20;   ↓

確認 Service

&#x20;   ↓

記錄 Pre-Grooming Note

&#x20;   ↓

IN\_PROGRESS

&#x20;   ↓

完成 Grooming

&#x20;   ↓

Result / Note

&#x20;   ↓

COMPLETED

&#x20;   ↓

Daily Operations = WAITING\_PICKUP

```



\---



\# 69. Pet History Verification



Browser 必須確認：



> 美容師可以從 Grooming 工作頁進入 Pet 基本歷史查看。



但：



> 不允許因此建立第二套 Pet Master Data。



\---



\# 70. Cross-Block Verification



至少驗證：



```text

Appointment

&#x20;   ↓

Daily Operations

&#x20;   ↓

Check-in

&#x20;   ↓

Grooming

&#x20;   ↓

Grooming COMPLETED

&#x20;   ↓

Daily Operations WAITING\_PICKUP

&#x20;   ↓

Order

&#x20;   ↓

Payment

&#x20;   ↓

Daily Operations COMPLETED

```



確認：



> 各 Block Responsibility 沒有互相取代。



\---



\# 71. Grooming Happy Path



完整 Grooming MVP Happy Path：



```text

Appointment

&#x20;   ↓

CONFIRMED

&#x20;   ↓

Daily Operations

&#x20;   ↓

CHECKED\_IN

&#x20;   ↓

Grooming Created

&#x20;   ↓

PENDING

&#x20;   ↓

指定 Groomer

&#x20;   ↓

確認 Actual Service

&#x20;   ↓

記錄 Pre-Grooming Note

&#x20;   ↓

開始美容

&#x20;   ↓

IN\_PROGRESS

&#x20;   ↓

美容執行

&#x20;   ↓

記錄 Result / Note

&#x20;   ↓

Actual Completion Time

&#x20;   ↓

COMPLETED

&#x20;   ↓

Daily Operations

&#x20;   ↓

WAITING\_PICKUP

```



\---



\# 72. Definition of Done



PHASE 18 Grooming Block 的實作完成條件：



\- Grooming Responsibility 完成

\- Grooming Boundary 完成

\- Grooming Lifecycle 完成

\- Grooming Status 完成

\- Appointment Integration 完成

\- Daily Operations Integration 完成

\- Service Integration 完成

\- Groomer Assignment 完成

\- Pre-Grooming Note 完成

\- Result / Note 完成

\- Photo Reference 基本能力完成

\- Pet History Quick View 完成

\- Grooming UI 完成

\- Grooming API 完成

\- Grooming Database Table 完成

\- Backend Business Logic 完成

\- Data Access 完成

\- Validation 完成

\- Error Handling 完成

\- Unit Test 完成

\- API Integration Test 完成

\- Browser Verification 完成

\- Cross-Block Integration 完成

\- Grooming Happy Path 通過

\- Grooming Block PASS



\---



\# 73. MVP Explicitly Excluded



PHASE 18 不包含：



\- 完整照片管理系統

\- 圖片 AI 分析

\- 圖片編輯

\- 完整 Pet Medical Record

\- 醫療管理

\- 複雜美容排程

\- 自動派工引擎

\- Staff Capacity Optimization

\- 完整排班

\- 複雜多人 Assignment Workflow

\- 完整 CRM

\- 完整 Inventory

\- Order 核心交易管理

\- Payment 核心付款管理

\- Notification Center

\- 第三方 Notification 平台整合



這些不屬於：



> MVP v1.0 Grooming Block。



\---



\# 74. Decision Summary



PHASE 18 Q1～Q40：



> \*\*全部採用 AI 推薦答案。\*\*



核心決策：



```text

Grooming

=

實際美容執行

```



```text

Appointment

≠

Grooming

```



Grooming：



```text

PENDING

→

IN\_PROGRESS

→

COMPLETED

```



或：



```text

PENDING

→

CANCELLED

```



Grooming 必須保留：



```text

Original Appointment Service

\+

Actual Service

```



一個 Grooming：



> 可以包含多個實際 Service Item。



Grooming 保存：



```text

Actual Groomer

Actual Start Time

Actual Completion Time

Pre-Grooming Note

Result / Note

Photo Reference

```



Service：



> 使用 Reference 與必要 Snapshot。



價格：



> 可以保存當次實際服務價格 Snapshot。



Order：



> 負責最終交易內容與金額。



Payment：



> 負責付款。



Daily Operations：



> 負責美容完成後的現場營運流程。



完成銜接：



```text

Grooming COMPLETED

&#x20;       ↓

Daily Operations WAITING\_PICKUP

```



技術：



```text

Next.js

&#x20;   ↓

Express.js

&#x20;   ↓

Grooming Business Logic

&#x20;   ↓

Data Access

&#x20;   ↓

mysql2

&#x20;   ↓

MySQL

```



API：



```text

GET    /api/groomings

GET    /api/groomings/:id

POST   /api/groomings

PATCH  /api/groomings/:id

```



Testing：



```text

Jest

\+

Supertest

\+

Browser Verification

```



\---



\# 75. Freeze Statement



本文件代表：



> \*\*PHASE 18 — Grooming 美容管理區塊定義與實作規格 v1.0 正式 FREEZE。\*\*



Freeze 範圍包含：



\- Grooming Responsibility

\- Grooming Boundary

\- Grooming Lifecycle

\- Grooming Status

\- Appointment Relationship

\- Original Service

\- Actual Service

\- Service Item

\- Service Snapshot

\- Groomer

\- Actual Start Time

\- Actual Completion Time

\- Pre-Grooming Note

\- Result / Note

\- Photo Reference

\- Pet History

\- Grooming UI

\- Grooming API

\- Grooming Database Boundary

\- Backend Responsibility

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



\# 76. Change Request Rule



Freeze 後若需修改，必須提出：



1\. 哪個 Freeze 決策需要修改

2\. 發生什麼問題

3\. 為什麼原方案不可行

4\. 新方案

5\. 影響範圍

6\. 是否值得重新開啟 Freeze



未經確認：



> 不得自行修改 PHASE 18 Freeze。



如果只是：



> 另一種設計比較漂亮



不得因此推翻 Freeze。



\---



\# 77. Phase Completion



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

```



Grooming Block 正式完成：



```text

Definition

\+

Decision

\+

Specification

\+

Freeze

```



\---



\# END OF DOCUMENT

