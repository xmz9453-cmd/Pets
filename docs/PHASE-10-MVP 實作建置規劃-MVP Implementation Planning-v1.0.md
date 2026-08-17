\# PHASE-10 — MVP 實作建置規劃

\## MVP Implementation Planning



\*\*Document ID:\*\* PHASE-10  

\*\*Document Name:\*\* MVP 實作建置規劃 — MVP Implementation Planning  

\*\*Version:\*\* v1.0  

\*\*Status:\*\* FREEZE  

\*\*Freeze Date:\*\* 2026-08-16



\---



\# 1. 文件目的



本文件定義 MVP 從規劃階段正式進入工程建置階段前的實作規劃。



本 Phase 不重新定義：



\- MVP Product Definition

\- Business Workflow

\- MVP Scope

\- MVP Block Map

\- MVP Block Design

\- MVP Architecture

\- Technical Baseline

\- Block Development Strategy



以上內容均已於 PHASE 1～PHASE 9 Freeze。



本文件的目的為：



> 將既有 Freeze 轉換成可以實際開始建置的工程執行計畫。



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

```



PHASE 1～PHASE 9 均維持原 Freeze 狀態。



\---



\# 3. PHASE 10 核心目標



PHASE 10 正式回答：



> 系統已經完成規劃，真正開始建置時應該怎麼開始？



核心範圍：



1\. 工程專案初始化

2\. Frontend / Backend / Database / Testing 基礎

3\. Foundation 驗證

4\. 第一個 Business Block

5\. Block 工程 Task 拆分

6\. Block 開發順序

7\. Block Testing

8\. Block Verification

9\. Incremental Integration

10\. MVP 最終完成條件



\---



\# 4. 最小工程初始化原則



正式工程建置採：



> \*\*Minimum Viable Engineering Foundation\*\*



初始化時只建立支撐第一個 Business Block 所需要的最小工程骨架。



概念結構：



```text

PSOP/

├── frontend/

├── backend/

├── database/

└── testing/

```



不提前建立大型 Enterprise Architecture。



\---



\# 5. Frontend / Backend Separation



Frontend 與 Backend 維持獨立。



概念：



```text

frontend/

&#x20;   ↓

Next.js



backend/

&#x20;   ↓

Express.js

```



兩者分別管理：



\- Package

\- Dependency

\- Source Code

\- Runtime

\- Build / Start Process



Frontend 不直接連接 MySQL。



\---



\# 6. Database 獨立管理



Database 為獨立工程資產。



概念：



```text

database/

├── migrations/

├── seeds/

└── ...

```



Backend：



```text

Express.js

&#x20;   ↓

mysql2

&#x20;   ↓

MySQL

```



SQL 不應散落成無法管理的獨立片段。



Database Schema 必須能夠被明確管理與重建。



\---



\# 7. Testing Environment



Testing 自專案初始化階段即建立。



概念：



```text

Development Database

&#x20;       ≠

Test Database

&#x20;       ≠

Production Database

```



Testing：



```text

Jest

\+

Supertest

```



不得使用 Production Database 執行測試。



\---



\# 8. Dependency 最小化原則



初始化時只安裝 MVP 當下真正需要的技術與套件。



既有技術基線：



```text

Frontend

Next.js

JavaScript

Bootstrap



Backend

Express.js

JavaScript



Database

MySQL

mysql2



Testing

Jest

Supertest

```



不提前加入：



\- ORM

\- Prisma

\- Redis

\- Queue

\- WebSocket

\- Elasticsearch

\- Message Broker

\- 其他未經需求證明必要的基礎設施



原則：



> 不為未來假需求提前工程化。



\---



\# 9. Foundation Verification



第一個 Business Block 開發前，必須先確認工程基礎可以正常運作。



至少驗證：



```text

Frontend

&#x20;   ↓

可以啟動



Backend

&#x20;   ↓

可以啟動



Database

&#x20;   ↓

可以連線



Testing

&#x20;   ↓

可以執行

```



\---



\# 10. Health Check



Foundation 階段建立最小 Health Check。



Backend 至少應能確認：



> Server 正常啟動。



Database 應能進行基本：



> Connection Check。



Health Check 屬於工程基礎能力。



它不是新的 Business Block。



\---



\# 11. Foundation PASS



Foundation 必須具備明確 PASS / FAIL 結果。



基本驗證：



| 項目 | 目標 |

|---|---|

| Frontend Start | PASS |

| Backend Start | PASS |

| MySQL Connection | PASS |

| Basic API | PASS |

| Test Execution | PASS |

| Health Check | PASS |



全部通過：



> \*\*FOUNDATION PASS\*\*



\---



\# 12. Foundation PASS 後的規則



Foundation PASS 後：



> 立即進入第一個正式 Business Block。



不建立額外的：



\- Architecture Demo

\- Prototype Module

\- Future Framework Demo

\- 無實際 Business Purpose 的展示功能



Foundation 的目的只有：



> 讓正式 Business Block 可以開始建置。



\---



\# 13. 第一個 Business Block



Foundation PASS 後第一個正式開發：



> \*\*Customer\*\*



理由：



1\. Customer 是核心 Master Data。

2\. 多個後續 Block 依賴 Customer。

3\. Customer 本身相對單純。

4\. 可以驗證完整 Vertical Slice。

5\. 適合作為第一個正式 Block。



\---



\# 14. Customer MVP Scope



Customer 第一版只建立 MVP 真正需要的能力：



\- Create Customer

\- Read Customer

\- Search Customer

\- Update Customer

\- Basic Validation



不建立：



\- CRM

\- Membership

\- Loyalty Points

\- Marketing

\- Customer Segmentation

\- Customer Analytics

\- 複雜 Customer Profile



\---



\# 15. Customer Delete Policy



Customer 第一版不提供直接永久 Delete。



主要操作：



```text

Create

Read

Search

Update

```



如未來需要停用 Customer，可採：



```text

Active

Inactive

```



等狀態管理方式。



目的：



> 避免 Customer 被歷史 Appointment、Order 等資料引用後直接刪除造成資料關聯問題。



\---



\# 16. Customer Data Scope



Customer 只建立 MVP 真正需要的資料欄位。



不提前加入：



\- 會員等級

\- 點數

\- 消費偏好

\- 行銷標籤

\- 社群整合

\- CRM Profile

\- 其他未被 MVP 需求證明必要的欄位



原則：



> Customer 不演變成 CRM。



\---



\# 17. Customer / Pet Relationship



正式維持：



```text

Customer

&#x20;  ├── Pet A

&#x20;  ├── Pet B

&#x20;  └── Pet C

```



即：



> 一個 Customer 可以擁有多隻 Pet。



Pet 必須屬於 Customer。



\---



\# 18. Customer / Pet Responsibility Boundary



Customer 負責：



> 誰是客戶。



Pet 負責：



> 哪一隻寵物。



Customer Block 不直接接管 Pet Block 的核心 Business Responsibility。



即使 Customer UI 需要顯示或選擇 Pet：



> Pet 的資料與 Business Rule 仍由 Pet Block 負責。



\---



\# 19. Customer Search



Customer 第一版提供基本搜尋。



至少支援：



\- 姓名

\- 電話



目標：



> 櫃台可以快速找到既有 Customer。



不建立 Enterprise Search。



\---



\# 20. Customer Search Complexity



第一版不建立複雜：



\- Search Engine

\- Elasticsearch

\- Advanced Filter Framework

\- 複雜 Query Builder

\- 大型 Pagination Framework



維持：



> Basic List + Search + 必要排序。



\---



\# 21. Customer Engineering Task Structure



Customer Block 必須拆成工程 Task。



概念：



```text

Customer

├── Database

├── Data Access

├── Business Logic

├── API

├── Frontend

└── Testing

```



這些 Task：



> 仍屬於同一個 Customer Business Block。



不能將上述工程層誤視為新的 Business Block。



\---



\# 22. Task 拆分原則



工程 Task 優先依：



> Engineering Responsibility



拆分。



不以 UI Page 作為唯一拆分方式。



例如：



```text

Customer Database

Customer Data Access

Customer Business Logic

Customer API

Customer Frontend

Customer Testing

```



而不是單純：



```text

Customer List Page

Customer Create Page

Customer Edit Page

```



\---



\# 23. Customer Database Verification



Customer Database 建立完成後，先進行基本驗證：



\- Table 可以建立

\- Primary Key 正常

\- 必要欄位正常

\- 必要 Constraint 正常

\- Insert 正常

\- Select 正常



目的：



> 提前隔離 Database 問題。



\---



\# 24. API Contract



Customer API 開發前必須先確認該 Block 所需的 API Contract。



第一版概念：



```text

Create Customer

Get Customer

List / Search Customer

Update Customer

```



不提前建立：



\- CRM API

\- Marketing API

\- Loyalty API

\- Customer Analytics API



\---



\# 25. API Error Contract



API 採一致的基本錯誤分類。



至少能區分：



```text

Success

Validation Error

Not Found

Business Error

Server Error

```



不建立複雜 Enterprise Error Framework。



目的：



> Frontend 可以穩定理解 Backend Response。



\---



\# 26. Validation Strategy



輸入驗證採：



```text

User Input

&#x20;   ↓

Frontend Validation

&#x20;   ↓

Backend Validation

&#x20;   ↓

Business Logic

```



Frontend：



> 改善操作體驗。



Backend：



> 作為最終驗證標準。



Frontend 不得成為唯一的 Business Rule 防線。



\---



\# 27. Not Found Handling



如果 Customer 不存在：



> 必須明確回傳 Not Found。



不得將一般的：



> Resource Not Found



誤當成：



> Server Error。



目的：



> 讓 Frontend 可以正確處理不同情況。



\---



\# 28. Customer Frontend Priority



Customer UI 以櫃台實際工作為主要使用情境。



優先：



```text

搜尋客戶

&#x20;   ↓

查看客戶

&#x20;   ↓

新增客戶

&#x20;   ↓

修改客戶

```



而不是優先建立：



\- Dashboard

\- 視覺化展示

\- 複雜動畫

\- 非必要裝飾



核心原則：



> 好用、快速、清楚。



\---



\# 29. Responsive Requirement



Customer 第一版至少支援：



\- Desktop

\- 一般平板寬度



不要求第一版即對所有手機尺寸進行極致最佳化。



Bootstrap 提供基本 Responsive 能力。



\---



\# 30. Authentication / Authorization Boundary



Customer Block 不需要先建立完整企業級權限系統。



維持 MVP Boundary：



> 不建立 Enterprise RBAC。



如當下需要最低限度的 Authentication / Access Boundary，僅建立實際需要的能力。



不得因 Customer Block 提前建立完整：



\- RBAC

\- Permission Matrix Framework

\- SSO

\- MFA

\- Enterprise Identity System



\---



\# 31. Customer Automated Testing



Customer 必須包含：



\### Business Logic



使用：



> Jest Unit Test



驗證：



\- 正常流程

\- Business Rule

\- Validation

\- 邊界情況

\- 重要錯誤情況



\---



\# 32. Customer API / Integration Testing



API 使用：



> Jest + Supertest



驗證：



```text

HTTP Request

&#x20;   ↓

Routing

&#x20;   ↓

Validation

&#x20;   ↓

Controller

&#x20;   ↓

Business Logic

&#x20;   ↓

Data Access

&#x20;   ↓

MySQL

```



確認各層可以正確合作。



\---



\# 33. Customer Operational Verification



Automated Test PASS 後，仍必須進行 Browser 操作驗證。



至少實際完成：



```text

Create Customer

&#x20;   ↓

Read Customer

&#x20;   ↓

Search Customer

&#x20;   ↓

Update Customer

```



Frontend：



```text

Browser

&#x20;   ↓

Next.js

&#x20;   ↓

Express.js

&#x20;   ↓

Business Logic

&#x20;   ↓

mysql2

&#x20;   ↓

MySQL

```



必須真正可以操作。



\---



\# 34. Customer Verification Record



Customer Block 完成後建立：



> \*\*Customer Block Verification Record\*\*



至少記錄：



```text

Customer Block

Version: v1.0



Database ........ PASS

Data Access ...... PASS

Business Logic ... PASS

API .............. PASS

Frontend .......... PASS

Automated Test .... PASS

Operational Test .. PASS



Result:

BLOCK PASS

```



\---



\# 35. Customer Block Freeze



Customer 完成全部 Definition of Done 後：



```text

Customer BLOCK PASS

&#x20;       ↓

Customer BLOCK FREEZE

```



Freeze 代表：



> Customer v1.0 已達到既定 MVP 完成標準。



\---



\# 36. 後續 Block 開發順序



Customer Freeze 後：



```text

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



此順序為：



> 初始 Engineering Roadmap。



不是重新定義 Business Responsibility。



\---



\# 37. Pet Block



Customer PASS / Freeze 後進入：



> Pet



Pet 第一版包含：



\- Create

\- Read

\- Update

\- 基本搜尋／選擇

\- Basic Validation

\- Customer Relationship



不包含：



\- Medical Management

\- 複雜 Health Record

\- Smart Care

\- Pet Social

\- 完整醫療履歷



\---



\# 38. Pet Relationship Rule



Pet 不可脫離 Customer 單獨建立。



基本關係：



```text

Customer

&#x20;   ↓

Pet

```



一個 Customer 可以有多個 Pet。



\---



\# 39. Service Block



Pet 後進入：



> Service



Service 第一版只負責：



> 店家提供什麼服務。



例如：



\- Grooming

\- Bath

\- Haircut

\- Boarding



以及 MVP 所需的基本：



\- Service Name

\- Basic Price

\- Active / Inactive



\---



\# 40. Service / Order Boundary



Service：



> 定義店家提供什麼。



Order：



> 定義客戶這次買了什麼。



因此：



```text

Service

&#x20;   ≠

Order

```



Service 不接管 Order。



\---



\# 41. Pricing Boundary



Service 第一版採：



> Basic Service Price。



不建立：



\- Dynamic Pricing Engine

\- Membership Price

\- Time-based Pricing

\- Multi-level Discount

\- Automated Quote Engine



原則：



> 先滿足 MVP 真正需要的基本價格。



\---



\# 42. Appointment Development Condition



Appointment 必須等待：



```text

Customer PASS

&#x20;   +

Pet PASS

&#x20;   +

Service PASS

&#x20;       ↓

Appointment

```



原因：



> Appointment 需要同時使用 Customer、Pet、Service。



\---



\# 43. Appointment MVP Scope



第一版包含：



\- Create Appointment

\- Read Appointment

\- Update Appointment

\- Cancel Appointment

\- Appointment Date

\- Appointment Time

\- Customer

\- Pet

\- Service

\- Notes

\- Basic Status



不包含：



\- Online Self Booking

\- LINE API

\- Automatic Scheduling Engine

\- Complex Capacity Planning

\- Smart Dispatch

\- Advanced Auto Assignment



\---



\# 44. Appointment Cancellation



Appointment 取消採：



> Status Change



而非直接刪除。



概念：



```text

Scheduled

&#x20;   ↓

Cancelled

```



保留歷史紀錄。



\---



\# 45. Appointment Integration Verification



Appointment PASS 後立即進行：



> Incremental Integration Verification。



至少驗證：



```text

Customer

&#x20;   ↓

Pet

&#x20;   ↓

Service

&#x20;   ↓

Appointment

```



確認：



\- Customer 可以正確選擇

\- Pet 可以正確選擇

\- Service 可以正確選擇

\- Appointment 可以建立

\- Appointment 可以修改

\- Appointment 可以取消

\- 關聯資料正確



不等待所有 Block 完成才進行 Integration。



\---



\# 46. Daily Operations



Appointment PASS 後進入：



> Daily Operations



Daily Operations 負責：



> 店員每天工作的操作中心。



第一版不建立自己的核心資料來源。



它主要使用其他 Block 的正式資料。



例如：



```text

Appointment

&#x20;   ↓

Daily Operations

&#x20;   ↓

顯示今天工作

```



\---



\# 47. Daily Operations Data Boundary



Daily Operations：



> 可以操作其他 Block。



但是：



> 不擁有其他 Block 的核心 Business Data。



不建立第二套：



\- Appointment Data

\- Grooming Data

\- Boarding Data

\- Order Data



等核心資料來源。



\---



\# 48. Daily Operations UI



Daily Operations 是店員日常使用的重要工作畫面。



概念：



```text

今天

│

├── 待處理預約

├── 今日服務

├── 住宿

├── 進行中工作

└── 待完成工作

```



目標：



> 讓店員快速知道今天要做什麼。



\---



\# 49. Grooming / Boarding



Grooming 與 Boarding 維持：



```text

Grooming

&#x20;   ≠

Boarding

```



Grooming：



> 實際美容執行。



Boarding：



> 實際住宿生命週期。



兩者維持獨立 Business Block。



\---



\# 50. Grooming MVP Scope



Grooming 第一版只建立實際美容執行所需要的能力。



基本狀態概念：



```text

待美容

&#x20;   ↓

美容中

&#x20;   ↓

美容完成

```



以及必要的：



\- 執行資訊

\- 基本備註

\- 完成狀態



不建立：



\- 複雜排程

\- 自動派工

\- 複雜美容師績效分析

\- 醫療紀錄



\---



\# 51. Boarding MVP Scope



Boarding 第一版建立基本住宿生命週期：



```text

預約住宿

&#x20;   ↓

入住

&#x20;   ↓

住宿中

&#x20;   ↓

退房

```



必要時保留：



\- 入住資訊

\- 退房資訊

\- 基本備註



不建立：



\- 複雜照護排程

\- 醫療管理

\- 自動容量排程

\- 複雜住宿計價引擎



\---



\# 52. Order Development



Grooming / Boarding 等服務執行能力完成後：



> Order



Order 負責：



> 客戶這次買了什麼。



來源可以包括：



\- Appointment 服務

\- Walk-in 商品



維持：



> Order 不強制依賴 Appointment。



\---



\# 53. Service / Order Relationship



實際流程：



```text

Service Definition

&#x20;       ↓

實際服務

&#x20;       ↓

Order

```



但：



> Service 不負責建立 Order。



Order 是正式的交易資料來源。



\---



\# 54. Payment Development



Order 後進入：



> Payment



維持：



```text

Order

&#x20;   ↓

Payment

```



Order 負責：



\- 商品／服務明細

\- 金額計算



Payment 負責：



\- 付款方式

\- 實際付款金額

\- 付款狀態



因此：



> Order ≠ Payment



\---



\# 55. Product Development



Payment 後進入：



> Product



第一版只提供：



> 基本商品資料與商品販售能力。



不建立：



> 完整 Inventory。



不提前建立：



\- Supplier

\- Purchasing

\- Receiving

\- Stock Management

\- Advanced Inventory



\---



\# 56. Report Development



Report 最後開發。



依賴：



```text

Customer

Pet

Appointment

Grooming

Boarding

Order

Payment

Product

&#x20;       ↓

Report

```



Report：



> 只讀取既有正式資料。



不建立第二套：



> Transaction Data。



不建立 Enterprise BI。



\---



\# 57. Incremental Integration



Integration 採：



> \*\*Incremental Integration\*\*



概念：



```text

Customer PASS

&#x20;   ↓

Pet PASS

&#x20;   ↓

Customer + Pet Integration

&#x20;   ↓

Service PASS

&#x20;   ↓

Appointment PASS

&#x20;   ↓

Customer + Pet + Service + Appointment

Integration

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



\---



\# 58. Integration Responsibility



Integration 的目的：



> 驗證 Block 之間可以正確合作。



Integration 不建立第三套 Business Logic。



如果 Integration 發現問題：



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



不得為了讓 Integration PASS 而偷偷加入特殊 Business Rule。



\---



\# 59. E2E Testing Scope



目前 MVP 不導入：



\- Playwright

\- Cypress

\- 其他專用 E2E Framework



目前採：



```text

Jest

\+

Supertest

\+

Browser Operational Verification

```



理由：



> MVP 第一版不為測試工具本身增加不必要的工程複雜度。



\---



\# 60. MVP Final Completion



MVP 不以：



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

Operational Validation

&#x20;       ↓

MVP COMPLETE

```



\---



\# 61. MVP Happy Path



最終必須真正完成核心營運閉環：



```text

Customer

→ Pet

→ Appointment

→ Daily Operations

→ Grooming / Boarding

→ Service Complete

→ Order

→ Payment

→ Basic Report

```



必須能在實際系統中完成。



不能只靠：



> 各 Block 個別 PASS



就宣告 MVP 完成。



\---



\# 62. PHASE 10 Definition of Done



PHASE 10 完成條件：



| 項目 | Status |

|---|---|

| Project Initialization Strategy | PASS |

| Frontend / Backend Separation | PASS |

| Database Management Strategy | PASS |

| Testing Environment Strategy | PASS |

| Dependency Minimization | PASS |

| Foundation Verification | PASS |

| Health Check | PASS |

| Foundation PASS Definition | PASS |

| First Business Block | PASS |

| Customer Scope | PASS |

| Customer Task Structure | PASS |

| Customer Testing | PASS |

| Customer Verification | PASS |

| Pet Development Strategy | PASS |

| Service Development Strategy | PASS |

| Appointment Development Strategy | PASS |

| Daily Operations Strategy | PASS |

| Grooming Strategy | PASS |

| Boarding Strategy | PASS |

| Order Strategy | PASS |

| Payment Strategy | PASS |

| Product Strategy | PASS |

| Report Strategy | PASS |

| Integration Strategy | PASS |

| MVP Completion Strategy | PASS |



\---



\# 63. PHASE 10 Freeze Summary



PHASE 10 正式 Freeze 以下決策：



1\. MVP 工程建置採最小可用工程骨架。

2\. Frontend / Backend 維持獨立專案邊界。

3\. Database 獨立管理。

4\. Testing 從專案初始化階段建立。

5\. Development / Test / Production Database 分離。

6\. 只安裝目前真正需要的技術與依賴。

7\. Foundation 必須先 PASS。

8\. Foundation 建立最小 Health Check。

9\. Foundation PASS 後直接進入正式 Business Block。

10\. 第一個正式 Business Block 為 Customer。

11\. Customer 第一版只做 Create / Read / Search / Update / Basic Validation。

12\. Customer 第一版不提供永久 Delete。

13\. Customer 不演變成 CRM。

14\. Customer 可以擁有多隻 Pet。

15\. Pet 維持獨立 Business Block。

16\. Customer Search 以姓名／電話為主要基本搜尋。

17\. Customer 不建立複雜 Search Engine。

18\. Customer Engineering Task 依工程責任拆分。

19\. Customer Database 先進行獨立基本驗證。

20\. API Contract 在 Block 開發前確認。

21\. API 使用一致的基本 Error Contract。

22\. Frontend 與 Backend 均進行 Validation，Backend 為最終標準。

23\. Customer UI 優先服務櫃台實際操作。

24\. Customer 第一版支援基本 Responsive。

25\. Customer 不提前建立 Enterprise RBAC。

26\. Customer 必須通過 Unit Test。

27\. Customer API 必須通過 Jest + Supertest。

28\. Customer 必須通過 Browser Operational Verification。

29\. 每個 Block 必須建立可追蹤 Verification Record。

30\. Block PASS 後進入 Block Freeze。

31\. Customer 後續依序進入 Pet、Service、Appointment。

32\. Appointment 必須依賴已完成的 Customer、Pet、Service。

33\. Appointment 取消採 Status Change，不直接 Delete。

34\. Appointment PASS 後立即進行 Incremental Integration。

35\. Daily Operations 不建立第二套核心資料來源。

36\. Daily Operations 作為店員每日工作中心。

37\. Grooming 與 Boarding 維持獨立 Business Block。

38\. Grooming 第一版只做基本美容執行生命週期。

39\. Boarding 第一版只做基本住宿生命週期。

40\. Order 統一管理客戶這次購買的服務／商品。

41\. Order 不強制依賴 Appointment。

42\. Payment 與 Order 維持分離。

43\. Product 第一版不等於 Inventory。

44\. Report 最後開發。

45\. Report 只讀取既有正式交易資料。

46\. Integration 採 Incremental Integration。

47\. Integration 不建立第二套 Business Logic。

48\. MVP 暫不導入 Playwright / Cypress 等專用 E2E Framework。

49\. MVP 最終必須通過所有 Required Blocks。

50\. MVP 最終必須通過 Incremental Integration。

51\. MVP 最終必須通過 Happy Path。

52\. MVP 最終必須通過實際 Operational Validation。

53\. 不因工程便利任意改變既有 Business Responsibility。

54\. 不為未來假需求提前工程化。



\---



\# 64. PHASE 10 Final Status



\*\*PHASE-10 — MVP 實作建置規劃\*\*



\*\*Version:\*\* v1.0



\*\*Status:\*\* FREEZE



\*\*Freeze Date:\*\* 2026-08-16



PHASE 10 至此正式完成。



目前專案已完成：



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

```



下一階段不再進行 MVP 規劃 Phase 的重新設計。



正式工程建置將依照：



```text

Foundation Setup

&#x20;   ↓

Foundation PASS

&#x20;   ↓

Customer Block

&#x20;   ↓

Customer PASS

&#x20;   ↓

Customer FREEZE

&#x20;   ↓

Pet Block

&#x20;   ↓

Pet PASS

&#x20;   ↓

Pet FREEZE

&#x20;   ↓

Service Block

&#x20;   ↓

Service PASS

&#x20;   ↓

Service FREEZE

&#x20;   ↓

Appointment Block

&#x20;   ↓

Incremental Integration

&#x20;   ↓

後續 Block 依序建置

```



執行。



任何與本文件 Freeze 決策不同的方案，必須依既有 Change Request 規則處理。



\# END OF PHASE 10

