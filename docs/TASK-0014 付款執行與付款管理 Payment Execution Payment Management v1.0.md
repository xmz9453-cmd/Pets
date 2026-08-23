\# TASK-0014 付款執行與付款管理 Payment Execution Payment Management v1.0



\## 1. Document Information



| Field | Value |

|---|---|

| Task | TASK-0014 |

| 中文名稱 | 付款執行與付款管理 |

| English Name | Payment Execution Payment Management |

| Version | v1.0 |

| Document Type | Formal Engineering Document |

| Project | New MVP — 小型寵物美容／寵物住宿工作室 MVP |

| Status | FREEZE |

| Previous Task | TASK-0013 — 訂單執行 Order Execution |

| Dependency | Order |

| Human Acceptance | PASS |

| Final Verification | PASS |



\### Formal Filename



`TASK-0014 付款執行與付款管理 Payment Execution Payment Management v1.0.md`



\---



\## 2. Task Objective



TASK-0014 負責建立 New MVP 中的付款執行與付款管理能力。



本 TASK 建立於已完成並 Freeze 的 TASK-0013 Order Execution 之上。



Payment 的核心責任為：



\- 建立付款紀錄

\- 管理付款方式

\- 支援同一訂單多筆付款

\- 支援不同付款方式的混合付款

\- 計算已付款金額

\- 計算剩餘應付金額

\- 管理付款狀態

\- 保留付款歷史

\- 支援付款作廢

\- 作廢後重新計算付款狀態

\- 維持付款資料一致性



Payment 不負責重新設計 Order 核心生命週期。



\---



\## 3. Project Baseline



本 TASK 屬於：



> New MVP — 小型寵物美容／寵物住宿工作室 MVP



不得混入舊 PSOP 專案之需求、架構、資料模型、API、UI 或 Business Logic。



MVP 核心營運流程：



Customer

→ Pet

→ Appointment

→ Daily Operations

→ Check-in

→ Grooming / Boarding

→ Service Completed

→ Order

→ Payment

→ Basic Report



本 TASK 必須遵守既有 MVP Baseline、既有 Freeze 邊界與技術基準。



\---



\## 4. Technical Baseline



\### 4.1 Frontend



\- Next.js

\- Pages Router

\- JavaScript

\- Bootstrap



\### 4.2 Backend



\- Express.js

\- JavaScript



\### 4.3 Database



\- MySQL

\- mysql2



\### 4.4 ORM



\- 不使用 Prisma



\### 4.5 Testing



\- Jest

\- Supertest

\- Browser E2E



\### 4.6 Architecture



```text

Next.js Frontend

&#x20;       ↓

Express.js API

&#x20;       ↓

mysql2

&#x20;       ↓

MySQL

```



本 TASK 不得因 Payment 功能引入新的大型架構、ORM、Payment Gateway 或 Enterprise Finance Architecture。



\---



\## 5. Scope



\### 5.1 In Scope



本 TASK 包含：



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

\- Database Transaction

\- Transaction Integrity

\- Payment Targeted Tests

\- Full Regression

\- Browser E2E

\- Payment / Order Integration



\---



\## 6. Out of Scope



以下功能不屬於 TASK-0014：



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

\- Enterprise Finance Architecture

\- Enterprise RBAC

\- SSO

\- MFA

\- Message Queue

\- Event Bus

\- Payment Microservice

\- 與 Payment 無直接關係的功能

\- 無關 Refactor



不得因實作 Payment 而擴張上述 Scope。



\---



\## 7. Relationship With Order



Payment 必須建立於既有 Order。



基本關係：



```text

Order

&#x20; ↓

Payment

&#x20; ↓

0..N Payment Records

```



同一 Order 可以存在多筆有效 Payment。



Payment 不得取代 Order。



Payment 不得重新定義 Order 的核心資料模型與生命週期。



\---



\## 8. Payment Data Requirements



Payment 必須能保存必要的：



\- Order relationship

\- Payment Amount

\- Payment Method

\- Payment Status

\- Payment Time

\- Payment Operator

\- 必要 Void Information



實際資料表、欄位、索引、Foreign Key 與命名必須遵循 Repository 現有 Database Convention。



\---



\## 9. Payment Creation



建立 Payment 時：



1\. Order 必須存在。

2\. Payment Amount 必須存在。

3\. Payment Amount 必須大於 0。

4\. Payment Amount 不得超過目前 Remaining Amount。

5\. Payment Method 必須為有效值。

6\. Payment 建立後重新計算 Paid Amount。

7\. Payment 建立後重新計算 Remaining Amount。

8\. Order Payment Status 必須同步更新。



Backend 必須執行所有關鍵驗證。



Frontend 不得被視為資料一致性的最終保障。



\---



\## 10. Multiple Payment



系統必須支援同一 Order 多筆 Payment。



例如：



```text

Order

├── Payment 1

├── Payment 2

└── Payment 3

```



每筆 Payment 必須保留獨立：



\- Amount

\- Method

\- Status

\- Time

\- Operator



有效付款總額必須正確累計。



\---



\## 11. Mixed Payment



同一 Order 可以使用不同 Payment Method。



例如：



```text

現金    500

信用卡  300

轉帳    200

```



各筆付款必須分別保存，不得將不同付款方式錯誤合併成單一 Payment Record。



\---



\## 12. Paid Amount



有效 Paid Amount：



```text

Paid Amount

=

SUM(所有有效 Payment Amount)

```



已作廢 Payment：



> 不得計入 Paid Amount。



Paid Amount 必須依 Backend / Database 中的實際 Payment 狀態計算。



Frontend 不得自行決定最終 Paid Amount。



\---



\## 13. Remaining Amount



Remaining Amount：



```text

Remaining Amount

=

Order Total

\-

有效 Paid Amount

```



Payment 建立後：



> 必須重新計算 Remaining Amount。



Payment 作廢後：



> 必須重新計算 Remaining Amount。



\---



\## 14. Order Payment Status



Payment 負責管理：



> Order Payment Status



Payment 完成後，Order Payment Status 必須依有效付款金額正確反映目前付款狀態。



未完成付款：



> 必須能辨識為尚未付款完成。



已完成付款：



> 必須能辨識為付款完成。



實際 Status enum / value 必須遵循實作時既有 Repository Convention。



Payment 不得重新設計 Order 的其他 Status。



\---



\## 15. Payment Void



Payment 不採用直接 Delete 作為作廢方式。



有效 Payment 作廢後：



\- Payment Record 保留

\- Payment Amount 保留

\- Payment History 保留

\- Payment Status 改為 VOID

\- Paid Amount 重新計算

\- Remaining Amount 重新計算

\- Order Payment Status 重新計算



已 VOID Payment：



> 不得再次 VOID。



\---



\## 16. Payment History



Order Detail 必須提供 Payment History。



Payment History 至少顯示：



\- Payment Amount

\- Payment Method

\- Payment Status

\- Payment Time

\- 必要 Operator

\- 必要 Void Information



已 VOID Payment：



> 不得從歷史紀錄中刪除。



\---



\## 17. Transaction Requirements



Payment Creation 的必要資料更新必須維持 Transaction Integrity。



必要操作必須在同一 Transaction 邏輯下完成：



\- Payment creation

\- Paid recalculation

\- Remaining recalculation

\- Order Payment Status update



Payment Void 同樣必須維持 Transaction Integrity。



必要的付款資料更新使用：



\- Transaction

\- Row Lock

\- Rollback



如果必要步驟發生錯誤：



> 必須 Rollback。



不得留下部分更新。



\---



\## 18. API Requirements



TASK-0014 實作 Payment API。



實際 API 已實作：



\### 18.1 Create Payment



```text

POST /api/orders/:orderId/payments

```



用途：



> 建立 Order Payment。



\### 18.2 List Payments



```text

GET /api/orders/:orderId/payments

```



用途：



> 取得指定 Order 的 Payment History。



\### 18.3 Void Payment



```text

POST /api/payments/:paymentId/void

```



用途：



> 將有效 Payment 作廢。



API 實作必須遵循既有 Express Routing、Validation、Response 與 Error Handling Convention。



\---



\## 19. API Validation



\### 19.1 Create Payment



必須驗證：



\- Order exists

\- Amount exists

\- Amount valid

\- Amount > 0

\- Amount <= Remaining

\- Payment Method valid



\### 19.2 Void Payment



必須驗證：



\- Payment exists

\- Payment 屬於有效 Order

\- Payment 尚未 VOID

\- Payment 符合作廢條件



錯誤處理必須遵循既有 API Convention。



\---



\## 20. UI Requirements



Payment UI 整合於：



> Order Detail



不得建立獨立 Payment Dashboard。



Order Detail 必須提供：



\- Order Total

\- Paid Amount

\- Remaining Amount

\- Payment History

\- 新增付款

\- Payment Method

\- Payment Amount

\- Payment Void



\---



\## 21. Payment UI Flow



```text

Order Detail

&#x20;   ↓

查看付款摘要

&#x20;   ↓

新增付款

&#x20;   ↓

選擇付款方式

&#x20;   ↓

輸入付款金額

&#x20;   ↓

確認付款

&#x20;   ↓

Backend Validation

&#x20;   ↓

Payment Created

&#x20;   ↓

重新載入 Payment History

&#x20;   ↓

重新載入 Paid Amount

&#x20;   ↓

重新載入 Remaining Amount

&#x20;   ↓

重新載入 Order Payment Status

```



\---



\## 22. Payment Void UI Flow



```text

Payment History

&#x20;   ↓

選擇有效 Payment

&#x20;   ↓

作廢

&#x20;   ↓

確認

&#x20;   ↓

Backend Validation

&#x20;   ↓

Payment → VOID

&#x20;   ↓

重新計算

&#x20;   ↓

重新載入 UI

```



已 VOID Payment：



> 不得提供再次作廢的有效操作。



\---



\## 23. UI Traditional Chinese Localization



所有使用者可見文字必須遵循：



> UI 繁體中文化基準 Traditional Chinese UI Localization Baseline v1.0



適用於：



\- Page Title

\- Section Title

\- Field Label

\- Button

\- Status

\- Validation

\- Error

\- Success

\- Confirmation

\- Empty State

\- Payment History

\- Payment Method

\- Payment Status

\- Void Action



技術識別名稱可以保留英文。



使用者可見 UI 不得任意使用英文取代既有繁體中文化要求。



\---



\## 24. UI Usability Requirements



Payment UI 必須：



\- 清楚區分訂單總額、已付金額與剩餘金額

\- 清楚顯示付款方式

\- 清楚顯示付款狀態

\- 清楚區分有效 Payment 與 VOID Payment

\- 讓使用者能辨識付款是否成功

\- 讓使用者能辨識付款是否已作廢

\- 避免已 VOID Payment 再次被操作

\- 遵循既有 Bootstrap UI Convention



\---



\## 25. Testing Requirements



\### 25.1 Payment Creation



必須驗證：



\- Valid Payment

\- Invalid Order

\- Zero Amount

\- Negative Amount

\- Overpayment

\- Invalid Payment Method

\- Fully Paid Order

\- Multiple Payment

\- Mixed Payment



\### 25.2 Payment Void



必須驗證：



\- Valid Void

\- Invalid Payment

\- Already VOID Payment

\- Paid Recalculation

\- Remaining Recalculation

\- Order Payment Status Recalculation

\- History Retention

\- Repeated Void Prevention



\### 25.3 Transaction



必須驗證：



\- Create Rollback

\- Void Rollback

\- Order Payment Status Integrity



\---



\## 26. Verification Results



\### 26.1 Backend Check



> PASS



\### 26.2 Frontend Build



> PASS



\### 26.3 Payment Targeted Tests



> PASS



結果：



```text

3 / 3 tests PASS

```



\### 26.4 Full Regression



> PASS



結果：



```text

14 suites

65 tests

全部 PASS

```



\### 26.5 Browser E2E



> PASS



已實際使用 Browser / Playwright 驗證核心 Payment Flow。



\---



\## 27. Browser E2E Verification



實際驗證流程：



```text

登入

↓

開啟 Order #1

↓

確認訂單總額 / 已付 / 剩餘

↓

輸入付款金額 100

↓

選擇付款方式：現金

↓

確認付款

↓

確認付款成功

↓

確認已付金額更新

↓

執行付款作廢

↓

確認付款歷史仍保留

↓

確認狀態為「已作廢」

↓

確認已付金額回到 $0.00

↓

確認剩餘金額回到 $1290.00

↓

確認已作廢付款不再提供「作廢」操作

```



Browser E2E 實際結果：



\- Order #1 顯示總額、已付金額、剩餘金額：PASS

\- 新增現金 100 元：PASS

\- 付款成功訊息：PASS

\- 已付金額更新：PASS

\- 付款作廢：PASS

\- 作廢歷史保留：PASS

\- 狀態顯示「已作廢」：PASS

\- 已付金額重新計算為 `$0.00`：PASS

\- 剩餘金額重新計算為 `$1290.00`：PASS

\- 作廢後不再顯示作廢按鈕：PASS



\---



\## 28. Transaction Verification



Payment Creation：



> 使用 Transaction、Row Lock 與 Rollback 機制。



Payment Void：



> 使用 Transaction、Row Lock 與 Rollback 機制。



Verification Result：



> PASS



資料更新必須維持：



\- Payment Record Integrity

\- Paid Amount Integrity

\- Remaining Amount Integrity

\- Order Payment Status Integrity



\---



\## 29. Scope Verification



完成 Coding 後已進行 Scope Diff 與靜態搜尋檢查。



檢查內容包括：



\- Modified Files

\- New Files

\- Deleted Files

\- Unexpected Changes

\- Payment Scope

\- Out-of-Scope Keyword / Feature Search



未發現 TASK-0014 以外的下列功能：



\- Refund

\- Invoice

\- Payment Gateway

\- Accounting

\- Dashboard

\- Inventory

\- 其他明確 Out-of-Scope Finance 功能



Verification Result：



> PASS



\---



\## 30. Implementation Changes



TASK-0014 實作包含：



\### 30.1 Database



新增 Payment migration。



Migration 支援：



\- 多筆付款

\- 混合付款

\- Payment Status

\- 作廢歷史

\- 操作人員

\- Order 關聯



\### 30.2 Backend



新增 Payment：



\- Repository

\- Service

\- Controller

\- Routes



\### 30.3 API



新增：



```text

POST /api/orders/:orderId/payments

GET /api/orders/:orderId/payments

POST /api/payments/:paymentId/void

```



\### 30.4 Frontend



修改：



```text

frontend/pages/orders/\[id].js

```



加入 Order Detail Payment UI。



\### 30.5 Frontend API Client



新增 / 修改 Payment API client。



\### 30.6 Tests



新增：



```text

payment.test.js

```



並調整既有測試的 Payment Foreign Key 清理，以維持測試資料清理與 Regression 穩定性。



\---



\## 31. TASK-0013 Boundary Protection



TASK-0013：



> Order Execution



已於 TASK-0013 完成並 Freeze。



TASK-0014 實作以 TASK-0013 現有 Order 功能為基礎。



Verification 已確認：



> TASK-0013 文件未被修改。



TASK-0014 不得重新設計或破壞 TASK-0013 Freeze 功能。



\---



\## 32. Acceptance Criteria



| ID | Acceptance Criteria | Result |

|---|---|---|

| AC-01 | Payment Creation | PASS |

| AC-02 | Payment Amount Validation | PASS |

| AC-03 | Multiple Payment | PASS |

| AC-04 | Mixed Payment | PASS |

| AC-05 | Paid Amount | PASS |

| AC-06 | Remaining Amount | PASS |

| AC-07 | Payment Void | PASS |

| AC-08 | Void Recalculation | PASS |

| AC-09 | Void History | PASS |

| AC-10 | Repeated Void Prevention | PASS |

| AC-11 | Order Boundary | PASS |

| AC-12 | Transaction Integrity | PASS |

| AC-13 | Payment UI | PASS |

| AC-14 | Regression | PASS |



\---



\## 33. Definition of Done



以下條件全部成立：



\- \[x] Payment Creation 完成

\- \[x] Payment Method 完成

\- \[x] Multiple Payment 完成

\- \[x] Mixed Payment 完成

\- \[x] Payment Status 完成

\- \[x] Payment History 完成

\- \[x] Payment Void 完成

\- \[x] Void History 完成

\- \[x] Paid Amount 正確

\- \[x] Remaining Amount 正確

\- \[x] Order Payment Status 正確

\- \[x] Backend Validation 完成

\- \[x] Transaction Integrity 完成

\- \[x] Payment API 完成

\- \[x] Order Detail Payment UI 完成

\- \[x] Traditional Chinese UI 完成

\- \[x] Targeted Tests PASS

\- \[x] Full Regression PASS

\- \[x] Browser E2E PASS

\- \[x] Scope Verification PASS

\- \[x] Human Acceptance PASS

\- \[x] 無 Blocking Issue



\---



\## 34. Git Status



TASK-0014 Human Acceptance PASS 時：



> 尚未建立 TASK-0014 Git Freeze Commit。



本正式文件建立後，應先保存至：



```text

docs/TASK-0014 付款執行與付款管理 Payment Execution Payment Management v1.0.md

```



Git Freeze Checkpoint 應於正式文件保存確認後進行。



\---



\## 35. Git Safety Boundary



TASK-0014 Git Freeze Checkpoint 前，不得：



\- 修改 TASK-0013 Freeze Commit

\- 修改 TASK-0013 正式文件

\- 刪除既有 untracked 文件

\- Commit `.env`

\- Commit credentials

\- Commit secrets

\- Commit `node\_modules`

\- Commit `.next`

\- Commit logs

\- Commit build artifacts

\- 建立無關 Commit



已知 TASK-0013 Freeze checkpoint：



```text

12771da0c0cab3f7847f260d18d02817c567ad06

```



TASK-0014 Git Checkpoint 必須保留既有歷史。



\---



\## 36. Final Status



TASK-0014：



> \*\*FREEZE\*\*



狀態鏈：



```text

TASK-0014 Decision

&#x20;       ↓

Scope Freeze

&#x20;       ↓

Coding Readiness

&#x20;       ↓

AI Coding

&#x20;       ↓

Verification

&#x20;       ↓

Browser E2E

&#x20;       ↓

Scope Verification

&#x20;       ↓

Human Acceptance PASS

&#x20;       ↓

Formal Engineering Document

&#x20;       ↓

FREEZE

```



\---



\## 37. Freeze Boundary



TASK-0014 Freeze 後，以下內容視為正式基準：



\- Payment Scope

\- Payment Data Model

\- Payment API

\- Payment Validation

\- Payment Transaction Rules

\- Payment UI

\- Payment History

\- Payment Void

\- Paid Amount

\- Remaining Amount

\- Order Payment Status

\- Traditional Chinese UI Requirements

\- Testing Requirements

\- Acceptance Criteria

\- Definition of Done

\- Verification Results



後續 TASK 不得自行改寫本 TASK 的 Freeze Decision。



如需變更：



> 必須透過新的 TASK 或正式變更流程處理。



\---



\## 38. Final Freeze Declaration



> TASK-0014 — 付款執行與付款管理 Payment Execution Payment Management



正式狀態：



> \*\*FREEZE\*\*



Human Acceptance：



> \*\*PASS\*\*



Verification：



> \*\*PASS\*\*



Browser E2E：



> \*\*PASS\*\*



Full Regression：



> \*\*PASS — 14 suites / 65 tests\*\*



TASK-0014 正式工程文件版本：



> \*\*v1.0\*\*
