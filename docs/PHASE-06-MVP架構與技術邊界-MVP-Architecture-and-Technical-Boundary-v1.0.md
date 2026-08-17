\# PHASE-06-MVP架構與技術邊界-MVP-Architecture-and-Technical-Boundary-v1.0



\*\*Version：v1.0\*\*  

\*\*Status：FREEZE\*\*  

\*\*Freeze Date：2026-08-16\*\*



\---



\# 1. 文件目的



本文件定義 MVP v1.0 的整體技術架構與技術邊界。



PHASE 6 的目的不是開始寫程式，也不是建立完整 Database Schema 或 API Specification，而是將前面 PHASE 1～PHASE 5 已確認並 Freeze 的 MVP 產品範圍、Business Block 與 Block Responsibility，轉換成可以直接支援後續工程設計與開發的最小必要技術架構。



本 Phase 遵循：



> 該寫的才寫，不需要的不要寫。



技術架構必須：



\- 簡單

\- 可理解

\- 可開發

\- 可測試

\- 可維護

\- 足以支援 MVP



不為尚未存在的未來需求建立複雜架構。



\---



\# 2. PHASE 6 範圍



\## 2.1 本 Phase 定義



本 Phase 定義：



\- MVP 整體技術架構

\- Frontend 技術責任

\- Backend 技術責任

\- Database 技術責任

\- Business Block 與技術架構的關係

\- Controller 責任

\- Business Logic 責任

\- Data Access 責任

\- API 的基本架構邊界

\- Frontend 與 Backend 的合作方式

\- Block 之間的合作方式

\- Database 存取原則

\- Transaction 原則

\- Testing 架構

\- MVP 技術限制與排除範圍



\## 2.2 本 Phase 不定義



以下內容不在 PHASE 6 詳細定義：



\- Database Schema 詳細欄位

\- 完整 API Endpoint Specification

\- Request / Response 詳細格式

\- UI 詳細設計

\- Component 詳細設計

\- 程式碼實作

\- Deployment 詳細設定

\- CI/CD 詳細流程

\- Cloud Infrastructure

\- 尚未經過產品決策的新功能



\---



\# 3. 技術基線



以下技術基線已正式 Freeze。



PHASE 6 不重新選擇技術。



\## 3.1 Frontend



\- Framework：Next.js

\- Language：JavaScript

\- UI Framework：Bootstrap



\## 3.2 Backend



\- Framework：Express.js

\- Language：JavaScript



\## 3.3 Database



\- Database：MySQL



\## 3.4 Database Driver



\- mysql2



\## 3.5 Testing



\- Jest

\- Supertest



\## 3.6 ORM



MVP 不使用 ORM。



正式資料存取方式：



> Express.js → mysql2 → MySQL



不得自行改用：



\- Prisma

\- PostgreSQL

\- MongoDB

\- TypeScript

\- Tailwind



除非未來透過正式 Change Request 並經使用者確認。



\---



\# 4. 整體系統架構



MVP 採用簡單的前後端分離架構。



```text

┌──────────────────────────────┐

│           Next.js            │

│         Frontend UI          │

│          JavaScript          │

│           Bootstrap          │

└──────────────┬───────────────┘

&#x20;              │

&#x20;              │ HTTP API

&#x20;              ↓

┌──────────────────────────────┐

│         Express.js           │

│           Backend            │

│          JavaScript          │

├──────────────────────────────┤

│          Controller          │

├──────────────────────────────┤

│        Business Logic        │

├──────────────────────────────┤

│         Data Access          │

└──────────────┬───────────────┘

&#x20;              │

&#x20;            mysql2

&#x20;              │

&#x20;              ↓

┌──────────────────────────────┐

│            MySQL             │

│          Database            │

└──────────────────────────────┘

```



整體責任：



```text

Next.js

&#x20;   ↓

負責使用者操作與畫面



Express.js

&#x20;   ↓

負責 API 與正式業務邏輯



mysql2

&#x20;   ↓

負責 Backend 與 MySQL 的資料庫連接



MySQL

&#x20;   ↓

負責正式業務資料儲存

```



\---



\# 5. Testing 架構



MVP Testing 採用 Jest 與 Supertest。



```text

Jest

&#x20; +

Supertest

&#x20;     ↓

Backend / API / Business Logic

&#x20;     ↓

Database Integration

```



測試可以涵蓋：



\- Business Logic

\- API

\- Integration



但不建立大型測試平台。



\---



\# 6. MVP 不建立的技術架構



MVP 不建立以下架構：



\- Microservices

\- Message Queue

\- Event Bus

\- Service Mesh

\- Kubernetes

\- Distributed System

\- Event Sourcing

\- CQRS

\- Enterprise Integration Platform

\- Data Warehouse

\- Enterprise BI Platform

\- Distributed Tracing Platform

\- 複雜 Dependency Injection Framework

\- 複雜 Repository Framework

\- 完整 Domain-Driven Design 架構



這些不代表永久禁止。



定義為：



> 不屬於 MVP v1.0。



未來若真的產生必要需求，再依 Change Request 評估。



\---



\# 7. Architecture 核心原則



\## 7.1 Business Block First



Business Block 是系統主要的業務責任邊界。



技術架構必須服務 Business Block。



不得因為技術實作方便，就任意改變既有 Business Block 的責任。



\---



\## 7.2 Single Responsibility



每個 Block 應負責自己的核心業務責任。



其他 Block 可以使用它，但不應接管它的核心責任。



\---



\## 7.3 Single Source of Truth



正式業務資料應有明確且單一的主要責任來源。



例如：



```text

Customer

&#x20;   ↓

誰是客戶

```



```text

Pet

&#x20;   ↓

哪一隻寵物

```



```text

Appointment

&#x20;   ↓

客戶預約了什麼、什麼時間

```



```text

Order

&#x20;   ↓

客戶這次買了什麼

```



```text

Payment

&#x20;   ↓

客戶怎麼付款、付了多少

```



不同 Block 可以使用彼此資料，但不應建立第二套互相獨立的正式資料來源。



\---



\## 7.4 Clear Boundary



Block 可以合作，但合作不代表可以任意操作其他 Block 的內部資料。



基本原則：



> 可以使用其他 Block 的能力，不可以任意接管其他 Block 的責任。



\---



\## 7.5 Minimum Necessary Architecture



MVP 只建立真正需要的技術層次。



不因為：



\- 大型系統通常這樣做

\- 看起來比較完整

\- 未來可能需要

\- 架構看起來比較漂亮



就提前加入複雜技術。



\---



\# 8. Frontend Responsibility



Frontend 使用：



> Next.js + JavaScript + Bootstrap



Frontend 主要負責：



\- UI 顯示

\- 使用者操作

\- 表單輸入

\- 基本輸入驗證

\- UI State

\- API 呼叫

\- 操作流程

\- 錯誤訊息呈現

\- 使用者體驗



Frontend 不負責：



\- 直接存取 MySQL

\- 正式業務資料儲存

\- 最終 Business Rule

\- 取代 Backend Business Logic

\- 自行決定正式交易結果



\---



\# 9. Frontend Validation



Frontend 可以進行基本輸入驗證。



例如：



\- 必填欄位

\- 基本格式

\- 基本輸入限制

\- 使用者操作上的即時提示



Frontend Validation 的主要目的：



> 改善使用者操作體驗。



但正式業務規則仍必須由 Backend 再次確認。



因此：



```text

Frontend Validation

&#x20;   ↓

改善使用者體驗

```



而：



```text

Backend Validation

&#x20;   ↓

正式業務規則與資料確認

```



Frontend 驗證不得成為正式 Business Rule 唯一的執行位置。



\---



\# 10. Frontend 與 Business Block



Frontend 功能應依 Business Block 組織。



目前 MVP Business Blocks：



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



注意：



> 一個 Business Block 不等於一個頁面。



一個 Block 可以有多個畫面與操作。



Block 的主要目的，是讓：



> 使用者操作邏輯與 Business Responsibility 保持一致。



\---



\# 11. Frontend API Client



Frontend 與 Backend 的 API 呼叫採用簡單、集中的 API Client / API Service 方式管理。



主要目的：



\- 避免 API URL 散落在各個 Component

\- 避免 HTTP Method 散落

\- 統一基本錯誤處理

\- 降低 UI Component 與 API 細節的耦合



MVP 不建立大型 Frontend API Framework。



\---



\# 12. Frontend State



MVP 不預先導入大型 Global State Management Framework。



不預先加入：



\- Redux

\- Zustand

\- MobX

\- 其他大型 State Management Framework



優先使用：



\- React / Next.js 原生 State

\- Component State

\- 必要的簡單共用 State



Frontend State 主要代表：



\- UI 狀態

\- 暫時操作狀態

\- 畫面所需資料



Frontend State 不成為正式業務資料來源。



\---



\# 13. Backend Responsibility



Backend 使用：



> Express.js + JavaScript



Backend 是 MVP 正式業務資料與業務規則的主要執行入口。



Backend 負責：



\- API

\- Request 處理

\- Input Validation

\- Business Logic

\- Block Coordination

\- Transaction

\- Data Access

\- Error Handling

\- Response



Frontend 不直接連接 MySQL。



\---



\# 14. Backend 基本分層



Backend 採用最小必要的責任分層：



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



這不是大型 Enterprise Architecture。



目的只有：



> 將 HTTP、Business Logic、Database Access 分開。



\---



\# 15. Controller Responsibility



Controller 主要負責：



\- 接收 HTTP Request

\- 取得 Request Parameters

\- 取得 Request Body

\- 基本輸入處理

\- 呼叫 Business Logic

\- 將結果轉換為 HTTP Response

\- 處理適當的 HTTP Error



基本流程：



```text

Request

&#x20;  ↓

Controller

&#x20;  ↓

Business Logic

&#x20;  ↓

Controller

&#x20;  ↓

Response

```



Controller 不應承擔大量核心 Business Rule。



避免：



```text

Controller

&#x20;   ↓

大量業務判斷

&#x20;   ↓

直接操作多張資料表

```



\---



\# 16. Business Logic Responsibility



Business Logic 是正式業務規則的主要執行位置。



負責：



\- 業務判斷

\- 業務流程

\- Block 內部操作

\- Block 間必要協作

\- 狀態轉換

\- Transaction 協調

\- 業務錯誤判斷



例如建立預約：



```text

建立預約

&#x20;   ↓

確認 Customer

&#x20;   ↓

確認 Pet

&#x20;   ↓

確認 Service

&#x20;   ↓

確認預約條件

&#x20;   ↓

建立 Appointment

```



這類業務判斷不應全部放在 Controller。



\---



\# 17. Data Access Responsibility



Data Access 負責與 MySQL 溝通。



主要負責：



\- SELECT

\- INSERT

\- UPDATE

\- DELETE

\- Transaction 所需的資料庫操作

\- SQL Parameter Binding

\- Database Connection / Pool 使用



Data Access 不應重新定義主要 Business Rule。



例如：



```text

Data Access

&#x20;   ↓

取得 Appointment

```



而不是：



```text

Data Access

&#x20;   ↓

決定整個 Appointment 業務流程是否允許

```



Business Rule 應由 Business Logic 負責。



\---



\# 18. 不建立大型 Enterprise Layer



MVP 不預先建立：



\- 完整 Domain-Driven Design

\- Repository Pattern Framework

\- Use Case Framework

\- Service Mesh

\- Event-driven Architecture

\- CQRS

\- Event Sourcing

\- Enterprise Integration Layer

\- 複雜 Dependency Injection Framework



如果未來真的出現必要需求，再依 Change Request 評估。



\---



\# 19. API Responsibility



API 是 Frontend 與 Backend 之間的正式介面。



API 主要依 Business Block 分組。



例如：



```text

/api/customers

/api/pets

/api/services

/api/appointments

/api/grooming

/api/boarding

/api/orders

/api/payments

/api/products

/api/reports

```



實際 Endpoint、Request、Response、Status Code 與 Error Schema 不在 PHASE 6 詳細定義。



這些內容留待後續 API Specification Phase。



\---



\# 20. HTTP Method 基本原則



MVP API 使用基本 HTTP Method 語意：



| Method | 基本用途 |

|---|---|

| GET | 查詢 |

| POST | 建立 |

| PATCH | 修改 |

| DELETE | 刪除 |



不採用：



> 所有操作全部使用 POST。



API 詳細命名與 Endpoint Specification 留待後續工程階段。



\---



\# 21. API 與 Business Logic 邊界



API 本身不是 Business Logic。



基本架構：



```text

HTTP Request

&#x20;   ↓

Controller

&#x20;   ↓

Business Logic

&#x20;   ↓

Data Access

```



避免：



```text

HTTP Request

&#x20;   ↓

Controller

&#x20;   ↓

大量 SQL + Business Rule

```



Controller 的責任：



> 接收、轉換、呼叫、回應。



Business Logic 的責任：



> 判斷與執行業務。



\---



\# 22. API Error Handling



Backend 至少區分以下錯誤概念。



\## 22.1 Input Error



例如：



\- 缺少必要欄位

\- 格式錯誤

\- 不合法輸入



\## 22.2 Business Error



例如：



\- 不符合業務條件

\- 不允許進行該操作

\- 狀態不允許變更



\## 22.3 System Error



例如：



\- Database Error

\- 未預期程式錯誤

\- 系統內部錯誤



Frontend 應依 API Response 顯示適當錯誤訊息。



\---



\# 23. Business Block 架構



MVP Business Blocks：



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



PHASE 6 不因技術實作而新增產品 Block。



\---



\# 24. Customer Block



Customer 負責：



> 誰是客戶。



Customer 是 Customer 正式資料的主要責任來源。



基本關係：



```text

Customer

&#x20;   ↓

Pet

```



一個 Customer 可以有多隻 Pet。



Customer 不負責：



\- Pet 的核心資料

\- Appointment 的核心資料

\- Order 的核心資料

\- Payment 的核心資料



\---



\# 25. Pet Block



Pet 負責：



> 哪一隻寵物。



Pet 與 Customer 保持清楚的責任分離。



基本關係：



```text

Customer

&#x20;   ↓

Pet

```



Pet 不重複建立 Customer 的正式資料。



\---



\# 26. Service Block



Service 負責：



> 店家提供什麼服務。



Service 是服務定義。



Service 不等於：



\- Appointment

\- Grooming

\- Boarding

\- Order

\- Payment



實際服務發生於後續業務流程。



\---



\# 27. Appointment Block



Appointment 負責：



> 客戶預約了什麼、什麼時間來。



Appointment 不等於實際服務。



因此：



```text

Service

&#x20;   ↓

服務定義



Appointment

&#x20;   ↓

實際預約

```



Appointment 不負責：



\- 實際美容執行

\- 實際住宿生命週期

\- Order 核心資料

\- Payment 核心資料



\---



\# 28. Daily Operations Block



Daily Operations 負責：



> 店員每天工作的操作中心。



Daily Operations 可以操作與協調其他 Block。



例如：



```text

Appointment

&#x20;   ↓

Daily Operations

&#x20;   ↓

Grooming

&#x20;   ↓

Order

&#x20;   ↓

Payment

```



但：



> Daily Operations 不擁有其他 Block 的核心業務資料。



第一版不建立獨立 Daily Operations 資料來源。



Daily Operations 是：



> 操作中心。



不是：



> 新的業務資料中心。



\---



\# 29. Grooming Block



Grooming 負責：



> 實際美容執行。



基本概念：



```text

Appointment

&#x20;   ↓

到店

&#x20;   ↓

Grooming

&#x20;   ↓

美容執行

&#x20;   ↓

完成

```



因此：



> Appointment ≠ Grooming。



Grooming 不負責 Order 或 Payment 的核心責任。



\---



\# 30. Boarding Block



Boarding 負責：



> 實際住宿生命週期。



基本生命週期：



```text

預約住宿

&#x20;   ↓

入住

&#x20;   ↓

住宿中

&#x20;   ↓

退房

```



Boarding 不負責 Payment 的核心責任。



因此：



> Appointment ≠ Boarding。



\---



\# 31. Order Block



Order 負責：



> 客戶這次買了什麼。



Order 可以來自：



\- Appointment 服務

\- Walk-in 商品



因此：



> Order 不強制依賴 Appointment。



基本概念：



```text

Appointment Service

&#x20;       ↓

&#x20;      Order

```



以及：



```text

Walk-in Product

&#x20;       ↓

&#x20;      Order

```



\---



\# 32. Payment Block



Payment 負責：



> 客戶怎麼付款、付了多少。



因此：



```text

Order ≠ Payment

```



兩者必須維持獨立責任。



基本流程：



```text

Order

&#x20;   ↓

確認應付金額

&#x20;   ↓

Payment

&#x20;   ↓

付款完成

```



Payment 不取代 Order。



\---



\# 33. Product Block



Product 第一版只負責：



> 基本商品販售能力。



Product 不等於 Inventory。



第一版不建立完整 Inventory。



不延伸為：



\- 進貨

\- 供應商

\- 採購

\- 完整庫存管理

\- 庫存分析



\---



\# 34. Report Block



Report 負責：



> 基本營運統計。



Report 的資料應來自既有 Business Blocks。



例如：



```text

Appointment

&#x20;     +

Order

&#x20;     +

Payment

&#x20;     ↓

Report

```



Report 不建立另一套正式交易資料。



第一版不建立：



\- Data Warehouse

\- OLAP

\- BI Platform

\- 高階分析

\- 預測模型



\---



\# 35. Block Collaboration



Block 可以互相合作，但必須保持責任邊界。



基本概念：



```text

Block A

&#x20;   ↓

需要 Block B 的能力或資料

&#x20;   ↓

透過明確的 Business Logic / Interface

&#x20;   ↓

Block B

```



避免：



```text

Block A

&#x20;   ↓

直接修改

&#x20;   ↓

Block B 的核心資料

```



原則：



> 使用其他 Block 的能力，不接管其他 Block 的責任。



\---



\# 36. Block Dependency



Block 之間可以存在必要依賴。



依賴必須：



\- 清楚

\- 必要

\- 可理解

\- 避免循環

\- 不任意擴張



避免：



```text

A → B

B → C

C → A

```



形成循環依賴。



MVP 不建立大型 Dependency Management Framework。



\---



\# 37. Appointment / Grooming 關係



Appointment 負責：



> 預約。



Grooming 負責：



> 實際美容執行。



因此：



```text

Appointment

&#x20;   ↓

到店 / 工作開始

&#x20;   ↓

Grooming

&#x20;   ↓

美容完成

```



不能直接將 Appointment 視為 Grooming 完成紀錄。



\---



\# 38. Appointment / Boarding 關係



Appointment 可以代表住宿相關預約。



但實際住宿生命週期由 Boarding 負責。



```text

Appointment

&#x20;   ↓

住宿預約

&#x20;   ↓

Boarding

&#x20;   ↓

入住

&#x20;   ↓

住宿中

&#x20;   ↓

退房

```



因此：



> Appointment ≠ Boarding。



\---



\# 39. Order / Payment 關係



Order：



> 這次買了什麼。



Payment：



> 怎麼付款、付了多少。



兩者分開。



```text

Order

&#x20;   ↓

應付金額

&#x20;   ↓

Payment

```



Payment 不負責決定 Order 本身的內容。



\---



\# 40. Product / Order 關係



Product 負責商品定義。



Order 負責本次購買內容。



因此：



```text

Product

&#x20;   ↓

商品

&#x20;   ↓

Order

&#x20;   ↓

本次購買內容

```



Product 不等於 Order。



\---



\# 41. Database Responsibility



MySQL 是 MVP 正式資料儲存層。



正式業務資料由 MySQL 保存。



Backend 使用 mysql2 與 MySQL 溝通。



```text

Express.js

&#x20;   ↓

Data Access

&#x20;   ↓

mysql2

&#x20;   ↓

MySQL

```



Frontend 不直接連接 MySQL。



\---



\# 42. Database Access 原則



所有 Database Access 必須由 Backend 負責。



禁止：



```text

Next.js

&#x20;  ↓

MySQL

```



正式架構：



```text

Next.js

&#x20;  ↓

Express.js

&#x20;  ↓

mysql2

&#x20;  ↓

MySQL

```



\---



\# 43. SQL 使用原則



MVP 不使用 ORM，因此 Data Access 直接使用 SQL。



SQL 必須使用 Parameterized Query。



不得直接將使用者輸入字串拼接到 SQL。



目的：



\- 避免 SQL Injection

\- 保持 SQL 可讀性

\- 保持資料存取可控



\---



\# 44. Database Connection



Backend 使用 mysql2 Connection Pool。



基本概念：



```text

Express.js

&#x20;    ↓

mysql2 Pool

&#x20;    ↓

MySQL

```



不為每個 Request 建立永久獨立 Database Connection。



Connection Pool 的實際參數留待工程建置階段設定。



\---



\# 45. Transaction 原則



當一次業務操作包含多個必須同時成功或同時失敗的 Database 操作時，使用 Database Transaction。



例如：



```text

開始 Transaction

&#x20;      ↓

操作 A

&#x20;      ↓

操作 B

&#x20;      ↓

操作 C

&#x20;      ↓

全部成功

&#x20;      ↓

COMMIT

```



若必要操作失敗：



```text

開始 Transaction

&#x20;      ↓

操作 A

&#x20;      ↓

操作 B 失敗

&#x20;      ↓

ROLLBACK

```



Transaction 的目的：



> 保護同一業務操作的資料一致性。



不為所有單一 Database 操作無條件建立複雜 Transaction。



\---



\# 46. Transaction Responsibility



Transaction 應由 Business Logic 協調。



因為 Business Logic 知道：



> 哪些 Database 操作屬於同一個完整業務操作。



因此：



```text

Business Logic

&#x20;   ↓

Transaction Coordination

&#x20;   ↓

Data Access

&#x20;   ↓

MySQL

```



Data Access 負責執行資料庫操作。



\---



\# 47. Data Integrity



正式資料的一致性由 Application Layer 與 Database Layer 共同保護。



\## Application Layer



負責：



\- Business Rule

\- Input Validation

\- 狀態判斷



\## Database Layer



負責：



\- Primary Key

\- Foreign Key

\- Unique Constraint

\- NOT NULL

\- 基本資料型態限制



目的：



> Business Logic 與 Database Constraint 各自負責適合自己的資料完整性。



\---



\# 48. Database Schema 原則



PHASE 6 不詳細定義 Database Schema。



後續 Schema 設計必須遵守：



\- 依 Business Responsibility 建立資料

\- 避免重複正式資料來源

\- 保持清楚 Foreign Key 關係

\- 避免無意義的過度正規化

\- 避免無意義的大型共用 Table

\- 不為未來功能預建大量資料結構



詳細 Schema 留待後續 Database Design Phase。



\---



\# 49. Status Management 原則



需要狀態的 Business Block，應由該 Block 自己負責狀態定義。



例如：



```text

Appointment

&#x20;   ↓

Appointment Status

```



```text

Boarding

&#x20;   ↓

Boarding Status

```



```text

Payment

&#x20;   ↓

Payment Status

```



不得建立一個全系統共用的萬用 Status。



\---



\# 50. Business State Transition



狀態轉換必須由 Business Logic 控制。



例如：



```text

Appointment

&#x20;   ↓

預約

&#x20;   ↓

到店

&#x20;   ↓

服務中

&#x20;   ↓

完成

```



實際狀態名稱與完整 Transition 規則，於後續對應 Block Design 中定義。



PHASE 6 Freeze 的原則是：



> 狀態屬於 Business Block 的責任，不由 UI 任意修改。



\---



\# 51. Authentication Boundary



MVP 需要基本內部使用者 Authentication。



第一版：



\- 內部店家使用

\- 基本登入

\- 基本使用者身分



不建立：



\- SSO

\- MFA

\- Enterprise Identity Provider

\- 複雜 RBAC

\- 自訂 Permission Engine



Authentication 與 Authorization 在概念上保持分離。



但 MVP 不過度擴張 Authorization。



\---



\# 52. Security Minimum



MVP 必須具備基本安全措施。



至少包括：



\- Password 不以明文儲存

\- API Input Validation

\- Parameterized SQL

\- 基本 Authentication

\- 基本 Authorization

\- Frontend 不保存 Database Credential

\- 敏感設定不硬編碼於程式碼



安全措施以 MVP 合理程度為界。



不建立企業級 Security Platform。



\---



\# 53. Configuration



系統設定與敏感設定不得直接硬編碼於程式碼。



例如：



\- Database Host

\- Database User

\- Database Password

\- Database Name

\- API Port

\- Authentication Secret



應透過環境設定管理。



實際 Environment Variable 名稱留待工程建置階段定義。



\---



\# 54. Logging



Backend 應保留基本 Application Logging。



主要用途：



\- 啟動資訊

\- Error

\- Database Error

\- API Error

\- 重要系統事件



第一版不建立完整 Log Management Platform。



不建立：



\- ELK

\- Distributed Tracing Platform

\- Enterprise Observability Platform



除非後續產生實際需求。



\---



\# 55. Testing Architecture



MVP Testing 使用：



\- Jest

\- Supertest



基本測試層次：



```text

Business Logic

&#x20;     ↓

Jest

```



以及：



```text

HTTP API

&#x20;     ↓

Supertest

&#x20;     ↓

Express.js

```



必要時：



```text

API

&#x20;↓

Business Logic

&#x20;↓

Data Access

&#x20;↓

MySQL

```



進行 Integration Test。



\---



\# 56. Unit Test



Jest 用於測試可以獨立驗證的 Business Logic。



主要驗證：



\- Business Rule

\- 狀態判斷

\- 邊界條件

\- 錯誤條件



不要求所有程式碼追求極高測試覆蓋率。



重點：



> MVP 核心業務規則必須可被驗證。



\---



\# 57. API Test



Supertest 用於測試 Express API。



至少驗證：



\- HTTP Method

\- Endpoint

\- Request

\- Response

\- Status Code

\- Validation Error

\- Business Error

\- 成功流程



目的：



> 確認 Frontend 可以透過正式 API 正確使用 Backend。



\---



\# 58. Integration Test



需要跨越多個技術層次的核心流程，可以使用 Integration Test。



例如：



```text

API

&#x20;↓

Controller

&#x20;↓

Business Logic

&#x20;↓

Data Access

&#x20;↓

MySQL

```



Integration Test 的重點不是測試所有細節，而是確認：



> 關鍵業務流程在真實技術整合下可以正常運作。



\---



\# 59. Test Database



Testing 不應直接依賴正式 Production Database。



測試環境應使用獨立 Database 或測試資料庫環境。



目的：



\- 避免測試污染正式資料

\- 讓測試可以重複執行

\- 保持測試可控



具體 Test Database 建立方式留待工程建置階段。



\---



\# 60. Authentication 與 API 關係



Authentication 是 Backend API 的入口安全能力。



基本概念：



```text

Frontend

&#x20;   ↓

Authentication

&#x20;   ↓

API

&#x20;   ↓

Business Logic

```



API 不應只依賴 Frontend 判斷使用者是否登入。



Backend 必須自行驗證必要的 Authentication 狀態。



\---



\# 61. Daily Operations 與技術架構



Daily Operations 是操作中心。



技術上不建立獨立的 Daily Operations Database 作為第二套資料來源。



例如：



```text

Daily Operations UI

&#x20;       ↓

Appointment API

&#x20;       ↓

Appointment Business Logic

```



或：



```text

Daily Operations UI

&#x20;       ↓

Grooming API

&#x20;       ↓

Grooming Business Logic

```



Daily Operations 透過各自 Block 的能力完成操作。



因此：



> Daily Operations 不應變成一個巨大 Controller 或巨大 Service。



\---



\# 62. Block 與 Database 的關係



Business Block 不等於 Database Table。



這是一項重要原則。



例如：



```text

Customer Block

```



不代表：



```text

Customer Block = 一張 Table

```



同樣：



```text

Appointment Block

```



也不代表：



```text

Appointment Block = 一張 Table

```



Database Schema 應依正式資料與關係設計。



不能反過來：



> 為了讓資料表數量漂亮，而改變 Business Responsibility。



\---



\# 63. Block 與 API 的關係



Business Block 可以對應多個 API。



一個 API 也可能在一個完整業務操作中協調多個 Block。



因此：



```text

Business Block ≠ API Endpoint

```



API 應服務 Business Capability。



不能為了「每個資料表一個 API」而任意設計 API。



\---



\# 64. Block 與 UI 的關係



Business Block 也不等於 UI Page。



```text

Business Block

&#x20;   ↓

可能包含多個畫面

```



例如 Daily Operations 可以是一個操作中心，但其操作可能涉及：



\- Appointment

\- Grooming

\- Boarding

\- Order

\- Payment



這些仍然由各自 Block 負責正式業務資料。



\---



\# 65. Business Flow 與 Technical Flow



MVP 的核心技術流程應能支援：



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

Order

&#x20;   ↓

Payment

&#x20;   ↓

Report

```



這是技術架構必須支援的主要業務閉環。



但各階段仍維持自己的責任。



\---



\# 66. Walk-in Product Flow



MVP 也必須支援不經 Appointment 的商品銷售：



```text

Walk-in

&#x20;   ↓

Product

&#x20;   ↓

Order

&#x20;   ↓

Payment

```



因此技術架構不得設計成：



```text

Appointment

&#x20;   ↓

Order

```



並將 Appointment 視為所有 Order 的必要前置條件。



\---



\# 67. Appointment Service Flow



服務型交易可以形成：



```text

Customer

&#x20;   ↓

Pet

&#x20;   ↓

Appointment

&#x20;   ↓

Service

&#x20;   ↓

Grooming / Boarding

&#x20;   ↓

Order

&#x20;   ↓

Payment

```



其中：



\- Customer 負責客戶

\- Pet 負責寵物

\- Appointment 負責預約

\- Service 負責服務定義

\- Grooming / Boarding 負責實際執行

\- Order 負責本次購買內容

\- Payment 負責付款



\---



\# 68. 技術架構中的責任流



整體可以簡化為：



```text

UI

&#x20;↓

API

&#x20;↓

Business Logic

&#x20;↓

Data Access

&#x20;↓

Database

```



其中：



```text

UI

&#x20;↓

使用者操作

```



```text

API

&#x20;↓

系統入口

```



```text

Business Logic

&#x20;↓

業務判斷

```



```text

Data Access

&#x20;↓

資料庫操作

```



```text

Database

&#x20;↓

正式資料保存

```



\---



\# 69. 不允許的責任混合



以下設計不符合本 Phase：



\## 69.1 Frontend 直接操作 Database



```text

Frontend

&#x20;   ↓

MySQL

```



禁止。



\## 69.2 Controller 直接承擔全部 Business Logic



```text

Controller

&#x20;   ↓

大量 Business Rule

&#x20;   ↓

大量 SQL

```



禁止。



\## 69.3 Data Access 決定完整 Business Flow



```text

Data Access

&#x20;   ↓

Business Rule

&#x20;   ↓

Business Flow

```



禁止。



\## 69.4 Daily Operations 建立第二套核心資料



禁止。



\## 69.5 Report 建立第二套交易資料



禁止。



\---



\# 70. MVP 技術架構的簡化原則



當有兩種技術方案都能滿足 MVP 時：



> 優先選擇比較簡單的方案。



判斷順序：



1\. 是否能完成需求

2\. 是否容易理解

3\. 是否容易開發

4\. 是否容易測試

5\. 是否容易維護

6\. 是否避免不必要複雜度



不是：



> 哪一個架構最先進。



\---



\# 71. Future-proofing 原則



MVP 不為未來假設建立複雜架構。



例如目前不因為「未來可能變成 SaaS」就建立：



\- Multi-tenant Architecture

\- Tenant Isolation Framework

\- Enterprise IAM

\- Distributed Infrastructure



目前不因為「未來可能有大量商品」就建立完整 Inventory Platform。



目前不因為「未來可能要 BI」就建立 Data Warehouse。



原則：



> 真正需要時再設計。



\---



\# 72. PHASE 6 Freeze 決策總結



PHASE 6 正式 Freeze 以下技術架構：



\### Frontend



```text

Next.js

\+

JavaScript

\+

Bootstrap

```



\### Backend



```text

Express.js

\+

JavaScript

```



\### Database



```text

MySQL

```



\### Database Driver



```text

mysql2

```



\### Testing



```text

Jest

\+

Supertest

```



\### ORM



```text

不使用 ORM

```



\### Overall Architecture



```text

Next.js

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



\---



\# 73. PHASE 6 Freeze 的架構原則



正式 Freeze：



1\. Frontend 與 Backend 分離。

2\. Frontend 使用 Next.js。

3\. Frontend 使用 JavaScript。

4\. UI 使用 Bootstrap。

5\. Backend 使用 Express.js。

6\. Backend 使用 JavaScript。

7\. Database 使用 MySQL。

8\. Database Driver 使用 mysql2。

9\. 不使用 Prisma。

10\. 不使用 ORM。

11\. Testing 使用 Jest。

12\. API Testing 使用 Supertest。

13\. Frontend 不直接連接 MySQL。

14\. Controller 不承擔大量 Business Logic。

15\. Business Logic 是主要 Business Rule 執行位置。

16\. Data Access 負責 Database Access。

17\. Transaction 由 Business Logic 協調。

18\. Business Block 是主要業務責任邊界。

19\. Block 可以合作，但不得任意接管其他 Block 的責任。

20\. Daily Operations 不建立獨立核心資料來源。

21\. Order 不強制依賴 Appointment。

22\. Order 與 Payment 保持分離。

23\. Product 不等於 Inventory。

24\. Report 不建立第二套交易資料。

25\. MVP 不建立 Microservices。

26\. MVP 不建立大型 Enterprise Architecture。

27\. MVP 不為未來假需求提前工程化。



\---



\# 74. PHASE 6 Completion Criteria



PHASE 6 完成條件：



\- \[x] MVP 技術基線確認

\- \[x] Frontend 技術確認

\- \[x] Backend 技術確認

\- \[x] Database 技術確認

\- \[x] Database Driver 確認

\- \[x] ORM 使用策略確認

\- \[x] Testing 技術確認

\- \[x] 整體架構確認

\- \[x] Frontend Responsibility 確認

\- \[x] Backend Responsibility 確認

\- \[x] Data Access Responsibility 確認

\- \[x] API 基本邊界確認

\- \[x] Business Block 技術邊界確認

\- \[x] Block Collaboration 原則確認

\- \[x] Database Access 原則確認

\- \[x] Transaction 原則確認

\- \[x] Testing Architecture 確認

\- \[x] MVP 技術排除範圍確認

\- \[x] PHASE 6 Review 完成

\- \[x] PHASE 6 Freeze 完成



\---



\# 75. PHASE 6 最終狀態



\*\*PHASE 6 — MVP Architecture \& Technical Boundary\*\*



\*\*Status：FREEZE\*\*



本文件所定義之技術架構，為後續 MVP 工程設計與建置的技術基準。



後續 Phase 必須以本文件為基礎，不得自行推翻已 Freeze 的技術決策。



若後續發現：



\- Bug

\- 原決策互相矛盾

\- 技術實作限制



可以提出修正。



若發現：



\- 新需求

\- 另一種看起來更漂亮的架構

\- 未來可能需要的能力



不得直接修改本文件。



必須依既定 Change Request 規則處理。



\---



\# 76. Next Phase Boundary



PHASE 6 完成後，才可以進入下一階段工程設計。



下一階段必須承接：



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

```



後續 Phase 不得跳過既有 Freeze 決策。



PHASE 6 本身不代表開始撰寫程式。



它代表：



> MVP 的產品能力、業務 Block 與技術架構邊界已經具備進入後續工程設計的基礎。

