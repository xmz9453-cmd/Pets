\# TASK-0008 FREEZE — 服務管理 Service Management v1.0



\## 1. Document Information



| Field | Value |

|---|---|

| Project | 小型寵物美容／寵物住宿工作室 MVP |

| Task | TASK-0008 |

| 中文名稱 | 服務管理 |

| English Name | Service Management |

| Version | v1.0 |

| Status | FREEZE |

| Previous Task | TASK-0007 寵物管理 Pet Management |

| Current Baseline | TASK-0007 FREEZE |

| UI Language | 繁體中文 |

| Formal Filename | `TASK-0008 服務管理 Service Management v1.0.md` |



\---



\## 2. Task Objective



TASK-0008 負責建立 MVP 的「服務管理 Service Management」功能。



服務管理提供店家對寵物美容／住宿服務項目的基本維護能力，作為後續 Appointment、Grooming、Boarding、Order 等功能使用服務資料的基礎。



本 TASK 遵循 MVP 原則：



> 該寫的才寫。



不建立企業級定價、版本管理、商品編碼、稽核系統或其他非 MVP 必要抽象。



\---



\## 3. Scope



\### 3.1 In Scope



TASK-0008 包含：



\- Service List

\- Service Search

\- Service Type Filter

\- Service Status Filter

\- Service Create

\- Service Read

\- Service Update

\- Service Delete

\- Service ACTIVE / INACTIVE 狀態管理

\- Service 基本資料驗證

\- Service 價格驗證

\- Service 時間驗證

\- Service 排序

\- Service Species 設定

\- Service Type 設定

\- Service Unit 設定

\- Service Name 唯一性

\- Appointment Service 關聯保護

\- Pet / Service Species Compatibility Validation

\- Staff Authentication

\- Staff Authorization

\- Service Management UI

\- 首頁 Service Management 入口

\- Loading State

\- Empty State

\- Error State

\- Save State

\- Validation State

\- Confirmation UI

\- API Tests

\- Regression Tests

\- Browser Verification



\---



\## 4. Out of Scope



TASK-0008 不包含：



\- Dynamic Pricing

\- Service Price Versioning

\- Service Price History

\- Audit Log

\- Enterprise RBAC

\- SKU

\- Barcode

\- Product Inventory

\- POS

\- Payment

\- Reporting

\- Online Booking

\- LINE API

\- Customer-facing Service Booking

\- Service Eligibility Engine

\- 複雜服務套餐

\- 服務加價規則

\- 複雜價格計算引擎

\- 服務歷史版本管理

\- 非 MVP 所需的 Enterprise Abstraction



不得因 Service Management 實作而擴張上述功能。



\---



\## 5. Existing Service Data Compatibility



TASK-0008 開始前，既有 Appointment Management migration 已建立 `services` table。



既有：



\- `services.id`

\- `services.name`

\- `services.description`

\- `services.price`

\- `services.status`



並且：



`appointment\_pet\_services.service\_id`



已建立對：



`services.id`



的 Foreign Key 關聯。



因此 TASK-0008 不得：



\- 刪除既有 `services` table

\- 重建既有 `services` table

\- 改變既有 Service ID

\- 破壞 `appointment\_pet\_services.service\_id`

\- 移除既有 Appointment Service 關聯



TASK-0008 採：



> 新增 migration 擴充既有 `services` schema。



既有 migration `006\_create\_appointment\_management.sql` 保留不修改。



\---



\## 6. Existing Service Backfill



既有 Service 共 4 筆：



| ID | Name | Price | Status |

|---:|---|---:|---|

| 1 | Basic Grooming | 890.00 | ACTIVE |

| 2 | Bath \& Dry | 450.00 | ACTIVE |

| 3 | Nail Trim | 180.00 | ACTIVE |

| 4 | Hair Styling | 650.00 | ACTIVE |



TASK-0008 擴充既有 Service 資料時，必須保留：



\- ID

\- Name

\- Description

\- Price

\- Status

\- Existing Appointment relationships



既有 Service Backfill：



| Field | Backfill |

|---|---|

| type | `GROOMING` |

| unit | `次` |

| species | `BOTH` |

| duration\_minutes | `60` |

| sort\_order | 依既有 ID 順序設定為 1–4 |

| status | 保留 `ACTIVE` |



因此：



| Service ID | type | unit | species | duration\_minutes | sort\_order | status |

|---:|---|---|---|---:|---:|---|

| 1 | GROOMING | 次 | BOTH | 60 | 1 | ACTIVE |

| 2 | GROOMING | 次 | BOTH | 60 | 2 | ACTIVE |

| 3 | GROOMING | 次 | BOTH | 60 | 3 | ACTIVE |

| 4 | GROOMING | 次 | BOTH | 60 | 4 | ACTIVE |



\---



\## 7. Database Requirements



\### 7.1 Service Data Model



Service 必須支援：



\- `id`

\- `name`

\- `description`

\- `type`

\- `unit`

\- `price`

\- `species`

\- `duration\_minutes`

\- `sort\_order`

\- `status`

\- `created\_at`

\- `updated\_at`



\### 7.2 Service Type



Service Type 至少支援：



`GROOMING`



實際 implementation 應依 Freeze Specification 所定義的合法 Type 驗證。



\### 7.3 Service Unit



Service Unit 必須支援：



`次`



\### 7.4 Species



Service Species 必須支援：



\- `DOG`

\- `CAT`

\- `BOTH`



其中：



`BOTH`



表示該 Service 同時適用於犬與貓。



\### 7.5 Duration



`duration\_minutes`：



\- 必須為整數

\- 以分鐘表示

\- 必須為必要資料

\- 不允許以 NULL 作為正常 Service 資料



既有資料已透過 migration backfill 為：



`60`



\### 7.6 Sort Order



`sort\_order` 用於 Service List 顯示順序。



既有 Service backfill 依 ID 順序：



\- ID 1 → 1

\- ID 2 → 2

\- ID 3 → 3

\- ID 4 → 4



\### 7.7 Status



Service Status：



\- `ACTIVE`

\- `INACTIVE`



Service 停用不得刪除資料。



\---



\## 8. Migration Requirements



TASK-0008 必須新增 Service Management migration。



Migration 順序：



1\. `001`

2\. `002`

3\. `003`

4\. `004`

5\. `005`

6\. `006\_create\_appointment\_management.sql`

7\. TASK-0008 Service Management migration



Migration runner 依檔名排序執行尚未執行的 migration。



TASK-0008 不得修改既有 `006\_create\_appointment\_management.sql`。



Migration 必須：



\- 擴充既有 `services`

\- 保留既有資料

\- 保留既有 Service ID

\- 保留既有 Appointment Foreign Key

\- 完成既有資料 backfill

\- 使既有資料符合 TASK-0008 Service Schema



\---



\## 9. Seed Requirements



既有 Service seed 必須與新的 Service Schema 相容。



Seed 必須明確維護 Service 所需欄位。



既有 Service ID：



\- 1

\- 2

\- 3

\- 4



必須保留。



既有 seed 使用 `ON DUPLICATE KEY UPDATE` 時，不得造成既有 Appointment 關聯失效。



Seed 執行結果必須維持既有 Service 資料可用。



\---



\## 10. Repository Layer



Service Management 必須建立獨立 Repository。



Repository 負責：



\- Service List 查詢

\- Service Search

\- Service Type Filter

\- Service Status Filter

\- Service Create

\- Service Update

\- Service Delete

\- Service Name 查詢

\- Service ID 查詢

\- Appointment Service 關聯檢查所需資料查詢



Repository 不負責：



\- HTTP Response

\- Request Validation

\- Authorization

\- UI 邏輯

\- 非 Service Scope 的商業規則



\---



\## 11. Service Layer



Service Business Logic 必須集中於 Service Layer。



Service Layer 負責：



\- Service Create Business Rules

\- Service Update Business Rules

\- Service Delete Business Rules

\- Status Management

\- Name Uniqueness

\- Field Validation

\- Species Compatibility

\- Appointment Relationship Protection

\- Repository 呼叫協調



不得將複雜商業規則直接散落於 Controller 或 Route。



\---



\## 12. Controller Layer



Controller 負責：



\- 接收 HTTP Request

\- 解析 Request Parameters

\- 呼叫 Service Layer

\- 回傳 HTTP Response

\- 統一錯誤處理



Controller 不應直接操作 MySQL。



\---



\## 13. Route Requirements



Service API：



\- `GET /api/services`

\- `POST /api/services`

\- `PUT /api/services/:id`

\- `DELETE /api/services/:id`



\### 13.1 GET



支援 Service List。



支援：



\- Search

\- Type Filter

\- Status Filter



\### 13.2 POST



建立 Service。



必須執行：



\- Authentication

\- Authorization

\- Required Field Validation

\- Type Validation

\- Unit Validation

\- Price Validation

\- Species Validation

\- Duration Validation

\- Sort Order Validation

\- Name Uniqueness Validation



\### 13.3 PUT



更新 Service。



允許更新：



\- Name

\- Description

\- Type

\- Unit

\- Price

\- Species

\- Duration

\- Sort Order

\- Status



Service 狀態與 Service 資料統一透過：



`PUT /api/services/:id`



不得建立獨立：



\- activate endpoint

\- deactivate endpoint



\### 13.4 DELETE



刪除 Service 前必須檢查既有 Appointment Service 關聯。



若 Service 已被歷史 Appointment 使用：



> 不得破壞歷史關聯。



應拒絕刪除並回傳適當錯誤。



若 Service 沒有受到既有歷史關聯保護，則允許刪除。



\---



\## 14. Authorization



Service Management 必須沿用既有 Staff Authentication / Authorization 架構。



不得自行建立新的 Enterprise RBAC。



Service API 必須依既有角色與權限模型執行。



未授權請求必須被拒絕。



既有 Authentication / Authorization 機制不得因 TASK-0008 被重構成新的架構。



\---



\## 15. Validation Requirements



\### 15.1 Name



\- 必填

\- 不得為空白

\- 必須符合 Service Name 規則

\- 必須維持唯一性



\### 15.2 Description



可選。



\### 15.3 Type



必須為合法 Service Type。



\### 15.4 Unit



必須為合法 Service Unit。



\### 15.5 Price



\- 必須為合法數值

\- 不得為負數

\- 必須符合既定價格格式



\### 15.6 Species



必須為：



\- `DOG`

\- `CAT`

\- `BOTH`



\### 15.7 Duration



\- 必填

\- 必須為整數

\- 單位為分鐘

\- 必須符合正數時間規則



\### 15.8 Sort Order



\- 必須為合法整數

\- 用於 Service 顯示排序



\### 15.9 Status



必須為：



\- `ACTIVE`

\- `INACTIVE`



\---



\## 16. Species Compatibility



Service 必須支援 Species Compatibility Validation。



當 Service 被指定為：



\- `DOG`



只能適用於 Dog。



當 Service 被指定為：



\- `CAT`



只能適用於 Cat。



當 Service 被指定為：



\- `BOTH`



可適用於 Dog 與 Cat。



TASK-0008 不建立獨立 Eligibility Engine。



\---



\## 17. UI Requirements



Service Management UI 必須使用繁體中文。



不得採取：



> 先英文 UI，再翻譯繁中。



應直接以繁體中文設計 UI 文案。



\### 17.1 Service List



必須提供 Service List。



至少顯示適當的：



\- 服務名稱

\- 類型

\- 單位

\- 價格

\- 適用物種

\- 服務時間

\- 排序

\- 狀態

\- 操作



\### 17.2 Search



使用者可以搜尋 Service。



\### 17.3 Filter



支援：



\- Type Filter

\- Status Filter



\### 17.4 Create



提供新增服務流程。



\### 17.5 Edit



提供編輯服務流程。



\### 17.6 Status



提供：



\- 啟用

\- 停用



停用必須有適當確認流程。



\### 17.7 Delete



刪除必須有確認流程。



若存在歷史 Appointment 關聯，UI 必須正確顯示刪除失敗原因。



\### 17.8 Loading State



資料載入期間必須提供 Loading State。



\### 17.9 Empty State



沒有 Service 時必須提供 Empty State。



\### 17.10 Error State



API 或資料載入失敗時必須提供 Error State。



\### 17.11 Save State



新增／編輯 Service 時必須提供適當 Save State。



\### 17.12 Validation State



輸入資料不符合規則時，UI 必須提供適當 Validation Feedback。



\---



\## 18. Homepage Integration



首頁必須提供 Service Management 入口。



使用者登入後可由既有首頁進入：



> 服務管理



不得因此重新設計首頁資訊架構。



\---



\## 19. Existing Feature Compatibility



TASK-0008 必須與既有功能相容。



\### 19.1 Customer



不得修改 Customer 核心功能。



\### 19.2 Pet



不得破壞 TASK-0007 Pet Management。



\### 19.3 Appointment



必須保留：



`appointment\_pet\_services.service\_id`



對：



`services.id`



的關聯。



\### 19.4 Authentication



沿用既有 Authentication。



\### 19.5 Authorization



沿用既有 Authorization。



\---



\## 20. Testing Requirements



TASK-0008 必須建立 Service Management API Tests。



測試至少涵蓋：



\- Service List

\- Service Search

\- Type Filter

\- Status Filter

\- Create

\- Update

\- Delete

\- Validation

\- Name Uniqueness

\- Status Change

\- Authorization

\- Appointment Relationship Protection

\- Species Compatibility



\---



\## 21. Regression Testing



TASK-0008 完成後必須執行完整既有測試。



Regression 必須確認：



\- TASK-0001 Foundation

\- TASK-0002～TASK-0006

\- TASK-0007 Pet Management

\- Appointment Service Relationship

\- Authentication

\- Authorization



不得因 TASK-0008 造成既有功能 Regression。



\---



\## 22. Build Verification



Frontend production build 必須 PASS。



Backend check 必須 PASS。



Diagnostics 不得存在阻斷性錯誤。



\---



\## 23. Browser Verification



Service Management Browser Verification 必須涵蓋：



\- Login

\- Service List

\- Service Create

\- Service Edit

\- Price Update

\- Service Deactivate

\- Service Reactivate

\- Service Delete Confirmation

\- Service Delete

\- Loading State

\- Empty State

\- Error State

\- Validation

\- Traditional Chinese UI

\- Homepage Service Management Entry



既有 Service 資料必須正確顯示。



\---



\## 24. Completed Verification



TASK-0008 實作完成後已完成以下驗證。



\### 24.1 Focused Service Tests



\- Service Tests：4/4 PASS



\### 24.2 Full Tests



\- Test Suites：8

\- Tests：36

\- Result：PASS



\### 24.3 Backend



\- Backend Check：PASS



\### 24.4 Frontend



\- Next.js Production Build：PASS



\### 24.5 Static Diagnostics



\- Diagnostics：無錯誤



\### 24.6 Database



已確認：



\- Service 資料存在

\- Service ID 1–4 保留

\- Service 總數可正確維持

\- `appointment\_pet\_services.service\_id` Foreign Key 保留

\- Migration 可執行

\- Seed 可成功執行



\### 24.7 Browser Verification



已完成：



\- Service List：PASS

\- 新增 Service：PASS

\- 編輯 Service：PASS

\- 編輯價格：PASS

\- 停用：PASS

\- 重新啟用：PASS

\- 刪除確認：PASS

\- 刪除：PASS

\- 刪除後列表恢復既有 4 筆：PASS

\- Loading State：PASS

\- Empty State：PASS

\- Error State：PASS

\- 繁體中文 UI：PASS

\- 首頁 Service Management 入口：PASS



\---



\## 25. Regression Verification



TASK-0008 Review 已確認：



\- TASK-0007 Pet API：PASS

\- TASK-0007 Pet Status Flow：PASS

\- Appointment Service Relationship：PASS

\- Existing Authentication：PASS

\- Existing Authorization：PASS

\- Existing Test Regression：PASS



\---



\## 26. Scope Verification



TASK-0008 Review 已確認未加入：



\- Dynamic Pricing

\- Price Versioning

\- Audit

\- Enterprise RBAC

\- SKU

\- Barcode

\- Inventory

\- POS

\- Payment

\- Reporting

\- Online Booking

\- LINE API

\- Service Eligibility Engine

\- 其他非 MVP Service 功能



判定：



> No Scope Creep



\---



\## 27. Implementation Files



TASK-0008 實作範圍包含：



\- `database/migrations/007\_extend\_services\_for\_service\_management.sql`

\- `database/seeds/003\_appointment\_service\_seed.sql`

\- `backend/src/data/service.repository.js`

\- `backend/src/services/service.service.js`

\- `backend/src/controllers/service.controller.js`

\- `backend/src/routes/service.routes.js`

\- `frontend/pages/services.js`

\- `testing/tests/service.test.js`



並依實際整合需要更新：



\- Backend App Route

\- Frontend API Client

\- Homepage Service Management Entry

\- Appointment Species Validation



\---



\## 28. Engineering Constraints



TASK-0008 必須遵守既有技術基線：



\### Frontend



\- Next.js

\- Pages Router

\- JavaScript

\- Bootstrap



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



\## 29. Architecture



固定架構：



Frontend：



`Next.js → Express.js API → mysql2 → MySQL`



Service Management 必須沿用既有：



`Route → Controller → Service → Repository → MySQL`



不得因 TASK-0008 引入不必要的 Enterprise Architecture。



\---



\## 30. Engineering Principle



本 TASK 遵循：



> 該寫的才寫。



實作應保持：



\- 小型

\- 清楚

\- 可維護

\- 可測試

\- 與 MVP Scope 一致



不得為未來假設需求建立過度抽象。



\---



\## 31. Definition of Done



TASK-0008 必須同時符合：



\- \[x] Service Management Scope 完成

\- \[x] Service Database Schema 完成

\- \[x] Existing Service Backfill 完成

\- \[x] Service Repository 完成

\- \[x] Service Service Layer 完成

\- \[x] Service Controller 完成

\- \[x] Service Routes 完成

\- \[x] Authentication 完成

\- \[x] Authorization 完成

\- \[x] Validation 完成

\- \[x] Service CRUD 完成

\- \[x] Search 完成

\- \[x] Filter 完成

\- \[x] Status Flow 完成

\- \[x] Delete Protection 完成

\- \[x] Species Compatibility 完成

\- \[x] Traditional Chinese UI 完成

\- \[x] Homepage Entry 完成

\- \[x] Loading State 完成

\- \[x] Empty State 完成

\- \[x] Error State 完成

\- \[x] Save State 完成

\- \[x] Validation UI 完成

\- \[x] Focused Tests PASS

\- \[x] Full Tests PASS

\- \[x] Backend Check PASS

\- \[x] Frontend Build PASS

\- \[x] Browser Verification PASS

\- \[x] Regression PASS

\- \[x] Scope Review PASS

\- \[x] Freeze Review PASS



\---



\## 32. TASK Review



TASK-0008 已完成 Review。



Review 結果：



\- Specification：PASS

\- Scope：PASS

\- Database：PASS

\- API：PASS

\- Business Logic：PASS

\- Authorization：PASS

\- Validation：PASS

\- UI：PASS

\- Testing：PASS

\- Build：PASS

\- Browser Verification：PASS

\- Regression：PASS

\- Existing Feature Compatibility：PASS

\- Scope Creep Check：PASS

\- Freeze Conflict Check：PASS



Review 結論：



> TASK-0008 Review = PASS



\---



\## 33. Freeze Status



TASK-0008 已完成：



`Decision → Freeze Specification → Coding → Test → Browser Verification → Review`



所有必要驗證已完成。



最終狀態：



> TASK-0008 = FREEZE



TASK-0008 FREEZE 後，以上規格、資料模型、API、Validation、Authorization、UI、Testing、Verification 與 Scope 視為既定基準。



後續 TASK 不得自行推翻 TASK-0008 FREEZE。



如後續 TASK 發現與本 Freeze 存在衝突，必須先進行 Freeze Conflict Check，不得自行修改既定規格。



\---



\## 34. Next Task Baseline



下一個 TASK 必須以：



> TASK-0008 FREEZE



作為前置完成基準。



後續 TASK 啟動時必須先：



1\. Repository Inspection

2\. Specification Inspection

3\. Scope Check

4\. Dependency Check

5\. Freeze Conflict Check



確認無衝突後才可進入下一 TASK 的 Decision 或 Coding 流程。



\---



\## 35. Final Status



| Item | Status |

|---|---|

| TASK-0008 Specification | FREEZE |

| Implementation | PASS |

| Database Migration | PASS |

| Seed Compatibility | PASS |

| API | PASS |

| Validation | PASS |

| Authorization | PASS |

| UI | PASS |

| Tests | PASS |

| Build | PASS |

| Browser Verification | PASS |

| Regression | PASS |

| Review | PASS |

| Scope Review | PASS |

| TASK-0008 | \*\*FREEZE\*\* |



\---



\## 36. Formal Document Record



| Field | Value |

|---|---|

| Formal Document | TASK-0008 服務管理 Service Management v1.0 |

| Document Version | v1.0 |

| Task Status | FREEZE |

| Implementation Status | PASS |

| Review Status | PASS |

| Verification Status | PASS |

| Freeze Status | FREEZE |

| Next Baseline | TASK-0008 FREEZE |

