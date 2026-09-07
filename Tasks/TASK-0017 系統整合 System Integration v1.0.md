# TASK-0017 系統整合 System Integration v1.0

## 1. Document Information

| Field | Value |
|---|---|
| Task | TASK-0017 |
| 中文名稱 | 系統整合 |
| English Name | System Integration |
| Version | v1.0 |
| Status | DECISION FREEZE / CODING READY |
| Previous Task | TASK-0016 — 報表 Report |
| Previous Task Status | FREEZE |
| Next Task | TASK-0018 — Final MVP Verification |
| Formal Filename | TASK-0017 系統整合 System Integration v1.0.md |

---

## 2. Document Purpose

本文件為 TASK-0017 正式工程規格文件。

TASK-0017 Decision 已完成，共確認 Q1–Q136。

所有 Q1–Q136 均採用 AI Recommendation。

本文件的用途為：

1. 凍結 TASK-0017 已確認的 Scope。
2. 凍結 TASK-0017 已確認的 Integration Rules。
3. 提供 AI Coding 階段作為 TASK-0017 正式實作依據。
4. 定義 Coding、Integration Testing、Regression Testing 與 Browser Verification 的驗收基準。
5. 防止 AI Coding 階段重新設計已 Freeze 的 Business Blocks。
6. 防止 TASK-0017 在 Coding 階段產生 Scope Drift。
7. 將 Q91–Q136 已確認的必要 Cross-module Integration Decisions 正式納入本文件。
8. 明確允許已經 Decision Freeze 的最小必要 Integration Data Model / API Contract 修改，並限制其範圍。

本文件不是 TASK-0017 最終 Human Acceptance / Final Freeze 文件。

TASK-0017 完成 Coding、Verification、Human Acceptance、Git Checkpoint 後，才進入 TASK-0017 最終完成 Freeze。

---

# 3. Project Position

目前專案流程：

    TASK-0001
        ↓
    TASK-0002
        ↓
    ...
        ↓
    TASK-0012
        ↓
    TASK-0013 — Order Execution
        ↓
    TASK-0014 — Payment Execution / Payment Management
        ↓
    TASK-0015 — Product
        ↓
    TASK-0016 — Report
        ↓
    TASK-0016 Human Acceptance PASS
        ↓
    TASK-0016 FREEZE
        ↓
    Git Checkpoint PASS
        ↓
    TASK-0017 Decision
        ↓
    TASK-0017 Decision Consolidation
        ↓
    TASK-0017 Decision Freeze
        ↓
    TASK-0017 Coding Ready
        ↓
    TASK-0017 AI Coding
        ↓
    TASK-0017 Verification
        ↓
    TASK-0017 Human Acceptance
        ↓
    TASK-0017 Formal Completion
        ↓
    TASK-0017 Git Checkpoint
        ↓
    TASK-0017 FREEZE
        ↓
    TASK-0018 — Final MVP Verification

目前正式狀態：

> TASK-0017 Decision Freeze / Coding Ready

不得重新開啟 TASK-0016。

---

# 4. TASK-0016 Precondition

TASK-0016 — Report 已正式完成並 Freeze。

TASK-0016 已完成：

- Report Backend
- Report API
- Report Frontend UI
- Report targeted tests
- Regression tests
- Browser verification
- Human Acceptance
- FREEZE
- Git checkpoint

TASK-0016 Git checkpoint：

    Commit:
    185d578b768c42ec1065c7e03cea15867e0a901e

    Message:
    MVP checkpoint: TASK-0013 to TASK-0016

Checkpoint 結果：

- Scope Review：PASS
- Security Check：PASS
- Generated Files Check：PASS
- git diff --cached --check：PASS
- Commit Verification：PASS
- Working Tree：Clean
- Staged leftovers：None

TASK-0016 已正式結束。

TASK-0017 不得重新討論 TASK-0016。

---

# 5. TASK-0017 Objective

TASK-0017 名稱：

> 系統整合 System Integration

TASK-0017 的唯一核心目的：

> 將目前已完成的 MVP Blocks 與既有功能整合成可連續執行的完整營運流程，確認各模組之間的資料、API、權限、UI Navigation 與 Business State 可以正確銜接。

TASK-0017 不重新設計既有 Business Block。

TASK-0017 主要處理：

- Cross-module integration
- End-to-end business flow
- Data flow consistency
- API integration
- Frontend integration
- Authentication integration
- Authorization integration
- Cross-module error handling
- Integration regression
- Browser integration verification
- 必要的最小整合修正

TASK-0017 允許的 Data Model / API Contract 修改僅限於：

> 已經由 Q91–Q136 明確確認，且為完成 TASK-0017 核心 Integration 所必要的最小修改。

不得將此例外解讀為重新設計 Order、Appointment、Grooming、Boarding 或其他已 Freeze Block。

---

# 6. Existing MVP Blocks

目前 MVP 已 Freeze 的 13 個 Blocks：

1. Staff / Auth
2. Shop Settings
3. Customer
4. Pet
5. Service
6. Appointment
7. Daily Operations
8. Grooming
9. Boarding
10. Order
11. Payment
12. Product
13. Report

TASK-0017 必須以既有 Blocks 為整合對象。

不得建立新的 Business Block。

不得重新定義既有 Block 的 Business Responsibility。

---

# 7. Technology Baseline

| Layer | Technology |
|---|---|
| Frontend | Next.js |
| Frontend Router | Pages Router |
| Frontend Language | JavaScript |
| UI | Bootstrap |
| Backend | Express.js |
| Backend Language | JavaScript |
| Database | MySQL |
| DB Driver | mysql2 |
| ORM | None |
| Testing | Jest + Supertest |
| Browser Verification | Playwright |
| TypeScript | Not Used |
| Tailwind | Not Used |
| Prisma | Not Used |

Architecture：

    Next.js Frontend
            ↓
    Express.js API
            ↓
        mysql2
            ↓
        MySQL

技術原則：

> 該寫的才寫。

TASK-0017 不得引入：

- TypeScript
- Tailwind
- Prisma
- Cypress
- 新 E2E Framework
- Enterprise Architecture
- 不必要 Design Pattern
- 不必要 abstraction
- 新大型 State Management Framework
- 新 Enterprise API Client Layer
- 新 Domain Architecture
- 新 Dependency Injection Framework

---

# 8. Decision Status

TASK-0017 Decision 已完成。

總題數：

> Q1–Q136

Decision Result：

> Q1–Q136 全部採用 AI Recommendation。

Q1–Q90：

> 全部採用 AI Recommendation。

Q91–Q136：

> 全部採用 AI Recommendation。

Q91–Q136 為後續針對實際 Integration Data Model、API Contract、Appointment → Daily Operations、Execution → Order、Payment / Report integration 等必要問題所確認之正式 Decision。

Q91–Q136 不得重新詢問、重新投票或視為未決事項。

---

## 8.1 Decision Q1–Q90

Q1–Q90 均為：

    A

即：

> Q1–Q90 全部採用 AI Recommendation。

---

## 8.2 Decision Q91–Q136

完整答案：

    Q91  = A
    Q92  = A
    Q93  = A
    Q94  = A
    Q95  = A
    Q96  = A
    Q97  = A
    Q98  = A
    Q99  = A
    Q100 = A
    Q101 = A
    Q102 = A
    Q103 = A
    Q104 = A
    Q105 = A

    Q106 = A
    Q107 = A
    Q108 = A
    Q109 = A
    Q110 = A
    Q111 = A
    Q112 = A
    Q113 = A
    Q114 = A
    Q115 = A
    Q116 = A
    Q117 = A
    Q118 = A
    Q119 = A
    Q120 = A

    Q121 = A
    Q122 = A
    Q123 = A
    Q124 = A
    Q125 = A
    Q126 = A
    Q127 = A
    Q128 = A
    Q129 = A
    Q130 = A
    Q131 = A
    Q132 = A
    Q133 = A
    Q134 = A
    Q135 = A
    Q136 = A

---

# 9. Decision Q91–Q136 Consolidated Rules

本節為 Q91–Q136 的正式規格化結果。

## 9.1 Order Appointment Linkage

Q91–Q103 確認：

1. TASK-0017 允許為完成 Integration 所必要的 Order Data Model / API Contract 做最小修改。
2. Appointment-origin Order 使用 `appointment_id` 作為主要 Appointment linkage。
3. WALK_IN Order 可以沒有 Appointment。
4. APPOINTMENT-origin Order 必須具有有效 `appointment_id`。
5. Backend 必須驗證：
   - Appointment 存在。
   - Appointment 與 Order Customer 一致。
   - Appointment 狀態符合 Order eligibility。
6. Appointment-origin Service Order 必須對應已完成的 Grooming 或 Boarding execution。
7. Order eligibility 由 Backend Service layer 強制執行。
8. Grooming / Boarding completion 不會自動建立 Order。
9. Order creation 可以由已完成服務的流程帶入 Appointment / execution context。
10. 一個 Appointment 原則上可以有多個 Order。
11. 但相同 completed service / execution 不得被重複 billing。
12. Duplicate billing validation 必須以 completed execution / service context 為基礎。
13. Order Item 不增加 execution-specific ID，除非後續已批准的最小必要 Decision 明確要求。
14. Order 增加最小必要 `source_type`。
15. `source_type` 僅允許：
    - `WALK_IN`
    - `APPOINTMENT`
16. `WALK_IN`：
    - `source_type = WALK_IN`
    - `appointment_id = NULL`
17. `APPOINTMENT`：
    - `source_type = APPOINTMENT`
    - `appointment_id = valid appointment`
18. 可由 completed service context 直接進入 Order creation。
19. Order 建立成功後，Frontend 應導向 Order detail / Payment entry 等既有合理下一步。
20. 除上述必要內容外，不進行 Order Block redesign。

---

## 9.2 Appointment → Daily Operations

Q107–Q110 確認：

1. 正常 Appointment creation 應在 Backend 建立對應的 Daily Operation。
2. 正常 Appointment flow 使用 Appointment ID 作為 Daily Operation linkage。
3. 不為 Walk-in 憑空建立不存在的 Appointment-origin Operation。
4. Appointment 與必要 Daily Operation creation 應使用適當的同一 transaction boundary。
5. 若 Daily Operation creation 失敗，Appointment creation 必須 rollback。
6. 不建立新的 Daily Operations workflow。
7. 不將 Daily Operations 擴張為 Dashboard / BI。

---

## 9.3 Order Creation Transaction Boundary

Q111–Q113 確認：

1. Order linkage / validation 應位於適當的 transaction boundary。
2. 不需要將整個 Grooming / Boarding execution lifecycle 包進 Order transaction。
3. Frontend 可以提供 Appointment context，但 Backend 不得信任 Frontend context 作為資料權威。
4. Backend 必須重新查詢並驗證：
   - Appointment
   - Customer
   - Pet / execution context
   - Service
   - Product
   - Price
   - completion state
5. Service / Product price 應由 Backend 依 source tables 取得。
6. 不接受 Frontend 任意提供價格作為最終資料權威。

---

## 9.4 Authentication / Authorization

Q114–Q118 確認：

1. 沿用既有 Authentication。
2. 沿用既有 Role / Authorization middleware。
3. 不建立 Enterprise RBAC。
4. Cross-module navigation 不得遺失 authentication context。
5. Route / query / API context 可以傳遞必要識別資訊。
6. Backend 必須重新驗證必要 context。
7. 不以 localStorage 作為 authorization authority。
8. 不將完整 Entity object 放進 URL。
9. Browser refresh / re-entry 後，Frontend 必須透過 API 重新取得必要 context。
10. Frontend 必須處理：
    - Loading
    - Empty
    - Validation Error
    - API Error
    - Unauthorized
    - Forbidden
11. 只增加完成 Integration 所必要的核心 navigation。
12. 不建立 Dashboard / SPA framework / Global State Architecture。

---

## 9.5 Testing

Q119–Q120 確認：

1. Core Integration Tests 使用：
   - Real Backend API
   - Real MySQL
2. Integration Tests 不以 Mock API 作為主要 System Integration 驗證方式。
3. 必須執行 Integration Tests。
4. 必須執行相關 Regression Tests。
5. 必須執行 Frontend Build / Checks。
6. 必須執行 Backend Checks。
7. 必須執行必要 Playwright Browser Verification。
8. 不新增新的 Test Framework。

---

## 9.6 Regression Protection

Q121 確認：

若 TASK-0017 Coding 造成已 Freeze Block Regression：

> STOP。

不得：

- 修改舊 Task 的 Business Rule。
- 修改舊 Task 的預期行為以讓 Test PASS。
- 刪除既有 Tests。
- 降低既有 Tests 的驗證標準。
- 以 Integration 名義重新設計 Frozen Block。

---

## 9.7 Grooming / Boarding → Order Eligibility

Q122–Q126 確認：

1. Grooming completion 可以使相關 Appointment-origin Service 具備 Order eligibility。
2. Boarding checkout / completion 可以使相關 Appointment-origin Service 具備 Order eligibility。
3. Backend 必須驗證 execution 已完成。
4. Backend 必須驗證 execution 與 Appointment / Customer context 一致。
5. 不建立新的 Service Completed table。
6. Service Completed 狀態使用既有 Grooming / Boarding completion state 與 Daily Operation status。
7. Frontend 不得自行宣稱 `completed = true` 作為 Order eligibility authority。
8. Backend 決定 completion / eligibility。
9. Duplicate billing attempt 必須被 Backend 拒絕。
10. Business / Validation Error 必須清楚回傳。
11. 不新增 Enterprise Idempotency Architecture。

---

## 9.8 Payment / Report Integration

Q127–Q130 確認：

1. Payment 沿用 TASK-0014 已 Freeze 的 Payment contract。
2. Payment 不負責判斷 Service eligibility。
3. Order creation 負責 eligibility。
4. Report 沿用 TASK-0016 已 Freeze 的 aggregation / data contract。
5. TASK-0017 只驗證真實 Integration Flow 的資料是否能正確流入 Report。
6. 不新增 Report-specific data model。
7. 不新增 Dashboard / BI / Advanced Analytics。

---

## 9.9 Cross-module Data Integrity

Q131–Q134 確認：

1. Cross-module write 必須驗證：
   - Foreign Key
   - Ownership
   - Status
   - Business Eligibility
2. Backend 維持：

       Controller
           ↓
       Service
           ↓
       Repository

3. 不採用 Controller-to-Controller。
4. 不建立 Enterprise Integration Layer。
5. 如果既有 Service 無法合理完成必要 orchestration，可以增加最小必要 Service method。
6. 不進行大型 Architecture Refactoring。
7. Transaction failure 必須 rollback。
8. 不使用 fake success。
9. 不使用 background patch 掩蓋 transaction failure。
10. Integration 修改只能限於完成 TASK-0017 所必要的範圍。

---

## 9.10 Browser / E2E Structure

Q135–Q136 確認：

1. 沿用既有 Playwright / test structure。
2. 不新增 E2E Framework。
3. TASK-0017 Coding completion 至少必須具備：
   - Core cross-module flow via Real API + Real MySQL
   - Regression PASS
   - Frontend Build PASS
   - Required Playwright PASS
   - No unresolved Freeze Conflict

---

# 10. Core Integration Flow

TASK-0017 必須至少驗證以下核心營運流程：

    Customer
        ↓
    Pet
        ↓
    Appointment
        ↓
    Daily Operations
        ↓
    Check-in
        ↓
    Grooming / Boarding
        ↓
    Service Completed
        ↓
    Order
        ↓
    Payment
        ↓
    Report

此流程為 TASK-0017 的主要 Integration Backbone。

---

# 11. Customer → Pet Integration

必須確認：

- Customer 可以被正確建立或選取。
- Pet 可以正確關聯 Customer。
- Pet identity 正確保存。
- Pet 在後續流程中仍能取得正確 Customer relationship。
- 不產生第二套 Customer / Pet identity。

不得：

- 建立新的 Customer / Pet data source。
- 修改既有 Customer / Pet Business Model。

---

# 12. Pet → Appointment Integration

必須確認：

- Existing Pet 可以建立 Appointment。
- Appointment 正確引用 Pet。
- Appointment 可以取得必要 Customer / Pet context。
- Pet identity 不因跨頁面或 API 呼叫而遺失。
- 正常流程不應要求使用者反覆手動輸入已知 Entity ID。
- Frontend 選擇 Service 時，不得以不受 Backend 驗證的 hardcoded data 作為資料權威。

如現有 Frontend service catalog 或 context mapping 造成 Integration 阻塞，只能做最小必要修正。

不得重新設計 Appointment Block。

---

# 13. Appointment → Daily Operations Integration

必須確認：

- Existing Appointment 可以進入 Daily Operations。
- Appointment 建立後，必要 Daily Operation 可以正確建立。
- Daily Operation 正確引用 Appointment。
- Daily Operations 能取得必要 Appointment information。
- Appointment identity 保持一致。
- Appointment 的營運狀態能正確銜接後續流程。
- Appointment 與 Daily Operation 的必要建立具備 transaction consistency。
- Daily Operation 建立失敗時 Appointment 不得留下不完整的成功狀態。

不得建立新的 Daily Operations workflow。

不得將 Daily Operations 擴張成 Dashboard / BI。

---

# 14. Check-in Integration

Check-in 必須：

- 使用既有 Appointment / Daily Operations data。
- 不建立第二套平行資料來源。
- 正確反映既有 Business State。
- 不允許不合法的重複操作。
- 發生錯誤時不得產生非法或不完整資料。
- Check-in 後可以正確進入 Grooming 或 Boarding。
- Cross-module context 不得遺失。

不得重新設計 Check-in Business Model。

---

# 15. Grooming Integration

TASK-0017 必須驗證：

    Check-in
        ↓
    Grooming
        ↓
    Service Completed
        ↓
    Order

必須確認：

- Grooming 可以承接正確資料。
- Grooming completion state 正確。
- Service Completed 狀態正確傳遞。
- Backend 可以判斷 Grooming 是否已完成。
- 已完成 Grooming 可以進入合法的 Appointment-origin Order flow。
- Order creation 可以取得必要 Appointment / Customer context。
- 不允許未完成 Grooming 建立對應的 Appointment-origin Service Order。
- 不因 TASK-0017 建立新的 Grooming State Machine。

---

# 16. Boarding Integration

TASK-0017 必須驗證：

    Check-in
        ↓
    Boarding
        ↓
    Service Completed
        ↓
    Order

必須確認：

- Boarding 可以承接正確資料。
- Boarding completion / checkout state 正確。
- Service Completed 狀態正確傳遞。
- Backend 可以判斷 Boarding 是否已完成。
- 已完成 Boarding 可以進入合法的 Appointment-origin Order flow。
- Order creation 可以取得必要 Appointment / Customer context。
- 不允許未完成 Boarding 建立對應的 Appointment-origin Service Order。
- 不因 TASK-0017 建立新的 Boarding State Machine。

不得因 Grooming 與 Boarding 的差異建立新的統一 State Machine。

---

# 17. Service Completed → Order Integration

Service Completed 並不是新的 Business Block。

Service completion 的 authority 來自既有：

- Grooming completion
- Boarding completion / checkout
- Daily Operations status

Order eligibility 必須由 Backend 判斷。

Appointment-origin Service Order 必須：

1. 具有 `source_type = APPOINTMENT`。
2. 具有有效 `appointment_id`。
3. Appointment 必須存在。
4. Appointment Customer 必須與 Order Customer 一致。
5. 對應 Service execution 必須已完成。
6. Service / execution 必須符合既有 Business Rules。
7. 不得對同一 completed execution 重複 billing。

Frontend 不得直接指定：

> completed = true

來繞過 Backend eligibility。

---

# 18. Order Integration

Order 來源包含：

- Appointment-origin Order
- Walk-in Order

TASK-0017 必須確認：

- Order 能正確取得來源資料。
- Appointment-origin Order 的關聯正確。
- Walk-in Order 不被錯誤當成 Appointment-origin Order。
- 不同 Order Source 不會互相污染。
- `source_type` 正確。
- `appointment_id` 正確。
- Appointment / Customer consistency 正確。
- Service completion eligibility 正確。
- Duplicate billing protection 正確。
- Order creation API 不信任 Frontend 提供的最終價格。
- Backend 從既有 source tables 取得必要 Service / Product / Price data。
- Existing Walk-in Order 能維持既有能力。

## 18.1 Order Source Contract

允許：

    WALK_IN
    APPOINTMENT

### WALK_IN

必須：

    source_type = WALK_IN
    appointment_id = NULL

### APPOINTMENT

必須：

    source_type = APPOINTMENT
    appointment_id = valid Appointment ID

不得接受其他 `source_type`。

## 18.2 Appointment-origin Order

Backend 必須驗證：

- Appointment existence
- Appointment ownership / Customer relationship
- Appointment status
- Service completion
- Grooming / Boarding completion context
- Duplicate billing condition
- Service / Product validity
- Price source integrity

## 18.3 Order Creation Entry

允許由：

> 已完成 Service → Order

的流程直接進入 Order creation。

Frontend 可以透過 route / query / API context 傳遞必要識別資訊。

但：

> Backend 必須重新查詢與驗證所有 authoritative data。

不得以 URL 或 Frontend state 作為最終權威。

## 18.4 Order Modification Boundary

TASK-0017 只允許完成 Q91–Q136 所確認的必要最小 Order integration modification。

不得：

- 重寫 Order Block。
- 重設計 Order Item architecture。
- 新增 execution-specific Order Item ID。
- 新增 Enterprise Order domain。
- 新增大型 pricing engine。
- 新增 billing platform。
- 新增 accounting system。

---

# 19. Order → Payment Integration

必須確認：

- Payment 正確引用既有 Order。
- Order identity 正確。
- Payment amount 與 Order amount 一致。
- Payment state 與 Order state 符合既有 Business Rules。
- 同一 Order 不會因正常重複操作而被錯誤重複處理。
- Authorization Failure 不會產生非法 Payment。
- Business Error 不會造成錯誤的部分資料。
- Appointment-origin Order 與 Walk-in Order 均能使用既有 Payment flow。
- Payment 不重新判斷 Grooming / Boarding completion eligibility。

不得新增：

- Payment Gateway
- Refund System
- Accounting System
- Invoice System
- Payment Idempotency Service

TASK-0014 Payment Contract 為既有 Freeze Contract，TASK-0017 必須重用而非重新設計。

---

# 20. Payment → Report Integration

必須確認：

- Payment 完成後，既有 Report 能取得相關資料。
- Report 使用真實 Integration Flow 產生的資料進行驗證。
- Payment data 與 Report data 保持一致。
- Order / Payment data 可以正確進入既有 Report aggregation。
- 不因 TASK-0017 新增 Dashboard / BI / Advanced Analytics。

不得建立 Report-specific data model。

---

# 21. Cross-Module Data Consistency

必須驗證核心 Entity identity：

    Customer
        ↓
    Pet
        ↓
    Appointment
        ↓
    Daily Operation
        ↓
    Grooming / Boarding Execution
        ↓
    Order
        ↓
    Payment

以及必要的 downstream Report data。

必須確認：

- ID 傳遞正確。
- Foreign Key relationship 正確。
- Customer ownership 正確。
- Appointment ownership / relationship 正確。
- Execution relationship 正確。
- Order source relationship 正確。
- Payment relationship 正確。
- Persistence 正確。
- 重新查詢後資料仍正確。
- Browser Refresh 後必要資料仍能取得。
- 流程中斷後重新進入時，已 Persistence 的資料可以繼續使用。

---

# 22. Database Integration Rules

TASK-0017 優先使用既有 Database Schema。

允許的 Schema Modification：

> 僅限 Q91–Q136 已確認且為 TASK-0017 核心 Integration 所必要的最小修改。

目前已明確批准的 Order integration data：

- `source_type`
- `appointment_id`

其中：

    source_type:
        WALK_IN
        APPOINTMENT

以及：

    WALK_IN
        appointment_id = NULL

    APPOINTMENT
        appointment_id = valid Appointment ID

Database implementation 必須依實際既有 Schema 與 Migration 結構採取最小且一致的實作方式。

必須驗證：

- Existing tables
- Foreign Key integrity
- Referential integrity
- Cross-module data consistency
- Transaction boundary
- Persistence
- Invalid reference handling
- Customer ownership validation
- Appointment relationship validation
- Duplicate billing prevention

---

## 22.1 Schema Modification Boundary

以下仍必須：

> STOP

- 未經 Decision 的新 Column。
- 未經 Decision 的新 Table。
- 未經 Decision 的新 Relationship。
- 新 Business Block。
- 新 Domain Model。
- 與 Q91–Q136 無關的 Schema expansion。
- 為方便 Coding 而增加的非必要欄位。

但是：

> Q91–Q136 已明確批准、且為完成 TASK-0017 Integration 所必要的最小 Order schema/API modification，不屬於 Freeze Conflict。

因此：

> 「所有 Schema modification 一律 STOP」

已不再適用。

正確規則為：

> **未經 Decision 的 Schema modification → STOP。**

> **Q91–Q136 已批准且必要的最小 Order Integration modification → ALLOWED。**

若實際 implementation 發現超出 Q91–Q136 的批准範圍：

> STOP。

不得自行延伸 Decision。

---

# 23. Appointment Transaction Rules

Appointment → Daily Operations 必須遵守：

    Create Appointment
            ↓
    Create Required Daily Operation
            ↓
    Commit

若任一步驟失敗：

    Rollback Appointment
    Rollback Daily Operation

不得：

- Appointment 成功但 Daily Operation 建立失敗後仍回傳完整成功。
- 使用 background task 補建立 Daily Operation。
- 以 fake success response 掩蓋 transaction failure。
- 讓 Frontend 自行補寫 Daily Operation。

Walk-in 不應因沒有 Appointment 而被強制建立不存在的 Appointment-origin Daily Operation。

---

# 24. Backend Integration Rules

沿用：

    Controller
        ↓
    Service
        ↓
    Repository
        ↓
    mysql2
        ↓
    MySQL

必須確認：

- Existing routes 正確掛載。
- Authentication middleware 正常。
- Authorization 正常。
- Cross-module API 呼叫正常。
- Response Contract 可供下游使用。
- HTTP Status Code 符合既有 Contract。
- Error handling 一致。
- Authentication Context 不因跨模組操作遺失。
- 不存在會影響 TASK-0017 的 Circular Dependency。
- Cross-module write 有必要的 ownership / FK / status / eligibility validation。

不得：

- Controller-to-Controller。
- Enterprise Integration Layer。
- 大型 Backend Refactoring。
- 新 Domain Architecture。
- 新 Dependency Injection Framework。

只有確實阻塞 Integration 的問題才進行最小修正。

---

# 25. API Contract Rules

沿用既有 API Contract。

TASK-0017 允許的 API Contract modification 僅限：

> Q91–Q136 已批准且為 Integration 所必要的最小修改。

必須確認主要錯誤情境：

- Success
- Validation Error
- Authentication Failure
- Authorization Failure
- Not Found
- Conflict / Business Error
- Integration Failure

Appointment-origin Order API 至少必須能正確處理：

- 無效 Appointment
- Appointment 不存在
- Appointment / Customer 不一致
- 不合法 source_type
- 缺少必要 appointment_id
- 不符合 completion eligibility
- Duplicate billing
- Service 不存在或不合法
- Product 不存在或不合法
- Backend authoritative price mismatch
- Unauthorized access
- Forbidden access

若 API Contract 不一致：

### 若不影響 TASK-0017 Integration

> 不修正。

### 若直接阻塞 TASK-0017 Integration

> 只做最小必要修正。

若修正內容超出 Q91–Q136 已批准範圍：

> STOP。

不得全面重構 API Contract。

---

# 26. Frontend Integration Rules

必須確認：

- 首頁 / 主要 Navigation。
- Module-to-module navigation。
- API Client integration。
- Authentication persistence。
- Authorization redirect / blocking。
- Entity context。
- Loading state。
- Empty state。
- Validation error。
- API error。
- Success state。
- Data refresh。
- Browser refresh。
- Browser back navigation。
- 必要成功後導向。

Cross-module context 可以使用：

- Route parameter
- Query parameter
- API request context

但：

> Backend 必須重新驗證。

不得：

- 以 localStorage 作為 authority。
- 將完整 Entity object 放入 URL。
- 依賴 Frontend state 作為 Business Rule authority。
- 依賴 Frontend `completed` flag 決定 Order eligibility。
- 依賴 Frontend price 作為最終 billing amount authority。

原則：

> 只修正完成 Integration 所必要的 Frontend 問題。

不得重新設計：

- Navigation architecture
- Global state architecture
- Layout architecture
- Enterprise frontend framework

---

# 27. Authentication / Authorization Integration

至少驗證：

## 未登入

- 無法直接進入主要受保護模組。
- Protected API 不可被未登入使用者使用。

## 已登入且有權限

- 可以正常進入允許模組。
- 可以正常執行允許操作。

## 已登入但無權限

- UI 不應允許不合法操作。
- Direct URL 不應繞過 Authorization。
- API 必須拒絕。
- 不應留下非法資料。

## Cross-module Context

- Authentication identity 不因 Navigation / API flow 遺失。
- Role / Authorization context 不因模組切換失效。
- Appointment / Customer / Order ownership 必須由 Backend 驗證。

不得新增 Enterprise RBAC。

---

# 28. Error Handling Integration

跨模組 API Failure 時：

- Frontend 必須知道操作失敗。
- 必要錯誤訊息必須可理解。
- 不應錯誤執行下一步。
- 不應建立非法資料。
- 必要時保留目前 User Context。
- 不應以靜默方式忽略 Error。

必須特別確認：

- Appointment transaction failure
- Invalid Appointment
- Invalid Customer relationship
- Incomplete Grooming
- Incomplete Boarding
- Duplicate billing
- Unauthorized access
- Forbidden access
- Payment failure
- Report downstream failure

不得：

- 建立新的 Global Error Framework。
- 自行增加 Retry Architecture。
- 自行增加 Circuit Breaker Architecture。

API Timeout / Failure 只需確認既有 Error Handling 不會造成錯誤 UI / Data State。

---

# 29. Duplicate Operation Rules

TASK-0017 必須驗證既有 Business Rules 對重複操作的處理。

至少評估：

- Duplicate Check-in
- Duplicate Service Completed
- Duplicate Order
- Duplicate Payment

其中 Appointment-origin Order 必須特別驗證：

> 同一 completed execution 不得被重複 billing。

原則：

> 驗證既有防重複能力，不新增 Enterprise Idempotency Architecture。

如果發現既有 Business Rule 不足，且修正超出 Q91–Q136 已批准範圍：

> STOP → Decision。

不得自行新增未經 Decision 的 Business Rule。

---

# 30. Integration Test Strategy

Integration Test 使用：

- Jest
- Supertest
- MySQL

主要採：

> Real Backend API + Real Database Integration

不以 Mock API 作為主要 System Integration 驗證方式。

測試資料必須：

- 可重現。
- 可控制。
- 可清理。
- 不污染其他測試。
- 不依賴任意既有 Production-like data。

不得每次測試直接：

> DROP / RESET 整個 Database

除非既有專案明確提供安全的測試環境機制。

---

# 31. Integration Test Sequence

主要 Happy Path：

    Create / Select Customer
        ↓
    Create / Select Pet
        ↓
    Create Appointment
        ↓
    Verify Appointment Persistence
        ↓
    Verify Daily Operation Persistence
        ↓
    Enter Daily Operations
        ↓
    Check-in
        ↓
    Grooming OR Boarding
        ↓
    Service Completed
        ↓
    Create / Continue Appointment-origin Order
        ↓
    Payment
        ↓
    Report
        ↓
    Verify Final Data

另外必須維持 Walk-in Order flow：

    Create / Select Customer
        ↓
    Create Walk-in Order
        ↓
    Payment
        ↓
    Report

至少必須建立：

1. 一條完整可重現的 Grooming Happy Path。
2. 一條完整可重現的 Boarding Happy Path。
3. 一條可驗證的 Walk-in Order Path。

---

# 32. Integration Test Matrix

| Source | Target | Verification |
|---|---|---|
| Customer | Pet | Customer / Pet relationship |
| Pet | Appointment | Pet identity |
| Appointment | Daily Operations | Operational flow / transaction |
| Daily Operations | Check-in | State transition |
| Check-in | Grooming | Execution flow |
| Check-in | Boarding | Execution flow |
| Grooming | Service Completed | Completion state |
| Boarding | Service Completed | Completion state |
| Service Completed | Order | Order eligibility / linkage |
| Walk-in | Order | Order source |
| Order | Payment | Order identity / amount / state |
| Payment | Report | Downstream reporting data |

直接 Integration 與 downstream data effect 必須能區分。

---

# 33. Persistence Verification

主要流程必須驗證：

    Write
      ↓
    API Response
      ↓
    Re-query
      ↓
    Verify Persistence
      ↓
    Continue Next Module

不得只驗證當次 HTTP Response。

必須確認：

- Database 寫入正確。
- 重新查詢正確。
- 下一模組可以取得正確資料。
- Browser Refresh 後仍能取得必要資料。
- Flow interruption 後重新進入仍能取得已 persistence 的資料。
- Appointment → Daily Operation relationship 持久化正確。
- Appointment-origin Order → Appointment relationship 持久化正確。
- Payment → Order relationship 持久化正確。

---

# 34. Browser Verification

Browser Verification 使用：

> Playwright

至少驗證：

1. Login
2. Customer
3. Pet
4. Appointment
5. Daily Operations
6. Check-in
7. Grooming
8. Boarding
9. Service Completed
10. Appointment-origin Order
11. Walk-in Order
12. Payment
13. Report
14. Authorization
15. Error State
16. Empty State
17. Validation State

主要流程應依真實使用者操作順序執行。

不得只直接開啟各 URL。

---

# 35. Browser Edge Cases

至少驗證：

- Browser Refresh
- Browser Back
- Re-entry after interruption
- Failed API
- Validation failure
- Authorization failure
- Empty list / empty state
- Successful state update
- 必要資料 Refresh
- Duplicate submission prevention / rejection
- Appointment-origin Order without Appointment
- Appointment-origin Order with invalid Appointment
- Order with mismatched Customer
- Order before Service Completion
- Duplicate billing attempt

具有資料寫入效果的主要操作必須確認 Browser Back / Re-entry 不會造成錯誤重複提交。

---

# 36. Regression Strategy

TASK-0017 Coding 完成後：

1. 執行 TASK-0017 Integration Tests。
2. 執行受影響既有 Block Tests。
3. 執行相關 Regression Tests。
4. 執行 Frontend Checks / Build。
5. 執行 Backend Checks。
6. 執行 Browser Verification。
7. 確認 Database Integrity。

Integration Test PASS 不等於 Regression PASS。

兩者必須分開記錄。

如果 frozen Block regression 發生：

> STOP。

不得為了讓 TASK-0017 PASS 而降低或修改 frozen Block 的原始測試期待。

---

# 37. Defect Classification

如果發現問題，必須先分類。

## Integration Defect

例如：

- Route wiring
- API data mapping
- Frontend navigation
- Frontend state
- Cross-module identity
- API contract mismatch affecting flow
- Integration-specific error handling
- Cross-module persistence issue
- Appointment → Daily Operations transaction wiring
- Service Completed → Order eligibility wiring
- Appointment-origin Order linkage
- Cross-module authorization validation

可在 TASK-0017 內做最小必要修正。

## Existing Block Defect

如果問題：

- 與 System Integration 無直接關係
- 單獨執行該 Block 已存在
- 不阻塞 TASK-0017

則：

> OUT OF TASK-0017 SCOPE

不得順便修正。

## Decision-Scope Defect

若問題需要：

- 新 Business Rule
- 新 Business Block
- 新 Data Model relationship
- 超出 Q91–Q136 的 Schema change
- 超出 Q91–Q136 的 API Contract change
- Enterprise capability

則：

> STOP → Decision

不得自行猜測。

---

# 38. Freeze Conflict Rules

以下情況必須立即 STOP：

- 未經 Decision 的 Business Rule 改變
- Freeze Block behavior 改變
- 未經 Decision 的 Data Model 改變
- 未經 Decision 的新 Column
- 未經 Decision 的新 Table
- 未經 Decision 的新 Relationship
- 新 Business Block
- Product Scope 改變
- Enterprise capability
- 未經 Decision 的新功能
- 超出 Q91–Q136 已批准範圍的 Order redesign
- 超出 Q91–Q136 已批准範圍的 API redesign

但以下已明確允許：

- Q91–Q103 所批准的最小 Order `source_type`
- Q91–Q103 所批准的最小 `appointment_id` linkage
- Q94 所批准的 Appointment / Customer consistency validation
- Q95–Q99 所批准的 completed execution eligibility / duplicate billing protection
- Q107–Q110 所批准的 Appointment → Daily Operations transaction integration
- Q112–Q113 所批准的 Backend authoritative validation / pricing retrieval
- Q122–Q126 所批准的 Grooming / Boarding completion → Order eligibility integration

不得：

- 自行猜測未決需求。
- 自行修改 Freeze 文件以符合 Coding。
- 為了讓 Test PASS 而修改既有測試期待值。
- 為了 Integration 而重寫既有 Block。
- 把 Q91–Q136 的「最小必要修改」擴張為一般性修改權。

---

# 39. Coding Rules

AI Coding 開始時，第一階段必須是唯讀檢查。

## Step 1 — Repository Inspection

檢查：

- Repository structure
- Git status
- Existing modifications
- Untracked files
- Backend structure
- Frontend structure
- Database structure
- Test structure
- Existing modules
- Existing routes
- Existing API client
- Existing authentication
- Existing authorization
- Existing navigation
- Existing integration-related code
- Existing Playwright / E2E structure

## Step 2 — Scope Mapping

將 TASK-0017 Requirements Mapping 到現有程式碼。

必須特別 mapping：

- Customer → Pet
- Pet → Appointment
- Appointment → Daily Operations
- Daily Operations → Check-in
- Check-in → Grooming
- Check-in → Boarding
- Grooming → Service Completed
- Boarding → Service Completed
- Service Completed → Order
- Walk-in → Order
- Order → Payment
- Payment → Report

## Step 3 — Implementation Plan

在修改任何檔案前，提出：

- 問題
- Root Cause hypothesis
- Affected files
- Required changes
- Test changes
- Browser verification changes
- Scope confirmation
- Freeze Conflict confirmation
- Transaction boundary
- Data Model impact
- API Contract impact

## Step 4 — Implementation

只實作：

> TASK-0017 必要的最小變更。

---

# 40. Existing Changes Protection

Coding 開始前必須：

1. 檢查 Git Working Tree。
2. 列出 Modified Files。
3. 列出 Untracked Files。
4. 判斷哪些屬於 TASK-0017。
5. 不覆蓋、不刪除、不重置無關既有變更。
6. 不使用未審查的 `git reset --hard`。
7. 不使用未審查的 `git clean -fd`。

如果 Repository 狀態與交接文件不同：

> 先檢查實際 Repository。

不得假設交接文件一定代表目前 filesystem 狀態。

---

# 41. Generated / Secret File Rules

不得加入：

- `.env`
- Secrets
- Credentials
- Passwords
- API Keys
- `node_modules`
- `.next`
- 未審查 generated files
- 其他不屬於 TASK-0017 的 generated artifacts

Git staging 不得使用未審查：

    git add .

必須先分類與 Review。

---

# 42. Coding Acceptance Criteria

TASK-0017 Coding 必須至少達成：

## Backend

- Existing routes correctly integrated
- Authentication works
- Authorization works
- Cross-module APIs work
- Response contracts usable
- Error handling works
- Appointment → Daily Operations transaction works
- Service completion → Order eligibility works
- Appointment-origin Order linkage works
- Walk-in Order remains functional
- Integration tests PASS

## Frontend

- Main navigation works
- Cross-module navigation works
- Authentication state works
- Authorization works
- Loading states work where necessary
- Empty states work where necessary
- Validation errors work
- API errors work
- Success states refresh correctly
- Appointment / execution context is preserved
- Order creation from completed service is reachable
- Payment continuation works
- Frontend build PASS

## Database

- Existing schema remains valid
- Approved minimal integration schema changes only
- Foreign Keys valid
- Persistence valid
- Cross-module references valid
- Appointment / Daily Operation transaction valid
- Appointment-origin Order linkage valid
- `source_type` valid
- `appointment_id` valid
- Duplicate billing protection valid
- No unauthorized schema expansion

## Integration

- Customer → Pet PASS
- Pet → Appointment PASS
- Appointment → Daily Operations PASS
- Daily Operations → Check-in PASS
- Check-in → Grooming PASS
- Check-in → Boarding PASS
- Grooming → Service Completed PASS
- Boarding → Service Completed PASS
- Service Completed → Order PASS
- Walk-in → Order PASS
- Order → Payment PASS
- Payment → Report PASS

## Browser

- Login PASS
- Main navigation PASS
- Core E2E PASS
- Authorization PASS
- Error PASS
- Empty PASS
- Validation PASS
- Refresh / Re-entry PASS where applicable
- Grooming Order path PASS
- Boarding Order path PASS
- Walk-in Order path PASS
- Duplicate billing rejection PASS

## Regression

- Existing relevant tests PASS
- No unexplained regression
- No frozen Block behavior silently changed

---

# 43. Integration Verification Gate

TASK-0017 Verification 只有在以下全部成立後才能標記 PASS：

    Integration Tests
          +
    Backend Checks
          +
    Frontend Checks
          +
    Database Integrity
          +
    Regression Tests
          +
    Browser Verification
          +
    Authorization Verification
          +
    Error / Empty / Validation Verification
          +
    Appointment → Daily Operations Transaction Verification
          +
    Service Completed → Order Eligibility Verification
          +
    Appointment-origin Order Verification
          +
    Walk-in Order Verification
          +
    Order → Payment Verification
          +
    Payment → Report Verification
          +
    No unresolved Scope Conflict
          +
    No unresolved Freeze Conflict
          ↓
    TASK-0017 Verification PASS

不得由 AI 以「看起來正常」直接宣告 PASS。

所有 Gate 必須有實際驗證結果。

---

# 44. Human Acceptance

Verification PASS 後才進入：

> TASK-0017 Human Acceptance

Human Acceptance 必須由使用者實際操作確認。

AI 不得自行宣告：

> Human Acceptance PASS

只有使用者明確確認後，才能記錄：

> TASK-0017 Human Acceptance = PASS

---

# 45. Formal Completion

Human Acceptance PASS 後才進行：

1. Formal Engineering Document completion / finalization
2. Git checkpoint
3. Commit verification
4. Working Tree verification
5. TASK-0017 Freeze

本文件目前屬於：

> Decision / Scope / Coding Specification

不代表 TASK-0017 已經完成最終 Freeze。

---

# 46. Git Checkpoint

TASK-0017 完成後：

    Human Acceptance PASS
        ↓
    Formal Engineering Document
        ↓
    Working Tree Review
        ↓
    Scope Review
        ↓
    Security Check
        ↓
    Generated Files Check
        ↓
    git diff --check
        ↓
    Staged Diff Review
        ↓
    Commit
        ↓
    Commit Verification
        ↓
    Working Tree Clean
        ↓
    TASK-0017 FREEZE

Git 原則：

- 先檢查 Working Tree。
- 分類 Modified / Untracked。
- 不使用未審查的 `git add .`。
- 排除 `.env`。
- 排除 Secrets。
- 排除 generated files。
- 排除 `node_modules`。
- 排除 `.next`。
- 執行 `git diff --check`。
- Review staged diff。
- Commit。
- 驗證 Commit。
- 確認 Working Tree Clean。

若使用者決定採用跨 TASK checkpoint，可將同一 checkpoint scope 內的已完成內容一起提交。

---

# 47. Final Freeze Rule

TASK-0017 最終 FREEZE 必須同時滿足：

- Decision Complete
- Decision Freeze
- Coding Readiness PASS
- AI Coding Complete
- Integration Tests PASS
- Regression PASS
- Browser Verification PASS
- Human Acceptance PASS
- Formal Engineering Document Complete
- Git Checkpoint PASS
- Working Tree Clean

才可：

> TASK-0017 = FREEZE

---

# 48. AI Coding Handoff Instructions

本文件交給下一個 AI Coding 對話後，AI 必須將以下內容視為已確認狀態。

## 已完成，不得重新詢問

- TASK-0016 Decision
- TASK-0016 Report Specification
- TASK-0016 Human Acceptance
- TASK-0016 Git Checkpoint
- TASK-0017 Decision
- TASK-0017 Q1–Q136
- TASK-0017 Scope
- TASK-0017 Integration Principles
- TASK-0017 Coding Readiness
- Q91–Q136 的 Order Integration Decisions
- Q107–Q110 的 Appointment → Daily Operations Decisions
- Q122–Q126 的 Service Completed → Order Decisions
- Q127–Q130 的 Payment / Report Decisions
- Q131–Q136 的 Cross-module / Testing Decisions

不得要求使用者重新提供上述資訊。

不得重新詢問 Q1–Q136。

不得以「Q91–Q136 尚未 Decision」為理由停止。

---

# 49. AI Coding 第一個動作

AI Coding 對話開始後：

> 不得直接 Coding。

第一個工作必須是：

> READ-ONLY REPOSITORY INSPECTION

檢查：

- Git status
- Repository structure
- Existing modifications
- Existing backend
- Existing frontend
- Existing database
- Existing tests
- Existing API routes
- Existing authentication
- Existing authorization
- Existing navigation
- Existing modules
- TASK-0017 relevant integration points
- Existing Playwright / E2E structure
- Existing Order schema / API
- Existing Appointment creation flow
- Existing Daily Operation creation flow
- Existing Grooming completion flow
- Existing Boarding completion flow

完成後：

> 提出 TASK-0017 Implementation Plan。

確認沒有 Freeze Conflict 後，才開始 Coding。

---

# 50. AI Coding Stop Conditions

遇到以下任何情況：

- Freeze Conflict
- Business Rule Conflict
- Data Model Conflict
- API Contract Conflict
- Scope Conflict
- Missing Requirement
- Existing Architecture Conflict
- Q91–Q136 以外的 Schema requirement
- Q91–Q136 以外的 Business Rule requirement

必須：

> STOP

並說明：

1. 發現什麼問題。
2. 為什麼阻塞 TASK-0017。
3. 目前有哪些既有選項。
4. 最小必要 Decision 是什麼。

但是以下情況不得再被視為 Stop：

- Q91–Q103 已批准的 `appointment_id` integration。
- Q101–Q103 已批准的 `source_type` integration。
- Q94 已批准的 Appointment / Customer validation。
- Q95–Q99 已批准的 completion / duplicate billing validation。
- Q107–Q110 已批准的 Appointment → Daily Operations transaction。
- Q112–Q113 已批准的 Backend authoritative data / price validation。
- Q122–Q126 已批准的 Service Completed → Order eligibility。
- Q127–Q130 已批准的 Payment / Report reuse。
- Q131–Q134 已批准的 cross-module validation / transaction rules。
- Q135–Q136 已批准的 testing / completion requirements。

不得自行猜測超出上述範圍的需求。

---

# 51. TASK-0017 Scope Freeze Statement

TASK-0017 的核心原則：

> **Integrate what already exists. Do not redesign what is already frozen.**

TASK-0017 不是：

- 新產品功能開發
- Business Block redesign
- Architecture redesign
- Enterprise transformation
- Refactoring project

TASK-0017 是：

> **確認既有 MVP Blocks 能夠作為一個完整、連續、可實際操作的 MVP 系統運作。**

其中：

> 必要且已經由 Q91–Q136 明確批准的最小 Integration Data Model / API Contract modification，屬於 TASK-0017 Scope。

但：

> 最小 Integration modification 不等於重新設計既有 Block。

---

# 52. Authoritative Decision Rules

當不同文件、舊版文件、舊版交接內容與本文件發生衝突時：

1. TASK-0017 已確認的 Q1–Q136 Decision 為最新 Decision baseline。
2. 本正式同步版文件必須以 Q1–Q136 為準。
3. 舊版「Q1–Q90 only」內容視為 superseded。
4. 舊版「Q91–Q150 不進行」內容視為 superseded。
5. 舊版「任何 Schema modification 都 STOP」內容視為 superseded。
6. 新規則為：
   - 未經 Decision 的 Schema modification → STOP。
   - 已由 Q91–Q136 批准且必要的最小 Integration modification → ALLOWED。
7. AI Coding 不得要求使用者重新確認已完成的 Q91–Q136。
8. AI Coding 不得自行擴張 Q91–Q136 的批准範圍。

---

# 53. Current Status

    TASK-0016
        = FREEZE

    TASK-0016 Git Checkpoint
        = PASS

    Working Tree
        = CLEAN
        （以 TASK-0016 交接狀態為基準，Coding 開始時仍須實際檢查）

    TASK-0017 Decision
        = COMPLETE

    TASK-0017 Decision Questions
        = Q1–Q136

    Q1–Q136
        = ALL AI RECOMMENDATIONS ACCEPTED

    TASK-0017 Decision Freeze
        = PASS

    TASK-0017 Scope Check
        = PASS

    TASK-0017 Freeze Conflict Check
        = PASS

    TASK-0017 Coding Readiness
        = PASS

    TASK-0017 Coding
        = NOT STARTED

---

# 54. Next Action

本文件完成同步後，TASK-0017 不在本對話開始 Coding。

下一個工作階段為：

> TASK-0017 AI Coding

AI Coding 必須從：

> Repository Inspection → Implementation Plan → Freeze Conflict Check → Coding

開始。

TASK-0017 尚未完成最終 Human Acceptance。

TASK-0017 尚未進行最終 Git Checkpoint。

TASK-0017 尚未進入最終 Freeze。

本文件代表：

> **TASK-0017 Decision / Scope / Coding Specification 已完成同步並 Freeze，正式交付 AI Coding 執行。**

下一個 Task：

> TASK-0018 — Final MVP Verification

但只有在 TASK-0017 完整完成並 Freeze 後才能進入。