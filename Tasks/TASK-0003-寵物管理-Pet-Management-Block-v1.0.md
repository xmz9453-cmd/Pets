\# TASK-0003-寵物管理-Pet-Management-Block-v1.0



\*\*Document Type:\*\* Engineering Task Specification  

\*\*Task ID:\*\* TASK-0003  

\*\*Task Name:\*\* 寵物管理區塊 (Pet Management Block)  

\*\*Version:\*\* v1.0  

\*\*Status:\*\* FROZEN  

\*\*Project:\*\* MVP — Pet Shop Operations System  

\*\*Language:\*\* 繁體中文（Traditional Chinese）  

\*\*Owner:\*\* Project Owner  

\*\*Implementation Mode:\*\* AI-Assisted Development  

\*\*Development Method:\*\* Block-Based Development  

\*\*Previous Task:\*\* TASK-0002  

\*\*Next Task:\*\* Not Defined  



\---



\# 1. Task Overview（任務概述）



\## 1.1 Purpose（目的）



TASK-0003 的目的，是在已完成的 MVP Engineering Foundation 與 Staff / Authentication Foundation 之上，正式完成第一個 Business Block：



> \*\*Pet Management Block（寵物管理區塊）\*\*



Pet 是本 MVP 實際服務流程的核心業務物件。



本 Task 必須建立一個可以被後續：



\- Appointment

\- Daily Operations

\- Grooming

\- Boarding

\- Order

\- Report



等 Block 正式使用的 Pet Master Data。



本 Task 必須一次完成：



\- Database

\- Migration

\- Repository / Data Access

\- Business Logic

\- Validation

\- API

\- Authentication / Authorization Boundary

\- Frontend

\- Tests

\- Verification



完成後，Pet Block 正式進入：



> \*\*PASS → FREEZE\*\*



\---



\# 2. Task Scope（任務範圍）



\## 2.1 In Scope（包含範圍）



本 Task 包含：



1\. Pet Master Data

2\. Pet Identity

3\. Pet Profile

4\. Customer ↔ Pet Relationship

5\. Primary Customer

6\. Pet Active / Inactive Lifecycle

7\. Pet CRUD-like management excluding hard delete

8\. Pet Search

9\. Pet Filtering

10\. Pet Detail

11\. Pet Create

12\. Pet Edit

13\. Pet Activate

14\. Pet Deactivate

15\. Customer Relationship Management

16\. Primary Customer Management

17\. Pet Validation

18\. Pet API

19\. Pet Frontend

20\. Authentication / Permission enforcement

21\. Automated Tests

22\. Integration Verification

23\. Frontend Verification

24\. Database Verification



\---



\## 2.2 Out of Scope（不包含範圍）



本 Task 不包含：



\- Customer Block 本身的完整實作

\- Appointment Management

\- Daily Operations

\- Grooming

\- Boarding

\- Order

\- Payment

\- Product

\- Report

\- LINE API

\- Online Booking

\- Image Upload Service

\- Cloud File Storage

\- Notification Service

\- Advanced Audit Platform

\- Enterprise RBAC

\- Multi-Tenant Architecture

\- Full-text Search Infrastructure

\- Elasticsearch

\- Redis

\- Background Job System

\- Event Sourcing

\- CQRS

\- GraphQL

\- ORM migration

\- TypeScript migration

\- Tailwind

\- Prisma

\- Hard Delete of Pet



不得因本 Task 自行增加上述功能。



\---



\# 3. Technical Baseline（技術基準）



本 Task 必須遵守目前 MVP 已 Freeze 的技術基準。



\## 3.1 Frontend



\- Next.js

\- Pages Router

\- JavaScript

\- Bootstrap



禁止：



\- TypeScript

\- `.ts`

\- `.tsx`

\- `tsconfig.json`

\- Tailwind



\---



\## 3.2 Backend



\- Express.js

\- JavaScript



\---



\## 3.3 Database



\- MySQL

\- mysql2



本 MVP 不使用 Prisma。



不得因本 Task 引入 Prisma 或其他 ORM。



\---



\## 3.4 Testing



\- Jest

\- Supertest



\---



\## 3.5 Package Manager



\- npm



\---



\## 3.6 Version Control



\- Git



\---



\# 4. Reference Documents（參考文件）



Implementation 前必須閱讀目前 MVP 已 Freeze 且與本 Task 相關的正式文件。



至少包括：



\- MVP Master Baseline

\- PHASE-01 MVP Product Definition

\- PHASE-07 MVP Engineering Design and Development Rules

\- PHASE-08 Staff / Authentication 相關 Freeze 規格

\- PHASE-11 Engineering Foundation Specification

\- PHASE-12 Foundation Implementation and Verification

\- PHASE-13 Development / Engineering Baseline

\- PHASE-14 Pet Block Definition and Implementation Specification

\- 已完成並 Freeze 的 Customer Block 規格

\- `TASK-0001`

\- `TASK-0002`

\- `TASK-CODING-AI-EXECUTION-PROMPT-v1.0.md`



如果實際 repository 中的正式文件名稱與上述名稱不同，必須以目前 repository 實際存在且已 Freeze 的 MVP 文件為準。



不得引用舊 PSOP 專案文件作為本 Task 的規格來源。



\---



\# 5. Project Boundary（專案邊界）



本 Task 屬於：



> \*\*MVP — Pet Shop Operations System\*\*



不是舊版 PSOP 專案。



Implementation 時不得：



\- 引入舊 PSOP Schema

\- 引入舊 PSOP Prisma Model

\- 引入舊 PSOP Architecture

\- 引入舊 PSOP Database Design

\- 引入舊 PSOP TASK

\- 引入舊 PSOP Technology Stack



如果發現目前 repository 內容與 MVP Freeze 不一致：



> 必須停止相關工作並回報。



不得自行以舊專案內容補足。



\---



\# 6. Pet Domain Definition（Pet 領域定義）



\## 6.1 Pet 定義



Pet 是：



> MVP 系統中的實際服務對象。



Customer 是聯絡與關係對象。



Pet 是後續服務流程的核心 Master Data。



\---



\## 6.2 Pet Identity



Pet 不得以名稱作為唯一識別。



每一隻 Pet 必須具有：



\- `id`



作為系統唯一識別。



Pet Name 僅為顯示名稱。



\---



\## 6.3 Supported Species



MVP 第一版只支援：



\- `DOG`

\- `CAT`



不得建立：



\- `OTHER`

\- 自由 Species

\- Species Master Table



\---



\# 7. Pet Data Model（Pet 資料模型）



Pet 至少包含以下資料：



| Field | Type | Required | Rule |

|---|---|---:|---|

| id | integer / system ID | Yes | Primary Key |

| name | string | Yes | 1–100 characters |

| species | enum | Yes | DOG / CAT |

| breed | string | No | MVP optional |

| gender | enum | Yes | MALE / FEMALE / UNKNOWN |

| birth\_date | date | No | Valid date |

| weight | decimal | No | > 0, ≤ 300 kg equivalent |

| weight\_unit | enum | No | KG / LB |

| chip\_number | string | No | Global UNIQUE |

| photo\_url | string | No | HTTP / HTTPS URL |

| notes | text | No | Maximum 1000 characters |

| special\_notes | text | No | Maximum 2000 characters |

| status | enum | Yes | ACTIVE / INACTIVE |

| created\_at | datetime | Yes | Server generated |

| updated\_at | datetime | Yes | Server managed |



\---



\# 8. Pet Status（Pet 狀態）



Pet Status：



\- `ACTIVE`

\- `INACTIVE`



\---



\## 8.1 ACTIVE



代表 Pet 為目前營運中的有效 Pet。



Active Pet：



\- 可以被正常查詢

\- 可以被建立新的 Appointment

\- 可以被後續 Business Blocks 使用



\---



\## 8.2 INACTIVE



代表 Pet 暫時不再作為目前營運中的服務對象。



Inactive Pet：



\- 不可建立新的 Appointment

\- 仍可查詢歷史資料

\- 仍可查看 Pet Detail

\- 可以重新 Activate



\---



\## 8.3 Lifecycle



Pet Lifecycle：



&#x20;   ACTIVE

&#x20;      ↓

&#x20;   INACTIVE

&#x20;      ↓

&#x20;   ACTIVE



不得透過 DELETE 實現 Lifecycle。



\---



\# 9. Pet Delete Policy（刪除規則）



Pet 不允許一般 Hard Delete。



MVP 使用：



&#x20;   ACTIVE

&#x20;      ↓

&#x20;   INACTIVE



代替直接刪除。



原因：



Pet 可能被後續：



\- Appointment

\- Grooming

\- Boarding

\- Order

\- Payment



引用。



重要歷史資料不得因 Master Data 停用而消失。



\---



\# 10. Customer Relationship（Customer 關聯）



Pet 可以與多個 Customer 建立關聯。



模型：



&#x20;   Customer

&#x20;      ↕

&#x20;     Pet



例如：



&#x20;   Pet

&#x20;    ├── Customer A

&#x20;    ├── Customer B

&#x20;    └── Customer C



\---



\## 10.1 Primary Customer



每一隻 Pet 必須有一名 Primary Customer。



Primary Customer：



> 該 Pet 的主要聯絡窗口。



\---



\## 10.2 Relationship Data



Customer Relationship 至少需要：



| Field | Rule |

|---|---|

| pet\_id | Required |

| customer\_id | Required |

| is\_primary | Boolean |

| created\_at | Server generated |



\---



\## 10.3 Duplicate Relationship



同一：



&#x20;   pet\_id + customer\_id



不得建立兩次。



Database 必須建立：



&#x20;   UNIQUE (pet\_id, customer\_id)



\---



\# 11. Primary Customer Rules（主要 Customer 規則）



\## 11.1 First Relationship



如果 Pet 尚無 Customer：



新增第一個 Customer Relationship 時：



&#x20;   is\_primary = true



系統自動將第一個 Customer 設為 Primary。



\---



\## 11.2 Maximum Primary



同一 Pet 最多只能有一個 Primary Customer。



\---



\## 11.3 Change Primary



設定新的 Primary Customer 時：



&#x20;   舊 Primary

&#x20;       ↓

&#x20;   false



&#x20;   新 Primary

&#x20;       ↓

&#x20;   true



此操作必須以 Database Transaction 保證資料一致性。



\---



\## 11.4 Remove Primary



Primary Customer 不得直接移除。



正確流程：



&#x20;   Existing Primary

&#x20;         ↓

&#x20;   Set another Primary

&#x20;         ↓

&#x20;   Remove old relationship



\---



\## 11.5 Relationship Removal



解除 Customer Relationship：



&#x20;   DELETE /api/pets/:petId/customers/:customerId



只代表：



> Pet ↔ Customer Relationship 被解除。



不代表：



\- Delete Pet

\- Delete Customer

\- Delete History



\---



\# 12. Pet Creation Transaction（Pet 建立 Transaction）



建立 Pet 時，如果同時建立第一個 Customer Relationship：



&#x20;   Create Pet

&#x20;       +

&#x20;   Create Primary Customer Relationship



必須視為同一個 Atomic Operation。



任一操作失敗：



> 整個操作必須 Rollback。



不得留下：



&#x20;   Pet exists

&#x20;   +

&#x20;   No Primary Customer



的非法中間狀態。



\---



\# 13. Customer Block Boundary（Customer Block 邊界）



Pet Block 可以：



\- Read Customer

\- Validate Customer existence

\- Create Pet ↔ Customer Relationship

\- Remove Pet ↔ Customer Relationship

\- Set Primary Customer



Pet Block 不可以直接修改 Customer Master Data。



例如 Pet API 不得直接修改：



\- Customer Name

\- Customer Phone

\- Customer Address

\- Customer Status



Customer Master Data 必須由 Customer Block 管理。



\---



\# 14. Pet Permissions（Pet 權限）



所有 Pet API 都需要 Authentication。



\---



\## 14.1 View Pet



以下角色可以查看 Pet：



\- OWNER

\- FRONT\_DESK

\- GROOMER



\---



\## 14.2 Create Pet



以下角色可以建立 Pet：



\- OWNER

\- FRONT\_DESK



\---



\## 14.3 Modify Pet



以下角色可以修改 Pet：



\- OWNER

\- FRONT\_DESK



\---



\## 14.4 Activate / Deactivate



以下角色可以管理 Pet Status：



\- OWNER

\- FRONT\_DESK



\---



\## 14.5 Groomer Boundary



GROOMER：



\- 可以查看 Pet

\- 不負責建立 Pet

\- 不負責修改 Pet Master Data

\- 不負責 Activate / Deactivate Pet



不得因 UI 方便而擴張 Groomer 權限。



\---



\# 15. Pet API Authentication（API 驗證）



所有 Pet API 必須經過目前 MVP Authentication。



Request flow：



&#x20;   Request

&#x20;      ↓

&#x20;   Authentication

&#x20;      ↓

&#x20;   Valid Session

&#x20;      ↓

&#x20;   Authorization

&#x20;      ↓

&#x20;   Pet API

&#x20;      ↓

&#x20;   Response



未登入：



&#x20;   401 Unauthorized



不得建立公開 Pet API。



\---



\# 16. Pet API Contract（API）



\## 16.1 List



&#x20;   GET /api/pets



支援：



\- search

\- species

\- status

\- customer\_id

\- chip\_number

\- pagination



預設：



&#x20;   status=ACTIVE



\---



\## 16.2 Detail



&#x20;   GET /api/pets/:id



回傳：



\- Pet 基本資料

\- Primary Customer

\- Other Customer Relationships



\---



\## 16.3 Create



&#x20;   POST /api/pets



至少接受：



\- name

\- species

\- gender

\- customer relationship

\- optional profile fields



建立 Pet 時必須有 Primary Customer。



\---



\## 16.4 Update



&#x20;   PATCH /api/pets/:id



可修改：



\- name

\- species

\- breed

\- gender

\- birth\_date

\- weight

\- weight\_unit

\- chip\_number

\- photo\_url

\- notes

\- special\_notes



不得由 Client 修改：



\- id

\- created\_at

\- updated\_at



\---



\## 16.5 Activate



&#x20;   PATCH /api/pets/:id/activate



只允許將：



&#x20;   INACTIVE → ACTIVE



\---



\## 16.6 Deactivate



&#x20;   PATCH /api/pets/:id/deactivate



只允許將：



&#x20;   ACTIVE → INACTIVE



\---



\# 17. Customer Relationship API（Customer Relationship API）



\## 17.1 List Relationships



&#x20;   GET /api/pets/:petId/customers



\---



\## 17.2 Add Relationship



&#x20;   POST /api/pets/:petId/customers



Request：



&#x20;   {

&#x20;     "customer\_id": 123,

&#x20;     "is\_primary": false

&#x20;   }



如果目前沒有 Primary：



&#x20;   is\_primary

&#x20;      ↓

&#x20;   true



\---



\## 17.3 Set Primary



&#x20;   PATCH /api/pets/:petId/customers/:customerId/primary



操作必須使用 Transaction。



\---



\## 17.4 Remove Relationship



&#x20;   DELETE /api/pets/:petId/customers/:customerId



如果目標 Relationship 是 Primary：



> 拒絕操作。



必須先建立新的 Primary。



\---



\# 18. Search and Filter（搜尋與篩選）



Pet List 必須支援：



\## 18.1 Name Search



可搜尋 Pet Name。



\---



\## 18.2 Chip Number Search



可搜尋 Chip Number。



\---



\## 18.3 Species Filter



支援：



&#x20;   All

&#x20;   DOG

&#x20;   CAT



\---



\## 18.4 Status Filter



支援：



&#x20;   ACTIVE

&#x20;   INACTIVE

&#x20;   ALL



預設：



&#x20;   ACTIVE



\---



\## 18.5 Customer Filter



支援：



&#x20;   customer\_id



用於查詢某一 Customer 關聯的 Pet。



\---



\# 19. Pagination（分頁）



Pet List 使用簡單 Pagination。



至少提供：



\- Previous

\- Next



MVP 不需要：



\- Infinite Scroll

\- 複雜 Page Navigation Framework

\- 大型 Pagination Library



\---



\# 20. Sorting（排序）



Pet List 預設：



&#x20;   name ASC



API 可保留未來擴充排序的空間，但本 Task 不需要建立複雜 Sorting Framework。



\---



\# 21. Validation Rules（驗證）



\## 21.1 Pet Name



&#x20;   1–100 characters



空值：



&#x20;   VALIDATION\_ERROR



\---



\## 21.2 Species



只允許：



&#x20;   DOG

&#x20;   CAT



\---



\## 21.3 Gender



只允許：



&#x20;   MALE

&#x20;   FEMALE

&#x20;   UNKNOWN



\---



\## 21.4 Weight



如果提供 Weight：



&#x20;   weight > 0

&#x20;   weight <= 300 kg equivalent



允許小數。



\---



\## 21.5 Weight Unit



只允許：



&#x20;   KG

&#x20;   LB



\---



\## 21.6 Chip Number



如果提供：



&#x20;   UNIQUE



允許：



&#x20;   NULL



\---



\## 21.7 Photo URL



如果提供：



必須為合法：



&#x20;   http://

&#x20;   https://



MVP 不負責：



\- Download

\- MIME verification

\- Image resizing

\- Image processing

\- Storage



\---



\## 21.8 Notes



&#x20;   notes <= 1000 characters



\---



\## 21.9 Special Notes



&#x20;   special\_notes <= 2000 characters



\---



\# 22. Error Handling（錯誤處理）



Validation Error：



&#x20;   HTTP 400



Resource Not Found：



&#x20;   HTTP 404



Unauthenticated：



&#x20;   HTTP 401



Unauthorized：



&#x20;   HTTP 403



Unexpected Server Error：



&#x20;   HTTP 500



\---



\## 22.1 Validation Response



Validation Error 必須能指出具體欄位。



概念：



&#x20;   {

&#x20;     "success": false,

&#x20;     "error": {

&#x20;       "code": "VALIDATION\_ERROR",

&#x20;       "fields": {

&#x20;         "name": "Pet name is required",

&#x20;         "species": "Species must be DOG or CAT"

&#x20;       }

&#x20;     }

&#x20;   }



不得回傳：



\- Stack Trace

\- Database credentials

\- Password

\- Session Secret

\- Internal Secret



\---



\## 22.2 Pet Not Found



使用：



&#x20;   404



錯誤代碼：



&#x20;   PET\_NOT\_FOUND



\---



\# 23. Frontend Pet Management（Frontend）



Pet Block 必須提供基本可使用 UI。



\---



\## 23.1 Pet List



至少顯示：



\- Pet Name

\- Species

\- Primary Customer

\- Status



\---



\## 23.2 Pet List Search



提供：



\- Name / Chip Search

\- Species Filter

\- Status Filter

\- Customer Filter



\---



\## 23.3 Pet Detail



至少顯示：



\- Pet Profile

\- Primary Customer

\- Other Customers

\- Status

\- Created At

\- Updated At



\---



\## 23.4 Pet Create



Create Form 分為：



&#x20;   Basic Information

&#x20;   Customer

&#x20;   Other Information



避免建立大型單一欄位牆。



\---



\## 23.5 Required Field UI



必填欄位使用：



&#x20;   \*



標示。



\---



\## 23.6 Customer Selector



Customer Selector 支援：



\- Customer Name

\- Customer Phone



搜尋。



不建立獨立 Customer Picker Framework。



\---



\# 24. Pet Photo UI



MVP 第一版不建立 Image Upload Service。



只保存：



&#x20;   photo\_url



Frontend 可以提供 URL 欄位。



不得因 Pet Photo 自行增加：



\- S3

\- Cloud Storage

\- Upload API

\- Image Processing Service

\- CDN



\---



\# 25. Pet Detail Customer Management



Pet Detail 必須可以管理 Customer Relationship。



功能：



\- Add Customer

\- View Customers

\- Set Primary

\- Remove Customer



但必須遵守：



\- Primary Customer Rule

\- Duplicate Relationship Rule

\- Customer Block Boundary



\---



\# 26. Deactivate UX



Deactivate Pet 必須顯示 Confirm Dialog。



概念：



&#x20;   Deactivate Pet?

&#x20;   

&#x20;   \[Cancel] \[Confirm]



\---



\# 27. Activate UX



Activate Pet 為低風險可逆操作。



不需要額外 Confirm Dialog。



\---



\# 28. Inactive Pet Rule



Inactive Pet：



\- 可以查看

\- 可以重新 Activate

\- 可以查看歷史資料

\- 不可以建立新的 Appointment



Appointment Block 必須遵守此規則。



\---



\# 29. Historical Data Boundary（歷史資料）



Pet Deactivate 不得刪除：



\- Appointment History

\- Grooming History

\- Boarding History

\- Order History

\- Payment History



本 Task 不建立完整 Audit Log System。



Pet Master Data 至少保存：



\- created\_at

\- updated\_at



後續 Audit 詳細實作依 MVP 正式規格處理。



\---



\# 30. Data Integrity（資料完整性）



以下規則必須由 Backend 與 Database 共同保護：



1\. Pet ID 唯一

2\. Pet + Customer Relationship 唯一

3\. Chip Number 唯一

4\. Pet 必須存在 Primary Customer

5\. Primary Customer 最多一個

6\. Species 必須為 DOG / CAT

7\. Gender 必須為合法值

8\. Weight 必須符合範圍

9\. Inactive Pet 不可進入新的服務預約流程



Frontend Validation 不得被視為唯一資料保護機制。



\---



\# 31. Transaction Rules（Transaction）



以下操作需要 Transaction：



\## 31.1 Create Pet + Primary Customer



&#x20;   BEGIN

&#x20;     Create Pet

&#x20;     Create Customer Relationship

&#x20;   COMMIT



失敗：



&#x20;   ROLLBACK



\---



\## 31.2 Change Primary Customer



&#x20;   BEGIN

&#x20;     Remove old primary

&#x20;     Set new primary

&#x20;   COMMIT



失敗：



&#x20;   ROLLBACK



\---



\## 31.3 Simple Pet Update



單純 Pet 欄位更新不需要為了形式而建立複雜 Transaction。



\---



\## 31.4 Activate / Deactivate



單一狀態更新不需要額外 Transaction。



\---



\# 32. Database Design Rules（Database）



Pet Table 必須：



\- 使用 Primary Key

\- 使用適當欄位型別

\- 建立必要 UNIQUE Constraint

\- 建立必要 Index

\- 保留 created\_at

\- 保留 updated\_at



Customer Relationship Table 必須：



\- Pet Foreign Key

\- Customer Foreign Key

\- is\_primary

\- created\_at

\- UNIQUE(pet\_id, customer\_id)



不得建立與本 Task 無關的 Business Tables。



\---



\# 33. Business Boundary（Business Table Boundary）



TASK-0003 不得建立：



\- Appointment Table

\- Grooming Table

\- Boarding Table

\- Order Table

\- Payment Table

\- Product Table

\- Report Table



除非目前已 Freeze 的 MVP Specification 明確要求 Pet Block 必須建立某個 foundation dependency。



任何超出本 Task 的 Schema 都屬於 Scope Expansion。



\---



\# 34. Customer Dependency



如果 Customer Block 已存在：



> 必須使用既有 Customer Table / API / Contract。



不得複製 Customer Master Data。



如果 Customer Block 尚未完成：



> 必須依目前 Freeze 規格建立最小必要 Dependency Boundary，不得重新實作 Customer Block。



\---



\# 35. API Boundary（Block Boundary）



Pet Block 負責：



&#x20;   Pet

&#x20;   Pet ↔ Customer Relationship



Customer Block 負責：



&#x20;   Customer Master



後續 Block 負責：



&#x20;   Appointment

&#x20;   Grooming

&#x20;   Boarding

&#x20;   Order

&#x20;   Payment



不得互相複製 Master Data。



\---



\# 36. Frontend Route Boundary



Pet UI 至少需要：



&#x20;   /pets



&#x20;   /pets/new



&#x20;   /pets/:id



具體 Pages Router 實作方式依目前 MVP Frontend 結構決定。



不得建立新的 Frontend Framework。



\---



\# 37. Testing Requirements（測試要求）



至少需要測試：



\## 37.1 Pet Creation



\- Create Pet

\- Required fields

\- Invalid Species

\- Invalid Gender

\- Invalid Weight

\- Invalid Photo URL



\---



\## 37.2 Customer Relationship



\- Create Relationship

\- Duplicate Relationship

\- First Customer becomes Primary

\- Change Primary

\- Remove Non-Primary

\- Reject removal of Primary



\---



\## 37.3 Pet Lifecycle



\- Active Pet

\- Deactivate

\- Activate

\- Inactive Pet cannot be used for new Appointment boundary



\---



\## 37.4 Search



\- Name Search

\- Chip Search

\- Species Filter

\- Status Filter

\- Customer Filter



\---



\## 37.5 Authorization



至少驗證：



\- Unauthenticated

\- OWNER

\- FRONT\_DESK

\- GROOMER



確保權限符合本 Task。



\---



\## 37.6 API Error Handling



至少驗證：



\- 400

\- 401

\- 403

\- 404

\- Validation Error



\---



\# 38. Definition of Done（完成定義）



TASK-0003 只有在以下條件全部成立後，才可進入 PASS。



\## 38.1 Database



\- \[ ] Pet table implemented

\- \[ ] Pet Customer Relationship implemented

\- \[ ] Required constraints implemented

\- \[ ] Required indexes implemented

\- \[ ] Migration completed

\- \[ ] Database verification completed



\---



\## 38.2 Backend



\- \[ ] Pet API implemented

\- \[ ] Customer Relationship API implemented

\- \[ ] Authentication enforced

\- \[ ] Authorization enforced

\- \[ ] Validation implemented

\- \[ ] Transaction rules implemented

\- \[ ] Error handling implemented



\---



\## 38.3 Frontend



\- \[ ] Pet List implemented

\- \[ ] Pet Create implemented

\- \[ ] Pet Detail implemented

\- \[ ] Pet Edit implemented

\- \[ ] Activate implemented

\- \[ ] Deactivate implemented

\- \[ ] Customer Relationship UI implemented

\- \[ ] Search implemented

\- \[ ] Filters implemented



\---



\## 38.4 Testing



\- \[ ] Jest tests pass

\- \[ ] Supertest API tests pass

\- \[ ] Pet Business Rules verified

\- \[ ] Permission verified

\- \[ ] Database constraints verified



\---



\## 38.5 Verification



\- \[ ] Backend startup PASS

\- \[ ] Frontend startup PASS

\- \[ ] Database connectivity PASS

\- \[ ] API verification PASS

\- \[ ] Frontend verification PASS

\- \[ ] Automated tests PASS

\- \[ ] Git status reviewed

\- \[ ] Scope reviewed

\- \[ ] No Freeze conflict

\- \[ ] No unauthorized files

\- \[ ] No unauthorized dependencies



\---



\# 39. Verification Result Rules（驗證結果）



所有 Verification 必須使用：



&#x20;   PASS

&#x20;   FAIL

&#x20;   NOT AVAILABLE



不得使用：



&#x20;   Probably PASS

&#x20;   Expected PASS

&#x20;   Should PASS

&#x20;   Likely PASS



未實際執行的項目：



> 不得標記 PASS。



\---



\# 40. Completion Report（完成報告）



TASK-0003 完成後，AI Developer 必須提供：



1\. Task ID

2\. Task Status

3\. Implementation Summary

4\. Files Created

5\. Files Modified

6\. Files Deleted

7\. Dependencies Added

8\. Dependencies Modified

9\. Database Changes

10\. API Changes

11\. Frontend Changes

12\. Commands Executed

13\. Database Verification

14\. Backend Verification

15\. Frontend Verification

16\. API Verification

17\. Automated Testing

18\. Git Status

19\. Git Branch

20\. Git Commit

21\. Issues

22\. Stop Conditions

23\. Scope Verification

24\. Definition of Done Verification

25\. Final Result



\---



\# 41. Stop Conditions（停止條件）



遇到以下任一情況，立即停止相關實作並回報：



\- Specification Conflict

\- Architecture Conflict

\- Technology Conflict

\- Scope Expansion

\- Unclear Requirement

\- Existing File Risk

\- Destructive Operation Risk

\- Critical Environment Failure

\- Customer Block Contract Conflict

\- Database Design Conflict

\- API Contract Conflict

\- Frozen Phase Conflict



回報格式：



&#x20;   Problem：

&#x20;   Observation：

&#x20;   Impact：

&#x20;   Required Decision：



不得自行猜測。



\---



\# 42. Existing Project Safety（既有專案安全）



開始修改任何檔案前，必須先檢查：



\- Project Structure

\- Existing Files

\- Existing Code

\- Existing Dependencies

\- Git Status

\- Configuration

\- Existing Database State

\- Existing Tests



不得假設：



\- 專案為空

\- Database 為空

\- Frontend 尚未建立

\- Backend 尚未建立

\- Authentication 尚未建立



\---



\# 43. Freeze Protection（Freeze 保護）



不得修改：



\- MVP Master Baseline

\- Frozen PHASE 文件

\- TASK-0001

\- TASK-0002

\- 其他已 Freeze 文件



如果 Pet Block 實作需要修改 Frozen Specification：



> STOP。



不得自行修改。



\---



\# 44. Technology Protection（技術保護）



本 Task 不得自行：



\- 改用 TypeScript

\- 改用 Prisma

\- 改用 Tailwind

\- 改用其他 ORM

\- 改用其他 Backend Framework

\- 改用其他 Frontend Framework

\- 建立 GraphQL

\- 建立 Redis

\- 建立 Elasticsearch

\- 建立微服務

\- 建立 Event Sourcing



MVP 原則：



> \*\*該寫的才寫。\*\*



\---



\# 45. Scope Protection（Scope 保護）



Pet Block 不得因「未來可能需要」而提前建立：



\- Appointment

\- Grooming

\- Boarding

\- Order

\- Payment

\- Product

\- Report



只建立 Pet Block 完成所必要的資料與功能。



\---



\# 46. Performance Boundary（效能邊界）



MVP 不需要：



\- Elasticsearch

\- Redis Cache

\- Search Cluster

\- Read Replica

\- CQRS

\- Message Queue



Pet Search 使用 MySQL 基礎查詢即可。



\---



\# 47. Security Boundary（安全邊界）



必須：



\- Authentication

\- Authorization

\- Input Validation

\- Parameterized SQL

\- HttpOnly Session Cookie（沿用目前 MVP Authentication）

\- 不回傳敏感資料



不得：



\- 回傳 Password Hash

\- 回傳 Session Secret

\- 將 Database Credential 暴露給 Frontend

\- 將 Server Secret 暴露給 Client



\---



\# 48. API Response Boundary（Response）



API 必須沿用目前 MVP Backend 已建立的 Response Convention。



不得為 Pet Block 自行建立第二套：



\- Response Envelope

\- Error Format

\- Authentication Format

\- Session Format



如果目前既有 Contract 與本 Task 產生衝突：



> STOP。



\---



\# 49. Frontend / Backend Integration



Frontend 必須透過目前 MVP API Client / API Flow 呼叫 Backend。



不得：



\- 直接從 Frontend 連 MySQL

\- 把 Database Query 放在 Browser

\- 建立第二套 API Client Architecture



\---



\# 50. Data Ownership



Pet Master Data Owner：



> Pet Block



Customer Master Data Owner：



> Customer Block



Customer ↔ Pet Relationship Owner：



> Pet Block



\---



\# 51. Downstream Usage（後續 Block 使用）



後續 Block 可以依照 Frozen Pet Contract 使用：



&#x20;   Pet ID

&#x20;   Pet Name

&#x20;   Species

&#x20;   Breed

&#x20;   Gender

&#x20;   Weight

&#x20;   Status

&#x20;   Primary Customer

&#x20;   Customer Relationships



後續 Block 不得自行建立另一份 Pet Master。



\---



\# 52. Appointment Boundary



Appointment Block 未來必須遵守：



&#x20;   Pet.status = ACTIVE



才可建立新的 Appointment。



TASK-0003 不實作 Appointment。



TASK-0003 只提供 Pet Status Contract。



\---



\# 53. Grooming Boundary



Grooming Block 未來使用 Pet：



&#x20;   Pet ID



作為服務對象。



Grooming 不建立：



&#x20;   Grooming Pet Master



\---



\# 54. Boarding Boundary



Boarding Block 未來使用：



&#x20;   Pet ID



作為住宿對象。



Boarding 不建立：



&#x20;   Boarding Pet Master



\---



\# 55. Order Boundary



Order Block 未來可以透過：



&#x20;   Pet ID



關聯實際服務對象。



Order 不重新建立 Pet Profile。



\---



\# 56. Report Boundary



Report Block 未來可以透過：



&#x20;   Pet ID



關聯歷史資料。



Report 不修改 Pet Master Data。



\---



\# 57. Pet List UX



預設：



&#x20;   ACTIVE



排序：



&#x20;   name ASC



顯示：



&#x20;   Pet Name

&#x20;   Species

&#x20;   Primary Customer

&#x20;   Status



使用者可以切換：



&#x20;   ACTIVE

&#x20;   INACTIVE

&#x20;   ALL



\---



\# 58. Pet Detail UX



Detail 至少包含：



&#x20;   Pet Profile

&#x20;   Customer Relationships

&#x20;   Primary Customer

&#x20;   Status

&#x20;   Created At

&#x20;   Updated At



提供：



&#x20;   Edit

&#x20;   Activate / Deactivate

&#x20;   Customer Relationship Management



\---



\# 59. Pet Create UX



Create Form：



&#x20;   Basic Information

&#x20;       ↓

&#x20;   Customer

&#x20;       ↓

&#x20;   Other Information



必填：



&#x20;   Name

&#x20;   Species

&#x20;   Gender

&#x20;   Primary Customer



第一個 Customer Relationship 自動成為 Primary。



\---



\# 60. Pet Edit UX



Edit 可以修改：



\- Name

\- Species

\- Breed

\- Gender

\- Birth Date

\- Weight

\- Weight Unit

\- Chip Number

\- Photo URL

\- Notes

\- Special Notes



不得修改：



\- ID

\- Created At

\- Updated At



時間欄位由 Server 管理。



\---



\# 61. Customer Relationship UX



Pet Detail：



&#x20;   Customers

&#x20;      ├── Primary Customer

&#x20;      ├── Other Customers

&#x20;      ├── Add Customer

&#x20;      ├── Set Primary

&#x20;      └── Remove



Remove Primary 時：



&#x20;   Reject



必須先設定新的 Primary。



\---



\# 62. Data Integrity Rules Summary



Pet Block 必須保證：



1\. Pet ID 唯一

2\. Pet Name 不作為 Identity

3\. Species 僅 DOG / CAT

4\. Gender 僅 MALE / FEMALE / UNKNOWN

5\. Weight 合法

6\. Chip Number 全店唯一

7\. Pet ↔ Customer Relationship 不重複

8\. 每隻 Pet 有 Primary Customer

9\. 每隻 Pet 最多一個 Primary

10\. Inactive Pet 不可建立新的 Appointment

11\. Pet 不直接 Hard Delete

12\. History 保留



\---



\# 63. AI Implementation Principle（AI 實作原則）



AI Developer 必須：



1\. 先閱讀 Task 文件

2\. 閱讀所有 Reference Documents

3\. 檢查目前 repository

4\. 檢查目前 implementation

5\. 檢查目前 dependencies

6\. 檢查 Git

7\. 檢查 Database

8\. 確認 Scope

9\. 再開始修改



不得直接開始寫 Code。



\---



\# 64. Implementation Completion Standard



完成後必須是一個可獨立驗證的完整 Block：



&#x20;   Pet Block

&#x20;       ↓

&#x20;   Database

&#x20;       +

&#x20;   API

&#x20;       +

&#x20;   Business Logic

&#x20;       +

&#x20;   Validation

&#x20;       +

&#x20;   Authentication

&#x20;       +

&#x20;   Authorization

&#x20;       +

&#x20;   Frontend

&#x20;       +

&#x20;   Tests

&#x20;       +

&#x20;   Verification



不得只完成：



&#x20;   Database



或：



&#x20;   API



或：



&#x20;   Frontend



就宣告 Task 完成。



\---



\# 65. Human Verification



AI Developer 可以執行自動化與技術驗證。



但：



> Human Browser Verification 不得自行宣告。



如果需要 Project Owner 操作瀏覽器確認：



&#x20;   PENDING HUMAN VERIFICATION



必須明確回報。



只有 Project Owner 提供人工驗證結果後，才能標記該項：



&#x20;   PASS



\---



\# 66. Final Acceptance Criteria（最終驗收）



TASK-0003 必須全部符合：



\- \[ ] Pet Master Data 完成

\- \[ ] Customer Relationship 完成

\- \[ ] Primary Customer 完成

\- \[ ] Pet Lifecycle 完成

\- \[ ] Validation 完成

\- \[ ] Authentication 完成

\- \[ ] Authorization 完成

\- \[ ] API 完成

\- \[ ] Frontend 完成

\- \[ ] Search 完成

\- \[ ] Filter 完成

\- \[ ] Database Constraints 完成

\- \[ ] Transaction Rules 完成

\- \[ ] Automated Tests PASS

\- \[ ] Database Verification PASS

\- \[ ] Backend Verification PASS

\- \[ ] Frontend Verification PASS

\- \[ ] API Verification PASS

\- \[ ] Scope Verification PASS

\- \[ ] Freeze Verification PASS

\- \[ ] Human Verification（如適用）PASS

\- \[ ] Completion Report 完成



\---



\# 67. Freeze Rule（Freeze 規則）



TASK-0003 的 Freeze 條件：



&#x20;   Definition

&#x20;       ↓

&#x20;   Implementation

&#x20;       ↓

&#x20;   Testing

&#x20;       ↓

&#x20;   Verification

&#x20;       ↓

&#x20;   PASS

&#x20;       ↓

&#x20;   FREEZE



一旦：



&#x20;   TASK-0003 = PASS



Pet Block Contract 即正式 Freeze。



後續 Block：



\- Appointment

\- Daily Operations

\- Grooming

\- Boarding

\- Order

\- Payment

\- Report



不得自行修改 Pet Block Contract。



如果後續需求需要修改 Pet Block：



> 必須透過正式變更流程。



\---



\# 68. Task Completion State



本文件狀態：



> \*\*FROZEN\*\*



代表：



\- Q1–Q120 Decision 已完成

\- Freeze 前一致性檢查已完成

\- Freeze 前補充決策已完成

\- Pet Block Scope 已確認

\- Implementation Contract 已確認



目前：



> \*\*TASK-0003 READY FOR IMPLEMENTATION\*\*



注意：



> `READY FOR IMPLEMENTATION` 不代表 `TASK-0003 IMPLEMENTATION PASS`。



Implementation PASS 必須等 Coding AI 實際完成與 Verification 後才能決定。



\---



\# 69. Decision Record（最終決策摘要）



| Decision | Final Decision |

|---|---|

| Pet Identity | System-generated ID |

| Species | DOG / CAT |

| Gender | MALE / FEMALE / UNKNOWN |

| Status | ACTIVE / INACTIVE |

| Weight | > 0, ≤ 300 kg equivalent |

| Weight Unit | KG / LB |

| Chip Number | Global UNIQUE, NULL allowed |

| Photo | photo\_url only |

| Pet Delete | No Hard Delete |

| Customer Relationship | Multiple Customers |

| Primary Customer | Exactly one |

| First Customer | Automatically Primary |

| Duplicate Relationship | Forbidden |

| Primary Change | Transaction |

| Primary Removal | Forbidden until replacement |

| Relationship created\_at | Required |

| Pet created\_at | Server managed |

| Pet updated\_at | Server managed |

| Pet API | Authentication Required |

| Pet View | OWNER / FRONT\_DESK / GROOMER |

| Pet Create | OWNER / FRONT\_DESK |

| Pet Modify | OWNER / FRONT\_DESK |

| Pet Activate / Deactivate | OWNER / FRONT\_DESK |

| Inactive Pet | No new Appointment |

| Pet Search | Name / Chip Number |

| Species Filter | Yes |

| Status Filter | Yes |

| Customer Filter | Yes |

| Default List Status | ACTIVE |

| Default Sort | Pet Name ASC |

| Pagination | Previous / Next |

| Pet Detail | All Customer Relationships |

| Pet Photo Upload | Out of Scope |

| Customer Master Modification | Customer Block |

| Testing | Jest + Supertest |

| ORM | None / mysql2 |

| Frontend | Next.js Pages Router + JavaScript + Bootstrap |

| Backend | Express.js + JavaScript |

| Database | MySQL |

| TypeScript | Prohibited |

| Prisma | Prohibited |

| Tailwind | Prohibited |



\---



\# 70. Final Task Declaration（最終 Task 宣告）



TASK-0003：



> \*\*寵物管理區塊（Pet Management Block）\*\*



已完成規格決策與 Freeze。



本 Task 的唯一工程目標：



&#x20;   Build

&#x20;   ↓

&#x20;   Verify

&#x20;   ↓

&#x20;   PASS

&#x20;   ↓

&#x20;   Freeze



不得自行建立下一個 TASK。



不得修改 Frozen Specification。



不得擴張 MVP Scope。



不得引入舊 PSOP 專案內容。



不得自行改變既定 Technology Stack。



\---



\# 71. Document Control（文件控制）



| Item | Value |

|---|---|

| Task ID | TASK-0003 |

| Task Name | 寵物管理區塊 (Pet Management Block) |

| Version | v1.0 |

| Status | FROZEN |

| Project | MVP — Pet Shop Operations System |

| Previous Task | TASK-0002 |

| Current Phase | Pet Management Block |

| Implementation Status | READY FOR IMPLEMENTATION |

| Owner | Project Owner |

| Developer | AI Developer |

| Review | Engineering Review |

| Acceptance | Project Owner |

| Database | MySQL |

| Database Driver | mysql2 |

| ORM | None |

| Backend | Express.js |

| Frontend | Next.js Pages Router |

| Frontend Language | JavaScript |

| UI | Bootstrap |

| Testing | Jest + Supertest |

| Package Manager | npm |

| Version Control | Git |



\---



\# 72. Final Freeze Statement（最終 Freeze 聲明）



TASK-0003 已依照 MVP Block-Based Development Method 完成：



\- Requirement Decision

\- Business Rule Decision

\- Technical Boundary Decision

\- API Boundary Decision

\- Database Boundary Decision

\- Permission Decision

\- Frontend UX Decision

\- Validation Decision

\- Testing Decision

\- Definition of Done

\- Freeze Review



本文件為：



> \*\*TASK-0003 v1.0 FROZEN\*\*



後續 Coding AI 必須以本文件為直接 Task Contract。



任何與本文件衝突的現有程式、設定、Database Schema 或技術實作：



> 不得自行猜測或修改。



必須停止相關工作並依：



&#x20;   Problem：

&#x20;   Observation：

&#x20;   Impact：

&#x20;   Required Decision：



格式回報。



\*\*TASK-0003：READY FOR IMPLEMENTATION\*\*

