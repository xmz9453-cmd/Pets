\# TASK-0004\_客戶管理區塊\_Customer-Management-Block\_v1.0.md



\# TASK-0004 客戶管理區塊 — Customer Management Block



\## 1. 文件資訊



| 項目 | 內容 |

|---|---|

| Task 編號 | TASK-0004 |

| 中文名稱 | 客戶管理區塊 |

| 英文名稱 | Customer Management Block |

| 版本 | v1.0 |

| 文件類型 | Task Specification |

| 文件狀態 | FREEZE |

| 專案 | PSOP MVP |

| 執行階段 | AI Coding Implementation |

| 前置 Task | TASK-0001、TASK-0002、TASK-0003 |



\---



\## 2. Task 目標



建立 PSOP MVP 的 Customer Management Block，提供小型寵物美容／寵物住宿店家日常營運所需的 Customer 主檔管理能力。



本 Task 必須完成一個可實際使用、可驗證的完整 Business Capability：



Database → Backend → API → Frontend API Client → Frontend Management UI → Authentication / Role Boundary → Automated Testing → Regression Verification



本 Task 遵循 PSOP MVP 核心原則：



> 該寫的才寫。



不得因未來可能需求而建立 Enterprise Architecture、過度抽象或額外系統。



\---



\## 3. Reference Documents



Coding Implementation 開始前，必須先閱讀並遵循以下文件：



1\. PSOP MVP Master Baseline

2\. TASK-0001 Freeze Baseline

3\. TASK-0002 Freeze Baseline

4\. TASK-0003 Freeze Baseline

5\. TASK-0004 本文件

6\. Repository 實際狀態



Reference Documents 與 Repository 實際狀態均必須納入 Implementation 判斷。



不得假設 Repository 為空白專案。



\---



\## 4. Frozen Dependencies



TASK-0004 建立於既有已完成並 Freeze 的工程基礎：



TASK-0001

專案工程基礎

MVP Engineering Foundation



↓



TASK-0002

員工與身分驗證基礎

Staff and Authentication Foundation



↓



TASK-0003

寵物管理區塊

Pet Management Block



↓



TASK-0004

客戶管理區塊

Customer Management Block



TASK-0004 不得重新設計、推翻或修改 TASK-0001～TASK-0003 已 Freeze 的內容。



\---



\## 5. Task Scope



TASK-0004 包含以下範圍：



\### 5.1 Customer Domain



\- Customer Master Data

\- Customer Status

\- Customer Lifecycle

\- Customer / Pet Relationship Query



\### 5.2 Backend



\- Customer Schema

\- Customer Migration

\- Customer Repository

\- Customer Service

\- Customer Controller

\- Customer Routes

\- Customer API Mounting

\- Customer Validation

\- Authentication Boundary

\- Role Boundary



\### 5.3 API



\- Create Customer

\- List Customers

\- Get Customer

\- Update Customer

\- Deactivate Customer

\- Reactivate Customer

\- Customer Search

\- Customer Status Filter

\- Customer / Pet Relationship Query



\### 5.4 Frontend



\- Customer API Client

\- Customer Management Page

\- Customer List

\- Customer Search

\- Customer Filter

\- Customer Create

\- Customer Edit

\- Customer Deactivate

\- Customer Reactivate

\- Customer Status Display

\- Customer / Pet Relationship Display

\- Empty State

\- Validation / Error State



\### 5.5 Testing



\- Customer Automated Tests

\- Authentication Tests

\- Role Boundary Tests

\- Lifecycle Tests

\- Customer / Pet Relationship Tests

\- Existing Regression Tests

\- Frontend Verification

\- End-to-End Verification



\---



\## 6. Out of Scope



TASK-0004 不包含：



\- Customer Portal

\- Customer Login

\- Customer Self-Service

\- Online Booking

\- LINE Customer Account

\- CRM

\- Marketing Automation

\- Loyalty System

\- Customer Communication System

\- Email Management

\- Customer Email Field

\- Enterprise Permission System

\- SSO

\- MFA

\- Microservice Architecture

\- CQRS

\- Domain Event System

\- Message Queue

\- Generic CRUD Framework

\- 新 ORM

\- 新 UI Framework

\- 新 Form Framework

\- Full-Text Search Architecture

\- Pagination

\- 其他未經批准的 Framework / Library / Abstraction



不得因實作便利或未來可能需求而擴張上述範圍。



\---



\## 7. Customer Domain Definition



Customer 為店家內部營運使用的客戶主檔。



Customer 不屬於公開使用者，不提供 Customer 自行登入系統的能力。



Customer 將作為後續營運流程的重要基礎資料：



Customer → Pet → Appointment → Daily Operations → Order → Payment



\---



\## 8. Customer Data Model



Customer 必須具備最小必要的 Master Data。



\### 8.1 必要資料



\- Customer ID

\- Name

\- Phone

\- Note

\- Status

\- Created At

\- Updated At



\### 8.2 Name



Name：



\- 必填

\- 儲存前必須移除前後空白

\- 必須設定最大長度限制



\### 8.3 Phone



Phone：



\- 必填

\- 儲存前必須移除前後空白

\- 必須進行基本格式驗證

\- 不要求唯一

\- 必須支援搜尋



\### 8.4 Email



TASK-0004 不建立 Customer Email 欄位。



\### 8.5 Note



Note：



\- 一般文字欄位

\- 必須設定最大長度限制

\- 不建立 Rich Text

\- 不建立獨立 Note System



\### 8.6 ID Strategy



Customer ID 必須延續既有 MVP Database ID Strategy。



不得為 Customer 引入新的 UUID 或其他 ID Architecture。



\---



\## 9. Customer Lifecycle



Customer 使用 Active / Inactive Lifecycle。



正式 Lifecycle：



Active → Deactivate → Inactive → Reactivate → Active



\### 9.1 Create



新 Customer 建立時，Status 預設為 Active。



Create 不允許任意指定 Inactive。



\### 9.2 Deactivate



只允許：



Active → Inactive



\### 9.3 Reactivate



只允許：



Inactive → Active



\### 9.4 Invalid Lifecycle Operation



以下操作必須被拒絕：



\- Active → Reactivate

\- Inactive → Deactivate



Lifecycle 操作不得被設計成無條件 Status Update。



\---



\## 10. Delete Policy



Customer 不使用 Hard Delete 作為一般生命週期操作。



Customer UI 不提供 Delete 操作。



Customer Deactivate 不等於 Delete，也不得造成歷史資料遺失。



既有 Customer 歷史資料必須保留。



\---



\## 11. Customer Update



Customer Update 可修改：



\- Name

\- Phone

\- Note



Customer Status 不透過一般 Update 操作修改。



Lifecycle 使用獨立操作：



\- Update：Customer Basic Data

\- Deactivate：Customer Lifecycle

\- Reactivate：Customer Lifecycle



Inactive Customer 仍允許修改 Name、Phone、Note。



\---



\## 12. Customer / Pet Relationship



TASK-0004 必須支援 Customer 查看其關聯 Pet 的基本資訊。



既有 Pet Management 由 TASK-0003 負責。



TASK-0004：



\- 可以讀取既有 Customer / Pet 關係

\- 可以顯示 Customer 關聯 Pets

\- 不重新實作 Pet CRUD

\- 不重新設計 Pet Management



\---



\## 13. Pet Relationship Boundary



TASK-0004 必須沿用 TASK-0003 已 Freeze 的 pet\_customer\_relationships。



TASK-0004 不得修改該資料表的 Freeze Schema。



如果 Customer Management 實作過程發現：



\- Schema 不足

\- Relationship Model Conflict

\- Existing API Conflict

\- Existing Pet Domain Conflict



不得自行修改 TASK-0003。



必須停止並回報：



Problem：

Observation：

Impact：

Required Decision：



\---



\## 14. Customer / Pet Lifecycle Rule



Customer 與 Pet Lifecycle 分開管理。



Customer Deactivate：



Customer → Inactive



不得自動：



Pet → Inactive



Customer Deactivate 不代表其 Pet 必須 Deactivate。



\---



\## 15. Inactive Customer Relationship Rule



Inactive Customer：



\- 可以查看歷史資料

\- 可以查看既有 Pet Relationship

\- 不得建立新的 Pet Relationship



因此：



Inactive Customer → New Pet Relationship → REJECT



Reactivate 後才恢復建立新關係的資格。



\---



\## 16. Customer List



Customer 必須提供列表查詢能力。



預設：



status = active



Customer List 支援：



\- Active

\- Inactive

\- All



\### 16.1 Default Sort



預設以最新建立資料優先：



Newest Created → Oldest Created



\### 16.2 Pagination



MVP 第一版不建立 Pagination。



不得為 Pagination 引入額外架構。



\---



\## 17. Customer Search



Customer List 必須提供搜尋。



搜尋欄位：



\- Name

\- Phone



搜尋方式：



Contains Search



例如：



搜尋「王」可找到「王小明」。



搜尋「0912」可找到「0912-345-678」。



不要求 Exact Match。



\---



\## 18. Database Index and Constraint



Customer Phone 必須建立基本 Database Index。



Customer Name 必須建立基本 Database Index。



Phone 必須符合：



INDEX ≠ UNIQUE



不得因建立搜尋 Index 而建立 Phone Unique Constraint。



TASK-0004 不建立 Full-Text Search Architecture。



\---



\## 19. Customer API



Customer API 必須包含 Customer Management 所需的基本操作：



\- Create

\- List

\- Get

\- Update

\- Deactivate

\- Reactivate



API 必須受到 Authentication Boundary 保護。



\---



\## 20. Authentication Boundary



所有 Customer API 必須要求登入。



匿名 Request 不得操作 Customer API。



沿用 TASK-0002 Authentication Foundation。



TASK-0004 不得建立新的 Authentication System。



\---



\## 21. Role Boundary



沿用 TASK-0002 Foundation Roles：



\- OWNER

\- FRONT\_DESK

\- GROOMER



三個角色均可操作 Customer Management。



不建立 Customer 專用 Enterprise Permission Matrix。



\---



\## 22. API Error Behavior



\### 22.1 Customer Not Found



使用 HTTP 404 Not Found。



適用於：



\- Get 不存在 Customer

\- Update 不存在 Customer

\- Deactivate 不存在 Customer

\- Reactivate 不存在 Customer



\### 22.2 Validation Error



使用 HTTP 400 Bad Request。



適用於：



\- Name 缺失

\- Phone 缺失

\- Invalid Phone

\- Invalid Name

\- Invalid Note

\- Invalid Lifecycle Operation

\- 其他 Customer Domain Validation Error



API Error Response 必須維持既有 MVP API Error Handling 一致性。



\---



\## 23. API Response Boundary



Customer API 不得直接將完整 Database Row 原樣暴露給 Frontend。



Backend 必須明確定義 API Response。



目的：



\- 保護內部 Database 欄位

\- 避免未來新增 Database 欄位後自動暴露

\- 維持 API Boundary



\---



\## 24. Backend Structure



Customer Backend 遵循既有 MVP Backend 結構：



Route → Controller → Service → Repository → MySQL



\### 24.1 Repository



負責 Customer Data Access。



\### 24.2 Service



負責 Customer Domain Logic。



\### 24.3 Controller



負責 HTTP Request / Response Boundary。



\### 24.4 Routes



負責 Customer API Routing。



\### 24.5 API Mounting



Customer API 必須正式 Mount 至既有 Express Backend。



\---



\## 25. Frontend API Client



TASK-0004 必須建立 Customer Frontend API Client。



用途：



\- Customer List

\- Customer Search

\- Customer Get

\- Customer Create

\- Customer Update

\- Customer Deactivate

\- Customer Reactivate



Frontend 不得直接操作 Database。



Frontend 不得繞過 Backend API。



\---



\## 26. Customer Management UI



TASK-0004 必須提供 Customer Management Page。



同一 Customer Management 區域至少提供：



\- Customer List

\- Search

\- Create

\- Edit



Lifecycle 操作必須提供：



\- Deactivate

\- Reactivate



均必須能從 UI 實際操作。



\---



\## 27. Customer UI



Customer UI 必須顯示：



\- Customer Name

\- Phone

\- Note

\- Active / Inactive Status

\- 基本 Pet 關聯資訊



Customer 不提供 Delete Button。



\---



\## 28. Customer / Pet UI Boundary



Customer UI 可顯示 Customer 關聯 Pets。



例如：



Customer

王小明

0912-345-678



Pets

\- 豆豆

\- 妞妞



但：



\- 不在 Customer Page 重做 Pet CRUD

\- 不建立第二套 Pet Management

\- 不修改 TASK-0003 Pet Architecture



\---



\## 29. UI Technology



TASK-0004 Frontend 必須沿用既有 MVP 技術基準：



\- Next.js

\- Pages Router

\- JavaScript

\- Bootstrap



Form 使用 Bootstrap Form。



不得引入：



\- TypeScript

\- Tailwind

\- 新 UI Framework

\- 新 Form Framework

\- 未批准 Component Library



\---



\## 30. Customer UI State



Customer UI 必須明確呈現：



\- Active

\- Inactive

\- Empty State

\- Search Result

\- Validation Error

\- API Error

\- Loading State



\### 30.1 Empty State



沒有 Customer 時必須顯示明確訊息，而不是空白列表。



搜尋沒有結果時也必須顯示明確 Empty State。



\---



\## 31. Customer Form



Create / Edit 使用 Bootstrap Form。



\### 31.1 Create



Create 欄位：



\- Name

\- Phone

\- Note



Create 時不提供 Status 選擇。



Create 後預設為 Active。



\### 31.2 Edit



Edit 欄位：



\- Name

\- Phone

\- Note



Status 不透過一般 Edit Form 修改。



\---



\## 32. Data Normalization



Customer Name 儲存前：



trim 前後空白。



Customer Phone 儲存前：



trim 前後空白。



不得因 MVP 簡化而保留無意義的前後空白。



TASK-0004 不建立複雜 Phone Normalization Service。



\---



\## 33. Validation



至少必須驗證：



\### 33.1 Name



\- Required

\- Maximum Length



\### 33.2 Phone



\- Required

\- Basic Format Validation

\- Maximum / Database Boundary



\### 33.3 Note



\- Maximum Length



所有 Validation 必須在 Backend 實際執行。



Frontend 可以提供 UX Validation，但不得取代 Backend Validation。



\---



\## 34. Automated Testing



TASK-0004 必須建立 Customer Automated Regression Tests。



至少涵蓋：



1\. Customer Create

2\. Customer List

3\. Customer Get

4\. Customer Search

5\. Customer Update

6\. Customer Deactivate

7\. Customer Reactivate

8\. Invalid Name

9\. Invalid Phone

10\. Authentication Boundary

11\. Role Boundary

12\. Customer / Pet Relationship Query

13\. Inactive Customer New Relationship Restriction



\---



\## 35. Lifecycle Testing



必須測試：



Active → Deactivate → Inactive



以及：



Inactive → Reactivate → Active



同時測試非法狀態轉換：



Active → Reactivate



Inactive → Deactivate



非法狀態轉換必須被拒絕。



\---



\## 36. Regression Requirement



TASK-0004 完成後不得破壞：



\- TASK-0001 Foundation

\- TASK-0002 Authentication

\- TASK-0003 Pet Management



既有 automated tests 必須維持通過。



TASK-0004 Targeted Tests 與既有 Regression Tests 均必須完成 Verification。



\---



\## 37. Verification Scope



TASK-0004 完成後至少必須實際驗證：



\### 37.1 Database



\- Customer Schema

\- Migration

\- Index

\- Constraint

\- Lifecycle Data

\- Customer / Pet Relationship Read



\### 37.2 Backend



\- Repository

\- Service

\- Controller

\- Routes

\- API Mounting

\- Validation

\- Authentication

\- Role Boundary

\- Lifecycle



\### 37.3 Frontend



\- Customer API Client

\- Customer List

\- Search

\- Create

\- Edit

\- Deactivate

\- Reactivate

\- Pet Relationship Display

\- Empty State

\- Error State



\### 37.4 End-to-End



至少驗證：



Browser → Next.js → Customer API Client → Express API → Customer Service → Customer Repository → MySQL



\---



\## 38. Definition of Done



TASK-0004 只有在以下全部完成後才能標記 PASS：



\- \[ ] Customer master-data schema

\- \[ ] Customer migration

\- \[ ] Customer repository

\- \[ ] Customer service

\- \[ ] Customer controller

\- \[ ] Customer routes

\- \[ ] Customer API mounting

\- \[ ] Customer validation

\- \[ ] Customer lifecycle

\- \[ ] Customer / Pet relationship query

\- \[ ] Frontend Customer API client

\- \[ ] Customer Management UI

\- \[ ] Customer search

\- \[ ] Customer filter

\- \[ ] Customer create

\- \[ ] Customer update

\- \[ ] Customer deactivate

\- \[ ] Customer reactivate

\- \[ ] Authentication boundary

\- \[ ] Role boundary

\- \[ ] Automated tests

\- \[ ] Existing regression tests

\- \[ ] Database verification

\- \[ ] Backend verification

\- \[ ] Frontend verification

\- \[ ] End-to-end verification



Definition of Done：



所有項目 PASS。



在所有必要項目完成實際 Verification 前，不得宣告 TASK-0004 PASS。



\---



\## 39. Scope Verification



TASK-0004 必須確認：



\- 未修改 TASK-0001 Freeze Foundation

\- 未修改 TASK-0002 Authentication Foundation

\- 未修改 TASK-0003 Pet Management Freeze Schema

\- 未建立新的 Authentication System

\- 未建立 Enterprise RBAC

\- 未新增未批准 Framework

\- 未新增 ORM

\- 未建立 Customer Portal

\- 未建立 CRM

\- 未建立 Online Booking

\- 未建立 Email System

\- 未建立 LINE Integration

\- 未擴張至其他 MVP Block



Scope Verification 必須透過實際檢查證明。



\---



\## 40. Stop Conditions



Implementation 過程若發生以下任一情況，必須停止，不得自行決策。



\### 40.1 Specification Conflict



Task Specification 與既有 Freeze Specification 衝突。



\### 40.2 Architecture Conflict



既有 Architecture 無法直接支援 TASK-0004，且需要修改既有 Architecture。



\### 40.3 Technology Conflict



需要新增未批准 Framework、Library、ORM 或 Technology。



\### 40.4 Scope Conflict



實作 Customer Management 時需要額外功能才能完成，但該功能不在本 Task Scope。



\### 40.5 Freeze Conflict



需要修改：



\- TASK-0001

\- TASK-0002

\- TASK-0003



任何已 Freeze 的內容。



\### 40.6 Stop Condition 回報格式



Problem：

Observation：

Impact：

Required Decision：



\---



\## 41. Implementation Constraints



Coding AI 必須遵守：



1\. 先閱讀本 Task Specification。

2\. 先閱讀所有 Reference Documents。

3\. 先檢查 Repository 實際狀態。

4\. 不得假設 Repository 為空白。

5\. 不得重新設計已 Freeze 的 TASK-0001～TASK-0003。

6\. 不得修改 Freeze Specification。

7\. 不得擴張 Task Scope。

8\. 不得新增未批准 Framework / Library。

9\. 不得將 TypeScript 引入專案。

10\. 不得引入 Tailwind。

11\. 不得引入 Enterprise Architecture。

12\. 不得以推測結果取代 Verification。

13\. 所有 Definition of Done 必須實際驗證。

14\. 發生 Stop Condition 必須停止並回報。



\---



\## 42. Engineering Principle



TASK-0004 必須遵循：



> 該寫的才寫。



Implementation 應優先建立：



\- 清楚

\- 可維護

\- 可驗證

\- 足以支援 MVP 日常營運



的最小實作。



禁止為假設中的未來需求建立複雜架構。



\---



\## 43. Completion Review



Implementation 完成後，必須進行 Completion Review。



Review 至少確認：



\- Task Status

\- Stop Conditions

\- Scope Verification

\- Definition of Done

\- Database Verification

\- Backend Verification

\- Frontend Verification

\- Automated Testing

\- Regression Testing

\- End-to-End Verification

\- Final Result



只有所有必要項目 PASS，TASK-0004 才可進入 Freeze。



\---



\## 44. TASK-0004 Completion Result



TASK-0004 Implementation 完成後，必須依實際 Verification 結果判定：



\- PASS

\- 或 NOT PASS / BLOCKED



在 Verification 完成前，不得預先宣告 PASS。



\---



\## 45. Freeze Requirement After PASS



TASK-0004 完成並 PASS 後：



1\. 建立正式 Freeze Baseline。

2\. Freeze 文件放置於 D:\\MVP\\docs\\。

3\. Freeze 文件記錄 TASK-0004 最終實際完成狀態。

4\. Freeze 文件記錄已驗證的功能與技術基準。

5\. Freeze 文件作為後續 TASK 的歷史 Baseline。

6\. 不另外建立 Human Browser Verification Checklist。

7\. 不另外建立 Completion Report。

8\. 不另外建立 Acceptance Checklist。

9\. 不建立其他沒有實際工程價值的文件。



TASK-0004 的正式 Freeze Baseline 不得在 Coding 與 Verification 尚未完成前建立。



\---



\## 46. Formal Task File



正式 Task Specification 檔名：



TASK-0004\_客戶管理區塊\_Customer-Management-Block\_v1.0.md



正式保存位置：



D:\\MVP\\Tasks\\



本文件為：



Customer Management Block 的 AI Coding 執行用 Task Specification。



本文件狀態：



FREEZE



\---



\## 47. Task Execution Boundary



TASK-0004 的正式執行流程：



Task Specification FREEZE

→ Repository Inspection

→ Precondition Check

→ Scope Check

→ Implementation Plan

→ Coding Implementation

→ Verification

→ Completion Review

→ PASS

→ Freeze Baseline



在 Specification FREEZE 後，不得於 Coding Implementation 階段自行重新討論或修改已確認的 Task 決策。



如需變更已 Freeze 的 Specification，必須停止目前 Task 執行並取得必要的明確決策。



\---



\## 48. Final Task Status



TASK-0004：



\*\*客戶管理區塊 — Customer Management Block\*\*



\*\*Version：v1.0\*\*



\*\*Specification Status：FREEZE\*\*



\*\*下一階段：AI Coding Implementation\*\*



\*\*正式 Task 文件保存位置：D:\\MVP\\Tasks\\\*\*



\*\*TASK-0004 尚未因本文件而宣告 Implementation PASS。\*\*

