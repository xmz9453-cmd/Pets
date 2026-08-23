\# TASK-0012 Boarding 住宿執行 Boarding Execution v1.0



\## 1. Document Information



| Field | Value |

|---|---|

| Task ID | TASK-0012 |

| 中文名稱 | Boarding 住宿執行 |

| English Name | Boarding Execution |

| Version | v1.0 |

| Formal Filename | TASK-0012 Boarding 住宿執行 Boarding Execution v1.0.md |

| Status | READY FOR AI CODING |

| Decision Status | COMPLETE |

| Decision Coverage | Q01–Q120 |

| Decision Result | Q01–Q120 全部採用 AI 推薦答案 A |

| Primary Block | Block 09 — Boarding |

| Integration Block | Block 07 — Daily Operations |

| Previous Task | TASK-0011 Grooming 美容執行 |

| UI Baseline | Traditional Chinese UI Localization Baseline v1.0.md |

| AI Coding Execution Standard | TASK-CODING-AI-EXECUTION-PROMPT-v1.0.md |



\---



\## 2. Task Objective



TASK-0012 的目的，是在既有 MVP 架構與已 Freeze 的工程邊界下，建立小型寵物美容／寵物住宿工作室所需的最小必要 Boarding Execution 能力。



本 TASK 負責：



\- 建立一次實際住宿服務的執行資料

\- 提供 Boarding 執行生命週期

\- 將 Boarding Execution 整合至 Daily Operations

\- 提供必要的住宿執行資料輸入與查看

\- 保存實際入住與實際退房資訊

\- 提供必要的住宿執行備註／紀錄

\- 驗證合法狀態轉換

\- 保留必要的歷史住宿資料

\- 完成 API、UI、Database、Testing、Browser E2E 與 Regression



核心原則：



> 該寫的才寫。



> 最小必要架構、最少必要程式碼、避免過度工程化。



本 TASK 不建立企業級住宿管理系統。



\---



\## 3. Project Baseline



\### 3.1 Product Positioning



本專案為：



> 小型寵物美容／寵物住宿工作室 MVP。



目標使用者為小型店家內部營運人員，不以 Enterprise ERP、Enterprise SaaS 或大型多租戶系統為目標。



\---



\### 3.2 Core Operational Flow



Customer

→ Pet

→ Appointment

→ Daily Operations

→ Check-in

→ Grooming / Boarding

→ Service Completed

→ Order

→ Payment

→ Basic Report



TASK-0012 僅負責其中 Boarding 的實際執行部分。



\---



\### 3.3 MVP Blocks



目前 MVP 共 13 個 Block：



1\. Staff / Auth

2\. Shop Settings

3\. Customer

4\. Pet

5\. Service

6\. Appointment

7\. Daily Operations

8\. Grooming

9\. Boarding

10\. Order

11\. Payment

12\. Product

13\. Report



TASK-0012 的主要責任範圍為：



> Block 09 — Boarding



必要 Integration：



> Block 07 — Daily Operations



不得因 TASK-0012 重新定義其他已 Freeze Block。



\---



\## 4. Technical Baseline



\### 4.1 Frontend



\- Next.js

\- Pages Router

\- JavaScript

\- Bootstrap

\- Responsive Web UI

\- 不使用 TypeScript

\- 不使用 Tailwind



\---



\### 4.2 Backend



\- Express.js

\- JavaScript



\---



\### 4.3 Database



\- MySQL

\- mysql2

\- 不使用 Prisma



\---



\### 4.4 Testing



\- Jest

\- Supertest

\- Browser E2E

\- Full Regression



\---



\### 4.5 Architecture



&#x20;   Next.js Frontend

&#x20;          ↓

&#x20;   Express.js API

&#x20;          ↓

&#x20;   mysql2

&#x20;          ↓

&#x20;   MySQL



TASK-0012 不得因 Boarding 功能而新增另一套架構。



\---



\## 5. Previous Task Dependency



TASK-0011「Grooming 美容執行 — Grooming Execution」已完成。



TASK-0011 已通過：



\- Grooming Browser E2E

\- Traditional Chinese UI

\- Daily Operations Integration

\- Grooming targeted tests

\- Full regression

\- 11 test suites passed

\- 55 tests passed

\- 0 failed

\- 未登入 API 保護 401



TASK-0012 不得重新討論、重新定義或破壞 TASK-0011 已 Freeze 的 Scope。



TASK-0012 應沿用 TASK-0011 已建立的工程模式，在必要範圍內建立 Boarding Execution。



\---



\# 6. TASK-0012 Scope



\## 6.1 Core Scope



TASK-0012 建立：



> Boarding Execution Record。



Boarding Execution 代表：



> 一次實際發生的住宿服務執行。



核心流程：



&#x20;   Daily Operations

&#x20;         ↓

&#x20;   Boarding Execution

&#x20;         ↓

&#x20;   待入住

&#x20;         ↓

&#x20;   入住

&#x20;         ↓

&#x20;   住宿中

&#x20;         ↓

&#x20;   必要住宿執行紀錄

&#x20;         ↓

&#x20;   退房

&#x20;         ↓

&#x20;   Completed

&#x20;         ↓

&#x20;   Daily Operations 更新



\---



\## 6.2 Appointment Relationship



Appointment 的責任是：



> 預約。



Boarding Execution 的責任是：



> 實際住宿服務執行。



兩者不得混為同一個概念。



若 Boarding 由 Appointment 產生：



\- Boarding Execution 必須保留 Appointment 關聯。

\- 可以帶入必要的預計入住資訊。

\- 可以帶入必要的預計退房資訊。

\- 實際入住時間由 Boarding Execution 保存。

\- 實際退房時間由 Boarding Execution 保存。

\- Appointment 的預計時間不得覆蓋實際執行時間。



\---



\## 6.3 Walk-in Boarding



MVP 允許 Walk-in Boarding。



若 Customer 沒有既有 Appointment，但直接到店要求住宿：



\- 可以建立 Boarding Execution。

\- 必須關聯既有 Customer。

\- 必須關聯既有 Pet。

\- 不建立虛構 Appointment。

\- 不建立第二套 Customer Master。

\- 不建立第二套 Pet Master。



\---



\## 6.4 One Appointment to One Execution



一般情況下：



> 一個 Boarding Appointment 對應一次實際 Boarding Execution。



不建立無限制的 Execution Split 機制。



若未來需要拆分、延伸或建立更複雜住宿 Session：



> 列為 Future Enhancement，不屬於 TASK-0012。



\---



\## 6.5 New Boarding Creates New Execution



同一 Pet 未來再次住宿時：



> 建立新的 Boarding Execution。



不得：



\- 重新開啟舊 Boarding

\- 修改舊 Boarding 日期來代表新住宿

\- 覆蓋舊 Boarding

\- 刪除舊 Boarding 後重建

\- 將舊 Completed Record 轉換成新的住宿



已完成住宿資料必須保留必要歷史紀錄。



\---



\# 7. Boarding Lifecycle



\## 7.1 Status Model



MVP Boarding Execution 採用最小必要生命週期：



&#x20;   待入住

&#x20;      ↓

&#x20;   住宿中

&#x20;      ↓

&#x20;   已完成



對應系統實際狀態值應依 Repository 現有命名慣例與既有 Schema 決定，但不得增加不必要的狀態。



\---



\## 7.2 Valid Transitions



合法狀態轉換：



&#x20;   待入住 → 住宿中

&#x20;   住宿中 → 已完成



\---



\## 7.3 Invalid Transitions



以下狀態轉換必須被 Backend 阻止：



&#x20;   待入住 → 已完成

&#x20;   已完成 → 住宿中

&#x20;   已完成 → 待入住

&#x20;   已完成 → 已完成



Frontend 不得成為唯一的狀態限制來源。



Backend 必須執行 Business Rule Validation。



\---



\## 7.4 Check-in



Boarding Check-in 代表：



> Staff 確認 Pet 實際進入住宿服務。



Check-in 必須：



\- 驗證 Boarding Execution 存在

\- 驗證目前狀態允許入住

\- 寫入實際入住時間

\- 將狀態轉為住宿中

\- 保留必要的既有資料



實際入住時間由 Server 產生與保存。



不得單純以 Appointment 預約時間當作實際入住時間。



\---



\## 7.5 Check-out



Boarding Check-out 代表：



> Staff 確認住宿服務實際完成。



Check-out 必須：



\- 驗證 Boarding Execution 存在

\- 驗證目前狀態為住宿中

\- 寫入實際退房時間

\- 將狀態轉為已完成

\- 更新 Daily Operations 所需狀態



不得在 Staff 未執行退房時自動完成住宿。



\---



\## 7.6 No Automatic Scheduler



TASK-0012 不建立：



\- Cron-based automatic completion

\- Background Scheduler

\- Browser-based automatic status transition

\- 預約時間到達後自動入住

\- 預約退房時間到達後自動完成



原因：



> 預約時間不等於實際營運事件。



MVP 狀態必須由 Staff 的實際營運操作確認。



\---



\# 8. Actual Time Rules



\## 8.1 Actual Check-in Time



實際入住時間代表 Staff 真正執行入住的時間。



因此：



\- 可以早於預計入住時間。

\- 可以晚於預計入住時間。

\- 不得被 Appointment 預計時間強制覆蓋。

\- 應由 Server 產生正式時間。

\- Reload 後資料必須保持。



\---



\## 8.2 Actual Check-out Time



實際退房時間代表 Staff 真正執行退房的時間。



因此：



\- 可以早於預計退房時間。

\- 可以晚於預計退房時間。

\- 必須保存實際時間。

\- 不得因預計退房時間自動產生 Completed。



TASK-0012 不負責：



\- 延遲費計算

\- 加價計算

\- Order 計算

\- Payment 計算



\---



\# 9. Boarding Execution Data Requirements



Boarding Execution 至少必須能正確保存或取得：



\- Boarding Execution ID

\- Customer 關聯

\- Pet 關聯

\- Service 關聯

\- Appointment 關聯（若來源為 Appointment）

\- 預計入住資訊（若適用）

\- 預計退房資訊（若適用）

\- 實際入住時間

\- 實際退房時間

\- Boarding Status

\- 必要住宿執行紀錄

\- 必要住宿備註

\- 建立時間

\- 更新時間



實際 Database 欄位名稱、資料型別與既有資料表關係：



> 必須依 Repository 現有 Schema 與既有工程模式實際確認。



不得因本 TASK 建立與既有資料模型重複的 Customer、Pet、Appointment 或 Service Master。



\---



\# 10. Customer / Pet Integrity



Boarding Execution 必須正確關聯：



&#x20;   Customer

&#x20;      ↓

&#x20;   Pet

&#x20;      ↓

&#x20;   Boarding Execution



Backend 必須驗證：



\- Customer 存在

\- Pet 存在

\- Customer / Pet 關聯有效

\- Service 存在

\- Service 關聯有效

\- Appointment 存在（若提供）

\- Appointment 關聯有效（若提供）



不得接受不存在的 Customer ID。



不得接受不存在的 Pet ID。



不得接受 Customer 與 Pet 不相符的關聯。



不得接受無效 Appointment 關聯。



\---



\# 11. Active Boarding Conflict



同一 Pet 不應同時存在互相衝突的 Active Boarding。



如果該 Pet 已存在：



> 住宿中



的 Boarding Execution：



Backend 必須阻止建立另一筆互相衝突的 Active Boarding。



本規則只處理必要的 Business Rule。



不建立：



\- 完整房間排程

\- 籠位排程

\- 房間容量引擎

\- Resource Allocation Engine

\- 排程最佳化



\---



\# 12. Boarding Execution Records



Boarding Execution 應保存 MVP 必要住宿執行資料。



可依既有 UI / Database 模式提供必要的：



\- 住宿前狀況

\- 住宿執行內容

\- 住宿結果

\- 住宿備註



實際欄位與 UI 組成必須以既有 Repository 結構與 TASK-0012 已確認 Scope 為準。



不得因此建立完整每日照護平台。



\---



\# 13. Daily Operations Integration



Boarding 必須成為 Daily Operations 中可辨識的當日工作項目。



Daily Operations 必須能：



\- 找到符合條件的 Boarding 工作

\- 顯示必要 Customer 資訊

\- 顯示必要 Pet 資訊

\- 顯示必要 Service 資訊

\- 顯示 Boarding 狀態

\- 進入 Boarding Execution

\- 顯示目前執行狀態

\- 在完成後反映 Completed 狀態



TASK-0012 不重新設計 Daily Operations。



只加入 Boarding 所必要的 Integration。



\---



\# 14. Daily Operations Status Synchronization



Boarding Execution 狀態變更後：



> Daily Operations 必須反映正確的工作狀態。



至少應驗證：



&#x20;   Boarding 待入住

&#x20;       ↓

&#x20;   Daily Operations 顯示待處理



&#x20;   Boarding 住宿中

&#x20;       ↓

&#x20;   Daily Operations 顯示執行中



&#x20;   Boarding 已完成

&#x20;       ↓

&#x20;   Daily Operations 顯示已完成



不得出現：



\- Boarding 已完成但 Daily Operations 仍顯示執行中

\- Boarding 尚未入住但 Daily Operations 顯示完成

\- Frontend 與 Backend 狀態不一致



\---



\# 15. UI Requirements



\## 15.1 UI Language



TASK-0012 所有新增或修改 UI：



> 必須遵守 Traditional Chinese UI Localization Baseline v1.0.md。



UI 必須使用繁體中文。



不得新增不必要的英文使用者介面文字。



技術名稱、API 名稱或程式碼識別名稱可以保留於工程內容，但不應直接作為一般使用者操作文字。



\---



\## 15.2 Boarding Entry



Daily Operations 應提供進入 Boarding Execution 的操作入口。



操作入口必須與既有 Grooming Execution 的 UX 模式保持一致，但不得複製不必要的 Grooming-specific 行為。



\---



\## 15.3 Read-only Information



Boarding Execution 頁面應顯示必要的既有 Master / Appointment 資料，例如：



\- Customer

\- Pet

\- Service

\- Appointment 預約資訊（若適用）



這些資料若屬來源資料：



> 應以唯讀方式呈現。



不得在 Boarding Execution 頁面任意修改 Customer、Pet 或 Appointment Master 資料。



\---



\## 15.4 Execution Fields



Boarding Execution 頁面應提供必要的住宿執行資料輸入區域。



使用者只能編輯屬於 Boarding Execution 的欄位。



不得讓使用者透過 UI 直接修改：



\- Customer Master

\- Pet Master

\- Appointment Master

\- 不允許的狀態



\---



\## 15.5 Lifecycle Actions



依目前狀態提供必要操作：



\### 待入住



允許：



\- 查看 Boarding

\- 執行入住



\### 住宿中



允許：



\- 查看 Boarding

\- 編輯必要執行資料

\- 執行退房



\### 已完成



允許：



\- 查看歷史資料



不允許：



\- 重新入住

\- 修改成新的 Active Boarding

\- 再次完成

\- 重新開啟舊住宿



\---



\## 15.6 Success State



成功執行：



\- 儲存

\- 入住

\- 退房



後，UI 必須提供清楚的成功狀態。



Reload 後：



> 資料必須仍然存在。



\---



\## 15.7 Error State



UI 必須處理至少：



\- 不存在的 Boarding

\- 無效狀態轉換

\- 無效 Customer / Pet 關聯

\- 無效資料

\- 未授權操作

\- API 錯誤

\- 儲存失敗



錯誤訊息必須符合既有 UI Localization Baseline。



不得讓錯誤直接以未處理的 raw exception 顯示給使用者。



\---



\# 16. API Requirements



TASK-0012 API 必須依 Repository 現有 API 架構與命名慣例實作。



API 必須支援 TASK-0012 所需的最小能力：



\- 取得 Boarding Execution

\- 建立 Boarding Execution（適用情境）

\- 更新必要 Boarding Execution 資料

\- 執行 Check-in

\- 執行 Check-out

\- 必要的 Daily Operations integration data



實際 endpoint path 必須依 Repository 現有 route 結構與既有命名慣例決定。



不得建立另一套 API architecture。



\---



\# 17. API Authorization



Boarding API 必須受到既有 Staff / Auth 保護。



未登入請求：



> 必須被拒絕。



不得讓未登入使用者：



\- 建立 Boarding

\- 修改 Boarding

\- Check-in

\- Check-out

\- 取得受保護的 Boarding 資料



Authorization 必須沿用既有 MVP Staff / Auth 機制。



不得因 TASK-0012 建立 Enterprise RBAC。



\---



\# 18. API Validation



Backend 必須驗證：



\- Required fields

\- ID validity

\- Customer existence

\- Pet existence

\- Customer / Pet relationship

\- Service existence

\- Appointment relationship

\- Status transition

\- Active Boarding conflict

\- Data type / format

\- 不允許的狀態修改



Client-side validation 不得取代 Server-side validation。



\---



\# 19. Error Handling



API 發生錯誤時：



\- 使用既有 HTTP status convention

\- 回傳可理解的 error response

\- 不洩漏 stack trace

\- 不洩漏 Database internals

\- 不允許 invalid state transition 成功

\- 不允許 invalid foreign-key relationship 成功



錯誤處理必須與既有 Backend pattern 一致。



\---



\# 20. Database Requirements



\## 20.1 Schema



如果現有 Repository 尚未具備 Boarding 所需 Schema：



> 建立最小必要 Boarding Schema。



如果 Repository 已存在可重用且符合 Scope 的 Boarding 結構：



> 優先沿用。



不得建立重複資料模型。



\---



\## 20.2 Relationships



Boarding Execution 必須建立必要的關聯：



\- Customer

\- Pet

\- Service

\- Appointment（若適用）



實際 Foreign Key 設計必須遵循現有 Database Baseline。



\---



\## 20.3 Data Integrity



Database 必須盡可能保護：



\- Required fields

\- Foreign key integrity

\- Status validity

\- Unique / conflict constraints（若適用）



Business Rule 不得只依賴 Frontend。



\---



\## 20.4 Migration



若需要 Schema Migration：



\- Migration 必須可重複執行或符合既有 Migration convention

\- 不得破壞既有資料

\- 不得任意 DROP 已 Freeze 功能資料

\- 必須確認既有測試與既有資料相容



\---



\# 21. Transaction Requirements



如果單一操作會造成多個相關資料變更：



> 必須依既有 Database transaction pattern 確保資料一致性。



例如 Boarding Check-out 若同時：



\- 更新 Boarding 狀態

\- 寫入實際退房時間

\- 更新 Daily Operations 所需資料



則不得產生部分成功、部分失敗而導致不一致的狀態。



不需要為所有單一 CRUD 操作建立不必要的 transaction abstraction。



\---



\# 22. Boarding Cancellation Boundary



如果 Appointment 尚未實際入住而被取消：



> 依既有 Appointment / Daily Operations Cancellation 邊界處理。



TASK-0012 不建立第二套完整 Cancellation Workflow。



不得：



\- 直接刪除 Boarding 歷史

\- 以 Completed 代表取消

\- 建立與 Appointment 冲突的第二套取消狀態系統



\---



\# 23. Notification Boundary



TASK-0012 不建立 Notification System。



不實作：



\- LINE API

\- SMS

\- Email Notification

\- Push Notification

\- Notification Queue

\- Notification Framework



住宿狀態變更不要求外部通知。



\---



\# 24. Customer-facing Boundary



TASK-0012 為店家內部營運功能。



不建立：



\- Customer Portal

\- Customer Login

\- Customer Online Check-in

\- Customer Online Boarding Management

\- Customer Boarding History Portal

\- Customer Online Payment



\---



\# 25. Mobile Boundary



TASK-0012 不建立：



\- Native Mobile App

\- React Native App

\- Flutter App

\- PWA 專案

\- 獨立 Mobile Frontend



使用既有 Responsive Web UI。



\---



\# 26. Role Boundary



TASK-0012 不新增：



\- Boarding Staff Role

\- Boarding Manager Role

\- Boarding-specific Permission System

\- Enterprise RBAC



沿用既有 Staff / Auth Role。



\---



\# 27. Timeline / Audit Boundary



TASK-0012 不建立完整 Timeline 或 Event Store。



不實作：



\- Event Sourcing

\- Audit Event Store

\- 完整操作 Timeline

\- 每分鐘照護事件紀錄

\- Enterprise Audit Log



只保存 MVP 必要的 Boarding Execution 資料。



\---



\# 28. Room / Cage Management Boundary



TASK-0012 不建立：



\- Room Management

\- Cage Management

\- Kennel Allocation

\- Room Availability Engine

\- Capacity Scheduling

\- Resource Allocation

\- 房間排程最佳化



住宿服務可以在沒有上述系統的情況下完成 MVP 核心流程。



\---



\# 29. Care Management Boundary



TASK-0012 不建立完整住宿照護平台。



不建立：



\- 完整餵食排程

\- 完整散步排程

\- 完整清潔排程

\- 醫療管理

\- 用藥排程

\- Veterinary Workflow

\- Health Record System



如既有 Decision 所確認，僅保存完成一次住宿服務所必要的最小執行紀錄。



\---



\# 30. Order / Payment Boundary



TASK-0012 不處理：



\- Order 建立

\- Order 修改

\- Payment

\- Payment Status

\- 收款

\- 退款

\- 延遲費

\- 加購費

\- 住宿費計算

\- Pricing Engine



Boarding 完成後所需的 Order / Payment 流程：



> 由既有 Block 10 / Block 11 負責。



不得在 TASK-0012 重新實作。



\---



\# 31. Product Boundary



TASK-0012 不處理：



\- Product Sales

\- Product Inventory

\- Stock deduction

\- Inventory transaction



\---



\# 32. Report Boundary



TASK-0012 不建立新的 Report。



Boarding 資料應保存為未來 Report 所需的基本資料來源，但：



> Report UI / Reporting Logic 不屬於 TASK-0012。



\---



\# 33. Generic Architecture Boundary



TASK-0012 不得因實作 Boarding 而建立：



\- Generic Service Execution Framework

\- Generic Workflow Engine

\- Generic Repository Layer

\- Generic State Machine Framework

\- Enterprise Domain Layer

\- Event Bus

\- Plugin Architecture

\- Microservice

\- Message Queue

\- CQRS

\- Event Sourcing



除非 Repository Inspection 證明既有架構已經存在且 TASK-0012 必須沿用。



不得為了「未來可能會用到」而擴大架構。



\---



\# 34. Implementation Rules for AI Coding



AI Coding 必須搭配以下文件執行：



1\. 本文件：

&#x20;  `TASK-0012 Boarding 住宿執行 Boarding Execution v1.0.md`



2\. UI Baseline：

&#x20;  `Traditional Chinese UI Localization Baseline v1.0.md`



3\. Coding Execution Standard：

&#x20;  `TASK-CODING-AI-EXECUTION-PROMPT-v1.0.md`



本文件定義：



> WHAT — TASK-0012 要做什麼。



`Traditional Chinese UI Localization Baseline v1.0.md` 定義：



> UI BASELINE — UI 必須遵守什麼。



`TASK-CODING-AI-EXECUTION-PROMPT-v1.0.md` 定義：



> HOW — AI Coding 如何執行。



AI Coding 不得自行改變本文件已 Freeze / Confirmed 的 Scope。



\---



\# 35. AI Coding Required Execution Order



AI Coding 必須依下列順序執行：



1\. 讀取本 TASK 正式文件

2\. 讀取 Traditional Chinese UI Localization Baseline v1.0

3\. 讀取 TASK-CODING-AI-EXECUTION-PROMPT-v1.0

4\. Inspect Repository

5\. Inspect existing implementation

6\. Inspect existing Database Schema

7\. Inspect existing API structure

8\. Inspect existing Frontend structure

9\. Inspect existing Testing structure

10\. Check TASK-0011 integration boundary

11\. Check Freeze Conflict

12\. Check Scope Conflict

13\. 執行 Precondition Check

14\. 執行 Scope Check

15\. 提出 Implementation Plan

16\. 確認 Plan 僅涵蓋 TASK-0012

17\. Implementation

18\. Targeted Tests

19\. Browser Verification

20\. Full Regression

21\. Repository Verification

22\. 回報實際結果



AI Coding 不得跳過 Repository Inspection。



AI Coding 不得因 Repository 狀態不明而直接假設檔案、Schema 或 API 結構。



\---



\# 36. Scope Conflict Rule



如果 AI Coding 發現：



\- 現有架構與 TASK-0012 衝突

\- TASK-0011 Freeze 與 TASK-0012 發生衝突

\- 既有 Database Schema 無法安全支援 Scope

\- 現有 API 架構與需求衝突

\- 需要修改已 Freeze 功能才能完成

\- 必須新增未經 Decision 的重大功能



則：



> STOP。



不得自行重新設計。



不得自行修改已 Freeze Decision。



不得自行擴張 Scope。



必須回報：



\- Conflict

\- 原因

\- 受影響範圍

\- 建議處理方式



等待人工決策。



\---



\# 37. Testing Requirements



\## 37.1 Targeted Tests



至少驗證：



\- Boarding 建立

\- Boarding 取得

\- Boarding 更新

\- Check-in

\- Check-out

\- Status transition

\- Invalid transition

\- Customer / Pet relationship

\- Authorization

\- Validation

\- Active Boarding conflict

\- Persistence



\---



\## 37.2 API Tests



至少驗證：



\- 未登入 API → 401

\- 合法登入 → 可執行授權操作

\- Invalid ID → 正確錯誤

\- Invalid relation → 正確錯誤

\- Invalid status transition → 正確錯誤

\- Duplicate active Boarding → 正確錯誤

\- 合法 Check-in → 成功

\- 合法 Check-out → 成功



\---



\# 38. Browser E2E Requirements



具有 UI 與實際操作流程的 TASK：



> 必須進行真實 Browser E2E。



不得僅以 Jest / Supertest PASS 宣稱整個 TASK PASS。



至少驗證：



1\. Login

2\. 進入 Daily Operations

3\. 找到 Boarding 工作

4\. 進入 Boarding Execution

5\. Customer / Pet / Service 顯示正確

6\. 唯讀欄位正確

7\. Boarding 執行欄位可正確操作

8\. 儲存

9\. Reload

10\. 資料仍存在

11\. 執行 Check-in

12\. 狀態變成住宿中

13\. 執行 Check-out

14\. 狀態變成已完成

15\. 返回 Daily Operations

16\. Daily Operations 顯示已完成



若 Walk-in Flow 已被 Repository 現有功能支援且屬 TASK-0012 實作範圍，另行驗證 Walk-in Boarding。



\---



\# 39. Traditional Chinese UI Verification



Browser Verification 必須確認：



\- 頁面標題為繁體中文

\- 欄位 Label 為繁體中文

\- Button 為繁體中文

\- 狀態文字為繁體中文

\- Success Message 為繁體中文

\- Error Message 為繁體中文

\- Validation Message 為繁體中文

\- Boarding 相關 UI 不產生不必要英文文字

\- 與既有 UI Localization Baseline 一致



\---



\# 40. Regression Requirements



TASK-0012 完成後至少執行：



\- TASK-0012 targeted tests

\- Full regression

\- 既有 Grooming regression

\- Daily Operations regression

\- Auth regression

\- 相關 API regression

\- Browser regression（若受影響）



不得因 TASK-0012 通過自己的 targeted tests 就省略 Full Regression。



\---



\# 41. Repository Verification



AI Coding 完成後必須確認：



\- 修改檔案

\- 新增檔案

\- 刪除檔案

\- Database changes

\- API changes

\- Frontend changes

\- Tests changes

\- 是否有非預期修改

\- 是否有 Scope Expansion

\- 是否有 Freeze Conflict



不得只回報「完成」。



必須回報實際修改內容與驗證結果。



\---



\# 42. Verification Status Rules



驗證結果只能使用：



\- PASS

\- FAIL

\- BLOCKED

\- NOT AVAILABLE



不得使用：



> 看起來正確



作為正式 PASS。



Browser Verification 未實際完成時：



> 不得標示 Browser PASS。



Full Regression 未實際執行時：



> 不得標示 Full Regression PASS。



\---



\# 43. Definition of Done



TASK-0012 只有在以下條件全部成立時，才可視為完成：



\- \[ ] Boarding Execution Scope 已依本文件實作

\- \[ ] Customer / Pet / Service 關聯正確

\- \[ ] Appointment 關聯在適用情況下正確

\- \[ ] Boarding Lifecycle 正確

\- \[ ] Check-in 正確

\- \[ ] Check-out 正確

\- \[ ] Actual Check-in Time 正確保存

\- \[ ] Actual Check-out Time 正確保存

\- \[ ] Invalid Status Transition 被阻止

\- \[ ] Active Boarding Conflict 被阻止

\- \[ ] Daily Operations Integration 完成

\- \[ ] API Authorization 正確

\- \[ ] API Validation 正確

\- \[ ] Error Handling 正確

\- \[ ] Database Integrity 正確

\- \[ ] UI 使用 Traditional Chinese

\- \[ ] UI 符合既有 Localization Baseline

\- \[ ] Targeted Tests PASS

\- \[ ] Browser E2E PASS

\- \[ ] Full Regression PASS

\- \[ ] Repository Verification PASS

\- \[ ] 無未處理 Scope Conflict

\- \[ ] 無未處理 Freeze Conflict

\- \[ ] 無非預期 Scope Expansion



\---



\# 44. Acceptance Criteria



\## AC-01 — Boarding Entry



Staff 可以從 Daily Operations 找到 Boarding 工作並進入 Boarding Execution。



\## AC-02 — Boarding Identity



Boarding Execution 可以正確辨識 Customer、Pet 與 Service。



\## AC-03 — Appointment Relationship



Appointment-based Boarding 能保留正確 Appointment 關聯。



\## AC-04 — Walk-in



Walk-in Boarding 不需要建立虛構 Appointment，並能正確關聯 Customer / Pet。



\## AC-05 — Check-in



Staff 可以將合法的待入住 Boarding 執行入住。



\## AC-06 — Actual Check-in Time



入住時會保存實際入住時間。



\## AC-07 — Active State



入住後 Boarding 狀態為住宿中。



\## AC-08 — Execution Data



住宿中可以保存必要的 Boarding Execution 資料。



\## AC-09 — Persistence



儲存後 Reload，Boarding Execution 資料仍然存在。



\## AC-10 — Check-out



Staff 可以將住宿中的 Boarding 執行退房。



\## AC-11 — Actual Check-out Time



退房時會保存實際退房時間。



\## AC-12 — Completed State



退房後 Boarding 狀態為已完成。



\## AC-13 — Daily Operations



Boarding 完成後 Daily Operations 正確反映已完成狀態。



\## AC-14 — Invalid Transition



系統阻止非法狀態轉換。



\## AC-15 — Duplicate Active Boarding



系統阻止同一 Pet 建立互相衝突的 Active Boarding。



\## AC-16 — Authorization



未登入使用者無法存取受保護 Boarding API。



\## AC-17 — Validation



Invalid Customer / Pet / Service / Appointment relationship 不能成功建立或更新。



\## AC-18 — Traditional Chinese UI



Boarding UI、操作文字、狀態、錯誤與成功訊息符合 Traditional Chinese UI Localization Baseline。



\## AC-19 — Regression



既有 Grooming、Daily Operations、Auth 與相關 MVP 功能不因 TASK-0012 而退化。



\## AC-20 — Scope Boundary



TASK-0012 不引入未經確認的 Enterprise、Customer-facing、Notification、Room/Cage、Medical、Order、Payment 或其他 Future Enhancement Scope。



\---



\# 45. Explicit Out of Scope



以下項目明確不屬於 TASK-0012：



\- Order

\- Payment

\- Report UI

\- Product

\- Inventory

\- Customer Portal

\- Customer Online Booking

\- Customer Online Check-in

\- LINE API

\- SMS

\- Email Notification

\- Push Notification

\- Notification Framework

\- Room Management

\- Cage Management

\- Kennel Allocation

\- Capacity Scheduling

\- Resource Allocation Engine

\- 完整住宿照護排程

\- 完整餵食系統

\- 完整散步系統

\- 完整清潔排程

\- Medical Management

\- Medication Management

\- Veterinary Workflow

\- Enterprise RBAC

\- Boarding-specific Role System

\- Complete Audit Log

\- Event Sourcing

\- Generic Workflow Engine

\- Generic Service Execution Framework

\- Scheduler

\- Cron Automation

\- Microservice

\- Message Queue

\- CQRS

\- Customer-facing Mobile App

\- Native Mobile App

\- PWA

\- 完整 Reporting System

\- Pricing Engine

\- 延遲費計算

\- 加購費計算

\- 房間／籠位最佳化

\- 其他未經 TASK-0012 Decision 確認的功能



\---



\# 46. Future Enhancement Boundary



以下需求若未來需要，應建立新的 TASK 或正式 Change Decision：



\- 房間／籠位管理

\- 容量管理

\- 住宿資源排程

\- 完整每日照護 Timeline

\- 餵食排程

\- 散步排程

\- 醫療／用藥管理

\- Customer Portal

\- 外部通知

\- 自動 Scheduler

\- 住宿費用自動計算

\- 延遲費計算

\- 高階住宿報表

\- 完整 Audit Log

\- Enterprise RBAC



不得在 TASK-0012 實作階段自行加入。



\---



\# 47. Freeze Boundary



TASK-0012 完成後 Freeze 的內容包括：



\- Boarding Execution Scope

\- Boarding Lifecycle

\- Check-in / Check-out 行為

\- Actual Time 規則

\- Customer / Pet / Service 關聯

\- Appointment 關聯規則

\- Walk-in 規則

\- Active Boarding Conflict Rule

\- Daily Operations Integration

\- API Authorization / Validation Boundary

\- UI Scope

\- Traditional Chinese UI Requirement

\- Testing Requirement

\- Browser E2E Requirement

\- Regression Requirement

\- Explicit Out of Scope



後續 TASK 不得在沒有正式 Change Decision 的情況下修改上述 Freeze 內容。



\---



\# 48. AI Coding Stop Conditions



AI Coding 遇到以下任一情況必須 STOP：



\- 無法確認現有 Repository 結構

\- 無法確認既有 Database Schema

\- 發現 TASK-0011 Freeze Conflict

\- 發現既有 Architecture Conflict

\- 必須修改已 Freeze 功能才能完成

\- 必須增加新的重大 Block

\- 必須引入新的 Framework

\- 必須增加未經 Decision 的 Business Rule

\- 必須增加未經 Decision 的 UI Flow

\- 必須增加未經 Decision 的 API

\- 必須建立 Enterprise-level abstraction

\- 必須改變 Technical Baseline

\- 必須擴大 TASK Scope

\- 無法安全 Migration

\- 無法維持既有 Regression



STOP 後不得自行做重大決策。



\---



\# 49. Final Verification Record



本章於 AI Coding 完成後填寫實際結果。



| Verification Item | Result | Evidence |

|---|---|---|

| Repository Inspection | PENDING | AI Coding 執行後填寫 |

| Precondition Check | PENDING | AI Coding 執行後填寫 |

| Scope Check | PENDING | AI Coding 執行後填寫 |

| Implementation Plan | PENDING | AI Coding 執行後填寫 |

| Database Verification | PENDING | AI Coding 執行後填寫 |

| API Verification | PENDING | AI Coding 執行後填寫 |

| UI Verification | PENDING | AI Coding 執行後填寫 |

| Traditional Chinese UI Verification | PENDING | AI Coding 執行後填寫 |

| Targeted Tests | PENDING | AI Coding 執行後填寫 |

| Browser E2E | PENDING | AI Coding 執行後填寫 |

| Full Regression | PENDING | AI Coding 執行後填寫 |

| Repository Verification | PENDING | AI Coding 執行後填寫 |

| Scope Verification | PENDING | AI Coding 執行後填寫 |

| Freeze Conflict Check | PENDING | AI Coding 執行後填寫 |



\---



\# 50. Final Status



目前正式工程文件狀態：



> READY FOR AI CODING



目前尚未宣稱：



\- Implementation PASS

\- Browser E2E PASS

\- Full Regression PASS

\- TASK PASS

\- TASK FREEZE



以上結果必須等待 AI Coding 實際執行與 Verification。



TASK-0012 的正式完成條件：



> Implementation PASS

>

> Browser E2E PASS

>

> Full Regression PASS

>

> Acceptance Criteria 全部 PASS

>

> 無 Blocking Issue

>

> 無 Scope Conflict

>

> 無 Freeze Conflict

>

> 正式工程文件完成確認

>

> → TASK-0012 FREEZE

