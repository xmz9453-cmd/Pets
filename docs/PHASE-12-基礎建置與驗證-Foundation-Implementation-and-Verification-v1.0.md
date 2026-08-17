\# PHASE-12 — 基礎建置與驗證

\## Foundation Implementation and Verification



\*\*Document ID:\*\* PHASE-12  

\*\*Document Name:\*\* 基礎建置與驗證 — Foundation Implementation and Verification  

\*\*Version:\*\* v1.0  

\*\*Status:\*\* FREEZE  

\*\*Freeze Date:\*\* 2026-08-16  

\*\*Project:\*\* MVP 寵物美容／寵物住宿工作室營運管理系統  

\*\*Document Type:\*\* Phase Specification  

\*\*Previous Phase:\*\* PHASE-11 — Engineering Foundation Specification  

\*\*Next Phase:\*\* PHASE-13  



\---



\# 1. 文件目的



本文件定義 MVP 專案在正式進入 Business Block 開發前，所需完成的 Engineering Foundation 建置與驗證方式。



PHASE 12 的核心目的不是建立任何 Business Block，而是：



> 建立一個可以穩定啟動、連接資料庫、執行 Migration、執行 Seed、執行測試，並且可以從乾淨環境重新建立的 MVP 工程基礎。



PHASE 12 完成後，後續 Business Block 才可以在一致且可驗證的工程環境中開始開發。



\---



\# 2. Phase Status



\*\*Status：FREEZE\*\*



PHASE 12 已完成：



\- Batch 1：Q1～Q10

\- Batch 2：Q11～Q20

\- Batch 3：Q21～Q30

\- Batch 4：Q31～Q40

\- Phase Review

\- Freeze



本文件為 PHASE 12 的正式 Freeze 文件。



\---



\# 3. Phase 核心原則



PHASE 12 遵循以下原則：



1\. Foundation 優先於 Business Block。

2\. 先建立可運作的工程環境，再開始 Business Block。

3\. Frontend 與 Backend 分離。

4\. Frontend 不直接連接 MySQL。

5\. Backend 負責正式 API。

6\. Backend 使用 mysql2 連接 MySQL。

7\. 不使用 ORM。

8\. Development Database 與 Test Database 分離。

9\. Migration 與 Seed 分離。

10\. Migration 必須先於 Seed。

11\. 測試不得依賴 Development Database。

12\. Foundation 必須可以從乾淨環境重新建立。

13\. Foundation 必須有明確的 Verification Criteria。

14\. Foundation PASS 後，才進入 Business Block。

15\. 不為 Foundation 提前加入 Enterprise Architecture。

16\. 不因工程便利而改變已 Freeze 的 Business Responsibility。



\---



\# 4. PHASE 12 輸入



PHASE 12 承接以下已 Freeze 的內容：



\## 4.1 PHASE 1



MVP Product Definition。



確立：



\- MVP 產品定位

\- MVP Scope

\- MVP Business Blocks

\- MVP Definition of Done



\---



\## 4.2 PHASE 2



Business Workflow \& Operational Decisions。



確立：



\- 核心營運流程

\- 店家操作方式

\- 業務決策



\---



\## 4.3 PHASE 3



MVP Scope \& Product Boundary。



確立：



\- MVP 包含範圍

\- MVP 排除範圍

\- Business Boundary



\---



\## 4.4 PHASE 4



MVP Block Map。



確立：



\- Block 分類

\- Block 責任

\- Block 邊界

\- Block 依賴

\- Block 建置順序



\---



\## 4.5 PHASE 5



MVP Block Design。



確立：



\- Block Business Responsibility

\- Block Internal Capability

\- Input

\- Output

\- Dependency

\- Collaboration

\- Completion Criteria



\---



\## 4.6 PHASE 6



MVP Architecture \& Technical Boundary。



技術基線：



\### Frontend



\- Next.js

\- JavaScript

\- Bootstrap



\### Backend



\- Express.js

\- JavaScript



\### Database



\- MySQL



\### Database Driver



\- mysql2



\### Testing



\- Jest

\- Supertest



\### ORM



\- 不使用 ORM



\---



\## 4.7 PHASE 10



MVP Implementation Planning。



確立：



\- Implementation Order

\- Foundation First

\- Block-based Development

\- Verification Before Integration



\---



\## 4.8 PHASE 11



Engineering Foundation Specification。



確立：



\- Foundation 結構

\- Environment

\- Database Connection

\- Testing Foundation

\- Migration / Seed 基礎方向

\- Engineering Boundary



\---



\# 5. PHASE 12 輸出



PHASE 12 的正式輸出包含：



1\. Frontend Foundation 建置方向

2\. Backend Foundation 建置方向

3\. Environment Configuration

4\. Development Database

5\. Test Database

6\. Database Connection

7\. SQL Migration

8\. Migration Tracking

9\. Seed

10\. Health Check

11\. Frontend API Client Foundation

12\. Error Handling Foundation

13\. Jest / Supertest Foundation

14\. Test Database Setup

15\. Development Database Reset

16\. Foundation Setup 流程

17\. Foundation Verification

18\. Clean Environment Verification

19\. Foundation PASS Criteria



\---



\# 6. Foundation Scope



PHASE 12 只負責工程基礎。



包含：



```text

Project Foundation

&#x20;   ↓

Frontend Foundation

&#x20;   ↓

Backend Foundation

&#x20;   ↓

Environment Foundation

&#x20;   ↓

Database Foundation

&#x20;   ↓

Migration Foundation

&#x20;   ↓

Seed Foundation

&#x20;   ↓

Testing Foundation

&#x20;   ↓

Verification Foundation

```



PHASE 12 不負責任何正式 Business Block。



\---



\# 7. Business Block Boundary



PHASE 12 不建立以下 Business Block：



1\. Staff / Authentication

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



上述能力必須依照後續 Phase / Block Development 流程進行。



\---



\# 8. Project Structure



PHASE 12 採用 Frontend / Backend 分離的專案結構。



基本概念：



```text

PSOP/

├── frontend/

├── backend/

├── database/

│   ├── migrations/

│   └── seeds/

└── testing/

```



實際檔案與資料夾可以依工程實作需要細化，但不得因此改變已 Freeze 的 Architecture Boundary。



\---



\# 9. Frontend Foundation



\## 9.1 Frontend Technology



Frontend 使用：



```text

Next.js

\+

JavaScript

\+

Bootstrap

```



\---



\## 9.2 Frontend 專案



Frontend 建立為獨立 npm Project。



基本結構：



```text

frontend/

├── package.json

└── package-lock.json

```



\---



\## 9.3 Frontend 不使用



以下技術不屬於 PHASE 12：



\- TypeScript

\- Tailwind CSS

\- 其他未 Freeze 的 UI Framework



\---



\# 10. Frontend Environment



Frontend 建立 Environment Configuration。



至少需要提供 API Base URL 的設定方式。



概念：



```text

NEXT\_PUBLIC\_API\_BASE\_URL=

```



API URL 不應直接硬編碼於 UI Component。



\---



\# 11. Frontend API Client Foundation



Frontend 建立最小 API Client 層。



基本責任：



```text

UI

&#x20;↓

API Client

&#x20;↓

Backend API

```



API Client 負責：



\- Backend API Request

\- 基本 Response Handling

\- 基本 Error Handling



PHASE 12 不建立 Customer、Pet、Appointment 等 Business API Client。



\---



\# 12. Frontend Error Handling



Frontend 至少能區分：



```text

API Success

API Error

Network Error

```



不建立：



\- Enterprise Error Management

\- 複雜監控平台

\- 複雜 Logging Platform



\---



\# 13. Backend Foundation



\## 13.1 Backend Technology



Backend 使用：



```text

Express.js

\+

JavaScript

```



\---



\## 13.2 Backend 專案



Backend 為獨立 npm Project。



基本結構：



```text

backend/

├── package.json

├── package-lock.json

└── src/

```



\---



\## 13.3 Module System



Backend 第一版採用：



```text

CommonJS

```



例如：



```text

require()

module.exports

```



PHASE 12 不導入額外 Module System 複雜化。



\---



\# 14. Backend Environment



Backend 使用 Environment Configuration。



至少包含以下概念：



```text

NODE\_ENV=

PORT=



DB\_HOST=

DB\_PORT=

DB\_NAME=

DB\_USER=

DB\_PASSWORD=

```



實際環境變數名稱可以依工程實作統一，但必須維持相同責任。



\---



\# 15. Environment Validation



Backend 啟動時必須驗證必要 Environment Variables。



如果必要設定缺失：



```text

Load Environment

&#x20;   ↓

Validation FAIL

&#x20;   ↓

Log Error

&#x20;   ↓

Stop Startup

```



不得等到實際 API 執行時才發現必要設定缺失。



\---



\# 16. Development / Test Environment



至少區分：



```text

Development

&#x20;   ↓

Development Database



Test

&#x20;   ↓

Test Database

```



概念：



```text

psop\_dev

&#x20;   ≠

psop\_test

```



Test 不得依賴 Development Database。



\---



\# 17. Database Foundation



\## 17.1 Database Technology



使用：



```text

MySQL

```



\---



\## 17.2 Database Driver



Backend 使用：



```text

mysql2

```



直接負責 MySQL Database Access。



\---



\## 17.3 ORM



PHASE 12 不使用 ORM。



因此不使用：



\- Prisma

\- Sequelize

\- TypeORM

\- 其他 ORM



Database Access 維持：



```text

Business Logic

&#x20;   ↓

Data Access

&#x20;   ↓

mysql2

&#x20;   ↓

MySQL

```



\---



\# 18. Database Connection Validation



Backend 啟動時進行基本 Database Connection Validation。



流程：



```text

Backend Start

&#x20;   ↓

Load Environment

&#x20;   ↓

Validate Configuration

&#x20;   ↓

Connect MySQL

&#x20;   ↓

Connection PASS

&#x20;   ↓

Start Server

```



如果 Database Connection 失敗：



```text

Connection FAIL

&#x20;   ↓

Log Error

&#x20;   ↓

Stop Backend

```



不允許 Backend 在 Database 明確不可用時呈現為完全正常狀態。



\---



\# 19. Migration Foundation



Database Migration 使用 SQL Script。



基本概念：



```text

database/

└── migrations/

&#x20;   ├── 001\_xxx.sql

&#x20;   ├── 002\_xxx.sql

&#x20;   └── ...

```



Migration 不透過 ORM 執行。



\---



\# 20. Migration Tracking



建立簡單的 Migration Tracking 機制。



概念：



```text

schema\_migrations

```



至少記錄：



\- Migration Identifier / Filename

\- Executed At



Migration 執行流程：



```text

Read Migration

&#x20;   ↓

Check Tracking

&#x20;   ↓

未執行

&#x20;   ↓

Execute SQL

&#x20;   ↓

Record Migration

```



已執行的 Migration 不應在正常流程中重複執行。



\---



\# 21. Migration 執行順序



Migration 必須先於 Seed。



固定流程：



```text

Database Setup

&#x20;   ↓

Migration

&#x20;   ↓

Seed

```



不得將 Seed 放在 Migration 前面。



\---



\# 22. Business Schema Boundary



PHASE 12 不建立正式 Business Schema。



因此本 Phase 不建立：



```text

customers

pets

services

appointments

orders

payments

products

```



等正式 Business Tables，除非為了 Foundation Verification 所必要的技術性測試資料另有明確定義。



Business Schema 應於後續 Business Block 開發階段建立。



\---



\# 23. Seed Foundation



Seed 負責建立開發或測試所需的基礎資料。



Seed 應盡量具備：



> 可重複執行。



避免重複執行造成大量重複資料。



Seed 與 Migration 分離。



```text

Migration

&#x20;   ↓

Schema Ready

&#x20;   ↓

Seed

&#x20;   ↓

Data Ready

```



\---



\# 24. Database Setup



建立明確 Database Setup 流程：



```text

Database Setup

&#x20;   ↓

確認 MySQL

&#x20;   ↓

確認 Database

&#x20;   ↓

Run Migration

&#x20;   ↓

Run Seed

```



目的：



讓開發環境不需要依靠個人記憶執行 Database 初始化。



\---



\# 25. Development Database Reset



Development Environment 可以提供 Database Reset。



概念：



```text

npm run db:reset

```



流程：



```text

Reset

&#x20;   ↓

Migration

&#x20;   ↓

Seed

```



用途：



\- 快速重建 Development Database

\- 清除開發期間產生的測試資料

\- 重新建立一致的開發狀態



\---



\# 26. Reset Safety Boundary



Database Reset 只能用於 Development Environment。



概念：



```text

Development

&#x20;   ↓

允許 Reset



Test

&#x20;   ↓

由 Test Setup 控制



Production

&#x20;   ↓

禁止 Development Reset

```



不得讓一般 Development Reset 指令直接清除 Production Database。



\---



\# 27. Health Check



Backend 提供：



```text

GET /health

```



Health Check 用於確認 Foundation 是否正常。



至少需要確認：



```text

Application

Database

```



基本概念：



```text

GET /health

&#x20;   ↓

Application Status

&#x20;   ↓

Database Status

```



成功時應回傳 HTTP 200。



\---



\# 28. Health Check Responsibility



Health Check 只負責 Foundation 健康狀態。



不負責：



\- Business Report

\- Business Metrics

\- BI

\- Monitoring Platform

\- Advanced Observability



\---



\# 29. Testing Foundation



測試技術：



```text

Jest

\+

Supertest

```



\---



\# 30. Test Database



Testing 使用獨立 Test Database。



概念：



```text

Jest

&#x20;   ↓

Test Setup

&#x20;   ↓

psop\_test

&#x20;   ↓

Migration

&#x20;   ↓

Test Data

&#x20;   ↓

Tests

```



Test 不使用：



```text

psop\_dev

```



\---



\# 31. Test Setup



Test Setup 負責準備 Test Environment。



基本流程：



```text

Jest Start

&#x20;   ↓

Test Database Setup

&#x20;   ↓

Migration

&#x20;   ↓

Test Data Setup

&#x20;   ↓

Run Tests

```



測試環境不應依賴開發者事前手動建立資料庫。



\---



\# 32. Foundation Integration Test



PHASE 12 至少建立一個最小 Integration Test。



基本驗證：



```text

Supertest

&#x20;   ↓

GET /health

&#x20;   ↓

HTTP 200

&#x20;   ↓

Database Status OK

```



此測試用來驗證 Foundation 的基本整合能力。



\---



\# 33. Foundation Test Responsibility



Foundation Integration Test 至少間接確認：



\- Express Server

\- Routing

\- Environment

\- Database Connection

\- Health Check

\- Supertest

\- Test Database



不在 PHASE 12 驗證 Business Rules。



\---



\# 34. Automated Verification



自動化驗證至少包含：



```text

npm test

```



並確認：



\- Jest 可以啟動

\- Supertest 可以執行

\- Test Database 可以使用

\- Foundation Integration Test PASS



\---



\# 35. Manual Verification



除 Automated Test 外，必須進行基本人工驗證。



至少確認：



\- Frontend 可以啟動

\- Backend 可以啟動

\- Browser 可以訪問 Frontend

\- Backend `/health` 可以訪問

\- MySQL 正常運作

\- Database Connection 正常

\- Migration 正常

\- Seed 正常

\- Git 正常



\---



\# 36. Foundation Verification Checklist



PHASE 12 使用以下 Checklist 判定 Foundation：



```text

□ Frontend 可以啟動

□ Backend 可以啟動

□ MySQL 可以連線

□ Development Database 正常

□ Test Database 正常

□ Environment Configuration 正常

□ Environment Validation 正常

□ Database Connection Validation 正常

□ Migration 可以執行

□ Migration Tracking 正常

□ Seed 可以執行

□ Seed 可以重複執行

□ Database Reset 可以執行

□ Development Reset 有 Environment Safety

□ GET /health 正常

□ Database Health Check 正常

□ Frontend API Client Foundation 存在

□ Frontend Error Handling Foundation 存在

□ Jest 可以執行

□ Supertest 可以執行

□ Foundation Integration Test PASS

□ Clean Environment 可以重新建立

□ Git 正常

```



\---



\# 37. Clean Environment Verification



Foundation 不只要求：



> 「目前這台電腦可以跑。」



還要求：



> 「從乾淨環境依照既定流程可以重新建立。」



基本流程：



```text

Clean Environment

&#x20;   ↓

Install Dependencies

&#x20;   ↓

Configure Environment

&#x20;   ↓

Database Setup

&#x20;   ↓

Migration

&#x20;   ↓

Seed

&#x20;   ↓

Start Frontend

&#x20;   ↓

Start Backend

&#x20;   ↓

Run Tests

&#x20;   ↓

Verification

&#x20;   ↓

PASS

```



\---



\# 38. Foundation PASS Criteria



PHASE 12 的 Foundation PASS 必須同時符合：



\## Application



\- Frontend 可啟動

\- Backend 可啟動



\## Database



\- MySQL 可連線

\- Development Database 可使用

\- Test Database 可使用



\## Database Setup



\- Migration 可執行

\- Migration Tracking 正常

\- Seed 可執行

\- Database Reset 正常



\## API



\- `/health` 可使用

\- Database Health Check 正常



\## Testing



\- Jest 可執行

\- Supertest 可執行

\- Foundation Integration Test PASS



\## Environment



\- Environment Configuration 正常

\- 必要設定可被驗證

\- Development / Test 分離



\## Reproducibility



\- Clean Environment 可以重新建立 Foundation



全部符合：



> \*\*FOUNDATION PASS\*\*



\---



\# 39. Foundation Completion Boundary



當 Foundation PASS 後：



```text

Foundation Implementation

&#x20;       ↓

Foundation Verification

&#x20;       ↓

FOUNDATION PASS

&#x20;       ↓

Foundation Freeze

&#x20;       ↓

Business Block Development

```



不得因為：



\- UI 還可以更漂亮

\- Architecture 還可以更複雜

\- Framework 還可以更多

\- 未來可能需要某功能



而無限延長 Foundation。



\---



\# 40. PHASE 12 不包含的能力



以下不屬於 PHASE 12：



\- Customer Business Logic

\- Pet Business Logic

\- Service Business Logic

\- Appointment Business Logic

\- Daily Operations Business Logic

\- Grooming Business Logic

\- Boarding Business Logic

\- Order Business Logic

\- Payment Business Logic

\- Product Business Logic

\- Report Business Logic

\- LINE Integration

\- Third-party Payment

\- Enterprise Authentication

\- RBAC

\- Multi-tenant

\- Inventory

\- BI

\- Accounting



這些能力依照 MVP Scope 與後續 Block Development 流程處理。



\---



\# 41. 與既有 Freeze 的一致性



PHASE 12 不修改：



\- PHASE 1 MVP Product Definition

\- PHASE 2 Business Workflow

\- PHASE 3 MVP Scope

\- PHASE 4 Block Map

\- PHASE 5 Block Design

\- PHASE 6 Architecture

\- PHASE 7 Engineering / Development Decisions

\- PHASE 8 Development Foundation

\- PHASE 9 MVP Block Development Strategy

\- PHASE 10 MVP Implementation Planning

\- PHASE 11 Engineering Foundation Specification



若後續發現真正的衝突：



> 必須依 Change Request 規則處理。



不得直接修改 Freeze。



\---



\# 42. PHASE 12 Freeze Decisions



PHASE 12 正式 Freeze 以下決策：



1\. Frontend / Backend 分離。

2\. Frontend 使用 Next.js + JavaScript + Bootstrap。

3\. Backend 使用 Express.js + JavaScript。

4\. Backend 使用 CommonJS。

5\. 使用 npm。

6\. 保留 package-lock.json。

7\. 不使用 `.nvmrc`。

8\. Database 使用 MySQL。

9\. Database Access 使用 mysql2。

10\. 不使用 ORM。

11\. Development / Test Database 分離。

12\. 使用 SQL Migration。

13\. 建立 Migration Tracking。

14\. Migration 必須先於 Seed。

15\. Seed 應可重複執行。

16\. 建立 Database Setup 流程。

17\. Development 可使用 Database Reset。

18\. Database Reset 不得作用於 Production。

19\. Backend 啟動時驗證 Environment。

20\. Backend 啟動時驗證 Database Connection。

21\. Database Connection 失敗時停止 Backend。

22\. 建立 `/health`。

23\. Health Check 包含 Application / Database 基本狀態。

24\. Frontend 建立 API Client Foundation。

25\. Frontend 建立最小 Error Handling。

26\. Testing 使用 Jest + Supertest。

27\. Testing 使用獨立 Test Database。

28\. Test Setup 自動準備 Test Database。

29\. 建立 Foundation Integration Test。

30\. Foundation 使用 Automated + Manual Verification。

31\. 建立 Foundation Verification Checklist。

32\. 必須進行 Clean Environment Verification。

33\. Foundation PASS 後才進入 Business Block Development。



\---



\# 43. Phase Review 結論



PHASE 12 Review 已完成。



Review 結果：



```text

Architecture Consistency       PASS

Business Boundary              PASS

Environment Boundary           PASS

Database Boundary              PASS

Testing Boundary               PASS

Migration / Seed Flow          PASS

Development / Test Separation  PASS

Foundation Verification        PASS

MVP Scope Consistency           PASS

```



未發現需要重新開啟既有 Freeze 的衝突。



因此：



> \*\*PHASE 12 正式 FREEZE。\*\*



\---



\# 44. PHASE 12 最終流程



```text

PHASE 11 FREEZE

&#x20;       ↓

Foundation Implementation

&#x20;       ↓

Frontend Foundation

&#x20;       ↓

Backend Foundation

&#x20;       ↓

Environment Configuration

&#x20;       ↓

MySQL Connection

&#x20;       ↓

Migration

&#x20;       ↓

Seed

&#x20;       ↓

Health Check

&#x20;       ↓

Jest + Supertest

&#x20;       ↓

Test Database

&#x20;       ↓

Foundation Verification

&#x20;       ↓

Clean Environment Verification

&#x20;       ↓

FOUNDATION PASS

&#x20;       ↓

PHASE 12 FREEZE

&#x20;       ↓

PHASE 13

```



\---



\# 45. PHASE 12 完成定義



PHASE 12 的 Definition of Done：



> \*\*建立一個符合既有 Architecture、可以啟動 Frontend 與 Backend、可以連接 MySQL、可以執行 Migration 與 Seed、具備 Development / Test 分離、具備 Jest / Supertest Testing Foundation、具備 Health Check、可以從乾淨環境重新建立，並且通過 Foundation Verification 的工程基礎。\*\*



PHASE 12 完成後：



> \*\*Foundation 不再作為獨立設計議題反覆修改。\*\*



除非發生：



\- Bug

\- 原決策矛盾

\- 技術實作限制

\- 真正的新需求



否則不得因為單純的設計偏好重新開啟 PHASE 12。



\---



\# 46. 下一階段



下一階段為：



> \*\*PHASE 13\*\*



PHASE 13 必須承接：



```text

PHASE 1  FREEZE

&#x20;   ↓

PHASE 2  FREEZE

&#x20;   ↓

PHASE 3  FREEZE

&#x20;   ↓

PHASE 4  FREEZE

&#x20;   ↓

PHASE 5  FREEZE

&#x20;   ↓

PHASE 6  FREEZE

&#x20;   ↓

PHASE 7  FREEZE

&#x20;   ↓

PHASE 8  FREEZE

&#x20;   ↓

PHASE 9  FREEZE

&#x20;   ↓

PHASE 10 FREEZE

&#x20;   ↓

PHASE 11 FREEZE

&#x20;   ↓

PHASE 12 FREEZE

```



後續 Phase 不得自行推翻以上 Freeze。



\*\*PHASE 12 — Foundation Implementation and Verification v1.0\*\*



\*\*Status: FREEZE\*\*



\*\*END OF DOCUMENT\*\*

