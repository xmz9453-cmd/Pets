\# TASK-0002 — 員工與身分驗證基礎 — Staff \& Authentication Foundation — v1.0



正式檔名：TASK-0002-員工與身分驗證基礎-Staff-and-Authentication-Foundation-v1.0.md



專案：MVP — 小型寵物美容／寵物住宿工作室營運系統



Task 編號：TASK-0002



版本：v1.0



狀態：FREEZE



前置 Task：TASK-0001 — 專案工程基礎 — MVP Engineering Foundation — v1.0



前置 Task 狀態：PASS



\---



\# 1. 文件目的



本文件定義 MVP 專案 TASK-0002 的正式工程範圍、資料模型、Authentication 行為、Frontend / Backend 邊界、測試要求、驗證要求與 Definition of Done。



TASK-0002 是 MVP 在 TASK-0001 工程基礎完成後的第一個 Staff / Authentication Foundation Task。



本 Task 的目的不是建立企業級帳號與權限平台，而是建立後續 MVP Business Blocks 可以可靠依賴的最小內部工作人員身分與 Authentication 基礎。



本文件依已完成之 TASK-0002 決策批次與 Freeze 結果建立，作為 Coding AI 後續實作的正式規格基準。



\---



\# 2. Task Freeze 狀態



| 項目 | 狀態 |

|---|---|

| Q1～Q10 | PASS |

| Q11～Q20 | PASS |

| Q21～Q30 | PASS |

| Q31～Q40 | PASS |

| Q41～Q50 | PASS |

| Decision \& Scope Review | PASS |

| Scope Review | PASS |

| Technical Baseline Review | PASS |

| Database Model Review | PASS |

| Authentication Review | PASS |

| Frontend Boundary Review | PASS |

| Testing Review | PASS |

| Definition of Done Review | PASS |

| Freeze Conflict | NONE |

| Scope Expansion | NONE |

| TASK-0001 Conflict | NONE |

| TASK-0002 | FREEZE |



TASK-0002 Freeze 後，Coding AI 不得自行重新定義本文件中的需求與工程邊界。



\---



\# 3. MVP 專案背景



本 Task 所屬專案為：



> 小型寵物美容／寵物住宿工作室營運系統 MVP



目標使用者為：



\- 1～3 人工作室

\- 2～8 人小型寵物店



MVP 核心營運流程：



Customer → Pet → Appointment → Today’s Work → Check-in → Grooming / Boarding → Service Completed → Order → Payment → Basic Operational Reporting



MVP 並非企業級 ERP，也不是大型 SaaS。



系統設計原則：



> 該寫的才寫。



應避免：



\- 過度抽象

\- Enterprise Architecture

\- 不必要 Infrastructure

\- 不必要 Framework

\- 不必要權限系統

\- 不必要 Business Scope



\---



\# 4. MVP Business Blocks



MVP 已 Freeze 的 13 個 Business Blocks：



| 編號 | Block |

|---|---|

| 01 | Staff / Auth |

| 02 | Shop Settings |

| 03 | Customer |

| 04 | Pet |

| 05 | Service |

| 06 | Appointment |

| 07 | Daily Operations |

| 08 | Grooming |

| 09 | Boarding |

| 10 | Order |

| 11 | Payment |

| 12 | Product |

| 13 | Report |



TASK-0002 對應：



> Block 01 — Staff / Auth



本 Task 不得自行實作其他 Business Block。



\---



\# 5. 前置條件



TASK-0002 開始前，TASK-0001 必須已完成並 PASS。



TASK-0001 已提供：



\- Git Foundation

\- Backend Foundation

\- Frontend Foundation

\- MySQL Foundation

\- mysql2

\- Environment Configuration

\- psop\_dev

\- psop\_test

\- Migration Foundation

\- Foundation Seed Foundation

\- Reset Safety

\- Database Health API

\- Jest

\- Supertest

\- Automated Regression

\- Frontend Webpack Production Build

\- Frontend Startup

\- Frontend → Backend 基礎連線



TASK-0002 不得重新實作 TASK-0001 已完成的工程基礎。



\---



\# 6. Technical Baseline



TASK-0002 必須遵循 MVP 已 Freeze 的 Technical Baseline。



\## 6.1 Frontend



\- Next.js

\- Pages Router

\- JavaScript

\- Bootstrap



禁止自行改用：



\- TypeScript

\- Next.js App Router

\- Tailwind CSS

\- 其他 Frontend Framework



\## 6.2 Backend



\- Express.js

\- JavaScript



\## 6.3 Database



\- MySQL

\- mysql2



\## 6.4 ORM



不使用 Prisma。



\## 6.5 Testing



\- Jest

\- Supertest



不得因 TASK-0002 引入新的 Testing Framework。



\---



\# 7. Task Objective



TASK-0002 必須建立以下能力：



1\. Staff 基礎資料。

2\. Owner / Front Desk / Groomer 三種 MVP Role。

3\. Staff Multi-Role。

4\. Username + Password Login。

5\. Password Hash。

6\. Staff ACTIVE / INACTIVE 狀態。

7\. Server-side Authentication Session。

8\. MySQL Session Storage。

9\. HttpOnly Cookie。

10\. 7 天 Session TTL。

11\. Login API。

12\. Logout API。

13\. Current Staff API。

14\. Authentication Middleware。

15\. 最小 Frontend Login Page。

16\. Frontend Login Flow。

17\. Frontend Logout Flow。

18\. Protected Page Authentication Boundary。

19\. Authentication Automated Tests。

20\. Frontend Startup Verification。

21\. Backend API Verification。

22\. Human Browser Verification。



\---



\# 8. Scope Definition



\## 8.1 In Scope



本 Task 包含：



\- Staff Foundation

\- Role Foundation

\- Staff / Role Relationship

\- Authentication

\- Authentication Session

\- Login

\- Logout

\- Current Staff Context

\- Authentication Middleware

\- 最小 Login UI

\- 最小 Logout Flow

\- Authentication Tests

\- Browser Verification



\## 8.2 Out of Scope



本 Task 不包含：



\- Customer

\- Pet

\- Service

\- Appointment

\- Daily Operations

\- Grooming

\- Boarding

\- Order

\- Payment

\- Product

\- Report



本 Task 不包含完整 Staff Management：



\- Staff List Management

\- 完整 Staff Create UI

\- 完整 Staff Update UI

\- Staff Profile Management

\- Staff Delete UI



本 Task 不包含完整 Authorization：



\- Permission Management

\- Permission Matrix

\- 完整 RBAC

\- Role Management UI

\- 自訂 Role

\- Permission CRUD



本 Task 不包含 Enterprise Authentication：



\- SSO

\- OAuth

\- OpenID Connect

\- LDAP

\- Active Directory

\- MFA

\- Customer Login

\- LINE Login

\- Email Login

\- SMS Login



本 Task 不包含 Password Recovery：



\- Forgot Password

\- Email Password Reset

\- SMS Password Reset

\- Password Recovery Workflow



\---



\# 9. Staff Model



\## 9.1 Staff 定義



Staff 代表使用 MVP 內部營運系統的店內工作人員。



MVP 固定三種 Staff Role：



\- Owner

\- Front Desk

\- Groomer



\## 9.2 Multi-Role



一名 Staff 可以同時擁有多個 Role。



例如：



Owner + Groomer



或：



Owner + Front Desk



不得將 Staff 限制為只能擁有單一 Role。



\---



\# 10. Staff Database Model



正式資料表：



staff



最小必要欄位：



| 欄位 | 說明 |

|---|---|

| id | Staff Identifier |

| username | Login Identifier |

| password\_hash | Password Hash |

| display\_name | 顯示名稱 |

| status | ACTIVE / INACTIVE |

| created\_at | 建立時間 |

| updated\_at | 更新時間 |



\## 10.1 Username



username 必須：



\- 唯一。

\- 由 Database Unique Constraint 保證唯一。

\- 作為 Login Identifier。



MVP 不使用 Email 作為 Login Identifier。



\## 10.2 Password



Database 不得保存明文 Password。



只能保存：



password\_hash



Password 不得：



\- 回傳至 Frontend。

\- 出現在 API Response。

\- 出現在 /api/auth/me。

\- 出現在 Log。

\- 出現在 Error Response。

\- 以明文寫入 Database。



Password Hash 必須使用適合 Password Storage 的單向雜湊方式。



\---



\# 11. Staff Status



Staff Status：



\- ACTIVE

\- INACTIVE



\## 11.1 ACTIVE



ACTIVE Staff：



\- 可以正常 Login。

\- 可以建立有效 Authentication Session。



\## 11.2 INACTIVE



INACTIVE Staff：



\- 不得建立新的 Authentication Session。

\- Login 必須被拒絕。

\- 不得透過 Login 自動重新啟用。



若既有有效 Session 對應的 Staff 被設為 INACTIVE，Authentication Middleware 必須視為該 Staff 已無效，不得繼續提供有效 Authentication Context。



\---



\# 12. Role Model



正式資料表：



roles



MVP Foundation Role：



\- OWNER

\- FRONT\_DESK

\- GROOMER



TASK-0002 不提供 Role Management UI。



Coding AI 不得自行新增未經 Freeze 的 Role。



\---



\# 13. Staff Role Relationship



正式關聯資料表：



staff\_roles



關係：



staff → staff\_roles → roles



用途：



\- 支援 Staff Multi-Role。

\- 保持 Staff 與 Role 的責任分離。

\- 為後續 Authorization 提供必要的基礎資料。



TASK-0002 不建立完整 Permission Matrix。



\---



\# 14. Authentication Architecture



TASK-0002 採用：



Server-side Session + MySQL + HttpOnly Cookie



不使用：



\- JWT 作為本 Task Session Architecture

\- LocalStorage Token

\- Redis

\- Memory-only Session

\- File-based Session



\---



\# 15. Authentication Session



正式資料表：



auth\_sessions



最小必要資訊至少包含：



| 欄位 | 說明 |

|---|---|

| id | Session Identifier |

| staff\_id | 對應 Staff |

| expires\_at | Session Expiration |

| created\_at | 建立時間 |



Session Token 不得以可直接使用的明文形式保存於 Database。



應保存安全的 Token Hash 或等效不可逆識別值。



\## 15.1 Session TTL



Session TTL：



7 days



Session 過期後不得視為有效 Authentication。



\## 15.2 Logout



Logout 必須立即使目前 Session 失效。



不得只等待 TTL 自動失效。



\---



\# 16. Authentication API



\## 16.1 Login



Endpoint：



POST /api/auth/login



責任：



1\. 接收 Username / Password。

2\. 驗證 Staff。

3\. 驗證 Password。

4\. 確認 Staff Status。

5\. 建立 Authentication Session。

6\. 設定 HttpOnly Cookie。

7\. 回傳非敏感的 Login Result。



不得回傳：



\- Password

\- Password Hash

\- Session Secret

\- Database Credential



\## 16.2 Login Failure



Login Failure 使用一般化錯誤訊息。



不得透過錯誤訊息洩漏：



\- Username 是否存在。

\- Password 是否正確。

\- Staff 是否存在。



例如：



Invalid username or password



實際 HTTP Status / Error Code 必須遵循既有 MVP API Convention。



\## 16.3 Logout



Endpoint：



POST /api/auth/logout



責任：



1\. 取得目前 Session。

2\. 使 Session 失效。

3\. 清除 Authentication Cookie。



\## 16.4 Current Staff



Endpoint：



GET /api/auth/me



用途：



取得目前登入 Staff 的非敏感 Authentication Context。



至少可包含：



\- id

\- username

\- display\_name

\- status

\- roles



不得包含：



\- password

\- password\_hash

\- Session Token

\- 任何 Authentication Secret



\## 16.5 未登入



需要 Authentication 的 Endpoint，在沒有有效 Session 時：



401 Unauthorized



不得自動建立 Guest Session。



\---



\# 17. Authentication Middleware



TASK-0002 必須建立可重用 Authentication Middleware。



Middleware 負責：



1\. 取得 Authentication Cookie。

2\. 驗證 Session。

3\. 確認 Session 未過期。

4\. 找到對應 Staff。

5\. 確認 Staff 狀態仍為 ACTIVE。

6\. 建立目前 Staff Context。

7\. 將 Staff Context 提供給後續 API。



Middleware 不負責：



\- 完整 Permission Matrix

\- Role Management

\- Business-specific Authorization

\- Enterprise RBAC



Authentication 與 Authorization 必須保持責任分離。



\---



\# 18. Frontend Login



\## 18.1 Login Route



固定：



/login



\## 18.2 Login Form



最小 Login Form：



\- Username

\- Password

\- Login Button



不包含：



\- Forgot Password

\- Remember Me

\- Email Login

\- SMS Login

\- Customer Login



\## 18.3 Login Success



成功流程：



Login → Authentication Session → Authenticated Staff Context → MVP 首頁



目前 MVP 首頁可使用既有首頁，不得因此新增其他 Business Block。



\## 18.4 Login Failure



Frontend 顯示一般化錯誤。



不得直接顯示：



\- Stack Trace

\- SQL Error

\- Database Error

\- Backend Internal Error

\- Username 是否存在等敏感 Authentication 資訊



\---



\# 19. Protected Route



未登入使用者進入需要 Authentication 的頁面：



Protected Page → No Valid Session → /login



已登入使用者進入：



/login



應導向 MVP 首頁。



不得因此建立複雜 Routing Framework。



\---



\# 20. Frontend Logout



Logout 流程：



Logout → POST /api/auth/logout → Server Session Invalidate → Frontend Auth State Clear → /login



Frontend 不得只清除 Client State 而忽略 Server-side Session。



\---



\# 21. Foundation Staff Seed



TASK-0002 可建立最小 Foundation Staff Seed，以支援實際 Authentication Verification。



原則：



\- 只建立最小必要 Foundation Staff。

\- 不建立大量測試 Staff。

\- 不建立 Customer / Pet / Service / Appointment 等 Business Seed Data。

\- 不建立其他 Business Block Seed Data。



至少可建立一個 Foundation Owner Account，以支援：



Login → Session → /api/auth/me → Logout



Development-only 初始 Credential 不得硬編碼為正式 Secret。



Credential 應透過既有 Environment / Configuration 機制提供。



\---



\# 22. Password Policy



MVP 最低 Password 長度：



8 characters



TASK-0002 不建立 Enterprise Password Policy。



不要求：



\- 強制特殊字元

\- 強制數字

\- 強制大小寫混合

\- 定期更換

\- Password History



\---



\# 23. Login Security Boundary



TASK-0002 不建立完整 Login Security Hardening Layer。



不包含：



\- 完整 Brute-force Protection

\- Redis-based Rate Limiting

\- Account Lockout System

\- Enterprise Intrusion Detection

\- Security Event Platform



Login Failure 必須正確處理，但不因本 Task 引入額外 Infrastructure。



\---



\# 24. Session Cookie



Authentication Cookie 必須：



\- 使用 HttpOnly。

\- 不將 Session Token 暴露給 JavaScript。

\- 配合現有 MVP 執行環境設定適當 Cookie 屬性。

\- 不得將 Session Secret 寫入 Frontend LocalStorage。



若既有環境允許，應依實際 Deployment Context 設定 Secure / SameSite 等必要 Cookie 屬性。



Coding AI 不得因本 Task 擅自建立完整 Cookie Security Framework。



\---



\# 25. API / Frontend Boundary



系統架構維持：



Next.js Frontend → Express.js API → mysql2 → MySQL



Frontend：



\- 不直接存取 MySQL。

\- 不直接處理 Password Hash。

\- 不直接管理 Server-side Session。

\- 不保存 Authentication Secret 至 LocalStorage。



Backend：



\- 負責 Authentication。

\- 負責 Session。

\- 負責 Staff Lookup。

\- 負責 Password Verification。

\- 負責 Authentication Context。



\---



\# 26. API Error Boundary



Authentication Failure 不得洩漏：



\- SQL Query

\- Database Error Detail

\- Stack Trace

\- Password

\- Password Hash

\- Session Token

\- Database Credential

\- Environment Secret



Development Log 可以保留必要的診斷資訊，但不得輸出 Secret。



\---



\# 27. Testing Requirements



TASK-0002 必須使用：



\- Jest

\- Supertest



不得引入新的 Testing Framework。



\## 27.1 Login Tests



至少涵蓋：



1\. 正確 Username + Password → Login Success。

2\. 錯誤 Password → Login Failure。

3\. 不存在 Username → Login Failure。

4\. INACTIVE Staff → Login Failure。

5\. Login Success 建立 Session。



\## 27.2 /api/auth/me Tests



至少涵蓋：



1\. 有效 Session → 回傳目前 Staff。

2\. 未登入 → 401 Unauthorized。

3\. 不回傳 Password。

4\. 不回傳 Password Hash。

5\. 回傳 Roles。



\## 27.3 Logout Tests



至少涵蓋：



1\. Logout Success。

2\. Logout 後 Session 失效。

3\. Logout 後再次呼叫受保護 API 不得視為已登入。



\## 27.4 Authentication Middleware Tests



至少涵蓋：



1\. Valid Session。

2\. Missing Session。

3\. Invalid Session。

4\. Expired Session。

5\. INACTIVE Staff。



\---



\# 28. Frontend Verification



TASK-0002 必須進行 Human Browser Verification。



至少確認：



1\. /login 可以正常開啟。

2\. Login Form 正常顯示。

3\. 正確帳密可以 Login。

4\. Login 後可以進入 MVP 首頁。

5\. Authenticated State 正常。

6\. /api/auth/me 能取得目前 Staff。

7\. Logout 可以正常執行。

8\. Logout 後回到 /login。

9\. Logout 後不能繼續使用需要 Authentication 的頁面。

10\. 錯誤帳密會顯示一般化錯誤。



Automated Tests PASS 不等同於 Human Browser Verification PASS。



\---



\# 29. Startup Verification



TASK-0002 必須確認：



\## Backend



Backend 可以正常啟動。



Authentication API 可以正常被呼叫。



\## Database



Staff / Role / Session 相關 Migration 可以正常執行。



\## Frontend



Production Build / Startup 必須使用目前已確認可工作的方式進行驗證。



不得因 TASK-0002 自行修改：



\- package.json

\- next.config.js



除非另有明確 Freeze 變更流程。



\---



\# 30. Turbopack / Webpack Boundary



TASK-0001 已確認：



\- Next.js Webpack Production Build：PASS。

\- npm.cmd run build 目前進入 Turbopack 並曾產生 EPERM。

\- 同一份 Frontend Source 以 Webpack Build 已完整成功。

\- TASK / PHASE Freeze 未明確指定 Turbopack 或 Webpack。



因此 TASK-0002：



1\. 不得把 Turbopack EPERM 自行解讀成 Source Code Bug。

2\. 不得為了修復該問題自行修改 Source Code。

3\. 不得自行修改 package.json Build Script。

4\. 不得自行修改 next.config.js。

5\. 不得因該問題擴張 TASK-0002 Scope。

6\. 如需重新決定正式 Build Tool，必須另行進行規格決策。



\---



\# 31. Database Migration Boundary



TASK-0002 若新增 Database Tables，必須使用既有 Migration Foundation。



預期涉及：



\- staff

\- roles

\- staff\_roles

\- auth\_sessions



Migration 必須：



\- 可追蹤。

\- 可重複驗證。

\- 不破壞既有 Migration。

\- 不修改既有 Migration History。

\- 不繞過 schema\_migrations。

\- 遵循 TASK-0001 建立的 Migration Convention。



不得直接人工修改 Production Schema 取代 Migration。



\---



\# 32. Database Reset Boundary



TASK-0002 必須遵循 TASK-0001 的 Reset Safety。



不得建立：



\- Production Destructive Reset

\- 無條件 DROP DATABASE

\- 無條件 DROP 所有 Table

\- 啟動時自動重建 Database



Development / Test Reset 必須遵循既有環境邊界。



\---



\# 33. Seed Boundary



TASK-0002 Seed 只能建立 Foundation Authentication 所需資料。



允許：



\- MVP Frozen Roles。

\- 最小 Foundation Owner Staff。

\- 必要的 Staff Role Relation。



禁止：



\- Customer Seed。

\- Pet Seed。

\- Service Seed。

\- Appointment Seed。

\- Grooming Seed。

\- Boarding Seed。

\- Order Seed。

\- Payment Seed。

\- Product Seed。

\- Report Seed。



\---



\# 34. Files / Code Boundary



Coding AI 可以建立 TASK-0002 實作所需的：



\- Migration Files

\- Seed Files

\- Backend Authentication Modules

\- Authentication Middleware

\- API Routes

\- Authentication Tests

\- Frontend Login Page

\- Frontend Authentication Flow

\- 必要的最小 UI / Utility Files



Coding AI 不得自行修改：



\- TASK-0002 Freeze 文件

\- PHASE Freeze 文件

\- MVP Master Baseline

\- 其他 Frozen Specification



除非另外取得明確授權。



\---



\# 35. Dependency Boundary



TASK-0002 不得因實作便利而任意新增外部 Dependency。



如果實作確實需要新的 Dependency：



1\. 必須先確認現有 MVP Technical Baseline 是否允許。

2\. 必須說明新增 Dependency 的必要性。

3\. 不得自行以 Enterprise Solution 取代簡單實作。

4\. 若涉及 Freeze Decision，必須 STOP 並回報。



\---



\# 36. Definition of Done



TASK-0002 只有在以下全部完成後才能宣告 PASS。



\## Database



\- \[ ] Staff Schema 完成。

\- \[ ] Roles Schema 完成。

\- \[ ] Staff / Role Relation 完成。

\- \[ ] Authentication Session Schema 完成。

\- \[ ] Migration PASS。

\- \[ ] Migration History 正常。

\- \[ ] Foundation Seed PASS。

\- \[ ] 無 Business Seed Expansion。



\## Backend



\- \[ ] Staff Authentication Foundation 完成。

\- \[ ] Password Hash 完成。

\- \[ ] ACTIVE / INACTIVE Boundary 完成。

\- \[ ] POST /api/auth/login 完成。

\- \[ ] POST /api/auth/logout 完成。

\- \[ ] GET /api/auth/me 完成。

\- \[ ] Authentication Middleware 完成。

\- \[ ] Server-side Session 完成。

\- \[ ] MySQL Session Storage 完成。

\- \[ ] HttpOnly Cookie 完成。

\- \[ ] 7-day Session TTL 完成。

\- \[ ] Password / Secret 不會被 API 回傳。

\- \[ ] Authentication Error 不洩漏敏感資訊。



\## Frontend



\- \[ ] /login 完成。

\- \[ ] Username / Password Form 完成。

\- \[ ] Login Flow 完成。

\- \[ ] Authentication State 完成。

\- \[ ] Protected Route Boundary 完成。

\- \[ ] Logout Flow 完成。

\- \[ ] Logout 後導向 /login。

\- \[ ] 已登入使用者訪問 /login 時導向 MVP 首頁。



\## Testing



\- \[ ] Login Success Test PASS。

\- \[ ] Login Failure Test PASS。

\- \[ ] Unknown Username Test PASS。

\- \[ ] Wrong Password Test PASS。

\- \[ ] Inactive Staff Test PASS。

\- \[ ] Session Test PASS。

\- \[ ] /api/auth/me Test PASS。

\- \[ ] Unauthenticated Test PASS。

\- \[ ] Logout Test PASS。

\- \[ ] Middleware Test PASS。

\- \[ ] Regression Tests PASS。



\## Verification



\- \[ ] Backend Startup PASS。

\- \[ ] Frontend Startup PASS。

\- \[ ] Authentication API Verification PASS。

\- \[ ] Frontend → Backend Authentication Flow PASS。

\- \[ ] Human Browser Verification PASS。



\## Scope / Freeze



\- \[ ] 無 TASK-0001 Conflict。

\- \[ ] 無 PHASE Freeze Conflict。

\- \[ ] 無 MVP Baseline Conflict。

\- \[ ] 未新增 Business Block。

\- \[ ] 未新增未核准 Enterprise Capability。

\- \[ ] 未自行修改 Frozen Documents。

\- \[ ] 未擴張 TASK Scope。



只有上述條件全部成立，TASK-0002 才可以標記：



PASS



\---



\# 37. Acceptance Criteria



TASK-0002 最終必須能證明：



Staff → Login → Password Verification → Authentication Session → HttpOnly Cookie → Authenticated Staff Context → Protected API / Page → Logout → Session Invalidated → /login



並且：



Invalid Login → Authentication Failure → No Valid Session



以及：



INACTIVE Staff → Login Rejected → No Valid Authentication Session



\---



\# 38. Non-Goals



TASK-0002 不以以下結果作為目標：



\- 建立完整 ERP Account System。

\- 建立 Enterprise RBAC。

\- 建立完整 Staff HR System。

\- 建立 Customer Account System。

\- 建立 Online Booking Authentication。

\- 建立 LINE Authentication。

\- 建立 SSO。

\- 建立 MFA。

\- 建立完整 Password Recovery。

\- 建立大型 Distributed Session Infrastructure。

\- 建立 Redis Infrastructure。

\- 建立完整 Security Platform。



\---



\# 39. Coding AI Execution Rules



Coding AI 執行本 TASK 時：



1\. 必須先檢查 Repository。

2\. 必須先確認 TASK-0001 現況。

3\. 必須確認目前 Database / Migration 狀態。

4\. 必須確認目前 Frontend / Backend 結構。

5\. 必須依本 TASK 實作。

6\. 不得自行重新設計本 TASK。

7\. 不得自行修改 Freeze Scope。

8\. 不得自行加入其他 Business Block。

9\. 不得使用 Prisma。

10\. 不得改用 TypeScript。

11\. 不得改用 Tailwind。

12\. 不得引入 Enterprise RBAC。

13\. 不得自行修改 package.json 的 Build Script。

14\. 不得自行修改 next.config.js 以處理 Turbopack EPERM。

15\. 不得修改 PHASE Freeze 文件。

16\. 不得修改 TASK-0002 Freeze 文件。

17\. 如果發現 Freeze Conflict，必須 STOP。

18\. 如果發現 Scope 不足以完成安全實作，必須 STOP 並回報。

19\. 如果需要新的 Freeze Decision，必須 STOP 並回報。

20\. 不得以猜測取代規格。



\---



\# 40. Coding AI 執行順序



建議執行順序：



Repository Inspection → Precondition Check → Scope Check → Implementation Plan → Database Migration → Foundation Seed → Password Hash / Staff Foundation → Role / Staff Role → Session Storage → Authentication Service → Authentication Middleware → Login API → Logout API → /api/auth/me → Automated Tests → Frontend Login → Frontend Auth Flow → Frontend Logout → Frontend Verification → Backend / API Verification → Regression Tests → Human Browser Verification → Final Acceptance Review → TASK-0002 PASS



\---



\# 41. STOP Conditions



Coding AI 遇到以下任何情況，必須 STOP，不得自行決策：



\- 發現 TASK-0001 與 TASK-0002 衝突。

\- 發現 PHASE Freeze 與 TASK-0002 衝突。

\- 發現 MVP Master Baseline 與 TASK-0002 衝突。

\- 必須修改 Frozen 文件才能完成。

\- 必須新增未定義 Business Block。

\- 必須加入完整 RBAC 才能繼續。

\- 必須引入 Prisma。

\- 必須改用 TypeScript。

\- 必須改用 Tailwind。

\- 必須引入 Redis 才能完成。

\- 必須修改正式 Build Script 才能完成。

\- 必須修改 next.config.js 才能完成。

\- 發現 Database Migration History 不一致。

\- 發現 psop\_dev / psop\_test Boundary 被破壞。

\- 發現 Production Reset Safety 被破壞。

\- 發現 Authentication Secret 可能被暴露。

\- 發現需要新的產品決策。



遇到 STOP Condition 時，不得自行 workaround 成為新的規格。



必須回報：



1\. 發現什麼。

2\. 為什麼與 Freeze 衝突。

3\. 需要哪一項決策。

4\. 停止於哪一個步驟。



\---



\# 42. Final Acceptance Review



TASK-0002 完成實作後，必須進行 Final Acceptance Review。



Review 必須至少確認：



\## Product Scope



\- Staff / Auth Scope 正確。

\- 無其他 Business Block。

\- 無 Enterprise Scope Expansion。



\## Database



\- Migration 正確。

\- Staff / Role / Session Relation 正確。

\- Seed Boundary 正確。

\- Development / Test Database Boundary 正確。



\## Backend



\- Login 正常。

\- Logout 正常。

\- /api/auth/me 正常。

\- Middleware 正常。

\- Session Expiration 正常。

\- INACTIVE Staff Boundary 正常。

\- Sensitive Information 不會洩漏。



\## Frontend



\- Login Page 正常。

\- Login Flow 正常。

\- Protected Flow 正常。

\- Logout Flow 正常。

\- Browser Flow 正常。



\## Testing



\- Automated Regression PASS。

\- Human Browser Verification PASS。



\## Freeze



\- 無 Scope Expansion。

\- 無 Freeze Conflict。

\- 無未核准技術變更。



\---



\# 43. Final Status Rules



TASK-0002 狀態只能依實際證據判定。



\## PASS



所有 Definition of Done 與 Acceptance Criteria 均完成並驗證。



\## BLOCKED



存在外部環境或前置條件阻礙，且不是目前 Task 本身的實作失敗。



\## FAIL



實作或驗證明確不符合 Freeze Specification。



\## PENDING HUMAN VERIFICATION



Automated / Technical Verification 已完成，但尚未完成必要的人工 Browser Verification。



不得在尚未完成必要驗證時自行宣告 PASS。



\---



\# 44. Freeze Declaration



TASK-0002 已於決策批次完成後進行 Decision \& Scope Review。



Review 結果：



| Review | Result |

|---|---|

| Scope Review | PASS |

| Technical Baseline Review | PASS |

| Database Model Review | PASS |

| Authentication Review | PASS |

| Frontend Boundary Review | PASS |

| Testing Review | PASS |

| Definition of Done Review | PASS |

| Freeze Conflict | NONE |

| Scope Expansion | NONE |

| TASK-0001 Conflict | NONE |



因此：



> TASK-0002 — 員工與身分驗證基礎 — Staff \& Authentication Foundation — v1.0 正式 FREEZE。



本文件為 Coding AI 後續實作 TASK-0002 的正式規格基準。



任何與本文件不一致的實作需求，都必須經過新的明確決策與 Freeze 流程後才能執行。



\---



\# 45. 文件結束



TASK-0002 — 員工與身分驗證基礎 — Staff \& Authentication Foundation — v1.0



STATUS: FREEZE

