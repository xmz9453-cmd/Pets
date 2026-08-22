\# TASK-0006 預約管理區塊 Appointment Management Block v1.0



\## 1. Document Information



| Field | Value |

|---|---|

| Task | TASK-0006 |

| 中文名稱 | 預約管理區塊 |

| English Name | Appointment Management Block |

| Version | v1.0 |

| Status | FREEZE |

| Project | Pet Shop Operations MVP |

| Document Type | Formal Engineering Specification |

| Architecture | Next.js Pages Router → Express.js → mysql2 → MySQL |

| Frontend | Next.js + JavaScript + Bootstrap |

| Backend | Express.js + JavaScript |

| Database | MySQL |

| ORM | None |

| Testing | Jest + Supertest |

| Browser Verification | Required |



\## 2. Task Objective



TASK-0006 負責建立 MVP 的 Appointment Business Block。



本 Task 的核心目標是讓店家能夠完成日常預約管理：



Customer

→ Pet

→ Appointment

→ Pet / Service

→ Staff Assignment



系統必須支援：



\- 建立預約

\- 查詢預約

\- 修改預約

\- 取消預約

\- 一筆預約包含多隻 Pet

\- 每隻 Pet 可包含不同 Service

\- Staff Assignment

\- 預約管理 Frontend UI

\- 基本資料驗證

\- Authorization

\- Automated Testing

\- Browser Verification



本 Task 不負責實際美容執行、住宿執行、訂單、付款或營運工作流程。



\---



\## 3. Scope



\### 3.1 In Scope



TASK-0006 包含：



1\. Appointment 基本資料

2\. Appointment 建立

3\. Appointment 查詢

4\. Appointment 修改

5\. Appointment 取消

6\. Customer 關聯

7\. 多 Pet

8\. Pet 個別 Service

9\. 多 Service

10\. Staff Assignment

11\. Appointment Status

12\. Appointment 管理頁面

13\. API

14\. Validation

15\. Authorization

16\. Transaction

17\. Automated Testing

18\. Browser Verification



\### 3.2 Out of Scope



以下內容不屬於 TASK-0006：



\- Service Management Block

\- Daily Operations

\- Grooming

\- Boarding

\- Order

\- Payment

\- Reminder

\- Notification

\- Schedule Engine

\- Capacity Management

\- Walk-in Domain

\- Booking Source

\- Audit / Version History

\- 線上客戶自行預約

\- LINE API

\- 多店管理

\- Enterprise RBAC



\---



\## 4. Business Model



\### 4.1 Appointment Structure



一筆 Appointment 屬於一個 Customer。



Appointment 可以包含一隻或多隻 Pet。



每一隻 Pet 可以包含一個或多個 Service。



資料關係：



&#x20;   Customer

&#x20;       │

&#x20;       └── Appointment

&#x20;             │

&#x20;             ├── Pet A

&#x20;             │     ├── Service 1

&#x20;             │     └── Service 2

&#x20;             │

&#x20;             └── Pet B

&#x20;                   └── Service 1



因此：



\- Appointment 不直接假設只有一隻 Pet

\- Service 必須能對應到特定 Pet

\- 不同 Pet 可以選擇不同 Service

\- 同一 Appointment 可以包含不同 Pet 的不同服務組合



\### 4.2 Appointment Lifecycle



MVP Appointment Lifecycle：



&#x20;   Scheduled

&#x20;       ↓

&#x20;   Confirmed

&#x20;       ↓

&#x20;   Cancelled



實際業務執行狀態由後續 Daily Operations / Grooming / Boarding Block 負責。



TASK-0006 不負責將 Appointment 轉換為 Grooming、Boarding、Order 或 Payment 狀態。



\### 4.3 Cancellation



取消 Appointment 必須保留原 Appointment 資料。



取消不是實體刪除。



取消後：



\- Appointment record 保留

\- Appointment items 保留

\- Customer relationship 保留

\- Pet relationship 保留

\- Service relationship 保留

\- Appointment 狀態變更為 Cancelled



\---



\## 5. Functional Requirements



\### 5.1 Create Appointment



系統必須提供建立 Appointment 功能。



建立時至少必須確認：



\- Customer 存在

\- Appointment date 存在

\- Appointment time 存在

\- 至少一隻 Pet

\- 每隻 Pet 至少一項 Service

\- 指定的 Pet 屬於該 Customer

\- 指定的 Service 為有效 Service

\- Staff Assignment 若有指定，Staff 必須存在且可使用



建立 Appointment 時，Appointment Header 與其 Pet / Service 關聯資料必須以 Transaction 完成。



\### 5.2 Read Appointment



系統必須提供：



\- Appointment List

\- Appointment Detail



Appointment Detail 必須能顯示：



\- Customer

\- Appointment Date

\- Appointment Time

\- Appointment Status

\- Assigned Staff

\- Pet

\- Pet 所選 Service



\### 5.3 Update Appointment



系統必須支援修改尚未取消的 Appointment。



可修改內容包括：



\- 日期

\- 時間

\- Pet / Service 組合

\- Staff Assignment

\- Appointment 相關備註資料（若該欄位存在於已確認資料模型）



修改必須重新執行必要 Validation。



修改 Appointment 與其 Pet / Service 關聯資料時，必須使用 Transaction。



\### 5.4 Cancel Appointment



系統必須提供取消 Appointment 功能。



取消：



\- 不使用 DELETE

\- 不移除資料

\- 將 Appointment 狀態更新為 Cancelled



已取消 Appointment 不得再次被當成一般可用預約直接修改為正常狀態。



\### 5.5 Multiple Pets



單一 Appointment 必須支援多 Pet。



例如：



&#x20;   Appointment #1001



&#x20;   Customer: 王小明



&#x20;   Pet A: 小白

&#x20;     - Basic Grooming

&#x20;     - Nail Trim



&#x20;   Pet B: 小黑

&#x20;     - Bath



\### 5.6 Pet-specific Services



Service 必須掛在 Appointment Pet Item 下。



不得只建立：



&#x20;   Appointment → Service



而忽略 Service 屬於哪一隻 Pet。



正確資料關係為：



&#x20;   Appointment

&#x20;     └── Appointment Pet

&#x20;           └── Appointment Pet Service



\### 5.7 Staff Assignment



Appointment 可以指定 Staff。



Staff Assignment 必須引用既有 Staff。



不得在 Appointment 中建立獨立的自由文字 Staff 名稱取代 Staff relationship。



Staff 的實際工作執行由後續 Daily Operations / Grooming / Boarding Block 負責。



\---



\## 6. Data Requirements



\### 6.1 Appointment



Appointment 必須至少具備：



\- id

\- customer\_id

\- appointment\_date

\- appointment\_time

\- status

\- created\_at

\- updated\_at



如已確認資料模型包含 staff assignment，則使用：



\- staff\_id



\### 6.2 Appointment Pet



Appointment Pet 必須至少具備：



\- id

\- appointment\_id

\- pet\_id



\### 6.3 Appointment Pet Service



Appointment Pet Service 必須至少具備：



\- id

\- appointment\_pet\_id

\- service\_id



\### 6.4 Relationships



必須維持以下關係：



&#x20;   Customer 1

&#x20;       ↓

&#x20;   Appointment N



&#x20;   Appointment 1

&#x20;       ↓

&#x20;   Appointment Pet N



&#x20;   Appointment Pet 1

&#x20;       ↓

&#x20;   Appointment Pet Service N



&#x20;   Pet 1

&#x20;       ↓

&#x20;   Appointment Pet N



&#x20;   Service 1

&#x20;       ↓

&#x20;   Appointment Pet Service N



\---



\## 7. Data Integrity



\### 7.1 Customer Ownership



Appointment 所使用的 Pet 必須屬於該 Appointment 的 Customer。



不得建立：



&#x20;   Customer A

&#x20;       ↓

&#x20;   Appointment

&#x20;       ↓

&#x20;   Customer B's Pet



\### 7.2 Foreign Key Integrity



以下關係必須保持資料完整性：



\- appointment.customer\_id → customer

\- appointment\_pet.appointment\_id → appointment

\- appointment\_pet.pet\_id → pet

\- appointment\_pet\_service.appointment\_pet\_id → appointment\_pet

\- appointment\_pet\_service.service\_id → service

\- appointment.staff\_id → staff（若使用 staff assignment）



\### 7.3 Historical Preservation



取消 Appointment 不得刪除其歷史關聯資料。



後續 Order、Payment、Daily Operations 等 Block 若需要讀取歷史資料，必須能取得原 Appointment 關係。



\---



\## 8. API Requirements



API 必須由 Express.js 提供。



\### 8.1 Appointment List



&#x20;   GET /api/appointments



用途：



\- 取得 Appointment List

\- 支援基本查詢條件

\- 回傳 Appointment 基本資訊



\### 8.2 Appointment Detail



&#x20;   GET /api/appointments/:id



用途：



\- 取得單筆 Appointment 完整資料

\- 包含 Customer

\- 包含 Pets

\- 包含各 Pet Services

\- 包含 Staff Assignment

\- 包含 Status



\### 8.3 Create



&#x20;   POST /api/appointments



用途：



\- 建立 Appointment

\- 建立 Appointment Pet

\- 建立 Appointment Pet Service



必須以 Transaction 完成。



\### 8.4 Update



&#x20;   PUT /api/appointments/:id



用途：



\- 修改 Appointment

\- 更新 Pet / Service 組合

\- 更新 Staff Assignment

\- 更新日期與時間



必須執行必要 Validation。



涉及多張資料表時必須使用 Transaction。



\### 8.5 Cancel



&#x20;   PATCH /api/appointments/:id/cancel



用途：



\- 將 Appointment 設為 Cancelled



不得使用 DELETE。



\---



\## 9. API Response Requirements



成功 Response 必須：



\- 使用一致 HTTP Status Code

\- 回傳可供 Frontend 使用的 JSON

\- 不回傳不必要的 database implementation detail



失敗 Response 必須：



\- 使用適當 HTTP Status Code

\- 回傳可理解的 error message

\- 不暴露 SQL error 或內部 stack trace



\---



\## 10. Validation



\### 10.1 Create Validation



建立 Appointment 時必須驗證：



\- Customer ID 必填

\- Customer 必須存在

\- Appointment Date 必填

\- Appointment Time 必填

\- 至少一隻 Pet

\- 每隻 Pet 至少一項 Service

\- Pet 必須屬於 Customer

\- Service 必須存在且為可使用狀態

\- Staff 若指定，必須存在



\### 10.2 Update Validation



修改 Appointment 時：



\- Appointment 必須存在

\- Appointment 不得為 Cancelled

\- 修改資料必須重新驗證

\- Pet 必須屬於 Customer

\- Service 必須有效

\- Staff 必須有效



\### 10.3 Cancel Validation



取消時：



\- Appointment 必須存在

\- 已 Cancelled 的 Appointment 不得重複取消



\---



\## 11. Authorization



TASK-0006 採用 MVP 簡化角色模型。



\### 11.1 Owner



Owner：



\- 可建立 Appointment

\- 可查詢 Appointment

\- 可修改 Appointment

\- 可取消 Appointment



\### 11.2 Front Desk



Front Desk：



\- 可建立 Appointment

\- 可查詢 Appointment

\- 可修改 Appointment

\- 可取消 Appointment



\### 11.3 Groomer



Groomer 的 Appointment 權限依 MVP 已確認角色規則實作。



不得藉由 Frontend 隱藏按鈕取代 Backend Authorization。



所有受限制 API 必須在 Backend 驗證權限。



\### 11.4 Authorization Rule



Frontend UI Permission 與 Backend API Authorization 必須同時存在。



即使使用者直接呼叫 API，也不得繞過權限限制。



\---



\## 12. Transaction Requirements



以下操作必須使用 Transaction：



\### 12.1 Create Transaction



建立 Appointment 時：



1\. 建立 Appointment

2\. 建立 Appointment Pet

3\. 建立 Appointment Pet Service

4\. Commit



任何一步失敗：



\- Rollback

\- 不留下半完成 Appointment

\- 不留下孤立 Appointment Pet

\- 不留下孤立 Appointment Pet Service



\### 12.2 Update Transaction



修改 Appointment 關聯資料時：



1\. 開始 Transaction

2\. 更新 Appointment

3\. 更新 Appointment Pet

4\. 更新 Appointment Pet Service

5\. Commit



任何一步失敗：



\- Rollback

\- Appointment 維持修改前狀態



\### 12.3 Cancel Transaction



取消 Appointment 至少必須確保：



\- Appointment status 更新成功

\- Transaction Commit



若更新失敗：



\- Rollback

\- Appointment Status 不變



\---



\## 13. Frontend Requirements



Frontend 使用：



\- Next.js Pages Router

\- JavaScript

\- Bootstrap



不得使用：



\- TypeScript

\- Tailwind CSS



\### 13.1 Appointment List Page



必須提供 Appointment List。



至少顯示：



\- Date

\- Time

\- Customer

\- Pet

\- Service

\- Staff

\- Status



使用者必須能進入 Appointment Detail。



\### 13.2 Appointment Create Page



建立頁面必須提供：



\- Customer 選擇

\- Pet 選擇

\- Service 選擇

\- 多 Pet

\- Pet 個別 Service

\- Appointment Date

\- Appointment Time

\- Staff Assignment

\- Save



\### 13.3 Appointment Edit Page



修改頁面必須：



\- 載入既有 Appointment

\- 顯示既有 Customer

\- 顯示既有 Pet / Service

\- 顯示既有 Staff

\- 允許修改可修改資料

\- Save

\- Cancel



\### 13.4 Cancel UI



未取消 Appointment 必須提供 Cancel Action。



取消前必須要求使用者確認。



取消成功後：



\- UI 顯示 Cancelled

\- 不再顯示一般修改操作

\- 不刪除歷史資料



\### 13.5 Loading / Error



Frontend 必須處理：



\- Loading

\- API Error

\- Validation Error

\- Empty State



不得讓 API Error 直接造成頁面無法使用。



\---



\## 14. UI Language



所有正式 UI 使用繁體中文。



技術名稱可以在工程文件或必要情況下保留 English terminology。



使用者操作介面不得混用未必要的簡體中文。



\---



\## 15. Appointment Status



MVP Appointment 至少支援：



\- Scheduled

\- Confirmed

\- Cancelled



Status 必須具有明確語意。



Cancelled 是終止狀態。



不得透過刪除資料代表取消。



\---



\## 16. Testing Requirements



\### 16.1 Backend Unit / Integration Testing



使用：



\- Jest

\- Supertest



至少必須驗證：



\- Create Appointment

\- Read Appointment

\- Read Appointment Detail

\- Update Appointment

\- Cancel Appointment

\- Multiple Pets

\- Pet-specific Services

\- Staff Assignment

\- Customer / Pet relationship validation

\- Service validation

\- Cancelled Appointment protection

\- Authorization

\- Transaction rollback



\### 16.2 Create Transaction Test



測試故意讓關聯資料建立失敗。



驗證：



\- Appointment 不存在

\- Appointment Pet 不存在

\- Appointment Pet Service 不存在



確認完整 Rollback。



\### 16.3 Update Transaction Test



測試故意讓更新流程中途失敗。



驗證：



\- Appointment 原資料保持不變

\- Pet relationship 保持不變

\- Service relationship 保持不變

\- Staff Assignment 保持不變



\### 16.4 Authorization Test



測試未授權角色直接呼叫受限 API。



必須確認：



\- API 拒絕請求

\- 資料未被修改



\---



\## 17. Browser Verification



Browser Verification 必須實際驗證主要使用流程。



\### 17.1 Create Workflow



&#x20;   Login

&#x20;   ↓

&#x20;   Appointment List

&#x20;   ↓

&#x20;   Create Appointment

&#x20;   ↓

&#x20;   Select Customer

&#x20;   ↓

&#x20;   Select Pet

&#x20;   ↓

&#x20;   Select Service

&#x20;   ↓

&#x20;   Add another Pet

&#x20;   ↓

&#x20;   Select another Service

&#x20;   ↓

&#x20;   Assign Staff

&#x20;   ↓

&#x20;   Save

&#x20;   ↓

&#x20;   Appointment Detail



結果：



\- PASS



\### 17.2 Read Workflow



&#x20;   Appointment List

&#x20;   ↓

&#x20;   Open Detail

&#x20;   ↓

&#x20;   Verify Customer

&#x20;   ↓

&#x20;   Verify all Pets

&#x20;   ↓

&#x20;   Verify each Pet Services

&#x20;   ↓

&#x20;   Verify Staff

&#x20;   ↓

&#x20;   Verify Status



結果：



\- PASS



\### 17.3 Update Workflow



&#x20;   Appointment Detail

&#x20;   ↓

&#x20;   Edit

&#x20;   ↓

&#x20;   Change Appointment Data

&#x20;   ↓

&#x20;   Save

&#x20;   ↓

&#x20;   Reload

&#x20;   ↓

&#x20;   Verify Persistence



結果：



\- PASS



\### 17.4 Cancel Workflow



&#x20;   Appointment Detail

&#x20;   ↓

&#x20;   Cancel

&#x20;   ↓

&#x20;   Confirm

&#x20;   ↓

&#x20;   Status = Cancelled

&#x20;   ↓

&#x20;   Reload

&#x20;   ↓

&#x20;   Verify Historical Data



結果：



\- PASS



\---



\## 18. Regression Requirements



TASK-0006 不得破壞既有功能。



至少必須確認：



\- Application 啟動正常

\- Authentication / Staff 基礎功能正常

\- Shop Settings 正常

\- Customer Block 正常

\- Pet Block 正常

\- Service Block 正常

\- Existing API 不因 Appointment 新增而失效

\- Existing Frontend 不因 Appointment 新增而失效

\- Database schema migration / setup 不破壞既有資料結構



\---



\## 19. Definition of Done



TASK-0006 僅在以下條件全部成立時視為完成：



\### Specification



\- \[x] Appointment Business Scope 已確認

\- \[x] Out of Scope 已確認

\- \[x] Appointment Lifecycle 已確認

\- \[x] Multi-Pet 已確認

\- \[x] Pet-specific Service 已確認

\- \[x] Staff Assignment 已確認



\### Backend



\- \[ ] Appointment CRUD / lifecycle API 完成

\- \[ ] Cancel API 完成

\- \[ ] Validation 完成

\- \[ ] Authorization 完成

\- \[ ] Transaction 完成

\- \[ ] Error Handling 完成



\### Database



\- \[ ] Appointment schema 完成

\- \[ ] Appointment Pet relationship 完成

\- \[ ] Appointment Pet Service relationship 完成

\- \[ ] Foreign Key integrity 完成



\### Frontend



\- \[ ] Appointment List 完成

\- \[ ] Appointment Create 完成

\- \[ ] Appointment Detail 完成

\- \[ ] Appointment Edit 完成

\- \[ ] Appointment Cancel 完成

\- \[ ] Loading / Error / Empty State 完成

\- \[ ] 繁體中文 UI 完成



\### Testing



\- \[ ] Jest 測試完成

\- \[ ] Supertest API 測試完成

\- \[ ] Authorization 測試完成

\- \[ ] Validation 測試完成

\- \[ ] Transaction Rollback 測試完成

\- \[ ] Multi-Pet 測試完成

\- \[ ] Pet-specific Service 測試完成



\### Verification



\- \[ ] Browser Create Workflow PASS

\- \[ ] Browser Read Workflow PASS

\- \[ ] Browser Update Workflow PASS

\- \[ ] Browser Cancel Workflow PASS

\- \[ ] Regression PASS



\---



\## 20. Freeze Boundary



TASK-0006 Freeze 後，不得自行加入以下功能：



\- Reminder

\- Notification

\- Schedule Engine

\- Capacity Management

\- Walk-in Domain

\- Booking Source

\- Audit / Version History

\- Online Customer Booking

\- LINE API

\- Order

\- Payment

\- Grooming Execution

\- Boarding Execution

\- Daily Operations



上述功能必須由後續 Task / Block 處理。



TASK-0006 的責任邊界維持：



&#x20;   Customer

&#x20;       ↓

&#x20;   Appointment

&#x20;       ↓

&#x20;   Pet

&#x20;       ↓

&#x20;   Service

&#x20;       ↓

&#x20;   Staff Assignment



Appointment 負責「預約管理」。



不負責「實際工作執行」。



\---



\## 21. Final Status



TASK-0006 = FREEZE



正式名稱：



TASK-0006 預約管理區塊 Appointment Management Block v1.0



Freeze 原則：



> Appointment 負責建立、查詢、修改、取消預約，以及多 Pet、多 Service、Pet 個別 Service 與 Staff Assignment；後續 Daily Operations、Grooming、Boarding、Order、Payment 等 Block 不得回寫或擴張 TASK-0006 的既定責任邊界。

