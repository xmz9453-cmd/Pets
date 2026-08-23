\# TASK-0013 FREEZE — 訂單執行 Order Execution



\*\*Document Type:\*\* Formal Engineering Document

\*\*Task ID:\*\* TASK-0013

\*\*Task Name:\*\* 訂單執行（Order Execution）

\*\*Version:\*\* v1.0

\*\*Status:\*\* FREEZE

\*\*Project:\*\* Pet Shop Operations System MVP

\*\*Previous Task:\*\* TASK-0012 Boarding Execution

\*\*Acceptance:\*\* PASS

\*\*Freeze Decision:\*\* Approved by Project Owner



\---



\# 1. Document Information



| Field | Value |

|---|---|

| Task ID | TASK-0013 |

| Task Name | 訂單執行（Order Execution） |

| Version | v1.0 |

| Status | FREEZE |

| Acceptance | PASS |

| Implementation Mode | AI Coding |

| Previous Task | TASK-0012 |

| Next Task | TASK-0014 |

| Primary Business Object | Order |

| UI Language | Traditional Chinese |

| Architecture | Next.js → Express.js → mysql2 → MySQL |



\---



\# 2. Task Objective



TASK-0013 負責建立 MVP 所需的 Order 執行能力。



Order 的定位為：



> 一次實際消費交易的交易容器。



Order 可承載：



\- Service

\- Product

\- Service + Product



Order 與 Service、Appointment、Payment 必須維持獨立的 Business Object 邊界。



本 Task 以最小必要工程範圍完成 Order 建立、內容管理、金額保存、狀態管理及既有營運流程整合。



\---



\# 3. Scope



\## 3.1 In Scope



本 Task 包含：



\- Order 建立

\- Order 查詢

\- Order Item 管理

\- Service Item

\- Product Item

\- Transaction Price

\- Order Status

\- Order 與 Customer 關係

\- Order 與 Service 關係

\- Order 與 Product 關係

\- Order 與既有 Daily Operations / Service 流程的必要整合

\- Walk-in Order

\- Appointment / Service 所產生的 Order

\- Order 總金額計算

\- Order 狀態保存

\- Traditional Chinese UI

\- API

\- Authorization

\- Validation

\- Persistence

\- Targeted Testing

\- Full Regression

\- Browser Verification



\---



\# 4. Business Rules



\## 4.1 Order Definition



Order 表示：



> 一次實際消費交易的容器。



Order 不等於 Appointment。



Order 不等於 Service。



Order 不等於 Payment。



\---



\## 4.2 Order Composition



Order 可以包含：



\- Service

\- Product

\- Service + Product



以下均為合法情境：



&#x20;   Order

&#x20;   └── Grooming



&#x20;   Order

&#x20;   ├── Cat Food

&#x20;   └── Cat Toy



&#x20;   Order

&#x20;   ├── Grooming

&#x20;   ├── Shampoo

&#x20;   └── Snack



\---



\## 4.3 Order and Pet



Order 不要求直接指定單一 Pet。



Product-only Order 可以沒有特定 Pet。



Service Item 的 Pet 關係應由 Service 關係取得，不應無必要重複儲存相同 Business Data。



\---



\## 4.4 Walk-in



Walk-in 不需要 Appointment。



合法流程：



&#x20;   Walk-in

&#x20;      ↓

&#x20;   Service / Product

&#x20;      ↓

&#x20;   Order

&#x20;      ↓

&#x20;   Payment



\---



\## 4.5 Transaction Price



Order Item 必須保存本次實際交易價格。



歷史交易價格不得因 Service 或 Product Master 的目前價格修改而被重新計算。



\---



\## 4.6 Order Status Independence



Order Status 必須獨立存在。



例如：



&#x20;   Service = Completed

&#x20;   Order = Unpaid

&#x20;   Appointment = Not Completed



屬於合法的中間狀態。



\---



\## 4.7 Payment Independence



Order Paid 表示本次 Order 已完成付款。



Payment 是 Order 的收款紀錄，不等於 Order 本身。



Payment 不屬於本 Task 的完整 Payment Management 實作範圍。



\---



\## 4.8 Historical Data



重要歷史交易資料必須保留。



不得透過刪除 Order 或 Order Item 的方式破壞歷史交易紀錄。



\---



\## 4.9 Business Unit Integrity



Order 必須維持明確 Business Unit。



不得建立跨 Business Unit 的 Order。



例如：



&#x20;   Dog Service

&#x20;   +

&#x20;   Cat Service



不得存在於同一 Order。



\---



\# 5. Functional Requirements



\## 5.1 Create Order



系統必須能建立 Order。



建立 Order 時必須驗證：



\- Customer 關係

\- Business Unit

\- Order Item

\- Service 關係

\- Product 關係

\- Transaction Price



\---



\## 5.2 Read Order



系統必須能取得：



\- Order Identity

\- Customer

\- Business Unit

\- Order Status

\- Order Items

\- Service Items

\- Product Items

\- Transaction Prices

\- Total Amount

\- Created / Updated Information



\---



\## 5.3 Order Items



Order Item 必須能區分：



\- Service Item

\- Product Item



不得將 Service 與 Product 混為無法辨識的單一資料型態。



\---



\## 5.4 Service Item



Service Item 必須能對應既有 Service。



Service 的實際執行資料不得因建立 Order 而被重新建立。



\---



\## 5.5 Product Item



Product Item 必須能對應 Product。



Product Item 必須保存本次交易所使用的價格。



\---



\## 5.6 Total Amount



Order Total Amount 必須依 Order Items 的實際交易價格計算。



不得使用目前 Master Price 取代已保存的 Transaction Price。



\---



\# 6. API Requirements



Order API 必須遵循既有 Express.js API 架構。



必要能力至少包含：



\- Order Create

\- Order List / Read

\- Order Detail

\- Order Update



實際 Endpoint 命名必須與既有 Repository / Controller / Route 結構一致。



API 必須包含：



\- Authentication

\- Authorization

\- Request Validation

\- Business Validation

\- Error Handling



不得新增與本 Task 無關的 API Framework 或 Enterprise Abstraction。



\---



\# 7. Authorization



Order API 必須受到既有 Authentication / Authorization 保護。



未登入使用者不得直接存取受保護 Order API。



使用者只能操作其既有 Role / Business Unit Scope 所允許的資料。



本 Task 不建立新的 RBAC Framework。



\---



\# 8. Validation



Order 建立與修改時至少必須驗證：



\- Customer 存在

\- Service 存在時，Service 必須有效

\- Product 存在時，Product 必須有效

\- Service / Product 必須符合 Order Business Unit

\- Order Item 必須具有有效交易價格

\- 不允許建立空 Order

\- 不允許建立跨 BU Order

\- 不允許引用不存在的 Business Object

\- 不允許破壞已完成交易的歷史價格



\---



\# 9. Database Requirements



資料庫必須保存 Order 所需的：



\- Order Identity

\- Customer Relationship

\- Business Unit

\- Status

\- Order Items

\- Service Relationship

\- Product Relationship

\- Transaction Price

\- Quantity

\- Item Amount

\- Total Amount

\- Created At

\- Updated At



Database Relationship 必須使用既有 MySQL / mysql2 架構。



不得導入 Prisma 或其他 ORM。



\---



\# 10. Frontend Requirements



Order UI 必須使用：



\- Next.js Pages Router

\- JavaScript

\- Bootstrap

\- Traditional Chinese



不得使用：



\- TypeScript

\- Tailwind



\---



\## 10.1 Order UI



Order 頁面至少應能顯示：



\- 訂單

\- 客戶

\- Business Unit

\- 訂單狀態

\- 訂單項目

\- 服務項目

\- 商品項目

\- 單價

\- 數量

\- 小計

\- 訂單總額



\---



\## 10.2 UI State



必須處理：



\- Loading

\- Error

\- Success

\- Empty State

\- Read-only / Completed State



已完成或不可修改的歷史交易不得提供不符合 Business Rule 的編輯操作。



\---



\# 11. Traditional Chinese UI



UI 必須遵循：



> Traditional Chinese UI Localization Baseline v1.0



Order 相關使用者可見文字必須使用繁體中文。



至少包含：



\- 訂單

\- 訂單明細

\- 服務

\- 商品

\- 數量

\- 單價

\- 小計

\- 總金額

\- 訂單狀態

\- 未付款

\- 已付款

\- 儲存

\- 建立訂單

\- 錯誤訊息

\- 成功訊息



不得將已知使用者可見的英文 Business Error Message 直接呈現給使用者。



\---



\# 12. Testing Requirements



必須提供 Order targeted tests。



至少驗證：



\- Create Order

\- Read Order

\- Service Item

\- Product Item

\- Mixed Order

\- Transaction Price

\- Total Amount

\- Walk-in Order

\- Business Unit Validation

\- Invalid Reference

\- Authorization

\- Invalid Order Data

\- Historical Transaction Price

\- Order Status



\---



\# 13. Browser Verification



若 TASK-0013 包含 UI，必須進行實際 Browser E2E。



至少驗證：



&#x20;   Login

&#x20;     ↓

&#x20;   進入 Order

&#x20;     ↓

&#x20;   建立 / 開啟 Order

&#x20;     ↓

&#x20;   確認 Customer

&#x20;     ↓

&#x20;   確認 Service / Product

&#x20;     ↓

&#x20;   確認 Order Items

&#x20;     ↓

&#x20;   確認 Transaction Price

&#x20;     ↓

&#x20;   確認 Total Amount

&#x20;     ↓

&#x20;   儲存

&#x20;     ↓

&#x20;   Reload

&#x20;     ↓

&#x20;   確認資料仍存在

&#x20;     ↓

&#x20;   確認狀態



不得僅以 Jest / Supertest PASS 宣稱 Browser E2E PASS。



\---



\# 14. Regression



TASK-0013 Verification 必須包含：



\- Order targeted tests

\- Full regression

\- Frontend build

\- 必要 Browser E2E

\- Repository verification



TASK-0011 Grooming 與 TASK-0012 Boarding 不得因 TASK-0013 實作而退化。



\---



\# 15. Scope Boundary



本 Task 不包含：



\- 完整 Payment Management

\- Payment Gateway

\- LINE API

\- Notification API

\- Product Inventory

\- Stock Management

\- Room / Cage Management

\- Boarding Capacity

\- Medical System

\- Scheduler / Cron

\- Enterprise RBAC

\- SaaS Multi-Tenancy

\- 新 Framework

\- TypeScript

\- Tailwind

\- 不必要的 Enterprise Abstraction



\---



\# 16. Stop Conditions



若發生以下情況，AI Coding 必須 STOP：



\- 發現 Frozen Specification Conflict

\- 發現既有 Freeze 邊界衝突

\- 必須改動 TASK-0011 Frozen Scope

\- 必須改動 TASK-0012 Frozen Scope

\- 必須更換既定 Technology Stack

\- 必須引入新的大型 Framework

\- 必須建立本 Task Scope 外 Business Feature

\- 無法確認正式規格

\- 可能破壞既有功能

\- 必須進行不可逆或高風險資料操作



遇到 Stop Condition：



> STOP 並回報，不得自行決定。



\---



\# 17. Definition of Done



TASK-0013 必須同時符合：



\- \[x] Decision completed

\- \[x] Coding Readiness completed

\- \[x] Scope verified

\- \[x] Order implementation completed

\- \[x] API verified

\- \[x] Database verified

\- \[x] Frontend verified

\- \[x] Traditional Chinese UI verified

\- \[x] Targeted tests passed

\- \[x] Full regression passed

\- \[x] Browser verification completed

\- \[x] Existing TASK-0011 preserved

\- \[x] Existing TASK-0012 preserved

\- \[x] No unauthorized scope expansion

\- \[x] Human Acceptance granted

\- \[x] TASK-0013 Freeze approved



\---



\# 18. Acceptance Criteria



| ID | Acceptance Criteria | Status |

|---|---|---|

| AC-01 | Order 可以建立 | PASS |

| AC-02 | Order 可以查詢 | PASS |

| AC-03 | Order Item 可以保存 | PASS |

| AC-04 | Service Item 可以加入 Order | PASS |

| AC-05 | Product Item 可以加入 Order | PASS |

| AC-06 | Service + Product Mixed Order 可以處理 | PASS |

| AC-07 | Walk-in Order 可以處理 | PASS |

| AC-08 | Transaction Price 可以保存 | PASS |

| AC-09 | Total Amount 正確 | PASS |

| AC-10 | Business Unit Integrity 驗證 | PASS |

| AC-11 | Authorization 驗證 | PASS |

| AC-12 | Validation 驗證 | PASS |

| AC-13 | Order Persistence 驗證 | PASS |

| AC-14 | Traditional Chinese UI 驗證 | PASS |

| AC-15 | Browser E2E 驗證 | PASS |

| AC-16 | Targeted Tests 驗證 | PASS |

| AC-17 | Full Regression 驗證 | PASS |

| AC-18 | Frontend Build 驗證 | PASS |

| AC-19 | Scope Boundary 驗證 | PASS |

| AC-20 | Existing TASK-0011 / TASK-0012 未被破壞 | PASS |



\---



\# 19. Human Acceptance



Project Owner 已確認：



> \*\*TASK-0013 接受。\*\*



因此 TASK-0013 已通過 Human Acceptance Gate。



Human Acceptance：



> \*\*PASS\*\*



\---



\# 20. Freeze Decision



TASK-0013 已完成：



\- Decision

\- Coding Readiness

\- AI Coding

\- Verification

\- Human Acceptance



本 Task 現正式進入：



> \*\*FREEZE\*\*



Freeze Status：



> \*\*TASK-0013 = FREEZE\*\*



Freeze 後，TASK-0013 的 Scope、Business Rules、Acceptance Criteria 與已確認工程邊界不得在後續 TASK 中任意修改。



若未來確實需要變更，必須透過正式 Change / Revision 流程處理。



\---



\# 21. Verification Status



Final Verification Status：



> \*\*PASS\*\*



Human Acceptance：



> \*\*PASS\*\*



Freeze：



> \*\*PASS\*\*



Final Task Status：



> \*\*TASK-0013 = FREEZE\*\*



\---



\# 22. Next Task Boundary



TASK-0013 完成後，下一個工程工作為：



> \*\*TASK-0014\*\*



TASK-0014 必須重新依既有流程開始：



&#x20;   TASK-0013 FREEZE

&#x20;         ↓

&#x20;   TASK-0014 Decision

&#x20;         ↓

&#x20;   Coding Readiness

&#x20;         ↓

&#x20;   AI Coding

&#x20;         ↓

&#x20;   Verification

&#x20;         ↓

&#x20;   Human Acceptance

&#x20;         ↓

&#x20;   TASK-0014 FREEZE

&#x20;         ↓

&#x20;   TASK-0014 Formal Engineering Document



不得跳過 Decision、Coding Readiness、Verification 或 Human Acceptance。



\---



\# 23. Document Control



| Field | Value |

|---|---|

| Document | TASK-0013 訂單執行 Order Execution |

| Version | v1.0 |

| Status | FREEZE |

| Acceptance | PASS |

| Freeze | PASS |

| Owner | Project Owner |

| Implementation | AI Coding |

| Review | Engineering Review |

| UI Standard | Traditional Chinese UI Localization Baseline v1.0 |

| Coding Standard | TASK-CODING-AI-EXECUTION-PROMPT-v1.0.md |



\---



\# 24. Final Status



> \*\*TASK-0013 — 訂單執行 Order Execution = FREEZE\*\*



\*\*End of Document\*\*
