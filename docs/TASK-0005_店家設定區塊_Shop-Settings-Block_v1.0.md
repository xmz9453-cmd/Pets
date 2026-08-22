\# TASK-0005\_店家設定區塊\_Shop-Settings-Block\_v1.0



\*\*文件類型：\*\* TASK FREEZE 正式工程文件  

\*\*Task ID：\*\* TASK-0005  

\*\*中文名稱：\*\* 店家設定區塊  

\*\*英文名稱：\*\* Shop Settings Block  

\*\*版本：\*\* v1.0  

\*\*狀態：\*\* FREEZE  

\*\*專案：\*\* MVP — Pet Shop Operations System  

\*\*Freeze 結果：\*\* PASS  

\*\*Freeze 日期：\*\* 2026-08-22



\---



\# 1. Task 定義



\## 1.1 Task 目的



TASK-0005 用於完成 MVP 的「店家設定（Shop Settings）」完整業務能力。



本 Task 必須讓店家 Owner 可以在系統內管理：



\- 店家名稱

\- 電話

\- 地址

\- Email

\- 每週營業時間

\- 每週休息日



同時建立 Owner 與 Front Desk / 非 Owner 之間的權限邊界。



\---



\## 1.2 Task 核心目標



TASK-0005 必須完成以下核心流程：



Owner：



登入 → Shop Settings → 讀取設定 → 修改 → Save → Database Persistence → Reload 驗證



Front Desk：



登入 → Shop Settings → 讀取設定 → Read-only → 不得修改



Transaction：



Shop Settings + Business Hours → 同一 Transaction → 成功 COMMIT / 失敗 ROLLBACK



\---



\# 2. Scope



\## 2.1 In Scope



本 Task 包含：



1\. Shop Settings UI

2\. Shop Settings 基本資料

3\. Business Hours

4\. Open Day

5\. Closed Day

6\. Owner Read

7\. Owner Update

8\. Front Desk Read-only

9\. Backend Authorization

10\. GET Shop Settings API

11\. PUT Shop Settings API

12\. Save

13\. Cancel

14\. Reload Persistence

15\. Database Persistence

16\. Transaction Atomicity

17\. Transaction Rollback

18\. Automated Tests

19\. Frontend Build Verification

20\. Live Runtime Verification

21\. Owner Browser Verification

22\. Front Desk Browser Verification

23\. Full Regression



\---



\## 2.2 Out of Scope



本 Task 不包含：



\- Customer

\- Pet

\- Appointment

\- Daily Operations

\- Grooming

\- Boarding

\- Order

\- Payment

\- Product

\- Report

\- LINE API

\- Online Booking

\- Multi-Tenant SaaS

\- Enterprise RBAC

\- SSO

\- MFA

\- 多店管理

\- Advanced Audit System

\- Shop Settings History

\- Import / Export

\- 其他 Block 功能



不得因 TASK-0005 擴張上述 Scope。



\---



\# 3. Shop Settings UI



\## 3.1 Shop Settings 頁面



Shop Settings 頁面必須提供：



\- Shop Name

\- Phone

\- Address

\- Email

\- Business Hours

\- Save

\- Cancel



\---



\## 3.2 Shop Name



Shop Settings 頁面必須提供 Shop Name 欄位。



Owner 可以修改。



Front Desk / 非 Owner 必須為 Disabled。



\---



\## 3.3 Phone



Shop Settings 頁面必須提供 Phone 欄位。



Owner 可以修改。



Front Desk / 非 Owner 必須為 Disabled。



\---



\## 3.4 Address



Shop Settings 頁面必須提供 Address 欄位。



Owner 可以修改。



Front Desk / 非 Owner 必須為 Disabled。



\---



\## 3.5 Email



Shop Settings 頁面必須提供 Email 欄位。



Owner 可以修改。



Front Desk / 非 Owner 必須為 Disabled。



\---



\# 4. Business Hours



\## 4.1 每週營業時間



Shop Settings 必須提供每週七日的營業時間設定：



1\. Monday

2\. Tuesday

3\. Wednesday

4\. Thursday

5\. Friday

6\. Saturday

7\. Sunday



\---



\## 4.2 Open Day



Open Day 必須可以設定：



\- Open / Closed 狀態

\- Opening Time

\- Closing Time



例如：



Monday：



\- Open

\- 09:00

\- 18:00



\---



\## 4.3 Closed Day



Closed Day 必須可以設定為休息日。



例如：



Saturday：



\- Closed



Closed Day 不需要提供有效營業時間。



\---



\## 4.4 Business Hours Persistence



Business Hours 儲存後，重新載入 Shop Settings 頁面時：



\- Open / Closed 狀態必須保持

\- Opening Time 必須保持

\- Closing Time 必須保持



\---



\## 4.5 Business Hours Transaction



Shop Settings 與 Business Hours 的更新必須屬於同一 Database Transaction。



Save 操作不得將：



\- Shop Settings

\- Business Hours



視為兩個彼此獨立的交易。



\---



\# 5. Shop Settings Data



\## 5.1 Shop Settings 資料



Shop Settings 必須包含：



| Field | 中文名稱 | 說明 |

|---|---|---|

| name | 店家名稱 | 店家名稱 |

| phone | 電話 | 店家主要聯絡電話 |

| address | 地址 | 店家營業地址 |

| email | Email | 店家主要電子郵件 |



\---



\## 5.2 Database Persistence



Shop Settings 必須持久化至 MySQL。



Frontend 不得僅依靠本地 State 作為最終資料來源。



儲存成功後，Database 必須保留最新資料。



\---



\## 5.3 Reload Persistence



Save 成功後重新載入頁面：



\- Shop Name 必須保持

\- Phone 必須保持

\- Address 必須保持

\- Email 必須保持

\- Business Hours 必須保持



\---



\# 6. API



\## 6.1 GET Shop Settings



API：



GET /api/shop-settings



用途：



取得目前 Shop Settings 與 Business Hours。



\---



\## 6.2 GET Authorization



未登入使用者不得取得受保護的 Shop Settings API。



未經 Authentication 時，API 必須拒絕請求。



\---



\## 6.3 PUT Shop Settings



API：



PUT /api/shop-settings



用途：



更新：



\- Shop Settings

\- Business Hours



\---



\## 6.4 PUT Authorization



PUT /api/shop-settings 必須限制為 Owner。



Front Desk / 非 Owner 呼叫 PUT 時必須回傳：



HTTP 403 Forbidden



\---



\# 7. Owner Permission



\## 7.1 Owner Read



Owner 可以：



\- 進入 Shop Settings

\- 查看店家資料

\- 查看 Business Hours



\---



\## 7.2 Owner Edit



Owner 可以：



\- 修改 Shop Name

\- 修改 Phone

\- 修改 Address

\- 修改 Email

\- 修改 Business Hours

\- 修改 Closed Day

\- Save

\- Cancel



\---



\## 7.3 Owner Save



Owner 按下 Save 後：



1\. Frontend 提交修改

2\. Backend 驗證 Authentication

3\. Backend 驗證 Owner Authorization

4\. Backend 執行 Shop Settings 更新

5\. Backend 執行 Business Hours 更新

6\. 兩者使用同一 Transaction

7\. 成功後 COMMIT

8\. Frontend 顯示成功結果



\---



\# 8. Front Desk / Non-Owner Permission



\## 8.1 Read Access



Front Desk / 非 Owner 可以讀取 Shop Settings。



GET /api/shop-settings 必須允許已登入且具備讀取權限的使用者取得資料。



\---



\## 8.2 Read-only UI



Front Desk / 非 Owner 進入 Shop Settings 時：



\- Shop Name 必須 Disabled

\- Phone 必須 Disabled

\- Address 必須 Disabled

\- Email 必須 Disabled

\- Business Hours 必須 Disabled

\- Save 必須 Disabled

\- Cancel 必須 Disabled



\---



\## 8.3 Front Desk Update Restriction



Front Desk / 非 Owner 不得修改 Shop Settings。



即使直接繞過 Frontend UI 呼叫：



PUT /api/shop-settings



Backend 仍必須拒絕。



預期結果：



HTTP 403 Forbidden



\---



\## 8.4 Security Principle



Frontend Disabled 僅為 UI 行為。



真正的權限控制必須由 Backend Enforcement 保證。



不得將 Frontend Disabled 視為唯一 Authorization 機制。



\---



\# 9. Save



\## 9.1 Save 行為



Owner 修改資料後按下 Save：



\- 必須送出最新資料

\- Backend 必須進行驗證

\- Database 必須更新

\- Shop Settings 與 Business Hours 必須保持 Atomicity

\- 成功後必須顯示成功訊息



\---



\## 9.2 Save Success



成功儲存後，UI 必須提供明確成功狀態。



實際驗證結果：



Shop settings saved successfully.



\---



\# 10. Cancel



\## 10.1 Cancel 行為



Owner 修改尚未儲存的資料後按下 Cancel：



\- 尚未儲存的修改不得寫入 Database

\- UI 必須恢復至目前已儲存狀態



\---



\## 10.2 Cancel Verification



實際驗證：



1\. 將 Shop Name 修改為 Draft Change Only

2\. 未 Save

3\. 按下 Cancel

4\. Shop Name 恢復為原本已儲存值



結果：



PASS



\---



\# 11. Transaction Integrity



\## 11.1 Transaction Requirement



Shop Settings 更新與 Business Hours 更新必須在同一 Transaction 中執行。



Transaction 必須符合：



\- BEGIN / transaction start

\- Shop Settings update

\- Business Hours update

\- COMMIT on success

\- ROLLBACK on failure



\---



\## 11.2 Atomic Update



正常更新：



Shop Settings 更新成功



且



Business Hours 更新成功



才允許：



COMMIT



\---



\## 11.3 Partial Update Prevention



若其中任何更新步驟失敗：



\- 不得留下 Shop Settings 部分更新

\- 不得留下 Business Hours 部分更新

\- 必須回復至 Transaction 開始前狀態



\---



\# 12. Transaction Rollback Verification



\## 12.1 驗證目的



Transaction Rollback 不得僅透過程式碼閱讀判定。



必須實際：



1\. 建立已知初始資料

2\. 開始實際更新

3\. 確認 Transaction 內資料確實已被修改

4\. 強制產生失敗

5\. 讓 Transaction 執行 Rollback

6\. Transaction 結束後重新讀取 Database

7\. 驗證所有資料恢復為初始狀態



\---



\## 12.2 Initial State



實際測試初始 Shop Settings：



\- name = A-ORIGINAL

\- phone = 1111

\- address = Addr-A

\- email = a@example.com



Business Hours 初始狀態：



\- Monday: 09:00–17:00

\- Tuesday: 09:00–17:00

\- Wednesday: 09:00–17:00

\- Thursday: 09:00–17:00

\- Friday: 09:00–17:00

\- Saturday: Closed

\- Sunday: Closed



\---



\## 12.3 Forced Failure



測試中故意在 Transaction 內：



1\. 完成 Shop Settings 更新

2\. 完成 Business Hours 更新

3\. 讀取 Transaction 內資料確認修改已經存在

4\. 拋出：



FORCED\_ROLLBACK\_ERROR\_FOR\_VERIFICATION



\---



\## 12.4 Transaction Internal Evidence



實際驗證結果確認 Transaction 內已存在失敗資料：



\- name = B-FAILED-UPDATE

\- phone = 2222

\- address = Addr-B

\- email = b@example.com

\- Business Hours 已被更新為新的測試時間



因此證明測試並非單純在更新前就失敗。



\---



\## 12.5 Rollback Evidence



實際 Transaction 失敗後：



Shop Settings 恢復：



\- name = A-ORIGINAL

\- phone = 1111

\- address = Addr-A

\- email = a@example.com



Business Hours 恢復原始資料。



實際驗證：



\- SHOP\_UNCHANGED=true

\- HOURS\_UNCHANGED=true



\---



\## 12.6 Rollback Result



Transaction Rollback：



PASS



理由：



\- 更新確實在 Transaction 內發生

\- 更新後故意產生 Exception

\- Transaction 未 Commit

\- Rollback 成功

\- Shop Settings 未留下部分更新

\- Business Hours 未留下部分更新

\- Database 最終狀態與 Transaction 開始前完全一致



\---



\# 13. Frontend Verification



\## 13.1 Development Runtime



Frontend：



Next.js Pages Router



Runtime Port：



3000



\---



\## 13.2 Backend Runtime



Backend：



Express.js



Runtime Port：



3001



\---



\## 13.3 Live Runtime Verification



實際驗證：



GET /settings



結果：



HTTP 200 OK



\---



\## 13.4 Frontend Production Build



實際執行：



npm run build



結果：



PASS



Next.js Production Build 成功完成。



\---



\# 14. Owner Browser Verification



\## 14.1 Owner Login



實際 Browser 驗證 Owner Session。



結果：



PASS



\---



\## 14.2 Shop Settings Loading



Owner 登入後進入：



/settings



結果：



PASS



Shop Settings 頁面正常載入。



\---



\## 14.3 Owner Data Update



實際 Browser 修改：



\- Shop Name = Sunset Pet Grooming

\- Phone = 02-1234-5678

\- Address = 123 Main Street

\- Email = hello@sunsetpet.com

\- Monday = 09:00–18:00

\- Saturday = Closed



\---



\## 14.4 Owner Save



實際 Browser 按下 Save。



結果：



PASS



UI 顯示：



Shop settings saved successfully.



\---



\## 14.5 Owner Reload Persistence



重新載入頁面後實際確認：



\- Shop Name = Sunset Pet Grooming

\- Phone = 02-1234-5678

\- Address = 123 Main Street

\- Email = hello@sunsetpet.com

\- Monday Open = 09:00:00

\- Monday Close = 18:00:00

\- Saturday Closed = true



結果：



PASS



\---



\## 14.6 Owner Cancel



實際 Browser：



1\. 將 Shop Name 修改為 Draft Change Only

2\. 按下 Cancel

3\. 驗證畫面恢復已儲存資料



結果：



PASS



\---



\# 15. Front Desk Browser Verification



\## 15.1 Front Desk Login



實際使用 Front Desk 帳號進行 Browser Login。



驗證結果：



\- Login 成功

\- Browser 顯示 Front Desk

\- Browser 顯示 FRONT\_DESK



結果：



PASS



\---



\## 15.2 Front Desk Shop Settings



Front Desk 進入：



/settings



結果：



PASS



Shop Settings 頁面正常載入。



\---



\## 15.3 Front Desk Read-only



實際 Browser 驗證：



\- Inputs Disabled

\- Save Disabled

\- Cancel Disabled

\- Business Hours 欄位 Disabled



結果：



PASS



\---



\## 15.4 Front Desk PUT Authorization



實際使用 Front Desk Session 呼叫：



PUT /api/shop-settings



結果：



HTTP 403 Forbidden



Response：



success = false



error.message = Forbidden



結果：



PASS



\---



\# 16. Automated Tests



\## 16.1 Shop Settings Test Coverage



Shop Settings 測試涵蓋：



1\. GET /api/shop-settings initializes default settings

2\. PUT /api/shop-settings updates shop data and business hours atomically

3\. PUT /api/shop-settings rejects invalid input and keeps prior values unchanged

4\. GET /api/shop-settings requires authentication



\---



\## 16.2 Test Execution



執行：



npm test -- --runInBand



結果：



\- Test Suites: 6 passed

\- Tests: 26 passed

\- Failed: 0

\- Snapshots: 0



\---



\# 17. Regression Verification



\## 17.1 Full Regression



最終驗證執行完整 Regression。



結果：



PASS



\---



\## 17.2 Regression Result



| 項目 | 結果 |

|---|---|

| Test Suites | 6 / 6 Passed |

| Tests | 26 / 26 Passed |

| Failed | 0 |

| Regression | PASS |



\---



\# 18. Verification Summary



| Verification Item | Result |

|---|---|

| Frontend Build | PASS |

| Live Frontend /settings | PASS |

| Owner Login | PASS |

| Owner Shop Settings Load | PASS |

| Owner Edit | PASS |

| Owner Save | PASS |

| Save Success Feedback | PASS |

| Reload Persistence | PASS |

| Business Hours | PASS |

| Closed Day | PASS |

| Cancel | PASS |

| Front Desk Login | PASS |

| Front Desk Read-only UI | PASS |

| Front Desk PUT 403 | PASS |

| Transaction Atomicity | PASS |

| Transaction Rollback | PASS |

| Full Regression | PASS |

| Source Code Changes During Final Verification | NONE |



\---



\# 19. Definition of Done



TASK-0005 Definition of Done 全部完成。



\## 19.1 Functional



\- Shop Settings 可讀取

\- Shop Settings 可修改

\- Business Hours 可修改

\- Closed Day 可設定

\- Save 可正常工作

\- Cancel 可正常工作

\- Reload Persistence 正常



結果：



PASS



\---



\## 19.2 Authorization



\- Owner 可以修改

\- Front Desk 可以讀取

\- Front Desk UI 為 Read-only

\- Front Desk PUT 被 Backend 拒絕

\- 非 Owner PUT 回傳 403



結果：



PASS



\---



\## 19.3 Transaction



\- Shop Settings 與 Business Hours 使用同一 Transaction

\- Transaction 失敗時會 Rollback

\- 不會留下 Partial Update

\- 實際 Forced Failure 已驗證

\- Rollback 後資料與初始狀態一致



結果：



PASS



\---



\## 19.4 Testing



\- Shop Settings Tests PASS

\- Full Regression PASS

\- 6 Test Suites PASS

\- 26 Tests PASS

\- 0 Failed



結果：



PASS



\---



\## 19.5 Runtime



\- Frontend Runtime 正常

\- Backend Runtime 正常

\- /settings HTTP 200

\- Owner Browser Flow PASS

\- Front Desk Browser Flow PASS



結果：



PASS



\---



\# 20. Final Freeze Decision



TASK-0005「店家設定區塊（Shop Settings Block）」已完成：



\- Scope

\- Implementation

\- Authentication

\- Authorization

\- UI Verification

\- Owner Browser Verification

\- Front Desk Browser Verification

\- Persistence Verification

\- Business Hours Verification

\- Cancel Verification

\- Transaction Atomicity Verification

\- Transaction Rollback Verification

\- Automated Testing

\- Full Regression

\- Final Runtime Verification



所有必要 Definition of Done 均已具備實際驗證證據。



因此：



\*\*TASK-0005 = PASS / FREEZE\*\*



\---



\# 21. Freeze Rules



自本文件進入 FREEZE 後：



1\. 不得未經變更流程修改 TASK-0005 已 Frozen 行為。

2\. 不得因後續 Task 任意擴張 Shop Settings Scope。

3\. 不得降低 Owner / Front Desk Authorization 規則。

4\. 不得移除 Transaction Atomicity。

5\. 不得移除 Transaction Rollback 保證。

6\. 不得破壞既有 Regression。

7\. 若後續需求需要修改本 Task，必須建立正式變更依據。

8\. 後續 Task 必須以本 Freeze 文件作為 TASK-0005 的基準。



\---



\# 22. Final Status



\*\*TASK ID：\*\* TASK-0005



\*\*TASK NAME：\*\* 店家設定區塊 / Shop Settings Block



\*\*VERSION：\*\* v1.0



\*\*STATUS：\*\* FREEZE



\*\*RESULT：\*\* PASS



\*\*Definition of Done：\*\* COMPLETE



\*\*Regression：\*\* PASS



\*\*Transaction Rollback：\*\* PASS



\*\*Owner Browser Verification：\*\* PASS



\*\*Front Desk Browser Verification：\*\* PASS



\*\*Production Code Changes During Final Verification：\*\* NONE



\*\*Freeze Decision：\*\* APPROVED

