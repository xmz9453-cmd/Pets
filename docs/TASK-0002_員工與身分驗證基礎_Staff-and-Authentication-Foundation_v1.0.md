\# TASK-0002 員工與身分驗證基礎 — Staff and Authentication Foundation



\*\*文件類型：\*\* TASK Freeze Baseline

\*\*Task 編號：\*\* TASK-0002

\*\*版本：\*\* v1.0

\*\*狀態：\*\* FREEZE / PASS

\*\*專案：\*\* PSOP MVP（Pet Shop Operations System）

\*\*Freeze 目的：\*\* 記錄 TASK-0002 已完成且經驗證之正式工程 Baseline



\---



\## 1. Task 定義



\### 1.1 Task 名稱



員工與身分驗證基礎 — Staff and Authentication Foundation



\### 1.2 Task 目的



建立 PSOP MVP 的 Staff 與 Authentication Foundation，使系統具備最小可用的：



\* Staff 基礎資料

\* Role 基礎

\* Authentication

\* Server-side Session

\* Authentication Cookie

\* Login

\* Logout

\* Current User 查詢

\* Authentication Middleware

\* Frontend Login Flow

\* Protected Home Boundary



本 Task 建立後，後續業務 TASK 可在既有 Authentication Foundation 上進行受保護的功能開發。



\---



\## 2. Freeze Scope



TASK-0002 Freeze Baseline 所涵蓋之功能如下：



\### 2.1 Staff Foundation



建立 Staff 基礎資料模型與相關工程結構。



\### 2.2 Role Foundation



建立 MVP Foundation Roles：



\* `OWNER`

\* `FRONT\_DESK`

\* `GROOMER`



\### 2.3 Authentication



建立基本登入驗證流程。



\### 2.4 Session



採用 Server-side MySQL Session。



Session 透過 HttpOnly Cookie 與 Client 建立 Authentication Boundary。



\### 2.5 Login



提供 Login API 與 Frontend Login Flow。



\### 2.6 Logout



提供 Logout API 與 Frontend Logout Flow。



\### 2.7 Current User



提供：



```text id="2i6y5r"

GET /api/auth/me

```



用於取得目前已驗證使用者的基本身分資訊。



\### 2.8 Authentication Middleware



建立 Authentication Middleware，限制需要登入的 API / Application Boundary。



\### 2.9 Protected Home Boundary



Frontend Home Boundary 受 Authentication 狀態保護。



未登入使用者不得直接進入受保護 Home。



\### 2.10 Login Redirect



已驗證使用者進入 `/login` 時，會重新導向 MVP Home。



\---



\## 3. Database Baseline



TASK-0002 已建立 Staff / Role / Authentication Session 所需 Database Foundation。



主要資料表：



\* `staff`

\* `roles`

\* `staff\_roles`

\* `auth\_sessions`



\### 3.1 Staff



`staff` 用於保存 MVP Staff 基礎資料。



\### 3.2 Roles



`roles` 用於保存系統角色基礎資料。



\### 3.3 Staff Roles



`staff\_roles` 用於建立 Staff 與 Role 之間的關聯。



\### 3.4 Auth Sessions



`auth\_sessions` 用於保存 Server-side Authentication Session。



\---



\## 4. Foundation Roles



TASK-0002 已建立以下 MVP Foundation Roles：



| Role       | 定義    |

| ---------- | ----- |

| OWNER      | 店家負責人 |

| FRONT\_DESK | 櫃台    |

| GROOMER    | 美容師   |



本 Task 僅建立 Role Foundation。



不在本 Task 擴張 Enterprise RBAC、Permission Matrix 或其他未經批准的權限架構。



\---



\## 5. Authentication Architecture



TASK-0002 採用 Server-side Session Authentication。



基本流程：



```text

Frontend Login

→ Backend Authentication

→ MySQL Session Creation

→ HttpOnly Cookie

→ Authenticated Request

→ Session Validation

→ Authenticated User

```



Session 狀態儲存在 MySQL。



Authentication Cookie 不直接保存使用者密碼或敏感認證資料。



\---



\## 6. Session Baseline



Session：



\* Server-side MySQL Session

\* HttpOnly Cookie

\* 7-day TTL



Session 的目的為：



\* 維持登入狀態

\* 提供 Backend Authentication Boundary

\* 由 Server 驗證目前登入狀態

\* 避免將 Session 狀態直接暴露於 Client-side JavaScript



\---



\## 7. Authentication API



TASK-0002 已完成 Authentication API。



\### 7.1 Login



提供 Login API，用於：



\* 驗證 Staff 身分

\* 建立 Authentication Session

\* 設定 HttpOnly Authentication Cookie



\### 7.2 Logout



提供 Logout API，用於：



\* 結束目前 Authentication Session

\* 清除登入狀態



\### 7.3 Current User



```text id="3l2jqj"

GET /api/auth/me

```



用途：



\* 驗證目前登入狀態

\* 取得目前已登入 Staff 的必要身分資訊



\### 7.4 Authentication Middleware



Backend 已建立 Authentication Middleware。



用途：



\* 驗證 Request 是否具有有效 Session

\* 阻擋未驗證 Request

\* 將已驗證使用者身分提供給後續受保護流程



\---



\## 8. Authentication Security Baseline



TASK-0002 已完成以下安全相關驗證：



\* HttpOnly Cookie：PASS

\* 7-day TTL：PASS

\* Sensitive password/hash not returned：PASS

\* Auth error uniformity：PASS



Authentication Foundation 不將敏感 password/hash 資訊回傳至 Frontend。



\---



\## 9. Frontend Authentication



TASK-0002 已完成 Frontend Authentication Flow。



\### 9.1 Login Page



已建立 Frontend Login Page。



\### 9.2 Login Flow



Frontend 可：



1\. 提交登入資訊

2\. 呼叫 Backend Login API

3\. 建立 Authentication Session

4\. 進入受保護 MVP Home



\### 9.3 Protected Home



未登入狀態無法直接使用受保護 Home Boundary。



\### 9.4 Logout Flow



Frontend 可執行 Logout，並結束目前登入狀態。



\### 9.5 Authenticated Login Redirect



已登入使用者再次訪問 `/login` 時：



```text id="h2v6kx"

Authenticated User

→ /login

→ MVP Home

```



結果：



\*\*PASS\*\*



\---



\## 10. Database Verification



TASK-0002 已完成 Database Verification。



驗證項目：



\* Database schema：PASS

\* Migration：PASS

\* Foundation seed：PASS

\* Staff / Role / Session relation：PASS



\---



\## 11. Backend Verification



TASK-0002 已完成 Backend Authentication Verification。



驗證項目：



\* Login API：PASS

\* Logout API：PASS

\* `/api/auth/me`：PASS

\* Middleware：PASS

\* Session storage：PASS

\* HttpOnly cookie：PASS

\* 7-day TTL：PASS

\* Sensitive password/hash not returned：PASS

\* Auth error uniformity：PASS



\---



\## 12. Frontend Verification



TASK-0002 已完成 Frontend Authentication Verification。



驗證項目：



\* Frontend login：PASS

\* Login flow：PASS

\* Protected home：PASS

\* Logout：PASS

\* Authenticated `/login` redirect：PASS

\* Frontend Webpack build：PASS

\* Frontend production startup：PASS

\* Human browser verification：PASS

\* Frontend → Backend auth flow：PASS



\---



\## 13. Automated Testing



TASK-0002 已完成 Authentication Foundation Automated Testing。



測試結果：



\*\*3 suites / 17 tests — PASS\*\*



測試結果作為 TASK-0002 最終自動化測試 Baseline。



\---



\## 14. End-to-End Verification



TASK-0002 已完成 Frontend → Backend Authentication Flow 驗證。



主要流程：



```text id="v0m1g8"

Browser

→ Frontend Login

→ Backend Authentication

→ MySQL Session

→ HttpOnly Cookie

→ Protected Request

→ Authenticated User

```



結果：



\*\*PASS\*\*



\---



\## 15. Definition of Done



TASK-0002 已完成下列項目：



\* \[x] Staff foundation

\* \[x] Role foundation

\* \[x] Authentication

\* \[x] MySQL session storage

\* \[x] HttpOnly authentication cookie

\* \[x] Login API

\* \[x] Logout API

\* \[x] `/api/auth/me`

\* \[x] Authentication middleware

\* \[x] Frontend login page

\* \[x] Login flow

\* \[x] Protected home boundary

\* \[x] Logout flow

\* \[x] Authenticated user visiting `/login` redirects to MVP home

\* \[x] Authentication automated tests

\* \[x] Database verification

\* \[x] Backend verification

\* \[x] Frontend verification

\* \[x] Human browser verification

\* \[x] Frontend → Backend authentication flow



Definition of Done：



\*\*PASS\*\*



\---



\## 16. Scope Verification



TASK-0002 僅完成 Staff 與 Authentication Foundation。



本 Task 不擴張至：



\* Enterprise RBAC

\* SSO

\* MFA

\* Permission Management System

\* Customer Authentication

\* Pet Owner Portal

\* Online Booking Authentication

\* LINE Authentication

\* 其他未經批准的 Authentication Provider



Scope Verification：



\*\*PASS\*\*



\---



\## 17. Git Baseline



TASK-0002 完成後已建立正式 Git Commit。



\*\*Commit：\*\*



```text id="m7t9gz"

ed71d2b6e4cf0bc829f752efc44f5d768dba832c

```



\*\*Branch：\*\*



```text id="f4xj8b"

master

```



此 Commit 作為 TASK-0002 完成狀態之 Repository 歷史參考點。



\---



\## 18. Completion Review



TASK-0002 已完成 Completion Review。



最終結果：



\*\*PASS\*\*



已確認：



\* Scope：符合

\* Definition of Done：符合

\* Database：完成

\* Backend：完成

\* Frontend：完成

\* Authentication：完成

\* Session：完成

\* Automated Testing：完成

\* Browser Verification：完成

\* End-to-End Authentication Flow：完成



\---



\## 19. Freeze Decision



TASK-0002 已完成：



\* Implementation

\* Database Verification

\* Backend Verification

\* Frontend Verification

\* Automated Testing

\* Human Browser Verification

\* Frontend → Backend Authentication Flow Verification

\* Completion Review

\* Scope Verification

\* Definition of Done Verification



最終狀態：



\*\*PASS\*\*



因此 TASK-0002 正式進入：



\*\*FREEZE\*\*



\---



\## 20. Freeze Baseline



本文件記錄 TASK-0002 完成後之 Staff / Authentication Foundation 狀態，作為後續 TASK 的正式歷史 Baseline。



後續 TASK：



1\. 不得自行推翻已 Freeze 的 Staff / Authentication Foundation。

2\. 不得自行更換既定 Authentication Architecture。

3\. 不得自行擴張本 Task Scope。

4\. 若後續 Task 與本 Baseline 發生 Specification、Architecture、Technology 或 Scope Conflict，必須依 PSOP Task Stop Condition 處理。



本文件不是新的 Coding Task Specification。



\---



\## 21. Repository / Source Status



TASK-0002 已完成並經實際 Verification。



後續 TASK 應以：



1\. 已 Freeze PSOP 文件

2\. TASK-0001 Freeze Baseline

3\. TASK-0002 Freeze Baseline

4\. 對應 Task Specification

5\. Repository 實際狀態



作為工程判斷依據。



不得假設 Repository 為空白專案。



\---



\## 22. Completion Status



\*\*Task：\*\* TASK-0002

\*\*名稱：\*\* 員工與身分驗證基礎 — Staff and Authentication Foundation

\*\*Version：\*\* v1.0

\*\*Status：\*\* PASS

\*\*Freeze：\*\* YES



TASK-0002 正式完成並 Freeze。



\---



\## 23. Document Identity



\*\*正式檔名：\*\*



`TASK-0002\_員工與身分驗證基礎\_Staff-and-Authentication-Foundation\_v1.0.md`



\*\*保存位置：\*\*



`D:\\MVP\\docs\\`



\*\*文件性質：\*\*



Task Completion Freeze Baseline



\*\*用途：\*\*



作為 TASK-0002 完成後之正式 Staff / Authentication 工程基準，供後續 PSOP MVP TASK 開發、Verification 與 Freeze 判斷使用。



