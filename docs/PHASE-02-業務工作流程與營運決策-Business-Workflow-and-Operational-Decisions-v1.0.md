\# PHASE-02 — Business Workflow \& Operational Decisions

\# 業務工作流程與營運決策



文件名稱：

PHASE-02-Business-Workflow-and-Operational-Decisions.md



文件編號：

PHASE-02



文件版本：

v1.0



文件狀態：

FREEZE



Freeze Date：

2026-08-15



專案：

寵物美容／住宿工作室 MVP



專案代號：

PET-SHOP-MVP



\---



\# 01. 文件定位



本文件是：



「寵物美容／住宿工作室 MVP」



Phase 2 — Business Workflow \& Operational Decisions

（業務工作流程與營運決策）



的正式 Freeze 文件。



本文件記錄 Phase 2 完成討論、Review 與確認後的正式業務與營運決策。



本文件不是：



\- Database Schema

\- API Specification

\- UI Specification

\- Engineering Design

\- 程式碼規格

\- 完整技術架構文件



本文件的主要用途是：



> 將實際店家日常工作的方式正式整理成後續 MVP 設計可以依據的業務基準。



\---



\# 02. Phase 2 目標



Phase 2 的主要目的：



> 確認小型寵物美容／住宿工作室實際如何工作，以及系統在日常營運中應如何協助店家。



本階段特別重視：



\- 實際店務操作

\- 店員操作習慣

\- 寵物為核心的工作方式

\- 美容流程

\- 住宿流程

\- 商品銷售

\- 訂單與付款

\- 基本報表

\- 工作人員登入與基本角色



本階段不處理：



\- Database Schema

\- API

\- 程式架構

\- UI 細節

\- 第三方服務整合

\- 企業級架構



\---



\# 03. Phase 2 工作原則



本階段遵循以下原則：



\## 03.1 實際店務優先



系統應符合小型寵物美容／住宿店的實際工作方式。



不為了理論上的完整性而增加不必要流程。



\---



\## 03.2 寵物是重要的日常操作中心



實際店務中，店員不一定會先想到「客戶」。



例如：



今天店裡來了一隻：



LUCKY



店員很可能第一個反應是：



> 「今天 LUCKY 來了。」



因此日常搜尋與操作不能只以 Customer 作為唯一入口。



系統應允許店員以：



\- 寵物名稱

\- 客戶姓名

\- 電話



等方式尋找對象。



其中：



> Pet Name 是非常重要的日常搜尋入口。



\---



\## 03.3 Customer 與 Pet 分開管理



Customer：



> 管理寵物主人。



Pet：



> 管理寵物本身。



關係：



Customer

↓

Pet



同一個客戶可以有多隻寵物。



同一個寵物可以被系統清楚辨識其主人。



\---



\## 03.4 預約與實際服務分開



Appointment：



> 表示客戶預約了什麼、什麼時間來。



Grooming：



> 表示這一次美容實際執行到什麼程度。



Boarding：



> 表示這一次住宿實際執行到什麼程度。



因此：



> Appointment 不等於實際服務。



\---



\## 03.5 Daily Operations 不擁有核心業務資料



Daily Operations 是：



> 店員每天工作的操作中心。



它可以整合並操作其他功能。



但不建立另一份獨立的 Customer、Pet、Appointment、Grooming、Boarding、Order 或 Payment 核心資料來源。



\---



\# 04. 核心營運流程



\## 04.1 美容流程



基本流程：



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

客戶／寵物到店

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



\---



\## 04.2 住宿流程



基本流程：



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



\---



\## 04.3 Walk-in 商品流程



商品可以不依賴預約。



基本流程：



Customer

↓

Product

↓

Order

↓

Payment



因此：



> Order 不強制依賴 Appointment。



\---



\# 05. Customer 營運決策



Customer 負責：



\- 客戶姓名

\- 電話

\- 基本聯絡資料

\- 必要客戶備註



Customer 是主人資料來源。



系統不將 Customer 與 Pet 混為同一個資料概念。



\---



\# 06. Pet 營運決策



Pet 負責：



\- 寵物名稱

\- 品種

\- 基本資料

\- 一般備註

\- 服務相關資訊

\- 基本照片



第一版不建立：



\- 醫療病歷

\- 診斷管理

\- 複雜用藥系統

\- 完整健康管理

\- 複雜住宿照護系統



\---



\# 07. Pet 搜尋與日常操作



這是 Phase 2 的重要營運決策。



日常工作時：



> 店員可能先想到寵物，而不是主人。



例如：



搜尋：



LUCKY



可能得到：



LUCKY — 王先生

LUCKY — 李先生



店員再透過：



\- 主人姓名

\- 電話

\- 寵物資料

\- 預約資訊



確認正確對象。



因此：



> Pet Name 必須成為重要的搜尋入口。



同時保留：



\- Customer Name 搜尋

\- Phone 搜尋



以符合不同工作情境。



\---



\# 08. Appointment 營運決策



Appointment 負責：



> 管理客戶預約了什麼、什麼時間來。



Appointment 的核心資訊包括：



\- 客戶

\- 寵物

\- 預約日期

\- 預約時間

\- 服務

\- 備註

\- 基本預約狀態



Appointment 不負責：



\- 實際美容執行

\- 實際住宿執行

\- 訂單

\- 付款



\---



\# 09. Daily Operations 營運決策



Daily Operations 是：



> 店員每天工作的主要操作中心。



主要用途：



\- 查看今天的工作

\- 查看今天有哪些寵物

\- 查看預約

\- 確認到店

\- 開始服務

\- 完成服務

\- 進入結帳流程



Daily Operations 不建立獨立核心業務資料。



它主要負責：



> 將其他業務能力集中成每日可以操作的工作流程。



\---



\# 10. Grooming 營運決策



Grooming 負責：



> 實際美容執行。



基本狀態：



尚未開始

↓

美容中

↓

已完成



第一版不建立過度細分的美容工作系統。



不要求把每個細節都獨立成一個工作模組。



例如不強制建立：



\- 洗澡 Block

\- 吹毛 Block

\- 剪毛 Block

\- 剪腳 Block

\- 剪耳 Block



這些可以作為美容過程中的操作資訊，而不是獨立業務積木。



\---



\# 11. Boarding 營運決策



Boarding 負責：



> 實際住宿生命週期。



基本流程：



預約住宿

↓

入住

↓

住宿中

↓

每日基本紀錄

↓

退房



第一版可以保留基本：



\- 入住資訊

\- 退房資訊

\- 住宿狀態

\- 每日基本紀錄

\- 基本備註

\- 基本照片



第一版不建立：



\- 複雜房間排程

\- 自動容量排程

\- 自動住宿派房引擎

\- 醫療管理

\- 複雜照護系統



\---



\# 12. Order 營運決策



Order 回答：



> 客戶這次買了什麼？



例如：



美容       $800

剪指甲     $100

商品       $150

\----------------

合計       $1,050



Order 可以來自：



\- Appointment

\- Grooming

\- Boarding

\- Walk-in Product Sale



因此：



> Order 不強制依賴 Appointment。



\---



\# 13. Payment 營運決策



Payment 回答：



> 客戶實際付了多少、怎麼付款。



第一版支援基本付款方式，例如：



\- 現金

\- 信用卡

\- 轉帳

\- 行動支付



Payment 與 Order 分開。



\---



\## 13.1 實際付款金額



系統需要記錄：



> 實際付款多少。



例如：



訂單：

$1,000



已付款：

$500



尚欠：

$500



MVP 可以保留未付清狀態。



\---



\## 13.2 分開付款



一張訂單可以存在多筆付款。



例如：



現金：

$500



轉帳：

$500



總付款：



$1,000



\---



\## 13.3 找零



現金交易可以記錄：



應付：

$800



實收：

$1,000



找零：

$200



\---



\## 13.4 付款狀態



訂單至少需要能判斷：



\- 尚未付款

\- 部分付款

\- 已付款



\---



\## 13.5 收款人



付款紀錄應知道：



> 哪位工作人員完成收款。



\---



\## 13.6 退款／取消



第一版支援基本的：



\- 付款取消

\- 基本退款紀錄



但不建立完整財務與會計系統。



\---



\## 13.7 付款歷史



付款完成後應保留基本付款歷史。



例如：



日期：

2026-08-15



付款方式：

現金



金額：

$800



收款人：

小美



\---



\# 14. Product 營運決策



Product 第一版只提供：



> 基本商品資料與基本商品販售能力。



\---



\## 14.1 商品基本資料



至少包含：



\- 商品名稱

\- 售價

\- 販售狀態

\- 基本分類



\---



\## 14.2 商品分類



可以使用基本分類。



例如：



\- 零食

\- 玩具

\- 清潔用品

\- 寵物用品



不建立複雜分類樹。



\---



\## 14.3 商品價格



商品價格修改後：



> 舊訂單必須保留當時實際成交價格。



例如：



8/1：

$100



8/15：

$120



8/1 舊訂單仍應顯示：



$100



第一版不建立複雜價格版本管理系統。



\---



\## 14.4 商品停售



商品停售後：



> 保留商品資料，但標記為停售。



不直接刪除可能已存在於歷史訂單中的商品。



\---



\## 14.5 商品搜尋



商品販售時可以搜尋商品名稱。



\---



\## 14.6 本次售價



商品銷售時，可以針對該次訂單使用實際成交價格。



例如：



商品原價：

$200



本次成交：

$180



\---



\# 15. Inventory 邊界



Phase 2 正式確認：



> Product 不等於 Inventory。



第一版不建立完整庫存管理。



不處理：



\- 庫存數量

\- 自動扣庫存

\- 進貨

\- 供應商

\- 採購

\- 盤點

\- 庫存調整



因此商品銷售不會因為售出而自動建立完整庫存流程。



\---



\# 16. Report 營運決策



Report 只提供：



> 小型店家真正需要的基本營運統計。



不建立企業級 BI。



\---



\## 16.1 基本營業統計



需要能查看：



> 今天營業多少。



\---



\## 16.2 今日來店統計



例如：



今日預約：

8 隻



已到店：

7 隻



尚未到店：

1 隻



\---



\## 16.3 美容統計



例如：



本月美容：

85 次



美容收入：

$68,000



\---



\## 16.4 住宿統計



例如：



本月住宿：

23 次



住宿收入：

$45,000



\---



\## 16.5 商品統計



例如：



本月商品銷售：

$12,000



\---



\## 16.6 時間範圍



第一版提供基本時間範圍。



例如：



\- 今天

\- 本週

\- 本月



不建立複雜分析條件。



\---



\## 16.7 服務類型統計



例如：



美容：

$68,000



住宿：

$45,000



商品：

$12,000



\---



\## 16.8 付款方式統計



例如：



現金：

$50,000



轉帳：

$30,000



其他：

$15,000



\---



\## 16.9 非必要分析



第一版不需要：



\- 最常來店客戶分析

\- 最常來店寵物分析

\- 完整 CRM 分析

\- 客戶價值分析

\- 複雜 BI



\---



\## 16.10 報表匯出



第一版不提供：



\- Excel 匯出

\- CSV 匯出

\- 完整報表匯出中心



優先完成系統內基本營運統計。



\---



\# 17. Staff / Authentication 營運決策



店內工作人員需要登入系統。



第一版採：



> 帳號 + 密碼



\---



\## 17.1 個人帳號



每位工作人員使用自己的帳號。



不使用全店共用帳號作為主要方式。



目的：



可以知道：



\- 誰修改預約

\- 誰完成服務

\- 誰收款

\- 誰執行操作



\---



\# 18. 基本工作人員角色



第一版存在基本角色：



\- 老闆

\- 店員

\- 美容師



\---



\## 18.1 老闆



基本上可以使用全部主要功能。



\---



\## 18.2 店員



主要處理：



\- 客戶

\- 寵物

\- 預約

\- 今日工作

\- 訂單

\- 收款

\- 一般店務



\---



\## 18.3 美容師



主要處理：



\- 查看自己的工作

\- 查看必要寵物資訊

\- 查看必要預約資訊

\- 更新美容工作狀態

\- 完成美容



\---



\## 18.4 查看其他美容師工作



美容師可以看到其他美容師的基本工作資訊。



原因：



小型店家可能需要互相支援。



例如：



A 美容師工作量過大。



B 美容師需要協助處理：



LUCKY



因此不完全禁止美容師看到其他美容師工作。



\---



\# 19. 工作人員帳號管理



老闆可以：



\- 建立工作人員帳號

\- 修改基本資料

\- 停用工作人員帳號



第一版不建立：



\- HR 系統

\- 薪資系統

\- 員工績效系統

\- 複雜身份管理



\---



\# 20. 密碼管理



第一版需要基本的：



> 忘記密碼處理能力。



但不建立完整企業級身份安全中心。



\---



\# 21. 角色與權限邊界



第一版採：



> 基本角色 + 必要權限。



不建立：



\- 複雜 RBAC

\- 自訂角色

\- 自訂權限矩陣

\- 權限編輯器

\- 企業級組織權限



核心原則：



> 只處理小型店家真正需要的權限。



\---



\# 22. 客戶使用方式



第一版主要是：



電話 / LINE / 現場

↓

店員

↓

系統



也就是：



> 第一版以店家內部操作為主要模式。



客人不需要直接登入系統。



\---



\# 23. 線上預約邊界



第一版不把：



> 客人直接線上預約



作為核心流程。



不建立：



\- 客戶自助預約平台

\- LINE API 預約

\- 線上預約網站

\- 複雜預約入口



未來可以再擴充。



\---



\# 24. Phase 2 最終業務模型



Phase 2 確認的主要業務關係：



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



商品可以獨立進入：



Customer

↓

Product

↓

Order

↓

Payment



\---



\# 25. 重要操作入口



第一版日常操作不應只有：



Customer → Pet → Appointment



而應允許多種入口。



主要搜尋方式：



\- Pet Name

\- Customer Name

\- Phone



其中：



> Pet Name 是非常重要的日常搜尋入口。



例如：



搜尋：



LUCKY



結果：



LUCKY — 王先生

LUCKY — 李先生



店員再確認正確主人與預約。



\---



\# 26. MVP 複雜度控制



Phase 2 再次確認：



本專案不以企業級系統為目標。



以下方向不屬於 Phase 2 的 MVP 核心：



\- Enterprise RBAC

\- HR

\- CRM

\- Inventory

\- BI

\- Accounting

\- Payment Gateway

\- LINE API

\- Online Booking Platform

\- Medical Management

\- Complex Boarding Care

\- Complex Scheduling

\- Automatic Dispatch Engine



\---



\# 27. Phase 2 決策結果



Phase 2 共進行：



Q1 ～ Q200



決策方式：



Batch Decision Method



每批通常約：



8～12 題



使用者可以：



\- 全部接受推薦

\- 修改個別題目

\- 使用答案字串



所有決策在 Phase 2 完成前為：



PROVISIONAL



Phase Review 完成後：



FREEZE



\---



\# 28. Phase 2 Review



Phase 2 Review 已完成。



Review 檢查：



1\. 前後決策是否互相矛盾

2\. 是否存在重複功能

3\. 是否加入不必要功能

4\. 是否過度工程化

5\. 是否符合 MVP

6\. 是否符合小型店家

7\. 是否增加不必要開發成本

8\. 是否保留合理未來擴充空間

9\. 是否需要修改前面暫定決策



Review 結果：



> PASS



\---



\# 29. Phase 2 Freeze 決策



使用者已正式確認：



> 「Phase 2 Review 通過，Freeze」



因此：



\# PHASE 2 — FREEZE



Freeze Date：



2026-08-15



\---



\# 30. Freeze 後變更規則



Phase 2 Freeze 後：



不得因為普通新想法任意修改本文件中的正式決策。



如果發現：



\- 真正業務問題

\- 前後決策矛盾

\- 技術限制導致原決策不可行

\- 真正的新需求



必須提出：



> Change Request



至少說明：



1\. 哪一項 Freeze 決策

2\. 發生什麼問題

3\. 為什麼原方案不可行

4\. 新方案

5\. 影響範圍

6\. 是否值得重新開啟



使用者確認後才可以修改。



\---



\# 31. Phase 2 與後續階段的關係



Phase 2 的業務決策將提供給後續階段使用。



下一階段：



\# PHASE 3 — MVP Scope



Phase 3 將確認：



> 第一版真正要做哪些能力，以及哪些能力明確排除。



之後：



PHASE 4

MVP Block Map



↓



PHASE 5

System Design



↓



PHASE 6

Engineering Design



↓



PHASE 7

Block Implementation



↓



PHASE 8

Integration



↓



PHASE 9

MVP Validation



\---



\# 32. Phase 2 不負責的事項



以下內容不因 Phase 2 Freeze 而視為已完成：



\- Database Schema

\- Table Design

\- API Design

\- API Endpoint

\- Frontend Page Design

\- Component Design

\- Backend Folder Structure

\- Database Migration

\- Authentication Technical Implementation

\- File Storage Technical Design

\- Testing Implementation

\- Deployment

\- Production Infrastructure



上述內容必須在後續 System Design / Engineering Design 階段討論。



\---



\# 33. Phase 2 最終基準摘要



\## Product



小型寵物美容／住宿工作室 MVP。



\## Primary Operations



\- Customer

\- Pet

\- Appointment

\- Daily Operations

\- Grooming

\- Boarding

\- Order

\- Payment

\- Product

\- Report

\- Staff / Authentication



\## Core Grooming Flow



Customer

↓

Pet

↓

Appointment

↓

Today's Work

↓

Check-in

↓

Grooming

↓

Complete

↓

Order

↓

Payment



\## Core Boarding Flow



Customer

↓

Pet

↓

Appointment

↓

Check-in

↓

Boarding

↓

Daily Record

↓

Checkout

↓

Order

↓

Payment



\## Walk-in Product Flow



Customer

↓

Product

↓

Order

↓

Payment



\## Important Search Principle



> Pet Name is a major daily search entry.



Also support:



\- Customer Name

\- Phone



\## Product Boundary



Product ≠ Inventory



\## Order Boundary



Order ≠ Payment



\## Appointment Boundary



Appointment ≠ Actual Service Execution



\## Daily Operations Boundary



Daily Operations = Operational Center



Daily Operations ≠ Independent Core Data Source



\---



\# 34. Phase 2 Status



PHASE：



02



NAME：



Business Workflow \& Operational Decisions



VERSION：



v1.0



STATUS：



FREEZE



REVIEW：



PASS



FREEZE DATE：



2026-08-15



NEXT PHASE：



PHASE 3 — MVP Scope



\---



\# END OF PHASE 2

