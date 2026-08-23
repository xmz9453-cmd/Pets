\# TASK-0016 FREEZE — 報表 Report v1.0



\## 1. Document Information



| Field | Value |

|---|---|

| Task | TASK-0016 |

| 中文名稱 | 報表 |

| English Name | Report |

| Version | v1.0 |

| Status | FREEZE |

| Decision Questions | Q1–Q150 |

| Decision Status | 150 / 150 Confirmed |

| Scope Status | FREEZE |

| Product Type | Small Pet Grooming / Boarding Studio MVP |

| Previous Task | TASK-0015 — Product Management |

| Next Task | TASK-0017 — System Integration |



\### Formal File Name



`TASK-0016 報表 Report v1.0.md`



\---



\## 2. Task Objective



TASK-0016 負責建立 MVP 所需的基本營運報表功能。



目的為讓小型寵物美容／寵物住宿工作室能夠直接查看基本營運結果，包括：



\- 訂單數量

\- 有效訂單

\- 已完成訂單

\- 取消訂單

\- 實收營收

\- 未付款／尚欠金額

\- 付款方式

\- 商品銷售

\- 服務使用

\- 住宿使用

\- 每日營運結果



本 TASK 只負責 MVP 必要的營運資訊呈現，不建立企業級 BI、ERP、會計或進階 Analytics 系統。



\---



\## 3. Scope



\### 3.1 Report Page



系統必須提供 Report 頁面。



Report 頁面必須支援：



\- 日期範圍選擇

\- 預設日期為今天

\- 自訂開始日期

\- 自訂結束日期

\- 跨月日期查詢

\- 結束日包含完整一天

\- 基本營運摘要

\- 訂單統計

\- 付款統計

\- 每日營收

\- 商品統計

\- 服務統計

\- 住宿統計



\---



\## 4. Date Range



\### 4.1 Default Date Range



Report 頁面首次載入時：



\- 預設日期範圍為今天

\- 不要求使用者先手動輸入日期



\### 4.2 Custom Date Range



使用者可以指定：



\- Start Date

\- End Date



\### 4.3 Cross-Month Query



日期範圍允許跨月。



例如：



\- 2026-08-25 ～ 2026-09-05



不得因月份不同而拒絕查詢。



\### 4.4 End Date Semantics



End Date 必須包含該日期的完整一天。



例如：



`2026-08-23 ～ 2026-08-23`



代表完整的 2026-08-23，而不是只包含 00:00。



\---



\## 5. Order Statistics



Report 必須提供基本訂單統計。



\### 5.1 Total Orders



顯示指定日期範圍內的訂單總數。



\### 5.2 Valid Orders



顯示指定日期範圍內的有效營運訂單數。



取消訂單不得被視為有效營運訂單。



\### 5.3 Completed Orders



顯示指定日期範圍內已完成的訂單數。



\### 5.4 Cancelled Orders



顯示指定日期範圍內取消的訂單數。



取消訂單必須能與有效訂單區分。



\### 5.5 Average Order Amount



Report 必須提供平均訂單金額。



平均訂單金額：



\- 排除取消訂單

\- 以有效訂單作為計算基礎

\- 不要求訂單必須已付款



\---



\## 6. Revenue



\### 6.1 Revenue Definition



營收統計以：



> Payment 實際付款時間



作為日期統計基準。



不得以：



\- Order 建立時間

\- Appointment 時間

\- Service 完成時間



取代 Payment 實際付款時間作為實收營收統計基準。



\### 6.2 Actual Revenue



Report 必須顯示指定日期範圍內的實際收款金額。



\### 6.3 Void Payment



已作廢付款：



\- 不計入實收營收

\- 不計入已付款總額



此規則必須與 TASK-0014 Payment Execution / Payment Management 保持一致。



\### 6.4 Unpaid / Outstanding Amount



Report 必須能顯示尚未收款的金額。



未付款金額：



\- 不計入實收營收

\- 可作為獨立的營運資訊顯示



TASK-0016 不建立完整應收帳款系統。



\---



\## 7. Payment Method Statistics



Report 必須提供基本付款方式統計。



至少依既有 Payment 資料中的付款方式進行統計，例如：



\- 現金

\- 信用卡

\- 轉帳



統計只計入有效付款。



已作廢付款不得計入有效付款方式統計。



不得建立新的 Payment Method Framework。



\---



\## 8. Daily Revenue



Report 必須提供指定日期範圍內的每日營收明細。



每日營收至少包含：



| Field | Requirement |

|---|---|

| Date | 必須 |

| Order Count | 必須 |

| Payment Amount | 必須 |



每日營收以有效 Payment 的實際付款日期計算。



\---



\## 9. Product Statistics



TASK-0016 必須提供基本商品銷售統計。



\### 9.1 Product Quantity



顯示指定期間內的商品銷售數量。



\### 9.2 Product Amount



顯示指定期間內的商品銷售金額。



\### 9.3 Valid Order Only



商品銷售統計只計入有效訂單。



取消訂單不得計入商品銷售統計。



\### 9.4 Historical Transaction Price



商品銷售金額必須依既有 Order Item 保存的：



`transaction\_price`



計算。



商品目前售價日後發生變更：



> 不得改變歷史 Order Item 的交易價格。



\---



\## 10. Service Statistics



TASK-0016 必須提供基本服務統計。



至少包含：



\- 各服務使用次數

\- 各服務相關金額



服務統計必須以有效營運訂單為基礎。



不建立員工績效或薪資相關統計。



\---



\## 11. Boarding Statistics



TASK-0016 必須提供基本住宿營運統計。



至少包含：



\- 住宿使用量

\- 住宿相關訂單／金額基本統計



住宿統計以 MVP 現有 Boarding / Order 資料為基礎。



不得延伸為完整住宿 BI。



\---



\## 12. UI Requirements



\### 12.1 Language



Report UI 必須遵守：



`UI 繁體中文化基準 Traditional Chinese UI Localization Baseline v1.0`



使用者可見文字必須使用繁體中文。



\### 12.2 Required UI Sections



Report 頁面至少提供：



1\. 日期範圍

2\. 營運摘要

3\. 訂單統計

4\. 收款統計

5\. 每日營收

6\. 商品統計

7\. 服務統計

8\. 住宿統計



\### 12.3 UI States



Report 頁面至少處理：



\- Loading

\- Empty Result

\- Successful Result

\- Validation Error

\- API Error



\---



\## 13. Backend / API Requirements



TASK-0016 可以建立 Report 所需的專用 API。



API 可以依實際實作需要提供：



\- Report Summary

\- Order Statistics

\- Revenue Statistics

\- Payment Method Statistics

\- Daily Revenue

\- Product Statistics

\- Service Statistics

\- Boarding Statistics



API 設計原則：



> 只建立 Report 真正需要的 API。



不得建立通用 BI Query Engine 或 Generic Analytics API。



\---



\## 14. Data Requirements



Report 必須使用既有 MVP 資料模型。



主要資料來源包括：



\- Orders

\- Order Items

\- Payments

\- Products

\- Services

\- Boarding



不得因 TASK-0016 而建立：



\- Inventory Model

\- Accounting Ledger

\- Financial Statement Model

\- Analytics Warehouse

\- BI Data Mart

\- Forecast Model



除非既有資料模型為完成必要 Report 計算而必須進行最小程度調整，否則不得修改既有資料模型。



\---



\## 15. Authorization



TASK-0016 沿用既有 MVP Staff / Role 機制。



既有角色：



\- Owner

\- Front Desk

\- Groomer



Report 不建立獨立的 Enterprise RBAC。



不得建立：



\- Permission Matrix System

\- BI Role System

\- Report Builder Permission System

\- Enterprise Authorization Framework



\---



\## 16. Validation



Report 日期查詢至少必須驗證：



\- Start Date 格式有效

\- End Date 格式有效

\- Start Date 不得晚於 End Date



非法日期範圍必須拒絕查詢並提供明確錯誤訊息。



\---



\## 17. Business Rules



\### 17.1 Revenue Rule



實收營收：



> 有效 Payment 的實際付款金額總和。



\### 17.2 Void Payment Rule



已作廢 Payment：



> 不計入 Revenue。



\### 17.3 Outstanding Rule



尚欠金額：



> 有效 Order 金額 − 有效 Payment 金額。



不得將已作廢 Payment 視為有效付款。



\### 17.4 Cancelled Order Rule



取消 Order：



\- 不列入有效營運訂單

\- 不列入商品有效銷售

\- 不列入服務有效使用

\- 不列入住宿有效使用



但可以在 Order Statistics 中獨立顯示取消數量。



\### 17.5 Transaction Price Rule



歷史 Order Item：



> 以保存的 `transaction\_price` 為準。



Product 未來改價不得修改歷史交易價格。



\---



\## 18. Explicit Out of Scope



以下功能全部不屬於 TASK-0016：



\### 18.1 BI / Analytics



\- BI Platform

\- Advanced Analytics

\- Forecasting

\- Predictive Analytics

\- Customer Segmentation

\- Trend Intelligence

\- Advanced KPI Engine



\### 18.2 ERP / Accounting



\- ERP

\- General Ledger

\- Accounting

\- Financial Statements

\- Tax Accounting

\- Cost Accounting

\- Accounts Receivable System

\- Accounts Payable System



\### 18.3 Employee Management



\- Employee KPI

\- Groomer Ranking

\- Staff Performance Analysis

\- Payroll

\- Commission Calculation



\### 18.4 Inventory / Product Expansion



\- Inventory

\- SKU

\- Barcode

\- Supplier

\- Purchase Management

\- Stock Cost

\- Inventory Turnover



\### 18.5 Advanced Dashboard



\- Dashboard Builder

\- Drag-and-Drop Widgets

\- Custom Dashboard

\- User-defined KPI

\- Custom Report Designer



\### 18.6 Export / Delivery



\- CSV Export

\- Excel Export

\- Print Report

\- Scheduled Email Report

\- Automated Report Delivery



\---



\## 19. Testing Requirements



TASK-0016 必須至少驗證：



\### 19.1 Date Range



\- Default today

\- Custom start date

\- Custom end date

\- Cross-month range

\- End date includes full day

\- Invalid date range rejected



\### 19.2 Order Statistics



\- Total orders

\- Valid orders

\- Completed orders

\- Cancelled orders

\- Average order amount



\### 19.3 Revenue



\- Actual payment amount

\- Payment date filtering

\- Void payment excluded

\- Outstanding amount

\- Historical transaction price



\### 19.4 Payment Methods



\- Cash

\- Existing payment methods

\- Void payment excluded



\### 19.5 Product



\- Product quantity

\- Product amount

\- Cancelled order excluded

\- Historical transaction price preserved



\### 19.6 Service



\- Service usage count

\- Service amount



\### 19.7 Boarding



\- Boarding usage

\- Boarding amount



\### 19.8 UI



\- Traditional Chinese UI

\- Loading state

\- Empty state

\- Success state

\- Error state

\- Date range interaction

\- Report data rendering



\### 19.9 Regression



必須執行既有 MVP regression tests。



TASK-0016 不得破壞：



\- Order

\- Payment

\- Product

\- Service

\- Boarding

\- Customer

\- Pet

\- Appointment

\- Staff/Auth



等既有功能。



\---



\## 20. Browser E2E Requirements



Browser E2E 至少驗證：



1\. Login

2\. Navigate to Report

3\. Report UI 使用繁體中文

4\. 預設日期正確

5\. 修改日期範圍

6\. Report 成功載入

7\. Order statistics 正確

8\. Revenue 正確

9\. Void Payment 不計入 Revenue

10\. Outstanding amount 正確

11\. Payment method statistics 正確

12\. Product statistics 正確

13\. Service statistics 正確

14\. Boarding statistics 正確

15\. Empty result 正常顯示

16\. Invalid date range 正確拒絕

17\. Existing Order / Payment / Product workflow 未被破壞



\---



\## 21. Definition of Done



TASK-0016 只有在以下條件全部成立時，才可進入 Human Acceptance：



\- \[ ] Report backend implementation completed

\- \[ ] Report API completed

\- \[ ] Report UI completed

\- \[ ] Traditional Chinese UI completed

\- \[ ] Date range completed

\- \[ ] Order statistics completed

\- \[ ] Revenue statistics completed

\- \[ ] Payment method statistics completed

\- \[ ] Daily revenue completed

\- \[ ] Product statistics completed

\- \[ ] Service statistics completed

\- \[ ] Boarding statistics completed

\- \[ ] Void Payment exclusion verified

\- \[ ] Outstanding amount verified

\- \[ ] Historical transaction price verified

\- \[ ] Unit / API tests passed

\- \[ ] Full regression passed

\- \[ ] Browser E2E passed

\- \[ ] Scope verification passed

\- \[ ] `git diff --check` passed

\- \[ ] No out-of-scope feature introduced

\- \[ ] No PSOP scope introduced

\- \[ ] No BI / ERP / Accounting scope introduced

\- \[ ] No unnecessary migration introduced



\---



\## 22. Scope Boundary



TASK-0016 的唯一核心定位：



> \*\*MVP 基本營運報表。\*\*



Report 必須回答以下核心營運問題：



1\. 這段期間有多少訂單？

2\. 有多少有效訂單？

3\. 有多少已完成訂單？

4\. 有多少取消訂單？

5\. 實際收到多少錢？

6\. 還有多少未付款？

7\. 使用哪些付款方式？

8\. 商品賣了多少？

9\. 服務使用了多少？

10\. 住宿產生多少基本營運量？



除上述 MVP 營運需求之外，不得自行擴張 TASK-0016 Scope。



\---



\## 23. Freeze Rules



TASK-0016 Freeze 後：



\- 不得自行新增功能

\- 不得自行擴張 Report Scope

\- 不得加入 PSOP 功能

\- 不得加入 BI

\- 不得加入 ERP

\- 不得加入會計系統

\- 不得加入進階 Analytics

\- 不得自行改變已確認的統計口徑

\- 不得自行改變 Revenue 定義

\- 不得自行改變 Void Payment 規則

\- 不得自行改變 Historical Transaction Price 規則



任何超出本文件 Scope 的需求，必須另行建立 Decision。



\---



\## 24. Final Freeze Status



| Item | Status |

|---|---|

| Q1–Q150 Decision | COMPLETE |

| Scope Confirmation | CONFIRMED |

| MVP Scope | LOCKED |

| Out of Scope | LOCKED |

| Business Rules | LOCKED |

| UI Boundary | LOCKED |

| API Boundary | LOCKED |

| Testing Boundary | LOCKED |

| PSOP Expansion | PROHIBITED |

| BI Expansion | PROHIBITED |

| ERP Expansion | PROHIBITED |

| Accounting Expansion | PROHIBITED |

| Task Status | \*\*FREEZE\*\* |



\# TASK-0016 = FREEZE
