# PHASE-03 — MVP Scope & Product Boundary — MVP 範圍與產品邊界

- Document ID: PHASE-03
- Document Name: PHASE-03 — MVP Scope & Product Boundary — MVP 範圍與產品邊界
- Version: v1.0
- Status: FREEZE
- Phase: Phase 3 — MVP Scope
- Freeze Date: 2026-08-15

---

# 1. 文件目的

本文件定義本專案第一版 MVP 的正式產品範圍與邊界。

本文件建立在：

- Phase 1 — MVP Product Definition
- Phase 2 — Business Workflow & Operational Decisions

之上。

本文件的目的不是重新設計產品，而是將前面已確認的產品方向與業務決策，整理成：

> 「第一版到底要做到什麼，以及明確不要做到什麼。」

Phase 3 Freeze 後，後續：

- Phase 4 — MVP Block Map
- Phase 5 — System Design
- Phase 6 — Engineering Design
- Phase 7 — Block Implementation
- Phase 8 — Integration
- Phase 9 — MVP Validation

均必須以本文件作為 MVP Scope 基準。

---

# 2. MVP 產品定位

本專案是一套：

> 小型寵物美容／寵物住宿工作室的日常營運管理 MVP。

主要服務：

- 寵物美容
- 寵物住宿

輔助能力：

- 商品基本販售
- 訂單
- 收款
- 基本營運統計

系統主要服務店內工作人員。

第一版不是建立給大型企業使用的 ERP，也不是建立完整 SaaS 平台。

---

# 3. 目標店家

第一版主要適用：

- 1～3 人的小型工作室
- 2～8 人的小型寵物店

典型使用者：

- 老闆
- 店員
- 美容師

同一個人可以同時擔任多種工作。

因此系統不應要求每個人只能擁有單一角色。

---

# 4. MVP 核心價值

第一版最重要的不是功能數量，而是完成以下營運閉環：

    客戶
      ↓
    寵物
      ↓
    預約
      ↓
    今日工作
      ↓
    到店
      ↓
    美容／住宿
      ↓
    服務完成
      ↓
    訂單
      ↓
    付款

只要這條流程能穩定、簡單、正確地運作，即代表 MVP 已具備主要使用價值。

---

# 5. 第一版核心業務範圍

第一版包含以下核心能力：

## 5.1 客戶管理

可以：

- 建立客戶
- 查詢客戶
- 修改客戶
- 查看客戶基本資料
- 查看與客戶相關的寵物

第一版不建立完整 CRM。

---

## 5.2 寵物管理

可以：

- 建立寵物
- 修改寵物
- 查詢寵物
- 查看寵物基本資料
- 記錄必要注意事項
- 查看寵物相關歷史

核心關係：

    Customer
        ↓
      Pet

一個客戶可以有多隻寵物。

---

## 5.3 服務管理

可以：

- 建立服務
- 修改服務
- 啟用／停用服務
- 設定基本價格
- 定義服務類型

主要服務方向：

- 美容
- 洗澡
- 剪毛
- 其他美容相關服務
- 住宿

Service 負責：

> 店家提供什麼服務。

Service 不負責：

> 這一次服務實際做了什麼。

---

# 6. 預約範圍

第一版支援店內建立與管理預約。

主要來源：

    電話
    LINE
    現場
       ↓
    店員
       ↓
    系統建立預約

第一版不以客人自行線上預約為核心。

---

# 7. 預約與實際服務必須分開

第一版明確區分：

    Appointment
    = 預約

    Grooming
    = 實際美容執行

    Boarding
    = 實際住宿生命週期

因此：

    Appointment ≠ Grooming
    Appointment ≠ Boarding

預約存在，不代表服務一定已經執行。

---

# 8. 今日工作範圍

第一版需要提供店員一個：

> 「今天店裡現在要做什麼」

的操作中心。

Daily Operations 可以整合其他 Block 的資料，提供：

- 今日預約
- 待到店
- 已到店
- 待美容
- 美容中
- 待入住
- 住宿中
- 待退房
- 待付款

Daily Operations 不建立另一套核心業務資料。

核心資料仍由各自 Block 管理。

---

# 9. 美容範圍

第一版美容流程包含：

    預約
      ↓
    到店
      ↓
    開始美容
      ↓
    美容執行
      ↓
    完成美容
      ↓
    訂單
      ↓
    收款

Grooming 可以記錄必要的：

- 美容狀態
- 美容師
- 開始時間
- 完成時間
- 美容前狀況
- 美容備註
- 必要照片

第一版不建立複雜美容工作排程引擎。

---

# 10. 住宿範圍

第一版住宿流程包含：

    預約住宿
       ↓
      入住
       ↓
     住宿中
       ↓
    每日基本紀錄
       ↓
      退房
       ↓
      訂單
       ↓
      收款

第一版住宿需要支援基本住宿生命週期。

但不建立完整寵物照護管理平台。

---

# 11. 住宿每日紀錄範圍

第一版允許店員針對住宿中的寵物留下必要的基本紀錄。

例如：

- 基本狀況
- 必要備註
- 特殊事件

目標是：

> 讓店員知道住宿期間發生了什麼。

第一版不建立：

- 複雜照護 Checklist
- 複雜餵食排程
- 遛狗排程
- 醫療照護系統
- 完整健康管理

---

# 12. 訂單範圍

Order 負責：

> 客戶這次買了什麼。

第一版支援：

- 服務項目
- 商品項目
- 數量
- 單價
- 小計
- 折扣／手動調整
- 總金額
- 訂單狀態

Order 可以來自：

## 服務型訂單

    Appointment
        ↓
    服務完成
        ↓
      Order

## Walk-in 商品

    Customer
        ↓
     Product
        ↓
      Order

因此：

> Order 不強制依賴 Appointment。

---

# 13. Walk-in 商品銷售範圍

第一版允許店內直接販售商品。

基本流程：

    Customer
       ↓
     Product
       ↓
      Order
       ↓
    Payment

不需要建立 Appointment。

---

# 14. Payment 範圍

Payment 負責：

> 客戶實際付了多少錢，以及怎麼付款。

第一版支援基本付款方式，例如：

- 現金
- 刷卡
- 轉帳
- 其他

基本資料包含：

- 付款金額
- 付款方式
- 付款時間
- 付款狀態
- 操作人員
- 必要退款紀錄

Order 與 Payment 必須保持分離。

---

# 15. Product 範圍

第一版商品功能只需要支援基本販售。

基本資料：

- 商品名稱
- 售價
- 啟用／停用

商品可以加入 Order。

第一版不建立完整 Inventory。

因此：

> Product ≠ Inventory

---

# 16. Report 範圍

第一版只提供基本營運統計。

主要方向：

- 今日營收
- 期間營收
- 美容數量
- 住宿數量
- 訂單數
- 付款數

Report 的目的：

> 讓老闆快速了解基本營運狀況。

不是建立企業級 BI。

---

# 17. Staff / Authentication 範圍

第一版提供：

- 工作人員登入
- 基本帳號
- 啟用／停用
- 基本密碼管理
- 基本角色

角色方向：

- 老闆
- 店員
- 美容師

第一版不建立複雜 RBAC。

---

# 18. Shop Settings 範圍

第一版提供基本店家設定：

- 店家名稱
- 店家電話
- 店家地址
- 營業時間
- 基本預約設定

不將 Shop Settings 發展成完整企業設定平台。

---

# 19. MVP 產品資料核心

第一版最重要的核心資料關係為：

    Customer
       ↓
      Pet
       ↓
    Appointment
       ↓
     Service
       ↓
    實際執行
      ↙ ↘
 Grooming Boarding
      ↘ ↙
      Order
        ↓
      Payment

另外：

    Product
       ↓
      Order

以及：

    Staff
       ↓
    操作系統

---

# 20. Block 責任原則

每個 Block 必須擁有清楚的責任。

## Customer

負責：

> 誰是客戶。

## Pet

負責：

> 哪一隻寵物。

## Service

負責：

> 店家提供什麼服務。

## Appointment

負責：

> 客戶預約了什麼、什麼時候來。

## Daily Operations

負責：

> 今天店員現在要處理什麼。

## Grooming

負責：

> 這次美容實際做到哪裡。

## Boarding

負責：

> 這次住宿目前到哪個階段。

## Order

負責：

> 客戶這次買了什麼。

## Payment

負責：

> 客戶怎麼付款、付了多少。

## Product

負責：

> 店家販售哪些商品。

## Report

負責：

> 從既有營運資料整理出基本統計。

---

# 21. 不允許重複擁有核心資料

第一版必須避免：

同一份核心業務資料被不同 Block 各自保存一份。

例如：

Daily Operations 不應建立另一份：

- Appointment
- Grooming
- Boarding
- Order

的核心資料。

正確方式：

    Daily Operations
          ↓
    讀取／操作既有資料
          ↓
    Appointment
    Grooming
    Boarding
    Order
    Payment

---

# 22. MVP 主要操作角色

## 老闆

第一版原則上可以查看及操作大部分系統功能。

## 店員

主要負責：

- 客戶
- 寵物
- 預約
- 今日工作
- 訂單
- 收款
- 基本住宿操作

## 美容師

主要負責：

- 查看自己的工作
- 執行美容
- 更新美容狀態
- 記錄必要美容資訊

詳細權限仍由後續技術設計落實，但不得因此建立企業級權限系統。

---

# 23. 客戶端範圍

第一版系統主要是：

> 店家內部操作系統。

客人不需要直接登入系統才能完成主要流程。

第一版不建立：

- 客戶帳號平台
- 客戶自助預約平台
- 客戶會員中心
- 線上付款平台

未來如有需要，可以在後續版本加入。

---

# 24. MVP 明確排除範圍

以下功能不屬於第一版 MVP：

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

這些功能不是永久禁止。

定義為：

> 不進入 MVP v1.0。

未來如有實際需求，再以新版本重新評估。

---

# 25. MVP 不提前建立未來功能

第一版不因為：

- 「以後可能需要」
- 「未來可能擴充」
- 「現在先做比較方便」
- 「架構上比較漂亮」

而提前加入非 MVP 功能。

例如：

不因為未來可能做庫存，就提前建立完整 Inventory。

不因為未來可能做 SaaS，就提前建立 Multi-tenant。

不因為未來可能有很多角色，就提前建立複雜 RBAC。

原則：

> 未來需要時再做。

---

# 26. MVP Happy Path — 美容

第一版必須能完成：

    建立客戶
       ↓
    建立寵物
       ↓
    建立美容服務
       ↓
    建立預約
       ↓
    今日工作
       ↓
    客戶到店
       ↓
    標記已到店
       ↓
    開始美容
       ↓
    完成美容
       ↓
    建立訂單
       ↓
    收款
       ↓
    完成

---

# 27. MVP Happy Path — 住宿

第一版必須能完成：

    建立客戶
       ↓
    建立寵物
       ↓
    建立住宿服務
       ↓
    建立預約
       ↓
    客戶送寵物到店
       ↓
    入住
       ↓
    住宿中
       ↓
    每日基本紀錄
       ↓
    退房
       ↓
    建立訂單
       ↓
    收款
       ↓
    完成

---

# 28. MVP Happy Path — Walk-in 商品

第一版必須能完成：

    Customer
       ↓
    Product
       ↓
    Order
       ↓
    Payment

Walk-in 商品銷售不需要 Appointment。

---

# 29. MVP 完成條件

MVP v1.0 必須至少能讓小型工作室完成：

    客戶建立
       ↓
    寵物建立
       ↓
    服務建立
       ↓
    預約建立
       ↓
    今日工作
       ↓
    到店
       ↓
    美容／住宿執行
       ↓
    服務完成
       ↓
    訂單
       ↓
    收款
       ↓
    基本營運統計

並且：

- 核心資料一致
- 核心流程可以重複執行
- 基本錯誤可以被適當處理
- 店員可以獨立完成日常操作
- 老闆可以查看基本營運結果
- 美容師可以完成必要美容工作
- 系統不需要依賴技術人員才能完成一般店務操作

---

# 30. MVP Scope 與後續 Phase 的關係

本文件只定義：

> MVP 要做什麼。

後續 Phase 再分別處理：

    Phase 4
    MVP Block Map
          ↓
    Phase 5
    System Design
          ↓
    Phase 6
    Engineering Design
          ↓
    Phase 7
    Block Implementation
          ↓
    Phase 8
    Integration
          ↓
    Phase 9
    MVP Validation

技術設計不得自行擴張本文件的產品範圍。

---

# 31. Phase 4 的輸入

Phase 4 — MVP Block Map 將以本文件為輸入。

Phase 4 主要確認：

- 哪些能力應成為獨立 Block
- 哪些能力可以合併
- 每個 Block 的責任
- Block 之間的依賴
- Block 建置順序
- Block 的接口
- Block 的完成條件

Phase 4 不重新決定 MVP 是否要加入新的產品功能。

如果發現產品範圍不足：

> 必須提出問題，而不是自行增加功能。

---

# 32. Phase 3 Review 結論

本 Phase Review 已確認：

1. MVP 仍以小型寵物美容／住宿工作室為主要目標。
2. 美容與住宿仍為核心服務。
3. 商品只提供基本販售能力。
4. 系統仍以店內工作人員操作為主。
5. Customer、Pet、Service、Appointment、Grooming、Boarding、Order、Payment 等核心能力維持清楚責任。
6. Daily Operations 不建立獨立核心業務資料。
7. Order 與 Payment 維持分離。
8. Product 不等於 Inventory。
9. 不因未來需求提前增加大型功能。
10. MVP 維持簡單、可理解、可開發、可測試、可實際營運的方向。
11. MVP 排除範圍維持不變。
12. Phase 3 範圍與前面已 Freeze 的產品方向沒有衝突。

---

# 33. Phase 3 Freeze Statement

本文件：

- Document ID: PHASE-03
- Document Name: PHASE-03 — MVP Scope & Product Boundary — MVP 範圍與產品邊界
- Version: v1.0
- Status: FREEZE
- Phase: Phase 3 — MVP Scope
- Freeze Date: 2026-08-15

正式 Freeze。

本文件自此成為：

> Phase 4 — MVP Block Map

的正式上游基準。

Phase 4 不得在未經 Change Request 與使用者確認的情況下，擴張本文件所定義的 MVP 產品範圍。

---

# 34. Phase 3 最終結論

第一版 MVP 的核心不是：

> 做很多功能。

而是：

> 用最少但足夠的功能，讓一家小型寵物美容／住宿工作室真正完成每天的營運流程。

核心閉環：

    Customer
        ↓
      Pet
        ↓
   Appointment
        ↓
 Daily Operations
        ↓
 Grooming / Boarding
        ↓
      Order
        ↓
     Payment
        ↓
      Report

這條閉環即為 MVP v1.0 的主要產品範圍。

---

# END OF PHASE-03