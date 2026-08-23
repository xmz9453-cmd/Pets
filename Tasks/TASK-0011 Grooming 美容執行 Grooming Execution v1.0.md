\# TASK-0011 Grooming 美容執行 Grooming Execution v1.0



\## 1. Document Information



| Field | Value |

|---|---|

| Task | TASK-0011 |

| 中文名稱 | Grooming 美容執行 |

| English Name | Grooming Execution |

| 文件類型 | Formal Engineering Document |

| Version | v1.0 |

| Decision Status | COMPLETE |

| Decision Count | 120 / 120 |

| Scope Closure | PASS |

| Coding Readiness | PASS |

| Implementation Status | READY FOR CODING |

| Previous Task Dependency | TASK-0009 = FREEZE |

| Previous Task Dependency | TASK-0010 = FREEZE |

| Document Naming | TASK-0011 Grooming 美容執行 Grooming Execution v1.0 |



\---



\## 2. Task Objective



TASK-0011 負責建立 MVP 的 Grooming 美容執行能力。



本 Task 的核心目的：



> 讓店內工作人員可以從既有 Daily Operations 工作進入指定 Pet 的 Grooming 執行介面，查看必要 Customer / Pet / Service 資訊，記錄美容前狀況、美容執行結果與美容後結果，並依既有 Daily Operations 工作生命週期完成本次 Grooming。



TASK-0011 不建立第二套營運工作系統。



Grooming 必須整合既有：



\- Authentication / Authorization

\- Customer Management

\- Pet Management

\- Appointment

\- Service

\- Daily Operations

\- Staff Assignment



並遵守既有 Frozen Contract。



\---



\## 3. Scope



\### 3.1 In Scope



TASK-0011 包含：



\- Grooming 獨立工作介面

\- 從 `/operations` 進入 Grooming

\- 以單一 Pet 的本次 Grooming 為核心

\- Appointment 與 Pet 關聯

\- Daily Operations 工作關聯

\- Customer 必要資訊唯讀顯示

\- Pet 必要資訊唯讀顯示

\- 本次 Service 唯讀顯示

\- 美容前狀況記錄

\- 美容後結果記錄

\- 實際美容內容必要資料

\- Grooming 備註

\- Grooming 結果儲存

\- Grooming 完成

\- 與 Daily Operations 完成流程整合

\- 既有 Staff Assignment 整合

\- Backend Validation

\- Frontend 基本 Validation

\- Authentication / Authorization

\- Loading / Empty / Error UI

\- 儲存處理狀態

\- 防止重複送出

\- Transaction 一致性

\- 不允許一般 UI 刪除 Grooming

\- 不建立 Grooming 專用狀態機



\---



\## 4. Business Definition



\### 4.1 Grooming 核心定義



Grooming 是：



> 對單一 Appointment 中單一 Pet 所執行的一次美容工作。



因此 Grooming 的最小業務單位為：



&#x20;   Appointment × Pet = Grooming Work



一個 Appointment 若包含多隻 Pet：



&#x20;   Appointment

&#x20;     ├── Pet A → Grooming A

&#x20;     ├── Pet B → Grooming B

&#x20;     └── Pet C → Grooming C



每一隻 Pet 必須能個別保存其 Grooming 執行資料與結果。



\---



\### 4.2 Grooming 與 Daily Operations 關係



Grooming 必須存在於既有 Daily Operations 工作之中。



流程：



&#x20;   Appointment

&#x20;       ↓

&#x20;   Daily Operations

&#x20;       ↓

&#x20;   Check-in

&#x20;       ↓

&#x20;   Start

&#x20;       ↓

&#x20;   Grooming

&#x20;       ↓

&#x20;   Grooming Result

&#x20;       ↓

&#x20;   Complete

&#x20;       ↓

&#x20;   Daily Operations Completed



Grooming 不得自行建立沒有 Daily Operations 對應工作的美容工作。



\---



\### 4.3 Grooming 不是獨立營運系統



Grooming 不得建立第二套：



\- 工作狀態機

\- Appointment

\- Customer

\- Pet

\- Service

\- Staff

\- Cancellation

\- History

\- Dashboard



Grooming 是既有營運流程中的美容執行能力。



\---



\## 5. Business Rules



\### 5.1 Entry Rule



Grooming 主要入口：



&#x20;   /operations

&#x20;       ↓

&#x20;   指定 Daily Operations 工作

&#x20;       ↓

&#x20;   Grooming



不得由 Grooming 任意建立新工作。



\---



\### 5.2 Appointment Rule



Grooming 必須關聯既有 Appointment。



Appointment 被取消時，不允許 Grooming 開始新的美容執行。



Grooming 不得繞過 Appointment Lifecycle。



\---



\### 5.3 Check-in Rule



Appointment 尚未 Check-in 時：



\- 可以查看必要工作資訊

\- 不得進行正式 Grooming 執行



查看工作與正式開始 Grooming 必須分離。



\---



\### 5.4 Start Rule



Grooming 正式開始時：



\- 沿用 Daily Operations 既有工作狀態轉換

\- 使用既有 `started\_time`

\- 不建立第二套 Grooming 開始時間軸



實際開始時間由系統產生，不由使用者手動輸入。



\---



\### 5.5 Completion Rule



Grooming 完成時：



\- 必要 Grooming 結果資料必須通過 Validation

\- 使用既有 Daily Operations 完成流程

\- 使用既有 `completed\_time`

\- 不建立第二套 Grooming 完成時間軸

\- 對應 Daily Operations 工作必須同步完成



不得出現：



&#x20;   Grooming = COMPLETED

&#x20;   Daily Operations = IN\_PROGRESS



之類的狀態不一致。



\---



\### 5.6 Reopen Rule



若既有工作允許 Reopen：



\- 保留原有 Grooming 資料

\- 允許修改

\- 不清空既有資料

\- 再次依既有工作狀態完成



不建立版本控制或完整歷史系統。



\---



\### 5.7 Duplicate Work Rule



同一個 Daily Operations 工作與同一隻 Pet：



> 不允許同時存在多筆進行中的 Grooming。



不得因重複 Request 或 UI 操作建立重複 Grooming 工作。



\---



\### 5.8 Delete Rule



TASK-0011 第一版：



> 不提供一般 UI 刪除 Grooming 工作或 Grooming 紀錄。



不得加入：



\- 任意 Delete

\- Soft Delete 管理系統

\- 資料回收機制

\- 完整資料生命週期管理



\---



\## 6. Grooming Data Requirements



\### 6.1 Grooming Core Record



Grooming 必須具有自己的最小執行資料。



Grooming 必須能與以下既有資料建立關聯：



\- Daily Operations Work

\- Appointment

\- Pet

\- Customer

\- Service

\- Staff



Customer / Pet / Service 的主資料仍由其原本 Block 負責。



\---



\### 6.2 Customer Information



Grooming UI 必須顯示必要 Customer 資訊。



Customer 資訊：



\- 唯讀

\- 不在 Grooming 編輯

\- 不建立 Grooming 專用 Customer 資料



Customer Management 為唯一 Customer 維護邊界。



\---



\### 6.3 Pet Information



Grooming UI 必須顯示必要 Pet 資訊。



至少必須能辨識：



\- Pet Name

\- Species

\- 必要基本資訊



Pet 資訊：



\- 唯讀

\- 不在 Grooming 編輯

\- 不建立 Grooming 專用 Pet 資料



Pet Management 為唯一 Pet 維護邊界。



\---



\### 6.4 Service Information



Grooming UI 必須顯示本次 Appointment 對應的 Service。



Service：



\- 唯讀

\- 不在 Grooming 修改

\- 不建立 Grooming 專用 Service



Grooming 第一版不建立：



\- Service Change Workflow

\- 加購／減項系統

\- Price Change Workflow



若實際美容內容與預約 Service 有必要差異：



> 第一版以 Grooming 必要備註記錄，不建立正式 Service 變更交易機制。



\---



\### 6.5 Before Grooming Condition



Grooming 必須能記錄美容前狀況。



資料模型採：



> 固定少量必要欄位 + 必要備註



不得建立：



\- 完整健康檢查表

\- 醫療系統

\- 可自訂欄位

\- Form Builder



美容前狀況可依實際需求留空。



\---



\### 6.6 Grooming Result



Grooming 必須保存美容後結果。



資料模型採：



> 固定少量必要結果欄位 + 必要備註



不得建立：



\- 完整美容報告

\- 動態結果模板

\- Form Builder

\- 自訂結果 Schema



\---



\### 6.7 Actual Grooming Content



Grooming 必須能記錄本次實際美容內容的必要資料。



第一版採固定必要資料欄位。



不得使用：



\- 任意 JSON Schema

\- Dynamic Fields

\- Custom Fields Engine

\- 使用者自訂表單



\---



\### 6.8 Grooming Notes



Grooming 必須提供美容備註。



用途包含：



\- 美容執行相關說明

\- 客人指定事項

\- 毛況特殊事項

\- 寵物當日反應

\- 美容完成後必要注意事項

\- Appointment Service 與實際執行內容的必要差異



Grooming Note 與 Daily Operations Work Note 不強制共用。



兩者資料責任分離：



| Note | Responsibility |

|---|---|

| Daily Operations Work Note | Daily Operations |

| Grooming Note | Grooming |



備註必須具有合理 MVP 長度限制。



不得建立：



\- Rich Text Editor

\- Notes History

\- Timeline

\- Version History



\---



\## 7. Time Requirements



\### 7.1 Started Time



Grooming 不建立重複的獨立開始時間欄位。



沿用 TASK-0009 Daily Operations：



&#x20;   started\_time



開始時間由系統在工作正式開始時產生。



不得：



\- 使用者手動輸入

\- 直接使用 Appointment Start Time 作為實際開始時間



\---



\### 7.2 Completed Time



Grooming 不建立重複的獨立完成時間欄位。



沿用 TASK-0009 Daily Operations：



&#x20;   completed\_time



完成時間由系統在工作正式完成時產生。



不得：



\- 使用者手動輸入

\- 使用 Appointment End Time 取代實際完成時間



\---



\## 8. Staff Requirements



\### 8.1 Staff Assignment



Grooming 沿用既有 Staff / Staff Assignment 架構。



不建立：



\- Groomer 專用帳號系統

\- Groomer 專用 Role

\- Grooming 專用 Permission Matrix

\- 第二套 Staff Assignment



實際 Grooming 負責人應與既有 Staff Assignment 保持一致。



\---



\### 8.2 Staff Reassignment



若既有 Daily Operations 支援 Staff Reassignment：



> Grooming 沿用既有 Staff Assignment 機制。



不得建立 Grooming 自己的人員指派流程。



\---



\## 9. Grooming UI Requirements



\### 9.1 Main Entry



主要入口：



&#x20;   /operations



使用者由指定 Daily Operations 工作進入 Grooming。



不建立：



\- Grooming Dashboard

\- Grooming Homepage

\- Grooming KPI Dashboard

\- 獨立美容工作入口



\---



\### 9.2 Grooming Work Screen



Grooming 工作介面以：



> 單一 Pet 的本次 Grooming



為核心。



畫面必須提供必要：



\- Customer

\- Pet

\- Service

\- 美容前狀況

\- 實際美容內容

\- 美容後結果

\- Grooming Note

\- 儲存

\- 完成



\---



\### 9.3 Read-only Information



以下資料在 Grooming UI 只讀：



\- Customer

\- Pet

\- Appointment

\- Service



不得在 Grooming 直接修改其主資料。



\---



\### 9.4 Edit Information



Grooming 可以修改：



\- 美容前狀況

\- 實際美容內容

\- 美容後結果

\- Grooming Note



\---



\### 9.5 Save Action



Grooming UI 必須提供明確的儲存操作。



基本流程：



&#x20;   Edit

&#x20;       ↓

&#x20;   Save

&#x20;       ↓

&#x20;   Backend Validation

&#x20;       ↓

&#x20;   Success / Error



第一版不採：



\- Auto Save

\- 關閉頁面自動儲存

\- Draft Auto Save



\---



\### 9.6 Loading State



Grooming UI 必須提供 Loading State。



在資料載入或 Request 執行期間：



\- 顯示處理中狀態

\- 防止使用者誤認資料已完成

\- 防止重複操作



\---



\### 9.7 Empty State



當 Grooming 工作不存在或沒有可顯示資料時：



\- 顯示明確 Empty / Not Found 狀態

\- 不自動建立 Grooming

\- 不自動建立 Pet

\- 不建立空白工作



\---



\### 9.8 Error State



API 發生錯誤時：



\- 顯示使用者可理解的繁體中文訊息

\- 不顯示 Stack Trace

\- 不直接顯示 Backend Raw Error

\- 不清空使用者已輸入資料



Technical Error 可保留於：



\- Console

\- Internal Log



但不得直接暴露給一般使用者。



\---



\### 9.9 Duplicate Submit Protection



在 Save / Complete Request 執行期間：



\- 顯示處理中狀態

\- 暫時停用相關送出操作

\- 防止重複 Request



不建立複雜 Request Queue。



\---



\## 10. API Requirements



\### 10.1 API Responsibility



TASK-0011 必須提供 Grooming 所需的最小 Backend API。



架構沿用：



&#x20;   Next.js

&#x20;       ↓

&#x20;   Express.js API

&#x20;       ↓

&#x20;   mysql2

&#x20;       ↓

&#x20;   MySQL



Frontend 不得直接操作 Database。



\---



\### 10.2 Required API Capabilities



Grooming API 至少必須支援：



1\. 取得指定 Grooming 工作

2\. 取得必要關聯資料

3\. 取得／更新 Grooming 執行資料

4\. 提交 Grooming 結果

5\. 完成 Grooming

6\. 依既有狀態規則處理 Reopen / Completion



不建立：



\- 完整 CRUD Framework

\- Bulk Operations

\- Import / Export

\- Admin API

\- Grooming API Framework



\---



\### 10.3 Resource Boundary



Grooming API 不得因資料不存在而自動建立：



\- Appointment

\- Daily Operations Work

\- Customer

\- Pet

\- Service



若指定 Grooming Work 不存在：



> 回傳 Resource Not Found。



Frontend 顯示繁體中文錯誤訊息。



\---



\### 10.4 Pet Integrity



若 Grooming 對應 Pet 不存在：



> 視為資料完整性錯誤。



API 必須拒絕不合法操作並保護既有資料。



不得：



\- 自動建立 Pet

\- 允許 Grooming 沒有 Pet

\- 自動刪除 Grooming



\---



\### 10.5 Authentication



Grooming API 必須沿用既有 Authentication Guard。



未登入使用者：



> 不得存取 Grooming API。



不得建立 Grooming 專用登入機制。



\---



\### 10.6 Authorization



Grooming API 必須沿用既有 Authorization。



不得建立：



\- Groomer Role

\- Grooming-specific RBAC

\- Permission Matrix

\- Enterprise RBAC



TASK-0011 不重新設計既有權限系統。



\---



\## 11. State Management



\### 11.1 State Ownership



Grooming 不建立獨立 State Machine。



工作狀態由：



> Daily Operations



負責。



\---



\### 11.2 State Transition



Grooming 必須沿用既有 Daily Operations State Model。



不得建立：



\- Grooming STARTED

\- Grooming COMPLETED

\- Grooming CANCELLED



等第二套獨立狀態機。



Grooming 的「開始」與「完成」操作必須整合既有 Daily Operations State Transition。



\---



\### 11.3 Cancellation



Grooming 不提供獨立 `CANCELLED` 狀態。



取消由既有：



> Appointment / Daily Operations Lifecycle



處理。



\---



\### 11.4 Draft



TASK-0011 不建立 Draft 狀態。



第一版採：



&#x20;   編輯

&#x20;     ↓

&#x20;   儲存

&#x20;     ↓

&#x20;   完成



\---



\## 12. Validation Requirements



\### 12.1 Validation Ownership



Validation 採雙層：



| Layer | Responsibility |

|---|---|

| Frontend | UX 提示與基本輸入檢查 |

| Backend | 最終 Business / Data Validation |



Backend Validation 為最終資料完整性保護。



\---



\### 12.2 Completion Validation



Grooming 完成前：



> 必要 Grooming 結果資料必須符合 Validation。



若必要資料未完成：



> 不得完成 Grooming。



不得允許：



&#x20;   Grooming = COMPLETED

&#x20;   Result = Missing



\---



\### 12.3 Before Condition Validation



美容前狀況不要求所有欄位一律填寫。



依實際需求允許留空。



\---



\### 12.4 Notes Validation



Grooming Note 必須符合既定合理 MVP 長度限制。



不得：



\- 無限制字串

\- Rich Text

\- HTML Editor



\---



\## 13. Transaction Requirements



\### 13.1 Atomicity



涉及 Grooming 工作資料、狀態與完成時間等相關更新時：



> 必須保持一致性。



不得允許一部分成功、一部分失敗而形成不一致工作狀態。



\---



\### 13.2 Completion Transaction



Grooming 完成流程若同時涉及：



\- Grooming Result

\- Daily Operations Status

\- completed\_time



相關更新必須依既有 Backend Transaction Pattern 保持一致。



\---



\### 13.3 Failure Behavior



若儲存或完成操作失敗：



\- 不宣告成功

\- 不清空使用者輸入

\- 不留下部分成功的工作狀態

\- 回傳可處理的 Backend Error

\- Frontend 顯示繁體中文錯誤訊息



\---



\## 14. Data Responsibility Boundary



| Data | Owner |

|---|---|

| Customer | Customer Management |

| Pet | Pet Management |

| Appointment | Appointment |

| Service | Service / Appointment |

| Daily Work State | Daily Operations |

| Check-in Time | Daily Operations |

| Started Time | Daily Operations |

| Completed Time | Daily Operations |

| Responsible Staff / Staff Assignment | Daily Operations / Staff Assignment |

| Grooming Before Condition | Grooming |

| Actual Grooming Content | Grooming |

| Grooming Result | Grooming |

| Grooming Note | Grooming |



TASK-0011 不重複保存 Daily Operations 已負責的工作時間與狀態資料。



\---



\## 15. Metadata Requirements



Grooming 必須依既有資料庫架構保存必要 metadata。



若既有資料架構採用：



\- `created\_at`

\- `updated\_at`



則 Grooming 應一致沿用。



建立者與最後修改者：



> 若既有專案資料架構已採用，沿用既有模式。



不得為 Grooming 建立特殊 Audit 系統。



\---



\## 16. Explicitly Out of Scope



以下內容明確不屬於 TASK-0011：



\### 16.1 Workflow



\- Grooming 自有 State Machine

\- Workflow Engine

\- 自訂 Workflow

\- Grooming Cancelled State

\- Grooming Draft State



\### 16.2 Data Management



\- 任意 Delete

\- Soft Delete 管理系統

\- 完整資料生命週期

\- Version Control

\- Grooming History

\- Event Log

\- Audit Timeline

\- Notes History



\### 16.3 Customization



\- Form Builder

\- Dynamic Fields

\- Custom Fields

\- JSON Schema

\- Grooming Template Engine

\- 美容師個人模板



\### 16.4 Media



\- Photo Upload

\- Photo Management

\- Before / After Photo Comparison

\- Photo History

\- File Storage Lifecycle



\### 16.5 Other Business Blocks



\- Boarding

\- Order

\- Payment

\- Product

\- Report



\### 16.6 Analytics



\- Grooming Dashboard

\- Grooming KPI

\- Groomer KPI

\- Grooming Report



\### 16.7 Other Management



\- Customer Search System

\- Pet Search System

\- Customer Editing

\- Pet Editing

\- Service Editing

\- Service Change Workflow

\- Add-on / Deduction System

\- New Appointment Creation

\- Walk-in Grooming System



\### 16.8 Enterprise Features



\- Enterprise RBAC

\- Multi-tenant SaaS

\- SSO

\- MFA

\- Complex Permission Matrix

\- General-purpose Audit Framework



\---



\## 17. Decision Register



\### 17.1 Decision Completion



TASK-0011 Decision 已完成：



&#x20;   Q001–Q120 = 120 / 120

&#x20;   All AI Recommendations Accepted

&#x20;   Decision Status = COMPLETE



使用者已確認：



> Q001–Q120 全部採用 AI 推薦。



\---



\### 17.2 Decision Principles



全部 Decision 遵循以下原則：



1\. Grooming 是獨立 Business Capability。

2\. Grooming 從 `/operations` 進入。

3\. Grooming 以單一 Pet 的本次工作為核心。

4\. Grooming 不重複建立 Daily Operations 工作狀態。

5\. Grooming 不修改 Customer / Pet / Service 主資料。

6\. Grooming 保存美容前狀況與美容後結果。

7\. Grooming 保存必要實際美容內容。

8\. Grooming 保存必要美容備註。

9\. Grooming 使用固定、最小資料模型。

10\. Grooming 不建立複雜 Checklist / Workflow。

11\. Grooming 沿用既有 Authentication / Authorization。

12\. Grooming 沿用既有 Staff Assignment。

13\. Grooming 沿用既有 Daily Operations Time / State Model。

14\. Grooming 完成前必須通過必要資料 Validation。

15\. Grooming 完成後必須與 Daily Operations 保持一致。

16\. Grooming 不建立第二套歷史、Audit 或版本系統。

17\. Grooming 不建立 Dashboard / KPI / Report。

18\. Grooming 不擴張至其他 Business Block。



\---



\## 18. Scope Closure



\### 18.1 Business Scope Closure



Status:



&#x20;   PASS



確認：



\- Grooming 業務目的已明確

\- Grooming 工作單位已明確

\- Appointment / Pet 關係已明確

\- Multi-Pet 行為已明確

\- Entry Point 已明確

\- Start / Completion Boundary 已明確

\- Reopen Boundary 已明確

\- Cancellation Boundary 已明確

\- Delete Boundary 已明確

\- Grooming 與 Daily Operations Responsibility 已明確



\---



\### 18.2 Data Scope Closure



Status:



&#x20;   PASS



確認：



\- Grooming 核心資料已明確

\- Appointment 關聯已明確

\- Pet 關聯已明確

\- Customer Read-only Boundary 已明確

\- Pet Read-only Boundary 已明確

\- Service Read-only Boundary 已明確

\- Before Condition 已明確

\- Actual Grooming Content 已明確

\- Grooming Result 已明確

\- Grooming Note 已明確

\- Time Ownership 已明確

\- Staff Assignment Ownership 已明確

\- Metadata 原則已明確

\- 不建立 History / Audit / Version Control 已明確



\---



\### 18.3 API Scope Closure



Status:



&#x20;   PASS



確認：



\- Grooming API 必要能力已明確

\- Resource Boundary 已明確

\- Authentication 已明確

\- Authorization 已明確

\- Validation Ownership 已明確

\- Transaction Requirement 已明確

\- Error Handling 已明確

\- Completion Integration 已明確

\- 不建立完整 CRUD Framework 已明確



\---



\### 18.4 UI Scope Closure



Status:



&#x20;   PASS



確認：



\- `/operations` Entry 已明確

\- Grooming 工作頁已明確

\- Customer Read-only UI 已明確

\- Pet Read-only UI 已明確

\- Service Read-only UI 已明確

\- Before Condition UI 已明確

\- Result UI 已明確

\- Note UI 已明確

\- Save 行為已明確

\- Completion 行為已明確

\- Loading State 已明確

\- Empty State 已明確

\- Error State 已明確

\- Duplicate Submit Protection 已明確

\- 使用者可見錯誤使用繁體中文已明確



\---



\## 19. Coding Readiness Check



\### 19.1 Business Readiness



&#x20;   PASS



Grooming Business Flow 已可直接轉換為 implementation。



\---



\### 19.2 Data Readiness



&#x20;   PASS



Grooming 核心資料責任與既有 Block Boundary 已明確。



不得在 Coding 階段重新建立 Customer / Pet / Service / Daily Operations 的資料責任。



\---



\### 19.3 API Readiness



&#x20;   PASS



Backend API 的必要能力、Authentication、Authorization、Validation、Transaction 與 Error Boundary 已明確。



Coding 不需要自行發明新的 API Framework。



\---



\### 19.4 UI Readiness



&#x20;   PASS



Grooming UI Entry、資訊顯示、可編輯資料、儲存、完成、Loading、Empty、Error 與防重複送出行為已明確。



\---



\### 19.5 Integration Readiness



&#x20;   PASS



TASK-0011 與既有：



\- Appointment

\- Pet

\- Customer

\- Service

\- Daily Operations

\- Staff Assignment

\- Authentication

\- Authorization



之責任邊界已明確。



\---



\### 19.6 Scope Readiness



&#x20;   PASS



已明確排除非 TASK-0011 必要能力。



Coding 不得自行擴張：



\- Boarding

\- Order

\- Payment

\- Report

\- KPI

\- Audit

\- History

\- Photo

\- Custom Form

\- Enterprise RBAC

\- SaaS



\---



\### 19.7 Coding Readiness Final Result



&#x20;   CODING READINESS = PASS



&#x20;   TASK-0011 = READY FOR CODING



\---



\## 20. Testing Requirements



\### 20.1 Backend Unit / Integration Testing



必須覆蓋至少：



\- Grooming Resource Exists

\- Grooming Resource Not Found

\- Pet Relation Integrity

\- Appointment Relation Integrity

\- Authentication Required

\- Authorization Required

\- Before Condition Validation

\- Grooming Result Validation

\- Grooming Note Length Validation

\- Completion Validation

\- Duplicate Grooming Prevention

\- Cancelled Appointment Boundary

\- Daily Operations State Boundary

\- Reopen Behavior

\- Completion Transaction

\- Transaction Rollback

\- Error Response



\---



\### 20.2 API Testing



至少驗證：



\- GET / Grooming capability

\- UPDATE / Save capability

\- Completion capability

\- Authentication rejection

\- Authorization rejection

\- Not Found response

\- Validation failure

\- Transaction failure

\- Successful persistence



實際 API URL 與 HTTP Method 必須遵循既有專案 API Naming / Routing Convention，不得因 TASK-0011 另建不同風格。



\---



\### 20.3 Frontend Testing



至少驗證：



\- `/operations` Entry

\- Grooming Page Load

\- Customer Read-only Display

\- Pet Read-only Display

\- Service Read-only Display

\- Before Condition Input

\- Grooming Content Input

\- Grooming Result Input

\- Grooming Note Input

\- Save

\- Save Success

\- Save Failure

\- Loading

\- Empty

\- Error

\- Completion

\- Duplicate Submit Protection

\- Reopen

\- Traditional Chinese User-facing Messages



\---



\### 20.4 Browser Verification



必須驗證實際 Browser Workflow：



&#x20;   Login

&#x20;       ↓

&#x20;   /operations

&#x20;       ↓

&#x20;   Select Grooming Work

&#x20;       ↓

&#x20;   Grooming Page

&#x20;       ↓

&#x20;   Verify Customer

&#x20;       ↓

&#x20;   Verify Pet

&#x20;       ↓

&#x20;   Verify Service

&#x20;       ↓

&#x20;   Enter Before Condition

&#x20;       ↓

&#x20;   Enter Grooming Content

&#x20;       ↓

&#x20;   Enter Grooming Result

&#x20;       ↓

&#x20;   Enter Note

&#x20;       ↓

&#x20;   Save

&#x20;       ↓

&#x20;   Verify Persistence

&#x20;       ↓

&#x20;   Complete

&#x20;       ↓

&#x20;   Verify Daily Operations Completion



\---



\## 21. Regression Requirements



TASK-0011 Coding 完成後不得破壞既有：



\- Authentication

\- Authorization

\- Customer Management

\- Pet Management

\- Appointment

\- Service

\- Daily Operations

\- Staff Assignment



至少必須確認：



\- `/operations` 既有功能正常

\- Daily Operations State Transition 正常

\- Check-in 正常

\- Start 正常

\- Completed Time 正常

\- Responsible Staff 正常

\- Appointment Cancellation Boundary 正常

\- Existing API Regression PASS

\- Existing Frontend Regression PASS



\---



\## 22. Definition of Done



TASK-0011 僅在以下全部成立時，才可標記 Implementation Complete：



\### Business



\- \[ ] Grooming 工作單位正確

\- \[ ] Multi-Pet 正確拆分

\- \[ ] `/operations` Entry 正常

\- \[ ] Check-in Boundary 正常

\- \[ ] Start Boundary 正常

\- \[ ] Completion Boundary 正常

\- \[ ] Reopen Boundary 正常

\- \[ ] Cancellation Boundary 正常

\- \[ ] Delete Boundary 正常



\### Data



\- \[ ] Grooming Record 正確建立／取得

\- \[ ] Appointment 關聯正確

\- \[ ] Pet 關聯正確

\- \[ ] Customer Read-only 正確

\- \[ ] Service Read-only 正確

\- \[ ] Before Condition 正確

\- \[ ] Actual Grooming Content 正確

\- \[ ] Grooming Result 正確

\- \[ ] Grooming Note 正確

\- \[ ] Time 使用既有 Daily Operations Model

\- \[ ] Staff Assignment 使用既有模式

\- \[ ] Metadata 使用既有架構



\### API



\- \[ ] Required API Capabilities 完成

\- \[ ] Authentication PASS

\- \[ ] Authorization PASS

\- \[ ] Validation PASS

\- \[ ] Resource Boundary PASS

\- \[ ] Transaction PASS

\- \[ ] Rollback PASS

\- \[ ] Error Handling PASS

\- \[ ] Duplicate Protection PASS



\### UI



\- \[ ] Grooming Page 完成

\- \[ ] Customer Display PASS

\- \[ ] Pet Display PASS

\- \[ ] Service Display PASS

\- \[ ] Before Condition PASS

\- \[ ] Actual Grooming Content PASS

\- \[ ] Grooming Result PASS

\- \[ ] Grooming Note PASS

\- \[ ] Save PASS

\- \[ ] Completion PASS

\- \[ ] Loading PASS

\- \[ ] Empty PASS

\- \[ ] Error PASS

\- \[ ] Duplicate Submit Protection PASS

\- \[ ] Traditional Chinese User-facing UI PASS



\### Testing



\- \[ ] Backend Tests PASS

\- \[ ] API Tests PASS

\- \[ ] Frontend Tests PASS

\- \[ ] Browser Verification PASS

\- \[ ] Regression PASS



\---



\## 23. Freeze / Change Control



TASK-0011 的 Decision Scope 已完成：



&#x20;   Q001–Q120 = COMPLETE



Scope Closure：



&#x20;   PASS



Coding Readiness：



&#x20;   PASS



本文件 v1.0 固化：



\- Business Scope

\- Data Scope

\- API Scope

\- UI Scope

\- Integration Boundary

\- Validation

\- Transaction

\- Testing Requirements

\- Definition of Done

\- Explicit Out of Scope



Coding 階段不得自行：



\- 擴張 Scope

\- 新增 Grooming State Machine

\- 新增 Grooming Cancelled

\- 新增 Draft

\- 新增 Delete System

\- 新增 History

\- 新增 Audit System

\- 新增 Photo System

\- 新增 Custom Form

\- 新增 Dashboard

\- 新增 KPI

\- 新增 Report

\- 擴張至其他 Block



若 Coding 過程發現真正的規格缺口：



> 必須先提出變更決策，再修改正式工程規格。



不得以 Coding 階段自行猜測取代正式 Decision。



\---



\## 24. Final Status



| Item | Status |

|---|---|

| TASK-0011 Decision | COMPLETE |

| Decision Count | 120 / 120 |

| Business Scope Closure | PASS |

| Data Scope Closure | PASS |

| API Scope Closure | PASS |

| UI Scope Closure | PASS |

| Integration Scope Closure | PASS |

| Coding Readiness | PASS |

| Implementation | READY FOR CODING |

| Formal Engineering Document | v1.0 |



\## 25. Engineering Baseline



TASK-0011 v1.0 的正式工程基準為：



> Grooming 是既有 Daily Operations 流程中的單一 Pet 美容執行能力。



其唯一核心流程為：



&#x20;   /operations

&#x20;       ↓

&#x20;   Daily Operations Work

&#x20;       ↓

&#x20;   Check-in

&#x20;       ↓

&#x20;   Start

&#x20;       ↓

&#x20;   Grooming

&#x20;       ↓

&#x20;   Before Condition

&#x20;       ↓

&#x20;   Actual Grooming Content

&#x20;       ↓

&#x20;   Grooming Result

&#x20;       ↓

&#x20;   Grooming Note

&#x20;       ↓

&#x20;   Save

&#x20;       ↓

&#x20;   Validate

&#x20;       ↓

&#x20;   Complete

&#x20;       ↓

&#x20;   Daily Operations Completed



TASK-0011 不建立第二套營運系統。



TASK-0011 不重新定義既有 Frozen Block。



TASK-0011 Coding Readiness = PASS。



TASK-0011 = READY FOR CODING。

