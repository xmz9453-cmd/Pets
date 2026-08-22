\# TASK-0008 服務管理 Service Management v1.0



\## 1. Document Information



| Field | Value |

|---|---|

| Project | 小型寵物美容／寵物住宿工作室 MVP |

| Task | TASK-0008 |

| Task Name | 服務管理 Service Management |

| Document Type | TASK Formal Engineering Specification |

| Version | v1.0 |

| Specification Status | FREEZE |

| Decision Status | 48 / 48 PASS |

| Specification Review | PASS |

| Previous Task | TASK-0007 寵物管理 Pet Management |

| Previous Task Status | FREEZE |

| Coding Status | 尚未開始 |

| Formal Document Status | FREEZE Specification |

| UI Language | 繁體中文 |



\### Official File Name



`TASK-0008 服務管理 Service Management v1.0`



\---



\## 2. Purpose



TASK-0008 負責建立 MVP 的 Service Management 能力。



本 TASK 的目的，是讓店家可以管理目前提供的美容與住宿服務，並建立後續 Appointment、Grooming、Boarding、Order 所需的 Service Master Data。



本 TASK 必須以最少但足夠的程式與架構完成完整 Business Capability。



核心原則：



> 該寫的才寫。



不得因 Service Management 而引入與 MVP 無關的 Enterprise Architecture、複雜 Pricing Engine、Enterprise RBAC 或其他過度設計。



\---



\## 3. Current Baseline



TASK-0007 已完成並 FREEZE。



TASK-0007 已建立的 Pet Management 能力視為既有系統基準。



TASK-0008 不得推翻 TASK-0007 已 Freeze 的既有設計。



既有重要基準：



\- Pet 與 ACTIVE Customer 關聯

\- Pet 使用 `PUT /api/pets/:id` 統一更新

\- 不使用獨立 activate / deactivate API

\- Pet 支援 `birth\_date`

\- Pet UI 使用繁體中文

\- Loading State

\- Empty State

\- Error State

\- Save State

\- Confirmation 操作



TASK-0008 應延續上述工程與 UI 模式。



\---



\## 4. Business Capability



TASK-0008 Business Capability：



> Service Management



Service Management 負責：



\- 建立 Service

\- 查看 Service

\- 搜尋 Service

\- 篩選 Service

\- 編輯 Service

\- 啟用 Service

\- 停用 Service

\- 刪除符合條件的 Service

\- 驗證 Service 資料

\- 管理 Service 基本價格

\- 管理 Service Type

\- 管理適用 Species

\- 管理 Service Unit

\- 管理預估服務時間

\- 管理顯示順序



Service Management 不負責 Service 的實際執行。



\---



\## 5. Scope



\### 5.1 In Scope



TASK-0008 包含：



1\. Service Data Model

2\. Service Repository / Data Access

3\. Service Business Logic

4\. Service Controller

5\. Service API Routes

6\. Service API Client

7\. Service Management UI

8\. Service CRUD

9\. Service Search

10\. Service Filter

11\. Service Status Management

12\. Service Validation

13\. Species Compatibility

14\. Staff Authorization

15\. Loading State

16\. Empty State

17\. Error State

18\. Save State

19\. Confirmation UI

20\. API Tests

21\. UI Tests

22\. Browser Verification

23\. Regression Verification



\---



\## 6. Out of Scope



以下功能不屬於 TASK-0008：



\### 6.1 Pricing



\- Dynamic Pricing

\- Weight-based Pricing

\- Breed-based Pricing

\- Size-based Pricing

\- Seasonal Pricing

\- Holiday Pricing

\- Peak Pricing

\- Minimum / Maximum Price Rules

\- Pricing Engine

\- Pricing Rule Engine



\### 6.2 Service Versioning



\- Service Version

\- Service Revision

\- Historical Service Version Management

\- Automatic Service Copy / Version Creation



\### 6.3 Audit



\- Complete Audit Log

\- Field-level Change History

\- Before / After Audit Records



\### 6.4 Authorization



\- Enterprise RBAC

\- Permission Matrix

\- Custom Role Engine

\- Enterprise Policy Engine



\### 6.5 Operational Rules



\- Walk-in Rule Engine

\- Age Eligibility Rule Engine

\- Breed Eligibility Engine

\- Weight Eligibility Engine

\- Dynamic Duration Engine



\### 6.6 UI



\- Rich Text Editor

\- Complex Drag \& Drop Ordering

\- Advanced Data Grid

\- Enterprise Search

\- Advanced Reporting UI



\### 6.7 Other Business Blocks



\- Appointment Management

\- Daily Operations

\- Grooming Execution

\- Boarding Lifecycle

\- Order Management

\- Payment

\- Product Management

\- Reporting



\---



\## 7. Service Data Model



Service 必須至少支援以下資料。



| Field | Required | Description |

|---|---|---|

| id | Yes | Service primary identifier |

| name | Yes | Service 名稱 |

| type | Yes | Grooming / Boarding |

| description | No | 簡短服務說明 |

| price | Yes | 基本服務價格 |

| unit | Yes | 基本服務單位 |

| species | Yes | DOG / CAT / BOTH |

| duration\_minutes | Yes | 預估服務時間 |

| status | Yes | ACTIVE / INACTIVE |

| sort\_order | Yes | UI 顯示順序 |

| created\_at | Yes | 建立時間 |

| updated\_at | Yes | 更新時間 |



實際 Database 型別應依既有專案 MySQL 技術基準與現有 Repository Pattern 決定，但不得改變上述 Business Meaning。



\---



\## 8. Service Name



Service Name：



\- 必填

\- 必須有合理最大長度

\- AI Recommendation 採 100 字元作為合理上限

\- 同一店家內不得建立重複 Service Name



Service Name 不需要 Service Code。



不建立：



\- service\_code

\- SKU

\- ERP Item Code

\- Barcode



\---



\## 9. Service Type



Service Type 固定為：



\- `GROOMING`

\- `BOARDING`



不得建立 Custom Service Type。



Grooming：



> 美容相關服務。



Boarding：



> 住宿相關服務。



Service Type 應由 Backend Validation 強制驗證。



\---



\## 10. Description



Service 支援簡短 Description。



規則：



\- 選填

\- AI Recommendation 最大長度為 500 字元

\- 不使用 Rich Text Editor

\- 不建立 Markdown Editor

\- 不建立 HTML Content Engine



Description 主要用於店家理解服務內容。



\---



\## 11. Price



Service 必須有基本價格。



價格規則：



\- 必填

\- 必須大於 0

\- 不允許負數

\- 不允許 0

\- 使用單一固定基本價格



本 TASK 不處理：



\- 體型價格

\- 重量價格

\- 品種價格

\- 毛長價格

\- 旺季價格

\- 假日價格

\- 最低價

\- 最高價

\- 價格區間

\- Dynamic Pricing



\---



\## 12. Unit



Service 必須具有基本 Unit。



Unit 用於描述 Service 的基本使用／計價單位。



MVP 目前使用簡單 Unit 概念，例如：



\- 次

\- 小時

\- 天



TASK-0008 不建立完整 Unit Management 系統。



不得引入：



\- Unit Conversion Engine

\- 複雜計價單位換算

\- Custom Unit Registry



\---



\## 13. Duration



Service 必須具有預估服務時間。



欄位：



`duration\_minutes`



規則：



\- 使用整數分鐘

\- 不使用文字儲存時間

\- 不建立 hour / minute 雙欄位

\- 不建立 Dynamic Duration Engine



例如：



\- 60

\- 90

\- 120



Duration 是後續 Appointment 時間安排的基礎資料之一。



\---



\## 14. Species



Service 必須指定適用 Species：



\- `DOG`

\- `CAT`

\- `BOTH`



此設定用於後續 Service / Pet Compatibility Validation。



例如：



Service：



> 狗狗美容



Pet：



> Cat



則不得建立不符合 Species 的業務關係。



Frontend 可以先過濾不適用 Service，但 Backend 必須再次驗證。



\---



\## 15. Species Compatibility Rule



Service Species Compatibility 必須由 Backend 執行。



基本規則：



| Service Species | Pet Species | Result |

|---|---|---|

| DOG | DOG | Allowed |

| DOG | CAT | Rejected |

| CAT | CAT | Allowed |

| CAT | DOG | Rejected |

| BOTH | DOG | Allowed |

| BOTH | CAT | Allowed |



此規則屬於 Service Management 與後續 Appointment 的共同 Business Rule。



TASK-0008 不建立獨立 Eligibility Rule Engine。



\---



\## 16. Service Status



Service Status 僅有：



\- `ACTIVE`

\- `INACTIVE`



\### 16.1 Create



建立 Service 時：



> 預設 ACTIVE。



\### 16.2 Activate



可將 INACTIVE Service 更新為 ACTIVE。



\### 16.3 Deactivate



可將 ACTIVE Service 更新為 INACTIVE。



\### 16.4 Meaning



INACTIVE 的意思：



> 不允許新的流程使用該 Service。



INACTIVE 不代表：



> Service 的歷史資料失效。



\---



\## 17. Status Update Rule



Service 狀態更新統一透過：



`PUT /api/services/:id`



不得建立：



\- `/api/services/:id/activate`

\- `/api/services/:id/deactivate`



不得恢復 TASK-0007 已移除的獨立狀態 Endpoint 模式。



\---



\## 18. Delete Rule



Service Delete 必須受到歷史資料保護。



\### 18.1 未被使用



如果 Service 尚未被其他業務資料使用：



> 可以 Delete。



\### 18.2 已被使用



如果 Service 已被 Appointment、Order 或其他已建立的歷史業務資料使用：



> 不得 Delete。



此時應使用：



> INACTIVE



取代刪除。



\### 18.3 History Preservation



Delete 不得破壞既有歷史業務資料。



\---



\## 19. Service Modification



Service 可以被編輯。



即使 Service 已經被歷史資料使用，也不全面禁止修改。



但歷史業務資料必須由其所屬 Business Block 保持必要的歷史可追溯性。



TASK-0008 不建立 Service Versioning。



不自動：



\- Clone Service

\- Create Service Version

\- Archive Version

\- Rewrite Historical Records



\---



\## 20. Sort Order



Service 支援：



`sort\_order`



規則：



\- 數字越小越前

\- 可以重複

\- 不建立 UNIQUE Constraint

\- 新 Service 預設加入現有清單最後

\- 相同 Sort Order 時以 Name 作穩定次排序



不建立複雜 Drag \& Drop Sorting Engine。



\---



\## 21. Search



Service Management 必須支援 Service Name 搜尋。



搜尋主要目的：



> 快速找到需要管理的 Service。



不建立：



\- Full Text Search Engine

\- Elasticsearch

\- Advanced Search DSL



\---



\## 22. Filter



Service Management 必須支援：



\### Type Filter



\- Grooming

\- Boarding



\### Status Filter



\- Active

\- Inactive



不建立額外複雜篩選系統。



\---



\## 23. API



TASK-0008 使用既有 Express.js REST-style API。



核心 Endpoint：



`GET /api/services`



用途：



> 取得 Service List。



`GET /api/services/:id`



用途：



> 取得單一 Service。



`POST /api/services`



用途：



> 建立 Service。



`PUT /api/services/:id`



用途：



> 更新 Service，包括：



\- 基本資料

\- Status

\- Sort Order



Delete 若符合 Delete Rule，使用既有 REST Resource Pattern 實作。



不得建立獨立：



\- activate API

\- deactivate API



\---



\## 24. API Query



Service List API 應支援必要的：



\- Search

\- Type Filter

\- Status Filter



具體 Query Parameter 命名應延續現有專案 API 慣例，不得因 TASK-0008 建立另一套 Query Style。



\---



\## 25. API Authorization



Service Management API 必須使用既有 Staff / Auth 機制。



未登入或不具備既有合法 Staff 身份的 Request：



> 不得直接操作 Service Management API。



TASK-0008 不建立新的 Authorization Framework。



\---



\## 26. Backend Validation



Backend 必須驗證至少：



\### Identity



\- Service ID 是否存在



\### Name



\- 必填

\- 長度

\- 同店家不可重複



\### Type



\- 只能是 Grooming / Boarding



\### Price



\- 必填

\- 必須 > 0



\### Unit



\- 必填

\- 必須為合法 Service Unit



\### Species



\- 只能是 DOG / CAT / BOTH



\### Duration



\- 必須為合法正整數分鐘



\### Status



\- 只能是 ACTIVE / INACTIVE



\### Sort Order



\- 必須為合法數值



\### Delete



\- 已被使用的 Service 不得 Delete



Backend Validation 是正式資料安全邊界。



\---



\## 27. Frontend Validation



Frontend Form 必須提供基本 Validation。



至少包含：



\- Required Field

\- Price Validation

\- Duration Validation

\- Name Length

\- Description Length

\- Type Selection

\- Species Selection

\- Unit Selection

\- Status Handling



Frontend Validation 不得取代 Backend Validation。



\---



\## 28. UI Language



TASK-0008 新增 UI 從需求到實作皆直接使用：



> 繁體中文



不採：



> 英文 UI → 再翻譯繁中



Service Management UI 不得出現未定義的新英文業務名稱。



API / Database / Code Identifier 可以使用英文技術命名，但面向店家使用者的 UI 文案必須使用繁體中文。



\---



\## 29. Service Management UI



Service Management UI 至少包含：



\### Service List



顯示：



\- 服務名稱

\- 類型

\- 價格

\- 單位

\- 適用物種

\- 預估時間

\- 狀態

\- 操作



\### Create Service



提供建立服務表單。



\### Edit Service



提供修改服務表單。



\### Activate / Deactivate



透過同一個 Update Flow 處理。



\### Delete



僅允許符合 Delete Rule 的 Service。



\---



\## 30. UI Confirmation



停用 Service：



> 必須提供確認操作。



目的：



避免店家誤停用仍在營運使用的服務。



啟用：



> 不需要建立獨立 Confirmation Page。



Delete：



> 若 UI 提供 Delete，應使用確認操作。



\---



\## 31. UI Loading State



Service Management 必須提供 Loading State。



至少包含：



\- Service List Loading

\- Create Save Loading

\- Edit Save Loading

\- Status Update Loading

\- Delete Loading



避免使用者在 API Request 期間重複操作。



\---



\## 32. UI Empty State



Service List 沒有任何資料時：



> 必須顯示明確 Empty State。



例如：



> 尚未建立任何服務。



並提供：



> 新增服務



操作入口。



不得只顯示空白頁面。



\---



\## 33. UI Error State



Service Management 必須處理：



\- Initial Load Error

\- API Error

\- Save Error

\- Update Error

\- Delete Error



錯誤必須在 UI 顯示可理解的繁體中文訊息。



不得只寫入 Browser Console。



\---



\## 34. UI Save State



建立與編輯 Service 時：



\- 顯示儲存進度

\- 防止重複提交

\- 成功後更新 UI

\- 失敗後保留必要輸入狀態



\---



\## 35. Service Form



Service Form 至少包含：



\- 服務名稱

\- 服務類型

\- 服務說明

\- 基本價格

\- 單位

\- 適用物種

\- 預估服務時間

\- 狀態

\- 顯示順序



其中：



\- Name 必填

\- Type 必填

\- Price 必填

\- Unit 必填

\- Species 必填

\- Duration 必填



Description 可選填。



\---



\## 36. Default Values



建立 Service 時：



\### Status



預設：



`ACTIVE`



\### Sort Order



預設：



> 目前最大 Sort Order 後方的新位置。



其他欄位不得使用不明確的業務預設值。



\---



\## 37. Service Name Uniqueness



同一店家內：



> Service Name 不得重複。



此規則必須在 Backend 驗證。



Frontend 可以提前提示，但不能取代 Backend。



\---



\## 38. Service Type / Species Relationship



Service Type 與 Species 是兩個不同概念。



例如：



\- Grooming + DOG

\- Grooming + CAT

\- Grooming + BOTH

\- Boarding + DOG

\- Boarding + CAT

\- Boarding + BOTH



TASK-0008 不建立 Type × Species 的額外 Rule Matrix。



\---



\## 39. No Service Code



TASK-0008 不建立：



`service\_code`



Service 使用：



> Database Primary Key / Service ID



作為系統識別。



不新增：



\- SKU

\- Barcode

\- ERP Code

\- External Service Code



\---



\## 40. No Audit Log



TASK-0008 不建立完整 Audit Log。



不需要保存：



\- 每次修改者

\- 修改前值

\- 修改後值

\- 每次 Status History



保留基本：



\- `created\_at`

\- `updated\_at`



即可。



\---



\## 41. No Service Versioning



Service 不建立版本控制。



不建立：



\- Version Number

\- Service Revision

\- Historical Service Version

\- Automatic Clone



歷史業務資料的保存責任由後續 Appointment / Order 等 Business Block 處理。



\---



\## 42. No Dynamic Eligibility Engine



TASK-0008 不建立：



\- Age Rule

\- Breed Rule

\- Weight Rule

\- Size Rule

\- Special Condition Rule



Service Eligibility 在目前 MVP 僅處理：



> Species Compatibility



\---



\## 43. No Walk-in Rule



Walk-in 不屬於 Service Master Data 的核心規則。



TASK-0008 不提供：



\- `allow\_walk\_in`

\- Walk-in Policy

\- Walk-in Rule Engine



Walk-in 的實際營運流程由 Daily Operations / Appointment / Order 等後續 Block 處理。



\---



\## 44. Testing Requirements



TASK-0008 必須建立自動化測試。



\### 44.1 API Tests



至少驗證：



\- List

\- Detail

\- Create

\- Update

\- Delete

\- Name Validation

\- Type Validation

\- Price Validation

\- Unit Validation

\- Species Validation

\- Duration Validation

\- Status Validation

\- Sort Order Validation

\- Name Uniqueness

\- Authorization

\- Delete Protection

\- Status Update

\- Species Compatibility



\### 44.2 UI Tests



至少驗證：



\- Service List

\- Create

\- Edit

\- Activate

\- Deactivate

\- Delete

\- Search

\- Filter

\- Loading State

\- Empty State

\- Error State

\- Save State

\- Form Validation



\---



\## 45. Browser Verification



Coding 完成後必須執行 Browser Verification。



至少確認：



1\. Service List 正常顯示

2\. 新增 Service 成功

3\. Service 編輯成功

4\. Service 停用成功

5\. Service 重新啟用成功

6\. Service 搜尋正常

7\. Type Filter 正常

8\. Status Filter 正常

9\. Empty State 正常

10\. Error State 正常

11\. Form Validation 正常

12\. Delete Rule 正常



\---



\## 46. Regression Verification



TASK-0008 完成後必須確認既有功能沒有被破壞。



至少驗證：



\- Login

\- Home

\- Customers

\- Appointments

\- Settings

\- Pet Management

\- Customer / Pet 關聯

\- TASK-0007 Pet Update

\- TASK-0007 Pet Status Flow



若 Regression 發現問題，必須先判斷：



\- 是否屬於 TASK-0008 Scope

\- 是否為既有系統問題

\- 是否存在 Freeze Conflict



不得直接擴張 TASK-0008 Scope。



\---



\## 47. Engineering Architecture



TASK-0008 必須遵守既有技術基準。



\### Frontend



\- Next.js

\- Pages Router

\- JavaScript

\- Bootstrap

\- 繁體中文 UI



禁止：



\- TypeScript

\- Tailwind



\### Backend



\- Express.js

\- JavaScript



\### Database



\- MySQL

\- mysql2



禁止：



\- Prisma



\### Testing



\- Jest

\- Supertest



\---



\## 48. Architecture Flow



Service Management 採：



`Next.js UI → API Client → Express.js API → Service Logic → mysql2 → MySQL`



不得因 TASK-0008 建立：



\- Microservice

\- Event Bus

\- Message Queue

\- Repository Framework

\- Generic Enterprise Service Layer

\- Generic CRUD Engine

\- Enterprise Dependency Injection Framework



除非既有專案已經存在且為既定基準，不得自行引入。



\---



\## 49. Engineering Principle



TASK-0008 必須遵守：



> 該寫的才寫。



實作應以：



> 最少但足夠



為原則。



不得因「未來可能需要」而提前建立：



\- 複雜抽象

\- Generic Framework

\- Plugin System

\- Dynamic Rule Engine

\- Versioning Framework

\- Enterprise Permission System



\---



\## 50. Existing Task Compatibility



TASK-0008 必須保持與 TASK-0007 相容。



不得修改 TASK-0007 已 Freeze 的核心決策：



\### Pet Update



`PUT /api/pets/:id`



\### Pet Status



透過 Pet Update Flow。



\### Customer Validation



Pet 必須關聯有效 ACTIVE Customer。



\### Customer Transfer



允許透過 Pet Update 修改 Customer 關聯。



TASK-0008 不得重新設計上述能力。



\---



\## 51. Repository Safety



AI Coding 開始前必須先檢查：



\- `git status`

\- Current Branch

\- HEAD

\- Existing Changes

\- Untracked Files

\- Existing TASK-0008 Implementation



AI Coding 不得：



\- reset

\- checkout

\- clean working tree

\- 刪除未知用途檔案

\- 覆蓋使用者未提交工作

\- 修改非 TASK-0008 Scope 檔案



如果發現既有實作與本文件衝突：



> 必須先判斷是否屬於 TASK-0008 Scope。



如果無法安全判斷：



> STOP。



\---



\## 52. Freeze Rules



本文件 Freeze 後：



\### 不得自行修改



\- Scope

\- Out of Scope

\- Data Model Business Meaning

\- API Contract

\- Business Rules

\- Validation Rules

\- Authorization Rules

\- UI Scope

\- Testing Scope



\### 如果 Coding 階段發現問題



若問題屬於：



\- Freeze Conflict

\- Scope Conflict

\- Existing Implementation Conflict

\- 不明需求



AI Coding 必須：



> STOP



並回報問題。



不得自行猜測。



\---



\## 53. Definition of Done



TASK-0008 不得僅以「程式寫完」視為完成。



必須完成：



1\. Specification Freeze

2\. Implementation

3\. API Tests

4\. UI Tests

5\. Full Test Suite

6\. Frontend Build

7\. Browser Verification

8\. Regression Verification

9\. Scope Verification

10\. TASK Review

11\. Review PASS

12\. TASK-0008 Final FREEZE



\---



\## 54. Required Development Sequence



TASK-0008 固定流程：



`Specification Freeze`



↓



`AI Coding`



↓



`Repository Verification`



↓



`Implementation`



↓



`Unit / API Tests`



↓



`Full Tests`



↓



`Build`



↓



`Browser Verification`



↓



`Regression`



↓



`Scope Verification`



↓



`TASK Review`



↓



`TASK-0008 FREEZE`



\---



\## 55. TASK Review Requirements



Coding 完成後不得直接輸出正式完成文件。



必須先執行 TASK Review。



Review 至少確認：



\- Specification 是否完整實現

\- In Scope 是否全部完成

\- Out of Scope 是否未被實作

\- API 是否符合 Freeze

\- Data Model 是否符合 Freeze

\- Business Rules 是否符合 Freeze

\- Validation 是否符合 Freeze

\- Authorization 是否符合 Freeze

\- UI 是否符合 Freeze

\- Tests 是否足夠

\- Build 是否 PASS

\- Browser Verification 是否 PASS

\- Regression 是否 PASS

\- 是否存在額外功能

\- 是否存在 Scope Creep

\- 是否存在 Freeze Conflict



只有 Review PASS：



> 才可以宣告 TASK-0008 FREEZE。



\---



\## 56. Final Freeze Criteria



TASK-0008 Final FREEZE 必須同時滿足：



\- Decision 已完成

\- Specification Review PASS

\- Coding 完成

\- Tests PASS

\- Build PASS

\- Browser Verification PASS

\- Regression PASS

\- Scope Verification PASS

\- TASK Review PASS

\- 無未解決 Freeze Conflict



\---



\## 57. Coding Input



AI Coding 階段使用本正式文件：



`TASK-0008 服務管理 Service Management v1.0`



並搭配既有：



`TASK-CODING-AI-EXECUTION-PROMPT`



AI Coding 不得自行重新定義 TASK-0008。



本文件為 TASK-0008 Coding 的正式 Scope 與 Specification Baseline。



\---



\## 58. Current Status



| Item | Status |

|---|---|

| Decision | COMPLETE |

| Decision Count | 48 / 48 |

| Specification Consolidation | PASS |

| Specification Review | PASS |

| Specification Freeze | FREEZE |

| Formal Engineering Document | COMPLETE |

| Coding | NOT STARTED |

| Testing | NOT STARTED |

| Build | NOT STARTED |

| Browser Verification | NOT STARTED |

| Regression | NOT STARTED |

| TASK Review | NOT STARTED |

| Final TASK-0008 FREEZE | PENDING |



\---



\## 59. Final Specification Statement



TASK-0008 正式定義為：



> \*\*Service Management — 服務管理\*\*



其核心責任是建立簡潔、可實際使用、可供後續 Appointment / Grooming / Boarding / Order 使用的 Service Master Data 能力。



本 TASK 不建立複雜 Pricing、Eligibility、Versioning、Audit、RBAC 或其他 Enterprise Capability。



本 TASK 必須延續既有 MVP 技術基準、Block-based Development、TASK-0007 Freeze 決策與「該寫的才寫」工程原則。



本文件 Freeze 後，任何規格變更都必須重新進行明確 Decision / Review，不得在 Coding 階段自行修改。



\*\*TASK-0008 Specification Status：FREEZE\*\*

