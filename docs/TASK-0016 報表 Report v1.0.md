\# TASK-0016 報表 Report v1.0



\*\*Document Type:\*\* Formal Engineering Task Specification

\*\*Document ID:\*\* TASK-0016

\*\*Document Name:\*\* TASK-0016 報表 Report v1.0

\*\*Task ID:\*\* TASK-0016

\*\*Task Name:\*\* 報表（Report）

\*\*Version:\*\* v1.0

\*\*Status:\*\* FREEZE

\*\*Project:\*\* MVP — Pet Shop Operations System

\*\*Language:\*\* 繁體中文（Traditional Chinese）

\*\*Owner:\*\* Project Owner

\*\*Implementation Mode:\*\* AI-Assisted Development

\*\*Freeze Status:\*\* Approved

\*\*Human Acceptance:\*\* PASS



\---



\# 1. 文件目的（Document Purpose）



TASK-0016 負責建立 MVP 階段的「報表（Report）」功能。



本 Task 的目的，是讓小型寵物美容／住宿工作室能夠從既有營運交易資料中，查看基本且實際可用的營運統計。



本 Task 遵循：



\- MVP Product Definition

\- MVP Technical Baseline

\- UI 繁體中文化基準

\- 既有 Order / Payment / Product / Service / Boarding 業務規則



本 Task 不建立企業級 BI、Dashboard、Accounting 或 Analytics 平台。



核心原則：



> Report 是既有營運資料的查詢與統計呈現，不建立另一套交易資料來源。



\---



\# 2. Task Scope（任務範圍）



\## 2.1 In Scope（包含範圍）



TASK-0016 包含：



1\. Report Backend API

2\. Report Repository

3\. Report Service

4\. Report Controller

5\. Report Route

6\. Report Frontend Page

7\. Report API Client

8\. 基本日期範圍查詢

9\. 訂單統計

10\. 收款統計

11\. 每日營收統計

12\. 商品統計

13\. 服務統計

14\. 住宿統計

15\. 基本報表 UI

16\. 繁體中文 UI

17\. Loading State

18\. Empty State

19\. Validation Error State

20\. API Error State

21\. Report API 測試

22\. Browser 驗證

23\. Regression Verification



\---



\## 2.2 Out of Scope（不包含範圍）



TASK-0016 不包含：



\- Dashboard 平台

\- BI 平台

\- Forecast

\- 預測分析

\- Inventory Management

\- POS

\- Accounting

\- Invoice Management

\- Payment Gateway

\- LINE API

\- Export / Excel / CSV 報表

\- 複雜圖表分析

\- Staff KPI 平台

\- 自訂報表產生器

\- SaaS Multi-Tenant Reporting

\- 企業級資料倉儲

\- Data Warehouse

\- Data Lake

\- 新增與 Report 無關的 Business Feature

\- 修改既有 Order Business Rules

\- 修改既有 Payment Business Rules

\- 修改既有 Product Business Rules

\- 修改既有 Service Business Rules

\- 修改既有 Boarding Business Rules



不得因 TASK-0016 自行擴張上述範圍。



\---



\# 3. Reference Documents（參考文件）



TASK-0016 必須遵循：



\## 3.1 Primary References



\- `docs/TASK-0016 報表 Report v1.0.md`

\- `docs/UI 繁體中文化基準 Traditional Chinese UI Localization Baseline v1.0.md`

\- `Tasks/TASK-CODING-AI-EXECUTION-PROMPT-v1.0.md`



\## 3.2 Existing Engineering Baseline



TASK-0016 同時遵循既有 MVP 技術基線：



| 項目 | 技術 |

|---|---|

| Frontend | Next.js Pages Router |

| Frontend Language | JavaScript |

| UI | Bootstrap |

| Backend | Express.js |

| Backend Language | JavaScript |

| Database | MySQL |

| DB Driver | mysql2 |

| ORM | 不使用 Prisma |

| Testing | Jest + Supertest |



禁止因 TASK-0016 更換既定技術基線。



\---



\# 4. Report 定位（Report Positioning）



Report 是：



> \*\*營運資料查詢與統計呈現功能。\*\*



Report 不負責建立或修改：



\- Customer

\- Pet

\- Appointment

\- Service

\- Order

\- Payment

\- Product

\- Boarding



Report 只讀取既有資料並進行統計。



核心資料流：



&#x20;   Existing Business Data

&#x20;           ↓

&#x20;   Report Repository

&#x20;           ↓

&#x20;   Report Service

&#x20;           ↓

&#x20;   Report Controller

&#x20;           ↓

&#x20;   Report API

&#x20;           ↓

&#x20;   Report UI



\---



\# 5. Report 查詢範圍（Report Query Scope）



\## 5.1 Date Range



Report 必須支援：



\- 起始日期

\- 結束日期



日期範圍必須包含：



\- 單日

\- 多日

\- 跨月

\- 跨年度



日期查詢不得限制為單一月份。



\---



\## 5.2 Date Validation



必須驗證：



1\. 起始日期存在

2\. 結束日期存在

3\. 日期格式正確

4\. 起始日期不得晚於結束日期



錯誤時：



> 不執行無效的 Report Query。



\---



\# 6. Order Report（訂單統計）



Report 必須提供基本 Order 統計。



至少包含：



\- 訂單總數

\- 有效訂單數

\- 已完成訂單數

\- 取消訂單數

\- 平均有效訂單金額



\---



\## 6.1 Cancelled Order Rule



Cancelled Order：



> 不得計入營運統計。



Cancelled Order 可以保留於：



> 取消訂單統計。



因此：



\- Total Orders 可以包含取消訂單

\- Valid Orders 不包含取消訂單

\- Revenue 不包含取消訂單



\---



\## 6.2 Historical Transaction Price



Report 不得使用目前 Master Data Price 回推歷史交易金額。



必須使用：



> Order Item 所保存的歷史交易價格。



例如：



&#x20;   當時交易價格 = 700

&#x20;   目前服務價格 = 800



歷史 Report 必須使用：



&#x20;   700



而不是：



&#x20;   800



\---



\# 7. Payment Report（收款統計）



Report 必須提供基本 Payment 統計。



至少包含：



\- 實收營收

\- 未付金額

\- Payment Method 統計

\- 每日營收



\---



\## 7.1 Valid Payment



有效 Payment：



> `Payment Status = PAID`



有效 Payment 才可計入實收營收。



\---



\## 7.2 Void Payment



`VOID` Payment：



> 不得計入實收營收。



\---



\## 7.3 Payment Date Rule



營收日期以：



> Payment 實際付款時間 `paid\_at`



為準。



不得以：



\- Order 建立時間

\- Appointment 日期

\- Service 日期



取代實際付款日期。



\---



\# 8. Daily Revenue Report（每日營收）



Report 必須能依日期產生每日營收統計。



基本資料：



| 欄位 | 說明 |

|---|---|

| Date | 營收日期 |

| Revenue | 當日有效 Payment 實收金額 |



每日營收必須：



\- 依 `paid\_at` 日期分組

\- 排除 VOID Payment

\- 排除取消訂單

\- 使用實際交易金額



\---



\# 9. Product Report（商品統計）



Report 必須提供商品基本統計。



至少包含：



\- 商品銷售數量

\- 商品銷售金額



商品交易金額必須使用：



> Order Item 的歷史 `transaction\_price`



不得重新讀取 Product Master 的目前價格計算歷史交易。



\---



\# 10. Service Report（服務統計）



Report 必須提供服務基本統計。



至少包含：



\- 服務使用次數

\- 服務交易金額



服務金額必須使用：



> Order Item 的歷史交易價格。



不得使用目前 Service Master Price 回推歷史交易。



\---



\# 11. Boarding Report（住宿統計）



Report 必須提供基本住宿統計。



至少包含：



\- 住宿使用量

\- 可由現有交易資料明確識別的住宿交易金額



\---



\## 11.1 Boarding Data Integrity Rule



現有 Boarding 資料模型沒有直接提供完整 Order 關聯。



因此：



> 不得透過 Customer、Pet、日期或其他模糊條件猜測 Boarding 對應的 Order。



\---



\## 11.2 Boarding Transaction Amount Rule



住宿交易金額只統計：



> 可以由既有 Order Item 明確識別為住宿服務的交易。



住宿交易價格必須遵循：



> Historical Transaction Price Rule。



不得：



\- 使用目前住宿服務價格推算歷史金額

\- 以 Customer 猜測 Order

\- 以 Pet 猜測 Order

\- 以日期自行配對 Order

\- 建立不存在的交易關聯



\---



\# 12. Business Unit Reporting（營運單位統計）



Report 必須遵循既有 Business Unit 邊界。



目前 Business Unit：



\- Dog BU

\- Cat BU



Report 不得任意將不同 BU 的營運資料混成無法辨識的統計結果。



Report Query 必須遵循既有：



> Authentication → Role → Permission → BU Scope



資料存取規則。



\---



\# 13. API Specification（API 規格）



\## 13.1 Endpoint



&#x20;   GET /api/reports



\---



\## 13.2 Query Parameters



支援：



| Parameter | Required | Description |

|---|---|---|

| `start\_date` | Yes | 查詢起始日期 |

| `end\_date` | Yes | 查詢結束日期 |



\---



\## 13.3 Example Request



&#x20;   GET /api/reports?start\_date=2026-08-01\&end\_date=2026-08-31



\---



\## 13.4 Response Format



沿用既有 API response convention：



&#x20;   {

&#x20;     "success": true,

&#x20;     "data": {

&#x20;       ...

&#x20;     }

&#x20;   }



\---



\## 13.5 Error Response



錯誤必須遵循既有 API Error Handling。



Report 不得自行建立與既有系統互相衝突的 Response Format。



\---



\# 14. Backend Architecture（Backend 架構）



TASK-0016 必須沿用：



&#x20;   Route

&#x20;     ↓

&#x20;   Controller

&#x20;     ↓

&#x20;   Service

&#x20;     ↓

&#x20;   Repository

&#x20;     ↓

&#x20;   MySQL



\---



\## 14.1 Report Repository



Repository 負責：



\- 查詢 Orders

\- 查詢 Order Items

\- 查詢 Payments

\- 查詢 Products

\- 查詢 Services

\- 查詢 Boardings

\- 執行必要 aggregation



Repository 不負責：



\- UI logic

\- HTTP response

\- Authentication logic

\- Presentation formatting



\---



\## 14.2 Report Service



Service 負責：



\- 日期驗證

\- Report business aggregation

\- 統計結果整理

\- Business Rule enforcement



\---



\## 14.3 Report Controller



Controller 負責：



\- 接收 HTTP Request

\- 取得 Query Parameters

\- 呼叫 Report Service

\- 回傳既有 API response format



\---



\## 14.4 Report Route



Report Route 必須：



\- 掛載 `/api/reports`

\- 沿用既有 authentication

\- 沿用既有 authorization

\- 不得繞過既有 Permission / BU Scope



\---



\# 15. Frontend Report UI（前端報表介面）



Report 頁面必須使用：



\- Next.js Pages Router

\- JavaScript

\- Bootstrap

\- 現有 UI 結構

\- 現有 API Client



\---



\## 15.1 Report Page



Report 頁面提供：



\- 頁面標題

\- 起始日期

\- 結束日期

\- 查詢按鈕

\- 報表統計區塊

\- 每日營收

\- 商品統計

\- 服務統計

\- 住宿統計



\---



\## 15.2 Default Date



頁面開啟時應提供合理的預設查詢日期。



預設日期不得造成：



\- Invalid Date

\- 空白日期

\- 無法查詢



\---



\# 16. UI Traditional Chinese Localization（繁體中文）



TASK-0016 必須遵循：



`UI 繁體中文化基準 Traditional Chinese UI Localization Baseline v1.0`



Report 使用者可見文字必須採繁體中文。



例如：



| English | UI |

|---|---|

| Report | 報表 |

| Start Date | 開始日期 |

| End Date | 結束日期 |

| Search | 查詢 |

| Revenue | 營收 |

| Orders | 訂單 |

| Products | 商品 |

| Services | 服務 |

| Boarding | 住宿 |

| Loading | 載入中 |

| No Data | 查無資料 |



\---



\## 16.1 Error Localization



底層 JavaScript / Fetch Error 不得直接暴露英文錯誤文字。



例如：



&#x20;   Failed to fetch



不得直接顯示於 Report UI。



應轉換為：



> 報表載入失敗



\---



\# 17. UI State Requirements（UI 狀態）



Report 必須處理以下狀態：



\## 17.1 Loading State



查詢期間：



> 顯示載入中狀態。



\---



\## 17.2 Success State



API 成功：



> 顯示 Report data。



\---



\## 17.3 Empty State



查詢期間沒有資料：



> 顯示「查無資料」或等效繁體中文訊息。



不得顯示：



> undefined



或：



> null



\---



\## 17.4 Validation Error State



日期輸入無效：



> 顯示繁體中文 validation message。



不得送出無效 API request。



\---



\## 17.5 API Error State



API 發生錯誤：



> 顯示「報表載入失敗」或等效繁體中文錯誤訊息。



不得直接顯示：



\- `Failed to fetch`

\- raw exception

\- SQL error

\- stack trace



\---



\# 18. Authorization（授權）



Report 屬於內部營運功能。



必須沿用既有：



\- Authentication

\- Role

\- Permission

\- BU Scope



\---



\## 18.1 Existing Staff Roles



既有核心 Staff Roles：



\- Owner

\- Front Desk

\- Groomer



TASK-0016 不得自行新增新的 Role。



\---



\## 18.2 Authorization Rule



Report API 不得成為繞過既有 authorization 的資料入口。



未授權使用者：



> 必須被拒絕。



\---



\# 19. Data Integrity Rules（資料完整性）



Report 必須遵循以下優先順序：



&#x20;   Data Integrity

&#x20;         ↓

&#x20;   Business Unit Boundary

&#x20;         ↓

&#x20;   Permission

&#x20;         ↓

&#x20;   Business Rule

&#x20;         ↓

&#x20;   User Convenience



\---



\## 19.1 No Current Price Recalculation



不得以目前 Master Data：



\- Service Price

\- Product Price



重新計算歷史交易。



\---



\## 19.2 No Data Guessing



Report 不得：



\- 猜測 Order

\- 猜測 Payment

\- 猜測 Boarding Transaction

\- 猜測 Customer

\- 猜測 Pet

\- 猜測 BU



無法明確識別的資料：



> 不得自行建立關聯。



\---



\# 20. Database Scope（資料庫範圍）



TASK-0016 原則上直接查詢既有資料。



不新增 Report 專用資料表。



不新增：



\- Report snapshot table

\- Data warehouse

\- Analytics table

\- Report cache table



\---



\## 20.1 Migration



TASK-0016：



> 不新增 Database Migration。



\---



\## 20.2 Existing Source Tables



Report 可使用既有資料來源，包括：



\- Orders

\- Order Items

\- Payments

\- Products

\- Services

\- Boardings

\- Appointments

\- Groomings

\- Customers

\- Pets

\- Staff



實際查詢只使用 Report 所需資料。



\---



\# 21. Testing Requirements（測試要求）



TASK-0016 必須建立 Report targeted tests。



至少涵蓋：



1\. Report API authentication

2\. Report API authorization

3\. Date range validation

4\. Order statistics

5\. Payment statistics

6\. VOID Payment exclusion

7\. Cancelled Order exclusion

8\. Daily revenue

9\. Product statistics

10\. Service statistics

11\. Boarding statistics

12\. Historical transaction price

13\. Empty data

14\. API error handling



\---



\# 22. Browser Verification（瀏覽器驗證）



必須使用實際瀏覽器驗證 Report。



至少驗證：



\- Login

\- Report navigation

\- Report page load

\- Default date

\- Date query

\- Report data rendering

\- Traditional Chinese UI

\- Empty state

\- Validation error

\- API error state



API error state 驗證完成後：



> 必須解除測試用 network interception，並使用乾淨瀏覽器頁面重新驗證正常 API flow。



測試用 `route.abort()` 不得成為正常 Human Acceptance 的環境條件。



\---



\# 23. Verification（驗證）



TASK-0016 Coding Verification 已完成。



\## 23.1 Backend Verification



\*\*Status: PASS\*\*



\- Backend check：PASS

\- Report route：PASS

\- Report API：PASS

\- Unauthorized request：預期 `401 Unauthorized`



\---



\## 23.2 Frontend Verification



\*\*Status: PASS\*\*



\- Frontend build：PASS

\- Report page：PASS

\- Report navigation：PASS

\- UI rendering：PASS



\---



\## 23.3 Database Verification



\*\*Status: PASS\*\*



\- Existing MySQL data source 可正常查詢

\- Report 不需新增 migration

\- Existing transaction data 可支援 Report 核心統計



\---



\## 23.4 Targeted Testing



\*\*Status: PASS\*\*



Report、Order、Payment、Product 相關 targeted tests：



> 4 suites / 17 tests passed



\---



\## 23.5 Full Regression



\*\*Status: PASS\*\*



完整 regression：



> 16 suites / 75 tests passed



\---



\## 23.6 Git Diff Verification



\*\*Status: PASS\*\*



&#x20;   git diff --check



結果：



> PASS



\---



\## 23.7 Browser Verification



\*\*Status: PASS\*\*



實際瀏覽器已驗證：



\- Login

\- Report navigation

\- Report loading

\- Date query

\- Statistics rendering

\- Empty state

\- Validation error

\- API error state

\- Traditional Chinese UI



\---



\## 23.8 API Error Localization Verification



\*\*Status: PASS\*\*



曾發現底層：



&#x20;   Failed to fetch



直接顯示於 UI 的 localization 問題。



已修正為：



> 報表載入失敗



並完成瀏覽器重新驗證。



\---



\## 23.9 Clean Browser Verification



\*\*Status: PASS\*\*



使用乾淨瀏覽器頁面重新驗證：



&#x20;   GET /api/reports



回應：



&#x20;   HTTP 200



Console Errors：



&#x20;   0



Failed Requests：



&#x20;   0



跨日期查詢：



&#x20;   2026-08-22 ～ 2026-08-25



驗證結果：



> PASS



\---



\# 24. Human Acceptance（人工驗收）



Project Owner 已完成 TASK-0016 Human Acceptance。



Human Acceptance：



> \*\*PASS\*\*



使用者已實際登入：



&#x20;   http://localhost:3000



並完成 Report 功能測試。



Report 正常運作。



\---



\# 25. Definition of Done（完成定義）



TASK-0016 必須符合：



\- \[x] Report Scope Defined

\- \[x] Report API Implemented

\- \[x] Report Repository Implemented

\- \[x] Report Service Implemented

\- \[x] Report Controller Implemented

\- \[x] Report Route Implemented

\- \[x] Report Frontend Implemented

\- \[x] Report API Client Implemented

\- \[x] Date Range Query Implemented

\- \[x] Order Statistics Implemented

\- \[x] Payment Statistics Implemented

\- \[x] Daily Revenue Implemented

\- \[x] Product Statistics Implemented

\- \[x] Service Statistics Implemented

\- \[x] Boarding Statistics Implemented

\- \[x] Historical Transaction Price Rule Preserved

\- \[x] Cancelled Order Exclusion Verified

\- \[x] VOID Payment Exclusion Verified

\- \[x] Authentication Preserved

\- \[x] Authorization Preserved

\- \[x] BU Scope Preserved

\- \[x] Traditional Chinese UI Implemented

\- \[x] Loading State Implemented

\- \[x] Empty State Implemented

\- \[x] Validation Error State Implemented

\- \[x] API Error State Implemented

\- \[x] API Error Localization Verified

\- \[x] Targeted Tests Passed

\- \[x] Full Regression Passed

\- \[x] Frontend Build Passed

\- \[x] Backend Check Passed

\- \[x] Browser Verification Passed

\- \[x] Human Acceptance Passed

\- \[x] No Report Migration Added

\- \[x] No Out-of-Scope Business Feature Added

\- \[x] Existing Business Rules Preserved



\---



\# 26. Files Implemented（實作檔案）



\## 26.1 Backend



新增：



\- `backend/src/data/report.repository.js`

\- `backend/src/services/report.service.js`

\- `backend/src/controllers/report.controller.js`

\- `backend/src/routes/report.routes.js`



修改：



\- `backend/src/app.js`



\---



\## 26.2 Frontend



新增：



\- `frontend/pages/reports.js`



修改：



\- `frontend/api/client.js`

\- `frontend/pages/index.js`



\---



\## 26.3 Testing



新增：



\- `testing/tests/report.test.js`



\---



\## 26.4 Database



新增 Migration：



> 無



既有 Database Schema：



> 未修改



\---



\# 27. Scope Verification（範圍驗證）



以下範圍確認為：



\*\*PASS\*\*



未新增：



\- Dashboard

\- BI

\- Analytics Platform

\- Forecast

\- Inventory

\- POS

\- Accounting

\- Invoice

\- Export Platform

\- Payment Gateway

\- LINE API

\- Multi-Tenant SaaS

\- Enterprise RBAC



未修改：



\- Order business rules

\- Payment business rules

\- Product business rules

\- Service business rules

\- Boarding business rules



\---



\# 28. Engineering Constraints（工程限制）



TASK-0016 Freeze 後：



不得直接修改：



\- Report Business Rules

\- Report Data Definition

\- Report API Contract

\- Report UI Scope

\- Historical Transaction Price Rule

\- Payment Revenue Rule

\- Cancelled Order Exclusion Rule

\- Boarding Amount Identification Rule



如需修改：



> 必須建立正式變更流程與新版本文件。



\---



\# 29. Git Status（Git 狀態）



TASK-0016 Coding 完成時：



> No commit created during implementation verification.



既有 TASK-0013、TASK-0014、TASK-0015 未提交變更：



> 必須保留，不得因 TASK-0016 操作而被回復或混入其他 Task Commit。



TASK-0016 Git Commit 應依既定 Git 流程於正式 Staged Scope Review 後建立。



\---



\# 30. Freeze Declaration（Freeze 宣告）



TASK-0016 已完成：



&#x20;   Decision

&#x20;     ↓

&#x20;   Coding Readiness

&#x20;     ↓

&#x20;   AI Coding

&#x20;     ↓

&#x20;   Verification

&#x20;     ↓

&#x20;   Human Acceptance

&#x20;     ↓

&#x20;   PASS

&#x20;     ↓

&#x20;   FREEZE



因此：



> \*\*TASK-0016 = FREEZE\*\*



\---



\# 31. Final Status（最終狀態）



| Item | Status |

|---|---|

| Decision | PASS |

| Coding Readiness | PASS |

| AI Coding | PASS |

| Backend Verification | PASS |

| Frontend Verification | PASS |

| Database Verification | PASS |

| Targeted Tests | PASS |

| Full Regression | PASS |

| Browser Verification | PASS |

| Human Acceptance | PASS |

| Scope Verification | PASS |

| Freeze | PASS |



\---



\# 32. Next Task（下一任務）



TASK-0016 FREEZE 後，依既定 MVP Task Sequence：



&#x20;   TASK-0015 — Product

&#x20;         ↓

&#x20;   TASK-0016 — Report

&#x20;         ↓

&#x20;   TASK-0017 — System Integration

&#x20;         ↓

&#x20;   TASK-0018 — Final MVP Verification

&#x20;         ↓

&#x20;   TASK-0019 — MVP Final Acceptance / Final Freeze

&#x20;         ↓

&#x20;   MVP 完成



下一個 Task：



> \*\*TASK-0017 — System Integration\*\*



\---



\# 33. Document Freeze Record（文件凍結紀錄）



\*\*Task ID:\*\* TASK-0016

\*\*Task:\*\* 報表 Report

\*\*Version:\*\* v1.0

\*\*Status:\*\* FREEZE

\*\*Human Acceptance:\*\* PASS

\*\*Engineering Verification:\*\* PASS

\*\*Scope Verification:\*\* PASS

\*\*Freeze Decision:\*\* APPROVED



\---



\# 34. Official Filename（正式檔名）



\*\*TASK-0016 報表 Report v1.0.md\*\*



\---



\# 35. Document End（文件結束）



\*\*TASK-0016 報表 Report v1.0\*\*



\*\*End of Document\*\*
