\# TASK-0006 FREEZE — 預約瀏覽器 UI 404 修正與最終驗證 Appointment Browser UI 404 Fix \& Final Verification v1.0



\## 1. Document Information



| Field | Value |

|---|---|

| Task | TASK-0006 |

| 中文名稱 | 預約瀏覽器 UI 404 修正與最終驗證 |

| English Name | Appointment Browser UI 404 Fix \& Final Verification |

| Version | v1.0 |

| Status | FREEZE |

| Final Review | PASS |

| Freeze Status | FREEZE |

| Project | Pet Shop Operations System MVP |

| Related Block | Block 06 — Appointment |

| Document Type | Formal Engineering Task Document |

| Formal Filename | TASK-0006 預約瀏覽器 UI 404 修正與最終驗證 Appointment Browser UI 404 Fix \& Final Verification v1.0 |

| Freeze Basis | TASK-0006 FINAL REVIEW = PASS |



\---



\## 2. Task Objective



TASK-0006 的目的為處理 Appointment Block 在實際瀏覽器環境中出現的 `/appointments` UI 404／錯誤導向 Login 問題，確認問題來源並同步目前 workspace 的實際執行環境。



本 Task 的核心目標不是重新設計 Appointment 功能，也不是修改 Appointment business logic，而是：



1\. 定位 Browser UI 404／Redirect 問題。

2\. 確認 Frontend Next.js routing 與 compiled state。

3\. 確認 Backend 實際執行 process 與目前 source code 是否一致。

4\. 同步 3000 / 3001 執行環境。

5\. 清除過期 Frontend `.next` generated artifacts。

6\. 由目前 source 重新啟動 Backend 與 Frontend。

7\. 驗證 Appointment API 不再發生錯誤的 404。

8\. 驗證 `/appointments` Browser UI 正常載入。

9\. 完整執行 TASK-0006 FINAL REVIEW。

10\. 完成 API、Authorization、Transaction、CRUD、Regression、Browser UI E2E 與 Scope 驗證。

11\. 確認本 Task 未修改既有 Appointment implementation、Pet Block 或正式測試。

12\. 完成 TASK-0006 FREEZE。



\---



\## 3. Scope



\### 3.1 Included



本 Task 包含：



\- Frontend Next.js 執行環境同步。

\- Backend Express.js 執行環境同步。

\- 3000 / 3001 listener 檢查與重啟。

\- 舊 Frontend `.next` 清除。

\- `/appointments` route 驗證。

\- Appointment API route 驗證。

\- Login / session 驗證。

\- Appointment Authorization 驗證。

\- Appointment Validation Matrix 驗證。

\- Appointment Transaction Rollback 驗證。

\- Appointment Create / Detail / Update 驗證。

\- Multi-Pet / Multi-Service 驗證。

\- Date / Time consistency 驗證。

\- Appointment Jest focused test。

\- Full Jest regression。

\- Browser UI E2E。

\- Reload persistence 驗證。

\- Temporary verification artifact cleanup。

\- Git / scope verification。

\- Final Review。

\- Freeze。



\### 3.2 Explicitly Excluded



本 Task 不包含：



\- Appointment business rule redesign。

\- Appointment API redesign。

\- Appointment database schema redesign。

\- Pet Block 修改。

\- Customer Block 修改。

\- Service Block 修改。

\- Order Block 修改。

\- Payment Block 修改。

\- 新增 TASK-0007。

\- 新增 MVP 功能。

\- CRUD 功能擴張。

\- 權限模型重新設計。

\- UI visual redesign。

\- Next.js 架構改造。

\- Express.js 架構改造。

\- TypeScript migration。

\- Prisma migration。

\- Tailwind migration。

\- 生產環境部署。



\---



\## 4. Root Cause



\### 4.1 Backend Runtime Mismatch



初始檢查發現：



\- 3001 port 存在正在執行的 Backend process。

\- 該 process 實際 command 指向過期的 `src/server.js` 執行環境。

\- 現行 workspace 的正式 Backend source 為目前 `app.js`。

\- 現行 `app.js` 已掛載 Appointment routes。

\- 但舊 process 的 `/api/appointments` 仍回傳 `404`。



因此判定：



> 問題不是 Appointment route source 不存在，而是 3001 實際執行中的 Backend process 沒有反映目前 workspace source。



\### 4.2 Frontend Runtime / Build Artifact Mismatch



初始檢查發現：



\- `frontend/pages/appointments.js` 存在。

\- 該檔案位於 Next.js Pages Router 正確位置。

\- 但當時 `.next/server/pages-manifest.json` 未包含 `/appointments`。

\- `.next` generated state 早於目前 Appointment page source。



因此判定：



> Frontend process 使用過期的 Next.js generated state，沒有反映目前 workspace 的 `/appointments` page。



\### 4.3 Browser Redirect Symptom



Appointment page 初始化期間會執行相關 API 呼叫。



當執行中的 Backend `/api/appointments` 回傳 404 時，頁面初始化錯誤處理會導向：



`/login`



因此瀏覽器表面現象為：



`/appointments` → API initialization failure → `/login`



此現象並非代表 `/appointments` page source path 錯誤。



\---



\## 5. Environment Synchronization



\### 5.1 Existing Runtime Cleanup



已停止原先占用：



\- Port 3000

\- Port 3001



確認兩個 port 均釋放後才重新啟動服務。



\### 5.2 Frontend Generated State Cleanup



已清除：



`frontend/.next`



目的：



\- 移除過期 Next.js generated artifacts。

\- 讓目前 `frontend/pages/appointments.js` 重新被 Next.js 掃描與編譯。



\### 5.3 Backend Restart



Backend 改由目前 workspace 的正式 `app.js` 啟動於：



`127.0.0.1:3001`



啟動訊息確認：



`backend current app ready on 3001`



\### 5.4 Frontend Restart



Frontend 由目前 workspace 的 Next.js dev server 啟動於：



`127.0.0.1:3000`



重新啟動後 `/appointments` route 可被正確辨識。



\---



\## 6. Runtime Verification



\### 6.1 Frontend Route



驗證：



`GET http://localhost:3000/appointments`



結果：



\- HTTP `200`

\- `/appointments` route 正常存在。



\### 6.2 Unauthenticated Appointment API



驗證：



`GET http://localhost:3001/api/appointments`



結果：



\- HTTP `401`



此結果符合 Authentication requirement。



\### 6.3 Owner Login



驗證：



Owner login



結果：



\- HTTP `200`

\- Session 建立成功。



\### 6.4 Authenticated Appointment API



驗證：



`GET /api/appointments?status=ALL`



結果：



\- HTTP `200`

\- 不再回傳 `404`。



\---



\## 7. Functional Verification



\### 7.1 Validation Matrix



結果：



\*\*PASS — 17/17\*\*



所有 TASK-0006 Validation Matrix cases 均通過。



\### 7.2 Authorization Matrix



| Role | GET | POST | PATCH | Result |

|---|---:|---:|---:|---|

| Owner | 200 | 201 | 200 | PASS |

| Front Desk | 200 | 201 | 200 | PASS |

| Groomer | 200 | 403 | 403 | PASS |

| Unauthenticated | 401 | 401 | 401 | PASS |



Authorization Matrix：



\*\*PASS\*\*



\### 7.3 Create / Detail / Update



驗證項目：



\- Appointment Create

\- Appointment Detail

\- Appointment Update



結果：



\*\*PASS\*\*



\### 7.4 Multi-Pet / Multi-Service



驗證建立包含：



\- Pet A

&#x20; - Service 1

&#x20; - Service 2

\- Pet B

&#x20; - Service 1



驗證結果：



\- Multiple pets supported：PASS

\- Multiple services supported：PASS

\- Pet/service association preserved：PASS

\- No cross-pollution：PASS



結果：



\*\*PASS\*\*



\---



\## 8. Transaction Verification



\### 8.1 CREATE Rollback



執行 CREATE transaction failure scenario。



驗證：



\- Failure correctly triggered。

\- Transaction rollback executed。

\- Partial data not persisted。



結果：



\*\*PASS\*\*



\### 8.2 UPDATE Rollback



執行 UPDATE transaction failure scenario。



驗證：



\- Failure correctly triggered。

\- Transaction rollback executed。

\- Existing appointment data remained consistent。



結果：



\*\*PASS\*\*



\---



\## 9. Date / Time Verification



驗證日期與時間資料於：



\- API

\- GET Detail

\- Database



之間保持一致。



驗證日期：



\- `2026-09-15`

\- `2026-10-01`

\- `2026-10-02`



驗證時間：



\- `10:15`

\- `14:20`

\- `15:35`



結果：



\*\*PASS\*\*



\---



\## 10. Jest Verification



\### 10.1 Focused Appointment Test



執行：



`npx jest --runInBand tests/appointment.test.js --verbose`



結果：



\- Test Suites：1 passed

\- Tests：4 passed

\- Exit Code：0



結果：



\*\*PASS\*\*



\### 10.2 Full Regression



執行：



`npx jest --runInBand --verbose`



結果：



\- Test Suites：7 passed

\- Tests：30 passed

\- Snapshots：0

\- Exit Code：0



結果：



\*\*PASS\*\*



\---



\## 11. Browser UI E2E Verification



\### 11.1 Login



實際 Browser session：



\- Login page loaded：PASS

\- Login：PASS

\- Authenticated session：PASS



\### 11.2 Appointment Page



實際 Browser：



\- Appointment navigation：PASS

\- `/appointments` loaded：PASS

\- Appointment Management UI rendered：PASS

\- Appointment list rendered：PASS

\- No unexpected redirect to Login：PASS



\### 11.3 Create Appointment



實際 Browser 建立 Appointment：



\- Customer selection：PASS

\- Appointment date：PASS

\- Appointment time：PASS

\- Pet A selection：PASS

\- Pet A service selection：PASS

\- Add Pet：PASS

\- Pet B selection：PASS

\- Pet B service selection：PASS

\- Note entry：PASS

\- Create Appointment：PASS



\### 11.4 Multi-Pet / Multi-Service UI



實際 Browser 建立：



\- Pet A：2 services

\- Pet B：1 service



結果：



\- Correct pet association：PASS

\- Correct service association：PASS

\- No cross-pollution：PASS



\### 11.5 Edit Appointment



實際 Browser：



\- Edit button：PASS

\- Edit Appointment UI：PASS

\- Date modification：PASS

\- Time modification：PASS

\- Note modification：PASS

\- Update Appointment：PASS



更新後：



\- Date = `2026-10-01`

\- Time = `15:35`

\- Note = `Browser E2E updated`



結果：



\*\*PASS\*\*



\### 11.6 Reload Persistence



完成 Update 後重新：



`page.reload()`



再次進入 Edit。



驗證：



\- Date `2026-10-01` preserved：PASS

\- Time `15:35:00` preserved：PASS

\- Note preserved：PASS

\- Pet A 2 services preserved：PASS

\- Pet B 1 service preserved：PASS



Browser UI E2E：



\*\*PASS\*\*



\---



\## 12. Scope Integrity Verification



本次 TASK-0006 FINAL REVIEW 執行期間：



\- 未修改正式 Appointment source code。

\- 未修改 Appointment implementation。

\- 未修改 Appointment API implementation。

\- 未修改 Pet Block implementation。

\- 未修改 `pet.test.js`。

\- 未修改正式 Jest tests。

\- 未建立 TASK-0007。

\- 未進行功能範圍外的修改。

\- 既有 unrelated dirty work 保持原狀。



結果：



\*\*PASS\*\*



\---



\## 13. Temporary Verification Artifacts



FINAL REVIEW 使用一次性驗證腳本進行完整 API gate 驗證。



Temporary verification script：



`testing/verify-task0006-final.js`



於驗證完成後已刪除。



確認：



\- Temporary TASK-0006 verification script：不存在

\- `verify-task0006\*.js`：不存在

\- `verify-appointment-\*.js`：不存在



結果：



\*\*PASS\*\*



\---



\## 14. Final Review Gate



| Gate | Result |

|---|---|

| Runtime Synchronization | PASS |

| Frontend `/appointments` Route | PASS |

| Backend `/api/appointments` Route | PASS |

| Validation Matrix | PASS — 17/17 |

| Authorization Matrix | PASS |

| Transaction Rollback | PASS |

| Create / Detail / Update | PASS |

| Multi-Pet / Multi-Service | PASS |

| Date / Time Consistency | PASS |

| Focused Jest | PASS — 1 suite / 4 tests |

| Full Regression | PASS — 7 suites / 30 tests |

| Browser Login | PASS |

| Browser Appointment UI | PASS |

| Browser Create | PASS |

| Browser Multi-Pet / Multi-Service | PASS |

| Browser Edit | PASS |

| Browser Save | PASS |

| Browser Reload Persistence | PASS |

| Scope Integrity | PASS |

| Temporary Artifact Cleanup | PASS |



\---



\## 15. Definition of Done



TASK-0006 必須滿足以下條件：



\- \[x] 3000 舊 Frontend process 已停止。

\- \[x] 3001 舊 Backend process 已停止。

\- \[x] Frontend `.next` 已清除。

\- \[x] Backend 已由目前 source 啟動。

\- \[x] Frontend 已由目前 source 啟動。

\- \[x] `/appointments` route HTTP 200。

\- \[x] 未登入 Appointment API 回傳 401。

\- \[x] Owner login 成功。

\- \[x] Authenticated Appointment API 回傳 200。

\- \[x] Validation Matrix 17/17 PASS。

\- \[x] Authorization Matrix PASS。

\- \[x] CREATE rollback PASS。

\- \[x] UPDATE rollback PASS。

\- \[x] Create / Detail / Update PASS。

\- \[x] Multi-Pet / Multi-Service PASS。

\- \[x] Date / Time consistency PASS。

\- \[x] Focused Appointment Jest PASS。

\- \[x] Full Regression PASS。

\- \[x] Browser Login PASS。

\- \[x] Browser Appointment UI PASS。

\- \[x] Browser Create PASS。

\- \[x] Browser Edit PASS。

\- \[x] Browser Save PASS。

\- \[x] Browser Reload persistence PASS。

\- \[x] Scope integrity PASS。

\- \[x] Temporary verification artifacts removed。

\- \[x] TASK-0007 未建立。

\- \[x] Final Review PASS。

\- \[x] Freeze。



\---



\## 16. Final Status



\*\*TASK-0006 REVIEW = PASS\*\*



\*\*TASK-0006 = FREEZE\*\*



TASK-0006 完成正式驗證並凍結。



Freeze 後不得因一般開發便利性重新引入本 Task 已解決的 runtime mismatch、過期 `.next` state 或舊 Backend process 問題。



任何後續功能修改、Appointment business logic 修改、API 修改、UI 功能擴張或新的工程工作，應以新的 TASK 進行。



\---



\## 17. Freeze Record



| Field | Value |

|---|---|

| Task | TASK-0006 |

| Final Review | PASS |

| Browser UI E2E | PASS |

| API Verification | PASS |

| Authorization | PASS |

| Transaction | PASS |

| Regression | PASS |

| Scope Integrity | PASS |

| Freeze | YES |

| Status | FREEZE |

| Version | v1.0 |

| Next Task | Not created by TASK-0006 |



\---



\## 18. Frozen Conclusion



TASK-0006 所處理的 Browser UI `/appointments` 404／Login redirect 問題，已確認根因為 Frontend 與 Backend 實際執行環境未同步目前 workspace source，而非 Appointment page route 或 Appointment business implementation 本身錯誤。



完成 runtime synchronization、Frontend generated state cleanup 與服務重新啟動後：



\- `/appointments` 正常載入。

\- `/api/appointments` 正常提供 authenticated response。

\- Browser UI E2E 完整通過。

\- Appointment API、Authorization、Transaction、CRUD、Multi-Pet / Multi-Service、Date / Time、Jest Regression 全部通過。

\- Scope integrity 維持。

\- Temporary verification artifacts 已清除。



因此：



\*\*TASK-0006 = FREEZE\*\*

