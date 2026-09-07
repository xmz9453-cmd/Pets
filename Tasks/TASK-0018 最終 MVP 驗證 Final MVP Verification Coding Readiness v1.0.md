\# TASK-0018 最終 MVP 驗證 Final MVP Verification Coding Readiness v1.0



\## 1. Document Information



| Field | Value |

|---|---|

| Task | TASK-0018 |

| Task Name | 最終 MVP 驗證 Final MVP Verification |

| Document Type | Coding Readiness |

| Version | v1.0 |

| Status | CODING READY |

| Decision Status | FREEZE |

| Decision Scope | Q1–Q90 |

| Decision Completion | 90 / 90 |

| Previous Task | TASK-0017 系統整合 System Integration — FREEZE |

| Next Stage | TASK-0018 AI Coding |

| Formal File Name | TASK-0018 最終 MVP 驗證 Final MVP Verification Coding Readiness v1.0 |



\---



\## 2. Task Objective



TASK-0018 為整個 MVP 的最終驗證階段。



本 Task 不建立新的 Business Block。



本 Task 的目的，是針對目前已完成並 Freeze 的 MVP，進行完整 Final Verification，確認：



\- 13 個 MVP Blocks 均可正常運作。

\- Core Operational Flow 可完整執行。

\- Grooming 與 Boarding 兩條服務流程均可完整執行。

\- Customer / Pet / Appointment / Service / Order / Payment / Report 資料關係正確。

\- Business State 正確。

\- Authentication / Authorization 正確。

\- Frontend / Backend API / MySQL Persistence 一致。

\- Automated Test 通過。

\- Production Build 通過。

\- Browser Verification 通過。

\- Regression Verification 通過。

\- 不存在 Critical / Blocker。

\- Human Acceptance 可以通過。

\- Git Checkpoint 可以建立。

\- TASK-0018 最終可以進入 FREEZE。



\---



\## 3. Decision Freeze Status



TASK-0018 Decision 已完成。



| Decision Batch | Status |

|---|---|

| Q1–Q15 | ACCEPTED |

| Q16–Q30 | ACCEPTED |

| Q31–Q45 | ACCEPTED |

| Q46–Q60 | ACCEPTED |

| Q61–Q75 | ACCEPTED |

| Q76–Q90 | ACCEPTED |



\### Decision Summary



\- Total Questions: 90

\- Confirmed: 90

\- Unconfirmed: 0

\- AI Recommendation Accepted: 90

\- Completion: 100%

\- Decision Freeze: PASS



Q1–Q90 不得重新詢問、重新決策或重新設計。



\---



\## 4. Coding Readiness Decision



TASK-0018 已達到：



> DECISION FREEZE / CODING READY



下一階段為：



> TASK-0018 AI Coding



AI Coding 的核心任務不是新增功能，而是：



> 驗證現有 MVP → 找出實際缺陷 → 分類 → 最小修正 → Retest → Regression



\---



\## 5. Verification-First Rule



TASK-0018 必須遵守以下執行順序：



1\. Inspect Existing System

2\. Run Existing Automated Tests

3\. Run Production Build / Static Checks

4\. Verify API

5\. Verify Database Persistence

6\. Verify Browser Core Flow

7\. Verify Negative Scenarios

8\. Classify Findings

9\. Fix Confirmed Defects Only

10\. Retest Affected Area

11\. Run Regression

12\. Re-run Browser Verification

13\. Collect Evidence

14\. Prepare Human Acceptance



不得在未確認問題前進行預防性 Refactor。



\---



\## 6. No Redesign Rule



TASK-0018 必須沿用既有 Freeze Business Blocks。



禁止：



\- Business Model Redesign

\- Database Redesign

\- API Redesign

\- Domain Architecture Redesign

\- Authentication Architecture Redesign

\- Authorization Architecture Redesign

\- 新 State Management Framework

\- 新 API Client Layer

\- Enterprise Architecture

\- 不必要 Design Pattern

\- 不相關 Refactor



只有確認實際 Defect 時，才允許進行最小必要修改。



\---



\## 7. No Scope Expansion Rule



TASK-0018 不得新增：



\- 新 Business Block

\- Multi-tenant SaaS

\- Enterprise RBAC

\- SSO

\- MFA

\- Full POS

\- Full Inventory

\- LINE API

\- Online Booking Platform

\- Enterprise Reporting

\- 新外部平台整合



Product 僅維持既有 Basic Product Scope。



\---



\## 8. Frozen Technical Baseline



\### Frontend



\- Next.js

\- Pages Router

\- JavaScript

\- Bootstrap



\### Backend



\- Express.js

\- JavaScript



\### Database



\- MySQL

\- mysql2



\### Testing



\- Jest

\- Supertest



\---



\## 9. Prohibited Technology Changes



TASK-0018 不得導入：



\- TypeScript

\- Tailwind

\- Prisma

\- Cypress

\- New E2E Framework

\- New State Management Framework

\- New API Client Layer

\- New Domain Architecture

\- Dependency Injection Framework

\- Enterprise Architecture

\- Enterprise RBAC

\- Unnecessary Design Patterns



工程原則：



> 該寫的才寫。



\---



\## 10. MVP Blocks Final Verification Scope



以下 13 個 MVP Blocks 全部必須納入 Final Verification：



1\. Staff / Auth

2\. Shop Settings

3\. Customer

4\. Pet

5\. Service

6\. Appointment

7\. Daily Operations

8\. Grooming

9\. Boarding

10\. Order

11\. Payment

12\. Product

13\. Report



驗證深度可以依重要性不同，但不得完全省略任何 MVP Block。



\---



\## 11. Core Operational Flow



Final Verification 的主要 Backbone：



Customer → Pet → Appointment → Daily Operations → Check-in → Grooming / Boarding → Service Completed → Order → Payment → Report



必須分別驗證兩條服務路徑。



\---



\## 12. Grooming E2E Verification



完整流程：



Customer → Pet → Appointment → Daily Operations → Check-in → Grooming → Service Completed → Order → Payment → Report



必須確認：



\- Customer identity 正確。

\- Pet identity 正確。

\- Appointment identity 正確。

\- Service identity 正確。

\- Business State 正確。

\- Service Completed 已持久化。

\- Order relationship 正確。

\- Payment relationship 正確。

\- Report 正確反映完成 Payment。



\---



\## 13. Boarding E2E Verification



完整流程：



Customer → Pet → Appointment → Daily Operations → Check-in → Boarding → Service Completed → Order → Payment → Report



必須確認：



\- Customer identity 正確。

\- Pet identity 正確。

\- Appointment identity 正確。

\- Boarding Service identity 正確。

\- Boarding Business State 正確。

\- Service Completed 已持久化。

\- Order relationship 正確。

\- Payment relationship 正確。

\- Report 正確反映完成 Payment。



\---



\## 14. Customer Verification



必須驗證：



\- Customer Create

\- Customer Search / Select

\- Customer Persistence

\- Customer → Pet relationship

\- Customer context 可被後續流程取得

\- Reload / Re-fetch 後 Customer identity 正確



不得建立平行 Customer Data Source。



\---



\## 15. Pet Verification



必須驗證：



\- Pet Create

\- Pet Search / Select

\- Pet → Customer relationship

\- Pet Persistence

\- Pet identity 在 Appointment 中保持正確

\- Pet identity 在 Daily Operations 中保持正確

\- Pet identity 在 Grooming / Boarding 中保持正確

\- Pet identity 在 Order 中保持正確



不得建立平行 Pet Data Source。



\---



\## 16. Appointment Verification



必須驗證：



\- Customer context

\- Pet context

\- Service context

\- Appointment time

\- Appointment state

\- Persistence

\- Re-fetch consistency

\- Daily Operations navigation



Appointment 必須使用既有 Service Management 資料。



Service Catalog 必須以既有 ACTIVE Service data 為 authoritative source。



必須確認：



\- Grooming Service 可使用。

\- Boarding Service 可使用。

\- 不存在錯誤的 Frontend hardcoded Service Catalog。



不得建立第二套 Service Catalog。



\---



\## 17. Daily Operations Verification



必須驗證：



\- 正確 Operational Date

\- 正確 Appointment

\- 正確 Customer

\- 正確 Pet

\- 正確 Service

\- Appointment identity consistency

\- Check-in navigation

\- Date filtering 不造成正常 Appointment 遺失



Daily Operations 必須使用既有 Appointment data。



不得建立平行 Appointment Source。



\---



\## 18. Check-in Verification



必須驗證：



\- 使用既有 Appointment / Daily Operations data。

\- Customer identity 保持一致。

\- Pet identity 保持一致。

\- Appointment identity 保持一致。

\- Business State 正確更新。

\- Grooming 可取得正確狀態。

\- Boarding 可取得正確狀態。



不得建立新的 Customer / Pet / Appointment data source。



\---



\## 19. Grooming Verification



必須驗證：



\- Check-in → Grooming

\- Correct Customer

\- Correct Pet

\- Correct Appointment

\- Correct Service

\- Correct Business State

\- Service Completed

\- Persistence

\- Order transition

\- Payment transition

\- Report impact



\---



\## 20. Boarding Verification



必須驗證：



\- Check-in → Boarding

\- Correct Customer

\- Correct Pet

\- Correct Appointment

\- Correct Boarding Service

\- Correct Business State

\- Service Completed

\- Persistence

\- Order transition

\- Payment transition

\- Report impact



\---



\## 21. Service Completed Verification



必須驗證：



\- Grooming completion persistence。

\- Boarding completion persistence。

\- Correct Appointment relationship。

\- Correct Pet relationship。

\- Correct Service relationship。

\- Correct Business State。

\- Order 可以正確接續。

\- Reload / Re-fetch 後狀態仍正確。



不得自行新增新的 Service State。



\---



\## 22. Order Verification



必須驗證：



\- Service item

\- Product item（若既有 Order 支援）

\- Amount

\- Customer / Pet context

\- Service Completed prerequisite

\- Payment transition

\- Persistence

\- Re-fetch consistency



Product 為 Optional。



Grooming / Boarding 的核心 Service-only Flow 不得被 Product 阻擋。



\---



\## 23. Payment Verification



必須驗證：



\- 正確 Order

\- 正確 Amount

\- 正確 Payment State

\- Persistence

\- Re-fetch consistency

\- Report impact

\- Duplicate submission behavior



Payment Completion 必須是實際 persisted business state。



僅 UI 顯示成功，不足以作為 PASS Evidence。



\---



\## 24. Report Verification



必須驗證：



\- 使用實際完成的 Payment data。

\- Existing date logic 正確。

\- Target date filtering 正確。

\- Revenue aggregation 正確。

\- 不符合條件的 Payment 不應被錯誤計入。

\- 不依賴 Hardcoded / Manual verification data。



不得建立新的 Report Business Model。



\---



\## 25. Product Verification



Product 僅驗證既有 Basic Product Scope：



\- Product CRUD

\- Product persistence

\- Product → Order（若既有 Order 支援）

\- Product amount consistency

\- Product 不阻擋 Service-only Order



禁止擴張至：



\- Inventory

\- Stock Ledger

\- Warehouse

\- POS

\- Purchasing

\- Supplier Management



\---



\## 26. Authentication Verification



必須驗證：



\- Login

\- Authenticated Session

\- Protected Pages

\- Protected APIs

\- Existing Logout / Session behavior

\- Unauthenticated request rejection



不得重新設計 Authentication Architecture。



\---



\## 27. Authorization Verification



必須依既有設計驗證：



\- Authorized operation 成功。

\- Unauthorized operation 被拒絕。

\- Protected API 不可 bypass。

\- Protected Page 不可 bypass。



不得建立新的 Enterprise RBAC。



\---



\## 28. Session Verification



必須驗證：



\- Page Reload

\- Session retention

\- Re-fetch

\- Existing Session Expiry behavior

\- Invalid / expired session 的既有 re-authentication behavior



不得新增 Session Architecture。



\---



\## 29. Frontend / Backend Contract Verification



必須確認：



\- Request Method

\- Endpoint

\- Request Parameters

\- Request Body

\- Authentication

\- Response Structure

\- Frontend Response Handling

\- Error Handling



Frontend 不得以 Fake Success 取代實際 Backend Operation。



\---



\## 30. Database Verification



必須確認：



\- Create persistence

\- Update persistence

\- Re-fetch correctness

\- Customer / Pet relationship

\- Pet / Appointment relationship

\- Appointment / Service relationship

\- Order relationship

\- Payment relationship

\- Report aggregation



Existing Foreign Keys 與 Constraints 必須維持。



除非發現真正 Blocker，否則不得修改 Schema。



\---



\## 31. Automated Test Verification



先執行既有 Automated Test。



目前既定執行方式：



&#x20;   cd D:\\MVP\\testing

&#x20;   npm test -- --runInBand



如果發生 Failure：



1\. 保留完整 Error。

2\. 確認 affected module。

3\. 判斷 Production Defect 或 Test Issue。

4\. 不得直接修改 Production Code 迎合 Test。

5\. 修正正確 Layer。

6\. 重新執行 affected test。

7\. 最後重新執行完整 Test Suite。



\---



\## 32. Test Failure Classification



\### 32.1 Production Defect



實際 Production Behavior 不符合 Freeze Requirement。



處理：



> Minimum Production Fix → Affected Test → Full Regression



\### 32.2 Test Fixture / Teardown Issue



Production behavior 正確，但 Test Setup / Fixture / Teardown 有問題。



處理：



> Minimum Test Infrastructure Fix → Retest



\### 32.3 Environment Issue



由 Environment / Configuration / Service Availability 造成。



處理：



> Correct Environment Only



\### 32.4 Non-blocking Improvement



不影響 MVP Acceptance。



處理：



> Record and Defer



\---



\## 33. Production Build Verification



必須執行現有 Production Build。



Build 必須成功。



Build Failure 必須調查。



不得為了 Build PASS 而進行無關 Architecture Change。



\---



\## 34. Static / Repository Checks



任何 Source Modification 後必須執行：



&#x20;   git diff --check



並檢查：



&#x20;   git status

&#x20;   git diff



不得留下：



\- Unexpected Changes

\- Unrelated Refactor

\- Unrelated Files

\- Debug Code

\- Temporary Code



\---



\## 35. Browser Verification



Browser 必須實際執行：



Login → Customer → Pet → Appointment → Daily Operations → Check-in → Grooming / Boarding → Service Completed → Order → Payment → Report



必須驗證：



\- Page Loading

\- Navigation

\- Real Data

\- API Interaction

\- Business State

\- Persistence

\- Error Handling

\- Reload / Re-fetch



\---



\## 36. Browser Grooming Flow



至少完成一條實際 Grooming E2E：



Customer → Pet → Appointment → Daily Operations → Check-in → Grooming → Service Completed → Order → Payment → Report



結果必須可追溯。



\---



\## 37. Browser Boarding Flow



至少完成一條實際 Boarding E2E：



Customer → Pet → Appointment → Daily Operations → Check-in → Boarding → Service Completed → Order → Payment → Report



結果必須可追溯。



\---



\## 38. Browser Negative Verification



必須驗證重要錯誤情境：



\- Missing Required Field

\- Invalid Input

\- Unauthorized Operation

\- API Failure

\- Invalid Business State

\- Duplicate Submission

\- Missing Relationship Data



Expected Error 必須被當作 Error 處理。



不得顯示 Fake Success。



\---



\## 39. Browser Refresh / Back / Forward



重要操作節點必須驗證：



\- Refresh

\- Re-fetch

\- Back

\- Forward



不得造成：



\- Persisted data loss

\- Duplicate record

\- Business State corruption

\- Customer identity switching

\- Pet identity switching

\- Appointment identity switching

\- Unrelated record display



\---



\## 40. Responsive Verification



對主要 Operational Pages 進行必要 Responsive / Browser Check。



目標為確認：



\- 沒有 MVP-blocking UI issue。

\- 核心操作仍可完成。

\- 重要資料與操作按鈕沒有因畫面尺寸而無法使用。



不進行完整 Multi-device Compatibility Project。



\---



\## 41. Performance Verification



僅檢查明顯 MVP-blocking Performance Issue。



例如：



\- Page 無法正常載入。

\- Core Operation 無法合理完成。

\- API 嚴重阻塞。

\- UI 無法正常操作。



不進行：



\- Enterprise Load Test

\- Enterprise Stress Test

\- 大規模容量測試



\---



\## 42. Duplicate Submission Verification



重要 Create / Payment 操作必須檢查明顯 Duplicate Submission 問題。



確認：



\- 重複點擊。

\- 重複 Request。

\- Duplicate Business Record。

\- Duplicate Payment Record。

\- 不合理 Business State。



除非實際 MVP Blocker，否則不得新增 Enterprise Idempotency Architecture。



\---



\## 43. Data Identity Verification



必須確認跨模組 Identity Continuity：



Customer ID → Pet ID → Appointment ID → Order ID → Payment ID



實際 Relationship 必須以既有 Data Model 為準。



不得建立第二套 Identity System。



\---



\## 44. Business State Verification



必須驗證既有 State Transition：



Appointment → Check-in → Service Execution → Service Completed → Order → Payment



不得自行創造新的 Business State。



\---



\## 45. Regression Strategy



任何確認的 Production Fix 完成後：



1\. Run affected automated test。

2\. Run relevant module tests。

3\. Run full regression when necessary。

4\. Re-run affected Browser Verification。

5\. Re-run affected core flow。

6\. Inspect Git diff。

7\. Execute `git diff --check`。

8\. Confirm no unrelated behavior changed。



Fix 未完成 Regression 前，不得視為完成。



\---



\## 46. Allowed Production Changes



僅允許：



\- Minimum Bug Fix

\- Incorrect API Binding Correction

\- Incorrect Frontend Data Source Correction

\- Incorrect State Handling Correction

\- Incorrect Navigation Correction

\- Incorrect Persistence Correction

\- Minimum UI Correction Required for Operation



\---



\## 47. Prohibited Production Changes



禁止：



\- Unrelated Refactor

\- Architecture Migration

\- Framework Migration

\- New Abstraction Layer

\- New Business Feature

\- New Business Block

\- Speculative Optimization

\- Cosmetic Refactor

\- Unrelated Cleanup

\- Scope Expansion



\---



\## 48. Evidence Collection



Final Acceptance 前必須保留：



\- Automated Test Result

\- Production Build Result

\- API Verification Result

\- Database Verification Result

\- Browser Verification Result

\- Core E2E Result

\- Grooming E2E Result

\- Boarding E2E Result

\- Negative Scenario Result

\- Regression Result

\- Defect Classification

\- Fix Record

\- Human Acceptance Result

\- `git diff --check` Result

\- Git Status Result

\- Git Checkpoint Commit



\---



\## 49. Final Acceptance Blocking Conditions



TASK-0018 不得 PASS，如果仍存在：



\- Critical Defect

\- Blocker Defect

\- Broken Core Operational Flow

\- Broken Grooming Flow

\- Broken Boarding Flow

\- Broken Order → Payment Flow

\- Incorrect Persisted Payment State

\- Incorrect Report Aggregation

\- Broken Authentication

\- Unauthorized Protected API Access

\- Major Data Identity Corruption

\- Major Regression

\- Unresolved Required Automated Test Failure

\- Failed Production Build

\- Blocking Browser Verification Failure



\---



\## 50. Non-blocking Conditions



以下情況不必然阻擋 Final Acceptance：



\- Cosmetic Improvement

\- Minor UI Polish

\- Minor Responsive Refinement

\- Non-blocking Performance Optimization

\- Convenience Feature

\- Enterprise Enhancement

\- Refactoring Opportunity



前提是不得影響：



\- MVP Acceptance

\- Core Flow

\- Data Integrity

\- Authentication

\- Authorization

\- Business State

\- Existing Frozen Behavior



\---



\## 51. AI Coding Execution Checklist



\### Phase A — Inspection



\- \[ ] Inspect Git status.

\- \[ ] Inspect existing implementation.

\- \[ ] Inspect existing tests.

\- \[ ] Inspect database relationships.

\- \[ ] Confirm TASK-0017 remains FREEZE.

\- \[ ] Confirm no unexpected changes.



\### Phase B — Automated Verification



\- \[ ] Run Jest / Supertest.

\- \[ ] Classify failures.

\- \[ ] Fix confirmed defects only.

\- \[ ] Re-run affected tests.

\- \[ ] Run full regression.



\### Phase C — Build / Static Verification



\- \[ ] Run Production Build.

\- \[ ] Run `git diff --check`.

\- \[ ] Inspect `git status`.

\- \[ ] Inspect `git diff`.



\### Phase D — API / Database Verification



\- \[ ] Authentication

\- \[ ] Authorization

\- \[ ] Customer

\- \[ ] Pet

\- \[ ] Appointment

\- \[ ] Daily Operations

\- \[ ] Check-in

\- \[ ] Grooming

\- \[ ] Boarding

\- \[ ] Order

\- \[ ] Payment

\- \[ ] Report

\- \[ ] Product



\### Phase E — Browser Verification



\- \[ ] Login

\- \[ ] Customer

\- \[ ] Pet

\- \[ ] Appointment

\- \[ ] Daily Operations

\- \[ ] Check-in

\- \[ ] Grooming E2E

\- \[ ] Boarding E2E

\- \[ ] Service Completed

\- \[ ] Order

\- \[ ] Payment

\- \[ ] Report

\- \[ ] Refresh / Re-fetch

\- \[ ] Negative Scenarios

\- \[ ] Responsive Check



\### Phase F — Regression



\- \[ ] Affected automated tests

\- \[ ] Full automated regression

\- \[ ] Affected browser flow

\- \[ ] Core flow

\- \[ ] Grooming flow

\- \[ ] Boarding flow

\- \[ ] No new regression



\### Phase G — Acceptance Readiness



\- \[ ] Evidence collected

\- \[ ] No Critical

\- \[ ] No Blocker

\- \[ ] Core Flow PASS

\- \[ ] Grooming PASS

\- \[ ] Boarding PASS

\- \[ ] Automated Test PASS

\- \[ ] Production Build PASS

\- \[ ] Browser Verification PASS

\- \[ ] Human Acceptance ready



\---



\## 52. Definition of Done — AI Coding



TASK-0018 AI Coding 只有在以下條件全部成立時，才算完成：



\- Verification execution completed。

\- All findings classified。

\- Required Production Defects fixed。

\- Affected tests PASS。

\- Full Regression PASS。

\- Production Build PASS。

\- API Verification PASS。

\- Database Verification PASS。

\- Browser Verification PASS。

\- Grooming E2E PASS。

\- Boarding E2E PASS。

\- Core Operational Flow PASS。

\- No Critical / Blocker remains。

\- Evidence collected。

\- Repository ready for Human Acceptance。



\---



\## 53. Transition to Verification



TASK-0018 流程必須依以下順序繼續：



TASK-0018 Decision Freeze

→ TASK-0018 Coding Readiness

→ TASK-0018 AI Coding

→ TASK-0018 Verification

→ TASK-0018 Human Acceptance

→ TASK-0018 Formal Engineering Document

→ TASK-0018 Git Checkpoint

→ TASK-0018 FREEZE



AI Coding 不得直接宣告 TASK-0018 FREEZE。



\---



\## 54. Current Status



| Item | Status |

|---|---|

| TASK-0018 Decision | COMPLETE |

| Q1–Q90 | 90 / 90 ACCEPTED |

| Decision Completion | 100% |

| Decision Freeze | PASS |

| Scope Freeze | PASS |

| Coding Readiness | PASS |

| AI Coding | READY |

| Verification | PENDING |

| Human Acceptance | PENDING |

| Formal Engineering Document | PENDING |

| Git Checkpoint | PENDING |

| TASK-0018 FREEZE | PENDING |



\---



\## 55. Final Coding Readiness Statement



TASK-0018 Decision Freeze 已完成。



TASK-0018 Coding Readiness 已完成。



TASK-0018 的 Scope、Verification Strategy、Fix Policy、Regression Policy、Evidence Requirement 均已明確。



下一階段：



> TASK-0018 AI Coding



AI Coding 必須以：



> TASK-0018 Final MVP Verification — Decision Freeze v1.0



以及本文件：



> TASK-0018 最終 MVP 驗證 Final MVP Verification Coding Readiness v1.0



作為執行基準。



不得重新進行 TASK-0018 Decision。



不得重新詢問 Q1–Q90。



不得重新設計已 Freeze 的 MVP Business Blocks。



不得擴張 MVP Scope。
