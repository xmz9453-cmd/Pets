# MVP Master Blueprint — MVP 主藍圖

- Document ID: MVP-00
- Document Name: MVP Master Blueprint — MVP 主藍圖
- Version: v1.0
- Status: FREEZE
- Phase: Phase 1 — MVP Product Definition
- Freeze Date: 2026-08-15

---

# 1. 文件目的

本文件定義第一版 MVP 的產品定位、核心流程、功能積木、積木責任、依賴關係、開發順序與明確排除範圍。

本文件 Freeze 後，後續技術架構、資料模型、API、UI/UX、程式實作與測試，均應以本文件作為產品基準。

本文件的目的不是建立企業級寵物店 ERP，而是建立一套：

> 適合大多數小型寵物美容／寵物住宿工作室，可以真正用於日常營運的簡單管理系統。

---

# 2. MVP 產品定位

## 2.1 目標市場

本 MVP 主要適用於：

- 小型寵物美容工作室
- 小型寵物住宿工作室
- 同時提供美容與住宿服務的小型寵物店
- 以店內人員操作為主的獨立店家

第一版不以大型連鎖店、企業集團或大規模 SaaS 多租戶平台為目標。

## 2.2 目標使用者

第一版主要使用者：

- 老闆
- 店員
- 美容師

第一版採用固定角色概念，不建立企業級自訂角色與複雜權限系統。

---

# 3. MVP 核心目標

系統必須能完整支援以下核心營運閉環：

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
    美容 / 住宿
      ↓
    服務完成
      ↓
    訂單
      ↓
    付款

這條流程能穩定、正確、重複執行，即代表 MVP 已達成主要產品目標。

---

# 4. MVP 13 個功能積木

第一版正式定義以下 13 個 Blocks：

    01. Staff / Authentication
    02. Shop Settings
    03. Customer
    04. Pet
    05. Service
    06. Appointment
    07. Daily Operations
    08. Grooming
    09. Boarding
    10. Order
    11. Payment
    12. Product
    13. Report

每一個 Block 都具有明確責任。

後續開發不得讓不同 Block 重複擁有相同的核心業務資料。

---

# 5. Block 01 — Staff / Authentication

## 5.1 目的

提供店內工作人員登入系統及基本工作人員管理能力。

## 5.2 負責範圍

- 登入
- 工作人員帳號
- 啟用／停用
- 基本個人資料
- 固定角色
- 基本密碼管理

## 5.3 第一版角色

    老闆
    店員
    美容師

## 5.4 不負責

第一版不做：

- 自訂角色
- 複雜 RBAC
- SSO
- MFA
- 企業 IAM
- HR
- 薪資
- 排班
- 考勤
- 績效管理

---

# 6. Block 02 — Shop Settings

## 6.1 目的

管理店家最基本的營運設定。

## 6.2 負責範圍

- 店家名稱
- 店家電話
- 店家地址
- 營業時間
- 基本預約設定

## 6.3 不負責

- Service 管理
- 員工排班
- 庫存
- 會計
- CRM

Service 為獨立 Block。

---

# 7. Block 03 — Customer

## 7.1 目的

管理客戶基本資料。

## 7.2 負責範圍

- 建立客戶
- 修改客戶
- 搜尋客戶
- 查看客戶
- 客戶備註
- 客戶歷史

## 7.3 核心關係

    Customer
       ↓
      Pet

一個 Customer 可以擁有多個 Pet。

## 7.4 不負責

第一版不做：

- 會員制度
- 會員等級
- 點數
- 優惠券
- CRM
- 行銷系統

---

# 8. Block 04 — Pet

## 8.1 目的

管理寵物基本資料。

## 8.2 負責範圍

- 寵物名稱
- 犬／貓
- 品種
- 基本資料
- 特殊注意事項
- 備註
- 寵物歷史

## 8.3 核心關係

    Customer
       ↓
      Pet
       ↓
    Appointment

## 8.4 不負責

第一版不做：

- 醫療系統
- 完整健康管理
- 疫苗管理平台
- 醫療紀錄系統

---

# 9. Block 05 — Service

## 9.1 目的

定義店家提供的服務。

例如：

- 美容
- 洗澡
- 剪毛
- 指甲
- 住宿

## 9.2 負責範圍

- 服務名稱
- 服務類型
- 基本價格
- 啟用／停用
- 基本服務設定

## 9.3 不負責

- 實際服務執行
- 訂單
- 付款
- 排班

---

# 10. Block 06 — Appointment

## 10.1 目的

管理完整的預約生命週期。

## 10.2 負責範圍

- 建立預約
- 修改預約
- 取消預約
- 預約日期
- 預約時間
- 客戶
- 寵物
- 服務
- 美容師
- 備註
- 預約狀態
- No-show
- 基本衝突檢查
- 基本修改紀錄

## 10.3 核心關係

    Customer
       ↓
      Pet
       ↓
    Appointment
       ↓
     Service

## 10.4 重要責任邊界

Appointment 代表：

> 這次預約。

Appointment 不代表：

> 實際美容做到哪一步。

因此：

    Appointment ≠ Grooming

以及：

    Appointment ≠ Boarding

---

# 11. Block 07 — Daily Operations

## 11.1 定位

Daily Operations 是：

> 店員每天工作的操作中心。

它不是新的業務資料中心。

## 11.2 可以執行的操作

- 查看今日預約
- 查看待到店
- 標記已到店
- 開始美容
- 完成美容
- 入住
- 退房
- 查看待付款

## 11.3 重要原則

Daily Operations 可以操作其他 Block。

但是：

> Daily Operations 不擁有其他 Block 的核心業務資料。

例如：

    Daily Operations
           ↓
       [已到店]
           ↓
    Appointment 更新狀態

而不是：

    Daily Operations
           ↓
    建立另一份 Appointment Status

## 11.4 資料原則

第一版不建立獨立的 Daily Operations 業務資料來源。

Daily Operations 主要由其他 Blocks 的資料組合成店員每日工作畫面。

---

# 12. Block 08 — Grooming

## 12.1 目的

管理實際美容服務執行。

## 12.2 負責範圍

- 美容開始
- 美容狀態
- 美容師
- 實際開始時間
- 實際完成時間
- 美容前狀況
- 美容備註
- 美容照片
- 美容完成

## 12.3 與 Appointment 的關係

    Appointment
    = 豆豆 14:00 有美容預約

    Grooming
    = 豆豆這次美容目前正在進行

Appointment 描述「預約」。

Grooming 描述「實際美容執行」。

---

# 13. Block 09 — Boarding

## 13.1 目的

管理實際住宿生命週期。

## 13.2 負責範圍

- 入住
- 住宿中
- 住宿位置
- 每日備註
- 退房

## 13.3 生命週期

    預約住宿
       ↓
      入住
       ↓
     住宿中
       ↓
      退房

## 13.4 不負責

第一版不做：

- 完整房務系統
- 醫療照護
- 複雜餵食排程
- 遛狗排程
- 完整照護 Checklist

---

# 14. Block 10 — Order

## 14.1 目的

管理：

> 客戶這次買了什麼。

## 14.2 負責範圍

- 建立訂單
- 訂單項目
- 服務
- 商品
- 數量
- 單價
- 小計
- 折扣／手動調整
- 總金額
- 訂單狀態

## 14.3 Order 來源

一般服務：

    Appointment
         ↓
      服務完成
         ↓
       Order

直接購物：

    Walk-in Customer
           ↓
         Order
           ↓
        Product

因此：

> Order 不強制依賴 Appointment。

## 14.4 修改規則

付款前：

> 可以修改。

付款後：

> 原則上不可直接修改原訂單。

---

# 15. Block 11 — Payment

## 15.1 目的

管理實際收款。

## 15.2 負責範圍

- 付款金額
- 付款方式
- 付款時間
- 付款狀態
- 操作人員
- 退款紀錄

## 15.3 基本付款方式

第一版支援基本付款方式，例如：

    現金
    刷卡
    轉帳
    其他

## 15.4 核心關係

    Order
      ↓
    Payment

Order 與 Payment 必須分開。

原因：

    Order
    = 客戶買了什麼

    Payment
    = 客戶怎麼付款

---

# 16. Block 12 — Product

## 16.1 目的

提供商品販售能力。

## 16.2 第一版資料

- 商品名稱
- 售價
- 啟用／停用

## 16.3 第一版不做

- 庫存
- 成本
- 供應商
- 進貨
- 條碼
- 盤點
- 毛利
- 庫存預警

因此：

> Product ≠ Inventory

商品可以加入 Order，但第一版不建立完整庫存系統。

---

# 17. Block 13 — Report

## 17.1 目的

提供基本營運統計。

## 17.2 第一版報表

- 今日營收
- 期間營收
- 美容數量
- 住宿數量
- 訂單數
- 付款數

## 17.3 第一版不做

- BI
- 複雜 Dashboard
- 客戶分析
- 行銷分析
- 預測
- 高階營運分析

---

# 18. Block Dependency Map

    Staff / Authentication
              │
              ↓
        Shop Settings
              │
              ├──────────────────────┐
              │                      │
              ↓                      ↓
          Customer                Service
              │                      │
              ↓                      │
             Pet                     │
              │                      │
              └──────────┬───────────┘
                         ↓
                    Appointment
                         │
                         ↓
                 Daily Operations
                         │
                  ┌──────┴──────┐
                  ↓             ↓
              Grooming       Boarding
                  │             │
                  └──────┬──────┘
                         ↓
                       Order
                         │
                  ┌──────┴──────┐
                  ↓             ↓
               Product       Payment
                                  │
                                  ↓
                                Report

Daily Operations 不擁有其他 Block 的核心業務資料。

---

# 19. MVP 核心 Happy Path — 美容

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

# 20. MVP 核心 Happy Path — 住宿

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

# 21. MVP Walk-in 商品銷售

    Customer
       ↓
    Product
       ↓
    Order
       ↓
    Payment

Walk-in 商品銷售不需要 Appointment。

---

# 22. MVP 明確排除範圍

以下功能不進入第一版 MVP：

    Multi-tenant SaaS
    企業級 RBAC
    自訂權限系統
    SSO
    MFA
    HR
    排班
    複雜容量排程
    自動派工引擎
    完整 CRM
    會員制度
    點數
    優惠券
    完整庫存
    供應商
    進貨
    BI
    高階分析
    完整會計
    第三方金流
    複雜 Notification Center
    LINE API
    線上自助預約平台
    醫療管理
    複雜住宿照護系統

以上項目不代表永久不做。

其定義為：

> 不屬於第一版 MVP。

未來若有實際需求，可以在後續版本重新評估。

---

# 23. MVP Definition of Done

第一版 MVP 必須能讓一家小型寵物美容／住宿工作室完成：

    建立客戶
       ↓
    建立寵物
       ↓
    建立服務
       ↓
    建立預約
       ↓
    查看今日工作
       ↓
    客人到店
       ↓
    執行美容 / 住宿
       ↓
    完成服務
       ↓
    建立訂單
       ↓
    收款
       ↓
    查看基本營運結果

並且：

- 核心資料不互相矛盾
- 核心流程可以重複執行
- 基本錯誤有適當處理
- 店員可以不依賴技術人員操作
- 老闆可以理解基本營運狀況
- 美容師可以完成自己的工作

---

# 24. MVP 開發順序

後續不按照 Block 編號直接開發。

實際開發順序依照資料依賴關係與使用價值。

## 24.1 基礎

    01 Staff / Authentication
    02 Shop Settings

## 24.2 基礎資料

    03 Customer
    04 Pet
    05 Service

## 24.3 預約

    06 Appointment

## 24.4 日常營運

    07 Daily Operations

## 24.5 美容

    08 Grooming

## 24.6 住宿

    09 Boarding

## 24.7 訂單與收款

    10 Order
    11 Payment

## 24.8 商品

    12 Product

## 24.9 報表

    13 Report

---

# 25. Block 開發標準流程

每一個 Block 都遵循以下流程：

    ① 定義 Block
          ↓
    ② 定義資料
          ↓
    ③ 定義 API
          ↓
    ④ Backend 實作
          ↓
    ⑤ Frontend 實作
          ↓
    ⑥ 測試
          ↓
    ⑦ 實際操作驗證
          ↓
    ⑧ PASS
          ↓
    ⑨ Freeze
          ↓
    ⑩ 與既有 Blocks 組裝

---

# 26. Freeze 後的變更規則

Phase 1 Freeze 後，不因為「有更漂亮的架構」就重新設計。

任何後續問題先分類：

    A. Bug
    B. 原決策互相矛盾
    C. 技術實作限制
    D. 真正的新需求
    E. 純粹覺得另一種設計比較漂亮

處理原則：

    A / B / C
    → 可以評估修正

    D
    → 原則上進入 V2 或後續版本

    E
    → 不修改已 Freeze 的設計

任何可能影響 Freeze 決策的變更，都必須先提出、說明原因、確認後才能修改。

---

# 27. 技術架構約束

Phase 2 技術架構必須服務本文件。

不得因為技術架構的偏好而擴張 MVP。

技術選擇必須優先考慮：

    簡單
    可維護
    足夠
    容易開發
    容易測試
    適合小型工作室
    避免企業級過度工程

第一版不得因為「未來可能需要」而提前建立：

- 微服務
- 複雜事件驅動架構
- 複雜 IAM
- 複雜分散式系統
- 不必要的抽象層
- 不必要的 Infrastructure

---

# 28. Phase 2 技術架構的輸入

Phase 2 Technical Architecture 必須以本文件作為產品範圍基準。

Phase 2 將處理：

    Frontend Architecture
    Backend Architecture
    Database Architecture
    Authentication
    File / Photo Storage
    API Structure
    Project Structure
    Development Environment
    Testing Strategy
    Deployment Strategy

Phase 2 不得擅自增加新的產品功能。

如果技術設計發現產品需求不足，應提出問題回到產品決策，而不是自行改變 MVP。

---

# 29. Master Blueprint 的定位

本文件是第一版 MVP 的產品母文件。

後續文件應依照以下關係建立：

    MVP Master Blueprint
            │
            ├── Technical Architecture
            │
            ├── Data Model
            │
            ├── API Specification
            │
            ├── UI / UX Structure
            │
            ├── Block Implementation
            │
            └── Testing

後續技術文件不得反向改變本文件已 Freeze 的產品範圍。

---

# 30. 跨對話恢復規則

若後續因為對話過長而建立新的 Chat，將本文件重新提供給 AI 時，本文件應被視為：

> 第一版 MVP 的目前正式產品基準。

AI 應先依照本文件理解目前產品決策，再進行後續工作。

除非使用者明確要求修改本文件，否則不得自行推翻其中已 Freeze 的產品決策。

---

# 31. Phase 1 Final Freeze Statement

本文件：

- Document ID: MVP-00
- Version: v1.0
- Status: FREEZE
- Phase: Phase 1 — MVP Product Definition
- Freeze Date: 2026-08-15

正式定義第一版 MVP 的：

    產品定位
    核心使用者
    核心業務流程
    13 個功能積木
    Block 責任
    Block 邊界
    Block 依賴關係
    MVP 開發順序
    MVP 排除範圍
    MVP Definition of Done
    Freeze 後變更規則
    Phase 2 技術架構限制

本文件自此成為 Phase 2 Technical Architecture 的上游基準。

---

# 32. 最終 MVP 一句話定義

> 一套讓小型寵物美容／住宿工作室，能從客戶、寵物、預約、今日工作、服務執行一路管理到訂單與付款的簡單營運系統。

---

# END OF MVP-00