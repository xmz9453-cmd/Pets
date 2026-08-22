\# TASK-0005\_店家設定區塊\_Shop-Settings-Block\_v1.0.md



\# TASK-0005 — 店家設定區塊（Shop Settings Block）



\## 1. Task Information



| Item | Value |

|---|---|

| Task ID | TASK-0005 |

| 中文名稱 | 店家設定區塊 |

| English Name | Shop Settings Block |

| Version | v1.0 |

| Task Type | MVP Business Block |

| Status | FREEZE |

| Specification Status | FREEZE |

| Previous Task | TASK-0004 — Customer Management Block |

| Next Stage | AI Coding Implementation |



\---



\## 2. Task Objective



建立 PSOP MVP 的「店家設定」Business Capability。



TASK-0005 的目標是在既有 PSOP MVP Architecture、Repository Pattern、Authentication、Frontend 結構與 Database 機制下，完成一個可實際使用的 Shop Settings Block。



Shop Settings 必須支援：



\- 店家基本資料管理

\- 每週 Monday～Sunday 營業時間管理

\- 已登入 Staff 查看設定

\- Owner 修改設定

\- Backend Authorization

\- Frontend 表單操作

\- Database Persistence

\- Validation

\- Automated Testing

\- Regression Testing

\- Browser Verification



TASK-0005 不重新設計既有 PSOP Architecture，也不得重新修改 TASK-0001～TASK-0004 已 Freeze 的 Business Capability。



\---



\## 3. Engineering Principle



本 Task 延續 PSOP MVP 核心工程原則：



> 「該寫的才寫。」



Implementation 必須：



\- 優先延續既有 Repository Pattern

\- 優先延續既有 Controller Pattern

\- 優先延續既有 Service Pattern

\- 優先延續既有 API Response / Error Pattern

\- 優先延續既有 Frontend API Client Pattern

\- 優先延續既有 Frontend Routing / Navigation Pattern

\- 優先延續既有 Database Setup / Migration 機制

\- 只加入 TASK-0005 必要程式

\- 不建立新的 Enterprise Abstraction

\- 不建立新的 Framework

\- 不建立新的通用 Architecture

\- 不進行無關重構



實際 Repository 狀態與已 Freeze 文件優先於 AI 記憶或推測。



\---



\# 4. Scope



\## 4.1 In Scope



TASK-0005 包含：



1\. Shop Settings Database Schema

2\. Shop Business Hours Database Schema

3\. Shop Settings Repository

4\. Shop Business Hours Repository

5\. Shop Settings Service

6\. Shop Settings Controller

7\. Shop Settings Routes

8\. API Mounting

9\. Authentication / Authorization Integration

10\. Frontend API Client

11\. Shop Settings Frontend Page

12\. Shop Basic Information Form

13\. Weekly Business Hours Form

14\. Validation

15\. Loading State

16\. Save

17\. Cancel

18\. Success / Error Feedback

19\. Automated Tests

20\. Regression Tests

21\. Browser Verification

22\. Scope Verification

23\. Stop Condition Verification



\---



\# 5. Out of Scope



TASK-0005 明確不包含：



\- Customer Management 修改

\- Pet Management 修改

\- Appointment Management

\- Service Management

\- Daily Operations

\- Grooming

\- Boarding

\- Order

\- Payment

\- Product

\- Report

\- Multi-tenant SaaS

\- Multi-shop Management

\- Enterprise RBAC

\- Audit Log Framework

\- Version History

\- Configuration Versioning

\- Permission Framework

\- Schedule Engine

\- Calendar Framework

\- PATCH API

\- DELETE API

\- Pagination

\- Enterprise Architecture

\- 新 Framework

\- 新 ORM

\- TypeScript

\- Tailwind

\- 無關既有程式重構



\---



\# 6. Existing Freeze Dependency



TASK-0005 必須建立在以下既有 Freeze Baseline 之上：



\- TASK-0001 — MVP Engineering Foundation

\- TASK-0002 — Staff and Authentication Foundation

\- TASK-0003 — Pet Management Block

\- TASK-0004 — Customer Management Block



TASK-0003 與 TASK-0004 已 PASS / FREEZE。



TASK-0005 不得自行修改上述 Freeze Scope。



如實作過程發現既有 Freeze Specification、Architecture 或 Repository 狀態存在衝突，必須立即停止。



\---



\# 7. Business Capability



\## 7.1 Shop Settings



Shop Settings 是 MVP 單店設定資料。



系統應提供：



\- 店家名稱

\- 店家電話

\- 店家地址

\- 店家 Email

\- 每週營業時間



店家名稱為必要資料。



電話、地址、Email 可以為空值。



\---



\# 8. Data Model



\## 8.1 Shop Settings



Shop Settings 為單一店家設定資料。



預期資料內容：



| Field | Rule |

|---|---|

| id | Single Shop Settings Record |

| name | Required |

| phone | Optional |

| address | Optional |

| email | Optional |

| created\_at | 延續既有 Timestamp Convention |

| updated\_at | 延續既有 Timestamp Convention |



Shop Settings 不建立多店資料模型。



\---



\## 8.2 Shop Business Hours



Business Hours 固定代表一週七天。



資料必須包含：



| Field | Rule |

|---|---|

| weekday | Monday～Sunday，必須唯一 |

| is\_closed | Boolean |

| open\_time | 營業日必須存在，休息日為 NULL |

| close\_time | 營業日必須存在，休息日為 NULL |

| created\_at | 延續既有 Timestamp Convention |

| updated\_at | 延續既有 Timestamp Convention |



\---



\# 9. Business Hours Rules



\## 9.1 Seven-Day Completeness



資料庫正常狀態必須保持：



\- Monday

\- Tuesday

\- Wednesday

\- Thursday

\- Friday

\- Saturday

\- Sunday



共七筆資料。



同一 `weekday` 不得存在重複資料。



Database Constraint 應負責禁止 `weekday` 重複。



\---



\## 9.2 Closed Day



當：



`is\_closed = true`



則：



\- `open\_time = NULL`

\- `close\_time = NULL`



Frontend 顯示：



> 休息



並停用時間輸入欄位。



\---



\## 9.3 Open Day



當：



`is\_closed = false`



則：



\- 必須提供 `open\_time`

\- 必須提供 `close\_time`

\- `open\_time` 必須早於 `close\_time`



\---



\# 10. Initial Data Strategy



Shop Settings 不建立固定店家 Demo Data。



第一次取得 Shop Settings 時：



1\. 如果 Shop Settings 不存在，建立預設 Shop Settings。

2\. 建立完整 Monday～Sunday 七天 Business Hours。

3\. 七天預設全部為休息日。

4\. 初始營業時間全部為 NULL。

5\. 回傳完整 Shop Settings。



系統不得自行猜測店家的營業日或營業時間。



\---



\# 11. Data Repair Rule



如果 GET Shop Settings 時發現 Business Hours 缺少某一天：



\- 自動補齊缺少的日期

\- 確保最終存在完整七天

\- 回傳完整七天資料



如果資料庫存在同一 `weekday` 重複資料：



\- 不由 GET API 自行猜測正確資料

\- Database Constraint 應防止正常寫入產生此狀態

\- 若實際 Repository 發現已存在異常資料，依 Stop Condition 處理，不得任意刪除資料



\---



\# 12. Database Transaction



Shop Settings 與 Business Hours 的完整更新必須維持資料一致性。



當一次 PUT 同時更新：



\- Shop Settings

\- Monday～Sunday Business Hours



應使用同一 Transaction。



成功：



> Commit



任何必要更新失敗：



> Rollback



不得接受部分成功狀態。



\---



\# 13. Business Hours Update Strategy



Business Hours 更新採 Upsert。



需求：



\- 已存在的 weekday → Update

\- 缺少的 weekday → Insert

\- 最終維持七天完整資料

\- 不建立歷史版本

\- 不建立 Audit Log



\---



\# 14. Concurrency Strategy



TASK-0005 不建立 Optimistic Lock、Version Control 或 Lock Framework。



若兩個瀏覽器分頁同時修改：



> 採 Last Write Wins。



不為此建立額外 Enterprise Concurrency Architecture。



\---



\# 15. API



\## 15.1 GET



Endpoint：



`GET /api/shop-settings`



用途：



取得目前 Shop Settings 與完整七天 Business Hours。



行為：



\- 已登入 Staff 可取得

\- 若資料不存在，依 Initial Data Strategy 初始化

\- 若 Business Hours 缺少日期，補齊

\- 回傳完整設定



\---



\## 15.2 PUT



Endpoint：



`PUT /api/shop-settings`



用途：



完整更新 Shop Settings 與七天 Business Hours。



規則：



\- Owner 可以更新

\- 非 Owner 不可更新

\- Request 採完整資料更新

\- Business Hours 一次提交 Monday～Sunday

\- 使用 Transaction

\- Business Hours 採 Upsert

\- 失敗必須 Rollback



\---



\## 15.3 Unsupported API



TASK-0005 不提供：



\- POST `/api/shop-settings`

\- PATCH `/api/shop-settings`

\- DELETE `/api/shop-settings`



不建立不必要的 API Surface。



\---



\# 16. API Convention



HTTP Status、Response Format、Error Format 必須延續目前 PSOP Repository 中既有 API Convention。



不得因 TASK-0005 建立另一套 API Response 或 Error Architecture。



實作前必須檢查既有 TASK-0002～TASK-0004 實際 API Pattern。



\---



\# 17. Authentication and Authorization



\## 17.1 GET Permission



所有已登入 Staff：



\- Owner：允許

\- Front Desk：允許

\- Groomer：允許



未登入：



\- 401



\---



\## 17.2 PUT Permission



Owner：



\- 允許



其他已登入 Staff：



\- 403



未登入：



\- 401



Backend 必須實際執行 Authorization。



Frontend Permission UI 不得取代 Backend Authorization。



\---



\# 18. Frontend



\## 18.1 Settings Page



建立 Shop Settings 管理頁面。



Route：



必須延續既有 Frontend Routing Convention。



如果現有專案尚無既定 Settings Route，採簡單且直觀的 Settings Route。



\---



\## 18.2 Navigation



Shop Settings 必須加入既有 Navigation / Menu。



不得建立新的 Navigation Framework。



所有已登入 Staff 可以看到進入 Shop Settings 的 Navigation。



\---



\# 19. Frontend Permission Behavior



Owner：



\- 顯示完整可編輯表單

\- 可 Save

\- 可 Cancel



其他 Staff：



\- 顯示設定資料

\- 表單為唯讀

\- 不提供可實際修改的操作



Backend 仍為最終 Authorization Boundary。



\---



\# 20. Shop Information Form



欄位：



\- 店家名稱

\- 電話

\- 地址

\- Email



規則：



\### Name



\- Required

\- Trim 後不可為空白字串



\### Phone



\- Optional



\### Address



\- Optional



\### Email



\- Optional

\- 如果有輸入，必須符合基本 Email Format



\---



\# 21. Business Hours Form



Frontend 必須顯示完整七天：



| Day | Closed | Open Time | Close Time |

|---|---|---|---|

| Monday | 可設定 | 可設定 | 可設定 |

| Tuesday | 可設定 | 可設定 | 可設定 |

| Wednesday | 可設定 | 可設定 | 可設定 |

| Thursday | 可設定 | 可設定 | 可設定 |

| Friday | 可設定 | 可設定 | 可設定 |

| Saturday | 可設定 | 可設定 | 可設定 |

| Sunday | 可設定 | 可設定 | 可設定 |



Closed：



\- 顯示「休息」

\- 停用時間輸入

\- 儲存時 open\_time / close\_time 為 NULL



切換為 Closed 時：



\- Frontend 可以暫時保留原本時間

\- 實際提交時依 `is\_closed` 轉換

\- 若切回營業，可以恢復原本輸入狀態



\---



\# 22. Frontend State



頁面必須至少處理：



\- Initial Loading

\- Saving

\- Success

\- Error

\- Cancel

\- Validation



API Request 執行期間：



\- Save Button 必須 Disabled

\- 避免 Double Submit



不建立大型 State Management Framework。



\---



\# 23. Cancel Behavior



Cancel 不代表重設成系統預設值。



Cancel 行為：



> 還原至最近一次從 API 載入或成功儲存的資料。



不建立額外版本管理。



\---



\# 24. Validation Behavior



Frontend Validation：



\- Blur 時進行欄位 Validation

\- Submit 時必須再次完整 Validation



Backend 必須再次驗證。



不得信任 Frontend Validation。



\---



\# 25. No-Change Save



如果使用者沒有修改任何資料：



\- 不需要送出 PUT

\- 可顯示「沒有變更」狀態



不得產生不必要 Database Write。



\---



\# 26. Input Normalization



Backend 至少必須：



\- Trim 字串

\- 執行基本輸入正規化

\- 執行必要欄位 Validation

\- 執行 Business Hours Validation



不得直接信任 Client Input。



不引入大型 Sanitization Framework。



\---



\# 27. Backend Architecture



TASK-0005 必須延續既有 Backend Architecture。



實作前必須檢查 Repository 實際結構。



若目前已採：



`Route → Controller → Service → Repository`



則 TASK-0005 延續該 Pattern。



不得因 TASK-0005 建立：



\- Domain Framework

\- Use Case Framework

\- Adapter Framework

\- Generic Repository Framework

\- Enterprise Service Framework



\---



\# 28. Repository Architecture



Shop Settings Repository 與 Business Hours Repository 的檔案與分層方式：



> 以既有 PSOP Repository 實際 Pattern 為準。



不得自行發明新的 Repository Convention。



Database Access 必須延續目前正式 PSOP 工程文件與 Repository 實際狀態。



不得自行引入其他 ORM 或 Database Strategy。



\---



\# 29. Frontend API Client



TASK-0005 必須延續既有 Frontend API Client Pattern。



若既有架構已有 API Client Layer：



\- Shop Settings API 應建立對應 Client

\- Page 不應直接散落 API Request 邏輯



不得建立新的通用 API Framework。



\---



\# 30. Database Setup



Shop Settings Database Schema 必須使用既有 Database Setup / Migration 機制。



不得：



\- 依賴人工建立 Table

\- 由 API Runtime 建立 Table

\- 建立第二套 Migration Framework



Database Reset 必須延續既有 TASK-0001 規則。



不得新增破壞性 Reset API。



\---



\# 31. Delete / Reset Policy



Shop Settings 不提供：



\- DELETE API

\- Reset API



Database Reset / Setup 僅依既有工程機制執行。



不允許建立「刪除整間店設定」的業務操作。



\---



\# 32. Audit and History



TASK-0005 不建立：



\- Audit Log

\- Audit Log Framework

\- Version History

\- Configuration History

\- Change History UI



僅維持既有 Timestamp Convention。



\---



\# 33. Pagination



Shop Settings：



\- 不使用 Pagination



Business Hours：



\- 不使用 Pagination



原因：



\- Shop Settings 為單一資源

\- Business Hours 固定七筆



不得建立通用 Pagination Framework。



\---



\# 34. Testing Requirements



TASK-0005 必須建立 Automated Tests。



至少涵蓋：



\## Database / Repository



\- Shop Settings 建立

\- Shop Settings 讀取

\- Shop Settings 更新

\- Business Hours 七天完整性

\- weekday 唯一性

\- Upsert

\- Closed Day NULL 規則



\## Service



\- 初始化

\- 更新

\- Transaction

\- Rollback

\- Validation



\## API



\- GET Success

\- PUT Success

\- 401

\- 403

\- Validation Error

\- Server Error



\## Authorization



\- Owner GET

\- Staff GET

\- Owner PUT

\- Staff PUT denied



\## Frontend



依既有測試架構與可測試範圍驗證：



\- Data Loading

\- Editable / Read-only behavior

\- Save

\- Cancel

\- Validation

\- Error handling

\- Loading / Disabled State



\---



\# 35. Transaction Rollback Test



必須至少存在一個可以驗證 Transaction Rollback 的測試情境。



驗證目標：



當 Shop Settings / Business Hours 更新過程失敗：



\- Shop Settings 不留下部分更新

\- Business Hours 不留下部分更新

\- Transaction Rollback 成功



不得以「程式碼看起來有 Transaction」取代測試。



\---



\# 36. Regression Requirements



TASK-0005 完成後必須執行既有 Regression。



至少確認：



\- TASK-0002 Authentication 不受破壞

\- TASK-0003 Pet Management 不受破壞

\- TASK-0004 Customer Management 不受破壞

\- 所有既有 Automated Tests PASS



不得只測 TASK-0005。



\---



\# 37. Browser Verification



TASK-0005 完成後必須實際進行 Browser Verification。



至少驗證：



1\. Login

2\. Navigation

3\. Shop Settings Page Loading

4\. Shop Settings Data Display

5\. Owner Edit

6\. Save

7\. Success Feedback

8\. Cancel

9\. Business Hours 操作

10\. Closed Day

11\. Non-Owner Read-only

12\. API Authorization 行為



不得以推測結果取代 Browser Verification。



\---



\# 38. Scope Verification



完成前必須確認：



\- 沒有新增未批准功能

\- 沒有修改既有 Freeze Specification

\- 沒有修改無關 Block

\- 沒有新增 Enterprise Architecture

\- 沒有新增未批准 Framework

\- 沒有新增未批准 Library

\- 沒有新增 Audit Log

\- 沒有新增 Version History

\- 沒有新增 DELETE / PATCH

\- 沒有新增 Pagination

\- 沒有新增 Multi-tenant

\- 沒有新增 Multi-shop



\---



\# 39. Allowed Existing-Code Modification



TASK-0005 可以修改既有共用程式，但僅限：



> TASK-0005 實際必要的最小修改。



例如：



\- API Mounting

\- Navigation

\- Authentication Integration

\- Shared API Client Integration

\- Shared Layout 必要修改



不得藉此進行：



\- Architecture Refactor

\- Codebase Reorganization

\- Framework Migration

\- 大型 Cleanup

\- 無關 Bug Fix

\- 舊 Block 重構



\---



\# 40. Freeze Conflict Rule



如果 Implementation 過程發現：



\- Specification Conflict

\- Architecture Conflict

\- Technology Conflict

\- Scope Conflict

\- Freeze Conflict

\- Repository 實際狀態與 Specification 不一致

\- 既有 Freeze 無法安全延續



必須立即停止。



不得自行選擇解決方式。



必須使用：



Problem：

Observation：

Impact：

Required Decision：



等待使用者決策。



\---



\# 41. Definition of Done



TASK-0005 必須同時滿足：



1\. Shop Settings Database Schema 完成

2\. Business Hours Schema 完成

3\. Repository 完成

4\. Service 完成

5\. Controller 完成

6\. Routes 完成

7\. API Mounting 完成

8\. Authentication / Authorization 完成

9\. Frontend API Client 完成

10\. Shop Settings Page 完成

11\. Validation 完成

12\. Save / Cancel 完成

13\. Loading / Error / Success State 完成

14\. Automated Tests 完成

15\. Transaction Rollback Test 完成

16\. Regression PASS

17\. API Verification PASS

18\. Frontend Verification PASS

19\. Browser Verification PASS

20\. Scope Verification PASS

21\. Stop Conditions PASS

22\. 無 Freeze Conflict

23\. 無未批准 Scope

24\. 無捏造 Verification 結果



Implementation 完成本身不等於 PASS。



\---



\# 42. Completion Review



TASK-0005 完成後必須進行 Completion Review。



Review 至少確認：



\- Implementation 是否符合本 Specification

\- Scope 是否符合 Freeze

\- Database 是否正確

\- API 是否正確

\- Authorization 是否正確

\- Frontend 是否正確

\- Testing 是否完整

\- Regression 是否 PASS

\- Browser Verification 是否 PASS

\- 是否存在 Stop Condition

\- 是否存在 Freeze Conflict



只有全部必要項目實際驗證通過，TASK-0005 才能標記：



> PASS



\---



\# 43. PASS Criteria



TASK-0005 最終結果：



> PASS



必須建立於實際 Verification Evidence。



禁止：



\- 推測 PASS

\- 「看起來正常」作為 PASS

\- 未執行測試即 PASS

\- 未執行 Browser Verification 即 PASS

\- 捏造測試結果

\- 捏造 Database Verification

\- 捏造 API Verification

\- 捏造 Git Commit



\---



\# 44. Freeze Requirement



TASK-0005 Coding 完成並 PASS 後，才建立正式 Freeze Baseline。



Freeze Baseline 必須記錄：



\- 實際 Implementation

\- 實際 Files Created

\- 實際 Files Modified

\- 實際 Files Deleted

\- 實際 Dependencies

\- Database Verification

\- Backend Verification

\- Frontend Verification

\- API Verification

\- Automated Testing

\- Regression Verification

\- Browser Verification

\- Scope Verification

\- Stop Conditions

\- Git Status

\- Completion Review

\- Final Verification Evidence

\- Freeze Decision

\- Freeze Baseline Scope

\- Documentation Governance

\- Formal Freeze File

\- Project Status

\- Final Status



不得在 Coding 前捏造上述完成結果。



\---



\# 45. Documentation Governance



正式文件分為兩種：



\## Tasks/



用途：



> AI Coding 執行用 Task Specification。



TASK-0005 本文件屬於此類。



\## docs/



用途：



> 已完成 TASK 並 PASS 後的正式 Freeze Baseline。



TASK-0005 完成 Coding 並 PASS 後，才建立對應 Freeze 文件。



不得將 Completion Report 建立成額外正式文件類型。



\---



\# 46. Git Governance



TASK-0005 不得捏造 Git Commit。



Implementation 階段應實際檢查：



\- Git Repository Status

\- Current Branch

\- Changed Files

\- Commit Status



如果沒有 Commit：



> 必須如實記錄 None / 未建立。



\---



\# 47. Technology Constraints



TASK-0005 必須使用目前已 Freeze 的技術基準：



Frontend：



\- Next.js

\- Pages Router

\- JavaScript

\- Bootstrap



Backend：



\- Express.js

\- JavaScript



Database：



\- MySQL



Testing：



\- Jest

\- Supertest



Package Manager：



\- npm



Version Control：



\- Git



禁止：



\- TypeScript

\- `.ts`

\- `.tsx`

\- `tsconfig.json`

\- Tailwind

\- 未批准 ORM

\- 未批准 Database Strategy

\- 未批准 Framework

\- 未批准 Library

\- 未批准 Enterprise Abstraction



\---



\# 48. Implementation Constraint



AI Coding Implementation 必須依以下順序：



1\. Read TASK-0005 Specification

2\. Read Reference Documents

3\. Inspect Repository

4\. Inspect Existing TASK-0001～TASK-0004 Implementation

5\. Verify Preconditions

6\. Verify Scope

7\. Verify Architecture Compatibility

8\. Create Implementation Plan

9\. Implement only TASK-0005 Scope

10\. Run Automated Tests

11\. Run Regression Tests

12\. Run Database Verification

13\. Run Backend Verification

14\. Run API Verification

15\. Run Frontend Verification

16\. Run Browser Verification

17\. Run Scope Verification

18\. Check Stop Conditions

19\. Completion Review

20\. PASS

21\. Freeze



\---



\# 49. Specification Freeze Decision



TASK-0005 Q1～Q100 Specification Decisions 已完成確認。



所有已確認決策已納入本 Specification。



Freeze Review 結果：



\- Scope：PASS

\- Data Model：PASS

\- API：PASS

\- Authorization：PASS

\- Frontend：PASS

\- Validation：PASS

\- Database Strategy：PASS

\- Transaction Strategy：PASS

\- Testing Strategy：PASS

\- Regression Strategy：PASS

\- Documentation Governance：PASS

\- Freeze Governance：PASS



因此：



> TASK-0005 Specification 正式 FREEZE。



\---



\# 50. Freeze Baseline Boundary



本 Specification Freeze 僅代表：



> TASK-0005 Coding Implementation 的正式規格已 Freeze。



本文件不代表：



\- Coding 已完成

\- Automated Tests 已 PASS

\- Browser Verification 已 PASS

\- TASK-0005 已完成

\- TASK-0005 已 PASS

\- TASK-0005 Freeze Baseline 已建立



上述項目必須在後續實際 Implementation 與 Verification 後才能成立。



\---



\# 51. Next Stage



TASK-0005 下一階段：



> AI Coding Implementation



Coding 開始前必須重新：



\- Inspection Repository

\- Read Reference Documents

\- Verify Preconditions

\- Verify Scope

\- Verify Freeze Compatibility



不得跳過 Repository Inspection。



不得直接假設目前 Repository 狀態。



\---



\# 52. Project Status



目前專案狀態：



| Task | Status |

|---|---|

| TASK-0001 | PASS / FREEZE |

| TASK-0002 | PASS / FREEZE |

| TASK-0003 | PASS / FREEZE |

| TASK-0004 | PASS / FREEZE |

| TASK-0005 Specification | PASS / FREEZE |

| TASK-0005 Implementation | NOT STARTED |

| TASK-0005 Final PASS | NOT YET |

| TASK-0005 Freeze Baseline | NOT YET |



\---



\# 53. Final Specification Status



TASK-0005：



\*\*店家設定區塊 — Shop Settings Block\*\*



Version：



\*\*v1.0\*\*



Specification：



\*\*FREEZE\*\*



Coding：



\*\*NOT STARTED\*\*



Final Task Status：



\*\*PENDING IMPLEMENTATION\*\*



正式工程文件：



\*\*TASK-0005\_店家設定區塊\_Shop-Settings-Block\_v1.0.md\*\*

