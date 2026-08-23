\# TASK-0012 FREEZE — Boarding 住宿執行 Boarding Execution v1.0



\## 1. Document Information



| Field | Value |

|---|---|

| Task | TASK-0012 |

| 中文名稱 | Boarding 住宿執行 |

| English Name | Boarding Execution |

| Version | v1.0 |

| Document Type | Formal Engineering Document |

| Status | FREEZE |

| Acceptance Status | HUMAN ACCEPTED |

| Previous Task | TASK-0011 Grooming 美容執行 |

| Technical Baseline | MVP Technical Baseline — FREEZE |

| UI Baseline | Traditional Chinese UI Localization Baseline v1.0 |

| Development Method | Block-based Development |

| Final Result | PASS |

| Final Decision | FREEZE |



\*\*正式檔名：\*\*



`TASK-0012 Boarding 住宿執行 Boarding Execution v1.0.md`



\---



\## 2. Task Objective



TASK-0012 負責建立 MVP 的 Boarding 住宿服務執行能力。



本 Task 的目的不是建立完整寵物住宿管理平台，而是提供小型寵物美容／寵物住宿工作室在日常營運中，對單次住宿服務進行實際執行、入住、住宿、退房及完成管理的最小必要功能。



Boarding 必須與 Appointment 明確區分：



\- Appointment = 預約

\- Boarding Execution = 實際住宿服務執行



Boarding Execution 必須能與既有 Daily Operations 整合，使店家可以從今日工作進入住宿執行並完成完整服務生命週期。



\---



\## 3. Scope



\### 3.1 In Scope



TASK-0012 包含：



\- Boarding Execution

\- Appointment-based Boarding

\- Walk-in Boarding

\- Customer / Pet / Service relationship

\- Appointment relationship when applicable

\- Daily Operations integration

\- Boarding lifecycle

\- Check-in

\- Actual Check-in Time

\- Boarding execution data

\- Check-out

\- Actual Check-out Time

\- Completed historical record

\- Active Boarding conflict protection

\- Backend validation

\- API authorization

\- Database persistence

\- Traditional Chinese UI

\- Targeted testing

\- Browser E2E verification

\- Full regression



\### 3.2 Boarding Lifecycle



合法生命週期：



`待入住 → 住宿中 → 已完成`



合法狀態轉換：



\- 待入住 → 住宿中

\- 住宿中 → 已完成



禁止：



\- 待入住 → 已完成

\- 已完成 → 住宿中

\- 已完成 → 待入住

\- 已完成 → 已完成



\### 3.3 Historical Data



已完成的 Boarding 必須保留歷史資料。



同一 Pet 未來再次住宿時：



> 必須建立新的 Boarding Execution。



不得使用新的住宿覆蓋既有已完成住宿紀錄。



不得重新開啟已完成住宿。



\---



\## 4. Out of Scope



TASK-0012 不包含：



\- Room Management

\- Cage Management

\- Kennel Allocation

\- Capacity Management

\- Resource Allocation Engine

\- Medical Management

\- Medication Management

\- Veterinary Workflow

\- Complete Care Scheduling

\- Scheduler

\- Cron

\- LINE API

\- SMS

\- Email Notification

\- Push Notification

\- Customer Portal

\- Customer Online Booking

\- Customer Online Check-in

\- Order

\- Payment

\- Product

\- Inventory

\- Report UI

\- New RBAC

\- Boarding-specific Role System

\- Generic Workflow Engine

\- Generic State Machine Framework

\- Enterprise Repository Abstraction

\- Event Sourcing

\- CQRS

\- Message Queue

\- Microservice

\- Mobile App

\- Native App

\- PWA

\- 新 Framework

\- Enterprise-level abstraction



\---



\## 5. Business Rules



\### 5.1 Appointment Relationship



Appointment-based Boarding 必須保留 Appointment relationship。



必要資料：



\- Expected Check-in

\- Expected Check-out

\- Actual Check-in

\- Actual Check-out



Expected Time 與 Actual Time 必須分開保存。



Actual Time 不得以 Expected Time 直接取代。



\### 5.2 Walk-in Boarding



Walk-in Boarding 可以沒有 Appointment。



但必須正確關聯：



\- Customer

\- Pet

\- Service



不得為 Walk-in Boarding 建立虛構 Appointment。



\### 5.3 Customer / Pet Integrity



Backend 必須驗證：



\- Customer 存在

\- Pet 存在

\- Pet 屬於指定 Customer

\- Service 存在

\- Appointment 存在時，其 relationship 必須正確



不得接受無效 Customer、Pet、Service 或 Appointment relationship。



\### 5.4 Active Boarding Conflict



同一 Pet 不得同時存在互相衝突的 Active Boarding。



當 Pet 已經處於：



`住宿中`



Backend 必須阻止建立另一筆互相衝突的 Active Boarding。



此規則必須由 Backend 保護，不得只依賴 Frontend validation。



\### 5.5 Check-in



Check-in 必須：



1\. 驗證 Boarding 存在

2\. 驗證目前狀態為待入住

3\. 寫入 Actual Check-in Time

4\. 狀態轉為住宿中

5\. 保存資料



Actual Check-in Time 必須代表實際執行入住的時間。



\### 5.6 Check-out



Check-out 必須：



1\. 驗證 Boarding 存在

2\. 驗證目前狀態為住宿中

3\. 寫入 Actual Check-out Time

4\. 狀態轉為已完成

5\. 同步 Daily Operations 所需狀態



不得因 Expected Check-out 到達而自動完成。



\---



\## 6. Functional Requirements



\### 6.1 Boarding Record



Boarding 必須保存必要的：



\- Customer

\- Pet

\- Service

\- Appointment when applicable

\- Daily Operations relationship when applicable

\- Expected Check-in

\- Actual Check-in

\- Expected Check-out

\- Actual Check-out

\- Status

\- Boarding 前狀況

\- Boarding 執行內容

\- Boarding 結果

\- 備註

\- Created At

\- Updated At



\### 6.2 Boarding Execution



Boarding Execution 頁面必須提供：



\- Customer 資訊

\- Pet 資訊

\- Service 資訊

\- Appointment 資訊（適用時）

\- 預計入住

\- 實際入住

\- 預計退房

\- 實際退房

\- 住宿狀態

\- 住宿前狀況

\- 住宿執行內容

\- 住宿結果

\- 住宿備註



\### 6.3 Master Data



Customer、Pet、Service、Appointment 等來源資料在 Boarding Execution 頁面中：



> 屬於來源 Master Data 時，採唯讀方式呈現。



Boarding Execution 不負責修改 Customer、Pet 或 Appointment Master Data。



\### 6.4 Completed Boarding



當 Boarding 狀態為已完成：



可以：



\- 查看歷史資料

\- 查看實際入住時間

\- 查看實際退房時間

\- 查看執行資料



不得：



\- 再次入住

\- 再次退房

\- 重新開啟

\- 重新變更為 Active Boarding



\---



\## 7. Daily Operations Integration



Boarding 必須整合 Daily Operations。



Daily Operations 必須能：



\- 找到住宿工作

\- 顯示 Customer

\- 顯示 Pet

\- 顯示 Service

\- 顯示 Boarding Status

\- 進入 Boarding Execution

\- 顯示目前執行狀態

\- 在 Boarding 完成後顯示已完成



狀態對應：



| Boarding | Daily Operations |

|---|---|

| 待入住 | 待處理 |

| 住宿中 | 執行中 |

| 已完成 | 已完成 |



Boarding 完成後，Daily Operations 不得繼續顯示為執行中。



\---



\## 8. Database Requirements



\### 8.1 Boarding Table



本 Task 新增 `boardings` table。



資料模型包含：



\- Customer relationship

\- Pet relationship

\- Service relationship

\- Appointment optional relationship

\- Daily Operations optional relationship

\- Expected Check-in

\- Actual Check-in

\- Expected Check-out

\- Actual Check-out

\- Status

\- Boarding 前狀況

\- Boarding 執行內容

\- Boarding 結果

\- 備註

\- Created At

\- Updated At



\### 8.2 Integrity



Database 必須具備必要：



\- Primary Key

\- Foreign Keys

\- Required fields

\- Relationship constraints

\- Status representation

\- Active Boarding protection support

\- Timestamp persistence



\### 8.3 Migration



新增 Database schema：



`010\_create\_boardings.sql`



Migration 必須遵守既有 Database convention，不得破壞既有資料與已 Freeze 功能。



\---



\## 9. API Requirements



已實作 Boarding API：



| Method | Endpoint | Purpose |

|---|---|---|

| GET | `/api/boardings` | 取得 Boarding |

| GET | `/api/boardings/:id` | 取得單筆 Boarding |

| POST | `/api/boardings` | 建立 Boarding |

| PATCH | `/api/boardings/:id` | 更新 Boarding Execution data |

| POST | `/api/boardings/:id/check-in` | 執行入住 |

| POST | `/api/boardings/:id/check-out` | 執行退房 |



\### 9.1 Authorization



所有 Boarding API 必須受到既有 Authentication / Authorization 保護。



未登入請求：



`401 Unauthorized`



不得建立新的 Enterprise RBAC。



沿用既有 Staff / Auth 機制。



\### 9.2 Validation



Backend 必須驗證：



\- Required fields

\- ID validity

\- Customer existence

\- Pet existence

\- Customer / Pet relationship

\- Service existence

\- Appointment existence when applicable

\- Appointment relationship

\- Status transition

\- Active Boarding conflict

\- Data type



Frontend validation 不得取代 Backend validation。



\---



\## 10. Transaction Requirements



當單一操作同時涉及：



\- Boarding status

\- Actual Check-in / Check-out

\- Daily Operations status



必須確保資料一致性。



不得發生：



\- Boarding status 已更新但 Actual Time 未更新

\- Boarding 已完成但 Daily Operations 仍為執行中



實作沿用既有 transaction pattern，不建立額外 Enterprise transaction abstraction。



\---



\## 11. Frontend Requirements



新增 Boarding Execution UI。



主要功能：



\- Customer / Pet / Service 顯示

\- 預計入住與退房

\- 實際入住與退房

\- Boarding Status

\- Boarding Execution data

\- 備註

\- 儲存

\- 入住

\- 退房

\- Loading

\- Error

\- Success

\- Completed 唯讀歷史資料



Daily Operations 新增：



> 住宿



入口與服務名稱顯示。



\---



\## 12. Traditional Chinese UI Localization



所有 User-facing UI 必須遵守：



`Traditional Chinese UI Localization Baseline v1.0`



Boarding UI 使用繁體中文。



已確認主要 UI 詞彙：



| English | UI |

|---|---|

| Boarding Execution | 住宿執行 |

| Customer | 客戶 |

| Pet | 寵物 |

| Service | 服務 |

| Appointment | 預約 |

| Expected Check-in | 預計入住 |

| Actual Check-in | 實際入住 |

| Expected Check-out | 預計退房 |

| Actual Check-out | 實際退房 |

| Status | 狀態 |

| Save | 儲存 |

| Check-in | 入住 |

| Check-out | 退房 |

| Completed | 已完成 |



已加入已知 Boarding API 錯誤的繁體中文 UI mapping。



技術識別名稱、API path、Database column、JavaScript variable 等可維持英文；User-facing UI 必須使用繁體中文。



\---



\## 13. Implementation Record



\### 13.1 Files Created



\- `010\_create\_boardings.sql`

\- `boarding.repository.js`

\- `boarding.service.js`

\- `boarding.controller.js`

\- `boarding.routes.js`

\- `boarding.js`

\- `boarding.test.js`



\### 13.2 Files Modified



\- `app.js`

\- `daily-operations.repository.js`

\- `operations.js`

\- `pet.test.js`

\- `service.test.js`



`pet.test.js` 與 `service.test.js` 的修改屬於測試 teardown 修正，用於避免既有測試因 Foreign Key 與測試順序造成互相污染。



\### 13.3 Files Deleted



None.



\### 13.4 Dependency Changes



None.



\---



\## 14. Verification



\### 14.1 Repository Inspection



PASS



已確認並沿用：



\- Express.js

\- mysql2

\- Next.js Pages Router

\- JavaScript

\- Bootstrap

\- Route → Controller → Service → Repository

\- Existing Authentication

\- Existing RBAC

\- Appointment

\- Daily Operations

\- Grooming implementation patterns



\### 14.2 Precondition Check



PASS



\- Backend `http://localhost:3001` — PASS

\- Frontend `http://localhost:3000` — PASS

\- Database — PASS

\- Authentication — PASS

\- Grooming regression — PASS

\- Existing test infrastructure — PASS



\### 14.3 Scope / Freeze Conflict Check



PASS



未發現 Scope Conflict 或 Freeze Conflict。



未新增：



\- Room / Cage / Capacity

\- Medical

\- Scheduler / Cron

\- Order / Payment

\- 新 RBAC

\- 新 Framework

\- 新 State Machine

\- Enterprise abstraction



\### 14.4 Targeted Tests



PASS



執行：



&#x20;   cd d:\\MVP\\testing

&#x20;   npm test -- --runTestsByPath tests/boarding.test.js



結果：



&#x20;   1 suite passed

&#x20;   3 tests passed

&#x20;   0 failed



\### 14.5 Full Regression



PASS



執行：



&#x20;   cd d:\\MVP\\testing

&#x20;   npm test -- --runInBand



結果：



&#x20;   12 test suites passed

&#x20;   58 tests passed

&#x20;   0 failed



\### 14.6 Frontend Build



PASS



執行：



&#x20;   cd d:\\MVP\\frontend

&#x20;   npm run build



結果：



&#x20;   Build PASS

&#x20;   No frontend build errors



\### 14.7 Browser E2E



PASS



實際 Browser E2E 完成：



&#x20;   登入

&#x20;   → 今日工作

&#x20;   → 找到住宿工作

&#x20;   → 進入住宿執行

&#x20;   → Customer / Pet / Service 顯示

&#x20;   → 唯讀欄位確認

&#x20;   → 填寫住宿資料

&#x20;   → 儲存

&#x20;   → Reload

&#x20;   → 資料保留

&#x20;   → 入住

&#x20;   → 住宿中

&#x20;   → 返回今日工作確認進行中

&#x20;   → 退房

&#x20;   → 返回今日工作

&#x20;   → 狀態已完成



Actual Check-in 與 Actual Check-out 均由 Server 實際產生並保存。



\### 14.8 Traditional Chinese UI Verification



PASS



已確認：



\- 住宿執行

\- 客戶與寵物資訊

\- 預計入住

\- 預計退房

\- 實際入住

\- 實際退房

\- 住宿狀態

\- 住宿前狀況

\- 住宿執行內容

\- 住宿結果

\- 住宿備註

\- 儲存

\- 入住

\- 退房

\- 已完成入住

\- 住宿資料已儲存



已知 Boarding API 錯誤亦已完成繁體中文 UI mapping。



\### 14.9 API Authorization



PASS



未登入 API 保護已驗證。



結果：



`401 Unauthorized`



\### 14.10 Repository Verification



PASS



已確認：



\- Modified files

\- New files

\- Deleted files

\- Database changes

\- API changes

\- Frontend changes

\- Test changes

\- Unexpected production scope expansion



結果：



\- Unexpected production scope expansion — None

\- New dependency — None

\- Frontend build errors — None

\- Backend / touched-file errors — None



\---



\## 15. Acceptance Criteria



| ID | Acceptance Criteria | Result |

|---|---|---|

| AC-01 | Boarding Entry | PASS |

| AC-02 | Boarding Identity | PASS |

| AC-03 | Appointment Relationship | PASS |

| AC-04 | Walk-in | PASS |

| AC-05 | Check-in | PASS |

| AC-06 | Actual Check-in Time | PASS |

| AC-07 | Active State | PASS |

| AC-08 | Execution Data | PASS |

| AC-09 | Persistence | PASS |

| AC-10 | Check-out | PASS |

| AC-11 | Actual Check-out Time | PASS |

| AC-12 | Completed State | PASS |

| AC-13 | Daily Operations | PASS |

| AC-14 | Invalid Transition | PASS |

| AC-15 | Duplicate Active Boarding | PASS |

| AC-16 | Authorization | PASS |

| AC-17 | Validation | PASS |

| AC-18 | Traditional Chinese UI | PASS |

| AC-19 | Regression | PASS |

| AC-20 | Scope Boundary | PASS |



Acceptance Criteria：



`20 / 20 PASS`



\---



\## 16. Known Issues



\### 16.1 Next.js Development HMR Warning



Development 模式曾出現 HMR warning。



已確認：



\- 不影響實際頁面

\- 不影響 Browser E2E

\- 不影響功能驗證

\- 不影響 Frontend Build



因此不構成 TASK-0012 Blocking Issue。



\### 16.2 Development Database Verification Data



Development database 保留本次 Browser E2E 使用的住宿驗證資料。



此資料屬 Development Verification Data，不構成 TASK-0012 Scope Conflict 或 Blocking Issue。



\---



\## 17. Git Status



Branch：



`master`



Working Tree：



`有未提交變更`



變更包含：



\- TASK-0012 本次實作

\- 先前 TASK-0009 ～ TASK-0011 既有變更



Git Commit：



`Not created`



Git commit 不屬於 TASK-0012 本身的 Blocking Acceptance Criterion。



\---



\## 18. Definition of Done



TASK-0012 Definition of Done：



\- \[x] Boarding Execution 功能完成

\- \[x] Appointment-based Boarding 完成

\- \[x] Walk-in Boarding 完成

\- \[x] Customer / Pet / Service relationship validation 完成

\- \[x] Appointment relationship 完成

\- \[x] Boarding lifecycle 完成

\- \[x] Check-in 完成

\- \[x] Actual Check-in Time persistence 完成

\- \[x] Boarding Execution data 完成

\- \[x] Check-out 完成

\- \[x] Actual Check-out Time persistence 完成

\- \[x] Completed historical record 完成

\- \[x] Active Boarding conflict protection 完成

\- \[x] Daily Operations integration 完成

\- \[x] API authorization 完成

\- \[x] Backend validation 完成

\- \[x] Database schema 完成

\- \[x] Traditional Chinese UI 完成

\- \[x] Targeted tests PASS

\- \[x] Browser E2E PASS

\- \[x] Full regression PASS

\- \[x] Frontend build PASS

\- \[x] Repository verification PASS

\- \[x] Acceptance Criteria 20 / 20 PASS

\- \[x] Human Acceptance 完成

\- \[x] Scope Boundary PASS

\- \[x] Freeze Conflict Check PASS



\---



\## 19. Final Verification Summary



TASK-0012 已完成：



\- Implementation

\- Targeted Testing

\- Browser E2E

\- Traditional Chinese UI Verification

\- Full Regression

\- Frontend Build

\- Repository Verification

\- Scope Verification

\- Acceptance Criteria Verification



最終測試結果：



`12 test suites passed`



`58 tests passed`



`0 failed`



Acceptance Criteria：



`20 / 20 PASS`



Browser E2E：



`PASS`



Traditional Chinese UI：



`PASS`



Full Regression：



`PASS`



Scope Boundary：



`PASS`



Freeze Conflict：



`NONE`



Blocking Issue：



`NONE`



\---



\## 20. Human Acceptance



使用者已確認接受 TASK-0012 實作與 Verification 結果。



Human Acceptance：



`ACCEPTED`



\---



\## 21. Freeze Decision



TASK-0012 已符合：



\- Scope 完成

\- Implementation 完成

\- Targeted Tests PASS

\- Browser E2E PASS

\- Traditional Chinese UI PASS

\- Full Regression PASS

\- Frontend Build PASS

\- Acceptance Criteria 20 / 20 PASS

\- Repository Verification PASS

\- Scope Boundary PASS

\- Freeze Conflict NONE

\- Blocking Issue NONE

\- Human Acceptance ACCEPTED



因此：



> \*\*TASK-0012 = FREEZE\*\*



TASK-0012 正式完成。



後續 TASK 不得在未經明確變更程序的情況下：



\- 自行修改 TASK-0012 Business Rules

\- 自行修改 TASK-0012 Scope

\- 自行修改已驗證 API Contract

\- 自行修改已驗證 Data Model

\- 自行修改已驗證 Lifecycle

\- 自行修改 Acceptance Criteria

\- 以後續 TASK 名義重新定義 TASK-0012 已 Freeze 的決策



任何後續變更必須依既有工程變更與 Freeze 規則處理。



\---



\## 22. Final Status



`TASK-0012 = FREEZE`



`Boarding 住宿執行 Boarding Execution v1.0`



正式工程狀態：



`COMPLETED`



下一個工程工作：



`TASK-0013`

