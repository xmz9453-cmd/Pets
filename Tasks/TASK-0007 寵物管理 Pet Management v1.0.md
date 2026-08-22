# TASK-0007 FREEZE — 寵物管理 Pet Management v1.0

## 1. Document Information

| Field | Value |
|---|---|
| Task | TASK-0007 |
| 中文名稱 | 寵物管理 |
| English Name | Pet Management |
| Version | v1.0 |
| Status | FREEZE |
| Project | MVP 寵物美容／住宿工作室系統 |
| Previous Task | TASK-0006 |
| Scope | Pet Management |
| Decision Status | Q001–Q087 全部完成 |
| Decision Completion | 87 / 87 |
| Implementation Status | 尚未開始 |
| Browser Verification | 尚未開始 |
| Formal Filename | TASK-0007 寵物管理 Pet Management v1.0 |

---

## 2. Task Objective

TASK-0007 負責建立 MVP 的 Pet Management 寵物管理能力。

本 Task 的目標是讓店家可以：

- 建立寵物
- 查看寵物
- 搜尋寵物
- 依客戶篩選寵物
- 依狀態篩選寵物
- 編輯寵物
- 修改寵物所屬客戶
- 啟用寵物
- 停用寵物
- 管理寵物基本資料
- 管理寵物與 Customer 的關聯

本 Task 必須維持 MVP 原則：

> 該寫的才寫。

不得因 Pet Management 引入企業級架構、複雜權限、複雜搜尋、Pagination、Master Data 或其他非必要抽象。

---

## 3. Scope

### 3.1 In Scope

本 Task 包含：

- Pet Database Model
- Pet Repository
- Pet Service
- Pet Controller
- Pet API Routes
- Pet CRUD
- Pet Status Management
- Customer 關聯
- Pet Search
- Customer Filter
- Status Filter
- Pet Frontend UI
- Pet Validation
- Pet API Testing
- Pet Browser Verification

### 3.2 Existing Customer Dependency

Pet 必須隸屬於 Customer。

建立或修改 Pet 的 Customer 關聯時：

- Customer 必須存在
- 新建立的 Pet 必須關聯 ACTIVE Customer
- Customer Transfer 的目標 Customer 必須為 ACTIVE

---

## 4. Out of Scope

TASK-0007 不包含：

- Pet Delete
- Pet 照片管理
- Pet 醫療紀錄
- Pet 疫苗紀錄
- Pet 會員制度
- Pet 積分
- Breed Master Data
- Pet Tag Master Data
- 寵物健康管理系統
- 寵物美容歷史專用模組
- 寵物住宿歷史專用模組
- Grooming
- Boarding
- Order
- Payment
- Product
- Report
- LINE API
- Online Booking
- i18n Framework
- Enterprise RBAC
- 複雜搜尋引擎
- Pagination
- 複雜 Query Builder
- 額外 Transaction Framework

---

## 5. Pet Data Model

Pet 至少包含以下資料：

| Field | Requirement |
|---|---|
| id | Backend / Database 產生 |
| customer_id | 必填 |
| name | 必填 |
| species | 必填 |
| breed | 選填 |
| gender | 選填 |
| birthday | 選填 |
| note | 選填 |
| status | 必填 |
| created_at | 系統產生 |
| updated_at | 系統更新 |

---

## 6. Pet ID

Pet ID 不得由 Frontend 自行產生。

規則：

- Backend / Database 負責產生 Pet ID
- Frontend 僅使用 API 回傳的 ID
- Create Request 不得要求 Frontend 自行指定 ID

---

## 7. Pet Name

Pet Name 為必填欄位。

Validation：

- 不可為空
- 去除前後空白後仍不可為空
- 最大長度：100 字元
- Backend 必須驗證
- Frontend 應提供對應輸入限制

---

## 8. Species

MVP 僅支援：

- `DOG`
- `CAT`

Species 為必填欄位。

Backend 必須拒絕任何未定義值。

Frontend 只提供合法 Species 選項。

---

## 9. Breed

Breed 為選填欄位。

規則：

- 不建立 Breed Master Data
- 使用自由文字
- 最大長度：100 字元
- 不因 Breed 未填寫而阻止建立 Pet

---

## 10. Gender

Gender 為選填欄位。

合法值：

- `MALE`
- `FEMALE`
- `UNKNOWN`

Backend 僅接受上述合法值。

UI 顯示應依既有繁體中文 UI 規則處理。

---

## 11. Birthday

Birthday 為選填欄位。

規則：

- 可以為空
- 空值儲存為 `NULL`
- 不得接受未來日期
- Frontend 必須限制日期輸入
- Backend 必須再次驗證
- Backend 為最終 Validation 防線

不得使用：

- 空字串作為日期
- `0000-00-00`
- 其他假日期

---

## 12. Note

Pet Note 為選填欄位。

最大長度：

> 1000 字元

Frontend 與 Backend 均應進行對應 Validation。

---

## 13. Pet Status

Pet Status 僅允許：

- `ACTIVE`
- `INACTIVE`

其他值均為非法。

例如：

- `DELETED`
- `DISABLED`
- `ARCHIVED`

均不得作為 TASK-0007 合法 Status。

---

## 14. Pet Create

建立 Pet：

> `POST /api/pets`

Create Request 至少包含：

- customer_id
- name
- species
- breed
- gender
- birthday
- note

Create 時：

- `status` 不由一般 Create Form 任意指定
- 新建立 Pet 固定為 `ACTIVE`

---

## 15. Pet Create Customer Validation

建立 Pet 時：

### Customer 不存在

回傳：

> HTTP 404 Not Found

不得建立 Pet。

### Customer 為 INACTIVE

回傳：

> HTTP 400 Bad Request

不得建立新的 Pet 關聯。

### Customer 為 ACTIVE

允許建立 Pet。

---

## 16. Pet Detail

提供：

> `GET /api/pets/:id`

用途：

- 載入單一 Pet
- 編輯 Pet
- 驗證 Pet 是否存在

Detail Response 應提供必要 Customer 顯示資訊，例如：

- customer_id
- customer_name

Frontend 不需要為顯示 Customer Name 再額外呼叫 Customer API。

---

## 17. Pet List

提供 Pet List API。

預設排序：

> `created_at DESC`

不建立複雜排序功能。

Pet List 可直接提供必要完整 Pet 資訊，包括：

- id
- customer_id
- customer_name
- name
- species
- breed
- gender
- birthday
- note
- status
- created_at
- updated_at

---

## 18. Pet List Filtering

Pet List API 支援：

- search
- customer_id
- status

上述條件均為 Optional。

API 形式：

> `GET /api/pets?search=...&customer_id=...&status=...`

多個條件可以同時使用。

例如：

> 搜尋「小黑」 + Customer + ACTIVE

必須同時套用所有條件。

---

## 19. Search

Pet Search 採用明確送出方式。

流程：

1. 使用者輸入搜尋文字
2. 使用者執行搜尋
3. Frontend 呼叫 API
4. 顯示符合條件的 Pet

MVP 不要求每輸入一個字就立即呼叫 API。

不引入：

- Debounce Framework
- 即時搜尋服務
- 複雜 Search Engine

---

## 20. Clear Filter

Pet List 必須提供清除搜尋／篩選能力。

清除時清除：

- Search
- Customer Filter
- Status Filter

清除後重新載入列表。

UI 使用繁體中文。

---

## 21. Customer Filter

Pet List 提供 Customer Filter。

Customer 選項來源：

> 使用既有 Customer API。

Customer 選單：

- 只提供 ACTIVE Customer
- 依 Customer Name 升冪排序

Pet 本身若屬於 INACTIVE Customer，不得因此被刪除或修改。

---

## 22. Status Filter

Pet List 提供 Status Filter。

至少支援：

- 全部
- ACTIVE
- INACTIVE

UI 顯示使用繁體中文。

資料庫及 API Status Value 維持：

- `ACTIVE`
- `INACTIVE`

不得因 UI 中文化修改 Database Value。

---

## 23. Pagination

TASK-0007 第一版不提供 Pagination。

不包含：

- Page Number
- Page Size
- Previous / Next
- Pagination API Contract

原因：

> MVP 目標為小型店家，現階段直接載入符合條件的 Pet List。

---

## 24. Pet Update

修改 Pet：

> `PUT /api/pets/:id`

Update API 可修改：

- customer_id
- name
- species
- breed
- gender
- birthday
- note
- status

不得建立獨立：

- `/activate`
- `/deactivate`

Status 透過同一個 Update API 修改。

---

## 25. Pet Update Not Found

若指定 Pet 不存在：

> HTTP 404 Not Found

不得：

- 自動建立 Pet
- 將 PUT 當成 Create
- 修改其他 Pet

---

## 26. Customer Transfer

編輯 Pet 時允許修改 `customer_id`。

Customer Transfer 允許：

> Customer A → Customer B

但目標 Customer 必須：

- 存在
- 為 ACTIVE

只修改 Pet 目前的 `customer_id`。

---

## 27. Customer Transfer Historical Data

Customer Transfer 不修改歷史 Appointment。

例如：

> Pet 原本屬於 Customer A  
> 後來轉移至 Customer B

既有 Appointment 維持原本的歷史資料。

不得因 Pet Customer Transfer 回溯修改：

- 舊 Appointment
- 舊 Order
- 舊 Payment
- 其他歷史資料

---

## 28. Pet Status Update

Frontend 提供：

- 啟用
- 停用

操作。

但 Backend 不建立獨立 Activate / Deactivate API。

統一使用：

> `PUT /api/pets/:id`

修改：

> `status`

---

## 29. Deactivate Confirmation

使用者執行停用 Pet 時必須要求確認。

確認訊息採繁體中文。

目的：

> 避免誤操作造成 Pet 無法進入後續新營運流程。

---

## 30. Reactivate

重新啟用 Pet 時不要求額外確認。

但 Backend 必須檢查 Pet 所屬 Customer。

如果 Customer：

> `INACTIVE`

則不得重新啟用 Pet。

---

## 31. INACTIVE Pet Editing

INACTIVE Pet 仍然可以編輯基本資料。

可修改：

- Name
- Species
- Breed
- Gender
- Birthday
- Note
- Customer

Customer 修改仍必須符合：

> Customer 存在且為 ACTIVE。

---

## 32. Appointment Dependency

INACTIVE Pet 不可以加入新的 Appointment。

建立新的 Appointment 時：

> 只能選擇 ACTIVE Pet。

---

## 33. Existing Appointment

Pet 被設定為 INACTIVE 時：

> 不修改既有 Appointment。

歷史資料保持原狀。

Pet Status 只影響未來新的操作，不追溯修改歷史資料。

---

## 34. Pet Delete

TASK-0007 不提供真正 Delete。

不得建立：

> `DELETE /api/pets/:id`

Pet 使用：

> ACTIVE / INACTIVE

進行生命週期管理。

目的：

> 避免刪除 Pet 後破壞歷史預約與營運資料關聯。

---

## 35. API Error Handling

Backend 使用簡單一致的錯誤格式：

> `{ "error": "..." }`

HTTP Status：

| Status | Meaning |
|---|---|
| 400 | Validation / Business Rule |
| 401 | 未登入 |
| 403 | 無權限 |
| 404 | Resource Not Found |

TASK-0007 不建立複雜 Error Framework。

---

## 36. Validation

Backend 為最終 Validation 防線。

至少驗證：

- Customer existence
- Customer ACTIVE status
- Pet existence
- Pet Name
- Species
- Breed length
- Gender
- Birthday
- Note length
- Pet Status

Frontend Validation 不得取代 Backend Validation。

---

## 37. Transaction

TASK-0007 不需要額外 Database Transaction。

原因：

- Pet CRUD 為單一資源操作
- 沒有需要跨多張資料表完成的複合寫入
- 不建立不必要的 Transaction Abstraction

未來若有真正需要跨表原子性的功能，由後續 Task 個別定義。

---

## 38. Pet UI

Pet Management UI 必須提供至少：

- Pet List
- Search
- Customer Filter
- Status Filter
- Clear Filter
- Add Pet
- Edit Pet
- Customer Selection
- Name
- Species
- Breed
- Gender
- Birthday
- Note
- Status
- Enable
- Disable
- Loading State
- Empty State
- Error State
- Saving State

---

## 39. Customer Selection UI

新增／編輯 Pet 時：

- Customer 為必填
- 使用既有 Customer API
- 只顯示 ACTIVE Customer
- Customer 以姓名排序
- 不建立新的 Customer Management 功能

---

## 40. UI Localization

TASK-0007 新增 UI 必須直接使用繁體中文。

不得採用：

> 先建立英文 UI，再於 Task 完成後重新翻譯。

使用者可見 UI 從實作開始即遵守既有：

> UI 繁體中文化基準 Traditional Chinese UI Localization Baseline

未來若 TASK-0007 出現 Baseline 尚未定義的新英文語意，應先進行 Localization Decision，再實作。

---

## 41. UI State

Pet UI 必須完整處理：

### Loading

> 寵物載入中...

### Empty

> 查無符合條件的寵物

### Error

> 載入寵物失敗

### Saving

> 儲存中...

### Success

成功訊息使用既有繁體中文 UI 規則。

不得留下主要英文 UI。

---

## 42. API Architecture

Pet API 必須遵循既有 MVP Architecture：

> Next.js Frontend → Express.js API → mysql2 → MySQL

不得引入：

- Prisma
- TypeScript
- 新 ORM
- 新 API Framework
- Enterprise Repository Framework

---

## 43. Repository

Pet Repository 負責：

- Create
- Find List
- Find By ID
- Update

不提供 Delete Repository operation。

Repository 不負責：

- UI
- HTTP Response
- Business Error Message

---

## 44. Service

Pet Service 負責：

- Pet Business Rules
- Customer Validation
- Status Rules
- Birthday Validation
- Create / Update orchestration

Service 不直接處理 Frontend UI。

---

## 45. Controller

Pet Controller 負責：

- Request Parsing
- 呼叫 Service
- HTTP Status
- Response Formatting
- Error Handling

不將複雜 Business Logic 放在 Controller。

---

## 46. Routes

Pet API 至少包含：

> `GET /api/pets`

> `GET /api/pets/:id`

> `POST /api/pets`

> `PUT /api/pets/:id`

不得建立：

> `DELETE /api/pets/:id`

不得建立：

> `/api/pets/:id/activate`

不得建立：

> `/api/pets/:id/deactivate`

---

## 47. Authorization

TASK-0007 必須遵守既有 Authentication / Authorization 架構。

未登入使用者：

> 不得存取受保護的 Pet Management API。

API 不因 Pet Management 自行建立新的 RBAC 模型。

既有角色權限若已由系統架構定義，直接沿用。

---

## 48. Testing

TASK-0007 必須提供 Pet API / Business Logic 測試。

至少覆蓋：

### Create

- Valid Create
- Missing Customer
- INACTIVE Customer
- Missing Name
- Invalid Species
- Invalid Gender
- Future Birthday
- Invalid Note Length

### Read

- List
- Detail
- Not Found
- Search
- Customer Filter
- Status Filter

### Update

- Valid Update
- Not Found
- Customer Transfer
- Invalid Customer
- INACTIVE Customer
- Future Birthday
- Invalid Status

### Status

- ACTIVE → INACTIVE
- INACTIVE → ACTIVE
- INACTIVE Customer 不得重新啟用 Pet

### Authorization

- Unauthenticated Request
- Unauthorized Request

---

## 49. Browser Verification

TASK-0007 完成後必須實際使用 Browser 驗證。

最低驗證流程：

1. Login
2. 開啟 Pet Management
3. Pet List 載入
4. Search
5. Customer Filter
6. Status Filter
7. Clear Filter
8. Add Pet
9. Customer Selection
10. 填寫 Pet 基本資料
11. 建立 Pet
12. Edit Pet
13. Customer Transfer
14. Birthday Validation
15. Status Disable
16. Status Enable
17. Empty State
18. Loading State
19. Error State
20. 中文 UI
21. Reload 後確認資料正確

---

## 50. Browser Gate

Browser Gate 必須確認：

> 使用者可正常操作 Pet Management。

並確認：

- UI 無主要英文顯示
- Pet List 正常
- Search 正常
- Filter 正常
- Create 正常
- Update 正常
- Status 操作正常
- Customer 關聯正常
- Validation 正常
- Error State 正常
- Loading State 正常
- Empty State 正常

Browser Gate 未 PASS：

> TASK-0007 不得標記 Implementation PASS。

---

## 51. Regression

TASK-0007 不得破壞既有功能。

至少確認：

- Login
- Home
- Customer Management
- Appointment Management
- Shop Settings

既有功能仍可正常運作。

尤其不得因 Pet Management：

- 修改既有 Customer API Contract
- 修改既有 Appointment API Contract
- 修改 Authentication
- 修改 Authorization
- 修改 Shop Settings
- 修改 Payment
- 修改其他既有功能

---

## 52. Scope Protection

Coding AI 執行 TASK-0007 時：

> 只能修改完成 TASK-0007 所必要的檔案。

不得藉由 TASK-0007：

- 重構整個 Backend
- 重構整個 Frontend
- 修改既有 UI 架構
- 引入新 Framework
- 修改 Database 架構以外的資料模型
- 修改既有 API
- 修改既有 Task 行為
- 實作 TASK-0008 之後功能

---

## 53. Existing Uncommitted Changes

TASK-0007 實作前必須執行 Repository Inspection。

若工作樹存在既有修改：

- 不得任意覆蓋
- 不得任意刪除
- 不得假設修改屬於 Coding AI
- 必須確認修改檔案與 TASK-0007 Scope 的關係

若發現 Freeze Conflict：

> STOP

不得自行猜測。

---

## 54. Definition of Done

TASK-0007 必須同時符合：

- [ ] Pet Database Model 完成
- [ ] Pet Repository 完成
- [ ] Pet Service 完成
- [ ] Pet Controller 完成
- [ ] Pet Routes 完成
- [ ] Create 完成
- [ ] List 完成
- [ ] Detail 完成
- [ ] Update 完成
- [ ] Status Management 完成
- [ ] Search 完成
- [ ] Customer Filter 完成
- [ ] Status Filter 完成
- [ ] Customer Validation 完成
- [ ] Birthday Validation 完成
- [ ] Pet Validation 完成
- [ ] API Error Handling 完成
- [ ] Pet Tests 完成
- [ ] Existing Regression Tests PASS
- [ ] Frontend Build PASS
- [ ] Browser Verification PASS
- [ ] 五個既有頁面 Regression PASS
- [ ] 中文 UI PASS
- [ ] Scope Check PASS
- [ ] 無未授權功能擴張

---

## 55. Acceptance Criteria

### AC-01 Pet Create

Given ACTIVE Customer

When valid Pet data is submitted

Then Pet is created with:

> `status = ACTIVE`

---

### AC-02 Invalid Customer

Given Customer does not exist

When creating Pet

Then:

> `404 Not Found`

and Pet is not created.

---

### AC-03 INACTIVE Customer

Given Customer is INACTIVE

When creating Pet

Then:

> `400 Bad Request`

and Pet is not created.

---

### AC-04 Pet List

Given existing Pets

When requesting Pet List

Then matching Pets are returned and default sorting is:

> `created_at DESC`

---

### AC-05 Search

Given a search term

When Pet Search is executed

Then matching Pet records are returned.

---

### AC-06 Filter

Given Search / Customer / Status filters

When multiple filters are submitted

Then all conditions are applied together.

---

### AC-07 Pet Update

Given existing Pet

When valid update is submitted

Then Pet is updated through:

> `PUT /api/pets/:id`

---

### AC-08 Customer Transfer

Given existing Pet and ACTIVE target Customer

When `customer_id` is updated

Then Pet is associated with the target Customer.

Existing historical Appointment data remains unchanged.

---

### AC-09 Birthday

Given a future Birthday

When Create or Update is submitted

Then Backend rejects the request.

---

### AC-10 Status

Given ACTIVE Pet

When status is changed to INACTIVE

Then Pet becomes INACTIVE.

No DELETE occurs.

---

### AC-11 Reactivation

Given INACTIVE Pet with ACTIVE Customer

When status is changed to ACTIVE

Then Pet becomes ACTIVE.

Given INACTIVE Customer:

> Reactivation is rejected.

---

### AC-12 Appointment Protection

Given INACTIVE Pet

When creating a new Appointment

Then the Pet cannot be selected.

---

### AC-13 Error

Given a non-existent Pet

When Detail or Update is requested

Then:

> `404 Not Found`

---

### AC-14 UI

Given Pet Management UI

Then all primary user-visible UI is Traditional Chinese.

---

### AC-15 Browser

Given completed implementation

When the complete Browser Verification workflow is executed

Then all required Pet Management workflows PASS.

---

## 56. Technical Constraints

TASK-0007 必須遵守既有技術基準：

| Layer | Technology |
|---|---|
| Frontend | Next.js Pages Router |
| Frontend Language | JavaScript |
| UI | Bootstrap |
| Backend | Express.js |
| Backend Language | JavaScript |
| Database | MySQL |
| DB Driver | mysql2 |
| ORM | None |
| Testing | Jest + Supertest |

禁止：

- TypeScript
- Tailwind
- Prisma
- 其他 ORM
- 未經決策的新 Framework

---

## 57. Localization Constraint

本 Task 延續既有 UI 繁體中文化決策。

正式實作：

> 新增的使用者可見 UI 直接使用繁體中文。

資料值與技術識別值維持其原始格式。

例如：

- `ACTIVE`
- `INACTIVE`
- `DOG`
- `CAT`
- `MALE`
- `FEMALE`
- `UNKNOWN`
- API path
- Database field
- ID

不得為了 UI 中文化而修改 API Contract 或 Database Value。

---

## 58. Freeze Decision

TASK-0007 的 Q001–Q087 決策全部完成：

> **87 / 87**

所有決策均採用使用者確認之 AI 推薦答案。

因此：

> TASK-0007 規格正式 FREEZE。

Freeze 後：

- 不得重新詢問已確認決策
- 不得自行改變 API Contract
- 不得自行改變 Data Model
- 不得自行增加 Scope
- 不得自行引入新功能
- 不得自行重新設計 Pet Management

若後續實作發現真正的規格衝突：

> 必須 STOP 並提出 Change Decision。

---

## 59. Implementation Status

目前：

> TASK-0007 Specification = FREEZE

目前尚未代表：

> TASK-0007 Implementation = PASS

Implementation 必須在 Freeze 後另外執行。

正式實作流程：

> TASK-0007 FREEZE → Coding AI → Test → Build → Browser Verification → Regression → Implementation PASS

---

## 60. Final Freeze Status

| Item | Status |
|---|---|
| Scope | FREEZE |
| Pet Model | FREEZE |
| Pet CRUD | FREEZE |
| Pet Status | FREEZE |
| Customer Relationship | FREEZE |
| Validation | FREEZE |
| API Contract | FREEZE |
| UI Requirements | FREEZE |
| Testing Requirements | FREEZE |
| Browser Gate | FREEZE |
| Localization Rule | FREEZE |
| Q001–Q087 | COMPLETE |
| Specification | **FREEZE** |
| Implementation | PENDING |
| Browser Verification | PENDING |
| Final Implementation PASS | PENDING |

## 61. Final Statement

TASK-0007：

> **寵物管理 Pet Management v1.0**

規格決策：

> **Q001–Q087 = 87 / 87 COMPLETE**

正式狀態：

> **TASK-0007 = FREEZE**

下一階段：

> **依本 Freeze 文件交給 Coding AI 執行 TASK-0007 Implementation。**