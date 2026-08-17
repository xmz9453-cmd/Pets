\# PHASE 14 — Pet 寵物管理區塊定義與實作規格

\## Pet Block Definition and Implementation Specification



\*\*Document ID:\*\* PHASE-14  

\*\*Document Name:\*\* Pet 寵物管理區塊定義與實作規格  

\*\*English Name:\*\* Pet Block Definition and Implementation Specification  

\*\*Version:\*\* v1.0  

\*\*Status:\*\* FREEZE  

\*\*Phase:\*\* PHASE 14  

\*\*Predecessor:\*\* PHASE 13 — Customer 客戶管理區塊定義與實作規格  

\*\*Project:\*\* 小型寵物美容／寵物住宿工作室 MVP 營運管理系統  

\*\*Freeze Status:\*\* 2026-08-16  



\---



\# 1. Document Purpose



本文件定義 MVP 系統中的：



> \*\*Pet — 寵物管理區塊\*\*



本文件將既有的 Business Block Definition 進一步轉換為可供後續工程實作使用的正式規格。



本文件定義：



\- Pet Business Responsibility

\- Pet Data Definition

\- Pet Business Rules

\- Customer ↔ Pet Relationship

\- Pet Status

\- Pet Search

\- Pet UI

\- Pet API

\- Pet Backend Boundary

\- Validation

\- Testing

\- Browser Verification

\- Happy Path

\- PASS Criteria

\- Implementation Boundary



本文件完成後：



> \*\*Pet Block 正式進入 FREEZE。\*\*



後續工程實作必須依本文件執行。



如需修改本文件內容，必須依專案 Change Request 規則處理，不得直接修改既有 Freeze 決策。



\---



\# 2. Phase 14 Scope



PHASE 14 的範圍為：



> \*\*Pet Block 的定義與實作規格。\*\*



本 Phase 不重新設計：



\- MVP Product Definition

\- Business Workflow

\- MVP Scope

\- Business Block Map

\- Business Block Responsibility

\- Technical Architecture

\- Engineering Foundation

\- Customer Block



上述內容皆屬既有 Freeze 基準。



\---



\# 3. Existing Freeze Baseline



PHASE 14 必須建立於：



```text

PHASE 1 FREEZE

&#x20;       ↓

PHASE 2 FREEZE

&#x20;       ↓

PHASE 3 FREEZE

&#x20;       ↓

PHASE 4 FREEZE

&#x20;       ↓

PHASE 5 FREEZE

&#x20;       ↓

PHASE 6 FREEZE

&#x20;       ↓

PHASE 7 FREEZE

&#x20;       ↓

PHASE 8 FREEZE

&#x20;       ↓

PHASE 9 FREEZE

&#x20;       ↓

PHASE 10 FREEZE

&#x20;       ↓

PHASE 11 FREEZE

&#x20;       ↓

PHASE 12 FREEZE

&#x20;       ↓

PHASE 13 FREEZE

&#x20;       ↓

PHASE 14 FREEZE

```



PHASE 14 不得自行推翻上述既有 Freeze。



\---



\# 4. Pet Block Responsibility



\## 4.1 Core Responsibility



Pet 的核心責任：



> \*\*Pet = 哪一隻寵物。\*\*



Pet 負責管理特定寵物本身的基本識別與管理資料。



Pet 不負責：



\- 客戶管理

\- 預約管理

\- 實際美容執行

\- 住宿生命週期

\- 訂單

\- 付款

\- 商品管理

\- 美容師派工

\- 服務適用性判斷



\---



\# 5. Single Responsibility Boundary



Pet Block 必須維持清楚的責任邊界。



\## 5.1 Customer



Customer：



> 誰是客戶。



\## 5.2 Pet



Pet：



> 哪一隻寵物。



\## 5.3 Appointment



Appointment：



> 客戶預約了什麼、什麼時間來。



Appointment 不等於 Pet。



Appointment 必須引用既有 Pet。



\## 5.4 Service



Service：



> 店家提供什麼服務。



Pet 不負責定義 Service。



\## 5.5 Grooming



Grooming：



> 實際美容執行。



Pet 不負責保存美容執行紀錄。



\## 5.6 Boarding



Boarding：



> 實際住宿生命週期。



Pet 不負責管理入住、住宿中、退房。



\---



\# 6. Customer and Pet Relationship



Customer 與 Pet 的關係：



```text

Customer

&#x20;   │

&#x20;   │ 1 : N

&#x20;   ▼

Pet

```



定義：



> 一個 Customer 可以有多隻 Pet。



每一隻 Pet：



> 必須屬於一個 Customer。



不允許建立沒有 Customer 的 Pet。



不允許建立同時屬於多個 Customer 的 Pet。



\---



\# 7. Customer Dependency Rules



\## 7.1 Create Pet



建立 Pet 時：



> Customer 必須已存在。



如果 Customer 不存在：



> Backend 必須拒絕建立。



不得：



\- 自動建立 Customer

\- 建立沒有 Customer 的 Pet

\- 忽略 Customer 關聯



\## 7.2 Customer Status



建立 Pet 時：



> Customer 必須為 ACTIVE。



如果 Customer 為 INACTIVE：



> 不允許建立新的 Pet。



若需要繼續建立 Pet：



```text

Customer INACTIVE

&#x20;       ↓

重新啟用 Customer

&#x20;       ↓

Customer ACTIVE

&#x20;       ↓

建立 Pet

```



\---



\# 8. Pet Data Definition



第一版 Pet 核心資料如下：



| Field | Required | Description |

|---|---:|---|

| Pet ID | Yes | Pet 唯一識別碼 |

| Customer ID | Yes | 所屬 Customer |

| Pet Name | Yes | 寵物名稱 |

| Pet Type | Yes | DOG / CAT |

| Breed | Yes | 寵物品種 |

| Sex | Yes | MALE / FEMALE / UNKNOWN |

| Note | No | 一般備註 |

| Status | Yes | ACTIVE / INACTIVE |

| Created At | Yes | 建立時間 |

| Updated At | Yes | 最後更新時間 |



\---



\# 9. Pet ID



Pet ID：



> 作為 Pet 的系統唯一識別碼。



Pet ID 不等於：



\- Pet Name

\- Customer Name

\- Phone

\- Breed



Pet ID 必須由系統管理。



\---



\# 10. Pet Name



Pet Name：



> 必填。



Pet Name：



> \*\*不設 Business-level Unique。\*\*



以下資料可以合法存在：



```text

Customer A

&#x20;   └── Lucky



Customer B

&#x20;   └── Lucky

```



同一 Customer 底下也不以 Pet Name 作為唯一鍵。



因此：



> Pet Name 不可作為 Pet 的唯一識別依據。



真正識別 Pet 必須使用 Pet ID。



\---



\# 11. Pet Type



Pet Type：



> 必填。



MVP 第一版只支援：



```text

DOG

CAT

```



不得使用自由文字輸入。



不得產生：



```text

Dog

dog

狗

DOG

Cat

cat

貓

CAT

```



等不同格式。



Pet Type 的正式值為：



```text

DOG

CAT

```



\---



\# 12. Breed



Breed：



> 必填。



第一版使用：



> \*\*文字欄位。\*\*



第一版不建立獨立 Breed Master。



原因：



\- MVP 需要記錄品種

\- 目前沒有足夠理由建立獨立 Breed 管理

\- 避免增加 Master Data 維護成本

\- 保持 Pet Block 簡單



未來若需要正式 Breed Master，應透過 Change Request 或後續版本處理。



\---



\# 13. Sex



Sex：



> 必填。



允許值：



```text

MALE

FEMALE

UNKNOWN

```



使用 UNKNOWN 的目的：



> 當店家不知道寵物性別時，可以使用明確的未知值，而不是輸入錯誤資料或留下不合法空值。



第一版不延伸：



\- 繁殖管理

\- 生育管理

\- 醫療資料

\- 複雜性別模型



\---



\# 14. Birth Date and Age



第一版：



> \*\*不記錄 Birth Date。\*\*



第一版：



> \*\*不記錄或保存 Age。\*\*



原因：



如果直接保存 Age：



> 年齡會隨時間失效。



如果保存 Birth Date：



> 第一版目前沒有足夠的 MVP 業務必要性。



因此暫不建立。



若未來實際營運證明需要，依 Change Request 規則處理。



\---



\# 15. Note



Pet Note：



> 選填。



第一版只提供：



> 一般文字備註。



不拆成：



\- Allergy

\- Medical

\- Behavior

\- Diet

\- Medication

\- Vaccination



等複雜欄位。



原因：



MVP 已排除複雜醫療與照護系統。



Note 只能作為：



> 一般營運備註。



不得將 Note 演變成隱藏的完整醫療資料系統。



\---



\# 16. Pet Status



Pet Status 僅有：



```text

ACTIVE

INACTIVE

```



預設值：



```text

ACTIVE

```



\---



\# 17. ACTIVE



ACTIVE 表示：



> Pet 目前是有效的營運資料。



ACTIVE Pet 可以：



\- 查看

\- 編輯

\- 被 Appointment 引用

\- 進行新的業務操作



\---



\# 18. INACTIVE



INACTIVE 表示：



> Pet 已經停用，但資料仍然保留。



INACTIVE Pet：



\- 不刪除

\- 保留歷史資料

\- 預設不出現在 Active List

\- 可以查看

\- 可以重新啟用

\- 不可建立新的 Appointment



\---



\# 19. Pet Deactivation



第一版：



> 不提供一般 Hard Delete。



停用方式：



```text

ACTIVE

&#x20;  ↓

Deactivate

&#x20;  ↓

INACTIVE

```



停用前：



> UI 必須要求二次確認。



目的：



> 避免店員誤操作造成有效 Pet 被停用。



\---



\# 20. Pet Reactivation



INACTIVE Pet：



> 可以重新啟用。



流程：



```text

INACTIVE

&#x20;   ↓

Reactivate

&#x20;   ↓

ACTIVE

```



重新啟用後：



> Pet 可以重新進行正常營運操作。



\---



\# 21. Hard Delete Policy



第一版：



> 不提供一般 Pet Hard Delete。



原因：



Pet 可能被以下業務資料引用：



\- Appointment

\- Grooming

\- Boarding

\- Order

\- Report



如果直接刪除 Pet：



> 可能破壞歷史資料與關聯。



因此採：



> Status-based Deactivation。



\---



\# 22. Customer Deactivation and Pet



Customer 被停用時：



> \*\*不得自動修改 Pet Status。\*\*



例如：



```text

Customer

Status = INACTIVE



Pet A

Status = ACTIVE



Pet B

Status = INACTIVE

```



這個狀態組合可以存在。



原因：



Customer 與 Pet 是不同 Business Entity。



Customer Status 的變更：



> 不應偷偷改變 Pet 的生命週期。



\---



\# 23. Pet and Appointment



Appointment 必須引用既有 Pet。



建立 Appointment：



```text

Customer

&#x20;   ↓

Pet

&#x20;   ↓

Appointment

```



不允許 Appointment 自己保存另一套獨立的 Pet 身分資料作為主要關聯。



因此：



> Appointment ≠ Pet。



Pet 是被 Appointment 引用的 Master Data。



\---



\# 24. INACTIVE Pet and Appointment



INACTIVE Pet：



> 不可建立新的 Appointment。



如果需要再次預約：



```text

Pet INACTIVE

&#x20;   ↓

Reactivate

&#x20;   ↓

Pet ACTIVE

&#x20;   ↓

Create Appointment

```



\---



\# 25. Pet and Service



Pet 只負責保存：



> Pet Type。



Pet 不負責判斷：



> 哪個 Service 適合哪隻 Pet。



Service 適用性由相關 Business Block 判斷。



Pet 不保存：



\- Default Service

\- Preferred Service

\- Service Eligibility



\---



\# 26. Pet and Groomer



Pet 不保存：



> Default Groomer。



Pet 不負責：



\- Groomer Assignment

\- Staff Scheduling

\- Automatic Dispatch

\- Groomer Preference



這些屬於其他 Business Block。



MVP 也不建立複雜排班與自動派工引擎。



\---



\# 27. Pet and Boarding



Pet 不負責住宿生命週期。



Boarding 自己管理：



```text

預約住宿

&#x20;   ↓

入住

&#x20;   ↓

住宿中

&#x20;   ↓

退房

```



Pet 只提供：



> 被住宿業務引用的寵物資料。



\---



\# 28. Pet Search



Pet 第一版提供基本搜尋。



支援：



\- Pet Name

\- Customer Name

\- Customer Phone



搜尋目的：



> 讓櫃台能快速找到正確 Pet。



例如：



```text

Lucky

```



或：



```text

王先生

```



或：



```text

0912xxxxxx

```



即可協助找到相關 Pet。



\---



\# 29. Pet List Default Behavior



Pet List 預設：



> 只顯示 ACTIVE Pet。



可以切換：



> 查看 INACTIVE Pet。



基本行為：



```text

Pet List

&#x20;   ↓

Default = ACTIVE

&#x20;   ↓

Search

&#x20;   ↓

Optional = INACTIVE

```



不將 ACTIVE / INACTIVE 無條件混合在一般操作畫面。



\---



\# 30. Pet UI



第一版至少提供：



```text

Pet List

Pet Form

Pet Detail

```



\---



\# 31. Pet List



Pet List 至少提供：



\- Pet Name

\- Pet Type

\- Breed

\- Customer

\- Status

\- 基本操作



支援：



\- 搜尋

\- 查看 Detail

\- 編輯

\- 停用

\- 重新啟用



\---



\# 32. Pet Form



Create / Edit：



> 使用同一套 Form 概念。



Form 應包含：



\- Customer

\- Pet Name

\- Pet Type

\- Breed

\- Sex

\- Note



Status 依操作情境控制。



\---



\# 33. Pet Create



建立流程：



```text

Pet List

&#x20;   ↓

新增 Pet

&#x20;   ↓

選擇 Customer

&#x20;   ↓

輸入 Pet Data

&#x20;   ↓

Frontend Validation

&#x20;   ↓

Backend Validation

&#x20;   ↓

Business Rule

&#x20;   ↓

Create

&#x20;   ↓

建立成功

&#x20;   ↓

Pet Detail / List

```



\---



\# 34. Pet Edit



編輯流程：



```text

Pet Detail

&#x20;   ↓

Edit

&#x20;   ↓

Pet Form

&#x20;   ↓

修改資料

&#x20;   ↓

Frontend Validation

&#x20;   ↓

Backend Validation

&#x20;   ↓

Business Rule

&#x20;   ↓

Update

```



\---



\# 35. Customer Transfer



第一版：



> 不提供一般 Pet Customer Transfer。



也就是：



```text

Customer A

&#x20;   ↓

Pet

```



不能直接從 UI 修改成：



```text

Customer B

```



原因：



Pet 可能已經被歷史業務資料引用。



如果未來真的需要：



> 必須另行設計正式 Pet Transfer Business Rule。



不得以一般 Edit 功能偷偷實作。



\---



\# 36. Pet Detail



Pet Detail 至少顯示：



```text

Pet Information

Customer Information

Status

```



Customer 至少顯示：



\- Customer Name

\- Customer Phone



Pet Detail 不需要複製 Customer Phone 到 Pet 資料。



資料取得方式：



```text

Pet

&#x20;   ↓

Customer ID

&#x20;   ↓

Customer

&#x20;   ↓

Customer Phone

```



\---



\# 37. Pet History Boundary



第一版 Pet Detail：



> 不建立完整跨 Block 歷史時間軸。



不直接把以下全部塞進 Pet Detail：



\- Appointment History

\- Grooming History

\- Boarding History

\- Order History

\- Payment History



原因：



這會造成 Pet Block 侵入其他 Block 的責任。



各 Block 維持自己的資料與操作責任。



\---



\# 38. Pet API



第一版採 REST API。



正式 API：



```text

GET    /api/pets

GET    /api/pets/:id

POST   /api/pets

PATCH  /api/pets/:id

```



\---



\# 39. GET /api/pets



用途：



> 取得 Pet List。



支援：



\- ACTIVE / INACTIVE Filter

\- Pet Name Search

\- Customer Name Search

\- Customer Phone Search

\- Customer ID Filter

\- Pagination



第一版不要求複雜全文搜尋引擎。



\---



\# 40. GET /api/pets/:id



用途：



> 取得單一 Pet Detail。



至少提供：



\- Pet Data

\- Customer Reference

\- Customer Name

\- Customer Phone

\- Status



如果 Pet 不存在：



> 回傳 Not Found。



不得自動建立資料。



\---



\# 41. POST /api/pets



用途：



> 建立 Pet。



必要資料：



```text

Customer ID

Pet Name

Pet Type

Breed

Sex

```



選填：



```text

Note

```



Backend 必須確認：



1\. Customer 存在

2\. Customer 為 ACTIVE

3\. Pet Name 存在

4\. Pet Type 合法

5\. Breed 存在

6\. Sex 合法

7\. Business Rules 通過



\---



\# 42. PATCH /api/pets/:id



用途：



> 修改 Pet。



可修改資料依 Business Rule 決定。



一般 Edit 不提供：



> 任意 Customer Transfer。



Status 操作：



\- ACTIVE → INACTIVE

\- INACTIVE → ACTIVE



停用／重新啟用必須符合相應 Business Rule。



\---



\# 43. Pet API Error Boundary



API 必須明確區分：



\- Validation Error

\- Business Rule Error

\- Not Found

\- Database Error



不得將所有錯誤都回傳為：



```text

500 Internal Server Error

```



\---



\# 44. Customer Not Found



建立 Pet 時：



如果 Customer 不存在：



> Backend 必須拒絕。



不得：



\- 自動建立 Customer

\- 建立孤兒 Pet

\- 忽略 Customer ID



\---



\# 45. Customer Inactive



建立 Pet 時：



如果 Customer：



```text

Status = INACTIVE

```



則：



> Backend 必須拒絕建立。



理由：



> Pet 必須建立在有效 Customer 上。



\---



\# 46. Pet Not Found



查詢或修改不存在的 Pet：



> 回傳 Not Found。



不得：



\- 自動建立

\- 回傳虛假的成功

\- 返回空資料並視為成功



\---



\# 47. Validation Architecture



Pet Validation 採：



```text

Frontend Validation

&#x20;       ↓

Backend Validation

&#x20;       ↓

Business Rule

&#x20;       ↓

Database Constraint

```



\---



\# 48. Frontend Validation



Frontend 主要負責：



\- Required Field

\- Format

\- Enum Selection

\- 基本輸入檢查

\- 使用者即時回饋



目的：



> 提供良好的操作體驗。



\---



\# 49. Backend Validation



Backend 是真正的安全邊界。



即使 Frontend 已驗證：



> Backend 仍必須重新驗證。



Backend 必須保護：



\- Customer Exists

\- Customer Active

\- Pet Type Valid

\- Sex Valid

\- Required Fields

\- Pet Status

\- Customer Transfer Boundary



\---



\# 50. Database Constraint



Database 負責最後一道資料完整性防線。



至少應確保：



\- Pet ID 唯一

\- Customer Reference 完整

\- Required Data 不應為非法 NULL

\- Enum / Domain Value 符合系統規則

\- Created At / Updated At 正確保存



實際 SQL Schema 與 Constraint 實作：



> 依本文件 Freeze 後進入工程實作階段。



\---



\# 51. Backend Architecture



Pet Backend 必須遵循 PHASE 6 已 Freeze 的架構：



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



\# 52. Controller Responsibility



Controller：



> 負責 HTTP 層。



主要工作：



\- 接收 Request

\- 解析參數

\- 呼叫 Business Logic

\- 組成 Response

\- HTTP Error Mapping



Controller：



> 不承擔大量 Business Logic。



\---



\# 53. Business Logic Responsibility



Business Logic：



> 負責 Pet Business Rules。



例如：



\- Customer 必須存在

\- Customer 必須 ACTIVE

\- Pet Type 必須合法

\- Sex 必須合法

\- INACTIVE Pet 不可建立 Appointment

\- 不允許一般 Customer Transfer

\- Pet Reactivation

\- Pet Deactivation



\---



\# 54. Data Access Responsibility



Data Access：



> 負責 Database Access。



包括：



\- SQL

\- SELECT

\- INSERT

\- UPDATE

\- Transaction

\- Database Query



Data Access：



> 不負責 HTTP。



Data Access：



> 不負責 UI。



Data Access：



> 不應取代 Business Logic。



\---



\# 55. Technology Constraint



Pet Block 必須使用既有技術基準：



\## Frontend



```text

Next.js

JavaScript

Bootstrap

```



\## Backend



```text

Express.js

JavaScript

```



\## Database



```text

MySQL

```



\## Database Driver



```text

mysql2

```



\## Testing



```text

Jest

Supertest

```



\## ORM



```text

不使用 ORM

```



\---



\# 56. No ORM



Pet Block：



> 不使用 ORM。



Database Access：



> 使用 mysql2。



不得因 Pet Block 實作方便而導入：



\- Prisma

\- Sequelize

\- TypeORM

\- Drizzle

\- 其他 ORM



除非未來透過 Change Request 修改 PHASE 6 技術基準。



\---



\# 57. Pet Testing Strategy



Pet Block 最低測試要求：



```text

Unit Test

\+

API Integration Test

\+

Browser Verification

```



\---



\# 58. Unit Test



Unit Test 使用：



> Jest。



至少驗證：



\- Pet Create Business Rule

\- Customer Existence

\- Customer Active Rule

\- Pet Type Validation

\- Sex Validation

\- Pet Status Rule

\- Deactivation

\- Reactivation

\- Customer Transfer Restriction



\---



\# 59. API Integration Test



API Integration Test 使用：



> Jest + Supertest。



至少驗證：



```text

GET /api/pets

GET /api/pets/:id

POST /api/pets

PATCH /api/pets/:id

```



以及主要錯誤情境：



\- Customer 不存在

\- Customer INACTIVE

\- Pet 不存在

\- Invalid Pet Type

\- Invalid Sex

\- Missing Required Field

\- Invalid Status Operation



\---



\# 60. Browser Verification



Browser Verification 必須確認實際使用流程。



至少驗證：



```text

Pet List

&#x20;   ↓

新增 Pet

&#x20;   ↓

建立成功

&#x20;   ↓

搜尋

&#x20;   ↓

查看 Detail

&#x20;   ↓

編輯

&#x20;   ↓

停用

&#x20;   ↓

確認 INACTIVE

&#x20;   ↓

重新啟用

&#x20;   ↓

確認 ACTIVE

```



\---



\# 61. Pet Happy Path



正式 Happy Path：



```text

Customer ACTIVE

&#x20;   ↓

Pet List

&#x20;   ↓

新增 Pet

&#x20;   ↓

選擇 Customer

&#x20;   ↓

輸入 Pet Data

&#x20;   ↓

建立成功

&#x20;   ↓

Pet List

&#x20;   ↓

搜尋 Pet

&#x20;   ↓

查看 Pet Detail

&#x20;   ↓

查看 Customer

&#x20;   ↓

編輯 Pet

&#x20;   ↓

停用

&#x20;   ↓

確認 INACTIVE

&#x20;   ↓

重新啟用

&#x20;   ↓

確認 ACTIVE

```



\---



\# 62. Customer → Pet Happy Path



Customer 與 Pet 的正常操作關係：



```text

Customer List

&#x20;   ↓

Customer Detail

&#x20;   ↓

查看 Pet

&#x20;   ↓

新增 Pet

&#x20;   ↓

Pet Detail

```



這是主要的日常操作入口之一。



\---



\# 63. Pet → Customer Happy Path



另一個方向：



```text

Pet List

&#x20;   ↓

搜尋 Pet

&#x20;   ↓

Pet Detail

&#x20;   ↓

查看 Customer

```



Pet Detail 必須能提供：



\- Customer Name

\- Customer Phone



\---



\# 64. Pet Block PASS Criteria



Pet Block 必須全部通過：



```text

Database

&#x20;   ↓

Backend

&#x20;   ↓

API Test

&#x20;   ↓

Frontend

&#x20;   ↓

Browser Verification

&#x20;   ↓

Pet Block PASS

```



只有當上述各層完成並通過驗證：



> Pet Block 才可以標記 PASS。



\---



\# 65. Pet Block Completion Definition



Pet Block 完成條件：



\- Pet Data Model 完成

\- Customer Relationship 完成

\- Business Rules 完成

\- Backend 完成

\- Data Access 完成

\- API 完成

\- Frontend 完成

\- Validation 完成

\- Unit Tests 完成

\- API Integration Tests 完成

\- Browser Verification 完成

\- Happy Path 通過

\- Error Cases 通過

\- Pet Block PASS



\---



\# 66. Explicitly Out of Scope



PHASE 14 不包含：



\- Pet Medical Management

\- Vaccination Management

\- Medication Management

\- Allergy Master

\- Diet Management

\- Behavior Management

\- Breeding Management

\- Pet Insurance

\- Pet Health Record

\- Complex Care Profile

\- Pet Membership

\- Pet Loyalty

\- Default Service

\- Default Groomer

\- Automatic Groomer Assignment

\- Complex Pet Transfer Workflow

\- Pet Sharing Across Multiple Customers

\- Pet Multi-owner Model

\- Complete Pet History Timeline

\- Advanced Search Engine

\- Full-text Search Infrastructure

\- Pet Image Management

\- Pet File Management

\- Pet IoT Integration



上述項目：



> 不屬於 MVP v1.0 Pet Block。



若未來需要，依 Change Request 或後續版本處理。



\---



\# 67. Block Boundary Summary



Pet Block：



```text

┌──────────────────────────────┐

│            Pet               │

│                              │

│ 誰的哪一隻寵物                │

│                              │

│ - Pet Identity               │

│ - Customer Relationship      │

│ - Pet Basic Information      │

│ - Pet Status                 │

│ - Pet Search                 │

└──────────────────────────────┘

```



不包含：



```text

Appointment

Grooming

Boarding

Order

Payment

Service

Groomer Assignment

Medical Management

```



\---



\# 68. Data Ownership Summary



| Data | Owner Block |

|---|---|

| Customer Name | Customer |

| Customer Phone | Customer |

| Pet Name | Pet |

| Pet Type | Pet |

| Breed | Pet |

| Sex | Pet |

| Pet Note | Pet |

| Pet Status | Pet |

| Service Definition | Service |

| Appointment | Appointment |

| Grooming Execution | Grooming |

| Boarding Lifecycle | Boarding |

| Order | Order |

| Payment | Payment |

| Groomer Assignment | Daily Operations / Grooming |



Pet 不得複製其他 Block 的核心資料作為自己的 Source of Truth。



\---



\# 69. Source of Truth



Pet 的 Single Source of Truth：



> \*\*Pet Block。\*\*



Customer 的 Single Source of Truth：



> \*\*Customer Block。\*\*



因此：



```text

Customer Phone

&#x20;   ↓

Customer



Pet Name

Pet Type

Breed

Sex

Pet Note

Pet Status

&#x20;   ↓

Pet

```



不得在其他 Block 建立第二份可獨立修改的 Pet Master Data。



\---



\# 70. Freeze Decisions



PHASE 14 共完成：



> \*\*40 項決策。\*\*



全部採用 AI 推薦答案。



正式 Freeze 決策：



```text

Q01 = A

Q02 = A

Q03 = A

Q04 = A

Q05 = A

Q06 = A

Q07 = A

Q08 = A

Q09 = A

Q10 = A



Q11 = A

Q12 = A

Q13 = A

Q14 = A

Q15 = A

Q16 = A

Q17 = A

Q18 = A

Q19 = A

Q20 = A



Q21 = A

Q22 = A

Q23 = A

Q24 = A

Q25 = A

Q26 = A

Q27 = A

Q28 = A

Q29 = A

Q30 = A



Q31 = A

Q32 = A

Q33 = A

Q34 = A

Q35 = A

Q36 = A

Q37 = A

Q38 = A

Q39 = A

Q40 = A

```



\---



\# 71. PHASE 14 Freeze Statement



本文件經 PHASE 14 Decision Review 後：



> \*\*PHASE 14 = FREEZE\*\*



正式 Freeze 範圍：



> \*\*Pet Block Definition and Implementation Specification v1.0\*\*



後續工程實作應以本文件為正式基準。



不得因：



\- 個人偏好

\- UI 覺得更漂亮

\- 工程師習慣

\- 實作方便

\- 想提前支援未來需求



而自行修改本文件的 Freeze 決策。



\---



\# 72. Change Request Rule



若後續發現問題，必須先判斷：



\### A. Bug



可以修正實作。



\### B. 原決策互相矛盾



可以提出重新檢視。



\### C. 技術實作限制



可以提出修正。



\### D. 真正的新需求



原則上進入 V2 或後續版本。



\### E. 只是另一種設計比較漂亮



不得因此推翻 Freeze。



\---



\# 73. Change Request Required Information



若要修改 PHASE 14 Freeze，必須提出：



1\. 哪一個 Freeze 決策

2\. 發生什麼問題

3\. 為什麼原方案不可行

4\. 新方案

5\. 影響範圍

6\. 是否值得重新開啟 Freeze



未經確認：



> 不得直接修改 PHASE 14 Freeze。



\---



\# 74. Implementation Order



PHASE 14 Freeze 後，Pet Block 工程實作應遵循：



```text

Pet Data Layer

&#x20;   ↓

Pet Data Access

&#x20;   ↓

Pet Business Logic

&#x20;   ↓

Pet Controller / API

&#x20;   ↓

Pet API Tests

&#x20;   ↓

Pet Frontend

&#x20;   ↓

Pet Browser Verification

&#x20;   ↓

Pet Block PASS

```



實作期間不得改變既有 Business Responsibility。



\---



\# 75. Integration Boundary



Pet Block 完成後，才進行與其他 Block 的 Integration。



主要 Integration 對象：



```text

Customer

Appointment

Service

Grooming

Boarding

Order

Report

```



Integration 的目的：



> 讓其他 Block 引用 Pet，而不是讓 Pet 吸收其他 Block 的責任。



\---



\# 76. Final Freeze Summary



PHASE 14 最終定義：



> \*\*Pet = 哪一隻寵物。\*\*



核心關係：



```text

Customer

&#x20;   │

&#x20;   │ 1:N

&#x20;   ▼

Pet

```



核心資料：



```text

Pet ID

Customer ID

Pet Name

Pet Type

Breed

Sex

Note

Status

Created At

Updated At

```



核心 Status：



```text

ACTIVE

INACTIVE

```



核心 API：



```text

GET    /api/pets

GET    /api/pets/:id

POST   /api/pets

PATCH  /api/pets/:id

```



核心架構：



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



核心驗證：



```text

Frontend Validation

&#x20;       ↓

Backend Validation

&#x20;       ↓

Business Rule

&#x20;       ↓

Database Constraint

```



核心測試：



```text

Jest

\+

Supertest

\+

Browser Verification

```



核心完成條件：



```text

Database

&#x20;   ↓

Backend

&#x20;   ↓

API Test

&#x20;   ↓

Frontend

&#x20;   ↓

Browser Verification

&#x20;   ↓

Pet Block PASS

```



\---



\# 77. Document Status



\*\*PHASE:\*\* PHASE 14  

\*\*BLOCK:\*\* Pet  

\*\*VERSION:\*\* v1.0  

\*\*STATUS:\*\* \*\*FREEZE\*\*  

\*\*DECISION COUNT:\*\* 40  

\*\*DECISION RESULT:\*\* All AI Recommended Answers Accepted  

\*\*PREVIOUS BLOCK:\*\* Customer  

\*\*NEXT DEVELOPMENT STATE:\*\* Pet Block Implementation  

\*\*CHANGE POLICY:\*\* Change Request Required



\---



\# END OF PHASE 14

