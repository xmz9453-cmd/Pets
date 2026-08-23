\# TASK-0010 FREEZE — 登入頁面 Login Page



\## 1. Document Information



| Field | Value |

|---|---|

| File Name | TASK-0010-登入頁面-Login-Page-v1.0.md |

| Task | TASK-0010 |

| 中文名稱 | 登入頁面 |

| English Name | Login Page |

| Version | v1.0 |

| Status | FREEZE |

| Freeze Status | FROZEN |

| Document Type | Formal Engineering Document |

| Product | Pet Shop Operations System MVP |

| Architecture | Next.js → Express.js → MySQL |

| Frontend | Next.js Pages Router + JavaScript + Bootstrap |

| Backend | Express.js + JavaScript |

| Database | MySQL |

| ORM | None |

| Testing | Jest + Supertest |

| UI Language | Traditional Chinese（繁體中文） |



\### 1.1 Formal File Name



`TASK-0010-登入頁面-Login-Page-v1.0.md`



\---



\## 2. Task Objective



TASK-0010 負責建立並完成 MVP 的登入頁面（Login Page），使店內工作人員可以透過既有 Authentication API 完成登入，並建立既有 Session / Cookie 認證狀態。



本 Task 的核心目標：



\- 提供登入頁面

\- 提供帳號與密碼輸入

\- 提供表單驗證

\- 提供登入失敗處理

\- 提供登入成功處理

\- 沿用既有 Authentication / Session 架構

\- 登入成功後導向既有內部入口

\- 確保受保護頁面 Authentication Flow 正常

\- 所有使用者可見 UI 必須使用繁體中文

\- 不新增未經確認的 Authentication 功能

\- 不擴張 MVP Scope



\---



\## 3. Scope



\### 3.1 In Scope



TASK-0010 包含：



\- Login Page UI

\- Username 欄位

\- Password 欄位

\- Submit / Login Action

\- Required Field Validation

\- Login API 呼叫

\- Login Failure Handling

\- Login Success Handling

\- Session / Cookie 相容

\- Existing Authentication Flow 相容

\- Existing Protected Route 相容

\- 登入成功後導向既有內部入口

\- Traditional Chinese UI Localization

\- Login Page Regression Tests

\- Browser Verification

\- English UI Scan



\### 3.2 Out of Scope



以下功能不屬於 TASK-0010：



\- 忘記密碼

\- 重設密碼

\- 使用者註冊

\- MFA

\- SSO

\- OAuth

\- Google Login

\- LINE Login

\- Microsoft Login

\- 使用者管理

\- 角色管理系統擴充

\- Enterprise RBAC

\- Dashboard 新功能

\- 通知系統

\- 登入歷史管理 UI

\- 密碼政策管理 UI

\- 未來 TASK 的功能



不得因 TASK-0010 自行擴張上述功能。



\---



\## 4. Existing Authentication Contract



TASK-0010 必須沿用專案既有 Authentication 架構。



\### 4.1 Authentication API



登入使用既有：



`POST /api/auth/login`



Request：



&#x20;   {

&#x20;     "username": "<username>",

&#x20;     "password": "<password>"

&#x20;   }



成功登入後，Backend 建立既有 Session，並透過 Cookie 保存 Session 狀態。



\### 4.2 Session Cookie



既有 Session Cookie：



`psop\_session`



TASK-0010 不重新設計 Session Architecture。



\### 4.3 Authentication State



登入成功後，既有 Authentication Flow 可以透過：



`GET /api/auth/me`



取得目前登入狀態。



TASK-0010 必須保持此既有流程相容。



\---



\## 5. Login Page UI



\### 5.1 Page Route



登入頁面：



`/login`



\### 5.2 Page Purpose



`/login` 提供未登入使用者進行 Authentication。



頁面不得承擔 Dashboard 或其他業務功能。



\### 5.3 Required UI



Login Page 至少提供：



\- 頁面標題

\- 使用者名稱輸入欄位

\- 密碼輸入欄位

\- 登入按鈕

\- 驗證訊息

\- 登入失敗訊息

\- 登入處理中的狀態



\---



\## 6. Traditional Chinese UI Localization



TASK-0010 的所有使用者可見文字必須符合：



`UI 繁體中文化基準 Traditional Chinese UI Localization Baseline v1.0`



\### 6.1 Required UI Text



頁面標題：



`登入`



Username Label：



`使用者名稱`



Password Label：



`密碼`



Username Placeholder：



`請輸入使用者名稱`



Password Placeholder：



`請輸入密碼`



Submit Button：



`登入`



Loading State：



`登入中...`



Username Required：



`使用者名稱為必填`



Password Required：



`密碼為必填`



Authentication Failure：



`帳號或密碼錯誤`



\### 6.2 Localization Rule



所有使用者可見文字必須使用繁體中文。



不得直接將 Backend English Error 顯示給使用者。



例如以下文字不得直接出現在使用者 UI：



\- `Login`

\- `Username`

\- `Password`

\- `Loading`

\- `Error`

\- `Invalid username or password`



Technical identifiers 不屬於使用者可見 UI，例如：



\- API Path

\- JavaScript variable

\- CSS class

\- Database field

\- HTTP status

\- Cookie name



上述 technical identifiers 不需要中文化。



\---



\## 7. Form Validation



\### 7.1 Username Required



當 Username 為空時：



\- 不得送出無效 Login Request

\- 顯示：



`使用者名稱為必填`



\### 7.2 Password Required



當 Password 為空時：



\- 不得送出無效 Login Request

\- 顯示：



`密碼為必填`



\### 7.3 Both Fields Empty



當 Username 與 Password 均為空：



\- 表單驗證失敗

\- 不應送出無效 Authentication Request

\- 顯示對應 Required Validation Message



\### 7.4 Valid Form



當 Username 與 Password 均有值：



\- 通過 Client-side Validation

\- 執行既有 Login API Request



\---



\## 8. Login Failure



當 Authentication API 回傳登入失敗：



\- Login Page 不得導向受保護頁面

\- 使用者維持在 `/login`

\- 顯示繁體中文錯誤訊息

\- 不得顯示 raw Backend English Error

\- 不得顯示 Stack Trace

\- 不得造成頁面崩潰



標準 Authentication Failure UI：



`帳號或密碼錯誤`



使用者可以重新輸入帳號密碼並再次登入。



\---



\## 9. Login Success



當 Authentication API 成功：



1\. Backend 回傳成功狀態

2\. Session 建立

3\. `psop\_session` Cookie 建立

4\. Frontend 維持既有 Authentication Flow

5\. 使用者離開 `/login`

6\. 導向既有內部入口



不得在 TASK-0010 中建立新的 Dashboard 或重新設計既有內部入口。



\---



\## 10. Session Verification



登入成功後必須維持既有 Session。



驗證：



`GET /api/auth/me`



必須可以取得目前登入狀態。



\### 10.1 Session Requirements



\- Session Cookie 正常建立

\- Session Cookie 正常傳遞

\- `/api/auth/me` 可以識別登入狀態

\- Protected Route 可以使用既有 Authentication Guard

\- Login Page 不得破壞既有 Session Architecture



\---



\## 11. Protected Route Compatibility



TASK-0010 不負責建立新的 Protected Route。



TASK-0010 必須與既有 Protected Route 相容。



\### 11.1 Unauthenticated User



未登入使用者進入受保護頁面時：



\- 沿用既有 Authentication Flow

\- 不得繞過 Authentication



\### 11.2 Authenticated User



已登入使用者：



\- 可以正常存取既有受保護區域

\- 不應無故停留於 `/login`



\---



\## 12. Existing `/operations` Compatibility



TASK-0010 不得破壞 TASK-0009。



登入成功後必須保持 `/operations` Authentication 相容。



驗證結果：



\- `/operations` 可正常載入

\- Authentication 正常

\- Session 正常

\- Existing Daily Operations Flow 不受影響



TASK-0010 不得修改 TASK-0009 的業務規格。



\---



\## 13. Frontend Implementation



TASK-0010 實作包含：



\### 13.1 Login Page



`frontend/pages/login.js`



負責：



\- Login Page UI

\- Username / Password State

\- Client-side Validation

\- Login Submit

\- Loading State

\- Login Error Display

\- Login Success Redirect



\### 13.2 Login Form Utility



`frontend/utils/login-form.js`



負責集中處理：



\- Form Validation

\- Login Error Translation / Mapping

\- Login Form related logic



不得因此建立 Enterprise-level abstraction。



\---



\## 14. Testing



\### 14.1 Login Page Test



TASK-0010 新增：



`testing/tests/login-page.test.js`



測試 Login Page / Login Flow 相關行為。



\### 14.2 Required Test Coverage



至少涵蓋：



\- Login Page 基本行為

\- Required Validation

\- Login Failure

\- Login Success

\- Error Handling

\- Existing Authentication Flow Compatibility

\- Traditional Chinese UI related expectations

\- Regression



\---



\## 15. Final Verification



TASK-0010 Final Review 必須重新執行完整測試，而不得直接沿用過去測試結果。



\### 15.1 Automated Test



執行：



&#x20;   cd D:\\MVP\\testing

&#x20;   npm test



Final Verification 結果：



\- Test Suites: 10 passed

\- Tests: 54 passed

\- Failed: 0



結果：



`54/54 PASS`



\---



\## 16. Browser Verification



Browser 驗證頁面：



`http://localhost:3000/login`



\### 16.1 Page Load



驗證結果：



\- Login Page 正常載入

\- UI 正常顯示

\- 無阻斷性 JavaScript Error

\- 無 404

\- Authentication Flow 正常



結果：



`PASS`



\### 16.2 Traditional Chinese UI



Browser 實際驗證：



\- `登入`

\- `使用者名稱`

\- `密碼`

\- `請輸入使用者名稱`

\- `請輸入密碼`

\- `登入`

\- `登入中...`

\- `使用者名稱為必填`

\- `密碼為必填`

\- `帳號或密碼錯誤`



結果：



`PASS`



\### 16.3 English UI Scan



Browser 可見 UI 未發現不必要英文。



未發現：



\- `Login`

\- `Username`

\- `Password`

\- `Loading`

\- `Error`

\- `Invalid username or password`



Backend / Authentication technical console information 不屬於使用者可見 UI，不列入 UI Localization Failure。



結果：



`PASS`



\---



\## 17. Form Validation Verification



驗證：



\### Case 1



Username：



空白



Password：



空白



結果：



`PASS`



\### Case 2



Username：



有值



Password：



空白



結果：



`PASS`



\### Case 3



Username：



空白



Password：



有值



結果：



`PASS`



\### Case 4



Username：



有效值



Password：



有效值



結果：



進入 Authentication Request。



`PASS`



\---



\## 18. Login Failure Verification



使用錯誤帳號或密碼：



結果：



\- Login API Failure 正常處理

\- 使用者留在 `/login`

\- 顯示：



`帳號或密碼錯誤`



\- 沒有 raw Backend English Error

\- 沒有 Stack Trace

\- 頁面正常運作



結果：



`PASS`



\---



\## 19. Login Success Verification



使用既有有效測試帳號：



Username：



`owner`



登入成功結果：



\- Login API HTTP 200

\- `psop\_session` Cookie 建立

\- Session 有效

\- `/api/auth/me` HTTP 200

\- Login Page 不再停留

\- 導向既有 authenticated area



結果：



`PASS`



\---



\## 20. Regression Verification



完整測試結果：



`54/54 PASS`



其中包含：



\- TASK-0010 Login Tests

\- Existing Authentication Tests

\- Existing Project Tests

\- Existing TASK-0009 Regression



結果：



`PASS`



確認：



\- 無已知 Regression

\- TASK-0009 未被破壞

\- `/operations` Authentication Compatibility 正常



\---



\## 21. Scope Compliance



TASK-0010 實作確認：



\- 未新增未要求功能

\- 未新增 Forgot Password

\- 未新增 Registration

\- 未新增 MFA

\- 未新增 SSO

\- 未新增 OAuth

\- 未新增 Enterprise RBAC

\- 未新增未確認 Dashboard 功能

\- 未擴張 MVP Scope



結果：



`PASS`



\---



\## 22. Technical Stack Compliance



TASK-0010 必須遵守既有技術基準。



| Technology | Requirement | Result |

|---|---|---|

| Frontend | Next.js Pages Router | PASS |

| Language | JavaScript | PASS |

| UI Framework | Bootstrap | PASS |

| Backend | Express.js | PASS |

| Database | MySQL | PASS |

| DB Driver | mysql2 | PASS |

| ORM | None | PASS |

| Testing | Jest + Supertest | PASS |

| TypeScript | Not Allowed | PASS |

| Tailwind | Not Allowed | PASS |

| Prisma | Not Allowed | PASS |



\---



\## 23. Git Diff Review



TASK-0010 主要修改：



| File | Purpose | Scope |

|---|---|---|

| `frontend/pages/login.js` | Login Page UI、Validation、Login Flow、Localization | PASS |

| `frontend/utils/login-form.js` | Form Validation / Error Translation | PASS |

| `testing/tests/login-page.test.js` | Login Regression Tests | PASS |



上述修改均屬 TASK-0010 Scope。



既有 TASK-0009 及其他專案檔案不因 TASK-0010 而重新設計。



結果：



`PASS`



\---



\## 24. Acceptance Matrix



| Acceptance Item | Result |

|---|---|

| TASK-0010 Functional Requirements | PASS |

| Login Page | PASS |

| Form Validation | PASS |

| Login Failure | PASS |

| Login Success | PASS |

| Session / Cookie | PASS |

| Protected Route | PASS |

| `/operations` Compatibility | PASS |

| Traditional Chinese UI | PASS |

| English UI Scan | PASS |

| Browser Verification | PASS |

| Automated Tests | PASS — 54/54 |

| Regression | PASS |

| Scope Compliance | PASS |

| Technical Stack Compliance | PASS |

| Git Diff Review | PASS |

| Final Review | PASS |



\---



\## 25. Definition of Done



TASK-0010 只有在以下條件全部成立後才可 Freeze：



\- \[x] Login Page 完成

\- \[x] Username Input 完成

\- \[x] Password Input 完成

\- \[x] Form Validation 完成

\- \[x] Login API 整合完成

\- \[x] Login Failure Handling 完成

\- \[x] Login Success Handling 完成

\- \[x] Session / Cookie 相容

\- \[x] Protected Route 相容

\- \[x] `/operations` 相容

\- \[x] Traditional Chinese UI 完成

\- \[x] English UI Scan PASS

\- \[x] Browser Verification PASS

\- \[x] Automated Tests PASS

\- \[x] Regression PASS

\- \[x] Scope Compliance PASS

\- \[x] Technical Stack Compliance PASS

\- \[x] Git Diff Review PASS

\- \[x] Final Acceptance Review PASS



\---



\## 26. Freeze Decision



TASK-0010 Final Review 結果：



\- Implementation = PASS

\- Automated Tests = PASS

\- Browser Verification = PASS

\- Regression = PASS

\- UI 繁體中文化 = PASS

\- English UI Scan = PASS

\- Scope Compliance = PASS

\- Review = PASS



因此：



\# TASK-0010 = FREEZE



TASK-0010「登入頁面 Login Page」正式完成並 Freeze。



\---



\## 27. Freeze Constraints



TASK-0010 Freeze 後：



\- 不得自行改變已確認 Login Flow

\- 不得自行改變 Session Architecture

\- 不得自行改變 Login API Contract

\- 不得自行將 UI 改回英文

\- 不得自行新增未確認 Authentication 功能

\- 不得自行擴張 TASK-0010 Scope

\- 後續 TASK 不得無理由破壞 TASK-0010 Frozen Behavior



如後續 Task 必須修改 TASK-0010 Frozen Behavior，必須先明確提出變更理由、影響範圍與重新驗證需求。



\---



\## 28. Final Status



`TASK-0010 = FREEZE`



`Version = v1.0`



`UI Localization = Traditional Chinese`



`Automated Tests = 54/54 PASS`



`Browser Verification = PASS`



`Regression = PASS`



`Final Acceptance = PASS`

