\# PHASE-21-MVP整合與實作就緒規格-MVP-Integration-and-Implementation-Readiness-Specification-v1.0.md



\# PHASE 21 — MVP 整合與實作就緒規格

\# MVP Integration \& Implementation Readiness Specification



\---



\## 1. Document Information



| 項目 | 內容 |

|---|---|

| Phase | PHASE 21 |

| 中文名稱 | MVP 整合與實作就緒 |

| English Name | MVP Integration \& Implementation Readiness |

| Version | v1.0 |

| Status | \*\*FREEZE\*\* |

| Previous Phase | PHASE 20 |

| Next Stage | Implementation |

| Document Type | Formal Phase Specification |



\---



\# 2. Purpose



PHASE 21 的目的不是增加新的 MVP Business Block，也不是重新設計既有 Phase。



本 Phase 的核心目的為：



> \*\*確認目前已完成 Freeze 的 MVP 產品、業務流程、Business Blocks、技術架構與各 Block 規格，是否已經具備正式進入工程實作的條件。\*\*



PHASE 21 是 MVP 規劃階段與工程實作階段之間的：



> \*\*Implementation Readiness Gate\*\*



本 Phase 完成並 Freeze 後，專案正式由：



```text

Decision / Design Mode

```



轉換為：



```text

Implementation Mode

```



\---



\# 3. Phase 21 Scope



PHASE 21 包含：



1\. MVP End-to-End Integration

2\. Cross-Block Responsibility Verification

3\. Cross-Block Data Handoff

4\. MVP Screen Scope Readiness

5\. MVP API Scope Readiness

6\. MVP Data Readiness

7\. Role / Operation Readiness

8\. MVP Simplification Boundary

9\. Block Implementation Order

10\. Block PASS Gate

11\. Browser Verification

12\. End-to-End Acceptance

13\. Change Request Handling

14\. Implementation Readiness Gate



\---



\# 4. Explicit Non-Goals



PHASE 21 不包含：



\- 新增 MVP Business Block

\- 重新設計既有 Business Block

\- 推翻 PHASE 1～20 Freeze

\- 建立完整 Database Schema

\- 直接建立 Production Database

\- 直接撰寫完整 API

\- 直接撰寫 Frontend

\- 直接撰寫 Backend

\- 建立企業級 RBAC

\- 建立 V2 功能

\- 建立完整 Inventory

\- 建立完整 CRM

\- 建立 BI

\- 建立第三方金流

\- 建立 LINE API

\- 建立線上自助預約平台

\- 建立其他非 MVP 功能



PHASE 21 的任務是：



> \*\*確認可以開始實作，而不是開始實作。\*\*



\---



\# 5. Previous Freeze Baseline



PHASE 21 必須建立在 PHASE 1～20 已 Freeze 的決策之上。



目前基準：



```text

PHASE 1  → FREEZE

PHASE 2  → FREEZE

PHASE 3  → FREEZE

PHASE 4  → FREEZE

PHASE 5  → FREEZE

PHASE 6  → FREEZE

PHASE 7  → FREEZE

PHASE 8  → FREEZE

PHASE 9  → FREEZE

PHASE 10 → FREEZE

PHASE 11 → FREEZE

PHASE 12 → FREEZE

PHASE 13 → FREEZE

PHASE 14 → FREEZE

PHASE 15 → FREEZE

PHASE 16 → FREEZE

PHASE 17 → FREEZE

PHASE 18 → FREEZE

PHASE 19 → FREEZE

PHASE 20 → FREEZE

```



PHASE 21 不得自行重新定義上述 Phase。



\---



\# 6. MVP Business Block Baseline



PHASE 21 維持既有 13 個核心 Business Blocks：



1\. Staff / Authentication

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



PHASE 21：



> \*\*不得新增第 14 個 MVP Business Block。\*\*



如未來產生新的功能需求，依 Change Request 規則處理。



\---



\# 7. Business Responsibility Baseline



\## 7.1 Customer



```text

Customer = 誰是客戶

```



Customer 負責：



\- 客戶基本資料

\- 客戶識別

\- 客戶狀態

\- 客戶查詢

\- 客戶維護



\---



\## 7.2 Pet



```text

Pet = 哪一隻寵物

```



一個 Customer 可以擁有多隻 Pet。



\---



\## 7.3 Service



```text

Service = 店家提供什麼服務

```



Service 定義店家可提供的服務。



\---



\## 7.4 Appointment



```text

Appointment = 客戶預約什麼、什麼時間來

```



重要規則：



> Appointment 不等於實際服務執行。



\---



\## 7.5 Daily Operations



```text

Daily Operations = 店員每天工作的操作中心

```



Daily Operations：



\- 可以操作其他 Block

\- 可以串接營運流程

\- 不擁有其他 Block 的核心資料



第一版：



> 不建立獨立 Daily Operations 資料來源。



\---



\## 7.6 Grooming



```text

Grooming = 實際美容執行

```



Appointment 與 Grooming 必須保持責任區隔。



\---



\## 7.7 Boarding



Boarding 負責實際住宿生命週期：



```text

預約住宿

↓

入住

↓

住宿中

↓

退房

```



\---



\## 7.8 Order



```text

Order = 客戶這次買了什麼

```



Order 可以來自：



\- Appointment 服務

\- Walk-in 商品



Order 不強制依賴 Appointment。



\---



\## 7.9 Payment



```text

Payment = 客戶怎麼付款、付了多少

```



Order 與 Payment 分離。



\---



\## 7.10 Product



第一版：



> 基本商品販售能力。



Product 不等於完整 Inventory。



\---



\## 7.11 Report



第一版：



> 基本營運統計。



不建立企業級 BI。



\---



\# 8. MVP End-to-End Integration



PHASE 21 正式確認 MVP 必須具備跨 Block 的完整營運流程。



\---



\## 8.1 預約服務 Happy Path



核心流程：



```text

Customer

&#x20;   ↓

Pet

&#x20;   ↓

Appointment

&#x20;   ↓

Daily Operations

&#x20;   ↓

Grooming / Boarding

&#x20;   ↓

Order

&#x20;   ↓

Payment

```



此流程必須能在實際系統中形成完整資料與操作鏈。



\---



\## 8.2 Grooming Flow



核心概念：



```text

Appointment

&#x20;   ↓

Daily Operations

&#x20;   ↓

Grooming

&#x20;   ↓

Order

&#x20;   ↓

Payment

```



Appointment 不直接等同於 Grooming。



\---



\## 8.3 Boarding Flow



核心概念：



```text

Appointment

&#x20;   ↓

Daily Operations

&#x20;   ↓

Boarding

&#x20;   ↓

Check-in

&#x20;   ↓

Boarding

&#x20;   ↓

Checkout

&#x20;   ↓

Order

&#x20;   ↓

Payment

```



實際實作仍必須遵守 Boarding Block 的正式責任與狀態定義。



\---



\## 8.4 Walk-in Product Flow



MVP 必須支援：



```text

Walk-in

&#x20;   ↓

Product

&#x20;   ↓

Order

&#x20;   ↓

Payment

```



Order 不得被設計成必須依賴 Appointment。



\---



\## 8.5 Mixed Order



MVP 必須允許一次交易包含：



```text

Service

\+

Product

↓

Order

↓

Checkout

↓

Payment

```



因此 Order 必須能作為服務與商品交易的共同交易單位。



\---



\# 9. Cross-Block Data Ownership



PHASE 21 正式確認：



> 每個核心資料由其責任 Block 擁有。



基本責任：



| Data | Owner Block |

|---|---|

| Customer | Customer |

| Pet | Pet |

| Service | Service |

| Appointment | Appointment |

| Grooming Data | Grooming |

| Boarding Data | Boarding |

| Order | Order |

| Payment | Payment |

| Product | Product |

| Report Data | Report / Read Model |



其他 Block：



> 不得因為實作方便而直接接管另一個 Block 的 Business Responsibility。



\---



\# 10. Cross-Block Data Handoff



跨 Block 操作必須遵循：



```text

Block A

&#x20;   ↓

Defined Interface / Data Contract

&#x20;   ↓

Block B

```



不得採用：



```text

Block A

&#x20;   ↓

直接修改

&#x20;   ↓

Block B Database

```



除非既有 Architecture / Data Responsibility 已正式允許該行為。



\---



\# 11. MVP Screen Readiness



正式進入 Frontend Implementation 前，必須建立：



> MVP Screen Map



Screen Map 的目的：



> 確認第一版真正需要開發的畫面。



Screen Map 不包含：



\- V2 畫面

\- 未來功能

\- 純視覺實驗

\- 非 MVP Dashboard

\- 企業級 UI



至少必須涵蓋實際 MVP 營運所需的：



```text

Authentication

Customer

Pet

Service

Appointment

Daily Operations

Grooming

Boarding

Order

Payment

Product

Report

Shop Settings

```



實際 Page / Screen 數量於 Implementation Preparation 階段依既有 Block 規格建立。



\---



\# 12. MVP API Readiness



正式進入 Backend Implementation 前，必須建立：



> MVP API Map



API Map 必須：



\- 對應 Business Responsibility

\- 對應 Screen / Operation

\- 對應必要 Data

\- 避免不必要 API

\- 避免 V2 API

\- 避免企業級 API



API 不得因為 CRUD 方便而無限制增加。



\---



\# 13. MVP Data Readiness



正式 Database Implementation 前，必須完成：



> MVP Data Map



Data Map 必須確認：



```text

Business Requirement

&#x20;       ↓

Data Requirement

&#x20;       ↓

Reference

&#x20;       ↓

Relationship

&#x20;       ↓

Implementation

```



必須確認：



\- 核心資料存在

\- 必要關係存在

\- 必要狀態存在

\- 必要 Reference 存在

\- Transaction 可以建立

\- Cross-Block Integration 有足夠資料



\---



\# 14. Database Implementation Strategy



MVP 不採：



```text

一次建立所有 Database Schema

```



也不採：



```text

Developer 自由新增 Table

```



採用：



```text

Block

↓

Required Data

↓

Required Table

↓

Backend

↓

API

↓

Frontend

↓

Test

↓

PASS

```



Database Implementation 必須跟隨 Block Development。



\---



\# 15. Role / Operation Readiness



MVP 主要操作角色維持：



```text

Owner

Front Desk

Groomer

```



PHASE 21 不建立企業級 RBAC。



但正式工程前必須確認：



\- 誰可以查看

\- 誰可以新增

\- 誰可以編輯

\- 誰可以取消

\- 誰可以執行服務

\- 誰可以 Checkout

\- 誰可以執行 Payment

\- 誰可以執行 Boarding

\- 誰可以查看 Report



權限必須足以支援 MVP 營運。



\---



\# 16. MVP Simplification Boundary



PHASE 21 正式確認：



> MVP 必須維持刻意簡化。



不得因為工程實作方便而擴張成企業系統。



例如：



```text

Product

→ 基本商品販售

```



不是：



```text

完整 Inventory ERP

```



以及：



```text

Report

→ 基本營運統計

```



不是：



```text

企業級 BI

```



以及：



```text

Authentication

→ MVP 基本登入與使用者識別

```



不是：



```text

Enterprise IAM / SSO / MFA

```



\---



\# 17. Implementation Order



PHASE 21 Freeze 的工程方向：



```text

Foundation

&#x20;   ↓

Master Data

&#x20;   ↓

Appointment

&#x20;   ↓

Daily Operations

&#x20;   ↓

Grooming / Boarding

&#x20;   ↓

Order

&#x20;   ↓

Payment

&#x20;   ↓

Report

&#x20;   ↓

Integration

```



其中 Master Data 包含：



```text

Customer

Pet

Service

Product

```



實際工程拆分時，可以依既有 Block Dependencies 進一步建立具體 Task。



\---



\# 18. Foundation First



第一個工程階段應優先完成：



> Foundation / Staff / Authentication



核心概念：



```text

Login

&#x20;   ↓

Current User

&#x20;   ↓

Role

&#x20;   ↓

Authenticated Request

```



其他 Block 建立在 Foundation 之上。



\---



\# 19. Block PASS Gate



每個 Block 必須採用：



```text

需求

↓

設計

↓

開發

↓

Unit Test

↓

API Integration Test

↓

Frontend

↓

Browser Verification

↓

PASS

↓

Block Freeze

```



未通過：



> 不得直接視為完成。



\---



\# 20. Testing Requirements



MVP 不以單一測試層級判定完成。



至少需要：



```text

Database

&#x20;   ↓

Backend

&#x20;   ↓

API

&#x20;   ↓

Frontend

&#x20;   ↓

Browser

&#x20;   ↓

End-to-End

```



測試工具基準：



\- Jest

\- Supertest



\---



\# 21. Browser Verification



Browser Verification 是正式完成條件之一。



原因：



> 本系統最終使用者是實際店員，而不是 Developer。



因此：



```text

Unit Test PASS

```



不等於：



```text

Block PASS

```



必須確認實際 Browser 操作可以完成預期流程。



\---



\# 22. MVP End-to-End Acceptance



最終 MVP Acceptance 至少包含：



\## 22.1 Customer / Pet



```text

建立 Customer

↓

建立 / 管理 Pet

↓

成功查詢

↓

成功編輯

```



\## 22.2 Appointment



```text

Customer

↓

Pet

↓

Service

↓

Appointment

```



\## 22.3 Daily Operations



```text

Appointment

↓

Daily Operations

↓

當日營運操作

```



\## 22.4 Grooming



```text

Daily Operations

↓

Grooming

↓

完成服務

```



\## 22.5 Boarding



```text

Appointment

↓

入住

↓

住宿中

↓

退房

```



\## 22.6 Order



```text

Service / Product

↓

Order

↓

確認交易內容

```



\## 22.7 Payment



```text

Order

↓

Payment

↓

付款完成

```



\## 22.8 Walk-in



```text

Walk-in

↓

Product

↓

Order

↓

Payment

```



\---



\# 23. Change Request During Integration



如果 PHASE 21 或後續 Implementation 發現既有 Freeze 問題，不得偷偷修改。



必須先分類：



\### A. Bug



可以修正。



\### B. 原決策互相矛盾



可以提出修正。



\### C. 技術實作限制



可以提出修正。



\### D. 新需求



原則上進入 V2 或 Change Request。



\### E. 單純設計偏好



不得因此推翻 Freeze。



Change Request 必須說明：



1\. 哪個 Freeze 決策

2\. 發生什麼問題

3\. 為什麼原方案不可行

4\. 新方案

5\. 影響範圍

6\. 是否值得重新開啟



使用者確認後才可以修改。



\---



\# 24. Implementation Readiness Gate



PHASE 21 最終 Gate：



```text

Business Scope

&#x20;       ↓

Block Responsibility

&#x20;       ↓

Architecture

&#x20;       ↓

Cross-Block Integration

&#x20;       ↓

Screen Map

&#x20;       ↓

API Map

&#x20;       ↓

Data Map

&#x20;       ↓

Role / Operation Matrix

&#x20;       ↓

Implementation Order

&#x20;       ↓

Testing Strategy

&#x20;       ↓

End-to-End Acceptance

&#x20;       ↓

READY TO BUILD

```



只有以上條件成立：



> MVP 才正式進入工程實作。



\---



\# 25. Phase 21 Freeze Decision



PHASE 21 已完成：



```text

Batch 1

Q1～Q10

&#x20;       ↓

Batch 2

Q11～Q20

&#x20;       ↓

Batch 3

Q21～Q30

&#x20;       ↓

Batch 4

Q31～Q40

&#x20;       ↓

Phase Review

&#x20;       ↓

FREEZE

```



所有 40 題決策：



> \*\*全部採用 AI 推薦答案 A。\*\*



\---



\# 26. Final Freeze Statement



PHASE 21 正式確認：



> \*\*MVP 已具備進入工程實作的條件。\*\*



PHASE 21 不新增 Business Block。



PHASE 21 不重新設計既有 Freeze。



PHASE 21 不進行實際 Coding。



PHASE 21 完成後：



> \*\*正式停止大規模產品規劃，進入 Implementation Mode。\*\*



\---



\# 27. Project Mode Transition



PHASE 21 之前：



```text

Decision / Design Mode

```



PHASE 21 Freeze 後：



```text

Implementation Mode

```



後續工作模式：



```text

Implementation Preparation

&#x20;       ↓

Block Development

&#x20;       ↓

Block Testing

&#x20;       ↓

Browser Verification

&#x20;       ↓

Block PASS

&#x20;       ↓

Block Freeze

&#x20;       ↓

Integration

&#x20;       ↓

MVP Verification

&#x20;       ↓

Pilot

&#x20;       ↓

Production Release

```



不再以：



```text

PHASE 22

PHASE 23

PHASE 24

...

```



無限制延伸產品規劃。



\---



\# 28. Engineering Transition Rule



後續工程工作必須遵守：



> \*\*先依 Freeze 實作，再透過測試與實際操作驗證。\*\*



不得因為 Coding 過程中的個人偏好而重新設計 Business Responsibility。



若 Implementation 發現問題：



```text

發現問題

↓

判斷類型

↓

Bug / Contradiction / Technical Limitation / New Requirement

↓

必要時 Change Request

↓

確認

↓

修正

↓

繼續 Implementation

```



\---



\# 29. Definition of Done for PHASE 21



PHASE 21 完成條件：



\- \[x] Q1～Q40 完成

\- \[x] Batch 1 完成

\- \[x] Batch 2 完成

\- \[x] Batch 3 完成

\- \[x] Batch 4 完成

\- \[x] Phase Review 完成

\- \[x] MVP End-to-End Integration Direction 確認

\- \[x] Walk-in Flow 確認

\- \[x] Cross-Block Responsibility 確認

\- \[x] Data Ownership 原則確認

\- \[x] Screen Readiness 確認

\- \[x] API Readiness 確認

\- \[x] Data Readiness 確認

\- \[x] Role / Operation Readiness 確認

\- \[x] Implementation Order 確認

\- \[x] Block PASS Gate 確認

\- \[x] Browser Verification 確認

\- \[x] End-to-End Acceptance 確認

\- \[x] Change Request 規則確認

\- \[x] Implementation Readiness Gate 確認

\- \[x] 使用者確認 PHASE 21 FREEZE



\---



\# 30. PHASE 21 Final Status



```text

PHASE 21

MVP Integration \& Implementation Readiness



STATUS: FREEZE



Decision Status:

FREEZE



Implementation Readiness:

READY TO BUILD

```



\---



\# 31. Project Status After PHASE 21



```text

PHASE 1

FREEZE

&#x20;   ↓

PHASE 2

FREEZE

&#x20;   ↓

PHASE 3

FREEZE

&#x20;   ↓

PHASE 4

FREEZE

&#x20;   ↓

PHASE 5

FREEZE

&#x20;   ↓

PHASE 6

FREEZE

&#x20;   ↓

PHASE 7

FREEZE

&#x20;   ↓

PHASE 8

FREEZE

&#x20;   ↓

PHASE 9

FREEZE

&#x20;   ↓

PHASE 10

FREEZE

&#x20;   ↓

PHASE 11

FREEZE

&#x20;   ↓

PHASE 12

FREEZE

&#x20;   ↓

PHASE 13

FREEZE

&#x20;   ↓

PHASE 14

FREEZE

&#x20;   ↓

PHASE 15

FREEZE

&#x20;   ↓

PHASE 16

FREEZE

&#x20;   ↓

PHASE 17

FREEZE

&#x20;   ↓

PHASE 18

FREEZE

&#x20;   ↓

PHASE 19

FREEZE

&#x20;   ↓

PHASE 20

FREEZE

&#x20;   ↓

PHASE 21

FREEZE

&#x20;   ↓

READY TO BUILD

&#x20;   ↓

IMPLEMENTATION

```



\---



\# 32. Final Principle



本專案目前不再以：



> 「還需要規劃多少 Phase？」



作為主要目標。



而改以：



> \*\*「已經 Freeze 的系統，能否被真正建置、測試、驗證並投入實際營運。」\*\*



作為下一階段核心。



因此 PHASE 21 Freeze 後：



> \*\*正式進入工程實作階段。\*\*



本文件為：



> \*\*PHASE 21 — MVP Integration \& Implementation Readiness v1.0 — FREEZE\*\*

