\# PHASE 19 — 住宿管理區塊定義與實作規格

\# Boarding Block Definition and Implementation Specification



\## Document Information



| 項目 | 內容 |

|---|---|

| Phase | PHASE 19 |

| 中文名稱 | 住宿管理 |

| 英文名稱 | Boarding |

| Document Type | Business Block Definition and Implementation Specification |

| Version | v1.0 |

| Status | \*\*FREEZE\*\* |

| Decision Range | Q1–Q40 |

| Freeze Date | 2026-08-16 |

| Filename | `PHASE-19-住宿管理區塊定義與實作規格-Boarding-Block-Definition-and-Implementation-Specification-v1.0.md` |



\---



\# 1. Document Purpose



本文件定義 MVP 第一版的：



> \*\*Boarding — 住宿管理 Business Block\*\*



Boarding 的核心責任為：



> \*\*管理寵物實際住宿生命週期。\*\*



本文件定義 Boarding 的：



\- Business Responsibility

\- Business Boundary

\- Lifecycle

\- Status

\- Data Responsibility

\- Check-in

\- Stay

\- Daily Care

\- Feeding Information

\- Location / Room Reference

\- Incident / Note

\- Check-out

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



本文件為 PHASE 19 正式 Freeze 文件。



\---



\# 2. Phase Status



PHASE 19 已完成：



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



PHASE 19

→ FREEZE

```



本文件發布後：



> \*\*PHASE 19 Boarding Block 正式 FREEZE。\*\*



後續實作必須以本文件為基準。



\---



\# 3. Project Baseline



PHASE 19 必須承接既有 Phase Freeze：



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

\- Grooming Block



\---



\# 4. Technical Baseline



PHASE 19 必須遵守既有技術架構。



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



\# 5. Boarding Responsibility



Boarding 的核心責任：



> \*\*管理寵物實際住宿生命週期。\*\*



Boarding 負責：



\- 建立住宿工作

\- 參考原始住宿 Appointment

\- 記錄實際住宿資訊

\- 管理住宿 Status

\- 處理 Check-in

\- 記錄 Actual Check-in Time

\- 管理住宿中的 Pet

\- 記錄 Location / Room Reference

\- 記錄基本 Check-in Note

\- 記錄基本 Feeding Information

\- 記錄 Daily Care Record

\- 記錄住宿期間基本 Note

\- 記錄基本 Incident / Note

\- 處理 Check-out

\- 記錄 Actual Check-out Time

\- 保留住宿歷史

\- 與 Daily Operations 進行現場營運銜接

\- 提供住宿查詢與管理介面



\---



\# 6. Boarding Boundary



Boarding 不負責：



\- Customer Master Data

\- Pet Master Data

\- Service Master Data

\- Appointment Master Data

\- Staff Master Data

\- Daily Operations 核心資料

\- Order 核心交易資料

\- Payment 核心付款資料

\- Notification 實際發送

\- 完整 Room Management

\- 完整 Inventory

\- 完整醫療管理

\- 完整寵物健康管理

\- 複雜住宿容量排程

\- 自動住宿分房引擎

\- 複雜照護排程

\- 營養分析

\- 完整事故管理系統



\---



\# 7. Core Principle



Boarding 必須遵守：



```text

Appointment

=

客戶原本預約住宿



Boarding

=

寵物實際住宿

```



因此：



> \*\*Appointment ≠ Boarding\*\*



Appointment 是預約資料。



Boarding 是實際住宿生命週期資料。



\---



\# 8. Boarding Lifecycle



第一版核心生命週期：



```text

預約住宿

&#x20;   ↓

入住

&#x20;   ↓

住宿中

&#x20;   ↓

退房

```



系統狀態：



```text

PENDING

&#x20;   ↓

CHECKED\_IN

&#x20;   ↓

STAYING

&#x20;   ↓

CHECKED\_OUT

```



取消：



```text

PENDING

&#x20;   ↓

CANCELLED

```



\---



\# 9. Boarding Status



第一版 Boarding Status：



```text

PENDING

CHECKED\_IN

STAYING

CHECKED\_OUT

CANCELLED

```



Status 只描述：



> Boarding 本身的住宿生命週期。



不得直接使用其他 Block 的 Status 取代 Boarding Status。



\---



\# 10. PENDING



PENDING 代表：



> 住宿工作已建立／準備中，但寵物尚未實際入住。



基本流程：



```text

Boarding Created

&#x20;   ↓

PENDING

```



\---



\# 11. CHECKED\_IN



CHECKED\_IN 代表：



> 寵物已完成實際住宿入住操作。



入住時至少確認：



\- Pet

\- Expected Check-in

\- Actual Check-in Time

\- Location / Room Reference

\- 基本 Check-in Note



\---



\# 12. STAYING



STAYING 代表：



> 寵物目前正在住宿中。



住宿期間：



\- 可以記錄 Daily Care

\- 可以記錄 Feeding Information

\- 可以記錄 Note

\- 可以記錄 Incident

\- 可以查看住宿資訊



\---



\# 13. CHECKED\_OUT



CHECKED\_OUT 代表：



> 寵物已完成實際退房。



退房時至少確認：



\- Actual Check-out Time

\- 住宿狀態

\- 必要 Note

\- 必要營運資訊



\---



\# 14. CANCELLED



CANCELLED 代表：



> 原住宿工作被取消。



取消後：



> 保留 Boarding Record。



不得 Hard Delete。



\---



\# 15. Status Transition



合法基本 Transition：



```text

PENDING

&#x20;   ↓

CHECKED\_IN

```



```text

CHECKED\_IN

&#x20;   ↓

STAYING

```



```text

STAYING

&#x20;   ↓

CHECKED\_OUT

```



取消：



```text

PENDING

&#x20;   ↓

CANCELLED

```



不合法 Transition 必須被 Backend 拒絕。



例如：



```text

CHECKED\_OUT

→ STAYING

```



或：



```text

CANCELLED

→ CHECKED\_IN

```



不得直接成功。



\---



\# 16. Expected Check-in



Boarding 必須保存：



> \*\*Expected Check-in\*\*



代表：



> 原本預計入住時間。



此資料來自：



> 原始住宿預約。



\---



\# 17. Expected Check-out



Boarding 必須保存：



> \*\*Expected Check-out\*\*



代表：



> 原本預計退房時間。



此資料必須保留，即使實際退房時間不同。



\---



\# 18. Actual Check-in



Boarding 必須保存：



> \*\*Actual Check-in Time\*\*



實際入住時間與預約時間分開。



例如：



```text

Expected Check-in

=

14:00



Actual Check-in

=

14:18

```



不得以 Actual Check-in 覆蓋 Expected Check-in。



\---



\# 19. Actual Check-out



Boarding 必須保存：



> \*\*Actual Check-out Time\*\*



實際退房時間與預計退房時間分開。



例如：



```text

Expected Check-out

=

2026-08-18 12:00



Actual Check-out

=

2026-08-18 13:25

```



不得直接修改原本 Expected Check-out 來取代歷史差異。



\---



\# 20. Appointment Relationship



Boarding 必須保留：



> 原始 Appointment Reference。



基本關係：



```text

Appointment

&#x20;   ↓

Boarding

```



Appointment 提供：



> 原始預約資訊。



Boarding 提供：



> 實際住宿資訊。



\---



\# 21. Original Boarding Service



Boarding 必須保留：



> 原本 Appointment 所預約的住宿 Service。



目的：



> 保留原始預約歷史。



不得因為實際住宿內容變化而直接覆蓋原始預約資料。



\---



\# 22. Actual Boarding Information



Boarding 必須保存：



> 實際住宿所需的資訊。



例如：



\- Actual Check-in

\- Actual Check-out

\- Location

\- Daily Care

\- Feeding

\- Notes

\- Incident



這些資料代表：



> 真正發生的住宿事件。



\---



\# 23. Location / Room Reference



第一版：



> Boarding 保存基本 Location / Room Reference。



用途：



> 知道 Pet 目前住在哪個住宿位置。



例如：



```text

Room A01

Cage B03

Area C

```



實際命名方式由店家資料設定決定。



\---



\# 24. Room Management Boundary



MVP 不建立：



> 獨立 Room Management Business Block。



因此第一版：



> 只保存 Boarding 所需的基本 Location / Room Reference。



不建立：



\- Room Master Management

\- Room Type Management

\- Room Pricing Engine

\- Facility Management

\- Automated Room Allocation



\---



\# 25. Location Conflict Check



Boarding 建立或入住時：



> 應進行基本住宿位置衝突檢查。



目的：



> 避免明顯的同一位置重複使用。



但不建立：



\- 複雜容量最佳化

\- 自動分房引擎

\- 多條件排程

\- Capacity Optimization



\---



\# 26. Check-in UI



Boarding 必須提供：



> \*\*Check-in 操作頁。\*\*



基本流程：



```text

Boarding

&#x20;   ↓

Check-in

&#x20;   ↓

確認 Pet

&#x20;   ↓

確認 Location

&#x20;   ↓

記錄 Actual Check-in Time

&#x20;   ↓

記錄 Check-in Note

&#x20;   ↓

CHECKED\_IN

```



\---



\# 27. Check-in Note



入住時：



> 可以保存基本 Check-in Note。



用途：



\- Pet 當下狀況

\- 客戶交代事項

\- 特殊注意事項

\- 住宿交接事項



第一版：



> 以基本文字／必要資訊為主。



不建立醫療檢查系統。



\---



\# 28. Stay Detail / Work Page



住宿中：



> 必須提供 Stay Detail / Work Page。



至少顯示：



```text

Customer

Pet

Expected Check-in

Expected Check-out

Actual Check-in

Location / Room

Feeding Information

Daily Care

Notes

Incident

Status

```



\---



\# 29. Feeding Information



Boarding 第一版：



> 保存基本餵食資訊。



至少可以描述：



\- 餵食時間

\- 餵食方式

\- 基本份量

\- 餵食備註



不建立：



\- 營養分析

\- 熱量計算

\- 完整飲食管理

\- 複雜餵食排程引擎



\---



\# 30. Daily Care Record



Boarding 必須建立：



> \*\*基本 Daily Care Record。\*\*



每筆 Daily Care Record 至少具有：



\- 日期

\- 照護內容

\- Note



用途：



> 保存住宿期間實際發生的基本照護紀錄。



\---



\# 31. Daily Care Responsibility



Daily Care 可由：



\- Owner

\- Front Desk

\- 負責住宿照護的 Staff



依既有 Business Rule 操作。



不得：



> 讓所有登入 Staff 無限制修改所有住宿照護資料。



\---



\# 32. Boarding Note



住宿期間：



> 可以保存基本 Boarding Note。



用途：



\- 一般住宿備註

\- 客戶交代事項

\- 特殊照護提醒

\- 交接資訊



\---



\# 33. Incident / Note



若住宿期間發生異常狀況：



> 必須可以保存基本 Incident / Note。



至少記錄：



\- 發生日期／時間

\- 基本事件描述

\- 必要處理 Note



第一版不建立完整 Incident Management。



\---



\# 34. Pet Condition Boundary



Boarding 可以保存：



> 基本入住狀況與住宿期間 Note。



但不建立：



\- 醫療病歷

\- 診斷

\- 用藥管理

\- 醫療處方

\- 完整健康檢查

\- 醫療警示引擎



這些不屬於 MVP Boarding。



\---



\# 35. Personal Belongings



第一版可以提供：



> 基本物品 Note / Reference 能力。



例如：



\- 寵物用品

\- 特殊用品

\- 客戶交付物品



但不建立：



> 完整物品盤點系統。



\---



\# 36. Boarding History



每次住宿：



> 必須保留獨立 Boarding Record。



形成：



```text

Pet

&#x20;   ↓

Boarding History

&#x20;   ↓

Boarding #1

Boarding #2

Boarding #3

...

```



歷史資料：



> 不因退房而刪除。



\---



\# 37. Boarding Hard Delete



第一版：



> 不提供一般 Hard Delete。



取消：



```text

Status = CANCELLED

```



歷史住宿：



> 保留。



原因：



> 住宿事件本身具有營運歷史價值。



\---



\# 38. Check-out UI



Boarding 必須提供：



> \*\*Check-out 操作。\*\*



基本流程：



```text

STAYING

&#x20;   ↓

Check-out

&#x20;   ↓

確認 Actual Check-out Time

&#x20;   ↓

確認必要 Note

&#x20;   ↓

CHECKED\_OUT

```



\---



\# 39. Late / Early Check-out



如果實際退房時間與預計時間不同：



> 不修改 Expected Check-out。



而是保存：



```text

Expected Check-out

\+

Actual Check-out

```



如此可以保留：



> 原本計畫與實際發生之差異。



\---



\# 40. Daily Operations Relationship



Boarding 與 Daily Operations 的責任：



```text

Boarding

=

住宿生命週期



Daily Operations

=

當日現場營運

```



Boarding 不取代 Daily Operations。



\---



\# 41. Customer Pickup



客戶來店取回 Pet：



> 不屬於 Boarding 的完整責任。



由：



> Daily Operations



管理現場取件流程。



Boarding 提供：



> 住宿已完成的資訊。



\---



\# 42. Order Integration



Boarding 可以提供：



> 實際住宿服務資訊。



後續：



```text

Boarding

&#x20;   ↓

Order

```



Order 負責：



> 客戶這次實際購買的交易內容。



\---



\# 43. Payment Integration



Payment：



> 不由 Boarding 負責。



基本流程：



```text

Boarding

&#x20;   ↓

Order

&#x20;   ↓

Payment

```



Payment 負責：



\- 付款方式

\- 付款金額

\- Payment Status

\- Payment Record



\---



\# 44. Notification Integration



如果住宿完成需要通知客戶：



```text

Boarding

&#x20;   ↓

住宿完成事件

&#x20;   ↓

Notification

```



實際通知：



> 由 Notification Block 負責。



Boarding 不建立第二套 Notification 系統。



\---



\# 45. Boarding UI



第一版至少提供：



```text

Boarding List

Boarding Check-in

Boarding Stay Detail

Boarding Check-out

Boarding History

```



\---



\# 46. Boarding List



Boarding List 至少支援：



\- 預計入住

\- 待入住

\- 住宿中

\- 待退房

\- 歷史住宿

\- Status 查詢



第一版支援基本 Pagination。



\---



\# 47. Boarding Work Card



住宿工作卡片至少顯示：



\- Pet

\- Customer

\- Expected Check-in

\- Expected Check-out

\- Location

\- Status

\- 必要操作



目的：



> 讓 Front Desk / 住宿照護 Staff 快速知道目前住宿狀態。



\---



\# 48. Boarding Detail



Detail 至少包含：



```text

Customer

Pet

Original Appointment

Original Boarding Service

Expected Check-in

Expected Check-out

Actual Check-in

Actual Check-out

Location / Room

Status

Feeding Information

Check-in Note

Daily Care

Boarding Note

Incident / Note

```



\---



\# 49. Quick Actions



依 Status 提供必要操作。



例如：



```text

PENDING

&#x20;   ↓

Check-in

```



```text

CHECKED\_IN

&#x20;   ↓

開始住宿

```



```text

STAYING

&#x20;   ↓

Daily Care

&#x20;   ↓

Check-out

```



```text

CHECKED\_OUT

&#x20;   ↓

查看

```



```text

CANCELLED

&#x20;   ↓

查看

```



不得無條件顯示所有操作。



\---



\# 50. Boarding Permissions



第一版：



> Owner、Front Desk、負責住宿照護的 Staff 可以依 Business Rule 操作 Boarding。



不同操作：



> 必須依 Status 與權限控制。



\---



\# 51. Completed Boarding Edit



CHECKED\_OUT 後：



> 允許有權限 Staff 進行必要的資料修正或補充。



但不得：



> 透過 Boarding 任意修改已完成的 Order / Payment 交易資料。



\---



\# 52. API



第一版採：



> \*\*REST API\*\*



至少提供：



```text

GET    /api/boardings

GET    /api/boardings/:id

POST   /api/boardings

PATCH  /api/boardings/:id

```



\---



\# 53. API Responsibility



Boarding API 負責：



\- Boarding List

\- Boarding Detail

\- Boarding Create

\- Boarding Edit

\- Check-in

\- Stay Management

\- Daily Care

\- Check-out

\- Boarding Business Validation



實際操作：



> 必須經過 Boarding Business Logic。



\---



\# 54. API Boundary



Boarding API 不取代：



\- Customer API

\- Pet API

\- Service API

\- Appointment API

\- Daily Operations API

\- Order API

\- Payment API

\- Notification API



Boarding API：



> 只負責 Boarding Business Responsibility。



\---



\# 55. Database



Boarding：



> 必須使用獨立 Database Table。



原因：



```text

Appointment

≠

Boarding

```



因此 Boarding 必須有自己的資料來源。



\---



\# 56. Daily Care Data Structure



Daily Care：



> 必須使用基本獨立資料結構。



原因：



Daily Care 具有獨立概念：



```text

日期

\+

照護內容

\+

Note

```



不應全部塞入 Boarding 單一 Note 欄位。



\---



\# 57. Database Ownership



Boarding Database 主要保存：



\- Boarding Identity

\- Appointment Reference

\- Pet Reference

\- Customer Reference

\- Service Reference

\- Boarding Status

\- Expected Check-in

\- Expected Check-out

\- Actual Check-in

\- Actual Check-out

\- Location / Room Reference

\- Feeding Information

\- Check-in Note

\- Boarding Note

\- Incident / Note

\- Checkout Information



Daily Care 使用：



> Boarding 專屬的 Daily Care 資料結構。



\---



\# 58. Master Data Reference



Boarding 不應完整複製：



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



\# 59. Data Conflict Rule



如果 Boarding 顯示資料與 Master Data 發生衝突：



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



Boarding 不得凌駕 Master Data。



\---



\# 60. Database Principle



Boarding 必須遵守：



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



\# 61. Backend Architecture



Boarding Backend：



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

Boarding Business Logic

&#x20;       ↓

其他 Block Business Logic / Data Access

```



不得直接繞過其他 Block 的 Business Rule。



\---



\# 62. Controller Responsibility



Controller 負責：



\- HTTP Request

\- Request Parameters

\- Request Mapping

\- 呼叫 Business Logic

\- Response Mapping

\- HTTP Status



Controller：



> 不承擔主要 Boarding Business Rules。



\---



\# 63. Business Logic Responsibility



Boarding Business Logic 負責：



\- Create Boarding

\- Status Transition

\- Check-in

\- Start Stay

\- Daily Care

\- Check-out

\- Cancel

\- Edit

\- Location Validation

\- Feeding Information Validation

\- Permission Validation

\- Cross-Block Coordination



\---



\# 64. Data Access Responsibility



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

\- Daily Care Query



Data Access：



> 不承擔主要 Business Rules。



\---



\# 65. ORM Policy



Boarding：



> 不使用 ORM。



Database Access：



> 使用 mysql2。



\---



\# 66. Validation Architecture



Boarding Validation：



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



\# 67. Create Validation



建立 Boarding 時至少確認：



\- Appointment 存在

\- Appointment 為住宿相關預約

\- Pet Reference 有效

\- Service Reference 有效

\- Expected Check-in 有效

\- Expected Check-out 有效

\- 日期邏輯正確

\- 不違反既有 Boarding Business Rule



\---



\# 68. Check-in Validation



Check-in 前至少確認：



\- Boarding 存在

\- Status = PENDING

\- Pet Reference 有效

\- Location 合法

\- Location 沒有明顯衝突

\- Actual Check-in Time 有效

\- 必要資料完整



成功後：



```text

PENDING

&#x20;   ↓

CHECKED\_IN

```



\---



\# 69. Stay Validation



進入住宿中：



```text

CHECKED\_IN

&#x20;   ↓

STAYING

```



必須確認：



\- Boarding 狀態合法

\- Pet 已完成入住

\- Actual Check-in 已存在



\---



\# 70. Daily Care Validation



建立 Daily Care Record 時：



至少確認：



\- Boarding 存在

\- Boarding 未 CANCELLED

\- Boarding 尚未完成退房，或依既有 Business Rule 允許補記

\- 日期有效

\- 照護內容有效

\- 操作者有權限



\---



\# 71. Check-out Validation



Check-out 前至少確認：



\- Boarding 存在

\- Status = STAYING

\- Actual Check-in 已存在

\- Actual Check-out Time 有效

\- Actual Check-out 不早於 Actual Check-in

\- 必要資料有效



成功後：



```text

STAYING

&#x20;   ↓

CHECKED\_OUT

```



\---



\# 72. Cancellation Validation



取消：



> 第一版主要允許 PENDING 住宿取消。



基本：



```text

PENDING

&#x20;   ↓

CANCELLED

```



已入住或已退房的 Boarding：



> 不應透過一般 Cancel 操作改成 CANCELLED。



\---



\# 73. Invalid Transition



必須拒絕不合法 Status Transition。



例如：



```text

CHECKED\_OUT

→ CHECKED\_IN

```



```text

CANCELLED

→ STAYING

```



```text

CHECKED\_OUT

→ CANCELLED

```



不得直接成功。



\---



\# 74. Error Handling



錯誤必須清楚表示：



\- Boarding Not Found

\- Appointment Not Found

\- Invalid Appointment

\- Invalid Status

\- Invalid Status Transition

\- Boarding Already Checked In

\- Boarding Already Checked Out

\- Boarding Cancelled

\- Invalid Location

\- Location Conflict

\- Invalid Date Range

\- Invalid Pet

\- Invalid Service

\- Permission Denied

\- Required Data Missing



不得只回傳：



```text

500 Internal Server Error

```



而沒有可理解的 Business Error。



\---



\# 75. Unit Test



Boarding Unit Test 至少驗證：



\- Create

\- Check-in

\- Stay Transition

\- Daily Care

\- Check-out

\- Cancel

\- Edit

\- Location Validation

\- Date Validation

\- Invalid Operation

\- Permission

\- Feeding Information



Testing Framework：



> Jest



\---



\# 76. API Integration Test



使用：



> Jest + Supertest



至少驗證：



\- GET List

\- GET Detail

\- POST Create

\- PATCH Edit

\- Check-in

\- Daily Care

\- Check-out

\- Cancel

\- Business Validation

\- Error Handling

\- Permission

\- Database Result



\---



\# 77. Browser Verification



Browser 必須實際驗證：



```text

Boarding List

&#x20;   ↓

建立／確認住宿

&#x20;   ↓

Check-in

&#x20;   ↓

Actual Check-in Time

&#x20;   ↓

指定 Location / Room

&#x20;   ↓

記錄基本照護資訊

&#x20;   ↓

STAYING

&#x20;   ↓

Daily Care Record

&#x20;   ↓

Check-out

&#x20;   ↓

Actual Check-out Time

&#x20;   ↓

CHECKED\_OUT

&#x20;   ↓

Daily Operations 後續流程

```



\---



\# 78. Boarding History Verification



Browser 必須確認：



> Pet 可以查看過去 Boarding History。



至少可以看到：



\- 住宿日期

\- Expected Check-in

\- Expected Check-out

\- Actual Check-in

\- Actual Check-out

\- Status

\- 基本住宿結果



\---



\# 79. Daily Care Verification



Browser 必須確認：



> 住宿中可以新增 Daily Care Record。



並可以查看：



```text

日期

照護內容

Note

```



資料必須正確保存至 Database。



\---



\# 80. Location Verification



Browser 必須確認：



> 住宿入住時可以設定基本 Location / Room Reference。



如果發生明顯位置衝突：



> 系統必須拒絕或要求 Staff 處理。



\---



\# 81. Cross-Block Verification



至少驗證：



```text

Appointment

&#x20;   ↓

Daily Operations

&#x20;   ↓

Boarding

&#x20;   ↓

CHECKED\_IN

&#x20;   ↓

STAYING

&#x20;   ↓

Daily Care

&#x20;   ↓

CHECKED\_OUT

&#x20;   ↓

Daily Operations

&#x20;   ↓

Order

&#x20;   ↓

Payment

```



確認：



> 各 Block Responsibility 沒有互相取代。



\---



\# 82. Boarding Happy Path



完整 Boarding MVP Happy Path：



```text

Appointment

&#x20;   ↓

住宿預約

&#x20;   ↓

Boarding Created

&#x20;   ↓

PENDING

&#x20;   ↓

Check-in

&#x20;   ↓

Actual Check-in Time

&#x20;   ↓

Location / Room

&#x20;   ↓

CHECKED\_IN

&#x20;   ↓

STAYING

&#x20;   ↓

Feeding Information

&#x20;   ↓

Daily Care Record

&#x20;   ↓

Boarding Note / Incident

&#x20;   ↓

Check-out

&#x20;   ↓

Actual Check-out Time

&#x20;   ↓

CHECKED\_OUT

&#x20;   ↓

Daily Operations

&#x20;   ↓

Order

&#x20;   ↓

Payment

```



\---



\# 83. Definition of Done



PHASE 19 Boarding Block 的實作完成條件：



\- Boarding Responsibility 完成

\- Boarding Boundary 完成

\- Boarding Lifecycle 完成

\- Boarding Status 完成

\- Appointment Integration 完成

\- Check-in 完成

\- Stay Management 完成

\- Check-out 完成

\- Expected Check-in / Check-out 完成

\- Actual Check-in / Check-out 完成

\- Location / Room Reference 完成

\- Location Conflict Check 完成

\- Feeding Information 完成

\- Daily Care Record 完成

\- Check-in Note 完成

\- Boarding Note 完成

\- Incident / Note 完成

\- Boarding History 完成

\- Boarding UI 完成

\- Boarding API 完成

\- Boarding Database Table 完成

\- Daily Care Data Structure 完成

\- Backend Business Logic 完成

\- Data Access 完成

\- Validation 完成

\- Error Handling 完成

\- Unit Test 完成

\- API Integration Test 完成

\- Browser Verification 完成

\- Daily Operations Integration 完成

\- Order Integration 完成

\- Boarding Happy Path 通過

\- Boarding Block PASS



\---



\# 84. MVP Explicitly Excluded



PHASE 19 不包含：



\- 獨立 Room Management Block

\- 完整房間管理

\- 自動分房引擎

\- 複雜容量排程

\- Capacity Optimization

\- 完整營養管理

\- 營養分析

\- 複雜餵食排程

\- 完整醫療管理

\- 完整健康紀錄

\- 用藥管理

\- 完整事故管理

\- 完整物品盤點

\- 完整 Inventory

\- 自動通知平台

\- 第三方 Notification 整合

\- Order 核心交易管理

\- Payment 核心付款管理



這些不屬於：



> MVP v1.0 Boarding Block。



\---



\# 85. Decision Summary



PHASE 19 Q1～Q40：



> \*\*全部採用 AI 推薦答案。\*\*



核心決策：



```text

Boarding

=

實際住宿生命週期管理

```



```text

Appointment

≠

Boarding

```



核心生命週期：



```text

PENDING

→

CHECKED\_IN

→

STAYING

→

CHECKED\_OUT

```



取消：



```text

PENDING

→

CANCELLED

```



Boarding 保存：



```text

Original Appointment Reference

Expected Check-in

Expected Check-out

Actual Check-in

Actual Check-out

Location / Room Reference

Feeding Information

Check-in Note

Daily Care Record

Boarding Note

Incident / Note

```



住宿歷史：



> 每次住宿保留獨立 Record。



Daily Care：



> 使用基本獨立資料結構。



Room：



> 只保存基本 Location / Room Reference，不建立獨立 Room Management Block。



Order：



> 負責交易內容。



Payment：



> 負責付款。



Daily Operations：



> 負責現場營運與客戶取件流程。



技術：



```text

Next.js

&#x20;   ↓

Express.js

&#x20;   ↓

Boarding Business Logic

&#x20;   ↓

Data Access

&#x20;   ↓

mysql2

&#x20;   ↓

MySQL

```



API：



```text

GET    /api/boardings

GET    /api/boardings/:id

POST   /api/boardings

PATCH  /api/boardings/:id

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



\# 86. Freeze Statement



本文件代表：



> \*\*PHASE 19 — Boarding 住宿管理區塊定義與實作規格 v1.0 正式 FREEZE。\*\*



Freeze 範圍包含：



\- Boarding Responsibility

\- Boarding Boundary

\- Boarding Lifecycle

\- Boarding Status

\- Appointment Relationship

\- Original Boarding Service

\- Actual Boarding Information

\- Expected Check-in

\- Expected Check-out

\- Actual Check-in

\- Actual Check-out

\- Location / Room Reference

\- Location Conflict Check

\- Check-in

\- Stay Management

\- Feeding Information

\- Daily Care

\- Boarding Note

\- Incident / Note

\- Check-out

\- Boarding History

\- Boarding UI

\- Boarding API

\- Boarding Database Boundary

\- Daily Care Data Structure

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



\# 87. Change Request Rule



Freeze 後若需修改，必須提出：



1\. 哪個 Freeze 決策需要修改

2\. 發生什麼問題

3\. 為什麼原方案不可行

4\. 新方案

5\. 影響範圍

6\. 是否值得重新開啟 Freeze



未經確認：



> 不得自行修改 PHASE 19 Freeze。



如果只是：



> 另一種設計比較漂亮



不得因此推翻 Freeze。



\---



\# 88. Phase Completion



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

```



Boarding Block 正式完成：



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

