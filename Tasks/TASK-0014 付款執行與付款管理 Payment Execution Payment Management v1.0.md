\# TASK-0014 付款執行與付款管理 Payment Execution / Payment Management v1.0



\## 1. Document Information



| Field | Value |

|---|---|

| Project | New MVP — 小型寵物美容／寵物住宿工作室 MVP |

| Task | TASK-0014 |

| 中文名稱 | 付款執行與付款管理 |

| 英文名稱 | Payment Execution / Payment Management |

| Version | v1.0 |

| Status | Decision / Scope FREEZE |

| Previous Task | TASK-0013 訂單執行 Order Execution |

| Next Stage | AI Coding |

| Final Freeze | 待 Coding、Verification、Human Acceptance 完成後執行 |

| Formal Filename | TASK-0014 付款執行與付款管理 Payment Execution Payment Management v1.0.md |



\---



\## 2. Task Objective



TASK-0014 建立 New MVP 所需的 Payment 能力。



本 TASK 建立於已完成並 Freeze 的 TASK-0013 Order Execution 之上。



核心目的：



> 在既有 Order 基礎上，提供小型寵物美容／寵物住宿工作室日常營運所需的付款執行、付款紀錄、付款狀態與付款作廢能力。



本 TASK 不重新設計 TASK-0013 Order。



\---



\## 3. Project Boundary



本 TASK 僅適用於：



> New MVP — 小型寵物美容／寵物住宿工作室 MVP



本 TASK 不使用舊 PSOP 專案作為需求、資料模型、Business Domain、Module、API、UI 或架構設計依據。



不得將 PSOP 專屬規則重新帶入本 TASK。



\---



\## 4. Decision Status



TASK-0014 Decision 已完成。



| Item | Status |

|---|---|

| Decision Questions | Q1–Q60 |

| Decision Completion | COMPLETE |

| User Decision | 全部照 AI Recommendation |

| Final Answers | Q1–Q60 全部採用 AI Recommendation |

| Unresolved Decisions | 0 |

| MVP Baseline Consistency Review | PASS |

| Coding Readiness Check | PASS |

| Decision / Scope Freeze | FREEZE |



本文件即為 TASK-0014 Decision / Scope Freeze 後的正式工程文件。



\---



\## 5. Scope



\### 5.1 In Scope



TASK-0014 包含：



\- Payment Creation

\- Payment Amount

\- Payment Method

\- Multiple Payment

\- Mixed Payment

\- Payment Status

\- Payment History

\- Payment Void

\- Void History

\- Paid Amount

\- Remaining Amount

\- Order Payment Status

\- Payment API

\- Payment Validation

\- Payment UI

\- Order / Payment 關聯

\- 必要的 Database Transaction

\- 必要的 Transaction Integrity

\- Payment Targeted Tests

\- Payment Regression Tests

\- 必要的 Browser E2E



\---



\### 5.2 Out of Scope



TASK-0014 不包含：



\- Refund

\- Partial Refund

\- Payment Gateway

\- LINE Pay

\- ECPay

\- NewebPay

\- Stripe

\- Invoice

\- E-Invoice

\- Accounting

\- Tax

\- Financial Reconciliation

\- Finance System

\- Generic Audit Log System

\- Payment Dashboard

\- Payment Search

\- Payment Report

\- POS

\- Inventory

\- 其他與 Payment 無直接必要關係的功能



以上 Out of Scope 不得於 AI Coding 階段自行加入。



\---



\## 6. Relationship With TASK-0013



TASK-0013 已完成並 Freeze。



TASK-0013 負責：



> Order Execution



TASK-0014 負責：



> Payment Execution / Payment Management



兩者關係：



&#x20;   Order

&#x20;     ↓

&#x20;   Payment



TASK-0014 可以整合既有 Order，但不得重新設計或重做 TASK-0013 已完成的 Order 功能。



不得因 Payment 功能而重新建立：



\- Customer

\- Pet

\- Service

\- Product

\- Appointment

\- Grooming

\- Boarding

\- Order Core



\---



\## 7. Payment Core Model



TASK-0014 採用：



&#x20;   Order

&#x20;     ↓

&#x20;   Payment

&#x20;     ↓

&#x20;   0..N Payment Records



同一 Order 可以存在零筆、一筆或多筆 Payment。



每一筆 Payment 必須與合法 Order 建立關聯。



Payment 不得脫離 Order 獨立存在。



\---



\## 8. Payment Creation



\### 8.1 Creation Flow



建立 Payment 時：



&#x20;   Order Exists

&#x20;       ↓

&#x20;   取得目前 Remaining

&#x20;       ↓

&#x20;   Payment Amount > 0

&#x20;       ↓

&#x20;   Payment Amount <= Remaining

&#x20;       ↓

&#x20;   Payment Method 有效

&#x20;       ↓

&#x20;   Create Payment

&#x20;       ↓

&#x20;   Recalculate Paid Amount

&#x20;       ↓

&#x20;   Recalculate Remaining Amount

&#x20;       ↓

&#x20;   Update Order Payment Status



\---



\### 8.2 Amount Validation



Payment Amount 必須：



\- 大於 0

\- 不得超過目前 Remaining

\- 必須為有效數值

\- 必須由 Backend 重新驗證



禁止：



\- Payment Amount = 0

\- Payment Amount < 0

\- Payment Amount > Remaining

\- 對已無 Remaining 的 Order 建立有效 Payment



Frontend Validation 不得取代 Backend Validation。



\---



\## 9. Multiple Payment



同一 Order 可以存在多筆 Payment。



例如：



&#x20;   Payment 1 = 500

&#x20;   Payment 2 = 300

&#x20;   Payment 3 = 200



有效付款總額：



&#x20;   500 + 300 + 200 = 1,000



Paid Amount 必須依所有有效 Payment 的總額計算。



VOID Payment 不得計入有效 Paid Amount。



\---



\## 10. Mixed Payment



同一 Order 可以使用不同 Payment Method 完成付款。



例如：



&#x20;   現金 = 500

&#x20;   信用卡 = 300

&#x20;   轉帳 = 200



總付款：



&#x20;   1,000



TASK-0014 不限制同一 Order 只能使用單一 Payment Method。



\---



\## 11. Payment Method



Payment Method 為必要資料。



Payment Method 必須為系統允許的有效值。



實際 Payment Method 值與資料表示方式，AI Coding 時必須依現有 MVP Repository Convention 與已 Freeze 的資料結構確認。



不得自行引入第三方 Payment Gateway。



\---



\## 12. Payment Status



Payment 必須能辨識至少以下狀態：



\- 有效 Payment

\- VOID Payment



有效 Payment 才能計入：



\- Paid Amount

\- Remaining Amount

\- Order Payment Status



VOID Payment：



\- 不得再次計入有效付款總額

\- 不得再次執行 Void

\- 必須保留於 Payment History



\---



\## 13. Payment Void



Payment 不提供 Delete 操作。



錯誤付款應使用：



&#x20;   PAID

&#x20;     ↓

&#x20;   VOID



不得使用：



&#x20;   PAID

&#x20;     ↓

&#x20;   DELETE



Void 後：



\- 原 Payment 保留

\- 原 Payment Amount 保留

\- Payment History 保留

\- Payment Status 變更為 VOID

\- 必要的 Void 資訊保留

\- 重新計算有效 Paid Amount

\- 重新計算 Remaining Amount

\- 必要時重新更新 Order Payment Status



\---



\## 14. Void History



Void Payment 必須保留歷史紀錄。



不得因 Void 而刪除原始 Payment。



必要的 Void 資訊包括：



\- Void Status

\- Void Time

\- Void Operator

\- Void Reason



實際資料欄位名稱與 Repository 實作方式，於 AI Coding 階段依現有 Repository Convention 決定。



本文件不預先強制不存在的資料表欄位名稱。



\---



\## 15. Payment History



Order Detail 必須可以查看 Payment History。



Payment History 至少需要能辨識：



\- Payment Status

\- Payment Amount

\- Payment Method

\- Payment Time

\- 必要的 Payment Operator 資訊

\- 必要的 Void 資訊



VOID Payment 必須保留於歷史中。



\---



\## 16. Paid Amount



Paid Amount 定義：



&#x20;   Paid Amount

&#x20;   =

&#x20;   所有有效 Payment Amount 的總和



VOID Payment 不得計入 Paid Amount。



Paid Amount 必須由 Backend 根據有效 Payment 資料計算。



不得單純信任 Frontend 傳入的 Paid Amount。



\---



\## 17. Remaining Amount



Remaining Amount 定義：



&#x20;   Remaining Amount

&#x20;   =

&#x20;   Order Total - Paid Amount



Remaining Amount 必須反映目前有效 Payment 狀態。



Payment Creation 後必須重新計算。



Payment Void 後必須重新計算。



不得單純由 Frontend 保存或自行決定 Remaining Amount。



\---



\## 18. Order Payment Status



Payment 負責反映 Order 的付款狀態。



當有效 Payment 累計達到 Order 應付金額時：



&#x20;   Order Payment Status = Paid



尚未完成付款時：



&#x20;   Order Payment Status = Unpaid / Outstanding



實際狀態名稱必須遵循現有 MVP Repository Convention。



TASK-0014 不重新設計整個 Order Status System。



\---



\## 19. Payment And Other Business Status Boundaries



Payment Status 不等同於：



\- Appointment Status

\- Service Status

\- Grooming Status

\- Boarding Status

\- Order Execution Status



Payment 不得因付款操作直接強制完成：



\- Appointment

\- Grooming

\- Boarding

\- Service



Payment 只負責 Payment 與 Order Payment 相關狀態。



\---



\## 20. Backend Requirements



TASK-0014 Backend 必須提供 Payment 所需的 API 與 Business Logic。



至少包含：



\- Create Payment

\- List / View Payment History

\- Void Payment



Payment Business Logic 必須負責：



\- Order existence validation

\- Payment amount validation

\- Payment method validation

\- Remaining validation

\- Payment status validation

\- Paid Amount calculation

\- Remaining Amount calculation

\- Order Payment Status update

\- Void handling

\- Transaction integrity



\---



\## 21. API Direction



概念性 API：



&#x20;   POST /orders/:orderId/payments



&#x20;   GET /orders/:orderId/payments



&#x20;   POST /payments/:paymentId/void



以上為 TASK-0014 API direction。



最終 endpoint path、router 結構、controller 結構、service 結構與命名，必須於 AI Coding 開始時先檢查現有 Repository Convention。



不得因本文件強制修改既有 API Architecture。



\---



\## 22. API Validation



Backend 必須驗證：



\- Order 是否存在

\- Payment Amount 是否存在

\- Payment Amount 是否有效

\- Payment Amount 是否大於 0

\- Payment Amount 是否超過 Remaining

\- Payment Method 是否有效

\- Payment 是否存在

\- Payment 是否允許 Void

\- Payment 是否已經 VOID

\- 必要的資料完整性



Invalid Request 必須回傳適當錯誤結果。



Frontend Validation 不得取代 Backend Validation。



\---



\## 23. Database Requirements



TASK-0014 需要 Payment persistence。



Payment 必須：



\- 與 Order 建立合法關聯

\- 能保存 Payment Amount

\- 能保存 Payment Method

\- 能辨識 Payment Status

\- 能保存 Payment History 所需資料

\- 能支援 Payment Void

\- 能支援 Paid / Remaining 計算



實際：



\- Table Name

\- Column Name

\- Primary Key

\- Foreign Key

\- Index

\- Constraint

\- Migration File



必須於 AI Coding 階段先檢查現有 Repository 與 Database Schema 後決定。



不得憑空假設現有資料表命名。



\---



\## 24. Payment Creation Transaction



Payment Creation 所涉及的：



\- Payment 建立

\- Paid Amount 計算

\- Remaining Amount 計算

\- Order Payment Status 更新



必須維持必要的 Database Transaction Integrity。



若其中必要步驟失敗，不得留下部分完成的 Payment 狀態。



\---



\## 25. Payment Void Transaction



Payment Void 所涉及的：



\- Payment Status 更新

\- Void 資訊保存

\- Paid Amount 重新計算

\- Remaining Amount 重新計算

\- Order Payment Status 更新



必須維持必要的 Database Transaction Integrity。



若操作失敗，不得留下部分更新狀態。



\---



\## 26. Frontend Requirements



Payment 主要操作位置：



> Order Detail



Order Detail 應顯示：



\- Order Total

\- Paid Amount

\- Remaining Amount

\- Payment History



並提供：



\- 新增付款

\- Payment Method

\- Payment Amount

\- Payment Void



\---



\## 27. Payment UI Flow



新增付款：



&#x20;   Order Detail

&#x20;       ↓

&#x20;   查看 Order Total

&#x20;       ↓

&#x20;   查看 Paid Amount

&#x20;       ↓

&#x20;   查看 Remaining Amount

&#x20;       ↓

&#x20;   新增付款

&#x20;       ↓

&#x20;   選擇 Payment Method

&#x20;       ↓

&#x20;   輸入 / 確認 Payment Amount

&#x20;       ↓

&#x20;   Backend Validation

&#x20;       ↓

&#x20;   建立 Payment

&#x20;       ↓

&#x20;   更新 Payment History

&#x20;       ↓

&#x20;   更新 Paid Amount

&#x20;       ↓

&#x20;   更新 Remaining Amount

&#x20;       ↓

&#x20;   更新 Order Payment Status



\---



\## 28. Void UI Flow



&#x20;   Order Detail

&#x20;       ↓

&#x20;   Payment History

&#x20;       ↓

&#x20;   選擇有效 Payment

&#x20;       ↓

&#x20;   Void

&#x20;       ↓

&#x20;   必要確認

&#x20;       ↓

&#x20;   Backend Validation

&#x20;       ↓

&#x20;   Payment → VOID

&#x20;       ↓

&#x20;   Recalculate Paid

&#x20;       ↓

&#x20;   Recalculate Remaining

&#x20;       ↓

&#x20;   Update Order Payment Status

&#x20;       ↓

&#x20;   Payment History 保留原紀錄



VOID Payment 不得再次顯示可執行 Void 的操作。



\---



\## 29. UI Boundary



TASK-0014 不建立：



\- Payment Dashboard

\- Payment Search Page

\- Payment Report Page

\- Accounting UI

\- Financial Reconciliation UI



Payment UI 以 Order Detail 為主要操作入口。



\---



\## 30. Authorization Boundary



TASK-0014 必須遵循目前 MVP 已存在的 Staff / Auth 與權限邊界。



不得因 Payment 自行建立 Enterprise RBAC。



不得自行建立：



\- Enterprise Permission Matrix

\- Permission Management System

\- SSO

\- MFA

\- Enterprise Identity Architecture



實際可執行 Payment / Void 的角色與現有 MVP Authorization 規則保持一致，Coding 時依 Repository 現況實作。



\---



\## 31. Technical Baseline



TASK-0014 必須遵循 New MVP Technical Baseline。



| Layer | Technology |

|---|---|

| Frontend | Next.js |

| Router | Pages Router |

| Frontend Language | JavaScript |

| UI | Bootstrap |

| Backend | Express.js |

| Backend Language | JavaScript |

| Database | MySQL |

| DB Driver | mysql2 |

| ORM | None |

| Testing | Jest |

| API Testing | Supertest |



禁止因 TASK-0014 引入：



\- TypeScript

\- Prisma

\- Tailwind

\- Payment Microservice

\- Payment Gateway

\- Message Queue

\- Event Bus

\- Enterprise Finance Architecture

\- 其他非必要架構



\---



\## 32. Architecture Boundary



維持：



&#x20;   Next.js Frontend

&#x20;         ↓

&#x20;   Express.js API

&#x20;         ↓

&#x20;      mysql2

&#x20;         ↓

&#x20;       MySQL



TASK-0014 不改變既有 MVP System Architecture。



Payment 為既有 MVP Architecture 中新增的 Business Capability，不建立獨立服務。



\---



\## 33. Repository Inspection Requirement



AI Coding 開始後，第一步必須：



> Repository Inspection / Precondition Check



至少確認：



\- Current Git state

\- Existing Order implementation

\- Existing Order API

\- Existing Order Detail UI

\- Existing Database schema

\- Existing migrations

\- Existing authentication / authorization pattern

\- Existing validation pattern

\- Existing testing pattern

\- Existing frontend component pattern



不得在未檢查 Repository 前直接假設：



\- 檔案位置

\- API 結構

\- Table Name

\- Column Name

\- Existing function name

\- Existing component name

\- Existing middleware



\---



\## 34. TASK-0013 Freeze Boundary



TASK-0013 已 Freeze。



TASK-0014 Coding 不得：



\- 重做 Order

\- 重寫 Order CRUD

\- 重構無必要的 Order Architecture

\- 修改 Product Core

\- 修改 Service Core

\- 修改 Customer Core

\- 修改 Pet Core

\- 修改 Appointment Core

\- 修改 Grooming Core

\- 修改 Boarding Core



若 Payment Integration 必須修改既有 Order 程式碼：



> 僅允許進行 Payment Integration 所必要的最小修改。



不得藉此進行無關重構。



\---



\## 35. Traditional Chinese UI



TASK-0014 UI 必須遵循 New MVP 既有 Traditional Chinese UI Localization Baseline。



使用者可見文字不得因 TASK-0014 新增英文 UI 而破壞既有繁體中文化基準。



包含：



\- Page Labels

\- Field Labels

\- Button Text

\- Status Text

\- Validation Message

\- Error Message

\- Success Message

\- Confirmation Text

\- Empty State

\- Payment History UI



技術名稱、API 名稱、Database 名稱等工程識別名稱可依 Repository Convention 保留英文。



\---



\## 36. Testing Scope



TASK-0014 必須建立 Payment 相關 targeted tests。



\### 36.1 Payment Creation Tests



至少驗證：



\- Valid Payment

\- Invalid Order

\- Invalid Amount

\- Zero Amount

\- Negative Amount

\- Overpayment

\- Invalid Payment Method

\- Fully Paid Order

\- Multiple Payment

\- Mixed Payment



\### 36.2 Payment Void Tests



至少驗證：



\- Valid Void

\- Invalid Payment

\- Void Already Voided Payment

\- Paid Amount Recalculation

\- Remaining Amount Recalculation

\- Order Payment Status Recalculation

\- Payment History Retention



\### 36.3 Transaction Tests



至少驗證必要的：



\- Payment Creation Rollback

\- Payment Void Rollback

\- Order Payment Status Integrity



\---



\## 37. Regression Testing



TASK-0014 Coding 完成後必須執行：



\- Payment Targeted Tests

\- Full Regression



既有 MVP 功能不得因 Payment implementation 而回歸失敗。



至少需要確認與 Payment 可能直接受影響的：



\- Order

\- Product

\- Service

\- Customer

\- Pet

\- Appointment

\- Grooming

\- Boarding



\---



\## 38. Browser E2E



若 TASK-0014 UI 已完成，必須進行必要的 Browser E2E。



至少驗證：



\- 開啟 Order Detail

\- 查看 Order Total

\- 查看 Paid Amount

\- 查看 Remaining Amount

\- 新增 Payment

\- 選擇 Payment Method

\- 輸入 Payment Amount

\- 完成 Payment

\- Payment History 更新

\- Paid Amount 更新

\- Remaining Amount 更新

\- Order Payment Status 更新

\- Payment Void

\- Void 後資料重新計算

\- VOID Payment 保留於 History

\- VOID Payment 不可再次 Void



Browser E2E 必須使用實際瀏覽器流程驗證。



不得僅以 Jest / Supertest PASS 宣稱 Browser E2E PASS。



\---



\## 39. Verification Status At Document Freeze



本文件屬於：



> Decision / Scope Freeze



因此本文件輸出時：



\- AI Coding：尚未開始

\- Implementation Verification：尚未開始

\- Browser E2E：尚未執行

\- Full Regression：尚未執行

\- Human Acceptance of Implementation：尚未執行

\- Final TASK Freeze：尚未執行



不得將上述未執行項目標示為 PASS。



\---



\## 40. Definition of Done



TASK-0014 Implementation 完成至少必須滿足：



\- Payment Creation 完成

\- Payment Method 完成

\- Multiple Payment 完成

\- Mixed Payment 完成

\- Payment Status 完成

\- Payment History 完成

\- Payment Void 完成

\- Void History 完成

\- Paid Amount 正確

\- Remaining Amount 正確

\- Order Payment Status 正確

\- Backend Validation 完成

\- Database Transaction Integrity 完成

\- Payment API 完成

\- Order Detail Payment UI 完成

\- Traditional Chinese UI 完成

\- Targeted Tests PASS

\- Full Regression PASS

\- 必要 Browser E2E PASS

\- Scope Verification PASS

\- 無未解決 Blocking Issue



\---



\## 41. Acceptance Criteria



\### AC-01 Payment Creation



Given 一個存在且尚有未付款金額的 Order，



When 使用者建立有效 Payment，



Then 系統必須成功建立 Payment。



\---



\### AC-02 Payment Amount Validation



Given Payment Amount 為 0、負數或超過 Remaining，



When 建立 Payment，



Then Backend 必須拒絕該操作。



\---



\### AC-03 Multiple Payment



Given 一個 Order，



When 使用者分多次付款，



Then 系統必須保留多筆有效 Payment 並正確計算 Paid Amount。



\---



\### AC-04 Mixed Payment



Given 一個 Order，



When 使用者使用不同 Payment Method 分次付款，



Then 系統必須正確保留各 Payment Method 與 Payment Amount。



\---



\### AC-05 Paid Amount



Given 多筆有效 Payment，



When 系統計算 Paid Amount，



Then Paid Amount 必須等於所有有效 Payment Amount 的總和。



\---



\### AC-06 Remaining Amount



Given Order Total 與有效 Payment，



When 系統計算 Remaining Amount，



Then Remaining Amount 必須正確反映尚未付款金額。



\---



\### AC-07 Payment Void



Given 一筆有效 Payment，



When 使用者執行 Void，



Then Payment 必須變為 VOID，而非被刪除。



\---



\### AC-08 Void Recalculation



Given Payment 被 VOID，



When Void 完成，



Then 系統必須重新計算：



\- Paid Amount

\- Remaining Amount

\- Order Payment Status



\---



\### AC-09 Void History



Given 一筆 Payment 已 VOID，



When 使用者查看 Payment History，



Then 原 Payment 必須仍存在並顯示 VOID 狀態。



\---



\### AC-10 Repeated Void Prevention



Given Payment 已經 VOID，



When 使用者再次執行 Void，



Then 系統必須拒絕操作。



\---



\### AC-11 Order Boundary



Given Payment 操作完成，



When Payment Status 發生變更，



Then 系統不得因此任意改變 Appointment、Grooming、Boarding 或其他非 Payment 業務狀態。



\---



\### AC-12 Transaction Integrity



Given Payment Creation 或 Void 過程發生必要步驟失敗，



When Transaction 結束，



Then 不得留下不一致的部分更新資料。



\---



\### AC-13 UI



Given 使用者開啟 Order Detail，



When Order 存在 Payment 資料，



Then UI 必須能顯示：



\- Order Total

\- Paid Amount

\- Remaining Amount

\- Payment History



並提供符合 Scope 的 Payment 操作。



\---



\### AC-14 Regression



Given TASK-0014 完成，



When 執行 Full Regression，



Then 既有 MVP 功能不得產生未預期 Regression。



\---



\## 42. Scope Verification



Coding 完成後必須確認：



\### Included



\- Payment

\- Payment History

\- Payment Void

\- Paid / Remaining

\- Order Payment Status

\- Payment API

\- Payment UI

\- Validation

\- Transaction Integrity

\- Testing



\### Excluded



\- Refund

\- Accounting

\- Invoice

\- Tax

\- Payment Gateway

\- Payment Dashboard

\- Payment Report

\- POS

\- Inventory

\- Enterprise Finance Architecture



若發現實作超出上述 Scope：



> Scope Verification = FAIL



\---



\## 43. AI Coding Instructions



AI Coding Agent 必須：



1\. 以本正式文件作為 TASK-0014 Scope Authority。

2\. 只以 New MVP 為專案基準。

3\. 不引用舊 PSOP 作為實作依據。

4\. 先 Inspect Repository。

5\. 先確認 TASK-0013 Freeze 狀態。

6\. 先確認現有 Order implementation。

7\. 先確認現有 Database schema。

8\. 先確認既有 API / UI / Testing convention。

9\. 建立 Implementation Plan。

10\. 只實作 TASK-0014 Scope。

11\. 避免不必要的 Architecture Change。

12\. 避免無關 Refactor。

13\. 不新增 Out of Scope 功能。

14\. 執行 Targeted Tests。

15\. 執行 Full Regression。

16\. 有 UI 時執行必要 Browser E2E。

17\. 回報實際 Verification Result。

18\. 不得把未執行的測試標示為 PASS。



\---



\## 44. Freeze Rules



本文件 Freeze 後：



\- TASK-0014 Decision 不得自行重新設計。

\- TASK-0014 Scope 不得自行擴張。

\- Out of Scope 不得自行加入。

\- TASK-0013 Freeze 不得被重新設計。

\- MVP Technical Baseline 不得被更換。

\- PSOP 規格不得重新導入。

\- API、Database、UI 的實際命名可以在 Coding 階段依 Repository Convention 決定。

\- Repository Inspection 結果若與文件中的概念方向衝突，必須停止並提出 Scope / Baseline Conflict，不得自行修改 Freeze Scope。



\---



\## 45. Current Engineering Status



TASK-0014 目前狀態：



&#x20;   Decision

&#x20;     ↓

&#x20;   COMPLETE

&#x20;     ↓

&#x20;   MVP Baseline Consistency Review

&#x20;     ↓

&#x20;   PASS

&#x20;     ↓

&#x20;   Coding Readiness Check

&#x20;     ↓

&#x20;   PASS

&#x20;     ↓

&#x20;   Decision / Scope Freeze

&#x20;     ↓

&#x20;   FREEZE

&#x20;     ↓

&#x20;   Formal Engineering Document

&#x20;     ↓

&#x20;   THIS DOCUMENT

&#x20;     ↓

&#x20;   AI Coding

&#x20;     ↓

&#x20;   PENDING



目前尚未完成：



\- AI Coding

\- Implementation Verification

\- Browser E2E

\- Full Regression

\- Human Acceptance

\- TASK-0014 Final Freeze



\---



\## 46. Final Status



TASK-0014 Decision / Scope：



> FREEZE



TASK-0014 Formal Engineering Document：



> v1.0



TASK-0014 Implementation：



> PENDING



TASK-0014 Verification：



> PENDING



TASK-0014 Human Acceptance：



> PENDING



TASK-0014 Final Freeze：



> PENDING
