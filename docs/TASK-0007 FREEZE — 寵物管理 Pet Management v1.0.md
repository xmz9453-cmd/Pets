\# TASK-0007 FREEZE — 寵物管理 Pet Management v1.0



\## 1. Document Information



| Field | Value |

|---|---|

| Task | TASK-0007 |

| 中文名稱 | 寵物管理 |

| English Name | Pet Management |

| Document Type | TASK FREEZE |

| Version | v1.0 |

| Project | MVP 寵物美容／住宿工作室系統 |

| Status | FREEZE |

| Scope | 寵物管理功能 |

| Previous Baseline | TASK-0006 以前既有系統 |

| UI Language | 繁體中文 |

| Freeze Status | Implementation PASS / Browser Verification PASS |



\### Formal Filename



`TASK-0007 寵物管理 Pet Management v1.0.md`



\---



\## 2. Task Objective



TASK-0007 負責建立 MVP 寵物管理功能。



本 Task 必須讓店家能夠：



\- 建立寵物資料

\- 查看寵物資料

\- 搜尋寵物

\- 依客戶篩選寵物

\- 依寵物狀態篩選

\- 編輯寵物資料

\- 停用寵物

\- 重新啟用寵物

\- 管理寵物與客戶之間的關聯



本 Task 不改變既有核心架構，不擴張至其他尚未實作的 Block。



\---



\## 3. Scope



\### 3.1 In Scope



本 Task 包含：



\- Pet 資料 CRUD

\- Pet List

\- Pet Search

\- Customer Filter

\- Status Filter

\- Customer Relationship

\- Pet Status

\- Species

\- Gender

\- Birthday

\- Notes

\- 寵物管理 UI

\- API

\- Repository

\- Service

\- Controller / Route

\- API Tests

\- Browser UI Verification



\### 3.2 Existing Pet Data



沿用既有 `pets` 資料模型與相關資料表。



本 Task 不新增另一套寵物資料模型。



\---



\## 4. Out of Scope



本 Task 不包含：



\- Grooming

\- Boarding

\- Order

\- Payment

\- Product

\- Report

\- Daily Operations

\- 寵物美容執行流程

\- 住宿生命週期

\- 商品庫存

\- POS

\- LINE API

\- Online Booking

\- 多租戶 SaaS

\- Enterprise RBAC

\- 新增獨立 i18n 架構



本 Task 不修改：



\- 既有 Database 架構以外的無關資料模型

\- Authentication 架構

\- Authorization 架構

\- 非 Pet 功能的 API Contract

\- 非 Pet 功能的 Business Logic



\---



\## 5. Pet Data Requirements



\### 5.1 Required Relationship



每一隻寵物必須隸屬於一個 Customer。



\### 5.2 Customer Validation



建立或修改寵物時：



\- Customer 必須存在。

\- Customer 必須為 `ACTIVE`。

\- `INACTIVE` Customer 不得建立新的寵物關聯。

\- Customer Transfer 必須遵守相同的 ACTIVE Customer 規則。



\### 5.3 Pet Fields



Pet UI / API 支援：



\- Customer

\- Name

\- Species

\- Breed

\- Gender

\- Birth Date

\- Notes

\- Status



\### 5.4 Species



Species 必須使用系統允許的物種值。



目前 MVP 僅支援：



\- DOG

\- CAT



不得任意加入其他 Species。



\### 5.5 Gender



Gender 使用既定系統值。



Gender 不得因 UI 中文化而修改 API / Database 儲存值。



\### 5.6 Birth Date



Birth Date：



\- 可為空。

\- 若有輸入，必須為有效日期。

\- 不得為未來日期。

\- API 必須進行實際驗證，不得僅依賴 Browser input validation。



\### 5.7 Notes



Notes 為寵物備註欄位，可供店家記錄寵物相關資訊。



\---



\## 6. Pet Status



Pet Status 為資料狀態值。



支援：



\- `ACTIVE`

\- `INACTIVE`



資料庫中的狀態值維持英文系統識別值。



UI 僅負責將資料狀態映射為繁體中文顯示。



\### UI Display



| Data Value | UI Display |

|---|---|

| `ACTIVE` | 啟用 |

| `INACTIVE` | 停用 |



不得因 UI 中文化修改 Database Status Value。



\---



\## 7. API Contract



\### 7.1 Create



`POST /api/pets`



用途：



建立新的寵物。



\### 7.2 List



`GET /api/pets`



支援：



\- Search

\- Customer Filter

\- Status Filter



列表預設依 `created\_at DESC` 排序。



\### 7.3 Get Single Pet



`GET /api/pets/:id`



用途：



取得指定寵物。



\### 7.4 Update



`PUT /api/pets/:id`



用途：



更新寵物資料。



更新 API 同時負責：



\- 一般資料修改

\- Customer 關聯修改

\- Status 修改



不得另外建立獨立的 Pet Activate API 或 Pet Deactivate API。



\### 7.5 Delete



MVP 不提供 Pet DELETE API。



\---



\## 8. API Status Update Rule



寵物狀態透過：



`PUT /api/pets/:id`



更新。



不提供：



\- `POST /api/pets/:id/activate`

\- `POST /api/pets/:id/deactivate`

\- `DELETE /api/pets/:id`



等獨立生命週期 API。



\---



\## 9. Validation



\### 9.1 Authentication



Pet API 必須要求有效登入狀態。



未登入：



`401 Unauthorized`



\### 9.2 Resource Validation



不存在的 Pet：



`404 Not Found`



不存在的 Customer：



必須拒絕。



\### 9.3 Customer Status



Customer 為 `INACTIVE` 時：



\- 不得建立新的 Pet。

\- 不得將 Pet Transfer 至該 Customer。



\### 9.4 Species Validation



不允許的 Species 必須拒絕。



\### 9.5 Birthday Validation



Birthday：



\- 必須為有效日期。

\- 不得為未來日期。



\### 9.6 Status Validation



只允許：



\- `ACTIVE`

\- `INACTIVE`



其他狀態值必須拒絕。



\---



\## 10. Customer Transfer



Pet 可以修改所屬 Customer。



修改 Customer 關聯時：



1\. Customer 必須存在。

2\. Customer 必須為 `ACTIVE`。

3\. 不得將 Pet 轉移至不存在的 Customer。

4\. 不得將 Pet 轉移至 `INACTIVE` Customer。



Customer Transfer 不建立獨立 API。



統一透過：



`PUT /api/pets/:id`



處理。



\---



\## 11. Repository Layer



Pet Repository 負責：



\- Create

\- Find By ID

\- List

\- Search

\- Customer Filter

\- Status Filter

\- Update

\- Status Update



Repository 不負責：



\- HTTP Response

\- Authentication

\- Business Rule Decision



`customer\_id` 等關聯資料依既有資料模型處理。



\---



\## 12. Service Layer



Pet Service 負責：



\- Customer existence validation

\- Customer ACTIVE validation

\- Species validation

\- Gender validation

\- Birthday validation

\- Status validation

\- Customer Transfer validation

\- Pet business rules



Service 不應將 Business Rule 移至 Frontend。



\---



\## 13. Route Layer



Pet Routes 負責：



\- Authentication boundary

\- Request parsing

\- Calling Service

\- HTTP status mapping

\- Response handling



Pet Route 必須保持 REST API 邊界清楚。



\---



\## 14. Frontend UI



\### 14.1 Route



新增：



`/pets`



\### 14.2 UI Language



Pet Management UI 必須直接使用繁體中文。



不採用：



> 先英文實作，再另外中文化。



TASK-0007 起，新 UI 即直接使用已 Freeze 的繁體中文 UI 規則。



\### 14.3 Main UI



Pet Management 頁面包含：



\- 寵物管理

\- 新增寵物

\- 搜尋

\- 客戶篩選

\- 狀態篩選

\- 清除

\- 寵物列表

\- 編輯

\- 停用

\- 啟用



\### 14.4 Form



表單至少包含：



\- 所屬客戶

\- 名稱

\- 物種

\- 品種

\- 性別

\- 生日

\- 備註



\### 14.5 Status UI



| System Value | Display |

|---|---|

| `ACTIVE` | 啟用 |

| `INACTIVE` | 停用 |



\### 14.6 Loading State



UI 必須提供繁體中文 Loading 狀態。



\### 14.7 Empty State



無符合條件的寵物時，必須提供繁體中文 Empty State。



\### 14.8 Error State



API Error 必須以繁體中文 UI 呈現。



\### 14.9 Save State



儲存過程使用繁體中文狀態文字。



\### 14.10 Deactivate Confirmation



停用寵物前必須提供確認。



Browser Verification 已確認確認訊息：



`確定要停用這隻寵物嗎？`



\---



\## 15. Home Integration



首頁必須提供寵物管理入口。



Pet Management 入口：



`寵物`



點擊後進入：



`/pets`



\---



\## 16. API Client



Frontend API Client 必須使用 TASK-0007 Freeze 後的 API Contract。



Update Pet：



`PUT /api/pets/:id`



不得繼續使用舊版：



`PATCH /api/pets/:id`



不得呼叫已移除的：



\- activate endpoint

\- deactivate endpoint



\---



\## 17. Testing



\### 17.1 Pet API Tests



必須驗證：



\- 未登入 → 401

\- 不存在 Pet → 404

\- 建立 Pet

\- 非法 Species

\- 非法 Status

\- 未來 Birthday

\- INACTIVE Customer

\- Customer Transfer

\- Pet List

\- Search

\- Customer Filter

\- Status Filter

\- Status Update



\### 17.2 Existing Test Suite



TASK-0007 完成後必須執行既有完整測試。



\---



\## 18. Browser Verification



\### 18.1 `/pets` Loading



PASS：



\- `/pets` 可正常載入。

\- 頁面可正常顯示。

\- UI 為繁體中文。



\### 18.2 Pet List



PASS：



\- 既有寵物可正常載入。

\- 列表排序符合 `created\_at DESC`。

\- Customer 與 Status Filter 可使用。



\### 18.3 Create



PASS：



實際 Browser 操作建立測試寵物：



`Browser Verify Pet`



建立成功並出現在列表。



\### 18.4 Deactivate



PASS：



Browser 實測：



1\. 點擊停用。

2\. 顯示繁中確認訊息。

3\. 確認後送出 Update。

4\. Pet 狀態更新為停用。



\### 18.5 Reactivate



PASS：



Browser 實測：



1\. 對停用 Pet 執行啟用。

2\. 狀態恢復為啟用。

3\. UI 正常更新。



\### 18.6 Frontend Build



PASS：



Next.js production build 成功。



\---



\## 19. Verification Result



\### Pet Test



`4/4` Pet-focused test suites / scenarios PASS。



\### Full Test Suite



`7` test suites



`32` tests



全部 PASS。



\### Frontend Build



PASS。



\### Browser Gate



PASS。



已實際驗證：



\- `/pets`

\- 新增寵物

\- 寵物列表

\- 停用確認

\- 停用

\- 重新啟用

\- 繁體中文 UI



\---



\## 20. Implementation Files



TASK-0007 實作涉及：



\- `backend/src/data/pet.repository.js`

\- `backend/src/services/pet.service.js`

\- `backend/src/routes/pet.routes.js`

\- `frontend/api/client.js`

\- `frontend/pages/index.js`

\- `frontend/pages/pets.js`

\- `testing/tests/pet.test.js`



以上檔案以 TASK-0007 FREEZE 為實作基準。



\---



\## 21. Scope Protection



TASK-0007 實作不得：



\- 修改非 Pet 功能的 Business Logic。

\- 修改非 Pet API Contract。

\- 修改 Database 無關結構。

\- 新增未 Freeze 的功能。

\- 新增 Pet DELETE。

\- 新增獨立 Activate API。

\- 新增獨立 Deactivate API。

\- 擴張至 Grooming。

\- 擴張至 Boarding。

\- 擴張至 Order。

\- 擴張至 Payment。

\- 擴張至 Product。

\- 擴張至 Report。



\---



\## 22. UI Localization Rule



自 TASK-0007 起：



> 新增 UI 必須直接使用繁體中文。



已 Freeze 的 UI 詞彙優先使用：



`UI 繁體中文化基準 Traditional Chinese UI Localization Baseline v1.0.md`



若未來 TASK 出現新的使用者可見英文語意，而 Baseline 尚未定義：



1\. 在該 TASK 的決策階段提出。

2\. 提供 AI 推薦。

3\. 使用者確認。

4\. 更新 Localization Baseline。

5\. Coding AI 再依確認結果實作。



不得預先為尚未存在的未來 UI 無限擴張 Localization Scope。



\---



\## 23. Regression



TASK-0007 完成後：



\- Existing Authentication 必須維持。

\- Existing Customer 功能必須維持。

\- Existing Appointment 功能必須維持。

\- Existing Shop Settings 功能必須維持。

\- TASK-0006 前既有 UI 繁體中文化不得被回退。

\- Pet 功能不得破壞既有 API。

\- Pet 功能不得破壞既有 Database relationship。



完整測試結果：



`7 suites / 32 tests PASS`



\---



\## 24. Definition of Done



TASK-0007 僅在以下條件全部成立時視為完成：



\- \[x] Pet CRUD 完成

\- \[x] Pet List 完成

\- \[x] Pet Search 完成

\- \[x] Customer Filter 完成

\- \[x] Status Filter 完成

\- \[x] Customer ACTIVE validation 完成

\- \[x] Customer Transfer 完成

\- \[x] Species validation 完成

\- \[x] Gender validation 完成

\- \[x] Birthday validation 完成

\- \[x] Status validation 完成

\- \[x] `PUT /api/pets/:id` 完成

\- \[x] 舊 PATCH 更新契約移除

\- \[x] 獨立 activate endpoint 移除

\- \[x] 獨立 deactivate endpoint 移除

\- \[x] DELETE endpoint 未提供

\- \[x] `/pets` 完成

\- \[x] 首頁 Pet 入口完成

\- \[x] Pet UI 繁體中文化完成

\- \[x] Loading UI 完成

\- \[x] Empty UI 完成

\- \[x] Error UI 完成

\- \[x] Save UI 完成

\- \[x] Deactivate confirmation 完成

\- \[x] Pet tests PASS

\- \[x] Full test suite PASS

\- \[x] Frontend build PASS

\- \[x] Browser `/pets` PASS

\- \[x] Browser Create PASS

\- \[x] Browser Deactivate PASS

\- \[x] Browser Reactivate PASS

\- \[x] Scope verification PASS



\---



\## 25. Final Freeze Decision



TASK-0007：



> \*\*FREEZE\*\*



TASK-0007 的規格、API Contract、Business Rules、UI 行為、測試要求及驗證結果以本文件為正式基準。



舊版 TASK-0007 若與本文件內容衝突：



> \*\*以本 TASK-0007 FREEZE 文件為唯一有效實作基準。\*\*



後續 TASK 不得自行回復已移除的舊 Pet API Contract。



\---



\## 26. Next Task Rule



TASK-0007 完成後，下一個工作階段進入：



> \*\*TASK-0008\*\*



TASK-0008 必須：



1\. 先進行需求與 Scope 決策。

2\. 每批提出 10–15 題。

3\. 每題提供 AI 推薦答案。

4\. 使用者可直接回答「全部照 AI 推薦」。

5\. 若使用者指定題目修改，只修改指定題目。

6\. 每批完成後直接進入下一批。

7\. 每次回報目前決策進度與剩餘問題數。

8\. 未完成決策前不得進入 Coding AI 實作。

9\. Freeze 後才進入 Coding AI。

10\. 新增 UI 從實作開始即遵守繁體中文 UI 規則。



\---



\## 27. Final Status



```text

TASK

&#x20; TASK-0007



NAME

&#x20; 寵物管理 Pet Management



VERSION

&#x20; v1.0



STATUS

&#x20; FREEZE



IMPLEMENTATION

&#x20; PASS



API TEST

&#x20; PASS



FULL TEST

&#x20; 7 suites / 32 tests PASS



FRONTEND BUILD

&#x20; PASS



BROWSER VERIFICATION

&#x20; PASS



PET CREATE

&#x20; PASS



PET UPDATE

&#x20; PASS



PET DEACTIVATE

&#x20; PASS



PET REACTIVATE

&#x20; PASS



PET SEARCH

&#x20; PASS



CUSTOMER FILTER

&#x20; PASS



STATUS FILTER

&#x20; PASS



CUSTOMER ACTIVE VALIDATION

&#x20; PASS



BIRTHDAY VALIDATION

&#x20; PASS



CUSTOMER TRANSFER

&#x20; PASS



TRADITIONAL CHINESE UI

&#x20; PASS



NEXT

&#x20; TASK-0008
28. Freeze Declaration



TASK-0007 寵物管理 Pet Management v1.0 正式 Freeze。



後續實作與相關變更必須以本文件為基準，任何規格變更必須經正式 Change Decision 後才能修改 Freeze 內容。

