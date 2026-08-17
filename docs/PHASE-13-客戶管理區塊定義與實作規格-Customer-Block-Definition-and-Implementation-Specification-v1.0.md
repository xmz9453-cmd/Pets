\# PHASE-13 — Customer 客戶管理區塊定義與實作規格

\## Customer Block Definition and Implementation Specification



\*\*Document ID:\*\* PHASE-13  

\*\*Document Name:\*\* Customer 客戶管理區塊定義與實作規格 — Customer Block Definition and Implementation Specification  

\*\*Version:\*\* v1.0  

\*\*Status:\*\* FREEZE  

\*\*Freeze Date:\*\* 2026-08-16  

\*\*Project:\*\* MVP 寵物美容／寵物住宿工作室營運管理系統  

\*\*Document Type:\*\* Phase Specification  

\*\*Previous Phase:\*\* PHASE-12 — Foundation Implementation and Verification  

\*\*Next Phase:\*\* PHASE-14  



\---



\# 1. 文件目的



本文件定義 MVP 第一個 Business Block：



> \*\*Customer — 客戶管理\*\*



PHASE 13 的目的，是將前面 Phase 已完成的 Customer Block Design，進一步轉換成可以進入實際工程建置的完整規格。



本文件不是完整系統規格。



本文件只定義 Customer Block 自身的：



\- 業務責任

\- 資料

\- 狀態

\- 業務規則

\- 操作

\- API

\- Backend Layer

\- Database Boundary

\- Frontend

\- Validation

\- Testing

\- Browser Verification

\- PASS Criteria



\---



\# 2. Phase Status



\*\*Status：FREEZE\*\*



PHASE 13 已完成：



\- Batch 1：Q1～Q10

\- Batch 2：Q11～Q20

\- Batch 3：Q21～Q30

\- Batch 4：Q31～Q40

\- Consistency Review

\- Phase Review

\- Freeze



本文件為 PHASE 13 正式 Freeze 文件。



\---



\# 3. Phase 核心目標



PHASE 13 的核心目標：



> 建立第一個真正可運作的 Business Block：Customer。



Customer Block 必須能完成：



```text

建立 Customer

&#x20;   ↓

Customer List

&#x20;   ↓

搜尋 Customer

&#x20;   ↓

查看 Customer

&#x20;   ↓

修改 Customer

&#x20;   ↓

停用 Customer

&#x20;   ↓

驗證結果

&#x20;   ↓

Customer Block PASS

```



\---



\# 4. PHASE 13 輸入



PHASE 13 承接：



\- PHASE 1 — MVP Product Definition

\- PHASE 2 — Business Workflow \& Operational Decisions

\- PHASE 3 — MVP Scope \& Product Boundary

\- PHASE 4 — MVP Block Map

\- PHASE 5 — MVP Block Design

\- PHASE 6 — MVP Architecture \& Technical Boundary

\- PHASE 7 — Engineering / Development Decisions

\- PHASE 8 — Development Foundation

\- PHASE 9 — MVP Block Development Strategy

\- PHASE 10 — MVP Implementation Planning

\- PHASE 11 — Engineering Foundation Specification

\- PHASE 12 — Foundation Implementation \& Verification



PHASE 13 不重新定義以上 Phase。



\---



\# 5. Customer Block 定義



\## 5.1 Block Name



\*\*Customer\*\*



中文：



> 客戶管理



\---



\## 5.2 Customer 核心責任



Customer 負責：



> \*\*誰是客戶。\*\*



Customer 是系統中客戶主資料的唯一主要責任來源。



\---



\# 6. Customer Responsibility Boundary



Customer 負責：



\- Customer Identity

\- Customer Basic Information

\- Customer Contact Information

\- Customer Status

\- Customer Lifecycle

\- Customer Search

\- Customer Create

\- Customer Read

\- Customer Update

\- Customer Deactivate



Customer 不負責：



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



\---



\# 7. Customer 與其他 Block 的關係



Customer 是其他 Business Block 的重要資料來源。



概念：



```text

Customer

&#x20;  │

&#x20;  ├── Pet

&#x20;  ├── Appointment

&#x20;  ├── Order

&#x20;  └── Payment

```



但 Customer 不擁有上述 Block 的資料。



例如：



> Customer 可以被 Appointment 使用，但 Appointment 的資料仍由 Appointment Block 負責。



\---



\# 8. Customer Data Definition



第一版 Customer 核心資料：



| 欄位 | Required | 說明 |

|---|---|---|

| Customer ID | Yes | 系統內部唯一識別 |

| Name | Yes | 客戶姓名 |

| Phone | Yes | 客戶主要電話 |

| Address | No | 客戶地址 |

| LINE ID | No | 客戶 LINE 識別資料 |

| Note | No | Customer-level 備註 |

| Status | Yes | ACTIVE / INACTIVE |

| Created At | Yes | 建立時間 |

| Updated At | Yes | 最後修改時間 |



\---



\# 9. Customer ID



Customer ID：



> 由系統自動產生。



店員不得手動輸入 Customer ID。



Customer ID 是：



> System-level Identifier。



Customer ID 不等同於：



\- Phone

\- Name

\- LINE ID



\---



\# 10. Phone Business Rule



Phone：



\- Required

\- Business-level Unique



相同 Phone 不允許建立第二個 Customer。



概念：



```text

Existing Customer

Phone = X



New Customer

Phone = X



&#x20;       ↓



Reject

```



Phone Unique 是 Business Rule。



同時應由 Database Constraint 提供最後一層資料完整性保護。



\---



\# 11. Phone 與 Customer ID 的責任區分



兩者不可混為一談。



```text

Customer ID

&#x20;   ↓

System Identity



Phone

&#x20;   ↓

Business-level Unique

```



Customer ID 是穩定的系統識別。



Phone 是店家業務上重要的客戶識別條件。



\---



\# 12. Name



Name：



> Required。



建立 Customer 時必須提供。



Name 用於：



\- Customer List

\- Customer Detail

\- Customer Search

\- Customer Identification



\---



\# 13. Address



Address：



> Optional。



客戶可以沒有 Address。



建立 Customer 不得因 Address 空白而失敗。



第一版不建立：



\- 地址驗證

\- 地址標準化

\- GIS

\- 地圖服務

\- 地理編碼



\---



\# 14. LINE ID



LINE ID：



> Optional。



LINE ID 可以保存，但：



> PHASE 13 不實作 LINE API Integration。



因此：



```text

LINE ID Storage

&#x20;   ≠

LINE Integration

```



\---



\# 15. Customer Note



Note：



> Optional。



Note 僅代表：



> Customer-level Note。



不得用 Customer Note 取代：



\- Pet Note

\- Appointment Note

\- Grooming Record

\- Boarding Record

\- Order Note



各 Block 的專屬資料仍由各自 Block 負責。



\---



\# 16. Customer Status



第一版 Status：



```text

ACTIVE

INACTIVE

```



\---



\# 17. ACTIVE



ACTIVE 表示：



> Customer 為目前可正常使用的客戶資料。



ACTIVE Customer：



\- 可被搜尋

\- 可被查看

\- 可被修改

\- 可被後續 Block 使用



\---



\# 18. INACTIVE



INACTIVE 表示：



> Customer 已停用，但資料仍保留。



INACTIVE Customer：



\- 不應在預設 Customer List 中出現

\- 仍可被查看

\- 歷史資料仍保留

\- 不應被直接刪除



\---



\# 19. Customer Delete Policy



第一版：



> 不提供一般 Hard Delete。



停用 Customer 使用：



```text

Status = INACTIVE

```



而不是：



```text

DELETE Customer

```



原因：



Customer 可能已經被：



\- Pet

\- Appointment

\- Order

\- Payment



等資料引用。



因此必須保留歷史資料完整性。



\---



\# 20. Customer Lifecycle



Customer 第一版生命週期：



```text

CREATE

&#x20; ↓

ACTIVE

&#x20; ↓

UPDATE

&#x20; ↓

INACTIVE

```



一般情況下：



```text

INACTIVE

```



代表停止使用，而不是資料消失。



\---



\# 21. Customer Create



建立 Customer 必須提供：



\- Name

\- Phone



可以提供：



\- Address

\- LINE ID

\- Note



系統自動產生：



\- Customer ID

\- Status

\- Created At

\- Updated At



預設：



```text

Status = ACTIVE

```



\---



\# 22. Customer Update



建立後允許修改：



\- Name

\- Phone

\- Address

\- LINE ID

\- Note

\- Status（依既定操作規則）



不得由一般使用者修改：



\- Customer ID

\- Created At



Updated At 由系統更新。



\---



\# 23. Customer Deactivate



停用 Customer：



```text

Customer

&#x20;   ↓

Status = INACTIVE

```



不刪除 Customer。



停用前必須要求使用者確認。



概念：



```text

\[停用]

&#x20;  ↓

確認

&#x20;  ↓

確定

&#x20;  ↓

INACTIVE

```



\---



\# 24. Customer Search



第一版 Customer Search 支援：



\- Name

\- Phone



不建立複雜搜尋系統。



不包含：



\- Elasticsearch

\- Advanced Search Engine

\- Filter Builder

\- BI Search

\- 複雜條件組合器



\---



\# 25. Customer List



Customer List 預設：



> 顯示 ACTIVE Customer。



可以提供查看 INACTIVE Customer 的方式。



目的：



> 讓櫃台日常工作畫面保持乾淨。



\---



\# 26. Customer Detail



Customer Detail 至少顯示：



```text

Customer Detail

├── Customer ID

├── Name

├── Phone

├── Address

├── LINE ID

├── Note

├── Status

├── Created At

└── Updated At

```



PHASE 13 不提前加入其他 Block 的資料。



例如：



```text

Pets

Appointments

Orders

```



等內容應由後續 Block 完成後再進行 Integration。



\---



\# 27. Customer API



Customer API 採：



> REST API。



基本 Endpoint：



```text

GET    /api/customers

GET    /api/customers/:id

POST   /api/customers

PATCH  /api/customers/:id

```



\---



\# 28. Customer List API



```text

GET /api/customers

```



用途：



> 取得 Customer List。



至少支援：



\- ACTIVE / INACTIVE 的狀態控制

\- Name Search

\- Phone Search

\- Pagination



\---



\# 29. Customer Detail API



```text

GET /api/customers/:id

```



用途：



> 取得單一 Customer 詳細資料。



不存在時：



> 回傳明確的 Not Found 結果。



\---



\# 30. Customer Create API



```text

POST /api/customers

```



Request 至少包含：



```text

name

phone

```



Optional：



```text

address

lineId

note

```



系統產生：



```text

id

status

createdAt

updatedAt

```



\---



\# 31. Customer Update API



```text

PATCH /api/customers/:id

```



用途：



> 修改 Customer。



不可透過一般 Update 修改：



```text

Customer ID

Created At

```



\---



\# 32. Pagination



Customer List 第一版採基本 Pagination。



概念：



```text

GET /api/customers?page=1\&limit=20

```



Pagination 不需要建立複雜搜尋架構。



基本目的：



> 避免 Customer 數量增加後一次載入全部資料。



\---



\# 33. Backend Layer



Customer Backend：



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



\---



\# 34. Controller Responsibility



Controller 負責：



\- 接收 HTTP Request

\- 取得 Request Parameters

\- 呼叫 Business Logic

\- 產生 HTTP Response

\- 基本 HTTP Error Mapping



Controller 不負責大量 Business Rule。



\---



\# 35. Business Logic Responsibility



Customer Business Logic 負責：



\- Customer Create Rule

\- Customer Update Rule

\- Duplicate Phone Rule

\- Status Rule

\- Deactivation Rule

\- Business Validation Coordination



Business Rule 必須集中於 Business Logic。



\---



\# 36. Data Access Responsibility



Customer Data Access 負責：



\- SELECT

\- INSERT

\- UPDATE

\- Database Query

\- Database Parameter Binding



Data Access 不負責：



\- HTTP

\- UI

\- Customer-facing Message

\- Business Workflow



\---



\# 37. Database Access



Customer Data Access 使用：



```text

mysql2

```



SQL 直接由 Data Access 層管理。



不使用 ORM。



\---



\# 38. Validation Boundary



Customer Validation 採：



```text

Frontend Validation

&#x20;       ↓

Backend Validation

&#x20;       ↓

Business Rule

&#x20;       ↓

Database Constraint

```



Frontend Validation：



> 提供良好的使用者體驗。



Backend Validation：



> 提供正式 Business Boundary。



Database Constraint：



> 提供資料完整性最後保護。



\---



\# 39. Required Field Validation



Create Customer：



```text

Name

Phone

```



為 Required。



缺少 Required Field：



> Request 必須被拒絕。



\---



\# 40. Phone Validation



Phone 必須進行基本格式驗證。



至少：



\- 不允許明顯非法格式

\- 不應包含不必要的空白

\- 儲存格式保持一致



第一版不建立複雜國際電話驗證系統。



\---



\# 41. Duplicate Phone Rule



當 Phone 已存在：



```text

POST /api/customers

&#x20;       ↓

Check Existing Phone

&#x20;       ↓

Exists

&#x20;       ↓

Reject

```



不得默默建立第二筆 Customer。



\---



\# 42. Business Error



Duplicate Phone 應產生明確 Business Error。



概念：



```text

CUSTOMER\_PHONE\_EXISTS

```



Frontend 再將 Business Error 轉成店家容易理解的訊息。



不應將 MySQL 原始 Error String 直接顯示給使用者。



\---



\# 43. Status Validation



Status 只能使用：



```text

ACTIVE

INACTIVE

```



其他值：



> Reject。



避免 Database 出現未定義的 Status。



\---



\# 44. Frontend Customer Module



Frontend 第一版至少包含：



```text

Customer List

Customer Form

Customer Detail

```



\---



\# 45. Customer List UI



Customer List 至少提供：



\- Customer Name

\- Phone

\- Status

\- 搜尋

\- Pagination

\- 查看 Detail

\- 新增 Customer



\---



\# 46. Customer Form UI



Customer Form 同時支援：



```text

Create Mode

Edit Mode

```



基本欄位：



```text

Name

Phone

Address

LINE ID

Note

```



Create Mode：



> Name、Phone 必填。



Edit Mode：



> 允許修改 Customer 基本資料。



\---



\# 47. Customer Detail UI



Customer Detail 至少提供：



```text

Customer Information

Status

Created At

Updated At

```



操作：



```text

編輯

停用

```



\---



\# 48. Deactivate Confirmation



停用 Customer 必須經過確認。



不可：



> 點一下就直接停用。



流程：



```text

Click Deactivate

&#x20;       ↓

Confirmation

&#x20;       ↓

Confirm

&#x20;       ↓

API

&#x20;       ↓

Status = INACTIVE

```



\---



\# 49. Customer Testing



Customer Block 必須建立測試。



測試分為：



1\. Unit Test

2\. API / Integration Test

3\. Browser Verification



\---



\# 50. Unit Test



至少驗證：



\- Create Customer

\- Get Customer

\- List Customer

\- Update Customer

\- Duplicate Phone

\- Invalid Data

\- Inactive Customer



\---



\# 51. API Integration Test



至少驗證：



```text

Supertest

&#x20;   ↓

Customer API

&#x20;   ↓

Business Logic

&#x20;   ↓

Data Access

&#x20;   ↓

MySQL

```



\---



\# 52. Create Test



測試：



```text

POST /api/customers

```



提供有效：



```text

name

phone

```



預期：



\- HTTP 成功

\- Customer 建立

\- ID 產生

\- Status = ACTIVE

\- Created At 存在

\- Updated At 存在



\---



\# 53. Duplicate Phone Test



流程：



```text

Create Customer A

&#x20;       ↓

Same Phone

&#x20;       ↓

Create Customer B

&#x20;       ↓

Reject

```



預期：



> 第二筆 Customer 不建立。



\---



\# 54. Update Test



驗證：



\- Name 可修改

\- Phone 可修改，但不可與其他 Customer 重複

\- Address 可修改

\- LINE ID 可修改

\- Note 可修改

\- Updated At 更新



Customer ID 不得被修改。



\---



\# 55. Deactivation Test



流程：



```text

ACTIVE

&#x20;   ↓

Deactivate

&#x20;   ↓

INACTIVE

```



驗證：



\- Customer 資料仍存在

\- Status = INACTIVE

\- Default List 不再顯示

\- Detail 仍可查看



\---



\# 56. Search Test



至少驗證：



```text

Search by Name

Search by Phone

```



確保可以找到正確 Customer。



\---



\# 57. Pagination Test



至少確認：



\- Page 可正常切換

\- Limit 可正常運作

\- 不會重複或遺漏資料



\---



\# 58. Browser Verification



Customer Block 必須實際從 Browser 驗證。



基本流程：



```text

開啟 Customer List

&#x20;       ↓

新增 Customer

&#x20;       ↓

確認出現在 List

&#x20;       ↓

搜尋 Customer

&#x20;       ↓

查看 Detail

&#x20;       ↓

編輯 Customer

&#x20;       ↓

重新查看

&#x20;       ↓

停用 Customer

&#x20;       ↓

確認 Status

&#x20;       ↓

確認 Default List 行為

```



\---



\# 59. Customer Block Definition of Done



Customer Block 必須同時完成：



\## Database



\- Customer Table 正常

\- Primary Key 正常

\- Phone Unique Constraint 正常

\- Status Constraint 正常

\- Created At / Updated At 正常



\## Backend



\- Controller 完成

\- Business Logic 完成

\- Data Access 完成

\- Validation 完成

\- Error Handling 完成



\## API



\- List

\- Detail

\- Create

\- Update



\## Frontend



\- List

\- Form

\- Detail

\- Search

\- Edit

\- Deactivate



\## Testing



\- Unit Test

\- API Integration Test

\- Error Path

\- Status Test

\- Search Test

\- Pagination Test



\## Verification



\- Browser 操作

\- Happy Path

\- Error Path

\- Deactivation Path



全部 PASS：



> \*\*Customer Block PASS\*\*



\---



\# 60. Customer Happy Path



正式 Happy Path：



```text

Customer List

&#x20;   ↓

新增 Customer

&#x20;   ↓

輸入 Name + Phone

&#x20;   ↓

建立成功

&#x20;   ↓

Customer 出現在 List

&#x20;   ↓

搜尋 Customer

&#x20;   ↓

查看 Detail

&#x20;   ↓

修改資料

&#x20;   ↓

確認更新

&#x20;   ↓

停用 Customer

&#x20;   ↓

確認

&#x20;   ↓

Status = INACTIVE

&#x20;   ↓

Default List 不再顯示

```



\---



\# 61. Customer Error Paths



至少處理：



```text

Missing Name

Missing Phone

Invalid Phone

Duplicate Phone

Customer Not Found

Invalid Status

Invalid Update

Database Error

Network Error

```



\---



\# 62. Customer 與後續 Block 的 Integration Boundary



PHASE 13 不實作後續 Block。



未來：



```text

Customer

&#x20;   ↓

Pet

```



Pet Block 可以引用 Customer。



同樣：



```text

Customer

&#x20;   ↓

Appointment

```



Appointment 可以引用 Customer。



但：



> Customer 不負責建立 Pet 或 Appointment。



\---



\# 63. 不得在 Customer Block 中加入的能力



以下不屬於 Customer Block：



\- 會員制度

\- 點數

\- 優惠券

\- CRM

\- Loyalty

\- Customer Segmentation

\- Marketing Automation

\- LINE Automation

\- Customer Portal

\- Online Booking

\- Accounting

\- BI



這些不因為 Customer Block 的實作方便而提前加入。



\---



\# 64. Customer Block Architecture



```text

┌──────────────────────────────┐

│           Frontend           │

│      Next.js + JavaScript    │

│          + Bootstrap         │

└──────────────┬───────────────┘

&#x20;              │

&#x20;              ▼

┌──────────────────────────────┐

│        Customer API          │

│          Express.js          │

└──────────────┬───────────────┘

&#x20;              │

&#x20;              ▼

┌──────────────────────────────┐

│    Customer Controller       │

└──────────────┬───────────────┘

&#x20;              │

&#x20;              ▼

┌──────────────────────────────┐

│ Customer Business Logic      │

└──────────────┬───────────────┘

&#x20;              │

&#x20;              ▼

┌──────────────────────────────┐

│    Customer Data Access      │

│            mysql2            │

└──────────────┬───────────────┘

&#x20;              │

&#x20;              ▼

┌──────────────────────────────┐

│            MySQL             │

└──────────────────────────────┘

```



\---



\# 65. Customer Block Data Ownership



Customer Block 是 Customer Data 的唯一主要 Owner。



其他 Block：



> 只能依照正式介面使用 Customer。



不得建立第二套 Customer Master Data。



例如禁止：



```text

Appointment Customer Name

\+

Appointment Customer Phone

```



被當成另一套 Customer Master。



Appointment 可以保存其業務需要的 Snapshot，但 Customer Master 仍由 Customer Block 負責。



\---



\# 66. Single Source of Truth



Customer Master Data：



> Customer Block 是 Single Source of Truth。



因此：



```text

Customer

&#x20;   ↓

Customer Master

```



其他 Block 不得自行建立另一套完整 Customer Master。



\---



\# 67. PHASE 13 Freeze Decisions



PHASE 13 正式 Freeze 以下決策：



1\. Customer 是第一個 Business Block。

2\. Customer 負責「誰是客戶」。

3\. Customer ID 由系統自動產生。

4\. Name Required。

5\. Phone Required。

6\. Phone Business-level Unique。

7\. Address Optional。

8\. LINE ID Optional。

9\. Note Optional。

10\. Status 使用 ACTIVE / INACTIVE。

11\. 建立 Customer 預設 ACTIVE。

12\. 建立 Created At。

13\. 建立 Updated At。

14\. Customer 不提供一般 Hard Delete。

15\. 停用採 INACTIVE。

16\. INACTIVE Customer 資料仍保留。

17\. Customer List 預設顯示 ACTIVE。

18\. Customer 支援 Name Search。

19\. Customer 支援 Phone Search。

20\. Customer 支援 Pagination。

21\. Customer 支援 Detail。

22\. Customer 支援 Create。

23\. Customer 支援 Update。

24\. Customer 支援 Deactivate。

25\. REST API。

26\. Controller 獨立。

27\. Business Logic 獨立。

28\. Data Access 獨立。

29\. Data Access 使用 mysql2。

30\. 不使用 ORM。

31\. Frontend Validation。

32\. Backend Validation。

33\. Database Constraint。

34\. Duplicate Phone 必須拒絕。

35\. Duplicate Phone 使用明確 Business Error。

36\. Status 只允許 ACTIVE / INACTIVE。

37\. Customer List、Form、Detail 為第一版 Frontend 核心畫面。

38\. Create / Edit 使用同一套 Form 概念。

39\. Deactivate 必須確認。

40\. Customer 必須有 Unit Test。

41\. Customer 必須有 API Integration Test。

42\. Customer 必須有 Browser Verification。

43\. Customer Block 必須通過 Database、Backend、API、Frontend、Browser 全面驗證後才能 PASS。



\---



\# 68. Phase Review 結論



PHASE 13 Review 已完成。



Review 結果：



```text

Customer Responsibility          PASS

Customer Data Boundary           PASS

Customer Lifecycle               PASS

Business Rules                   PASS

API Boundary                     PASS

Backend Layering                 PASS

Database Boundary                PASS

Frontend Boundary                PASS

Testing Boundary                 PASS

Browser Verification             PASS

PHASE 1～12 Consistency          PASS

MVP Scope Consistency             PASS

```



未發現需要重新開啟既有 Freeze 的衝突。



因此：



> \*\*PHASE 13 正式 FREEZE。\*\*



\---



\# 69. PHASE 13 完成定義



PHASE 13 的 Definition of Done：



> \*\*Customer Block 的責任、資料、生命週期、業務規則、API、Backend Layer、Database Boundary、Frontend、Validation、Testing、Browser Verification 與 PASS Criteria 均已定義並 Freeze。\*\*



本 Phase 完成的是：



> \*\*Customer Block 的正式工程規格。\*\*



實際程式開發仍必須依照本文件進行，不得在實作過程中自行改變 Freeze。



\---



\# 70. 下一階段



PHASE 13 完成後：



```text

PHASE 12

Foundation PASS

&#x20;       ↓

PHASE 13

Customer Block Specification FREEZE

&#x20;       ↓

PHASE 14

```



PHASE 14 應承接目前所有 Freeze。



不得重新討論：



\- MVP Scope

\- Architecture

\- Foundation

\- Customer Responsibility

\- Customer Data Rules

\- Customer API Boundary



除非提出正式 Change Request。



\---



\# 71. Project Progress



| Phase | 名稱 | Status |

|---|---|---|

| PHASE 1 | MVP Product Definition | \*\*FREEZE\*\* |

| PHASE 2 | Business Workflow \& Operational Decisions | \*\*FREEZE\*\* |

| PHASE 3 | MVP Scope \& Product Boundary | \*\*FREEZE\*\* |

| PHASE 4 | MVP Block Map | \*\*FREEZE\*\* |

| PHASE 5 | MVP Block Design | \*\*FREEZE\*\* |

| PHASE 6 | MVP Architecture \& Technical Boundary | \*\*FREEZE\*\* |

| PHASE 7 | Engineering / Development Decisions | \*\*FREEZE\*\* |

| PHASE 8 | Development Foundation | \*\*FREEZE\*\* |

| PHASE 9 | MVP Block Development Strategy | \*\*FREEZE\*\* |

| PHASE 10 | MVP Implementation Planning | \*\*FREEZE\*\* |

| PHASE 11 | Engineering Foundation Specification | \*\*FREEZE\*\* |

| PHASE 12 | Foundation Implementation \& Verification | \*\*FREEZE\*\* |

| \*\*PHASE 13\*\* | \*\*Customer Block Definition and Implementation Specification\*\* | \*\*FREEZE\*\* |

| PHASE 14 | 下一階段 | \*\*NOT STARTED\*\* |



\---



\# 72. Freeze Statement



\*\*PHASE-13 — Customer 客戶管理區塊定義與實作規格\*\*



\*\*Version:\*\* v1.0



\*\*Status:\*\* FREEZE



\*\*Freeze Date:\*\* 2026-08-16



> 本文件為 PHASE 13 正式 Freeze 基準。



> 後續 Customer Block Implementation 必須以本文件為基準。



> 若實作過程發現 Bug、原決策矛盾或技術實作限制，依既定 Change Request 規則處理。



\*\*END OF DOCUMENT\*\*

