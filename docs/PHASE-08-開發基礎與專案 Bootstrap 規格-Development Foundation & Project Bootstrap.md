\# PHASE-08 — Development Foundation \& Project Bootstrap

\# 開發基礎與專案 Bootstrap 規格



\*\*Document ID:\*\* PHASE-08  

\*\*Document Name:\*\* Development Foundation \& Project Bootstrap — 開發基礎與專案 Bootstrap  

\*\*Version:\*\* v1.0  

\*\*Status:\*\* FREEZE  

\*\*Freeze Date:\*\* 2026-08-16  

\*\*Project:\*\* MVP — 小型寵物美容／寵物住宿工作室營運管理系統



\---



\# 1. 文件目的



PHASE 8 的目的，是在 PHASE 1～PHASE 7 已 Freeze 的前提下，建立一個：



> \*\*乾淨、簡單、可驗證、可重新建立，並且可以正式開始 Business Block 開發的工程基礎。\*\*



PHASE 8 不負責實作任何 Business Block。



PHASE 8 的完成條件不是「建立資料夾」或「安裝套件」，而是：



> \*\*整個 Development Foundation 可以正常運作，並通過 Foundation PASS。\*\*



\---



\# 2. 上游 Freeze 依賴



PHASE 8 必須建立於以下已 Freeze 的決策之上：



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

Engineering / Development Rules

&#x20;       ↓

PHASE 8

Development Foundation \& Project Bootstrap

```



PHASE 8 不得自行修改上述任何 Freeze。



如發生衝突，必須依既定 Change Request 規則處理。



\---



\# 3. PHASE 8 核心原則



PHASE 8 遵守以下原則：



1\. MVP First

2\. No Premature Engineering

3\. Frontend / Backend Separation

4\. Business Responsibility 不因工程結構而改變

5\. Database Responsibility 集中管理

6\. Testing 與正式環境隔離

7\. Environment 與 Secret 分離

8\. Migration 與 Seed 必須可重複執行

9\. Development Environment 必須可以重新建立

10\. Foundation PASS 後才開始第一個 Business Block

11\. 不建立企業級基礎設施

12\. 不為未來假需求提前工程化



\---



\# 4. 技術基線



PHASE 8 延續 PHASE 6 的技術 Freeze。



\## 4.1 Frontend



```text

Next.js

JavaScript

Bootstrap

```



\## 4.2 Backend



```text

Express.js

JavaScript

```



\## 4.3 Database



```text

MySQL

```



\## 4.4 Database Driver



```text

mysql2

```



\## 4.5 Testing



```text

Jest

Supertest

```



\## 4.6 ORM



```text

不使用 ORM

```



不得自行改為：



\- Prisma

\- Sequelize

\- TypeORM

\- Drizzle

\- 其他 ORM



除非正式提出 Change Request 並獲得確認。



\---



\# 5. Overall Project Structure



PHASE 8 建立以下第一版 Project Structure：



```text

PSOP/

├─ docs/

├─ frontend/

├─ backend/

├─ database/

└─ testing/

```



各目錄責任如下。



| Directory | Responsibility |

|---|---|

| `docs/` | 正式專案文件 |

| `frontend/` | Next.js Frontend |

| `backend/` | Express.js Backend |

| `database/` | Database Migration / Seed 等 Database 工程資產 |

| `testing/` | 獨立 Testing Project |



不得因工程便利而重新定義 Business Block Responsibility。



\---



\# 6. Backend Structure



Backend 使用 `src/` 作為正式 Source Root。



第一版結構：



```text

backend/

├─ src/

│  ├─ config/

│  ├─ database/

│  ├─ middleware/

│  ├─ modules/

│  └─ shared/

├─ app.js

├─ server.js

└─ package.json

```



\---



\# 7. Backend Application Entry



Backend 將 Application 與 HTTP Server 分離。



\## 7.1 `app.js`



負責：



\- 建立 Express Application

\- Middleware 設定

\- Route 設定

\- Error Handler 設定



\## 7.2 `server.js`



負責：



\- 載入 Application

\- 啟動 HTTP Server

\- 啟動所需的 Application Runtime



此分離方式主要服務於：



\- Jest

\- Supertest

\- Integration Testing



Testing 可以直接使用 Express Application，而不必每次測試都啟動實際 HTTP Server。



\---



\# 8. Backend Config



Backend 建立：



```text

backend/src/config/

```



負責集中處理：



\- Environment Variables

\- Application Configuration

\- Database Configuration

\- 其他必要的基礎設定



不得讓 Environment Configuration 散落在各 Business Block。



\---



\# 9. Database Connection



Database Connection 集中於：



```text

backend/src/database/

```



Database Connection 不屬於任何 Business Block。



第一版使用：



```text

mysql2

```



並使用：



> Connection Pool



而不是每一次 Database Query 都重新建立 Connection。



\---



\# 10. Database Connection Pool



Backend 使用 `mysql2` Connection Pool。



目的：



1\. 避免每次 Request 建立新的 Database Connection。

2\. 集中管理 Connection。

3\. 保持 Database Configuration 一致。

4\. 避免各 Business Block 自行管理 Connection。



Business Block 不得自行建立獨立的 Database Connection Pool。



\---



\# 11. Middleware



建立：



```text

backend/src/middleware/

```



用於集中管理真正跨 API、跨 Module 的 Middleware。



第一版至少預留以下責任：



\- Authentication Middleware

\- Error Handler

\- Request Validation



Middleware 不應承擔 Business Block 的核心 Business Logic。



\---



\# 12. Global Error Handler



Backend 建立統一 Global Error Handler。



責任：



> 將 Backend Error 統一轉換成一致的 API Error Response。



Business Controller 不應各自建立完全不同的 Error Response 格式。



Global Error Handler 不負責 Business Decision。



\---



\# 13. Request Validation



建立簡單的共用 Request Validation 機制。



Validation 可處理：



\- Required Field

\- Data Type

\- Format

\- Basic Constraint



Validation 的目的為：



> 在 Request 進入 Business Logic 前，確認基本資料格式正確。



第一版不建立大型 Validation Framework。



\---



\# 14. Shared



建立：



```text

backend/src/shared/

```



但嚴格限制用途。



只允許放置真正跨 Business Block 共用的：



\- Utility

\- Common Helper

\- Error Definition

\- 其他穩定且具有跨 Module 共用價值的基礎能力



不得將：



> 「暫時不知道放哪裡的程式」



全部丟進 `shared/`。



`shared/` 不得成為新的責任混合區。



\---



\# 15. Constants



PHASE 8 暫時不建立獨立：



```text

constants/

```



只有當實際開發產生：



> 穩定、跨 Module、需要集中管理的共用常數



時，才評估是否建立。



理由：



> 避免為尚不存在的需求提前建立工程結構。



\---



\# 16. API Route Registry



Backend 建立集中式 API Route Registry。



第一版概念：



```text

backend/src/

└─ routes/

&#x20;  ├─ index.js

&#x20;  └─ ...

```



Route Registry 負責：



> 集中註冊與掛載 API Routes。



Business Block 的 Route 可以分開管理，但由集中入口統一掛載。



不得將全部 Route 長期堆積於 `server.js`。



\---



\# 17. Business Modules Boundary



Backend 的：



```text

backend/src/modules/

```



作為 Business Block 的主要程式責任區。



未來 Business Block 可以依：



```text

modules/

├─ customer/

├─ pet/

├─ appointment/

├─ grooming/

├─ boarding/

├─ order/

├─ payment/

└─ ...

```



等方式建立。



但是：



> PHASE 8 不正式實作 Business Block。



PHASE 8 只建立可以承載後續 Business Block 的工程地基。



\---



\# 18. Frontend Structure



Frontend 使用 Next.js + JavaScript。



第一版方向：



```text

frontend/

├─ src/

│  ├─ api/

│  ├─ components/

│  └─ modules/

├─ public/

└─ package.json

```



\---



\# 19. Frontend API Layer



Frontend 建立共用 API Layer：



```text

frontend/src/api/

```



責任：



> 統一管理 Frontend 與 Backend API 的溝通方式。



Page / Component 不應大量散落：



```text

fetch("http://localhost:3001/...")

```



而應透過共用 API Layer。



API Layer 不負責 Business Decision。



\---



\# 20. Frontend Components



建立：



```text

frontend/src/components/

```



只放真正跨頁面、跨 Module 共用的 UI Components。



例如：



\- Button

\- Modal

\- Table

\- Loading



Bootstrap 已提供大量 UI 基礎，因此第一版不建立大型 Design System。



\---



\# 21. Frontend Modules



建立：



```text

frontend/src/modules/

```



作為未來 Business-oriented UI 的主要組織方式。



但是：



> PHASE 8 不開始實作 Customer、Pet、Appointment 等 Business Module。



\---



\# 22. Package Management



Frontend、Backend、Testing 各自管理自己的 `package.json`。



第一版不建立 Root `package.json`。



因此：



```text

frontend/package.json

backend/package.json

testing/package.json

```



各自負責自己的 Dependencies 與 Scripts。



這樣可以保持：



> Frontend / Backend / Testing 的責任清楚。



\---



\# 23. Dependency Policy



Dependency 採：



> Only What We Need



原則。



只加入目前真正需要的套件。



不得因為：



> 「未來可能會使用」



就提前加入大量 Dependencies。



第一版基礎技術依賴包括：



```text

Frontend

Next.js

Bootstrap



Backend

Express.js

mysql2



Testing

Jest

Supertest

```



其他套件必須依實際需求再加入。



\---



\# 24. Node.js Version Policy



專案必須固定 Node.js Version Policy。



可使用：



```text

.nvmrc

```



或等價的 Version Management 方法。



目的：



> 確保不同開發環境使用相容的 Node.js Version。



Node.js Version Policy 不等於建立複雜 Toolchain。



\---



\# 25. Lock File



各 Node.js Project 的 Lock File 必須納入 Git。



例如：



```text

frontend/package-lock.json

backend/package-lock.json

testing/package-lock.json

```



實際檔案名稱依採用的 Package Manager 決定。



目的：



> 確保不同環境安裝到一致的 Dependency Version。



\---



\# 26. Environment Configuration



Environment 必須與程式碼分離。



至少區分：



```text

Development Environment

Test Environment

Example Configuration

```



第一版包含概念：



```text

.env

.env.test

.env.example

```



\---



\# 27. `.env.example`



必須建立 `.env.example`。



`.env.example` 的用途：



> 告訴開發者需要哪些 Environment Variables。



例如：



```text

PORT=

DATABASE\_HOST=

DATABASE\_PORT=

DATABASE\_USER=

DATABASE\_PASSWORD=

DATABASE\_NAME=

```



Frontend 所需的 API Base URL 等設定，也必須以 Example Configuration 的形式提供。



`.env.example`：



> 不得包含任何真實密碼或 Secret。



\---



\# 28. Environment Validation



Backend 啟動時必須檢查必要 Environment Variables。



如果必要設定不存在：



> Application 應在啟動階段明確失敗並提供可理解的錯誤資訊。



不得等到第一次 API Request 才發現：



> Database Configuration 缺失。



目的：



> 將 Configuration Error 提前發現。



\---



\# 29. Git Ignore



正式建立 `.gitignore`。



至少排除：



```text

node\_modules/

.env

.env.\*

!.env.example

.next/

coverage/

logs/

```



實際 Ignore List 可以依 Framework / Tooling 產生的必要檔案調整。



核心原則：



> Secret、Dependency、Build Output、Test Output 不進 Git。



\---



\# 30. Git Branch Baseline



第一版採簡單 Git Branch Model：



```text

main

feature/\*

```



不建立大型 Git Flow。



目的：



> 足夠支援 MVP 開發與變更追蹤即可。



\---



\# 31. Database Project



建立：



```text

database/

├─ migrations/

└─ seeds/

```



Database 工程資產與 Backend Application Code 分開管理。



Database Project 不使用 ORM。



\---



\# 32. Database Migration



必須建立固定 Migration 執行方式。



例如：



```text

npm run db:migrate

```



Migration 必須：



\- 可重複管理

\- 有固定順序

\- 可追蹤

\- 可在新環境建立 Database Structure



不得要求開發者依記憶手動執行一長串 SQL。



\---



\# 33. Database Seed



必須建立固定 Seed 執行方式。



例如：



```text

npm run db:seed

```



Seed 主要服務：



\- Development

\- Testing / Controlled Test Setup



Production 不得任意執行 Development / Test Seed。



\---



\# 34. Database Reset



建立 Development / Test Database Reset 能力。



概念：



```text

Reset

&#x20; ↓

Drop / Recreate

&#x20; ↓

Migration

&#x20; ↓

Seed

```



例如：



```text

npm run db:reset

```



Database Reset：



> 只允許 Development / Test Environment 使用。



Production 必須禁止。



\---



\# 35. Development / Test Database Isolation



Development 與 Test 使用不同 Database Name。



例如：



```text

Development

psop\_dev



Test

psop\_test

```



實際 Database Name 可依實作決定，但：



> Development 與 Test 必須邏輯隔離。



目的：



> 防止 Test 操作 Development Data。



\---



\# 36. Testing Project



Testing 維持獨立 Project：



```text

testing/

```



使用：



```text

Jest

Supertest

```



Testing 不直接依賴 Production Environment。



Testing 必須使用 Test Environment / Test Database。



\---



\# 37. Test Database



Integration Test 必須使用可控的 Test Database。



Test 執行前，應具備：



> 可預期、可控制、可重建的 Database 狀態。



避免：



> 上一次測試留下的資料影響下一次測試。



\---



\# 38. Standard npm Scripts



\## Backend



至少提供：



```text

npm run dev

npm run start

npm test

```



實際 Script 實作依工程建立時決定。



\---



\## Frontend



至少提供：



```text

npm run dev

npm run build

npm run start

```



\---



\## Testing



至少提供：



```text

npm test

```



\---



\# 39. Development Port Policy



第一版固定：



```text

Frontend

3000



Backend

3001

```



目的：



> 讓 Development Environment 有明確且一致的 Port Boundary。



如果未來需要修改，必須同步更新 Environment Configuration 與相關文件。



\---



\# 40. API Health Check



MVP Foundation 建立：



```text

GET /api/v1/health

```



用途：



> 確認 Express API Server 是否正常運作。



第一版不建立完整 Monitoring System。



也不建立大型 Health Monitoring Framework。



\---



\# 41. Database Connection Test



必須有基本 Database Connection Test。



至少確認：



```text

Backend

&#x20;  ↓

mysql2

&#x20;  ↓

MySQL

```



可以正常建立 Database Connection。



Database Connection Test 與 API Health Check 是不同責任。



\---



\# 42. API Health 與 Database Health Boundary



第一版：



```text

/api/v1/health

```



只負責基本 API Health。



Database Connection 則透過：



\- Bootstrap Verification

\- Database Connection Test

\- Testing



進行驗證。



第一版不建立：



```text

完整 Monitoring

Metrics

Alerting

Distributed Health System

```



\---



\# 43. Bootstrap Check



建立統一的：



```text

npm run check

```



作為 Development Foundation 的基本驗證入口。



目的：



> 讓開發者可以透過單一入口快速確認環境是否基本正常。



\---



\# 44. Bootstrap Verification Scope



`npm run check` 的驗證範圍至少包括：



```text

Environment

&#x20;     ↓

Database Connection

&#x20;     ↓

Migration State

&#x20;     ↓

Basic Test

```



實際 Script 如何拆分，可在工程實作階段決定。



\---



\# 45. Clean Bootstrap



新 Development Environment 必須具備以下基本重建流程：



```text

Install Dependencies

&#x20;       ↓

Configure Environment

&#x20;       ↓

Create Database

&#x20;       ↓

Run Migration

&#x20;       ↓

Run Seed

&#x20;       ↓

Start Backend

&#x20;       ↓

Start Frontend

&#x20;       ↓

Run Test

&#x20;       ↓

Run Check

```



目標：



> 專案可以從乾淨環境重新建立。



\---



\# 46. Frontend → Backend Integration



Foundation PASS 不只要求 Frontend 與 Backend 可以各自啟動。



必須確認：



```text

Browser

&#x20;  ↓

Next.js

&#x20;  ↓

Frontend API Layer

&#x20;  ↓

Express.js

&#x20;  ↓

GET /api/v1/health

&#x20;  ↓

Response

```



至少完成一次真正的 Frontend → Backend API Integration。



\---



\# 47. PHASE 8 Scope Boundary



PHASE 8 只建立：



> Development Foundation。



PHASE 8 不開始正式 Business Block Development。



以下不屬於 PHASE 8：



\- Customer

\- Pet

\- Service

\- Appointment

\- Daily Operations

\- Grooming

\- Boarding

\- Order

\- Payment

\- Product

\- Report

\- 其他 Business Block 的正式功能



\---



\# 48. Business Block Development Boundary



Foundation PASS 後，才開始第一個 Business Block。



後續遵守：



```text

Block

↓

Requirement

↓

Discussion

↓

Responsibility Definition

↓

Interface Definition

↓

Dependency Confirmation

↓

Block Design Freeze

↓

Development

↓

Testing

↓

Operational Verification

↓

PASS

↓

Block Freeze

↓

Integration

```



PHASE 8 不跳過此流程。



\---



\# 49. Foundation PASS Definition of Done



PHASE 8 必須至少完成：



```text

Frontend

PASS



Backend

PASS



Database

PASS



Migration

PASS



Seed

PASS



Testing

PASS



API Health

PASS



Frontend → Backend Integration

PASS

```



全部通過後：



> \*\*FOUNDATION PASS\*\*



\---



\# 50. PHASE 8 Definition of Done



PHASE 8 完成條件如下：



| Item | Requirement |

|---|---|

| Project Structure | PASS |

| Frontend Structure | PASS |

| Backend Structure | PASS |

| Database Structure | PASS |

| Testing Structure | PASS |

| Environment Configuration | PASS |

| Environment Validation | PASS |

| Dependency Baseline | PASS |

| Node.js Version Policy | PASS |

| Git Baseline | PASS |

| Lock Files | PASS |

| Database Migration | PASS |

| Database Seed | PASS |

| Database Reset | PASS |

| Test Database Isolation | PASS |

| Database Connection Test | PASS |

| API Health Check | PASS |

| Frontend → Backend Integration | PASS |

| Bootstrap Check | PASS |

| Clean Bootstrap | PASS |

| Foundation PASS | PASS |



\---



\# 51. PHASE 8 不允許的工程擴張



除非正式提出 Change Request，PHASE 8 不得自行加入：



\- ORM

\- Microservices

\- Kubernetes

\- Docker Orchestration

\- Enterprise Service Bus

\- Message Queue

\- Redis

\- Elasticsearch

\- Complex CI/CD Platform

\- Enterprise Monitoring

\- Enterprise IAM

\- Complex RBAC

\- Distributed Tracing

\- Event-driven Architecture

\- Service Mesh

\- 其他與 MVP Foundation 無直接必要關係的 Enterprise Infrastructure



這些並非永久禁止。



只是：



> 不屬於目前 MVP Foundation 的必要範圍。



\---



\# 52. PHASE 8 與 MVP 原則



PHASE 8 必須持續遵守：



> \*\*用最少但足夠的工程能力，建立可以開始開發 MVP 的地基。\*\*



工程結構必須服務 Business。



不得反過來讓：



> 工程結構主導 Business Design。



\---



\# 53. PHASE 8 最終架構概念



```text

&#x20;                        PSOP MVP

&#x20;                           │

&#x20;             ┌─────────────┴─────────────┐

&#x20;             │                           │

&#x20;         Frontend                    Backend

&#x20;             │                           │

&#x20;       Next.js + JS                Express.js + JS

&#x20;             │                           │

&#x20;         Bootstrap                 API / Business Logic

&#x20;             │                           │

&#x20;             │                     Data Access

&#x20;             │                           │

&#x20;             │                        mysql2

&#x20;             │                           │

&#x20;             └──────────── API ──────────┘

&#x20;                                         │

&#x20;                                       MySQL



Testing

&#x20;  │

Jest + Supertest

&#x20;  │

Test Database

```



\---



\# 54. PHASE 8 Freeze 決策總結



PHASE 8 正式 Freeze 以下事項：



1\. Project 使用 Frontend / Backend / Database / Testing 分離結構。

2\. Backend 使用 `src/`。

3\. Frontend 使用 `src/`。

4\. Backend `app.js` 與 `server.js` 分離。

5\. Backend 建立 `config/`。

6\. Database Connection 集中於 `database/`。

7\. 使用 `mysql2` Connection Pool。

8\. 建立共用 Middleware。

9\. 建立 Global Error Handler。

10\. 建立簡單共用 Request Validation。

11\. 建立集中式 API Route Registry。

12\. 建立受限制的 `shared/`。

13\. 暫時不建立獨立 `constants/`。

14\. Frontend 建立 API Layer。

15\. Frontend 建立真正共用的 Components。

16\. 不建立大型 Design System。

17\. 各 Project 各自管理 `package.json`。

18\. Root 不建立 `package.json`。

19\. 只安裝目前真正需要的 Dependencies。

20\. 固定 Node.js Version Policy。

21\. Lock Files 納入 Git。

22\. 建立 `.gitignore`。

23\. 建立 `.env.example`。

24\. 真實 Secret 不進 Git。

25\. Environment 啟動時進行必要設定驗證。

26\. Development / Test Database 分離。

27\. 建立 Migration。

28\. 建立 Seed。

29\. 建立 Development / Test Database Reset。

30\. Production 禁止使用 Development / Test Seed。

31\. Testing 使用獨立 Test Database。

32\. Backend 建立標準 npm Scripts。

33\. Frontend 建立標準 npm Scripts。

34\. Testing 建立獨立 `npm test`。

35\. Frontend Port 固定為 `3000`。

36\. Backend Port 固定為 `3001`。

37\. 建立 `/api/v1/health`。

38\. 建立 Database Connection Test。

39\. 建立 `npm run check`。

40\. 建立 Clean Bootstrap 流程。

41\. Bootstrap 必須驗證 Frontend → Backend Integration。

42\. 建立正式 Foundation PASS。

43\. PHASE 8 不開發 Business Block。

44\. Foundation PASS 後才進入第一個 Business Block。



\---



\# 55. PHASE 8 Freeze Status



\*\*PHASE:\*\* 08  

\*\*Status:\*\* FREEZE  

\*\*Version:\*\* v1.0  

\*\*Freeze Date:\*\* 2026-08-16



本文件正式確認：



> \*\*PHASE 8 — Development Foundation \& Project Bootstrap 已完成並 Freeze。\*\*



後續工程實作必須以本文件及 PHASE 1～PHASE 7 已 Freeze 文件為基準。



任何需要改變本文件 Freeze 決策的事項，必須依既定 Change Request 流程處理。



\---



\# END OF PHASE 8

