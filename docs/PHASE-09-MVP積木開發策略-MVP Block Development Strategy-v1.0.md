\# PHASE-09 — MVP Block Development Strategy — MVP 積木開發策略



\*\*Document ID:\*\* PHASE-09  

\*\*Document Name:\*\* MVP Block Development Strategy — MVP 積木開發策略  

\*\*Version:\*\* v1.0  

\*\*Status:\*\* FREEZE  

\*\*Freeze Date:\*\* 2026-08-16  



\---



\# 1. 文件目的



本文件定義 MVP 後續實際進入工程建置後，Business Block 的標準開發、測試、驗收、Freeze 與 Integration 方法。



本 Phase 的目的不是重新定義 MVP Scope、Business Workflow、Block Responsibility 或 Technical Architecture。



本文件建立的是：



> 如何依照既有 Freeze 的設計，一個 Block、一個 Block 地將 MVP 真正建置完成。



本文件是後續 MVP 工程實作的標準 Development Strategy。



\---



\# 2. 前置 Freeze



本 Phase 建立於以下既有 Freeze 之上：



```text

PHASE 1

MVP Product Definition

&#x20;       ↓

PHASE 2

Business Workflow \& Operational Decisions

&#x20;       ↓

PHASE 3

MVP Scope \& Product Boundary

&#x20;       ↓

PHASE 4

MVP Block Map

&#x20;       ↓

PHASE 5

MVP Block Design

&#x20;       ↓

PHASE 6

MVP Architecture \& Technical Boundary

&#x20;       ↓

PHASE 7

Engineering / Development Decisions

&#x20;       ↓

PHASE 8

Development Foundation

&#x20;       ↓

PHASE 9

MVP Block Development Strategy

```



PHASE 9 不得自行推翻或修改上述既有 Freeze。



如後續確實需要修改既有 Freeze，必須依 Change Request 規則處理。



\---



\# 3. 核心開發原則



PHASE 9 正式採用：



> \*\*Block-based Development — 積木式開發\*\*



系統不採取一次完成整個 MVP 的方式。



而是：



```text

選擇 Block

&#x20;   ↓

確認依賴

&#x20;   ↓

Block Design

&#x20;   ↓

API Contract

&#x20;   ↓

Development

&#x20;   ↓

Testing

&#x20;   ↓

Operational Verification

&#x20;   ↓

Block PASS

&#x20;   ↓

Block FREEZE

&#x20;   ↓

Incremental Integration

&#x20;   ↓

下一個 Block

```



核心原則：



1\. 一次聚焦一個主要 Business Block。

2\. Block 必須有清楚的 Business Responsibility。

3\. Block 不得任意接管其他 Block 的責任。

4\. Block 必須完成完整驗收後才能視為完成。

5\. Block PASS 後進入 Block Freeze。

6\. Block Freeze 後不得任意修改。

7\. Block 之間採 Incremental Integration。

8\. MVP 最終完成必須通過 Happy Path 驗證。



\---



\# 4. Block Development Model



每一個 Block 採用：



> \*\*Vertical Slice Development — 垂直切片開發\*\*



標準結構：



```text

Database

&#x20;   ↓

Data Access

&#x20;   ↓

Business Logic

&#x20;   ↓

API

&#x20;   ↓

Frontend

&#x20;   ↓

Automated Test

&#x20;   ↓

Operational Verification

```



不採用完整水平分層開發：



```text

全部 Database

&#x20;   ↓

全部 Backend

&#x20;   ↓

全部 Frontend

&#x20;   ↓

最後 Testing

```



原因：



\- 可以較早得到真正可運作的功能。

\- 可以較早發現 Block Boundary 問題。

\- 可以較早驗證 Business Rule。

\- 可以降低一次性修改整個系統的風險。

\- 符合小型 MVP 的工程規模。



\---



\# 5. Block 開發前置條件



開始新的 Block 前，必須確認：



1\. 前置依賴 Block 已完成。

2\. 前置依賴 Block 已 PASS。

3\. 前置依賴 Block 已 Freeze。

4\. 新 Block 的 Business Responsibility 已由 PHASE 5 定義。

5\. 新 Block 的 Block Design 已確認。

6\. API Contract 已確認。

7\. 不存在尚未處理的重大 Boundary 衝突。



如果前置依賴尚未完成：



> 不應正式進入依賴它的 Block 開發。



\---



\# 6. Block Dependency Rule



Block 原則上採：



```text

Dependency Block

&#x20;   ↓

Development

&#x20;   ↓

Testing

&#x20;   ↓

Operational Verification

&#x20;   ↓

PASS

&#x20;   ↓

FREEZE

&#x20;   ↓

Dependent Block

```



例如：



```text

Customer

&#x20;   ↓

PASS

&#x20;   ↓

FREEZE

&#x20;   ↓

Pet

```



不得長期維持大量：



```text

Customer 進行中

Pet 進行中

Appointment 進行中

Order 進行中

Payment 進行中

```



的半完成狀態。



\---



\# 7. 平行開發原則



沒有強依賴關係的 Block，技術上可以平行開發。



但 MVP 第一版的預設策略仍為：



> \*\*優先採序列式開發。\*\*



原因：



\- 降低協調成本。

\- 降低 Integration 複雜度。

\- 適合小型專案。

\- 避免過早建立大型開發管理流程。



因此：



> 可以平行，不代表應該主動平行。



\---



\# 8. API Contract First



Block 開發前，必須先確認 API Contract。



標準順序：



```text

Block Design

&#x20;   ↓

API Contract

&#x20;   ↓

Backend Development

&#x20;   ↓

Frontend Development

&#x20;   ↓

Integration

```



API Contract 的目的：



\- 明確定義 Frontend 與 Backend 的合作方式。

\- 避免 Frontend 猜測 Backend。

\- 避免 Backend 完成後才重新調整整個介面。

\- 保持 Business Responsibility 與 API Boundary 一致。



API Contract 不代表必須提前完成所有 API。



只要求：



> 當前 Block 所需要的 API Contract 在開發前先確認。



\---



\# 9. Database Development Rule



Database 採：



> \*\*需要多少，建立多少。\*\*



不因為未來可能需要某功能，就提前建立大量 Database Schema。



每個 Block 僅建立其 MVP 真正需要的資料結構。



原則：



```text

Business Requirement

&#x20;   ↓

Block Responsibility

&#x20;   ↓

Required Data

&#x20;   ↓

Database Structure

```



不採：



```text

Future Possibility

&#x20;   ↓

大量預先建表

```



\---



\# 10. Data Access Rule



Data Access 負責：



> Database Access。



標準架構：



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



Data Access 不負責：



\- Business Decision

\- UI Decision

\- HTTP Response Decision

\- 跨 Block Business Policy



Data Access 應保持簡單。



PHASE 9 不要求建立複雜 Repository Framework 或 Enterprise Data Access Framework。



\---



\# 11. Business Logic Rule



Business Logic 是正式 Business Rule 的主要執行位置。



Business Logic 負責：



\- Business Rule

\- 狀態判斷

\- Business Validation

\- 跨資料操作協調

\- Transaction 協調

\- Block Collaboration



Business Logic 不應被大量放置於：



\- Frontend

\- Controller

\- SQL Query



\---



\# 12. Controller Rule



Controller 主要負責 HTTP Layer。



主要工作：



\- 接收 Request

\- 取得輸入資料

\- 呼叫 Business Logic

\- 處理 HTTP Response

\- 處理 HTTP Error Flow



Controller 不應承擔大量 Business Logic。



標準：



```text

HTTP Request

&#x20;   ↓

Controller

&#x20;   ↓

Business Logic

&#x20;   ↓

Data Access

```



\---



\# 13. Frontend Rule



Frontend 負責：



\- 使用者介面

\- 使用者操作

\- 表單輸入

\- 顯示資料

\- API 呼叫

\- 操作結果呈現



Frontend 不得成為正式 Business Rule 的唯一執行位置。



例如：



> 「這個預約能不能取消」



不能只由 Frontend Button 是否顯示來決定。



正式 Business Rule 必須由 Backend 執行。



\---



\# 14. CRUD Rule



MVP 不要求每一個資料結構都必須完整 CRUD。



實際實作依 Business Requirement 決定。



例如某資料只需要：



```text

Create

Read

```



則不必為了 CRUD 完整性強行增加：



```text

Update

Delete

```



原則：



> Business Requirement 優先於 CRUD 完整性。



\---



\# 15. Block Testing Strategy



Block 測試至少包含：



```text

Business Logic

&#x20;   ↓

Unit Test



API

&#x20;   ↓

Supertest / Integration Test



UI

&#x20;   ↓

Operational Verification

```



不同測試層級負責不同目的。



\---



\# 16. Business Logic Unit Test



Business Logic 應有對應 Unit Test。



主要驗證：



\- 正常 Business Flow

\- Business Rule

\- 邊界條件

\- 不合法操作

\- 重要錯誤情況



Unit Test 不應變成單純測試程式碼形式。



重點是：



> 驗證 Business Behavior。



\---



\# 17. API / Integration Test



API 使用：



> Jest + Supertest



進行測試。



主要確認：



\- HTTP Request

\- Routing

\- Validation

\- Controller

\- Business Logic

\- Data Access

\- Database



之間可以正確合作。



\---



\# 18. Test Database



API / Integration Test 使用獨立 Test Database。



基本結構：



```text

Development Database

&#x20;       ≠

Test Database

```



不得使用正式 Production Database 執行測試。



Test Run 必須具有：



> 可預期、可控制的資料狀態。



\---



\# 19. Test Data Rule



Test Data 與 Development Seed 分離。



至少概念上區分：



```text

Development Seed

Test Data

Production Data

```



Test Data 必須能夠：



\- 精確控制測試情境。

\- 重現特定條件。

\- 避免受到開發資料污染。

\- 支援自動化測試。



不要求所有環境共用同一套 Seed。



\---



\# 20. Database Test Reset Rule



每一次 Test Run 必須具備可預期的乾淨狀態。



基本流程：



```text

Test Run

&#x20;   ↓

Reset / Prepare Database

&#x20;   ↓

Migration

&#x20;   ↓

Test Seed / Test Data

&#x20;   ↓

Execute Tests

```



不要求每一個 Test Case 都重新建立整個 Database。



可依測試需求採取：



\- Transaction Isolation

\- Data Cleanup

\- Fixture

\- Test Data Reset



等方式維持測試隔離。



\---



\# 21. Operational Verification



Automated Test PASS 不代表 Block 已完成。



必須另外進行：



> \*\*Operational Verification — 實際操作驗證\*\*



基本流程：



```text

Browser

&#x20;   ↓

Frontend

&#x20;   ↓

API

&#x20;   ↓

Business Logic

&#x20;   ↓

Database

```



確認使用者可以真正完成該 Block 的操作。



\---



\# 22. Block PASS Definition



一個 Block 必須完成：



```text

Business Rule

&#x20;   ↓

Database

&#x20;   ↓

Data Access

&#x20;   ↓

API

&#x20;   ↓

Frontend

&#x20;   ↓

Automated Test

&#x20;   ↓

Integration

&#x20;   ↓

Operational Verification

&#x20;   ↓

BLOCK PASS

```



因此：



> Backend 完成 ≠ Block 完成



> API 完成 ≠ Block 完成



> Frontend 完成 ≠ Block 完成



> Automated Test PASS ≠ Block 完成



只有完整通過 Definition of Done，才可以宣布：



> \*\*BLOCK PASS\*\*



\---



\# 23. Block PASS 驗收記錄



每個 Block PASS 應至少能追蹤：



```text

Block

Version

Business Rule Result

Automated Test Result

Integration Test Result

Operational Verification Result

PASS / FAIL

```



目的：



> 保留清楚的完成證據。



避免後續無法判斷某 Block 是否真正完成。



\---



\# 24. Block Freeze



Block PASS 後：



```text

BLOCK PASS

&#x20;   ↓

BLOCK FREEZE

```



Freeze 代表：



> 目前 Block 已達到既定 Definition of Done。



Freeze 後不得因為：



> 「另外一種寫法比較漂亮」



而任意重新設計。



\---



\# 25. Block Freeze 後的 Bug Fix



Block Freeze 後仍可能發生 Bug。



如果：



> 實際行為沒有符合原本已定義的 Business Rule。



則屬於：



> Bug Fix。



可以修正。



標準流程：



```text

Bug

&#x20;   ↓

Fix

&#x20;   ↓

Test

&#x20;   ↓

Operational Verification

&#x20;   ↓

PASS

```



\---



\# 26. Freeze 後的 Requirement Change



如果不是 Bug，而是：



> Business Requirement 改變。



則不得直接修改 Freeze。



必須使用：



> Change Request。



Change Request 至少包含：



1\. 原 Freeze 決策。

2\. 發生的問題。

3\. 為什麼原方案不可行。

4\. 新方案。

5\. 影響範圍。

6\. 是否值得重新開啟。



使用者確認後才可修改。



\---



\# 27. Block Version



Block 採簡化 Version 管理。



例如：



```text

Customer v1.0

Pet v1.0

Appointment v1.0

```



Version 用來辨識：



> Block 在哪一個穩定版本。



不建立複雜 Package Version Management。



\---



\# 28. Version Change Rule



採簡化版本概念：



```text

Patch

→ Bug Fix



Minor

→ 相容的新能力



Major

→ 破壞既有 Contract / Responsibility

```



例如：



```text

Customer v1.0

&#x20;   ↓

Bug Fix

&#x20;   ↓

Customer v1.0.1

```



Business Rule 或 Contract 的重大破壞性變更，才需要 Major Version。



\---



\# 29. Incremental Integration



Integration 不等所有 Block 完成才進行。



正式採用：



> \*\*Incremental Integration\*\*



例如：



```text

Customer PASS

&#x20;   ↓

Pet PASS

&#x20;   ↓

Customer + Pet Integration

&#x20;   ↓

Service PASS

&#x20;   ↓

Customer + Pet + Service Integration

&#x20;   ↓

Appointment PASS

&#x20;   ↓

Incremental Integration

```



目的：



\- 提早發現 Boundary 問題。

\- 提早發現 API Contract 問題。

\- 提早發現資料關聯問題。

\- 降低最後一次 Integration 的風險。



\---



\# 30. Integration Boundary



Integration 的責任：



> 驗證既有 Block 能否正確合作。



Integration 不建立第三套 Business Logic。



不得為了讓 Integration PASS 而在 Integration Layer 偷塞特殊 Business Rule。



如果發現問題：



```text

Integration Problem

&#x20;   ↓

Check Block Responsibility

&#x20;   ↓

Check Block Boundary

&#x20;   ↓

Check Block Design

&#x20;   ↓

Check API Contract

&#x20;   ↓

必要時 Change Request

```



\---



\# 31. Integration Operational Verification



Integration PASS 後仍必須進行實際操作驗證。



例如：



```text

Customer

&#x20;   ↓

Pet

&#x20;   ↓

Appointment

```



不只驗證 API。



還要確認使用者可以從 UI 真正完成整個操作流程。



\---



\# 32. E2E Framework Scope



PHASE 9 暫不導入：



\- Playwright

\- Cypress

\- 其他專用 E2E Framework



目前採：



```text

Jest

\+

Supertest

\+

實際 Browser 操作驗證

```



原因：



> MVP 第一版不需要為了測試工具本身增加額外工程複雜度。



未來如果實際需求增加，可透過 Change Request 或新版本評估。



\---



\# 33. 初始 Block 開發順序



依目前既有 Business Dependency，初始開發方向為：



```text

Foundation

&#x20;   ↓

Staff / Authentication

&#x20;   ↓

Shop Settings

&#x20;   ↓

Customer

&#x20;   ↓

Pet

&#x20;   ↓

Service

&#x20;   ↓

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

Product

&#x20;   ↓

Report

```



其中：



> Staff / Authentication 與 Shop Settings 僅建立後續 MVP 真正需要的最低必要能力。



不因為它們存在於 Block Map，就提前建立企業級 Authentication、RBAC 或 Settings Framework。



Grooming 與 Boarding 的實際先後，依其實際 Dependency 與後續 Block Design 決定。



\---



\# 34. 不得因開發順序改變 Business Responsibility



Block 開發順序只是：



> Engineering Sequence。



不是：



> Business Responsibility。



例如：



```text

Order

```



即使在開發上晚於 Appointment，也不代表：



> Order 必須依賴 Appointment。



既有 Business Rule 仍保持：



> Order 可以來自 Appointment 服務，也可以來自 Walk-in 商品。



同樣：



> Appointment ≠ Grooming



> Order ≠ Payment



> Product ≠ Inventory



> Daily Operations ≠ 第二套核心資料來源



\---



\# 35. MVP Completion Definition



整個 MVP 不以：



> 所有程式碼寫完



作為完成條件。



正式完成條件：



```text

All Required Blocks PASS

&#x20;       ↓

Incremental Integration PASS

&#x20;       ↓

MVP Happy Path PASS

&#x20;       ↓

MVP Validation

&#x20;       ↓

MVP COMPLETE

```



\---



\# 36. MVP Happy Path



MVP 最終必須能完整驗證核心營運閉環：



```text

Customer

&#x20;   ↓

Pet

&#x20;   ↓

Appointment

&#x20;   ↓

Daily Operations

&#x20;   ↓

Grooming / Boarding

&#x20;   ↓

Service Complete

&#x20;   ↓

Order

&#x20;   ↓

Payment

&#x20;   ↓

Basic Report

```



此流程必須能真正於系統中完成，而不是只有各 Block 個別通過。



\---



\# 37. PHASE 9 Standard Development Flow



後續正式工程開發採用以下標準：



```text

&#x20;                   FOUNDATION PASS

&#x20;                          ↓

&#x20;                 SELECT NEXT BLOCK

&#x20;                          ↓

&#x20;                 CHECK DEPENDENCIES

&#x20;                          ↓

&#x20;                   BLOCK DESIGN

&#x20;                          ↓

&#x20;                    API CONTRACT

&#x20;                          ↓

&#x20;                     DATABASE

&#x20;                          ↓

&#x20;                    DATA ACCESS

&#x20;                          ↓

&#x20;                  BUSINESS LOGIC

&#x20;                          ↓

&#x20;                         API

&#x20;                          ↓

&#x20;                      FRONTEND

&#x20;                          ↓

&#x20;                 AUTOMATED TEST

&#x20;                          ↓

&#x20;              OPERATIONAL VERIFICATION

&#x20;                          ↓

&#x20;                      BLOCK PASS

&#x20;                          ↓

&#x20;                     BLOCK FREEZE

&#x20;                          ↓

&#x20;              INCREMENTAL INTEGRATION

&#x20;                          ↓

&#x20;                   NEXT BLOCK

&#x20;                          ↓

&#x20;                 ALL BLOCKS PASS

&#x20;                          ↓

&#x20;                 MVP HAPPY PATH

&#x20;                          ↓

&#x20;                   MVP COMPLETE

```



\---



\# 38. PHASE 9 Definition of Done



PHASE 9 必須完成以下項目：



| 項目 | Status |

|---|---|

| Block Development Order | PASS |

| Dependency Rule | PASS |

| Vertical Slice Development | PASS |

| API Boundary | PASS |

| Business Logic Boundary | PASS |

| Data Access Boundary | PASS |

| Automated Testing | PASS |

| Test Database Isolation | PASS |

| Operational Verification | PASS |

| Block PASS Definition | PASS |

| Block Freeze Rule | PASS |

| Bug Fix Rule | PASS |

| Change Request Rule | PASS |

| Incremental Integration | PASS |

| Integration Boundary | PASS |

| API Contract Rule | PASS |

| Block Version Rule | PASS |

| MVP Completion Rule | PASS |

| MVP / Architecture Consistency | PASS |

| MVP / Business Boundary Consistency | PASS |



\---



\# 39. PHASE 9 Freeze Summary



PHASE 9 正式 Freeze 以下決策：



1\. MVP 採 Block-based Development。

2\. Block 採 Vertical Slice Development。

3\. Block 開發前確認 Dependency。

4\. 依賴 Block 原則上必須先 PASS / Freeze。

5\. MVP 優先採序列式開發。

6\. 無強依賴 Block 技術上可以平行，但不主動增加平行開發複雜度。

7\. Block Design 後先確認 API Contract。

8\. Database 只建立 MVP 當下真正需要的資料。

9\. Data Access 與 Business Logic 分離。

10\. Controller 不承擔大量 Business Logic。

11\. Business Logic 位於 Backend。

12\. Frontend 不負責正式 Business Rule。

13\. 不要求所有資料完整 CRUD。

14\. Business Logic 使用 Unit Test。

15\. API 使用 Jest + Supertest。

16\. API / Integration Test 使用獨立 Test Database。

17\. Test Data 與 Development Seed 分離。

18\. Automated Test PASS 後仍需 Operational Verification。

19\. Block 必須完整通過 Definition of Done 才能 PASS。

20\. Block PASS 後進入 Block Freeze。

21\. Freeze 後 Bug 可以依 Bug Fix 流程修正。

22\. Requirement Change 必須依 Change Request 處理。

23\. Block 使用簡化 Version。

24\. Integration 採 Incremental Integration。

25\. Integration 不建立第二套 Business Logic。

26\. Integration PASS 後仍需實際操作驗證。

27\. PHASE 9 暫不導入 Playwright / Cypress 等專用 E2E Framework。

28\. MVP 最終必須通過所有 Required Blocks、Integration 與 Happy Path。

29\. 不因工程便利任意改變既有 Business Responsibility。

30\. 不因「看起來比較漂亮」而增加不必要的工程複雜度。



\---



\# 40. Final Status



\*\*PHASE 9 — MVP Block Development Strategy\*\*



\*\*Status: FREEZE\*\*



\*\*Version: v1.0\*\*



本 Phase 自本文件 Freeze 起，正式成為後續 MVP 工程建置的標準 Development Strategy。



後續實際開發必須依照本文件執行：



```text

Block Design

&#x20;   ↓

Development

&#x20;   ↓

Testing

&#x20;   ↓

Operational Verification

&#x20;   ↓

Block PASS

&#x20;   ↓

Block FREEZE

&#x20;   ↓

Incremental Integration

&#x20;   ↓

Next Block

```



任何與本文件 Freeze 決策不同的方案，必須依 Change Request 規則處理。



\# END OF PHASE 9

