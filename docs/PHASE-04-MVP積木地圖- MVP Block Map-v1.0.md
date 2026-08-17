\# PHASE-04 — MVP 積木地圖

\## MVP Block Map



\*\*文件編號：\*\* PHASE-04  

\*\*文件名稱：\*\* MVP 積木地圖 / MVP Block Map  

\*\*版本：\*\* v1.0  

\*\*狀態：\*\* FREEZE  

\*\*Freeze Date：\*\* 2026-08-16  

\*\*前置 Phase：\*\* PHASE-01、PHASE-02、PHASE-03  

\*\*文件性質：\*\* MVP Product / Business Architecture Definition



\---



\# 1. 文件目的



本文件定義 MVP 系統的 Block Map。



本 Phase 的目的不是設計 Database Schema、API、UI 或程式碼，而是將 PHASE-01～PHASE-03 已確認的 MVP 業務能力，整理成：



\- 可理解的業務 Blocks

\- 明確的 Block 責任

\- 明確的責任邊界

\- Block 之間的依賴

\- Block 之間的使用關係

\- 業務層級的 Input / Output

\- Block 建置順序

\- Block 完成條件

\- Block Integration 原則

\- 不應成為獨立 Block 的能力



本文件 Freeze 後，作為後續 Block Design、Development、Testing 與 Integration 的主要依據。



\---



\# 2. Phase 4 Scope



PHASE-04 只處理：



> 「MVP 的積木應該怎麼切。」



本 Phase 不處理：



\- Database Schema

\- Database Table

\- API Endpoint

\- API Request / Response JSON

\- UI Layout

\- Frontend Component

\- Backend Code

\- ORM

\- Design Pattern

\- Infrastructure

\- Deployment

\- 第三方服務整合



以上內容應於後續適當 Phase 再處理。



\---



\# 3. Block Design Principles



\## 3.1 Block 以業務責任為核心



Block 的定義以：



> 「這個 Block 負責什麼業務能力？」



為主要判斷標準。



不是以：



\- 資料表

\- API

\- 畫面

\- 程式資料夾



作為 Block 的主要切分依據。



\---



\## 3.2 一個 Block 必須有明確責任



每個 Block 必須能用一句簡單的話描述其核心責任。



例如：



> Customer：負責管理客戶資料。



如果一個 Block 無法清楚說明自己負責什麼，代表其責任邊界可能仍不清楚。



\---



\## 3.3 一個 Block 必須有明確邊界



除了定義：



> 負責什麼



也必須定義：



> 不負責什麼



避免不同 Block 重複擁有同一項核心業務資料。



\---



\## 3.4 Single Source of Truth



同一項核心業務資料應由一個主要 Block 負責。



其他 Block 可以：



\- 使用

\- 查看

\- 操作

\- 取得



但不應建立第二份同樣意義的核心資料來源。



\---



\## 3.5 Daily Operations 不擁有其他 Block 的核心資料



Daily Operations 是：



> 店員每天工作的操作中心。



它可以操作其他 Block，但實際資料仍由原本的 Block 負責。



例如：



> 從 Daily Operations 修改預約



實際上仍由：



> Appointment



負責保存與管理預約資料。



\---



\## 3.6 不為抽象而抽象



即使兩個 Block 看起來有相似性，也不應為了「程式漂亮」而建立額外的共用 Block。



例如：



> Grooming 與 Boarding 都屬於服務執行



但兩者生命週期不同，因此 MVP 不建立一個額外的：



> Service Execution



Block。



\---



\# 4. MVP Block Map



PHASE-04 經 Review 與 Freeze 後，MVP 維持以下 13 個 Blocks：



| 編號 | Block | 中文名稱 | 核心責任 |

|---|---|---|---|

| B01 | Staff / Authentication | 人員／登入 | 管理店內操作人員與基本登入／身份識別 |

| B02 | Shop Settings | 店家設定 | 管理店家基本設定 |

| B03 | Customer | 客戶 | 管理客戶資料 |

| B04 | Pet | 寵物 | 管理寵物資料 |

| B05 | Service | 服務 | 管理店家提供的服務 |

| B06 | Appointment | 預約 | 管理客戶預約內容與時間 |

| B07 | Daily Operations | 每日營運 | 提供店員每天工作的操作中心 |

| B08 | Grooming | 美容 | 管理實際美容執行 |

| B09 | Boarding | 住宿 | 管理實際住宿生命週期 |

| B10 | Order | 訂單 | 管理客戶本次購買內容 |

| B11 | Payment | 付款 | 管理訂單付款 |

| B12 | Product | 商品 | 管理基本商品與商品販售能力 |

| B13 | Report | 報表 | 提供基本營運統計 |



\---



\# 5. Block 詳細定義



\## B01 — Staff / Authentication



\### 核心責任



> 誰在操作系統。



\### 負責



\- 店內人員基本資料

\- 基本登入

\- 基本身份識別

\- 紀錄目前操作人員所需的基本資訊



\### 不負責



\- 企業級 RBAC

\- 自訂權限系統

\- SSO

\- MFA

\- HR

\- 薪資

\- 排班系統



\### 主要使用者



\- 老闆

\- 店員

\- 美容師



同一個人可以兼任多種工作。



\### 依賴



\- 無主要業務資料依賴



\### 被使用



\- Daily Operations

\- 需要識別操作人員的其他 Block



\### 業務 Input



\- 人員基本資訊

\- 登入資訊



\### 業務 Output



\- 已識別的操作人員

\- 基本人員資訊



\### MVP 完成條件



\- 店家可以建立基本操作人員

\- 操作人員可以登入

\- 系統可以知道目前是哪位人員在操作



\---



\## B02 — Shop Settings



\### 核心責任



> 店家的基本設定。



\### 負責



\- 店家基本資訊

\- MVP 所需的店家層級設定



\### 不負責



\- Staff 資料

\- Service 資料

\- Product 資料

\- 服務價格主資料

\- 企業級系統設定



\### 依賴



\- 無主要業務資料依賴



\### 被使用



\- 其他需要店家基本設定的 Block



\### 業務 Input



\- 店家基本設定資訊



\### 業務 Output



\- 目前店家設定



\### MVP 完成條件



\- 店家可以設定 MVP 所需的基本資訊

\- 其他需要店家設定的功能可以取得正式設定



\---



\## B03 — Customer



\### 核心責任



> 誰是客戶。



\### 負責



\- 客戶基本資料

\- 客戶聯絡資訊

\- 客戶資料查詢與維護



\### 不負責



\- 寵物詳細資料

\- 預約

\- 美容執行

\- 住宿執行

\- 訂單

\- 付款



\### 關係



一個 Customer 可以有多隻 Pet。



\### 依賴



\- 無主要業務資料依賴



\### 被使用



\- Pet

\- Appointment

\- Order

\- Daily Operations

\- Report



\### 業務 Input



\- 客戶基本資料



\### 業務 Output



\- 客戶資料

\- 客戶識別資訊



\### MVP 完成條件



\- 可以建立客戶

\- 可以查看客戶

\- 可以修改客戶

\- 可以讓後續流程正確識別客戶



\---



\## B04 — Pet



\### 核心責任



> 哪一隻寵物。



\### 負責



\- 寵物基本資料

\- 寵物與 Customer 的關係



\### 不負責



\- 客戶基本資料

\- 預約

\- 實際美容

\- 住宿生命週期

\- 訂單

\- 付款



\### 依賴



\- Customer



\### 被使用



\- Appointment

\- Grooming

\- Boarding

\- Daily Operations

\- Report



\### 業務 Input



\- Customer

\- 寵物基本資料



\### 業務 Output



\- 寵物資料

\- 寵物與客戶的關係



\### MVP 完成條件



\- Customer 可以建立多隻 Pet

\- 可以查看 Pet

\- 可以修改 Pet

\- 預約與服務執行可以正確識別 Pet



\---



\## B05 — Service



\### 核心責任



> 店家提供什麼服務。



\### 負責



\- 服務基本資料

\- 服務名稱

\- 服務類型

\- MVP 所需服務價格資訊



\### 不負責



\- 預約時間

\- 實際美容執行

\- 實際住宿生命週期

\- 訂單

\- 付款



\### 重要原則



Service 定義：



> 「店家賣什麼服務」



而 Grooming / Boarding 定義：



> 「實際怎麼執行服務」



\### 依賴



\- 無主要業務資料依賴



\### 被使用



\- Appointment

\- Grooming

\- Boarding

\- Order

\- Daily Operations



\### 業務 Input



\- 服務設定

\- 服務基本資訊

\- 服務價格



\### 業務 Output



\- 可提供的服務

\- 服務基本資訊



\### MVP 完成條件



\- 店家可以建立 MVP 所需服務

\- 可以維護服務基本資訊

\- Appointment 可以選擇 Service



\---



\## B06 — Appointment



\### 核心責任



> 客戶預約了什麼、什麼時間來。



\### 負責



\- 預約資料

\- 預約日期

\- 預約時間

\- 預約客戶

\- 預約寵物

\- 預約服務

\- 預約狀態



\### 不負責



\- 實際美容執行

\- 實際住宿生命週期

\- 訂單

\- 付款

\- 商品庫存



\### 重要原則



Appointment ≠ Grooming  

Appointment ≠ Boarding  

Appointment ≠ Order  

Appointment ≠ Payment



Appointment 是預約，不是整個服務生命週期。



\### 依賴



\- Customer

\- Pet

\- Service



\### 被使用



\- Daily Operations

\- Grooming

\- Boarding

\- Order

\- Report



\### 業務 Input



\- Customer

\- Pet

\- Service

\- 預約日期

\- 預約時間

\- 預約相關資訊



\### 業務 Output



\- 預約

\- 預約狀態

\- 預約內容



\### MVP 完成條件



\- 店員可以建立預約

\- 可以查看預約

\- 可以修改預約

\- 可以取消預約

\- 可以正確連結 Customer / Pet / Service

\- 後續服務執行可以取得必要預約資訊



\---



\## B07 — Daily Operations



\### 核心責任



> 店員每天工作的操作中心。



\### 定位



Daily Operations 是：



> 操作／協調中心。



不是：



> 第二套業務資料庫。



\### 負責



\- 提供每日工作視角

\- 顯示今天需要處理的工作

\- 提供店員操作其他 Block 的入口

\- 協助串接日常營運流程



\### 不負責



\- Customer 核心資料

\- Pet 核心資料

\- Appointment 核心資料

\- Grooming 核心資料

\- Boarding 核心資料

\- Order 核心資料

\- Payment 核心資料

\- Product 核心資料



\### 重要原則



Daily Operations 可以：



> 操作其他 Block



但實際資料仍由：



> 對應的原始 Block



負責。



例如：



Daily Operations  

→ 修改預約  

→ Appointment



Daily Operations  

→ 執行美容  

→ Grooming



Daily Operations  

→ 進行結帳  

→ Order / Payment



\### 依賴



\- Customer

\- Pet

\- Appointment

\- Service

\- Grooming

\- Boarding

\- Order

\- Payment

\- Product

\- Staff / Authentication



依實際操作情境使用，不代表所有依賴都必須在技術上形成直接耦合。



\### 被使用



\- 主要供店內操作人員使用



\### 業務 Input



\- 今日預約

\- 今日工作狀態

\- 相關業務 Block 提供的正式資料



\### 業務 Output



\- 操作結果

\- 對其他 Block 的業務操作請求

\- 每日工作視角



\### MVP 完成條件



\- 店員可以從每日工作中心看到需要處理的工作

\- 可以進入相關業務操作

\- 操作結果會回到原本負責的 Block

\- Daily Operations 不建立第二套核心業務資料



\### 建置原則



Daily Operations 的完整 Integration 不需要等 Report 完成。



當主要被操作的核心 Block 已完成並 PASS 後，即可逐步建立與整合 Daily Operations。



\---



\## B08 — Grooming



\### 核心責任



> 實際美容執行。



\### 負責



\- 美容工作執行

\- 美容執行狀態

\- 美容完成資訊

\- MVP 所需美容工作流程



\### 不負責



\- 預約本身

\- 服務主資料

\- 訂單

\- 付款

\- 商品



\### 重要原則



Appointment  

→ Grooming



Appointment 提供：



> 預約了什麼



Grooming 負責：



> 實際做了什麼



\### 依賴



\- Appointment

\- Pet

\- Service



\### 被使用



\- Daily Operations

\- Order

\- Report



\### 業務 Input



\- Appointment

\- Pet

\- Service

\- 美容執行資訊



\### 業務 Output



\- 美容執行狀態

\- 美容完成結果



\### MVP 完成條件



\- 可以從預約進入美容工作

\- 可以記錄美容執行狀態

\- 可以完成美容工作

\- 後續交易流程可以取得服務完成所需資訊



\---



\## B09 — Boarding



\### 核心責任



> 實際住宿生命週期。



\### 負責



\- 住宿執行

\- 入住

\- 住宿中

\- 退房

\- MVP 所需住宿狀態



\### 不負責



\- 預約本身

\- Grooming

\- 訂單

\- 付款

\- 複雜住宿照護系統



\### 住宿生命週期



預約住宿  

→ 入住  

→ 住宿中  

→ 退房



\### 依賴



\- Appointment

\- Pet

\- Service



\### 被使用



\- Daily Operations

\- Order

\- Report



\### 業務 Input



\- Appointment

\- Pet

\- Service

\- 住宿執行資訊



\### 業務 Output



\- 住宿狀態

\- 入住資訊

\- 退房資訊

\- 住宿完成結果



\### MVP 完成條件



\- 可以從住宿預約進入入住

\- 可以記錄住宿中狀態

\- 可以完成退房

\- 後續交易流程可以取得必要資訊



\---



\## B10 — Order



\### 核心責任



> 客戶這次買了什麼。



\### 負責



\- 訂單

\- 訂單項目

\- 實際購買內容

\- 交易金額



\### Order 來源



Order 可以來自：



1\. Appointment 服務

2\. Grooming / Boarding 完成後的交易內容

3\. Walk-in Product



因此：



> Order 不強制依賴 Appointment。



\### 不負責



\- 預約

\- 實際美容執行

\- 實際住宿生命週期

\- 付款本身

\- 商品庫存



\### 重要原則



Order 必須擁有自己的交易內容。



預約內容與實際結帳內容不是同一件事。



因此：



> Order 可以追溯來源，但不能單純等同於 Appointment。



\### 依賴



\- 視交易來源而定

\- Service / Grooming / Boarding / Product 等可提供交易來源資訊



\### 被使用



\- Payment

\- Daily Operations

\- Report



\### 業務 Input



\- 實際購買項目

\- 服務交易來源

\- 商品交易來源

\- 實際交易金額



\### 業務 Output



\- Order

\- Order Items

\- 應付金額



\### MVP 完成條件



\- 可以建立服務交易

\- 可以建立 Walk-in 商品交易

\- 可以建立訂單項目

\- 可以計算應付金額

\- 可以交給 Payment 完成付款



\---



\## B11 — Payment



\### 核心責任



> 客戶怎麼付款、付了多少。



\### 負責



\- 付款

\- 付款方式

\- 實際付款金額

\- 訂單付款完成狀態



\### 不負責



\- 訂單內容

\- 預約

\- 商品主資料

\- 服務主資料



\### 重要原則



Order ≠ Payment



Order 決定：



> 買了什麼、應付多少



Payment 決定：



> 怎麼付、付了多少



\### MVP 付款規則



一張 Order：



> 一次完成付款。



MVP 不建立：



\- 訂金系統

\- 分期付款

\- 多筆付款

\- 複雜帳務結算



\### 依賴



\- Order



\### 被使用



\- Daily Operations

\- Report



\### 業務 Input



\- Order

\- 付款方式

\- 付款金額



\### 業務 Output



\- 付款結果

\- 付款完成狀態



\### MVP 完成條件



\- 可以對 Order 進行付款

\- 可以記錄付款方式

\- 可以記錄付款金額

\- 可以知道 Order 是否已付款



\---



\## B12 — Product



\### 核心責任



> 店家販售的商品。



\### 負責



\- 商品基本資料

\- 商品名稱

\- 商品基本價格

\- 商品販售能力



\### 不負責



\- Order

\- Payment

\- 完整 Inventory

\- 供應商

\- 進貨

\- 庫存異動系統



\### 重要原則



Product ≠ Inventory



MVP 第一版只處理：



> 基本商品販售能力。



\### 依賴



\- 無主要業務資料依賴



\### 被使用



\- Order

\- Daily Operations

\- Report



\### 業務 Input



\- 商品基本資訊

\- 商品價格



\### 業務 Output



\- 可販售商品

\- 商品資訊



\### MVP 完成條件



\- 可以建立商品

\- 可以維護商品

\- 可以在 Walk-in Order 中選擇商品

\- 可以產生商品交易



\---



\## B13 — Report



\### 核心責任



> 提供基本營運統計。



\### 負責



\- 基本營運統計

\- 基本營收統計

\- MVP 所需簡單報表



\### 不負責



\- BI

\- 高階分析

\- 預測

\- 企業級 Dashboard

\- 第二套統計資料庫

\- 完整會計



\### 重要原則



Report 不建立自己的營運資料來源。



Report 應從正式業務資料產生統計。



例如：



Order / Payment  

→ Report  

→ 基本營運統計



\### 依賴



\- Order

\- Payment

\- 其他 MVP 所需正式營運資料



\### 被使用



\- 店家管理者

\- 基本營運查看



\### 業務 Input



\- 正式營運資料



\### 業務 Output



\- 基本統計結果



\### MVP 完成條件



\- 可以從正式業務資料產生基本統計

\- 統計結果與正式資料一致

\- 不建立第二套核心營運資料



\---



\# 6. Block 關係總覽



MVP 的核心業務關係如下：



Staff / Authentication  

↓  

Daily Operations  

↓  

Customer / Service / Product  

↓  

Customer → Pet  

↓  

Customer + Pet + Service → Appointment  

↓  

Appointment → Grooming / Boarding  

↓  

Grooming / Boarding / Product → Order  

↓  

Order → Payment  

↓  

Order / Payment → Report



此圖為業務關係示意，不代表技術上的 Database、API 或程式依賴。



\---



\# 7. Block 建置順序



\## Stage 1 — 基礎能力



優先建立：



\- B01 Staff / Authentication

\- B02 Shop Settings

\- B03 Customer

\- B05 Service

\- B12 Product



其中 Customer 可先於 Pet。



\---



\## Stage 2 — Customer / Pet



Customer  

→ Pet



建立：



\- B03 Customer

\- B04 Pet



\---



\## Stage 3 — Appointment



Customer  

\+ Pet  

\+ Service  

→ B06 Appointment



Appointment 是核心流程樞紐。



\---



\## Stage 4 — Service Execution



B06 Appointment  

→ B08 Grooming



B06 Appointment  

→ B09 Boarding



Grooming 與 Boarding 可以平行建置。



兩者不互相依賴。



\---



\## Stage 5 — Transaction



B12 Product  

\+ Appointment / Service Execution  

→ B10 Order  

→ B11 Payment



Order 是交易核心。



Payment 位於 Order 後方。



\---



\## Stage 6 — Daily Operations Integration



以下核心 Block 完成並 PASS 後，逐步整合 B07 Daily Operations：



\- B01 Staff / Authentication

\- B03 Customer

\- B04 Pet

\- B05 Service

\- B06 Appointment

\- B08 Grooming

\- B09 Boarding

\- B10 Order

\- B11 Payment

\- B12 Product



Daily Operations 不需要等 Report 完成才可以開始 Integration。



\---



\## Stage 7 — Report



B10 Order  

\+ B11 Payment  

\+ 其他正式營運資料  

→ B13 Report



Report 最後建立。



\---



\# 8. Block 建置依賴原則



\## 8.1 必要依賴



Customer → Pet



Customer + Pet + Service → Appointment



Appointment + Pet + Service → Grooming



Appointment + Pet + Service → Boarding



Order → Payment



\---



\## 8.2 不應形成的必要依賴



以下關係不應建立為必要依賴：



Appointment → Payment



Payment 主要依賴 Order。



Appointment → Product



Appointment 不負責商品。



Grooming → Boarding



Grooming 與 Boarding 平行。



Boarding → Grooming



同樣不成立。



Daily Operations → 擁有 Appointment



Daily Operations 可以操作 Appointment，但不擁有 Appointment 資料。



Report → 建立另一份營運資料



Report 應使用正式資料產生統計。



\---



\# 9. Block 業務接口原則



PHASE-04 的接口只定義：



> 「這個 Block 提供什麼業務能力，以及需要什麼業務能力。」



不定義：



\- API Endpoint

\- HTTP Method

\- JSON

\- URL

\- Controller

\- Service Layer

\- Repository

\- Database Query



這些留給後續技術設計。



\---



\# 10. Block Input / Output 原則



每個 Block 都應在後續設計中確認：



\### Input



> 這個 Block 要完成工作，需要什麼業務資訊？



\### Output



> 這個 Block 完成工作後，其他 Block 可以得到什麼業務結果？



PHASE-04 只要求業務層級描述。



不要求：



\- Request Schema

\- Response Schema

\- JSON

\- DTO

\- Database Model



\---



\# 11. Block 完成條件



每個 Block 的完成不能只用：



> API 完成



或：



> Database 完成



判斷。



Block 的完成條件必須以：



> 使用者能否完成這個 Block 所負責的實際業務



作為主要判斷標準。



\---



\# 12. Block 開發生命週期



每個 Block 採以下生命週期：



需求  

→ 討論  

→ 定義責任  

→ 定義接口  

→ 確認依賴  

→ Block Design Freeze  

→ 開發  

→ 測試  

→ 實際操作驗證  

→ PASS  

→ Block Freeze  

→ Integration



\---



\# 13. Block Testing 原則



每個 Block 必須可以獨立驗證。



最低要求：



1\. Block 核心業務可以運作

2\. Block 責任範圍內的主要操作可以完成

3\. 不應依賴未完成的非必要能力

4\. 核心輸入可以正確處理

5\. 核心輸出可以正確產生

6\. 不應破壞其他 Block 的責任邊界



\---



\# 14. Integration 原則



不採用：



> 所有 Block 完成後才第一次 Integration。



採用：



> Block PASS 後，依依賴關係逐步 Integration。



例如：



Customer PASS  

→ Pet PASS  

→ Appointment PASS  

→ Grooming / Boarding PASS  

→ Order PASS  

→ Payment PASS  

→ Daily Operations Integration  

→ Report



實際開發時，允許具有獨立依賴的 Block 平行建置。



\---



\# 15. 不應成為獨立 Block 的能力



PHASE-04 明確確認，下列能力目前不應自行增加成為新的 MVP Block。



\## 15.1 Checkout



不建立獨立 Checkout Block。



原因：



> Checkout 是 Order + Payment 的操作流程，而不是新的核心業務資料責任。



\---



\## 15.2 Inventory



不建立 Inventory Block。



原因：



> MVP 已明確排除完整庫存管理。



Product 只負責基本商品販售能力。



\---



\## 15.3 Service Execution



不建立共用 Service Execution Block。



原因：



> Grooming 與 Boarding 有不同生命週期。



\---



\## 15.4 CRM



不建立 CRM Block。



原因：



> 完整 CRM 已排除於 MVP v1.0。



Customer 僅負責 MVP 所需客戶資料。



\---



\## 15.5 Advanced Dashboard / BI



不建立 BI 或高階 Dashboard Block。



Report 僅負責：



> 基本營運統計。



\---



\## 15.6 Notification Center



不建立複雜 Notification Center。



MVP 不包含複雜通知中心。



\---



\## 15.7 Permission System



不建立獨立 Permission Block。



MVP 只保留基本 Staff / Authentication 能力。



企業級 RBAC、自訂權限等不屬於 MVP。



\---



\## 15.8 Scheduling Engine



不建立自動排程／容量排程 Block。



MVP 不包含：



\- 複雜排班

\- 複雜容量排程

\- 自動派工引擎



\---



\# 16. MVP Block Map 最終邊界



PHASE-04 Freeze 後：



> \*\*MVP v1.0 的 Block 數量為 13 個。\*\*



不得因為以下理由自行增加 Block：



\- 程式看起來比較漂亮

\- 未來可能會用到

\- 其他大型系統都有

\- 可以提前做抽象

\- 技術上可以拆

\- 為了「完整」而增加



若未來出現真正的新需求，應依 MVP 版本管理與 Change Request 規則處理。



\---



\# 17. Freeze 後變更規則



若後續發現 PHASE-04 需要修改，必須先分類：



\### A. Bug



原本設計無法正確實現已確認的業務需求。



\### B. 原決策互相矛盾



不同 Freeze 決策之間出現衝突。



\### C. 技術實作限制



原設計在實際技術環境中無法合理實現。



\### D. 新需求



原本 MVP 沒有定義的需求。



\### E. 只是另一種設計比較漂亮



單純偏好不同的設計方式。



\---



\## 處理原則



A / B / C：



> 可以提出修正。



D：



> 原則上放入 V2 或後續版本。



E：



> 不得因為看起來更漂亮就推翻 Freeze。



\---



\## Change Request 必須包含



1\. 哪個 Freeze 決策

2\. 發生什麼問題

3\. 為什麼原方案不可行

4\. 新方案

5\. 影響範圍

6\. 是否值得重新開啟



必須經使用者確認後，才能修改 Freeze。



\---



\# 18. PHASE-04 Freeze Summary



PHASE-04 已完成並正式 Freeze。



本 Phase 最終確認：



\### Block 數量



> 13 個。



\### Block 切分原則



> 以業務責任為核心。



\### 核心責任邊界



Customer  

= 誰是客戶



Pet  

= 哪一隻寵物



Service  

= 店家提供什麼服務



Appointment  

= 客戶預約什麼、什麼時間



Grooming  

= 實際美容執行



Boarding  

= 實際住宿生命週期



Order  

= 客戶這次買了什麼



Payment  

= 客戶怎麼付款、付了多少



Product  

= 店家販售什麼商品



Daily Operations  

= 店員每天工作的操作中心



Report  

= 基本營運統計



\### 核心資料原則



> 每項核心業務資料由主要責任 Block 負責。



\### 核心流程



Customer  

→ Pet  

→ Appointment  

→ Grooming / Boarding  

→ Order  

→ Payment  

→ Report



Product 可以直接：



Product  

→ Order  

→ Payment



Daily Operations 位於操作中心，不擁有其他 Block 的核心資料。



\---



\# 19. PHASE-04 Definition of Done



PHASE-04 的完成條件：



\- \[x] MVP Block 數量確認

\- \[x] Block 責任確認

\- \[x] Block 邊界確認

\- \[x] Block 依賴確認

\- \[x] Block 使用關係確認

\- \[x] 業務接口原則確認

\- \[x] 業務 Input / Output 原則確認

\- \[x] Block 建置順序確認

\- \[x] Block 完成條件確認

\- \[x] Block Testing 原則確認

\- \[x] Integration 原則確認

\- \[x] 非 Block 能力確認

\- \[x] MVP Scope 一致性確認

\- \[x] Phase Review 完成

\- \[x] 使用者確認 Freeze



\---



\# 20. Final Status



\*\*PHASE-04 — MVP Block Map\*\*



\*\*Version：\*\* v1.0



\*\*Status：\*\* FREEZE



\*\*Freeze Date：\*\* 2026-08-16



本文件完成後：



> PHASE-01、PHASE-02、PHASE-03、PHASE-04 均已正式 Freeze。



下一階段必須以本文件為基準，不得自行重新切換 Block。



後續進入下一 Phase 時，應從：



> \*\*Block Design\*\*



開始，而不是重新討論 MVP Scope 或重新定義 Block。



\---



\# END OF PHASE-04

