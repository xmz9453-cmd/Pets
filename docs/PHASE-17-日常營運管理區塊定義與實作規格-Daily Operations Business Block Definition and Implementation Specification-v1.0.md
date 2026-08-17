\# PHASE 17 — Daily Operations 日常營運管理區塊定義與實作規格



\## Document Information



| 項目 | 內容 |

|---|---|

| Phase | PHASE 17 |

| Module | Daily Operations |

| 中文名稱 | 日常營運管理 |

| 英文名稱 | Daily Operations |

| Document Type | Business Block Definition and Implementation Specification |

| Version | v1.0 |

| Status | \*\*FREEZE\*\* |

| Decision Range | Q1–Q40 |

| Freeze Date | 2026-08-16 |

| Filename | `PHASE-17-日常營運管理區塊定義與實作規格-Daily-Operations-Block-Definition-and-Implementation-Specification-v1.0.md` |



\---



\# 1. Document Purpose



本文件定義 MVP 第一版的：



> \*\*Daily Operations — 日常營運管理 Business Block\*\*



Daily Operations 的核心責任為：



> \*\*店員每天工作的營運操作中心。\*\*



Daily Operations 負責將既有 Business Blocks 在每日實際營運中串接起來，讓店員可以從「今天要處理什麼」開始工作。



Daily Operations：



> 可以操作其他 Block，但不擁有其他 Block 的核心資料。



\---



\# 2. Phase Status



PHASE 17 已完成：



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



PHASE 17

→ FREEZE

```



本文件發布後：



> \*\*PHASE 17 Daily Operations Block 正式 Freeze。\*\*



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

&#x20;       ↓

PHASE 17 FREEZE

```



本 Phase 不重新設計前面已 Freeze 的：



\- MVP Product Definition

\- MVP Scope

\- Business Workflow

\- Business Block Map

\- Business Block Responsibility

\- Technical Architecture

\- Customer Block

\- Appointment Block



\---



\# 4. Technical Baseline



PHASE 17 必須遵守既有技術架構。



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



\# 5. Daily Operations Responsibility



Daily Operations 的核心責任：



> \*\*管理店家「今天實際要做什麼」以及「目前做到哪裡」。\*\*



Daily Operations 負責：



\- 今日營運工作視圖

\- 今日 Appointment 工作清單

\- Check-in

\- Actual Arrival Time

\- 基本營運工作狀態

\- 今日工作快速操作

\- Customer / Pet 快速查看入口

\- Appointment Detail 快速查看

\- 基本異常／注意事項

\- Grooming / Boarding 交接

\- Order / Payment 操作銜接

\- Notification 事件觸發

\- 今日營運摘要



\---



\# 6. Daily Operations Boundary



Daily Operations 不負責：



\- Customer Master Data

\- Pet Master Data

\- Service Master Data

\- Appointment Master Data

\- Grooming 內部執行流程

\- Boarding 住宿生命週期

\- Order 核心交易資料

\- Payment 核心付款資料

\- Notification 實際通知機制

\- 完整 BI

\- 複雜 Workflow Engine

\- 複雜排班

\- 複雜容量管理

\- 自動派工引擎



\---



\# 7. Daily Operations Core Principle



Daily Operations 必須遵守：



> \*\*Operation Center ≠ Data Owner\*\*



也就是：



```text

Daily Operations

&#x20;   ↓

操作

&#x20;   ↓

其他 Business Block

```



而不是：



```text

Daily Operations

&#x20;   ↓

複製其他 Block 的核心資料

```



\---



\# 8. Single Source of Truth



各 Business Block 的核心資料來源：



```text

Customer

→ Customer Block



Pet

→ Pet Block



Service

→ Service Block



Appointment

→ Appointment Block



Grooming

→ Grooming Block



Boarding

→ Boarding Block



Order

→ Order Block



Payment

→ Payment Block

```



Daily Operations：



> 不取代以上任何 Block 的 Single Source of Truth。



\---



\# 9. Today's Operations Data Source



Daily Operations 的主要來源：



```text

Appointment

&#x20;   ↓

Appointment Date = Today

&#x20;   ↓

Daily Operations

```



第一版：



> 不建立另一套「今日預約」資料來源。



不需要：



```text

Appointment

&#x20;   ↓

複製

&#x20;   ↓

Daily Appointment Table

```



而是直接根據 Appointment 查詢今日工作。



\---



\# 10. Default Daily Operations Scope



Daily Operations 預設：



> 顯示今天需要店員處理的營運項目。



主要包含：



\- 今天的預約

\- 尚未到店

\- 已到店

\- 處理中

\- 等待取件

\- 已完成

\- 基本需要注意事項



\---



\# 11. Cancelled Appointment



CANCELLED Appointment：



> 預設不進入主要 Daily Operations 工作清單。



但：



> 不代表資料被刪除。



仍可透過：



\- Filter

\- Search

\- Appointment Detail



查看取消資料。



\---



\# 12. Daily Operations Status



Daily Operations 第一版建立基本營運工作狀態：



```text

WAITING

CHECKED\_IN

IN\_PROGRESS

WAITING\_PICKUP

COMPLETED

```



這些狀態：



> 屬於 Daily Operations 的營運狀態。



\---



\# 13. Appointment Status 與 Operations Status



兩者必須分開。



```text

Appointment Status

=

預約生命週期

```



```text

Daily Operations Status

=

今日實際營運進度

```



例如：



```text

Appointment

&#x20;   Status = CONFIRMED



Daily Operations

&#x20;   Status = CHECKED\_IN

```



兩者可以同時成立。



\---



\# 14. WAITING



WAITING 代表：



> Appointment 已確認，但目前尚未進入實際現場處理。



例如：



```text

Appointment

&#x20;   ↓

CONFIRMED

&#x20;   ↓

Daily Operations

&#x20;   ↓

WAITING

```



\---



\# 15. CHECKED\_IN



CHECKED\_IN 代表：



> 客戶／寵物已實際到店。



基本流程：



```text

WAITING

&#x20;   ↓

Check-in

&#x20;   ↓

CHECKED\_IN

```



\---



\# 16. IN\_PROGRESS



IN\_PROGRESS 代表：



> 今日工作已開始實際執行。



基本流程：



```text

CHECKED\_IN

&#x20;   ↓

開始工作

&#x20;   ↓

IN\_PROGRESS

```



實際工作可能由：



\- Grooming

\- Boarding



等 Block 負責。



Daily Operations 只保存必要的營運進度。



\---



\# 17. WAITING\_PICKUP



WAITING\_PICKUP 代表：



> 服務工作已完成，但客戶尚未完成取件流程。



例如：



```text

Grooming 完成

&#x20;   ↓

等待客戶取件

&#x20;   ↓

WAITING\_PICKUP

```



\---



\# 18. COMPLETED



COMPLETED 代表：



> 今日營運流程已完成。



一般包含：



```text

工作完成

\+

客戶取件

\+

必要交易流程完成

```



之後：



```text

WAITING\_PICKUP

&#x20;   ↓

取件 / Checkout

&#x20;   ↓

COMPLETED

```



\---



\# 19. Daily Operations Status Boundary



Daily Operations Status：



> 只表達 MVP 所需的基本營運進度。



不建立：



\- 15～20 個細分狀態

\- 複雜 Workflow Engine

\- 狀態自動推理引擎

\- AI 狀態預測

\- 複雜跨部門流程引擎



原則：



> \*\*少而足夠。\*\*



\---



\# 20. Check-in Responsibility



Check-in：



> 屬於 Daily Operations 的營運操作。



Check-in 時至少確認：



```text

Customer

Pet

Appointment

Service

```



目的：



> 確認今天實際到店的客戶與寵物，以及其預約內容。



\---



\# 21. Actual Arrival Time



Check-in 必須記錄：



> \*\*Actual Arrival Time\*\*



預約時間與實際到店時間是不同資料。



例如：



```text

Appointment Start Time

=

14:00



Actual Arrival Time

=

14:08

```



兩者必須分開保存。



\---



\# 22. Actual Arrival Time Ownership



Actual Arrival Time：



> 由 Daily Operations 負責。



原因：



Appointment 負責：



> 客戶原本預約什麼時間。



Daily Operations 負責：



> 客戶今天實際什麼時間到店。



\---



\# 23. Check-in 不等於 Appointment Completed



Check-in：



> 不會直接將 Appointment 設為 COMPLETED。



流程：



```text

CONFIRMED

&#x20;   ↓

Check-in

&#x20;   ↓

Daily Operations = CHECKED\_IN

&#x20;   ↓

Grooming / Boarding / 後續營運

&#x20;   ↓

完成

&#x20;   ↓

Appointment = COMPLETED

```



\---



\# 24. Appointment Status Boundary



Daily Operations 可以操作 Appointment Status：



> 但必須遵守 Appointment Block 已 Freeze 的 Business Rules。



Daily Operations：



> 不得建立自己的 Appointment Status Lifecycle。



例如：



```text

PENDING

→ CONFIRMED

```



可以透過 Daily Operations 操作。



但實際規則：



> 仍由 Appointment Business Logic 負責。



\---



\# 25. Appointment Status 不新增 CHECKED\_IN



第一版 Appointment Status 維持：



```text

PENDING

CONFIRMED

CANCELLED

COMPLETED

```



不新增：



```text

CHECKED\_IN

```



原因：



> Check-in 是 Daily Operations 的營運狀態，不是 Appointment 的預約生命週期狀態。



\---



\# 26. Grooming Integration



Daily Operations 與 Grooming：



```text

Daily Operations

&#x20;   ↓

交接

&#x20;   ↓

Grooming

&#x20;   ↓

美容執行

&#x20;   ↓

完成

&#x20;   ↓

Daily Operations

```



Daily Operations 不管理 Grooming 內部：



\- 洗澡

\- 吹毛

\- 剪毛

\- 拍照

\- 美容細節



\---



\# 27. Grooming Data Ownership



Grooming 核心資料：



> 由 Grooming Block 擁有。



Daily Operations：



> 不直接修改 Grooming 內部核心狀態。



如果需要操作：



> 透過 Grooming Block 定義的操作／結果銜接。



\---



\# 28. Boarding Integration



Daily Operations 與 Boarding：



```text

Daily Operations

&#x20;   ↓

交接

&#x20;   ↓

Boarding

&#x20;   ↓

入住

&#x20;   ↓

住宿中

&#x20;   ↓

退房

&#x20;   ↓

Daily Operations

```



Daily Operations：



> 不管理 Boarding 內部住宿生命週期。



\---



\# 29. Boarding Data Ownership



Boarding 核心資料：



> 由 Boarding Block 擁有。



Daily Operations：



> 不建立第二套 Boarding Status。



\---



\# 30. Order Integration



Daily Operations 可以提供：



> Order 操作入口。



例如：



```text

Grooming 完成

&#x20;   ↓

Daily Operations

&#x20;   ↓

建立 / 查看 Order

```



但：



> Order 核心交易資料仍由 Order Block 負責。



\---



\# 31. Payment Integration



Daily Operations 可以銜接：



> Payment 流程。



但：



> Payment 核心資料與 Business Rules 仍由 Payment Block 負責。



例如：



```text

Order

&#x20;   ↓

Checkout

&#x20;   ↓

Payment

&#x20;   ↓

付款完成

&#x20;   ↓

Daily Operations

&#x20;   ↓

COMPLETED

```



\---



\# 32. Notification Integration



Daily Operations：



> 負責產生需要通知的營運事件。



Notification：



> 負責實際通知。



架構：



```text

Daily Operations

&#x20;   ↓

營運事件

&#x20;   ↓

Notification Block

&#x20;   ↓

實際通知 Customer

```



Daily Operations 不建立第二套 Notification 系統。



\---



\# 33. Customer / Pet Quick View



Daily Operations 必須提供：



> Customer / Pet 快速查看入口。



用途：



> 讓櫃台在處理今日工作時快速確認「誰」與「哪一隻 Pet」。



但：



> Customer / Pet Master Data 仍由各自 Block 管理。



\---



\# 34. Appointment Detail Quick View



Daily Operations 工作項目：



> 可以點擊查看 Appointment Detail。



Detail 資料來源：



> Appointment Block。



Daily Operations 不建立第二套 Appointment Detail。



\---



\# 35. Today's Work List



Daily Operations 第一版提供：



> Today's Work List。



主要顯示：



\- Appointment Time

\- Customer

\- Pet

\- Service

\- Appointment Status

\- Daily Operations Status

\- 必要操作



\---



\# 36. Work List Sorting



Today's Work List 預設：



> 依 Appointment Start Time 由早到晚排序。



目的：



> 符合店員實際工作時間順序。



\---



\# 37. Quick Actions



Daily Operations 提供常用快速操作。



至少包含概念：



```text

確認

Check-in

開始處理

完成

通知取件

Checkout

```



實際可用操作：



> 必須依目前 Appointment / Operations Status 決定。



不允許無條件顯示所有操作。



\---



\# 38. Quick Action Responsibility



Quick Action：



> 是 Daily Operations 的操作入口。



但實際 Business Rule：



> 由原始 Block 負責。



例如：



```text

Daily Operations

&#x20;   ↓

確認 Appointment

&#x20;   ↓

Appointment Business Logic

```



而不是：



```text

Daily Operations

&#x20;   ↓

直接修改 Appointment Database

```



\---



\# 39. Today's Summary



Daily Operations 提供基本今日摘要。



例如：



```text

今日預約：10

待到店：4

已到店：2

處理中：2

待取件：1

完成：1

```



摘要目的：



> 協助店員快速掌握今日營運狀況。



\---



\# 40. Basic Alerts



Daily Operations 提供基本需要注意的項目。



例如：



```text

預約已過時間但尚未 Check-in

```



```text

工作已完成但尚未取件

```



```text

今天尚未處理的 Appointment

```



第一版：



> 不建立 AI 異常分析系統。



\---



\# 41. Daily Operations Dashboard



第一版主要 UI：



```text

Daily Operations Dashboard

&#x20;       ↓

Today's Summary

&#x20;       ↓

Today's Work List

&#x20;       ↓

Quick Actions

&#x20;       ↓

Basic Alerts

```



\---



\# 42. UI Structure



至少包含：



```text

Daily Operations Dashboard

Today's Work List

Appointment Detail Quick View

Customer / Pet Quick View

```



Calendar：



> 仍屬 Appointment Block 的檢視能力。



Daily Operations 不另建立第二套 Calendar。



\---



\# 43. Daily Operations API



第一版提供：



> \*\*Daily Operations 專用今日工作 API。\*\*



目的：



> 讓 Frontend 可以取得今日營運所需的操作視圖。



不要求 Frontend 自己大量組合：



```text

Appointment

\+

Customer

\+

Pet

\+

Grooming

\+

Boarding

\+

Order

\+

Payment

```



\---



\# 44. API Responsibility



Daily Operations API：



> 負責提供今日營運操作所需的 View / Operation Interface。



但底層資料：



> 仍由各自 Business Block 負責。



\---



\# 45. API Boundary



Daily Operations API 不應：



\- 複製所有 Block API

\- 取代 Appointment API

\- 取代 Customer API

\- 取代 Pet API

\- 取代 Grooming API

\- 取代 Boarding API

\- 取代 Order API

\- 取代 Payment API



其定位：



> \*\*今日營運的聚合操作入口。\*\*



\---



\# 46. Daily Operations Database Boundary



Daily Operations：



> 可以有自己的必要營運資料。



第一版可能需要保存：



```text

Actual Arrival Time

Daily Operations Status

```



但不保存其他 Block 的 Master Data 副本。



\---



\# 47. Daily Operations Data Ownership



概念上：



```text

Appointment

&#x20;   ↓

Appointment Block



Customer

&#x20;   ↓

Customer Block



Pet

&#x20;   ↓

Pet Block



Daily Operations Status

&#x20;   ↓

Daily Operations Block



Actual Arrival Time

&#x20;   ↓

Daily Operations Block

```



\---



\# 48. Database Principle



Daily Operations Database 必須遵守：



> \*\*最小必要資料原則。\*\*



只保存：



> Daily Operations 自己真正擁有的營運資訊。



避免：



```text

Appointment Copy

Customer Copy

Pet Copy

Service Copy

Order Copy

Payment Copy

```



形成第二套資料來源。



\---



\# 49. Data Conflict Rule



若 Daily Operations 顯示的資料與原始 Block 資料產生衝突：



> \*\*原始資料所屬 Block 擁有最終決定權。\*\*



例如：



```text

Customer

→ Customer Block



Appointment

→ Appointment Block



Grooming

→ Grooming Block

```



Daily Operations：



> 不具有凌駕其他 Block 的資料權限。



\---



\# 50. Backend Architecture



Daily Operations Backend：



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



若需要與其他 Block 協作：



```text

Daily Operations Business Logic

&#x20;       ↓

其他 Block Business Logic / Data Access

```



必須避免直接繞過 Business Rule 修改其他 Block 核心資料。



\---



\# 51. Controller Responsibility



Controller 負責：



\- HTTP Request

\- Request Parameters

\- Request Mapping

\- 呼叫 Business Logic

\- Response Mapping

\- HTTP Status



Controller：



> 不承擔主要 Daily Operations Business Rules。



\---



\# 52. Business Logic Responsibility



Daily Operations Business Logic 負責：



\- 今日工作查詢

\- Daily Operations Status

\- Check-in

\- Actual Arrival Time

\- Quick Actions

\- 今日摘要

\- 基本 Alerts

\- 跨 Block 操作協調

\- 營運流程銜接



但：



> 其他 Block 的核心 Business Rules 必須交給原始 Block。



\---



\# 53. Data Access Responsibility



Data Access 負責：



\- SQL

\- Daily Operations Data SELECT

\- Daily Operations Data INSERT

\- Daily Operations Data UPDATE

\- Today's Work List Query

\- Summary Query

\- Filter

\- Sorting

\- Pagination（若需要）



Data Access：



> 不承擔主要 Business Rules。



\---



\# 54. ORM Policy



Daily Operations：



> 不使用 ORM。



Database Access：



> 使用 mysql2。



\---



\# 55. Validation Architecture



Daily Operations Validation：



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



\# 56. Check-in Validation



Check-in 至少驗證：



\- Appointment 存在

\- Appointment 可進行 Check-in

\- Customer 存在

\- Pet 存在

\- Appointment Status 合法

\- Daily Operations Status 合法

\- Actual Arrival Time 有效



Check-in 成功後：



```text

Daily Operations Status

=

CHECKED\_IN

```



\---



\# 57. Work Start Validation



開始工作前：



> Appointment 必須已完成必要的 Check-in 流程。



基本：



```text

WAITING

&#x20;   ↓

CHECKED\_IN

&#x20;   ↓

IN\_PROGRESS

```



不得直接跳過必要營運狀態。



\---



\# 58. Completion Validation



Daily Operations 不應在工作尚未完成時直接：



```text

IN\_PROGRESS

→ COMPLETED

```



必須依實際工作 Block 的結果與後續營運流程決定。



\---



\# 59. Waiting Pickup Validation



當：



```text

Grooming / Boarding

```



完成後：



> Daily Operations 可以進入 WAITING\_PICKUP。



代表：



> 工作完成，但客戶尚未完成取件流程。



\---



\# 60. Checkout Completion



完成：



```text

Customer Pickup

\+

必要 Order / Payment

```



後：



```text

WAITING\_PICKUP

&#x20;   ↓

COMPLETED

```



實際 Order / Payment Business Rules：



> 仍由各自 Block 負責。



\---



\# 61. Daily Operations Error Handling



錯誤必須清楚表示：



\- 無效 Appointment

\- 不合法 Status Transition

\- 已取消 Appointment

\- 已完成 Appointment

\- 重複 Check-in

\- 無法開始工作

\- 必要資料不存在

\- 跨 Block 操作失敗



不得讓 Frontend 只能看到：



```text

500 Internal Server Error

```



而無法理解原因。



\---



\# 62. Unit Test



Daily Operations Unit Test 至少驗證：



\- Today's Work List

\- Check-in

\- Actual Arrival Time

\- Status Transition

\- Work Start

\- Waiting Pickup

\- Completion

\- Invalid Transition

\- Cancelled Appointment

\- Completed Appointment

\- Basic Alerts

\- Summary Calculation



Testing Framework：



> Jest



\---



\# 63. API Integration Test



使用：



> Jest + Supertest



至少驗證：



\- Today's Operations API

\- Check-in API

\- Status Operation API

\- Detail / Quick View API（若提供）

\- Error Handling

\- Business Rule

\- Database Result



\---



\# 64. Browser Verification



Browser 必須實際驗證：



```text

Daily Operations Dashboard

&#x20;   ↓

查看今日摘要

&#x20;   ↓

查看 Today's Work List

&#x20;   ↓

查看 Customer / Pet

&#x20;   ↓

查看 Appointment Detail

&#x20;   ↓

Check-in

&#x20;   ↓

確認 CHECKED\_IN

&#x20;   ↓

開始工作

&#x20;   ↓

確認 IN\_PROGRESS

&#x20;   ↓

Grooming / Boarding 完成

&#x20;   ↓

WAITING\_PICKUP

&#x20;   ↓

Customer Pickup / Checkout

&#x20;   ↓

COMPLETED

```



\---



\# 65. Quick Action Verification



Browser 必須確認：



\- 操作按鈕依狀態正確顯示

\- 不合法操作不可執行

\- 合法操作成功

\- Status 正確更新

\- 原始 Block 資料正確更新

\- Daily Operations 狀態正確更新



\---



\# 66. Notification Verification



若營運事件需要 Notification：



```text

Daily Operations

&#x20;   ↓

事件

&#x20;   ↓

Notification

```



必須確認：



> Daily Operations 不直接取代 Notification 的實際通知責任。



\---



\# 67. Cross-Block Verification



至少驗證：



```text

Appointment

&#x20;   ↓

Daily Operations

&#x20;   ↓

Grooming / Boarding

&#x20;   ↓

Order

&#x20;   ↓

Payment

&#x20;   ↓

Daily Operations

```



確認各 Block 的責任沒有互相取代。



\---



\# 68. Daily Operations Happy Path



完整 MVP Happy Path：



```text

Appointment

&#x20;   ↓

CONFIRMED

&#x20;   ↓

Daily Operations

&#x20;   ↓

WAITING

&#x20;   ↓

Customer / Pet 到店

&#x20;   ↓

Check-in

&#x20;   ↓

CHECKED\_IN

&#x20;   ↓

開始工作

&#x20;   ↓

IN\_PROGRESS

&#x20;   ↓

Grooming / Boarding

&#x20;   ↓

工作完成

&#x20;   ↓

WAITING\_PICKUP

&#x20;   ↓

Customer Pickup

&#x20;   ↓

Order / Payment

&#x20;   ↓

COMPLETED

```



\---



\# 69. Definition of Done



PHASE 17 Daily Operations Block 的實作完成條件：



\- Daily Operations Dashboard 完成

\- Today's Work List 完成

\- Today's Summary 完成

\- Basic Alerts 完成

\- Customer / Pet Quick View 完成

\- Appointment Detail Quick View 完成

\- Check-in 完成

\- Actual Arrival Time 完成

\- Daily Operations Status 完成

\- Quick Actions 完成

\- Grooming Integration 完成

\- Boarding Integration 完成

\- Order Integration 完成

\- Payment Integration 完成

\- Notification Event Integration 完成

\- Daily Operations API 完成

\- Business Logic 完成

\- Data Access 完成

\- Validation 完成

\- Unit Test 完成

\- API Integration Test 完成

\- Browser Verification 完成

\- Happy Path 通過

\- Daily Operations Block PASS



\---



\# 70. MVP Explicitly Excluded



PHASE 17 不包含：



\- 完整 Workflow Engine

\- AI Workflow

\- AI 異常分析

\- 複雜排班

\- Resource Scheduling

\- 自動派工

\- Staff Capacity Optimization

\- Room Capacity Optimization

\- 完整 BI Dashboard

\- 預測分析

\- Customer Master Data

\- Pet Master Data

\- Appointment Master Data

\- Grooming Master Data

\- Boarding Master Data

\- Order Master Data

\- Payment Master Data

\- 第二套 Notification 系統



這些不屬於 PHASE 17 MVP v1.0。



\---



\# 71. Decision Summary



PHASE 17 Q1～Q40 全部採用 AI 推薦方案。



核心決策：



```text

Daily Operations

=

今日營運操作中心

```



```text

Today's Data

=

Appointment Date = Today

```



```text

Daily Operations

≠

Appointment Data Source

```



```text

Daily Operations

≠

Other Block Data Owner

```



Daily Operations Status：



```text

WAITING

CHECKED\_IN

IN\_PROGRESS

WAITING\_PICKUP

COMPLETED

```



Check-in：



```text

Check-in

\+

Actual Arrival Time

=

Daily Operations Responsibility

```



```text

Check-in

≠

Appointment COMPLETED

```



```text

Appointment Status

≠

Daily Operations Status

```



Grooming：



```text

Daily Operations

&#x20;   ↓

交接

&#x20;   ↓

Grooming

```



Boarding：



```text

Daily Operations

&#x20;   ↓

交接

&#x20;   ↓

Boarding

```



Order / Payment：



```text

Daily Operations

&#x20;   ↓

操作入口

&#x20;   ↓

Order / Payment Block

```



Notification：



```text

Daily Operations

&#x20;   ↓

事件

&#x20;   ↓

Notification

&#x20;   ↓

實際通知

```



UI：



```text

Dashboard

\+

Today's Work List

\+

Summary

\+

Basic Alerts

\+

Quick Actions

\+

Quick View

```



Testing：



```text

Unit Test

\+

API Integration Test

\+

Browser Verification

```



PASS：



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

Daily Operations Happy Path

&#x20;   ↓

PASS

```



\---



\# 72. Freeze Statement



本文件代表：



> \*\*PHASE 17 — Daily Operations 日常營運管理區塊定義與實作規格 v1.0 正式 FREEZE。\*\*



Freeze 範圍包含：



\- Daily Operations Responsibility

\- Daily Operations Boundary

\- Today's Operations

\- Appointment Integration

\- Check-in

\- Actual Arrival Time

\- Daily Operations Status

\- Appointment Status Boundary

\- Grooming Integration

\- Boarding Integration

\- Order Integration

\- Payment Integration

\- Notification Integration

\- Today's Work List

\- Today's Summary

\- Basic Alerts

\- Quick Actions

\- Customer / Pet Quick View

\- Appointment Detail Quick View

\- API Boundary

\- Database Boundary

\- Backend Responsibility

\- Validation

\- Error Handling

\- Testing

\- Browser Verification

\- Happy Path

\- Definition of Done

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



\# 73. Change Request Rule



Freeze 後若需修改，必須提出：



1\. 哪個 Freeze 決策需要修改

2\. 發生什麼問題

3\. 為什麼原方案不可行

4\. 新方案

5\. 影響範圍

6\. 是否值得重新開啟 Freeze



未經確認：



> 不得自行修改 PHASE 17 Freeze。



\---



\# 74. Phase Completion



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

```



Daily Operations Block 正式完成：



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

