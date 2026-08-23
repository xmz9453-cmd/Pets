\# TASK-0013 訂單執行 Order Execution v1.0



\## 1. Document Information



| Field | Value |

|---|---|

| Task ID | TASK-0013 |

| Task Name | 訂單執行 Order Execution |

| File Name | TASK-0013 訂單執行 Order Execution v1.0.md |

| Version | v1.0 |

| Status | FREEZE |

| Human Acceptance | PASS |

| Implementation | PASS |

| Verification | PASS |

| Freeze | PASS |



\## 2. Task Objective



TASK-0013 負責建立 PSOP MVP 的最小必要訂單執行能力。



Order 為一次實際消費交易的交易容器，與 Appointment、Service Execution、Payment 保持明確邊界。



本 TASK 必須支援：



\- Service Order

\- Product Order

\- Service + Product Mixed Order

\- Walk-in Order

\- Customer 關聯

\- Business Unit

\- Order Items

\- Transaction Price

\- Quantity

\- Item Amount

\- Total Amount

\- Order Status



本 TASK 遵循：



> 該寫的才寫。



不得引入不必要的企業級架構或超出 MVP Scope 的功能。



\## 3. Scope



\### 3.1 Product



建立 MVP 所需 Product 基礎資料能力，供 Order Item 使用。



\### 3.2 Order



建立 Order 建立、讀取、明細、更新能力。



\### 3.3 Order Item



Order Item 必須區分：



\- Service Item

\- Product Item



並保存本次交易的實際價格與數量。



\### 3.4 Walk-in Order



Order 不強制依賴 Appointment。



Walk-in 可直接建立：



Customer

→ Service / Product

→ Order



\### 3.5 Historical Transaction Price



Order Item 必須保存建立訂單當下的 Transaction Price。



Master Price 後續修改不得影響既有 Order。



\### 3.6 Order Total



Order Total Amount 必須由 Order Items 的實際交易資料計算。



\### 3.7 Order Status



Order Status 必須獨立於：



\- Appointment Status

\- Service Status

\- Payment Status



Order 可以存在未付款狀態。



\## 4. Out of Scope



以下不屬於 TASK-0013：



\- Payment Gateway

\- 第三方支付

\- 金流整合

\- 收據系統

\- 複雜付款拆分

\- 完整 Inventory

\- Stock Ledger

\- Warehouse

\- Room / Cage

\- Capacity

\- Medical

\- Scheduler / Cron

\- Notification

\- LINE API

\- Enterprise RBAC

\- Multi-Tenant

\- SaaS Architecture

\- Accounting System

\- Enterprise Abstraction

\- 新 Framework

\- 新 ORM

\- TypeScript

\- Tailwind

\- Prisma



\## 5. Technical Baseline



\### 5.1 Frontend



\- Next.js

\- Pages Router

\- JavaScript

\- Bootstrap



\### 5.2 Backend



\- Express.js

\- JavaScript



\### 5.3 Database



\- MySQL

\- mysql2



\### 5.4 Testing



\- Jest

\- Supertest



\### 5.5 Architecture



Frontend：



Next.js

→ Express.js API

→ mysql2

→ MySQL



Backend：



Route

→ Controller

→ Service

→ Repository



不得因 TASK-0013 改變既有 Technical Baseline。



\## 6. Database Requirements



\### 6.1 Migration



新增：



`011\_create\_products\_and\_orders.sql`



\### 6.2 Product



建立 Product 所需資料結構，供 Product CRUD 與 Order Item 使用。



\### 6.3 Order



Order 必須保存至少：



\- Order Identity

\- Customer Relationship

\- Business Unit

\- Status

\- Total Amount

\- Created At

\- Updated At



\### 6.4 Order Item



Order Item 必須保存：



\- Order Relationship

\- Item Type

\- Service Relationship（適用時）

\- Product Relationship（適用時）

\- Transaction Price

\- Quantity

\- Item Amount



\### 6.5 Integrity



Database 必須使用必要的：



\- Foreign Keys

\- Indexes

\- Constraints



不得建立不必要的 Enterprise Database Architecture。



\## 7. Backend Requirements



\### 7.1 Product API



實作 Product CRUD API。



\### 7.2 Order API



實作：



\- Order Create

\- Order List

\- Order Detail

\- Order Update



\### 7.3 Validation



必須驗證：



\- Customer

\- Business Unit

\- Service

\- Product

\- Quantity

\- Order Items

\- Empty Order

\- Order Status

\- 必要關聯完整性



\### 7.4 Authorization



所有受保護 API 必須遵循既有 Authentication / Authorization 模式。



未登入請求必須受到保護。



不得建立新的 RBAC 系統。



\## 8. Transaction Price Rules



建立 Order 時：



\- Service / Product Master Price 可作為交易價格來源。

\- Order Item 必須保存 Transaction Price。

\- Item Amount 必須由 Transaction Price × Quantity 計算。



例如：



Service：



800 × 1 = 800



Product：



200 × 2 = 400



Order Total：



1200



Master Price 後續修改：



> 不得改變既有 Order 的 Transaction Price。



\## 9. Business Unit Rules



Order 必須維持明確 Business Unit。



不得建立跨 Business Unit Order。



Business Unit 驗證必須在必要的 Service Layer / API Business Validation 中執行。



\## 10. Walk-in Rules



Walk-in Order 不需要 Appointment。



合法流程：



Customer

→ Service / Product

→ Order



不得因缺少 Appointment 而拒絕合法 Walk-in Order。



\## 11. Frontend Requirements



新增：



`orders.js`



並新增首頁「訂單」入口。



Order UI 必須提供：



\- 訂單

\- 客戶

\- Business Unit

\- 訂單狀態

\- 訂單明細

\- Service Item

\- Product Item

\- 數量

\- 交易單價

\- 小計

\- 總金額



並處理：



\- Loading

\- Error

\- Success

\- Empty State

\- Read-only / Completed State



\## 12. Traditional Chinese UI



所有使用者可見文字遵循：



UI 繁體中文化基準

Traditional Chinese UI Localization Baseline v1.0



TASK-0013 已驗證包含：



\- 訂單

\- 客戶

\- 服務

\- 商品

\- 數量

\- 交易價格

\- 總額

\- 訂單狀態

\- 未付款

\- 儲存

\- 成功訊息

\- 錯誤訊息



不得將原始 API / Database / Technical Error 直接顯示給使用者。



\## 13. Implemented Files



\### 13.1 Files Created



\- `011\_create\_products\_and\_orders.sql`

\- `order.repository.js`

\- `product.repository.js`

\- `order.service.js`

\- `product.service.js`

\- `order.controller.js`

\- `product.controller.js`

\- `order.routes.js`

\- `product.routes.js`

\- `orders.js`

\- `order.test.js`



\### 13.2 Files Modified



\- `app.js`

\- `client.js`

\- `index.js`

\- appointment test teardown

\- boarding test teardown

\- customer test teardown

\- daily-operations test teardown

\- grooming test teardown

\- pet test teardown

\- service test teardown



\### 13.3 Files Deleted



None.



\## 14. Testing



\### 14.1 Targeted Test



Result：



\- 1 suite passed

\- 4 tests passed

\- 0 failed



Status：



> PASS



\### 14.2 Full Regression



Result：



\- 13 test suites passed

\- 62 tests passed

\- 0 failed



Status：



> PASS



\### 14.3 Regression Scope



已確認：



\- Grooming regression：PASS

\- Boarding regression：PASS



\## 15. Browser E2E Verification



實際 Browser E2E 已完成：



Login

→ 訂單

→ 客戶

→ Service + Product

→ 數量 / Transaction Price

→ 總額 1290.00

→ 儲存

→ Reload

→ 確認明細

→ 確認總額

→ 確認「未付款」狀態



結果：



> PASS



Browser 驗證確認 Order 資料 Persistence 正常。



\## 16. Database Verification



Development Database：



> PASS



Test Database：



> PASS



Migration：



> PASS



已確認：



\- Product / Order / Order Item schema 建立

\- Database setup 正常

\- Required relationship 正常

\- Transaction data persistence 正常



\## 17. Frontend Verification



Frontend Build：



> PASS



`/orders` route：



> PASS



已確認：



\- Order UI 可載入

\- Order 操作流程正常

\- Traditional Chinese UI 正常

\- Error / Success 狀態正常

\- Order persistence 正常



\## 18. Repository Verification



Repository Verification：



> PASS



已確認：



\- 新增檔案正確

\- 修改檔案正確

\- 無刪除檔案

\- 無新增 dependency

\- 無 Frontend Build Error

\- 無 Backend touched-file Error

\- 無 TypeScript

\- 無 Tailwind

\- 無 Prisma

\- 無 Payment Gateway

\- 無 Inventory Expansion

\- 未回退 TASK-0001～TASK-0012



既有 TASK-0001～TASK-0012 工作樹變更均予以保留。



\## 19. Git Status



Branch：



`master`



Working Tree：



存在未提交變更。



包含：



\- TASK-0013 實作

\- 既有 TASK-0001～TASK-0012 變更



Git Commit：



> Not Created



本 TASK 未建立 Git Commit。



\## 20. Acceptance Criteria



| ID | Acceptance Criteria | Result |

|---|---|---|

| AC-01 | Order 建立 | PASS |

| AC-02 | Order 讀取 | PASS |

| AC-03 | Service Item | PASS |

| AC-04 | Product Item | PASS |

| AC-05 | Service + Product Mixed Order | PASS |

| AC-06 | Walk-in Order | PASS |

| AC-07 | Customer 關聯 | PASS |

| AC-08 | Business Unit Validation | PASS |

| AC-09 | Transaction Price | PASS |

| AC-10 | Historical Price Persistence | PASS |

| AC-11 | Quantity / Item Amount | PASS |

| AC-12 | Total Amount | PASS |

| AC-13 | Empty Order Validation | PASS |

| AC-14 | Order Status | PASS |

| AC-15 | Authorization | PASS |

| AC-16 | Database Persistence | PASS |

| AC-17 | Traditional Chinese UI | PASS |

| AC-18 | Browser E2E | PASS |

| AC-19 | Full Regression | PASS |

| AC-20 | Scope Boundary | PASS |



\## 21. Definition of Done



TASK-0013 必須符合：



\- \[x] Order Scope 完成

\- \[x] Product 基礎能力完成

\- \[x] Service Order 完成

\- \[x] Product Order 完成

\- \[x] Mixed Order 完成

\- \[x] Walk-in Order 完成

\- \[x] Customer 關聯完成

\- \[x] Business Unit Validation 完成

\- \[x] Transaction Price 完成

\- \[x] Historical Price Persistence 完成

\- \[x] Quantity / Item Amount 完成

\- \[x] Total Amount 完成

\- \[x] Order Status 完成

\- \[x] Authorization 完成

\- \[x] Database Verification PASS

\- \[x] API Verification PASS

\- \[x] Frontend Verification PASS

\- \[x] Traditional Chinese UI PASS

\- \[x] Targeted Tests PASS

\- \[x] Full Regression PASS

\- \[x] Frontend Build PASS

\- \[x] Browser E2E PASS

\- \[x] Repository Verification PASS

\- \[x] Human Acceptance PASS

\- \[x] Scope Boundary PASS



\## 22. Human Acceptance



Project Owner 已確認：



> 接受



Human Acceptance：



> PASS



TASK-0013 已通過 Project Owner Human Acceptance Gate。



\## 23. Freeze



TASK-0013：



> FREEZE



Freeze 前提：



\- Implementation PASS

\- Database Verification PASS

\- API Verification PASS

\- Frontend Verification PASS

\- Traditional Chinese UI PASS

\- Targeted Tests PASS

\- Full Regression PASS

\- Browser E2E PASS

\- Repository Verification PASS

\- Acceptance Criteria PASS

\- Human Acceptance PASS

\- No Blocking Issue



因此：



> \*\*TASK-0013 = FREEZE\*\*



\## 24. Freeze Boundary



TASK-0013 Freeze 後：



\- 本 TASK Scope 不得被後續 TASK 隨意改寫。

\- Transaction Price 規則不得被後續 TASK 隨意改變。

\- Order / Order Item 關係不得被後續 TASK 隨意重新設計。

\- 已驗證的 Business Unit 邊界不得被後續 TASK 隨意移除。

\- 已完成的 Traditional Chinese UI 不得被後續 TASK 無理由改回英文。

\- 後續 Payment、Report 或其他 TASK 如需與 Order 整合，必須透過明確的後續 TASK 進行。



\## 25. Final Status



TASK-0013 訂單執行 Order Execution：



> \*\*FREEZE\*\*



Implementation：



> PASS



Verification：



> PASS



Human Acceptance：



> PASS



Final Status：



> \*\*TASK-0013 = FREEZE\*\*

