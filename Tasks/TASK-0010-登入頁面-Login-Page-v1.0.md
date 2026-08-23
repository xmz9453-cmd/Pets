\# TASK-0010-登入頁面-Login-Page-v1.0



\*\*Document Type:\*\* Formal Engineering Task Specification  

\*\*Task ID:\*\* TASK-0010  

\*\*Task Name:\*\* 登入頁面 (Login Page)  

\*\*Version:\*\* v1.0  

\*\*Status:\*\* CODING READY  

\*\*Project:\*\* MVP — Pet Shop Operations System  

\*\*Target Directory:\*\* `docs/`  

\*\*Implementation Mode:\*\* AI-Assisted Coding  

\*\*UI Language:\*\* 繁體中文（Traditional Chinese / zh-TW）



\---



\# 1. Document Information（文件資訊）



| Field | Value |

|---|---|

| Task ID | TASK-0010 |

| Task Name | 登入頁面 (Login Page) |

| Version | v1.0 |

| Status | CODING READY |

| Previous Task | TASK-0009 — 日常營運 (Daily Operations) |

| Target Directory | `docs/` |

| Primary UI Language | 繁體中文（zh-TW） |

| Frontend | Next.js Pages Router + JavaScript + Bootstrap |

| Backend | Express.js + JavaScript |

| Database | MySQL |

| ORM | 不使用 Prisma |

| Testing | Jest + Supertest |



\---



\# 2. Task Objective（任務目標）



TASK-0010 負責建立並完成 PSOP MVP 的：



> \*\*登入頁面（Login Page）\*\*



本 Task 的目的，是讓內部 Staff 可以透過既有 Authentication API 完成登入，並進入系統。



本 Task 只處理：



\- 登入頁面 UI

\- 登入表單

\- 登入 API 呼叫

\- 登入成功後的導向

\- 登入失敗後的錯誤顯示

\- 登入狀態下的基本頁面保護

\- 登入頁面的繁體中文 UI

\- 登入流程驗證



本 Task 不重新設計 Authentication Architecture，也不建立新的帳號系統。



\---



\# 3. Scope（任務範圍）



\## 3.1 In Scope（包含）



本 Task 必須完成：



1\. `/login` 頁面

2\. 使用者名稱輸入欄位

3\. 密碼輸入欄位

4\. 登入按鈕

5\. 登入 API 呼叫

6\. 登入成功處理

7\. 登入失敗處理

8\. Loading 狀態

9\. 表單基本驗證

10\. Authentication Session 與既有系統整合

11\. 登入成功後導向既有內部系統首頁

12\. 未登入使用者無法直接進入需要 Authentication 的內部頁面

13\. 已登入使用者不應停留在登入頁面

14\. 所有使用者可見 UI 必須使用繁體中文

15\. Browser Verification

16\. Automated Test

17\. Regression Test

18\. UI 繁體中文驗證

19\. English UI Scan



\---



\# 4. Out of Scope（不包含）



本 Task 不包含：



\- 新增 Staff 管理功能

\- 新增 User CRUD

\- 新增 Role Management

\- 新增 Permission Management

\- 新增 RBAC Architecture

\- 新增 Customer Login

\- 新增 Customer Registration

\- 新增 Password Reset

\- 新增 Forgot Password

\- 新增 Email Verification

\- 新增 MFA

\- 新增 2FA

\- 新增 SSO

\- 新增 OAuth

\- 新增 Google Login

\- 新增 Facebook Login

\- 新增 LINE Login

\- 新增 CAPTCHA

\- 新增 Login History UI

\- 新增 Security Dashboard

\- 修改既有 Authentication Business Rules

\- 修改既有 Session Architecture

\- 修改 MySQL Authentication Schema，除非現有登入流程因本 Task 無法正常運作而有必要修正

\- 其他未被 TASK-0010 明確要求的功能



不得因本 Task 自行延伸上述功能。



\---



\# 5. Existing System First（現有系統優先）



AI Coding 必須先檢查目前專案。



不得假設專案為空白專案。



至少確認：



\- 現有 Frontend 結構

\- 現有 Backend Authentication API

\- 現有 Session 機制

\- 現有 `/login` 狀態

\- 現有首頁或內部入口

\- 現有 Bootstrap 使用方式

\- 現有 UI 中文化基準

\- TASK-0009 已完成內容



不得因建立 Login Page 而破壞 TASK-0009。



\---



\# 6. Authentication Integration（Authentication 整合）



TASK-0010 使用現有 Authentication 系統。



AI Coding 不得重新建立另一套 Authentication Architecture。



登入流程應為：



&#x20;   Login Page

&#x20;       ↓

&#x20;   使用者輸入帳號與密碼

&#x20;       ↓

&#x20;   POST Authentication API

&#x20;       ↓

&#x20;   Authentication Success

&#x20;       ↓

&#x20;   Session 建立／維持

&#x20;       ↓

&#x20;   導向內部系統首頁



登入失敗：



&#x20;   Login Page

&#x20;       ↓

&#x20;   使用者輸入帳號與密碼

&#x20;       ↓

&#x20;   POST Authentication API

&#x20;       ↓

&#x20;   Authentication Failed

&#x20;       ↓

&#x20;   顯示繁體中文錯誤訊息

&#x20;       ↓

&#x20;   留在 Login Page



\---



\# 7. Login Page UI（登入頁面 UI）



\## 7.1 Page Route



登入頁面固定使用：



&#x20;   /login



\---



\## 7.2 Page Title



使用者可見頁面標題必須使用：



&#x20;   登入



不得顯示：



&#x20;   Login



作為頁面主要 UI 標題。



\---



\## 7.3 Username Field



欄位標籤：



&#x20;   使用者名稱



輸入欄位必須允許使用者輸入既有 Authentication 所使用的 username。



\---



\## 7.4 Password Field



欄位標籤：



&#x20;   密碼



輸入類型：



&#x20;   password



不得將密碼以明文形式顯示於畫面。



\---



\## 7.5 Login Button



登入按鈕文字：



&#x20;   登入



不得使用：



&#x20;   Login



作為使用者可見按鈕文字。



\---



\## 7.6 Loading State



登入 API 執行期間必須避免使用者重複提交。



使用者可見 Loading 文案必須使用繁體中文。



標準文案：



&#x20;   登入中...



登入處理期間：



\- 登入按鈕應避免重複提交

\- 表單狀態應保持一致

\- API 完成後恢復正常狀態



\---



\# 8. Traditional Chinese UI Requirement（繁體中文 UI 強制要求）



\## 8.1 Absolute Requirement



TASK-0010 最重要的 UI 驗收條件之一：



> \*\*所有使用者可見 UI 必須使用繁體中文。\*\*



語言標準：



&#x20;   zh-TW

&#x20;   Traditional Chinese

&#x20;   繁體中文



不得將英文 UI 作為預設顯示語言。



\---



\## 8.2 Required Visible Text



至少包含：



| English Concept | Required UI |

|---|---|

| Login | 登入 |

| Username | 使用者名稱 |

| Password | 密碼 |

| Logging in | 登入中... |

| Required | 必填 |

| Invalid credentials | 帳號或密碼錯誤 |

| Unauthorized | 尚未登入或登入狀態已失效 |

| Loading | 載入中... |

| Error | 發生錯誤 |



若實際既有 Authentication API 回傳不同錯誤，AI Coding 必須將使用者可見訊息轉換為適當繁體中文。



不得直接把後端英文錯誤訊息原樣顯示給使用者。



\---



\# 9. UI Localization Rule（UI 中文化規則）



TASK-0010 不只是要求「頁面標題中文」。



以下全部都屬於使用者可見 UI，必須檢查：



\- Page title

\- Field label

\- Placeholder

\- Button

\- Loading text

\- Validation message

\- Authentication error

\- API error

\- Empty state

\- Status message

\- Browser-visible text

\- Modal / Alert（若本 Task 使用）

\- Accessibility label（若使用者可見或被輔助技術讀取）



不得只翻譯部分文字。



\---



\# 10. English UI Scan（英文 UI 掃描）



完成實作後，AI Coding 必須進行英文 UI 掃描。



掃描目標：



&#x20;   frontend/pages/login.js



以及 TASK-0010 實際新增或修改的 Frontend 檔案。



必須確認不存在不必要的使用者可見英文。



允許存在的英文包括：



\- JavaScript 語法

\- API route

\- HTTP method

\- HTML attribute

\- CSS class

\- Bootstrap class

\- Internal variable name

\- Function name

\- Database field name

\- Technical identifier

\- Console / developer-only technical message



但是：



> \*\*技術英文不得直接出現在使用者可見 UI。\*\*



\---



\# 11. Form Validation（表單驗證）



Login Form 至少必須驗證：



\## 11.1 Username



未輸入使用者名稱時：



&#x20;   使用者名稱為必填



不得送出無效 Login Request。



\---



\## 11.2 Password



未輸入密碼時：



&#x20;   密碼為必填



不得送出無效 Login Request。



\---



\## 11.3 Authentication Failure



帳號或密碼不正確時，使用者可見訊息應為：



&#x20;   帳號或密碼錯誤



不得直接顯示：



&#x20;   Invalid username or password



\---



\# 12. Login Success（登入成功）



登入成功後：



1\. Session 必須正常建立或維持

2\. 使用者不得繼續停留在 `/login`

3\. 必須導向既有內部系統入口

4\. 不得建立 TASK-0010 Scope 外的新 Dashboard

5\. 不得新增額外商業功能



導向目標必須依目前專案既有首頁／內部入口判定。



AI Coding 不得自行建立新的首頁架構。



\---



\# 13. Login Failure（登入失敗）



登入失敗時：



\- 不得導向內部頁面

\- 不得建立無效 Session

\- 不得清除既有合法 Session，除非既有 Authentication 流程本身如此設計

\- 必須留在 `/login`

\- 必須顯示繁體中文錯誤訊息

\- 使用者可以重新輸入帳號與密碼



\---



\# 14. Authentication Guard（登入保護）



TASK-0010 必須確認既有 Authentication Guard 可以正常工作。



至少驗證：



\### 未登入



未登入使用者進入需要 Authentication 的內部頁面時：



&#x20;   必須被導向登入流程



\---



\### 已登入



已登入使用者：



&#x20;   不應被要求重新登入



\---



\### 已登入進入 `/login`



如果既有架構支援：



&#x20;   已登入使用者進入 `/login`



應導向既有內部入口。



不得因此建立新的 Authentication 行為。



\---



\# 15. API Requirement（API 要求）



TASK-0010 不新增 Authentication API。



必須使用現有 Login API。



AI Coding 必須先確認現有 API：



\- HTTP Method

\- Endpoint

\- Request Body

\- Response

\- Session Cookie

\- Error Response



然後依現有 API 實作 Login Page。



不得在沒有必要性的情況下新增第二個 Login Endpoint。



\---



\# 16. Session / Cookie Requirement（Session / Cookie）



登入成功後必須確認既有 Session 可以在 Browser 中正常維持。



至少驗證：



1\. Login Request 成功

2\. Session 建立

3\. Browser 保存 Session

4\. 後續 Authentication API Request 可以使用 Session

5\. `/operations` 等需要登入的頁面可以正常存取



TASK-0010 不重新設計 Cookie Architecture。



\---



\# 17. Browser Verification（瀏覽器驗證）



AI Coding 必須使用實際 Browser 驗證。



至少完成：



\### BV-01 — Login Page



開啟：



&#x20;   /login



確認：



\- 頁面正常載入

\- UI 為繁體中文

\- 沒有 JavaScript Error

\- 沒有不必要英文



\---



\### BV-02 — Empty Form



不輸入任何資料直接按：



&#x20;   登入



確認：



\- 表單驗證正常

\- 顯示繁體中文錯誤訊息

\- 不會送出無效 Request



\---



\### BV-03 — Invalid Login



輸入錯誤帳號或密碼。



確認：



\- Login Request 執行

\- 登入失敗

\- 頁面保持在 `/login`

\- 顯示繁體中文錯誤訊息



\---



\### BV-04 — Valid Login



使用既有有效測試帳號登入。



確認：



\- Login 成功

\- Session 正常建立

\- 成功導向內部頁面

\- 不再停留 `/login`



\---



\### BV-05 — Protected Page



登入後開啟既有需要 Authentication 的頁面。



至少確認：



&#x20;   /operations



可以正常存取。



\---



\### BV-06 — Logout / Session Expiry



若現有系統已提供 Logout 或 Session Expiry 流程，應確認：



\- Session 失效後

\- 需要 Authentication 的頁面無法直接使用

\- 使用者重新進入登入流程



本項不得新增新的 Logout 功能。



\---



\# 18. Automated Testing（自動化測試）



TASK-0010 必須新增或更新必要測試。



至少驗證：



1\. Login Page 可以正常 render

2\. Login API request 正確送出

3\. Login success flow

4\. Login failure flow

5\. Required field validation

6\. Authentication session handling

7\. Existing protected route compatibility

8\. Traditional Chinese UI text

9\. No regression



測試必須使用目前專案既有：



&#x20;   Jest

&#x20;   Supertest



不得改用其他 Testing Framework。



\---



\# 19. Traditional Chinese UI Test Requirement（繁體中文 UI 測試要求）



TASK-0010 必須增加 UI 文案驗證。



至少確認以下文字存在：



&#x20;   登入

&#x20;   使用者名稱

&#x20;   密碼

&#x20;   登入中...



錯誤狀態至少確認：



&#x20;   帳號或密碼錯誤



以及必要的：



&#x20;   使用者名稱為必填

&#x20;   密碼為必填



若實際 UI 採用既有 Baseline 的等價繁體中文詞彙，可以依現有正式 UI 用語統一，但不得改成英文。



\---



\# 20. Regression Testing（回歸測試）



TASK-0010 完成後必須執行完整既有測試。



至少執行目前正式 Testing Command：



&#x20;   npm test



必須確認：



\- TASK-0001 不受影響

\- TASK-0009 不受影響

\- Authentication 相關既有功能不受破壞

\- `/operations` 仍可正常使用

\- Existing API Tests 不得因 Login Page 修改而失敗



\---



\# 21. Scope Control（範圍控制）



TASK-0010 的核心只有：



> \*\*建立可實際使用、繁體中文、可驗證的登入頁面。\*\*



AI Coding 不得因實作 Login Page 而：



\- 重構整個 Authentication

\- 重寫 Session System

\- 建立新 RBAC

\- 建立新 Dashboard

\- 修改其他 Business Module

\- 修改 TASK-0009 Business Logic

\- 修改 Frozen PSOP Specification

\- 引入 TypeScript

\- 引入 Tailwind

\- 引入 Prisma

\- 引入新的大型 Framework

\- 建立 TASK-0011



\---



\# 22. Technical Stack Compliance（技術基線）



必須遵循現有 MVP 技術基線：



| Layer | Required |

|---|---|

| Frontend | Next.js Pages Router |

| Frontend Language | JavaScript |

| UI Framework | Bootstrap |

| Backend | Express.js |

| Backend Language | JavaScript |

| Database | MySQL |

| DB Driver | mysql2 |

| ORM | 不使用 Prisma |

| Testing | Jest + Supertest |

| TypeScript | 禁止 |

| Tailwind | 禁止 |



不得因 TASK-0010 改變技術基線。



\---



\# 23. Stop Conditions（停止條件）



遇到以下任何情況，AI Coding 必須停止，不得自行猜測：



\### SC-01



現有 Login API 與本文件描述不一致。



\### SC-02



現有 Authentication Session Architecture 與本 Task 發生衝突。



\### SC-03



需要修改 Frozen Specification。



\### SC-04



需要大幅修改 Authentication Architecture。



\### SC-05



需要修改 TASK-0009 已 Freeze 的 Business Logic。



\### SC-06



需要新增本 Task Scope 外的 Business Feature。



\### SC-07



無法判斷登入成功後的既有內部入口。



\### SC-08



無法確認既有有效測試帳號。



\### SC-09



需要更換既定 Technology Stack。



\### SC-10



任何可能造成既有功能遺失的操作。



遇到 Stop Condition 時：



&#x20;   STOP



並回報：



&#x20;   Stop Condition

&#x20;   Evidence

&#x20;   Impact

&#x20;   Required Decision



不得自行繞過。



\---



\# 24. Acceptance Criteria（驗收條件）



| ID | Acceptance Criteria | Required Result |

|---|---|---|

| AC-01 | `/login` 可以正常載入 | PASS |

| AC-02 | 登入頁面使用 Bootstrap | PASS |

| AC-03 | 使用者名稱欄位存在 | PASS |

| AC-04 | 密碼欄位存在 | PASS |

| AC-05 | 登入按鈕存在 | PASS |

| AC-06 | 空白帳號無法提交 | PASS |

| AC-07 | 空白密碼無法提交 | PASS |

| AC-08 | 錯誤帳密會被拒絕 | PASS |

| AC-09 | 登入成功可以建立既有 Session | PASS |

| AC-10 | 登入成功後可以進入既有內部入口 | PASS |

| AC-11 | 未登入無法直接使用需要 Authentication 的頁面 | PASS |

| AC-12 | `/operations` 登入後可以正常存取 | PASS |

| AC-13 | Login Page 所有使用者可見文字為繁體中文 | PASS |

| AC-14 | Login Error 所有使用者可見文字為繁體中文 | PASS |

| AC-15 | Loading UI 使用繁體中文 | PASS |

| AC-16 | English UI Scan 無不必要英文 | PASS |

| AC-17 | Automated Tests 通過 | PASS |

| AC-18 | Regression Tests 通過 | PASS |

| AC-19 | Browser Verification 通過 | PASS |

| AC-20 | 未新增 Scope 外 Business Feature | PASS |

| AC-21 | 未使用 TypeScript | PASS |

| AC-22 | 未使用 Tailwind | PASS |

| AC-23 | 未使用 Prisma | PASS |

| AC-24 | 未修改 Frozen Specification | PASS |

| AC-25 | TASK-0009 功能未被破壞 | PASS |



\---



\# 25. Verification Result Rules（驗證結果規則）



所有 Verification 只能使用：



&#x20;   PASS

&#x20;   FAIL

&#x20;   NOT AVAILABLE



不得使用：



&#x20;   Probably PASS

&#x20;   Should PASS

&#x20;   Expected PASS

&#x20;   Likely PASS



沒有實際執行驗證，不得標記：



&#x20;   PASS



\---



\# 26. Completion Report（完成報告）



AI Coding 完成 TASK-0010 後，必須提供完整 Completion Report。



至少包含：



1\. Task ID

2\. Task Status

3\. Implementation Summary

4\. Files Created

5\. Files Modified

6\. Files Deleted

7\. API Used

8\. Authentication Flow

9\. Session Verification

10\. UI Implementation

11\. Traditional Chinese UI Verification

12\. English UI Scan

13\. Browser Verification

14\. Automated Testing

15\. Regression Testing

16\. Acceptance Criteria Verification

17\. Scope Verification

18\. Stop Conditions

19\. Issues

20\. Git Status

21\. Git Diff Summary

22\. Final Recommendation



\---



\# 27. Human Acceptance（人工驗收）



AI Coding 不得自行宣布：



&#x20;   TASK-0010 = COMPLETE



AI Coding 完成後只能回報：



&#x20;   READY FOR HUMAN ACCEPTANCE



或：



&#x20;   NOT READY FOR HUMAN ACCEPTANCE



最終 Acceptance 由 Project Owner / Engineering Reviewer 決定。



\---



\# 28. Definition of Done（完成定義）



TASK-0010 只有在以下全部成立後，才能進入 Human Acceptance：



\- \[ ] Login Page Implementation = PASS

\- \[ ] Authentication Integration = PASS

\- \[ ] Session Verification = PASS

\- \[ ] Form Validation = PASS

\- \[ ] Login Failure Flow = PASS

\- \[ ] Login Success Flow = PASS

\- \[ ] Protected Route Verification = PASS

\- \[ ] Traditional Chinese UI = PASS

\- \[ ] English UI Scan = PASS

\- \[ ] Browser Verification = PASS

\- \[ ] Automated Tests = PASS

\- \[ ] Regression Tests = PASS

\- \[ ] Scope Compliance = PASS

\- \[ ] TASK-0009 preserved = PASS

\- \[ ] No Frozen Specification changes = PASS

\- \[ ] No TypeScript = PASS

\- \[ ] No Tailwind = PASS

\- \[ ] No Prisma = PASS



全部成立後：



&#x20;   TASK-0010 = READY FOR HUMAN ACCEPTANCE



\---



\# 29. Critical UI Acceptance Rule（關鍵 UI 驗收規則）



本條為 TASK-0010 的強制要求。



> \*\*AI Coding 不得只完成功能而忽略 UI 語言。\*\*



在 Browser Verification 時，必須實際確認畫面上使用者看到的是：



&#x20;   繁體中文



而不是：



&#x20;   English



尤其必須實際確認：



\- 頁面標題

\- 欄位標籤

\- Placeholder

\- 按鈕

\- Loading

\- Validation

\- Login Error

\- Authentication Error

\- 其他使用者可見訊息



均為繁體中文。



\*\*即使功能、API、測試全部 PASS，只要 Login Page 使用者可見 UI 仍出現不必要英文，TASK-0010 的 Traditional Chinese UI Acceptance 必須判定為 FAIL，不得回報 READY FOR HUMAN ACCEPTANCE。\*\*



\---



\# 30. Document Control（文件控制）



| Field | Value |

|---|---|

| Task ID | TASK-0010 |

| Task Name | 登入頁面 (Login Page) |

| Version | v1.0 |

| Status | CODING READY |

| Previous Task | TASK-0009 |

| Target Directory | `docs/` |

| Implementation | AI Coding |

| Review | Engineering Review |

| Acceptance | Project Owner |

| UI Language | Traditional Chinese (zh-TW) |

| Technical Language | JavaScript |

| UI Framework | Bootstrap |



\---



\# 31. Final Boundary（最終邊界）



TASK-0010 的完成定義：



&#x20;   Login Page

&#x20;       +

&#x20;   Existing Authentication Integration

&#x20;       +

&#x20;   Session Verification

&#x20;       +

&#x20;   Traditional Chinese UI

&#x20;       +

&#x20;   Browser Verification

&#x20;       +

&#x20;   Automated Testing

&#x20;       +

&#x20;   Regression Testing



即為本 Task 的完整範圍。



不得在 TASK-0010 內自行延伸未經決策的未來功能。



\---



\# 32. Document End（文件結束）



\*\*正式檔名：TASK-0010-登入頁面-Login-Page-v1.0.md\*\*



\*\*TASK-0010 Status: CODING READY\*\*



\*\*End of Document\*\*

