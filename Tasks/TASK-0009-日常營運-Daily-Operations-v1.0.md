\# TASK-0009 日常營運 Daily Operations v1.0



\## 1. Document Information



| Field | Value |

|---|---|

| Task ID | TASK-0009 |

| 中文名稱 | 日常營運 |

| 英文名稱 | Daily Operations |

| Version | v1.0 |

| Status | READY FOR CODING |

| Type | MVP Business Block |

| Previous Task | TASK-0008 — Service Management |

| Primary Route | `/operations` |

| Formal Filename | `TASK-0009-日常營運-Daily-Operations-v1.0.md` |



\---



\## 2. Task Objective



TASK-0009 負責建立 MVP 的 Daily Operations（日常營運）Block。



核心目的：



> 將既有 Appointment 轉化為店家「今天實際要處理什麼」的營運工作入口。



Daily Operations 必須讓店家能夠：



\- 查看今日需要處理的 Appointment

\- 查看 Customer

\- 查看 Pet

\- 查看 Appointment 所包含的 Service

\- 查看預約時間

\- Check-in

\- 管理目前通用工作執行狀態

\- 記錄 Check-in Time

\- 記錄 Started Time

\- 記錄 Completed Time

\- 指派或重新指派 Responsible Staff

\- 維護目前 Work Note

\- 依必要條件搜尋與篩選今日工作



Daily Operations 不負責 Grooming、Boarding、Order、Payment 等後續 Block 的詳細業務邏輯。



\---



\## 3. Business Context



MVP 核心營運流程：



&#x20;   Customer

&#x20;       ↓

&#x20;   Pet

&#x20;       ↓

&#x20;   Appointment

&#x20;       ↓

&#x20;   Daily Operations

&#x20;       ↓

&#x20;   Check-in

&#x20;       ↓

&#x20;   工作執行

&#x20;       ↓

&#x20;   Grooming / Boarding

&#x20;       ↓

&#x20;   Order

&#x20;       ↓

&#x20;   Payment



各 Block 的責任：



| Block | Responsibility |

|---|---|

| Customer | Customer 資料管理 |

| Pet | Pet 資料管理 |

| Appointment | 預約建立與 Appointment Lifecycle |

| Daily Operations | 今日工作入口與通用工作狀態 |

| Grooming | 美容詳細執行 |

| Boarding | 住宿詳細生命週期 |

| Order | 訂單 |

| Payment | 收款 |



TASK-0009 僅負責：



> Daily Operations。



\---



\## 4. Scope



\### 4.1 In Scope



TASK-0009 必須包含：



1\. Daily Operations 頁面

2\. `/operations` Route

3\. 今日 Appointment 工作列表

4\. Customer 顯示

5\. Pet 顯示

6\. Service 顯示

7\. 預約開始時間與結束時間顯示

8\. Daily Operations 工作狀態

9\. Check-in

10\. Check-in 撤銷

11\. Started Time

12\. Completed Time

13\. Responsible Staff 顯示

14\. Responsible Staff 重新指派

15\. Work Note

16\. 今日全部 Filter

17\. 待處理 Filter

18\. 已完成 Filter

19\. Service Type Filter

20\. DOG / CAT Filter

21\. Work Status Filter

22\. Customer / Pet / Phone 單一搜尋

23\. Customer 詳情入口

24\. Pet 詳情入口

25\. 既有 Service 規則沿用

26\. 既有 Staff / Authorization 規則沿用

27\. API Tests

28\. State Transition Tests

29\. Check-in Tests

30\. Staff Assignment Tests

31\. Daily Operations UI Tests

32\. Browser Verification



\### 4.2 Primary Data Source



Daily Operations：



> 以既有 Appointment 為主要資料來源。



不建立完整獨立 Work Order 系統。



一個 Daily Operations 主體對應一個 Appointment。



\### 4.3 Multiple Pet Rule



如果一個 Appointment 有多隻 Pet：



> 在同一 Appointment 下分別顯示各 Pet。



不得因多隻 Pet 建立多筆 Daily Operations 主資料。



\### 4.4 Multiple Service Rule



如果一個 Appointment 包含多個 Service：



> 在同一 Appointment 下顯示完整 Service 明細。



不得將每個 Service 拆成獨立 Daily Operation。



\---



\## 5. Out of Scope



TASK-0009 不得實作：



\- Grooming 詳細流程

\- Grooming 詳細執行資料模型

\- Boarding 詳細流程

\- Boarding 住宿生命週期

\- Order

\- Payment

\- Product

\- Report

\- 完整 Walk-in

\- 完整獨立 Work Order 系統

\- Workflow Engine

\- 可自訂工作狀態

\- 完整 Status History

\- Audit Log

\- Event History System

\- Event Sourcing

\- Staff Assignment History

\- Staff Performance Dashboard

\- Staff 工作量統計

\- 複雜進階搜尋系統

\- Appointment 時間修改

\- Appointment Lifecycle 修改

\- Customer 修改

\- Pet 修改

\- Service 修改

\- Payment Status 管理

\- 新增 Service Species Compatibility 規則

\- 新的 RBAC 系統

\- Multi-tenant 架構

\- Enterprise Workflow

\- 任何未列入本 TASK Scope 的額外功能



\---



\## 6. Core Design Principles



\### 6.1 Minimal MVP



遵守：



> 該寫的才寫。



Daily Operations 必須使用最小且足夠的資料與程式結構完成需求。



\### 6.2 Reuse Existing Data



優先重用既有：



\- Appointment

\- Customer

\- Pet

\- Service

\- Staff

\- Authentication

\- Authorization



不得重複建立相同主資料。



\### 6.3 No Workflow Engine



Daily Operations 只需要固定的最小狀態轉換。



不得建立：



\- Workflow Engine

\- State Configuration System

\- Custom Workflow

\- Dynamic State Designer



\### 6.4 No Full Audit System



只保存目前必要營運資料。



不得建立完整：



\- Status History

\- Audit Timeline

\- Event Log

\- Notes History



\---



\# 7. Functional Requirements



\## 7.1 Today's Operations



Daily Operations 預設以「今日」為主要工作範圍。



列表必須讓店家快速了解：



\- 今天有哪些工作

\- 幾點開始

\- 哪位 Customer

\- 哪隻 Pet

\- 做哪些 Service

\- 誰負責

\- 目前做到哪裡



主要排序：



> Appointment Start Time 升冪。



\---



\## 7.2 Appointment Source



Daily Operations 以 Appointment 為來源。



Daily Operations 不建立獨立預約資料。



Appointment Lifecycle 仍由 Appointment Management 負責。



\---



\## 7.3 Cancelled Appointment



已取消 Appointment：



> 預設不顯示於 Daily Operations 今日工作列表。



取消判斷必須沿用既有 Appointment Lifecycle。



Daily Operations 不建立 `CANCELLED` 狀態。



\---



\## 7.4 Not Checked-in Appointment



尚未 Check-in 的 Appointment：



> 必須仍然顯示。



狀態：



`SCHEDULED`



\---



\## 7.5 Completed Operation



已完成工作：



> 必須仍保留在今日列表。



狀態：



`COMPLETED`



\---



\## 7.6 Appointment Modification Boundary



Daily Operations 不得修改：



\- Appointment Start Time

\- Appointment End Time

\- Appointment Lifecycle

\- Appointment 其他預約核心資料



如果需要修改 Appointment：



> 導回 Appointment Management。



\---



\# 8. Daily Operations State Model



\## 8.1 States



Daily Operations 使用獨立於 Appointment Status 的最小營運狀態：



&#x20;   SCHEDULED

&#x20;       ↓

&#x20;   CHECKED\_IN

&#x20;       ↓

&#x20;   IN\_PROGRESS

&#x20;       ↓

&#x20;   COMPLETED



Allowed States：



\- `SCHEDULED`

\- `CHECKED\_IN`

\- `IN\_PROGRESS`

\- `COMPLETED`



\---



\## 8.2 Allowed State Transitions



允許：



| From | To | Purpose |

|---|---|---|

| SCHEDULED | CHECKED\_IN | Check-in |

| CHECKED\_IN | SCHEDULED | 撤銷 Check-in |

| CHECKED\_IN | IN\_PROGRESS | 開始工作 |

| IN\_PROGRESS | CHECKED\_IN | 退回已到店 |

| CHECKED\_IN | COMPLETED | 直接完成 |

| IN\_PROGRESS | COMPLETED | 完成工作 |

| COMPLETED | IN\_PROGRESS | 重新開始 |



不得允許其他任意狀態轉換。



\---



\## 8.3 SCHEDULED



代表：



> Appointment 已存在，尚未完成 Check-in。



UI 必須提供：



\- Check-in



\---



\## 8.4 CHECKED\_IN



代表：



> Customer / Pet 已到店，工作尚未開始或目前停留在已到店狀態。



UI 可提供：



\- 開始工作

\- 完成

\- 撤銷 Check-in



\---



\## 8.5 IN\_PROGRESS



代表：



> 工作目前正在執行。



UI 可提供：



\- 完成

\- 退回已到店



\---



\## 8.6 COMPLETED



代表：



> Daily Operations 工作已完成。



UI 可提供：



\- 重新開始



\---



\# 9. Check-in Requirements



\## 9.1 Check-in



執行 Check-in：



&#x20;   SCHEDULED → CHECKED\_IN



系統必須：



1\. 驗證目前狀態為 `SCHEDULED`

2\. 更新 Operations Status

3\. 記錄 Check-in Time



Check-in Time 必須由後端建立。



\---



\## 9.2 Undo Check-in



撤銷 Check-in：



&#x20;   CHECKED\_IN → SCHEDULED



系統必須：



1\. 驗證目前狀態為 `CHECKED\_IN`

2\. 更新 Operations Status

3\. 撤銷 Check-in 狀態



不得建立 Check-in History。



\---



\# 10. Time Requirements



Daily Operations 至少保存：



| Field | Purpose |

|---|---|

| Check-in Time | Customer / Pet 到店時間 |

| Started Time | 工作開始時間 |

| Completed Time | 工作完成時間 |



時間值應由後端產生或更新。



前端不得被視為可信任的目前時間來源。



不得建立：



\- 完整事件時間軸

\- Status Event History

\- Audit Timeline

\- Event Sourcing



\---



\# 11. Customer Requirements



Daily Operations 可以顯示：



\- Customer Name

\- 主要聯絡電話



Daily Operations 可以提供：



> Customer Management 詳情入口。



Daily Operations 不得直接修改 Customer。



Customer 資料維護由 Customer Management 負責。



\---



\# 12. Pet Requirements



Daily Operations 可以顯示：



\- Pet Name

\- Pet Species

\- 必要 Pet 基本資訊



Daily Operations 可以提供：



> Pet Management 詳情入口。



Daily Operations 不得直接修改 Pet。



Pet 資料維護由 Pet Management 負責。



\---



\# 13. Service Requirements



Daily Operations 必須顯示 Appointment 所包含的完整 Service 明細。



一個 Appointment 可以包含多個 Service。



Service 顯示：



\- Service Name

\- 必要 Service Type / Category 資訊



價格不作為 Daily Operations 核心營運資訊。



Daily Operations 不得：



\- 修改 Service

\- 拆分 Service 為獨立工作項目

\- 建立新的 Service Compatibility 規則

\- 重複實作 Service Management 已存在的規則



\---



\## 13.1 Inactive Service



如果既有 Appointment 使用的 Service 後來變成：



`INACTIVE`



既有 Appointment：



> 仍必須正常顯示。



Daily Operations 不得因 Service 為 INACTIVE 而破壞既有 Appointment。



\---



\## 13.2 Deleted Service



如果 Service 存在既有歷史關聯：



> 沿用既有 FK / Delete Protection 規則。



TASK-0009 不重新設計 Service Delete Policy。



\---



\# 14. Responsible Staff Requirements



Daily Operations 必須：



\- 顯示目前 Responsible Staff

\- 允許重新指派 Responsible Staff



重新指派後：



> Daily Operations 必須使用新的 Responsible Staff。



系統不得建立：



\- Staff Assignment History

\- Staff Performance Dashboard

\- Staff 工作量統計

\- 排班系統

\- Staff Scheduling Engine



Authorization 必須沿用既有：



\- Staff

\- Authentication

\- Authorization



架構。



不得於 TASK-0009 建立新的 RBAC。



\---



\# 15. Work Note Requirements



Daily Operations 必須提供目前 Work Note。



用途包括：



\- 已通知客人

\- 等待接送

\- 當日營運備註

\- 其他必要現場工作資訊



只保存：



> 目前 Work Note。



不得建立：



\- Notes History

\- Timeline

\- Audit Log

\- Note Event System



\---



\# 16. Search Requirements



Daily Operations 必須提供單一搜尋入口。



搜尋範圍：



\- Customer Name

\- Pet Name

\- Customer Phone



搜尋方式保持簡單。



不得建立：



\- Advanced Search Builder

\- 複雜多條件查詢介面

\- Query Builder

\- Saved Search System



\---



\# 17. Filter Requirements



Daily Operations 必須提供以下必要 Filter。



\## 17.1 Today's All



顯示今日符合條件的全部工作。



\## 17.2 Pending



顯示尚未完成的工作：



\- `SCHEDULED`

\- `CHECKED\_IN`

\- `IN\_PROGRESS`



\## 17.3 Completed



顯示：



\- `COMPLETED`



\## 17.4 Service Type



依 Appointment Service Type 篩選。



\## 17.5 Species



至少支援：



\- `DOG`

\- `CAT`



\## 17.6 Work Status



依以下狀態篩選：



\- `SCHEDULED`

\- `CHECKED\_IN`

\- `IN\_PROGRESS`

\- `COMPLETED`



\---



\# 18. UI Requirements



\## 18.1 Route



建立獨立頁面：



&#x20;   /operations



Daily Operations 不得將完整營運功能塞入首頁。



\---



\## 18.2 Page Purpose



`/operations` 必須成為：



> 店家每日工作主要入口。



頁面優先呈現：



1\. 今日工作

2\. 工作時間

3\. Customer

4\. Pet

5\. Service

6\. Responsible Staff

7\. Work Status

8\. 快速操作



\---



\## 18.3 Page Structure



頁面至少包含：



&#x20;   Daily Operations



&#x20;   \[今日日期]



&#x20;   \[搜尋 Customer / Pet / Phone]



&#x20;   \[今日全部] \[待處理] \[已完成]



&#x20;   \[Service Type]

&#x20;   \[Dog / Cat]

&#x20;   \[工作狀態]



&#x20;   今日工作列表



&#x20;   時間

&#x20;   Customer

&#x20;   Pet

&#x20;   Service

&#x20;   Staff

&#x20;   Status

&#x20;   操作



實際 UI 必須沿用目前專案既有 Bootstrap 與視覺規範。



\---



\## 18.4 List Display



每筆 Daily Operation 至少顯示：



\- Appointment Start Time

\- Appointment End Time

\- Customer

\- Pet

\- Service

\- Responsible Staff

\- Operations Status

\- Check-in 狀態

\- 必要操作



排序：



> Appointment Start Time ASC。



\---



\## 18.5 Status Actions



UI 必須依目前狀態提供合法操作。



\### SCHEDULED



提供：



\- Check-in



\### CHECKED\_IN



提供：



\- 開始工作

\- 完成

\- 撤銷 Check-in



\### IN\_PROGRESS



提供：



\- 完成

\- 退回已到店



\### COMPLETED



提供：



\- 重新開始



不得顯示不符合 State Model 的狀態操作。



\---



\# 19. Navigation Requirements



Daily Operations 可以提供：



\- Customer 詳情入口

\- Pet 詳情入口



導向既有 Management 頁面。



Daily Operations 只負責：



> 查看與導覽。



不得直接承擔 Customer / Pet Management。



\---



\# 20. API Requirements



API 必須遵循現有 Express.js Backend 架構、命名規則、Validation 模式與 Error Handling 模式。



至少必須支援以下能力。



\## 20.1 Get Daily Operations



用途：



> 取得指定日期的 Daily Operations，第一版主要使用今日。



必須支援必要查詢條件：



\- Date

\- Status

\- Service Type

\- Species

\- Search



預設排序：



> Appointment Start Time ASC。



\---



\## 20.2 Check-in API



用途：



> `SCHEDULED → CHECKED\_IN`



後端必須：



1\. 驗證 Daily Operation / Appointment 存在

2\. 驗證目前狀態

3\. 驗證 State Transition

4\. 更新 Operations Status

5\. 記錄 Check-in Time



\---



\## 20.3 Undo Check-in API



用途：



> `CHECKED\_IN → SCHEDULED`



後端必須：



1\. 驗證資料存在

2\. 驗證目前狀態

3\. 驗證 State Transition

4\. 更新 Operations Status



\---



\## 20.4 Start Work API



用途：



> `CHECKED\_IN → IN\_PROGRESS`



後端必須：



1\. 驗證資料存在

2\. 驗證目前狀態

3\. 驗證 State Transition

4\. 更新 Operations Status

5\. 記錄 Started Time



\---



\## 20.5 Complete Work API



用途：



> `CHECKED\_IN → COMPLETED`



或：



> `IN\_PROGRESS → COMPLETED`



後端必須：



1\. 驗證資料存在

2\. 驗證目前狀態

3\. 驗證 State Transition

4\. 更新 Operations Status

5\. 記錄 Completed Time



\---



\## 20.6 Reopen Work API



用途：



> `COMPLETED → IN\_PROGRESS`



後端必須：



1\. 驗證資料存在

2\. 驗證目前狀態

3\. 驗證 State Transition

4\. 更新 Operations Status



\---



\## 20.7 Staff Assignment API



用途：



> 更新 Responsible Staff。



後端必須：



1\. 驗證 Staff 存在

2\. 驗證 Staff 可被目前系統使用

3\. 驗證目前使用者具有必要權限

4\. 更新 Responsible Staff



不得建立 Staff Assignment History。



\---



\## 20.8 Work Note API



用途：



> 更新目前 Work Note。



後端必須：



1\. 驗證資料

2\. 驗證必要輸入格式

3\. 儲存目前 Work Note



不得建立 Notes History。



\---



\# 21. Data Requirements



\## 21.1 Data Ownership



Appointment 仍然是 Appointment Management 的主要資料。



Daily Operations 只保存：



> 營運執行所需要的最小資料。



\---



\## 21.2 Appointment Reference



Daily Operations 必須能唯一對應既有 Appointment。



必須避免：



\- Duplicate Daily Operation

\- 一個 Appointment 產生多筆主 Daily Operation

\- 重複建立 Appointment 資料



\---



\## 21.3 Referential Integrity



Daily Operations 與 Appointment 的關聯必須維持資料完整性。



不得破壞：



\- Appointment

\- Customer

\- Pet

\- Service

\- Staff



既有關聯。



實際 FK 與資料庫 Constraint 應遵循目前 Repository 已存在的資料模型與命名方式。



\---



\## 21.4 Existing Historical Data



既有 Appointment 所引用的 Customer、Pet、Service 必須能正常顯示。



Service 變為 INACTIVE 不得使既有 Appointment 無法顯示。



\---



\# 22. Authorization Requirements



Daily Operations 必須沿用既有 Authentication / Authorization 架構。



TASK-0009 不建立新的角色模型。



現有 Staff 角色與權限應依既有專案規則處理。



任何會改變資料的 API 必須進行後端 Authorization。



至少包含：



\- Check-in

\- Undo Check-in

\- Start Work

\- Complete Work

\- Reopen Work

\- Staff Assignment

\- Work Note Update



不得只依賴前端隱藏按鈕。



\---



\# 23. Validation Requirements



所有寫入操作必須由 Backend 驗證。



\## 23.1 State Validation



Backend 必須驗證目前狀態是否允許目標狀態。



例如：



&#x20;   SCHEDULED → COMPLETED



不得直接接受。



因為此 Transition 不在 Allowed State Transitions 中。



\---



\## 23.2 Entity Validation



Backend 必須確認：



\- Appointment 存在

\- Daily Operation 對應資料存在

\- Staff 存在

\- 必要輸入符合格式



\---



\## 23.3 Search Validation



搜尋輸入必須使用現有專案適當的 Query Parameter Validation 與 SQL Parameter Binding。



不得將使用者輸入直接拼接至 SQL。



\---



\## 23.4 Error Handling



API 必須沿用既有專案 Error Handling 模式。



至少能正確處理：



\- 不存在的資料

\- 非法狀態轉換

\- 非法 Staff

\- 未授權操作

\- Invalid Input

\- Database Error



不得因錯誤而產生部分更新的錯誤資料狀態。



\---



\# 24. Transaction Requirements



涉及多個資料欄位需要同步更新的操作，必須確保資料一致性。



例如：



&#x20;   Status Update

&#x20;       +

&#x20;   Started Time



或：



&#x20;   Status Update

&#x20;       +

&#x20;   Completed Time



若既有資料庫操作模式需要 Transaction，應使用目前專案既有 MySQL / mysql2 Transaction 模式。



不得引入新的 ORM。



不得使用 Prisma。



\---



\# 25. Technology Constraints



TASK-0009 必須遵循目前 MVP Technical Baseline：



| Layer | Technology |

|---|---|

| Frontend | Next.js Pages Router |

| Frontend Language | JavaScript |

| UI | Bootstrap |

| Backend | Express.js |

| Backend Language | JavaScript |

| Database | MySQL |

| DB Driver | mysql2 |

| ORM | None |

| Testing | Jest + Supertest |



禁止：



\- TypeScript

\- Tailwind

\- Prisma

\- 其他未核准 ORM

\- Enterprise Framework

\- 不必要的架構抽象



\---



\# 26. Testing Requirements



TASK-0009 必須完成 Automated Tests。



\## 26.1 API Tests



至少驗證：



\- Daily Operations List

\- Search

\- Status Filter

\- Service Type Filter

\- Species Filter

\- Check-in

\- Undo Check-in

\- Start Work

\- Complete Work

\- Reopen Work

\- Staff Assignment

\- Work Note



\---



\## 26.2 State Transition Tests



必須驗證所有合法 Transition：



&#x20;   SCHEDULED → CHECKED\_IN

&#x20;   CHECKED\_IN → SCHEDULED

&#x20;   CHECKED\_IN → IN\_PROGRESS

&#x20;   IN\_PROGRESS → CHECKED\_IN

&#x20;   CHECKED\_IN → COMPLETED

&#x20;   IN\_PROGRESS → COMPLETED

&#x20;   COMPLETED → IN\_PROGRESS



必須驗證非法 Transition 會被拒絕。



至少包含：



&#x20;   SCHEDULED → IN\_PROGRESS

&#x20;   SCHEDULED → COMPLETED

&#x20;   IN\_PROGRESS → SCHEDULED

&#x20;   COMPLETED → SCHEDULED

&#x20;   COMPLETED → CHECKED\_IN



\---



\## 26.3 Check-in Tests



必須驗證：



\- Check-in 成功

\- Check-in Time 建立

\- 重複 Check-in 被拒絕

\- Undo Check-in 成功

\- 非法 Undo Check-in 被拒絕



\---



\## 26.4 Time Tests



必須驗證：



\- Check-in Time 正確保存

\- Started Time 正確保存

\- Completed Time 正確保存

\- 狀態變更與時間資料保持一致



\---



\## 26.5 Staff Assignment Tests



必須驗證：



\- Staff Assignment 成功

\- 不存在的 Staff 被拒絕

\- 未授權操作被拒絕

\- 重新指派成功

\- 不建立 Staff Assignment History



\---



\## 26.6 Work Note Tests



必須驗證：



\- Work Note 建立

\- Work Note 更新

\- Invalid Input 被拒絕

\- 只保存目前 Work Note



\---



\## 26.7 Search / Filter Tests



至少驗證：



\- 今日全部

\- 待處理

\- 已完成

\- Service Type

\- DOG

\- CAT

\- Work Status

\- Customer Search

\- Pet Search

\- Phone Search



\---



\## 26.8 Historical Service Tests



必須驗證：



> Appointment 使用的 Service 變為 INACTIVE 後，既有 Appointment 仍可於 Daily Operations 正常顯示。



\---



\## 26.9 Multiple Pet Tests



必須驗證：



> 一個 Appointment 包含多隻 Pet 時，仍只存在一個 Daily Operations 主體，並正確顯示各 Pet。



\---



\## 26.10 Multiple Service Tests



必須驗證：



> 一個 Appointment 包含多個 Service 時，仍只存在一個 Daily Operations 主體，並正確顯示完整 Service 明細。



\---



\# 27. UI Testing Requirements



必須驗證：



\- `/operations` 可以正常開啟

\- 今日列表可以載入

\- Customer 正確顯示

\- Pet 正確顯示

\- Service 正確顯示

\- Appointment Time 正確顯示

\- Staff 正確顯示

\- Status 正確顯示

\- Check-in 操作可用

\- 狀態操作依目前狀態變化

\- Search 可用

\- Filters 可用

\- Customer Navigation 可用

\- Pet Navigation 可用

\- Work Note 可用

\- Staff Assignment 可用



\---



\# 28. Browser Verification



正式完成 TASK-0009 前，必須進行 Browser Verification。



\## 28.1 Entry



驗證：



\- Login

\- 進入 `/operations`

\- Daily Operations Page 正常載入



\## 28.2 Today's List



驗證：



\- 今日 Appointment 正確顯示

\- Cancelled Appointment 不顯示

\- 未 Check-in Appointment 顯示

\- Completed Appointment 仍保留

\- 時間排序正確



\## 28.3 Check-in Workflow



驗證：



&#x20;   SCHEDULED

&#x20;       ↓

&#x20;   Check-in

&#x20;       ↓

&#x20;   CHECKED\_IN



確認：



\- Status 更新

\- Check-in Time 顯示



\## 28.4 Work Workflow



驗證：



&#x20;   CHECKED\_IN

&#x20;       ↓

&#x20;   IN\_PROGRESS

&#x20;       ↓

&#x20;   COMPLETED



確認：



\- Started Time

\- Completed Time

\- Status



均正確。



\## 28.5 Reversal Workflow



驗證：



&#x20;   CHECKED\_IN → SCHEDULED



以及：



&#x20;   IN\_PROGRESS → CHECKED\_IN



以及：



&#x20;   COMPLETED → IN\_PROGRESS



均能正常操作。



\## 28.6 Staff



驗證：



\- 顯示 Responsible Staff

\- 重新指派 Staff

\- Reload 後資料仍存在



\## 28.7 Work Note



驗證：



\- 建立 Work Note

\- 修改 Work Note

\- Reload 後資料仍存在



\## 28.8 Search / Filter



至少驗證：



\- Customer Search

\- Pet Search

\- Phone Search

\- Service Type Filter

\- DOG / CAT Filter

\- Status Filter

\- Pending

\- Completed



\---



\# 29. Regression Requirements



TASK-0009 完成後，不得破壞既有功能。



至少確認：



\- Authentication 正常

\- Staff 功能正常

\- Shop Settings 正常

\- Customer Management 正常

\- Pet Management 正常

\- Service Management 正常

\- Appointment Management 正常

\- TASK-0008 Service Management 功能正常



尤其必須確認：



> Daily Operations 對既有 Appointment 的讀取不會破壞 Appointment Management。



\---



\# 30. Error Handling



以下情況必須由 Backend 正確拒絕或回傳適當錯誤：



\- Appointment 不存在

\- Daily Operation 不存在

\- Staff 不存在

\- 非法 State Transition

\- 未授權操作

\- Invalid Input

\- Database Failure

\- 不合法的搜尋或 Filter 參數



Frontend 必須：



\- 顯示可理解的錯誤訊息

\- 不假設 API 成功

\- 不在 API 失敗後錯誤顯示成功狀態

\- 不因錯誤導致 UI 狀態與 Backend 狀態不一致



\---



\# 31. Implementation Boundary



AI Coding 實作時必須遵守以下邊界。



\## 31.1 Must Implement



\- Daily Operations Backend

\- Daily Operations Data Persistence

\- Daily Operations API

\- State Transition Logic

\- Check-in Logic

\- Staff Assignment

\- Work Note

\- Daily Operations UI

\- Search

\- Filters

\- Tests

\- Browser Verification Support



\## 31.2 Must Reuse



\- Existing Appointment

\- Existing Customer

\- Existing Pet

\- Existing Service

\- Existing Staff

\- Existing Authentication

\- Existing Authorization

\- Existing Bootstrap UI Pattern

\- Existing Express API Pattern

\- Existing MySQL / mysql2 Pattern

\- Existing Jest / Supertest Pattern



\## 31.3 Must Not Implement



\- Grooming

\- Boarding

\- Order

\- Payment

\- Product

\- Report

\- Full Walk-in

\- Workflow Engine

\- Audit System

\- Staff Performance System

\- Enterprise RBAC

\- Unapproved architecture abstraction



\---



\# 32. Coding Rules



AI Coding 必須：



1\. 先檢查目前 Repository。

2\. 確認 TASK-0009 所需前置條件。

3\. 確認既有 Appointment、Customer、Pet、Service、Staff 架構。

4\. 優先延伸既有程式。

5\. 不任意重構既有模組。

6\. 不修改 Freeze 的既有業務決策。

7\. 不擴張 TASK-0009 Scope。

8\. 不提前實作後續 Block。

9\. 不引入 TypeScript。

10\. 不引入 Tailwind。

11\. 不引入 Prisma。

12\. 使用 JavaScript。

13\. 使用 Bootstrap。

14\. 使用 Express.js。

15\. 使用 mysql2。

16\. 使用 Jest + Supertest。

17\. 完成後執行測試。

18\. 完成 Browser Verification。

19\. 回報 Implementation、Test、Browser Verification 結果。

20\. 在 Review 通過前不得宣稱 TASK-0009 FREEZE。



\---



\# 33. Definition of Done



TASK-0009 只有在以下條件全部成立時才算完成：



\- \[ ] Daily Operations Block 完成

\- \[ ] `/operations` 正常運作

\- \[ ] 今日 Appointment 正確顯示

\- \[ ] Cancelled Appointment 預設不顯示

\- \[ ] 未 Check-in Appointment 正確顯示

\- \[ ] Completed Appointment 仍保留

\- \[ ] Customer 正確顯示

\- \[ ] Pet 正確顯示

\- \[ ] Multiple Pet 正確顯示

\- \[ ] Multiple Service 正確顯示

\- \[ ] Service INACTIVE 的既有 Appointment 仍可顯示

\- \[ ] Check-in 完成

\- \[ ] Check-in 撤銷完成

\- \[ ] Started Time 完成

\- \[ ] Completed Time 完成

\- \[ ] State Transition 完成

\- \[ ] 非法 State Transition 被拒絕

\- \[ ] Responsible Staff 顯示完成

\- \[ ] Responsible Staff 重新指派完成

\- \[ ] Work Note 完成

\- \[ ] Search 完成

\- \[ ] Today's All Filter 完成

\- \[ ] Pending Filter 完成

\- \[ ] Completed Filter 完成

\- \[ ] Service Type Filter 完成

\- \[ ] DOG / CAT Filter 完成

\- \[ ] Work Status Filter 完成

\- \[ ] Customer Navigation 完成

\- \[ ] Pet Navigation 完成

\- \[ ] Authorization 驗證完成

\- \[ ] API Tests PASS

\- \[ ] State Transition Tests PASS

\- \[ ] Check-in Tests PASS

\- \[ ] Staff Assignment Tests PASS

\- \[ ] Work Note Tests PASS

\- \[ ] Search / Filter Tests PASS

\- \[ ] Multiple Pet Tests PASS

\- \[ ] Multiple Service Tests PASS

\- \[ ] Historical Service Tests PASS

\- \[ ] UI Tests PASS

\- \[ ] Browser Verification PASS

\- \[ ] Regression Verification PASS

\- \[ ] Working Tree 狀態確認

\- \[ ] TASK-0009 Review PASS



\---



\# 34. Acceptance Criteria



\## AC-01 Daily Operations Entry



使用者登入後可以進入：



&#x20;   /operations



並看到今日工作列表。



\## AC-02 Appointment Driven



Daily Operations 的工作來源為既有 Appointment。



不得要求建立另一份獨立 Work Order 才能顯示今日工作。



\## AC-03 Today's Work



今日 Appointment 能正確顯示：



\- Time

\- Customer

\- Pet

\- Service

\- Staff

\- Status



\## AC-04 Cancelled Appointment



Cancelled Appointment 預設不顯示。



\## AC-05 Check-in



使用者可以：



&#x20;   SCHEDULED → CHECKED\_IN



並正確保存 Check-in Time。



\## AC-06 Start Work



使用者可以：



&#x20;   CHECKED\_IN → IN\_PROGRESS



並正確保存 Started Time。



\## AC-07 Complete



使用者可以：



&#x20;   CHECKED\_IN → COMPLETED



或：



&#x20;   IN\_PROGRESS → COMPLETED



並正確保存 Completed Time。



\## AC-08 Reversal



合法的逆向狀態轉換可以成功。



\## AC-09 Invalid Transition



非法狀態轉換必須由 Backend 拒絕。



\## AC-10 Staff Assignment



使用者可以查看與重新指派 Responsible Staff。



\## AC-11 Work Note



使用者可以建立與更新目前 Work Note。



\## AC-12 Search



使用者可以透過：



\- Customer

\- Pet

\- Phone



搜尋今日工作。



\## AC-13 Filter



使用者可以透過：



\- Today's All

\- Pending

\- Completed

\- Service Type

\- DOG / CAT

\- Work Status



進行必要篩選。



\## AC-14 Multiple Pet



同一 Appointment 有多隻 Pet 時：



> 仍只有一個 Daily Operations 主體。



\## AC-15 Multiple Service



同一 Appointment 有多個 Service 時：



> 仍只有一個 Daily Operations 主體，並顯示完整 Service 明細。



\## AC-16 Historical Service



Service 變為 INACTIVE 後：



> 既有 Appointment 仍正常顯示。



\## AC-17 Boundary



TASK-0009 不應產生：



\- Grooming 詳細流程

\- Boarding 詳細流程

\- Order

\- Payment

\- Product

\- Report

\- Workflow Engine

\- Audit Log



等未納入 Scope 的功能。



\---



\# 35. Verification Matrix



| Area | Verification |

|---|---|

| Route | `/operations` 可正常載入 |

| Today's List | 今日 Appointment 正確顯示 |

| Sorting | Appointment Start Time ASC |

| Cancelled | Cancelled Appointment 不顯示 |

| Pending | 未完成工作正確顯示 |

| Completed | Completed 工作仍保留 |

| Customer | Customer 正確顯示 |

| Pet | Pet 正確顯示 |

| Service | Service 正確顯示 |

| Multiple Pet | 同一 Appointment 下正確顯示多 Pet |

| Multiple Service | 同一 Appointment 下正確顯示多 Service |

| Check-in | SCHEDULED → CHECKED\_IN PASS |

| Undo Check-in | CHECKED\_IN → SCHEDULED PASS |

| Start | CHECKED\_IN → IN\_PROGRESS PASS |

| Complete | CHECKED\_IN / IN\_PROGRESS → COMPLETED PASS |

| Reopen | COMPLETED → IN\_PROGRESS PASS |

| Invalid Transition | 非法轉換被拒絕 |

| Check-in Time | 正確保存 |

| Started Time | 正確保存 |

| Completed Time | 正確保存 |

| Staff | Responsible Staff 正確顯示 |

| Reassignment | Staff 重新指派 PASS |

| Work Note | 建立 / 更新 PASS |

| Search | Customer / Pet / Phone PASS |

| Filters | All / Pending / Completed PASS |

| Species | DOG / CAT PASS |

| Service Type | Filter PASS |

| Authorization | 未授權操作被拒絕 |

| API Tests | PASS |

| UI Tests | PASS |

| Browser | PASS |

| Regression | PASS |



\---



\# 36. Freeze Criteria



TASK-0009 在 Coding 完成後，必須依以下流程進行：



&#x20;   Implementation

&#x20;       ↓

&#x20;   Automated Test

&#x20;       ↓

&#x20;   Browser Verification

&#x20;       ↓

&#x20;   Regression Verification

&#x20;       ↓

&#x20;   Review

&#x20;       ↓

&#x20;   PASS

&#x20;       ↓

&#x20;   TASK-0009 FREEZE

&#x20;       ↓

&#x20;   Git Commit



只有在：



\- Implementation PASS

\- Test PASS

\- Browser Verification PASS

\- Regression PASS

\- Review PASS



全部成立後，TASK-0009 才能進入：



> FREEZE。



在此之前不得宣稱 TASK-0009 已 Freeze。



\---



\# 37. Final Status for Coding Handoff



本文件完成後，TASK-0009 的 Decision 已收斂。



本 TASK 不再增加非必要 Decision。



目前狀態：



> READY FOR CODING



AI Coding 階段的唯一工作：



> 依本正式工程文件實作 TASK-0009 Daily Operations。



不得在 Coding 階段重新設計已確認的 Decision。



不得擴張 Scope。



不得提前實作後續 Grooming、Boarding、Order、Payment、Product、Report Block。



\---



\# 38. Engineering Completion Target



TASK-0009 最終必須形成以下完整能力：



&#x20;   Appointment

&#x20;       ↓

&#x20;   /operations

&#x20;       ↓

&#x20;   Today's Operations

&#x20;       ↓

&#x20;   SCHEDULED

&#x20;       ↓

&#x20;   CHECKED\_IN

&#x20;       ↓

&#x20;   IN\_PROGRESS

&#x20;       ↓

&#x20;   COMPLETED



並能支援必要的：



\- Customer / Pet / Service 顯示

\- Search

\- Filter

\- Check-in

\- Status Transition

\- Time Tracking

\- Staff Assignment

\- Work Note

\- Customer / Pet Navigation



同時保持：



> Daily Operations = 今日營運入口



而不是：



> Grooming / Boarding / Order / Payment 的提前實作。



\---



\# 39. Final Engineering Decision



TASK-0009：



> \*\*Daily Operations（日常營運）\*\*



正式 Scope：



> \*\*以既有 Appointment 為主要資料來源，提供今日工作列表、Check-in、最小工作狀態、必要時間資料、Responsible Staff、Work Note、搜尋與篩選。\*\*



正式 Boundary：



> \*\*不實作 Grooming、Boarding、Order、Payment、Product、Report、完整 Walk-in、Workflow Engine、Audit Log 或其他後續 Block。\*\*



正式 Coding Readiness：



> \*\*READY FOR CODING\*\*



正式文件版本：



> \*\*v1.0\*\*



正式檔名：



> \*\*TASK-0009-日常營運-Daily-Operations-v1.0.md\*\*

