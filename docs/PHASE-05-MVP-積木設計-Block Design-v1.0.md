# PHASE-05 — Block Design
## MVP 積木設計 — Block Design

- Document ID: PHASE-05
- Document Name: MVP 積木設計 — Block Design
- English Name: MVP Block Design
- Version: v1.0
- Status: FREEZE
- Freeze Date: 2026-08-16
- Previous Phase: PHASE-04 — MVP Block Map
- Next Phase: 由後續 Phase 定義
- Source: MVP-00、PHASE-02、PHASE-03、PHASE-04 及 PHASE-05 決策 Q1～Q70

---

## 1. 文件目的

本文件定義 MVP 各 Block 的業務設計原則、責任、邊界、依賴、建置順序、完成條件與 Integration 原則。

本文件的目的不是建立 Database Schema、API Specification、UI Specification 或程式碼，而是將 PHASE-04 所確認的 MVP Block Map 進一步定義成後續工程設計可以直接使用的業務 Block 規格。

本文件正式 Freeze 後：

> Block 的業務責任與邊界視為正式基準。

後續技術設計不得自行改變本文件已 Freeze 的業務決策。

---

## 2. PHASE 5 定位

PHASE 5 的核心工作：

> 把 MVP Block Map 進一步定義成可以真正交給後續工程階段使用的 Block Design。

本 Phase 定義：

- Block Responsibility
- Block Boundary
- Block Users
- Block Operations
- Business Rules
- Business Flow
- Business Input
- Business Output
- Block Dependency
- Upstream / Downstream
- Definition of Done
- PASS 原則
- Integration 原則

本 Phase 不定義：

- Database Schema
- Database Table
- API Endpoint
- API Request / Response
- UI 詳細畫面
- Controller
- Service Layer
- Repository Layer
- ORM
- SQL
- 程式碼
- 技術實作細節

---

## 3. Block Design 核心原則

### 3.1 Single Responsibility

每個 Block 必須有清楚且單一的核心業務責任。

Block 可以使用其他 Block 的能力，但不得因此取得其他 Block 的核心責任。

---

### 3.2 Single Source of Truth

同一項核心業務資料或業務規則，只應由真正負責它的 Block 作為主要來源。

其他 Block 需要該資料時：

> 使用負責 Block 提供的資料或業務能力。

不得因為操作方便而建立另一套互相獨立的核心資料來源。

---

### 3.3 業務責任優先

Block 的切分依照：

> 業務責任

而不是：

> Database Table  
> API Endpoint  
> UI Page  
> 程式檔案

進行。

---

### 3.4 業務設計與技術設計分離

PHASE 5 只決定：

> 系統要負責什麼。

後續技術 Phase 再決定：

> 系統要怎麼實作。

因此 Block Freeze 不代表 Database Schema Freeze，也不代表 API Freeze。

---

### 3.5 該寫的才寫

MVP 不因為未來可能需要而提前加入功能。

如果某項能力不屬於 MVP Scope：

> 不得因為「看起來比較完整」而加入 Block Design。

---

## 4. 統一 Block Design 結構

後續每個 Block 的正式設計應遵循一致結構：

1. Block Name
2. Purpose
3. Responsibility
4. Out of Scope
5. Primary Users
6. Main Operations
7. Business Rules
8. Normal Flow
9. Exception / Forbidden Conditions
10. Business Input
11. Business Output
12. Required Dependencies
13. Upstream
14. Downstream
15. Definition of Done

此結構的目的，是讓不同 Block 可以一致比較、檢查與維護。

---

# 5. MVP Block List

MVP 共包含 13 個正式 Blocks：

| ID | Block | 中文名稱 | 核心責任 |
|---|---|---|---|
| B01 | Staff / Authentication | 人員／登入 | 誰可以使用系統 |
| B02 | Shop Settings | 店家設定 | 店家基本運作設定 |
| B03 | Customer | 客戶 | 誰是客戶 |
| B04 | Pet | 寵物 | 哪一隻寵物 |
| B05 | Service | 服務 | 店家提供什麼服務 |
| B06 | Appointment | 預約 | 客戶預約了什麼、什麼時間 |
| B07 | Daily Operations | 每日營運 | 今天要做什麼 |
| B08 | Grooming | 美容 | 實際美容執行 |
| B09 | Boarding | 住宿 | 實際住宿生命週期 |
| B10 | Order | 訂單 | 客戶這次買了什麼 |
| B11 | Payment | 付款 | 客戶怎麼付款、付多少 |
| B12 | Product | 商品 | 店家販售什麼商品 |
| B13 | Report | 報表 | 基本營運統計 |

---

# 6. Block Layer

為了呈現業務依賴與建置方向，13 個 Block 分為以下層級。

## 6.1 基礎層

- B01 Staff / Authentication
- B02 Shop Settings
- B03 Customer
- B04 Pet
- B05 Service
- B12 Product

責任：

> 提供系統基本使用、人員、店家、客戶、寵物、服務與商品等基礎能力。

---

## 6.2 核心流程層

- B06 Appointment
- B07 Daily Operations

責任：

> 建立預約與每日店務工作的主要操作流程。

---

## 6.3 服務執行層

- B08 Grooming
- B09 Boarding

責任：

> 執行實際美容與住宿業務。

---

## 6.4 交易層

- B10 Order
- B11 Payment

責任：

> 處理本次消費內容與付款。

---

## 6.5 統計層

- B13 Report

責任：

> 根據既有業務資料提供基本營運統計。

---

# 7. B01 — Staff / Authentication

## 7.1 Purpose

提供店內人員使用系統所需的基本人員與登入能力。

## 7.2 Responsibility

B01 負責：

- Staff 基本資料
- 基本登入
- 基本登出
- 基本帳號狀態

## 7.3 Out of Scope

不負責：

- 企業級 RBAC
- 自訂權限矩陣
- SSO
- MFA
- HR
- 薪資
- 複雜人事管理

## 7.4 Primary Users

- 老闆
- 店員
- 美容師

同一個人可以兼任不同工作角色。

## 7.5 Main Operations

- 建立／管理店內人員
- 登入
- 登出
- 查看基本人員資訊
- 管理基本帳號狀態

## 7.6 Business Rules

- 系統使用者必須是店內人員。
- MVP 不建立企業級身份與權限管理。
- 角色可以重疊。

## 7.7 Normal Flow

人員帳號存在
→ 使用者登入
→ 使用系統
→ 登出

## 7.8 Exception / Forbidden Conditions

- 不允許未登入使用者直接使用需要登入的店內操作。
- 不建立 MFA、SSO 等企業級身份機制。

## 7.9 Business Input

- 人員基本資料
- 登入資訊
- 帳號狀態操作

## 7.10 Business Output

- 可使用的店內人員身份
- 登入狀態
- 帳號狀態

## 7.11 Required Dependencies

- 無主要業務資料依賴

## 7.12 Upstream

- 無

## 7.13 Downstream

- 需要判斷操作人員的其他店內 Block

## 7.14 Definition of Done

- 可以管理基本 Staff。
- 可以登入。
- 可以登出。
- 可以處理基本帳號狀態。
- 不引入 MVP 排除的企業級身份功能。

---

# 8. B02 — Shop Settings

## 8.1 Purpose

提供店家正常使用 MVP 所需的基本設定。

## 8.2 Responsibility

B02 負責：

- 店家基本資訊
- 系統所需的基本店家設定
- 基本營運設定

## 8.3 Out of Scope

不負責：

- Multi-tenant SaaS
- 多分店管理
- 複雜組織架構
- 企業級設定中心

## 8.4 Primary Users

- 老闆
- 被授權處理店家設定的店內人員

## 8.5 Main Operations

- 查看店家設定
- 修改基本店家設定

## 8.6 Business Rules

- 設定以單一 MVP 店家為核心。
- 不建立 SaaS 型多租戶架構。

## 8.7 Normal Flow

查看設定
→ 修改設定
→ 儲存
→ 後續業務使用設定

## 8.8 Exception / Forbidden Conditions

- 不建立多店／多租戶設定。
- 不建立企業級組織設定。

## 8.9 Business Input

- 店家基本設定

## 8.10 Business Output

- 最新店家設定

## 8.11 Required Dependencies

- 無主要業務資料依賴

## 8.12 Upstream

- 無

## 8.13 Downstream

- 需要店家基本設定的其他 Block

## 8.14 Definition of Done

- 可以查看基本店家設定。
- 可以修改必要設定。
- 設定可以供其他 MVP Block 使用。
- 不引入 MVP 外的企業級設定能力。

---

# 9. B03 — Customer

## 9.1 Purpose

管理店家服務對象的基本客戶資料。

## 9.2 Responsibility

B03 負責：

> 誰是客戶。

## 9.3 Out of Scope

不負責：

- Pet
- Appointment
- Order
- Payment
- CRM
- 會員制度
- 點數
- 優惠券
- 客戶分群
- 高階消費分析

## 9.4 Primary Users

- 老闆
- 店員

## 9.5 Main Operations

- 建立客戶
- 查看客戶
- 修改客戶
- 搜尋客戶
- 查看基本客戶資訊

## 9.6 Business Rules

- 一個 Customer 可以有多隻 Pet。
- Customer 是客戶基本資料的主要來源。

## 9.7 Normal Flow

建立 Customer
→ 儲存基本資料
→ 查看／搜尋 Customer
→ 後續業務使用 Customer

## 9.8 Exception / Forbidden Conditions

- 不在 Customer Block 內建立 Pet 的核心資料。
- 不在 Customer Block 內建立 Appointment、Order 或 Payment。

## 9.9 Business Input

- 客戶基本資料

## 9.10 Business Output

- Customer 基本資料
- 可供其他 Block 使用的 Customer 資訊

## 9.11 Required Dependencies

- 無主要業務資料依賴

## 9.12 Upstream

- 無

## 9.13 Downstream

- B04 Pet
- B06 Appointment
- B10 Order
- 其他需要客戶身份的業務 Block

## 9.14 Definition of Done

- 可以建立 Customer。
- 可以查看 Customer。
- 可以修改 Customer。
- 可以搜尋 Customer。
- Customer 可以被其他 Block 正確使用。
- 不加入 CRM、會員、點數等 MVP 外能力。

---

# 10. B04 — Pet

## 10.1 Purpose

管理客戶所擁有寵物的基本資料。

## 10.2 Responsibility

B04 負責：

> 哪一隻寵物。

## 10.3 Out of Scope

不負責：

- 美容紀錄
- 住宿紀錄
- Appointment
- Order
- Payment
- 醫療管理
- 複雜照護紀錄

## 10.4 Primary Users

- 老闆
- 店員
- 美容師

## 10.5 Main Operations

- 建立 Pet
- 查看 Pet
- 修改 Pet
- 搜尋／選擇 Pet
- 查看 Pet 基本資訊

## 10.6 Business Rules

- 一個 Customer 可以有多隻 Pet。
- 每隻 Pet 必須屬於一個 Customer。
- Pet 是寵物基本資料的主要來源。

## 10.7 Normal Flow

選擇 Customer
→ 建立 Pet
→ 儲存 Pet 基本資料
→ 後續業務使用 Pet

## 10.8 Exception / Forbidden Conditions

- 不在 Pet Block 內管理實際美容。
- 不在 Pet Block 內管理住宿生命週期。
- 不建立醫療管理功能。

## 10.9 Business Input

- Customer
- Pet 基本資料

## 10.10 Business Output

- Pet 基本資料
- Customer → Pet 關係

## 10.11 Required Dependencies

- B03 Customer

## 10.12 Upstream

- B03 Customer

## 10.13 Downstream

- B06 Appointment
- B08 Grooming
- B09 Boarding
- 其他需要知道實際寵物的業務 Block

## 10.14 Definition of Done

- 可以建立 Pet。
- Pet 可以正確關聯 Customer。
- 可以查看與修改 Pet。
- 其他相關 Block 可以正確取得 Pet。
- 不加入寵物醫療與複雜照護功能。

---

# 11. B05 — Service

## 11.1 Purpose

管理店家目前提供的服務定義。

## 11.2 Responsibility

B05 負責：

> 店家提供什麼服務。

## 11.3 Out of Scope

不負責：

- 實際服務執行
- Grooming 執行紀錄
- Boarding 住宿生命週期
- Order
- Payment
- 複雜服務流程引擎

## 11.4 Primary Users

- 老闆
- 店員

## 11.5 Main Operations

- 建立服務
- 查看服務
- 修改服務
- 設定基本價格
- 啟用／停用服務

## 11.6 Business Rules

- Service 描述店家提供的服務。
- Service 與某一次實際服務執行分開。
- Service 可以被 Appointment、Order 等業務使用。

## 11.7 Normal Flow

建立 Service
→ 設定基本資料與價格
→ 啟用
→ 被預約或加入交易

## 11.8 Exception / Forbidden Conditions

- 不在 Service Block 內保存某次 Grooming 的執行結果。
- 不在 Service Block 內保存某次 Boarding 的住宿生命週期。

## 11.9 Business Input

- Service 基本資料
- 基本價格
- 啟用狀態

## 11.10 Business Output

- 可供業務流程使用的服務定義

## 11.11 Required Dependencies

- 無主要業務資料依賴

## 11.12 Upstream

- 無

## 11.13 Downstream

- B06 Appointment
- B08 Grooming
- B09 Boarding
- B10 Order

## 11.14 Definition of Done

- 可以管理基本服務。
- 可以管理基本價格。
- 可以判斷服務是否可使用。
- 其他 Block 可以正確使用 Service。
- 不加入複雜服務流程引擎。

---

# 12. B06 — Appointment

## 12.1 Purpose

管理客戶的預約。

## 12.2 Responsibility

B06 負責：

> 客戶預約了什麼、什麼時間來。

## 12.3 Out of Scope

不負責：

- 實際美容執行
- 實際住宿生命週期
- Order
- Payment
- 複雜容量排程
- 自動派工
- 線上自助預約平台
- LINE API

## 12.4 Primary Users

- 老闆
- 店員
- 美容師

## 12.5 Main Operations

- 建立預約
- 查看預約
- 修改預約
- 取消預約
- 查看預約狀態
- 搜尋／篩選預約

## 12.6 Business Rules

- Appointment 必須能識別 Customer、Pet、Service、日期與時間等必要業務資訊。
- Appointment 是預約，不等於實際服務。
- Appointment 不擁有 Grooming 或 Boarding 的執行資料。
- Order 不強制依賴 Appointment。
- 客戶可以透過店家既有管道提出修改／取消要求，由店內人員處理。

## 12.7 Normal Flow

Customer
→ Pet
→ Service
→ 建立 Appointment
→ 查看／確認
→ 到店
→ 進入後續 Daily Operations 與服務流程

## 12.8 Exception / Forbidden Conditions

- 已取消的 Appointment 不應被當作正常待服務預約。
- 不得因為 Appointment 存在，就視為 Grooming 或 Boarding 已實際執行。
- 不建立自動派工與複雜容量排程。

## 12.9 Business Input

- Customer
- Pet
- Service
- 預約日期
- 預約時間
- 預約相關必要資訊

## 12.10 Business Output

- 預約紀錄
- 預約狀態
- 可供 Daily Operations 與後續服務流程使用的預約資訊

## 12.11 Required Dependencies

- B03 Customer
- B04 Pet
- B05 Service

## 12.12 Upstream

- B03 Customer
- B04 Pet
- B05 Service

## 12.13 Downstream

- B07 Daily Operations
- B08 Grooming
- B09 Boarding
- 可能形成 B10 Order 的服務來源

## 12.14 Definition of Done

- 可以建立預約。
- 可以查看預約。
- 可以修改預約。
- 可以取消預約。
- 預約可以正確關聯 Customer、Pet、Service。
- 預約與實際服務執行保持分離。
- 不加入複雜排程或線上自助預約能力。

---

# 13. B07 — Daily Operations

## 13.1 Purpose

提供店內人員每日工作的集中操作中心。

## 13.2 Responsibility

B07 負責：

> 今天要做什麼。

B07 是操作型 Block，而不是新的核心業務資料來源。

## 13.3 Out of Scope

不負責：

- Customer 核心資料
- Pet 核心資料
- Appointment 核心資料
- Grooming 核心資料
- Boarding 核心資料
- Order 核心資料
- Payment 核心資料
- 複雜排班
- 自動派工
- 複雜容量排程

## 13.4 Primary Users

- 老闆
- 店員
- 美容師

## 13.5 Main Operations

以「今天」為核心提供：

- 今日預約
- 待到店工作
- 已到店工作
- 進行中的工作
- 已完成工作
- 待處理事項
- 進入其他 Block 的快速操作入口

## 13.6 Business Rules

- Daily Operations 不建立獨立核心業務資料來源。
- Daily Operations 可以操作其他 Block。
- 真正的業務動作由負責該業務的 Block 執行。
- Daily Operations 不複製其他 Block 的核心資料。

## 13.7 Normal Flow

今日工作產生
→ Daily Operations 彙整
→ 店員查看
→ 選擇工作
→ 進入對應 Block
→ 對應 Block 執行業務動作
→ Daily Operations 顯示最新工作狀態

## 13.8 Exception / Forbidden Conditions

- 不直接建立第二份 Appointment 資料。
- 不直接建立第二份 Grooming 資料。
- 不直接建立第二份 Boarding 資料。
- 不直接修改其他 Block 的核心資料來源。
- 不建立排班引擎。

## 13.9 Business Input

- Appointment 狀態
- Grooming 狀態
- Boarding 狀態
- Order 等其他相關工作狀態

## 13.10 Business Output

- 今日工作視圖
- 工作狀態入口
- 對其他 Block 的操作入口

## 13.11 Required Dependencies

- B06 Appointment
- B08 Grooming
- B09 Boarding
- B10 Order
- 其他 Daily Operations 需要呈現的既有業務 Block

## 13.12 Upstream

- B06 Appointment
- B08 Grooming
- B09 Boarding
- B10 Order

## 13.13 Downstream

- B06 Appointment
- B08 Grooming
- B09 Boarding
- B10 Order
- B11 Payment 等後續操作

## 13.14 Definition of Done

- 店員可以看到今天的重要工作。
- 可以從 Daily Operations 進入對應業務操作。
- 真正的業務動作由正確的責任 Block 執行。
- Daily Operations 不形成第二套核心資料來源。
- 不建立複雜排班與自動派工能力。

---

# 14. B08 — Grooming

## 14.1 Purpose

管理實際美容執行流程。

## 14.2 Responsibility

B08 負責：

> 實際美容執行。

## 14.3 Out of Scope

不負責：

- Appointment 核心資料
- 複雜美容師排班
- 自動派工
- 複雜美容流程引擎
- 醫療管理
- 完整寵物照護系統

## 14.4 Primary Users

- 美容師
- 店員
- 老闆

## 14.5 Main Operations

- 接收寵物
- 檢查寵物
- 開始美容
- 執行美容
- 完成美容
- 記錄必要執行結果

## 14.6 Business Rules

- Appointment 不等於 Grooming。
- Grooming 描述實際服務執行。
- Grooming 的完成狀態可以成為後續 Order 等流程的業務依據。

## 14.7 Normal Flow

接收寵物
→ 檢查
→ 美容進行
→ 美容完成
→ 提供完成結果給後續流程

## 14.8 Exception / Forbidden Conditions

- 不因存在 Appointment 就視為 Grooming 已完成。
- 不建立自動派工。
- 不建立醫療管理。

## 14.9 Business Input

- Pet
- Appointment 相關服務資訊
- 實際美容執行資訊

## 14.10 Business Output

- 美容執行狀態
- 美容完成結果
- 後續 Order 可使用的服務完成資訊

## 14.11 Required Dependencies

- B04 Pet
- B05 Service
- B06 Appointment（當美容來自預約）

## 14.12 Upstream

- B04 Pet
- B05 Service
- B06 Appointment

## 14.13 Downstream

- B07 Daily Operations
- B10 Order

## 14.14 Definition of Done

- 可以接收美容工作。
- 可以執行基本美容生命週期。
- 可以標示美容完成。
- 完成結果可以被後續交易流程使用。
- 不加入複雜派工與醫療功能。

---

# 15. B09 — Boarding

## 15.1 Purpose

管理實際住宿生命週期。

## 15.2 Responsibility

B09 負責：

> 實際住宿生命週期。

## 15.3 Out of Scope

不負責：

- 複雜住宿照護
- 房位最佳化
- 自動容量排程
- 醫療照護
- 完整寵物照護紀錄

## 15.4 Primary Users

- 店員
- 老闆

## 15.5 Main Operations

- 接收住宿
- 入住
- 住宿中管理
- 退房
- 記錄必要住宿資訊

## 15.6 Business Rules

基本生命週期：

> 預約住宿 → 入住 → 住宿中 → 退房

Appointment 與實際 Boarding 執行分開。

## 15.7 Normal Flow

住宿預約
→ 入住
→ 住宿中
→ 退房
→ 完成住宿

## 15.8 Exception / Forbidden Conditions

- 不因有住宿預約就視為已入住。
- 不建立複雜住宿照護系統。
- 不建立自動容量最佳化。

## 15.9 Business Input

- Pet
- Boarding Service
- Appointment 相關住宿資訊
- 實際入住資訊

## 15.10 Business Output

- 入住狀態
- 住宿中狀態
- 退房結果
- 可供 Order 使用的住宿完成資訊

## 15.11 Required Dependencies

- B04 Pet
- B05 Service
- B06 Appointment（當住宿來自預約）

## 15.12 Upstream

- B04 Pet
- B05 Service
- B06 Appointment

## 15.13 Downstream

- B07 Daily Operations
- B10 Order

## 15.14 Definition of Done

- 可以處理基本入住。
- 可以管理住宿中狀態。
- 可以完成退房。
- 可以產生後續交易所需的住宿完成資訊。
- 不加入複雜住宿照護能力。

---

# 16. B10 — Order

## 16.1 Purpose

管理客戶本次消費內容。

## 16.2 Responsibility

B10 負責：

> 客戶這次買了什麼。

## 16.3 Out of Scope

不負責：

- Payment
- Product Inventory
- 會計
- 第三方金流
- 複雜退款系統
- 會員制度
- 點數
- 優惠券

## 16.4 Primary Users

- 老闆
- 店員

## 16.5 Main Operations

- 建立 Order
- 加入服務
- 加入商品
- 查看 Order
- 確認 Order
- 提供付款所需的應付內容

## 16.6 Business Rules

- Order 可以來自 Appointment 服務。
- Order 可以來自 Walk-in 商品。
- Order 不強制依賴 Appointment。
- Order 與 Payment 分離。
- Order 是本次消費內容的主要來源。

## 16.7 Normal Flow

服務完成／商品銷售
→ 建立 Order
→ 加入服務／商品
→ 計算應付內容
→ Order 確認
→ Payment

## 16.8 Exception / Forbidden Conditions

- 不將 Payment 核心責任放入 Order。
- 不要求所有 Order 都必須有 Appointment。
- 不建立 Inventory。

## 16.9 Business Input

- Customer
- Appointment 服務結果
- Grooming 完成資訊
- Boarding 完成資訊
- Product
- 商品／服務購買內容

## 16.10 Business Output

- Order
- Order 明細
- 應付內容
- 可供 Payment 使用的交易資訊

## 16.11 Required Dependencies

- B03 Customer
- B05 Service
- B08 Grooming／B09 Boarding（視交易內容）
- B12 Product（商品交易）

## 16.12 Upstream

- B03 Customer
- B05 Service
- B08 Grooming
- B09 Boarding
- B12 Product

## 16.13 Downstream

- B11 Payment
- B13 Report

## 16.14 Definition of Done

- 可以建立服務／商品 Order。
- 可以處理預約服務所產生的交易。
- 可以處理 Walk-in 商品交易。
- 可以計算應付內容。
- Payment 可以使用 Order 的交易資訊。
- Order 不承擔 Payment 責任。

---

# 17. B11 — Payment

## 17.1 Purpose

管理客戶付款。

## 17.2 Responsibility

B11 負責：

> 客戶怎麼付款、付多少。

## 17.3 Out of Scope

不負責：

- Order 商品／服務內容
- 第三方金流
- 完整會計
- 發票系統
- 複雜退款系統

## 17.4 Primary Users

- 店員
- 老闆

## 17.5 Main Operations

- 查看應付金額
- 記錄付款
- 選擇付款方式
- 記錄實付金額
- 確認付款狀態

## 17.6 Business Rules

- Order 與 Payment 分離。
- Payment 使用 Order 提供的交易內容。
- Payment 負責付款狀態，而不是修改 Order 的核心消費內容。

## 17.7 Normal Flow

Order 確認
→ 取得應付金額
→ 選擇付款方式
→ 記錄付款
→ 確認付款
→ Payment 完成

## 17.8 Exception / Forbidden Conditions

- 不在 Payment Block 內建立商品或服務內容。
- 不建立第三方金流整合。
- 不建立完整財務／會計系統。

## 17.9 Business Input

- Order
- 應付金額
- 實付金額
- 付款方式

## 17.10 Business Output

- Payment
- 付款狀態
- 實付結果

## 17.11 Required Dependencies

- B10 Order

## 17.12 Upstream

- B10 Order

## 17.13 Downstream

- B13 Report

## 17.14 Definition of Done

- 可以取得 Order 應付金額。
- 可以記錄付款方式。
- 可以記錄實付金額。
- 可以確認付款狀態。
- Order 與 Payment 保持責任分離。
- 不加入第三方金流與完整會計功能。

---

# 18. B12 — Product

## 18.1 Purpose

管理店家可販售的基本商品。

## 18.2 Responsibility

B12 負責：

> 店家販售什麼商品。

## 18.3 Out of Scope

不負責：

- Inventory
- 庫存數量
- 庫存異動
- 進貨
- 供應商
- 庫存盤點
- 複雜採購管理

## 18.4 Primary Users

- 老闆
- 店員

## 18.5 Main Operations

- 建立商品
- 查看商品
- 修改商品
- 設定商品價格
- 啟用／停用商品
- 將商品加入 Order

## 18.6 Business Rules

- Product 是商品定義與基本販售能力。
- Product 不等於 Inventory。
- MVP 不管理庫存數量。

## 18.7 Normal Flow

建立 Product
→ 設定基本資料與價格
→ 啟用
→ Walk-in 或其他交易加入 Order

## 18.8 Exception / Forbidden Conditions

- 不建立庫存系統。
- 不建立供應商。
- 不建立進貨流程。
- 不建立庫存盤點。

## 18.9 Business Input

- 商品基本資料
- 商品價格
- 商品啟用狀態

## 18.10 Business Output

- 可販售商品
- 商品基本資訊
- 可供 Order 使用的商品資料

## 18.11 Required Dependencies

- 無主要業務資料依賴

## 18.12 Upstream

- 無

## 18.13 Downstream

- B10 Order

## 18.14 Definition of Done

- 可以管理基本商品。
- 可以管理商品價格。
- 商品可以加入 Order。
- 不建立 Inventory。
- 不加入進貨與供應商管理。

---

# 19. B13 — Report

## 19.1 Purpose

提供店家基本營運統計。

## 19.2 Responsibility

B13 負責：

> 基本營運統計。

## 19.3 Out of Scope

不負責：

- BI
- 高階分析
- 預測
- 客戶分群
- 企業級 Dashboard
- 會計系統

## 19.4 Primary Users

- 老闆

## 19.5 Main Operations

第一版提供基本：

- 預約統計
- 服務完成統計
- 營業額統計
- 基本服務／商品銷售統計

## 19.6 Business Rules

- Report 不建立第二套營運資料來源。
- Report 使用其他 Block 的正式業務資料。
- Report 是統計結果提供者，不是其他 Block 的 Source of Truth。
- 其他 Block 不應以 Report 結果作為自身核心業務資料。

## 19.7 Normal Flow

既有業務資料
→ Report 整理
→ 統計
→ 呈現基本營運結果

## 19.8 Exception / Forbidden Conditions

- 不建立獨立交易資料來源。
- 不把 Report 結果寫回其他 Block 作為核心業務資料。
- 不建立 BI 與高階分析。

## 19.9 Business Input

- Appointment 資料
- Grooming 資料
- Boarding 資料
- Order 資料
- Payment 資料
- Product 相關交易資料

## 19.10 Business Output

- 基本營運統計
- 預約統計
- 服務統計
- 營業額統計
- 基本商品／服務銷售統計

## 19.11 Required Dependencies

- B06 Appointment
- B08 Grooming
- B09 Boarding
- B10 Order
- B11 Payment
- B12 Product（視統計內容）

## 19.12 Upstream

- B06 Appointment
- B08 Grooming
- B09 Boarding
- B10 Order
- B11 Payment
- B12 Product

## 19.13 Downstream

- 報表使用者
- 老闆的營運決策

## 19.14 Definition of Done

- 可以取得基本營運統計。
- 統計來源來自正式業務 Block。
- Report 不建立第二套核心資料。
- 不建立 BI 或高階分析。

---

# 20. Block 關係總覽

## 20.1 基礎資料關係

B03 Customer
→ B04 Pet

B05 Service
→ B06 Appointment

B12 Product
→ B10 Order

B01 Staff / Authentication
→ 提供店內使用者身份

B02 Shop Settings
→ 提供店家基本設定

---

## 20.2 核心業務流程

Customer
→ Pet
→ Appointment
→ Daily Operations
→ Grooming / Boarding
→ Order
→ Payment
→ Report

---

## 20.3 Order 來源

### 預約服務

Appointment
→ Grooming / Boarding
→ Order
→ Payment

### Walk-in 商品

Product
→ Order
→ Payment

因此：

> Order 不強制依賴 Appointment。

---

# 21. Block 建置順序

Block 編號不代表建置順序。

正式建置順序依照：

> 業務依賴

決定。

建議建置方向：

## 第一階段：基礎能力

- B01 Staff / Authentication
- B02 Shop Settings
- B03 Customer
- B04 Pet
- B05 Service
- B12 Product

## 第二階段：核心流程

- B06 Appointment
- B07 Daily Operations

## 第三階段：服務執行

- B08 Grooming
- B09 Boarding

## 第四階段：交易

- B10 Order
- B11 Payment

## 第五階段：統計

- B13 Report

實際工程執行時，若個別 Block 具有更細的技術依賴，仍應遵守：

> 先完成上游能力，再正式進入依賴它的 Block。

---

# 22. Block PASS 原則

Block PASS 不等於整個 MVP 完成。

Block PASS 必須代表：

> 該 Block 可以獨立完成自己負責的 MVP 業務。

至少需要確認：

1. 主要操作可以完成。
2. 主要業務規則正確。
3. 主要異常／禁止操作正確。
4. 輸入與輸出符合業務定義。
5. 依賴關係正常。
6. 實際使用者可以完成該 Block 負責的工作。
7. 沒有加入 MVP 外能力。

---

# 23. 實際操作驗證

Block 的 Definition of Done 不以：

> 程式碼寫完

作為唯一判斷。

必須進行實際操作驗證。

例如 B06 Appointment 至少必須能驗證：

> 建立預約
> → 查看預約
> → 修改預約
> → 取消預約

因此：

> Block Done = 功能完成 + 業務驗證通過。

---

# 24. Block Freeze 原則

Block Design Freeze 後：

> 業務責任與業務邊界正式固定。

不得因為：

> 「另一種設計看起來比較漂亮」

而自行修改。

若開發過程發現真正問題，必須依照 Change Request 處理。

Change Request 至少包含：

1. 原 Freeze 決策
2. 發生的問題
3. 為什麼原方案不可行
4. 新方案
5. 影響範圍
6. 是否值得重新開啟 Freeze

未經確認：

> 不得自行修改 Freeze。

---

# 25. Block Freeze 與技術 Freeze 的界線

## 25.1 Block Freeze 不等於 Database Freeze

Block Freeze 只代表：

> 業務責任與邊界已確定。

不代表：

> Database Schema 已確定。

Database Schema 應於後續適當 Phase 設計。

---

## 25.2 Block Freeze 不等於 API Freeze

Block Freeze 只代表：

> 業務能力已確定。

不代表：

> API Endpoint、Request、Response 已確定。

API 應於後續 API Design Phase 定義。

---

## 25.3 Block Freeze 不等於 UI Freeze

Block Freeze 不代表：

> UI 畫面、元件、Layout 已確定。

UI 應於後續 UI / Frontend Design Phase 定義。

---

# 26. Integration 原則

只有相關 Block 各自 PASS 後，才進行 Integration。

Integration 的目的不是單純驗證：

> API A 能不能呼叫 API B。

而是驗證：

> 真實業務流程能不能完整走通。

---

## 26.1 主要 Happy Path

核心流程方向：

Customer
→ Pet
→ Appointment
→ Daily Operations
→ Grooming / Boarding
→ Order
→ Payment
→ Report

---

## 26.2 Integration 驗證原則

必須確認：

- 上游資料能被下游正確使用。
- Block 不重複建立核心資料。
- Block 不越界執行其他 Block 的責任。
- 業務狀態可以正確往下游傳遞。
- 完整流程可以由實際使用者操作完成。

---

# 27. MVP Scope Coverage 檢查

PHASE 5 Freeze 前必須確認：

> Phase 3 定義的每項 MVP 能力都有明確 Block 負責。

檢查方向：

### Coverage

MVP Scope
→ 是否全部被 Block 覆蓋。

### Responsibility

Block
→ 是否每個能力只有主要責任來源。

### Dependency

Block
→ 是否有合理依賴。

### Scope

Block
→ 是否沒有偷偷加入 MVP 外能力。

---

# 28. Block Map 雙向檢查

必須同時進行：

## 28.1 MVP Scope → Block

確認：

> 每一項 MVP 能力都有 Block 負責。

避免：

> Scope Coverage Gap。

---

## 28.2 Block → MVP Scope

確認：

> 每個 Block 的能力都屬於 MVP Scope。

避免：

> Scope Creep。

---

# 29. Responsibility Overlap 檢查

Freeze 前與後續設計中，都必須檢查是否存在：

> 兩個 Block 同時負責同一項核心業務。

例如：

Appointment：
> 預約

Grooming：
> 實際美容

如果兩者都開始負責「美容完成」：

> 必須重新檢查 Block Boundary。

---

# 30. Block Size 檢查

如果某個 Block 最後包含：

> 客戶 + 寵物 + 預約 + 訂單 + 付款

即使所有能力都屬於 MVP：

> 仍代表 Block 切分可能錯誤。

Block 必須維持：

> 足夠完整以完成自己的業務，但不能大到吞掉其他 Block 的責任。

---

# 31. Circular Dependency 檢查

Block 之間原則上不得存在不必要的循環依賴。

例如：

A → B

同時：

B → A

如果出現：

> 必須重新檢查責任邊界與業務來源。

MVP 優先採用：

> 清楚、單向、可理解的業務依賴。

---

# 32. PHASE 5 明確禁止事項

本 Phase Freeze 後，後續設計不得自行加入：

- Multi-tenant SaaS
- 企業級 RBAC
- 自訂權限系統
- SSO
- MFA
- HR
- 複雜排班
- 複雜容量排程
- 自動派工引擎
- 完整 CRM
- 會員制度
- 點數
- 優惠券
- 完整庫存
- 供應商
- 進貨
- BI
- 高階分析
- 完整會計
- 第三方金流
- 複雜 Notification Center
- LINE API
- 線上自助預約平台
- 醫療管理
- 複雜住宿照護系統

上述能力不代表永久禁止，而是：

> 不屬於 MVP v1.0。

---

# 33. PHASE 5 Freeze Summary

PHASE 5 已完成以下正式決策：

1. 定義統一 Block Design 結構。
2. 定義 13 個 MVP Blocks。
3. 確認每個 Block 的核心業務責任。
4. 確認每個 Block 的責任邊界。
5. 確認主要使用者。
6. 確認主要業務操作。
7. 確認主要業務規則。
8. 確認正常流程。
9. 確認主要異常與禁止操作。
10. 確認業務輸入與輸出。
11. 確認 Required Dependencies。
12. 確認 Upstream / Downstream。
13. 確認 Block Layer。
14. 確認建置順序。
15. 確認 Block Definition of Done。
16. 確認 Block PASS 原則。
17. 確認實際操作驗證。
18. 確認 Integration 原則。
19. 確認 MVP Scope Coverage。
20. 確認 Responsibility Overlap 檢查。
21. 確認 Circular Dependency 檢查。
22. 確認 Scope Creep 檢查。
23. 確認 Block Freeze 規則。
24. 確認 Change Request 規則。
25. 確認 Block Freeze 與 Database / API / UI Freeze 分離。
26. 確認 Report 不成為核心資料來源。
27. 確認 Daily Operations 不建立獨立核心資料來源。
28. 確認 Appointment ≠ Grooming。
29. 確認 Appointment ≠ Boarding。
30. 確認 Order ≠ Payment。
31. 確認 Product ≠ Inventory。
32. 確認 Order 不強制依賴 Appointment。
33. 確認完整業務流程 Integration 驗證方向。

---

# 34. PHASE 5 Final Status

**PHASE-05 — Block Design**

Status:

> **FREEZE**

Freeze Date:

> **2026-08-16**

本文件為 PHASE 5 的正式 Freeze 基準。

後續 Phase 必須以本文件作為 Block 業務責任、邊界、依賴、建置順序與完成條件的正式輸入。

任何需要修改本文件 Freeze 決策的情況，必須依照 Change Request 規則處理。

---

# 35. 下一階段輸入

PHASE 5 完成後，專案已具備：

> MVP Scope
> → MVP Block Map
> → MVP Block Design

下一階段不得跳過既定流程直接進入程式碼。

後續工程設計必須依照：

> Block Design Freeze
> → 後續工程規格
> → Block Development
> → Block Test
> → 實際操作驗證
> → PASS
> → Integration

逐步進行。