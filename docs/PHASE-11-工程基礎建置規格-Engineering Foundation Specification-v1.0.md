\# PHASE-11 — 工程基礎建置規格

\## Engineering Foundation Specification



\*\*Document ID:\*\* PHASE-11  

\*\*Document Name:\*\* 工程基礎建置規格 — Engineering Foundation Specification  

\*\*Version:\*\* v1.0  

\*\*Status:\*\* FREEZE  

\*\*Freeze Date:\*\* 2026-08-16



\---



\# 1. 文件目的



本文件定義 MVP 正式進入工程建置前所需的最小工程 Foundation。



本 Phase 的目的不是重新設計 MVP，而是將前面已 Freeze 的：



\- MVP Product Definition

\- Business Workflow

\- MVP Scope

\- MVP Block Map

\- MVP Block Design

\- MVP Architecture

\- Engineering / Development Decisions

\- Development Foundation

\- MVP Block Development Strategy

\- MVP Implementation Planning



轉換成：



> 可以直接開始建立專案的工程基礎規格。



\---



\# 2. 前置 Freeze



本 Phase 建立於：



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

&#x20;       ↓

PHASE 10

MVP Implementation Planning

&#x20;       ↓

PHASE 11

Engineering Foundation Specification

```



PHASE 1～PHASE 10 均維持原 Freeze 狀態。



\---



\# 3. PHASE 11 定位



PHASE 11 的核心問題：



> 真正開始建立 MVP 專案時，第一步需要建立什麼，以及如何確認工程基礎已經可以開始正式開發？



因此本 Phase 聚焦於：



1\. Project Root Structure

2\. Frontend Initialization

3\. Backend Initialization

4\. Database Initialization

5\. Testing Initialization

6\. Node.js / npm 基線

7\. Environment Configuration

8\. Database Connection

9\. Development / Test Environment

10\. Basic Backend Server

11\. API Foundation

12\. Health Check

13\. Testing Bootstrap

14\. Git Foundation

15\. Foundation Verification

16\. Foundation Definition of Done



\---



\# 4. PHASE 11 明確不處理



PHASE 11 不建立任何正式 Business Block 的完整功能。



以下不屬於本 Phase：



\- Customer Schema

\- Pet Schema

\- Service Schema

\- Appointment Schema

\- 完整 Customer API

\- 完整 Pet API

\- 完整 Service API

\- 完整 Appointment API

\- 完整 UI

\- Grooming

\- Boarding

\- Order

\- Payment

\- Product

\- Report



上述能力依照後續 Block Development Roadmap 建置。



\---



\# 5. 技術基線



既有技術基線維持：



| Layer | Technology |

|---|---|

| Frontend | Next.js |

| Frontend Language | JavaScript |

| UI Framework | Bootstrap |

| Backend | Express.js |

| Backend Language | JavaScript |

| Database | MySQL |

| Database Driver | mysql2 |

| Testing | Jest |

| API Testing | Supertest |

| ORM | 不使用 |



不得因 PHASE 11 工程實作便利而修改上述技術基線。



\---



\# 6. Overall Foundation Architecture



Foundation 維持：



```text

Browser

&#x20;   ↓

Next.js

&#x20;   ↓

HTTP / JSON

&#x20;   ↓

Express.js API

&#x20;   ↓

Business Logic

&#x20;   ↓

Data Access

&#x20;   ↓

mysql2

&#x20;   ↓

MySQL

```



Testing：



```text

Jest

\+

Supertest

&#x20;   ↓

Test Database

```



\---



\# 7. Project Root Structure



MVP 專案 Root 採用四個主要工程區域：



```text

PSOP/

├── frontend/

├── backend/

├── database/

└── testing/

```



責任：



| Directory | Responsibility |

|---|---|

| `frontend/` | Next.js Frontend |

| `backend/` | Express.js Backend |

| `database/` | Database Schema / Migration / Seed |

| `testing/` | 專案測試相關資產 |



不建立大型 Enterprise Monorepo 結構。



不因未來可能的需求提前增加大量工程層級。



\---



\# 8. Project Responsibility Boundary



各區域維持明確責任：



```text

frontend/

&#x20;   ↓

User Interface



backend/

&#x20;   ↓

API + Business Logic + Data Access



database/

&#x20;   ↓

Database Structure + Migration + Seed



testing/

&#x20;   ↓

Testing Support / Integration Verification

```



不得因方便而讓不同區域互相接管核心責任。



\---



\# 9. Package Management



Frontend 與 Backend 各自維護自己的 Node.js Project。



概念：



```text

frontend/

└── package.json



backend/

└── package.json

```



Testing 若需要獨立執行環境，維護自己的：



```text

testing/

└── package.json

```



Database 若僅由 SQL Migration / Seed 組成，不強制建立獨立 npm Project。



\---



\# 10. Frontend Foundation



Frontend 使用：



```text

Next.js

\+

JavaScript

\+

Bootstrap

```



採用 Next.js 標準、簡單、容易理解的專案結構。



不建立：



\- 複雜 Frontend Framework

\- Enterprise Design System

\- 複雜 State Management Architecture

\- 大型 UI Abstraction Layer



除非後續實際需求證明必要。



\---



\# 11. Backend Foundation



Backend 使用：



```text

Express.js

\+

JavaScript

```



採用簡單分層：



```text

backend/

└── src/

&#x20;   ├── routes/

&#x20;   ├── controllers/

&#x20;   ├── services/

&#x20;   ├── data-access/

&#x20;   └── ...

```



核心責任：



```text

Route

&#x20;   ↓

Controller

&#x20;   ↓

Business Logic

&#x20;   ↓

Data Access

&#x20;   ↓

mysql2

```



\---



\# 12. Application Entry Point



Backend 分離：



```text

app.js

```



與：



```text

server.js

```



責任。



概念：



```text

app.js

&#x20;   ↓

Express Application



server.js

&#x20;   ↓

HTTP Server

```



目的：



> 測試時可以直接載入 Express Application，而不需要每次測試都啟動實際 HTTP Server。



\---



\# 13. API Prefix



Backend API 統一使用：



```text

/api

```



未來 Business Block API 採：



```text

/api/customers

/api/pets

/api/services

/api/appointments

```



等形式。



不將 API Route 散落於沒有統一規則的 URL。



\---



\# 14. API Data Format



MVP 第一版 API 統一使用：



```text

application/json

```



Request 與 Response 以 JSON 為基本格式。



不提前建立檔案傳輸、GraphQL 或其他 API Format。



\---



\# 15. API Response Boundary



API Response 必須具備一致性。



成功與錯誤結果必須讓 Frontend 可以明確判斷。



概念：



```text

HTTP Status

\+

JSON Body

```



不要求第一版建立大型 Enterprise API Response Framework。



\---



\# 16. HTTP Status Code 基線



第一版採基本一致的 HTTP Status Code：



| Situation | Status |

|---|---:|

| 成功取得／修改 | 200 |

| 建立成功 | 201 |

| Request Validation Error | 400 |

| Resource Not Found | 404 |

| Business Conflict | 409 |

| Server Error | 500 |



後續若有特殊 Business Requirement，再依實際需求擴充。



\---



\# 17. Middleware Foundation



Express.js 建立最基本 Middleware。



至少包含：



\- JSON Body Parsing

\- CORS

\- Error Handling



概念：



```text

Request

&#x20;   ↓

Middleware

&#x20;   ↓

Route

&#x20;   ↓

Controller

```



不建立複雜 Middleware Framework。



\---



\# 18. Error Handling



Backend 建立統一 Error Handler。



概念：



```text

Route

&#x20;   ↓

Controller

&#x20;   ↓

Business Logic

&#x20;   ↓

Error

&#x20;   ↓

Central Error Handler

&#x20;   ↓

JSON Response

```



目的：



> 避免每個 API 各自建立不同的錯誤處理方式。



\---



\# 19. Validation Boundary



輸入驗證採雙層：



```text

User Input

&#x20;   ↓

Frontend Validation

&#x20;   ↓

Backend Validation

&#x20;   ↓

Business Logic

```



Frontend Validation：



> 改善使用者操作體驗。



Backend Validation：



> 作為最終可信任的輸入驗證。



不得將 Backend Business Rule 完全建立在 Frontend Validation 上。



\---



\# 20. Data Access Boundary



Data Access 是正式 Database Access 邊界。



維持：



```text

Business Logic

&#x20;   ↓

Data Access

&#x20;   ↓

mysql2

&#x20;   ↓

MySQL

```



Controller 不直接操作 Database。



\---



\# 21. Controller Boundary



Controller 負責：



\- 接收 HTTP Request

\- 基本輸入處理

\- 呼叫 Business Logic

\- 組合 HTTP Response



Controller 不直接撰寫 SQL。



不得讓 Controller 承擔大量 Business Logic。



\---



\# 22. Business Logic Boundary



Business Logic 負責：



> 正式 Business Rule 的執行。



概念：



```text

Controller

&#x20;   ↓

Business Logic

&#x20;   ↓

Data Access

```



Business Logic 不應被 Frontend 的操作方式綁死。



\---



\# 23. Database Driver



Database Driver 使用：



> `mysql2`



採用：



> `mysql2/promise`



以支援：



```text

async / await

```



並維持與 Express.js 非同步流程一致。



\---



\# 24. Database Connection Pool



Backend 建立單一共用 MySQL Connection Pool。



概念：



```text

Express

&#x20;   ↓

Data Access

&#x20;   ↓

MySQL Connection Pool

&#x20;   ↓

MySQL

```



不讓每一次 Query 都重新建立 Database Connection。



\---



\# 25. SQL Query Boundary



SQL Query 由 Data Access Layer 管理。



不得將 SQL 散落於：



\- Controller

\- Frontend

\- UI Component

\- Route



等非 Database Access 層。



\---



\# 26. Parameterized Query



所有使用使用者輸入的 SQL Query 必須採：



> Parameterized Query。



概念：



```text

SELECT \*

FROM customers

WHERE phone = ?

```



不得將使用者輸入直接串接進 SQL String。



目的：



> 防止基本 SQL Injection 風險。



\---



\# 27. ORM Policy



PHASE 11 維持：



> \*\*不使用 ORM。\*\*



因此不導入：



\- Prisma

\- Sequelize

\- TypeORM

\- Drizzle ORM

\- 其他 ORM



Database Access 直接採：



```text

Data Access

&#x20;   ↓

mysql2

&#x20;   ↓

MySQL

```



\---



\# 28. Database Project Structure



Database 至少建立：



```text

database/

├── migrations/

└── seeds/

```



兩者責任必須分離。



\---



\# 29. Migration Responsibility



Migration 負責：



> Database Schema 的建立與變更。



例如：



```text

database/

└── migrations/

&#x20;   ├── 001\_\*.sql

&#x20;   ├── 002\_\*.sql

&#x20;   └── 003\_\*.sql

```



Migration 必須具備：



\- 可追蹤

\- 可排序

\- 可重建



等基本特性。



\---



\# 30. Migration Naming



Migration 採：



```text

編號 + 描述 + .sql

```



例如：



```text

001\_create\_customers.sql

002\_create\_pets.sql

003\_create\_services.sql

```



不使用無法判斷執行順序的任意檔名。



\---



\# 31. Seed Responsibility



Seed 負責：



> Development / Testing 所需要的基本資料。



例如：



```text

Test Customer

Test Pet

Test Service

```



Seed 不等於正式 Production Data。



不建立大量無實際用途的假資料。



\---



\# 32. Migration / Seed Separation



Migration 與 Seed 必須分開：



```text

database/

├── migrations/

└── seeds/

```



Migration：



> 定義資料結構。



Seed：



> 建立資料。



不得將兩者混為一談。



\---



\# 33. Environment Configuration



環境設定使用：



```text

.env

```



並提供：



```text

.env.example

```



`.env` 儲存實際本機設定。



`.env.example` 提供：



> 必要環境變數名稱與基本格式。



\---



\# 34. Environment Variables



Foundation 至少考慮：



```text

NODE\_ENV

PORT

DB\_HOST

DB\_PORT

DB\_NAME

DB\_USER

DB\_PASSWORD

```



Frontend API Base URL 使用對應的 Frontend Environment Variable。



實際命名以工程建置時統一。



\---



\# 35. Environment Security



以下不得進入 Git：



```text

.env

```



也不得將：



\- Database Password

\- Secret

\- Token

\- 個人環境設定



直接寫死於 Source Code。



\---



\# 36. Configuration Architecture



第一版不建立完整 Configuration Framework。



不建立：



\- Configuration Provider

\- Secret Manager

\- Enterprise Configuration Service

\- 複雜 Environment Schema Framework



維持：



```text

.env

&#x20;   ↓

Application Config

```



即可。



\---



\# 37. Development Environment



第一版本機 Development 採：



```text

Frontend

localhost:3000



Backend

localhost:3001



MySQL

localhost:3306

```



實際 Port 若因本機環境衝突而調整，必須同步更新相關設定。



\---



\# 38. Docker Policy



PHASE 11 第一版：



> \*\*不使用 Docker。\*\*



不建立：



\- Dockerfile

\- docker-compose

\- Container Architecture



除非後續因實際 Deployment 或 Environment Consistency 需求而提出 Change Request。



\---



\# 39. CORS Policy



Development 階段 CORS 只允許目前 Frontend Development Origin。



例如：



```text

http://localhost:3000

```



不直接採：



```text

Allow All Origins

```



正式 Production Origin 於後續 Deployment 階段再設定。



\---



\# 40. Health Check



Backend 必須提供：



```text

GET /health

```



作為 Foundation Health Check。



最基本用途：



> 確認 API Server 正常運作。



必要時同時確認：



> Database Connection 正常。



\---



\# 41. Health Check Responsibility



Health Check 屬於：



> Engineering Foundation。



不是新的 Business Block。



不應因 Health Check 建立新的 Business Data。



\---



\# 42. Logging



Backend 建立最基本 Application Logging。



至少能辨識：



```text

Server Started

Database Connected

Request Error

Application Error

```



Logging 的目標：



> 開發與除錯。



\---



\# 43. Logging Technology



第一版直接使用 Node.js 基本：



```text

console.log()

console.error()

```



不提前導入：



\- Winston

\- Pino

\- ELK

\- Cloud Logging Platform

\- Distributed Logging System



除非後續實際需求證明必要。



\---



\# 44. Testing Architecture



Testing 基線：



```text

Jest

\+

Supertest

\+

Test Database

```



主要驗證：



```text

HTTP Request

&#x20;   ↓

Routing

&#x20;   ↓

Controller

&#x20;   ↓

Business Logic

&#x20;   ↓

Data Access

&#x20;   ↓

MySQL

```



\---



\# 45. Test Database



Testing 不使用 Development Database。



維持：



```text

Development Database

&#x20;       ≠

Test Database

```



Test Database 用於：



\- Integration Test

\- API Test

\- Database-related Test



\---



\# 46. Test Isolation



每個 Test Case 應盡量能獨立執行。



禁止建立：



```text

Test A

&#x20;   ↓

Test B

&#x20;   ↓

Test C

```



這種強依賴關係。



Test 的執行結果不應依賴其他 Test 的執行順序。



\---



\# 47. Test Data Cleanup



Test Database 不應長期累積前一次 Test 的資料。



測試流程應具備：



```text

Prepare

&#x20;   ↓

Test

&#x20;   ↓

Cleanup / Reset

```



或在測試執行前重新建立必要資料。



目的：



> 避免測試資料污染造成不穩定結果。



\---



\# 48. Foundation Automated Test



Foundation 本身至少建立一個真正會執行的 Automated Test。



例如：



```text

GET /health

&#x20;   ↓

Supertest

&#x20;   ↓

Expect HTTP 200

&#x20;   ↓

PASS

```



目的：



> 在 Business Block 開發前確認 Testing Infrastructure 本身可用。



\---



\# 49. Test Setup



Testing 必須具備基本 Setup。



概念：



```text

testing/

├── unit/

├── integration/

└── setup/

```



實際目錄可依工程實作微調，但不得破壞 Testing Responsibility Boundary。



\---



\# 50. npm Scripts



常用操作建立 npm Scripts。



至少提供：



```text

npm run dev

npm test

npm run migrate

npm run seed

```



實際 Scripts 可依 Frontend、Backend、Testing 的不同責任分開定義。



目的：



> 讓常用操作可以透過簡單、固定的指令執行。



\---



\# 51. Development Start



Frontend：



```text

npm run dev

```



Backend：



```text

npm run dev

```



Database：



> MySQL 正常啟動即可。



不要求額外 Container 或 Infrastructure 才能啟動 MVP Development Environment。



\---



\# 52. Git Foundation



Foundation 階段建立：



```text

git init

```



並建立：



```text

.gitignore

```



至少排除：



```text

node\_modules/

.env

```



其他暫存檔、Build Output 等依實際技術需求加入。



\---



\# 53. Git Responsibility



Git 用於：



> 保留工程變更紀錄。



是否使用 GitHub 或其他 Remote Repository：



> 不屬於 PHASE 11 的必要條件。



本 Phase 只要求：



> Local Git Repository 可正常建立與使用。



\---



\# 54. Foundation Verification



Foundation 建置完成後必須逐項驗證：



| Verification Item | Requirement |

|---|---|

| Frontend Start | PASS |

| Backend Start | PASS |

| MySQL Connection | PASS |

| Migration | PASS |

| Seed | PASS |

| API | PASS |

| Health Check | PASS |

| Jest | PASS |

| Supertest | PASS |

| Test Database | PASS |

| Git | PASS |



\---



\# 55. Foundation PASS



只有全部必要項目通過，才能宣布：



> \*\*FOUNDATION PASS\*\*



概念：



```text

Frontend Start

&#x20;       +

Backend Start

&#x20;       +

MySQL Connection

&#x20;       +

Migration

&#x20;       +

Seed

&#x20;       +

API

&#x20;       +

Health Check

&#x20;       +

Jest

&#x20;       +

Supertest

&#x20;       +

Test Database

&#x20;       +

Git

&#x20;       ↓

FOUNDATION PASS

```



\---



\# 56. Foundation PASS 後的下一步



Foundation PASS 後：



> 不再繼續建立 Foundation 功能。



立即進入第一個正式 Business Block：



> \*\*Customer Block\*\*



流程：



```text

Foundation Specification

&#x20;       ↓

Foundation Implementation

&#x20;       ↓

Foundation Verification

&#x20;       ↓

FOUNDATION PASS

&#x20;       ↓

Customer Block Development

```



\---



\# 57. Customer Block 的前置條件



Customer Block 必須等待 Foundation PASS。



不得在 Foundation 尚未穩定前大量建立 Customer Business Logic。



Customer 是後續第一個正式 Business Block。



\---



\# 58. PHASE 11 與 Customer 的邊界



PHASE 11 可以建立：



\- 基本 Server

\- 基本 API Framework

\- Database Connection

\- Migration Framework

\- Seed Framework

\- Testing Framework

\- Health Check



但不得在 PHASE 11 偷渡：



\- Customer CRUD

\- Customer Business Rule

\- Customer API

\- Customer UI

\- Customer Schema



Customer 將於下一個工程建置階段正式處理。



\---



\# 59. Foundation Definition of Done



PHASE 11 Foundation 必須具備：



```text

□ Project Root 建立

□ Frontend 可初始化

□ Backend 可初始化

□ Database 區域建立

□ Testing 區域建立

□ npm 基線建立

□ Environment 設定建立

□ .env.example 建立

□ MySQL 可連線

□ mysql2 可正常工作

□ Migration 可執行

□ Seed 可執行

□ Express Server 可啟動

□ /health 可正常回應

□ API JSON 可正常工作

□ CORS 可正常工作

□ Error Handler 可正常工作

□ Jest 可執行

□ Supertest 可執行

□ Test Database 可使用

□ Test 可隔離

□ Git Repository 建立

□ .gitignore 建立

□ Foundation Verification 全部 PASS

```



\---



\# 60. PHASE 11 Freeze Decisions



PHASE 11 正式 Freeze 以下決策：



1\. MVP 採四個主要工程區域：

&#x20;  - `frontend/`

&#x20;  - `backend/`

&#x20;  - `database/`

&#x20;  - `testing/`



2\. Frontend 與 Backend 各自維護自己的 Node.js Project。



3\. Frontend 使用 Next.js + JavaScript + Bootstrap。



4\. Backend 使用 Express.js + JavaScript。



5\. Backend 採簡單分層：

&#x20;  - Routes

&#x20;  - Controllers

&#x20;  - Business Logic

&#x20;  - Data Access



6\. Backend 分離 `app.js` 與 `server.js`。



7\. API 統一使用 `/api` Prefix。



8\. API 第一版使用 JSON。



9\. Backend 建立基本 Middleware。



10\. Backend 建立統一 Error Handler。



11\. Frontend 與 Backend 均進行 Validation。



12\. Backend Validation 為最終可信任的輸入驗證。



13\. Data Access 是正式 Database Access 邊界。



14\. Controller 不直接撰寫 SQL。



15\. Business Logic 負責正式 Business Rule。



16\. Database Driver 使用 mysql2。



17\. 使用 `mysql2/promise`。



18\. Database 使用 Connection Pool。



19\. SQL 使用 Parameterized Query。



20\. 不使用 ORM。



21\. Database 建立 `migrations/`。



22\. Database 建立 `seeds/`。



23\. Migration 與 Seed 分離。



24\. Migration 使用編號 + SQL 檔案。



25\. Development Database 與 Test Database 分離。



26\. Test Database 不使用 Development Database。



27\. Environment 使用 `.env`。



28\. 提供 `.env.example`。



29\. `.env` 不進 Git。



30\. 不建立複雜 Configuration Framework。



31\. Development 第一版使用 localhost。



32\. 第一版不使用 Docker。



33\. CORS 不採 Allow All Origins。



34\. Backend 建立 `GET /health`。



35\. Health Check 屬於 Foundation，不是 Business Block。



36\. 建立基本 Application Logging。



37\. 第一版 Logging 使用 `console.log()` / `console.error()`。



38\. API 使用一致的基本 HTTP Status Code。



39\. Testing 使用 Jest + Supertest。



40\. Foundation 本身必須至少有一個 Automated Test。



41\. Test Case 必須盡可能獨立。



42\. Test Database 必須避免前次測試資料污染。



43\. 建立基本 Testing Setup。



44\. 建立必要 npm Scripts。



45\. 建立 Local Git Repository。



46\. 建立 `.gitignore`。



47\. Foundation 必須通過完整 Verification Checklist。



48\. Foundation 全部通過後才能開始 Customer Block。



49\. 不因 Foundation 建置而新增 Business Block。



50\. 不因工程便利而推翻 PHASE 1～PHASE 10 Freeze。



\---



\# 61. PHASE 11 Review Result



PHASE 11 已完成：



```text

Q1～Q10

&#x20;   ↓

PROVISIONAL



Q11～Q20

&#x20;   ↓

PROVISIONAL



Q21～Q30

&#x20;   ↓

PROVISIONAL



Q31～Q40

&#x20;   ↓

PROVISIONAL



Phase Review

&#x20;   ↓

PASS



User Confirmation

&#x20;   ↓

FREEZE

```



\---



\# 62. PHASE 11 Final Status



\*\*PHASE-11 — Engineering Foundation Specification\*\*



\*\*Version:\*\* v1.0



\*\*Status:\*\* FREEZE



\*\*Freeze Date:\*\* 2026-08-16



PHASE 11 至此正式完成。



目前專案進度：



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

```



下一個工程目標：



```text

PHASE 11

Engineering Foundation Specification

&#x20;       ↓

Foundation Implementation

&#x20;       ↓

Foundation Verification

&#x20;       ↓

FOUNDATION PASS

&#x20;       ↓

Customer Block Development

```



PHASE 11 Freeze 後，不得自行修改本文件中的工程 Foundation 決策。



如後續發現真正的技術問題，必須依既有 Change Request 規則處理。



\# END OF PHASE 11

