\# UI 繁體中文化基準 — Traditional Chinese UI Localization Baseline — v1.0



\## 1. 文件資訊



&#x20;項目  內容 

\------

&#x20;文件名稱  UI 繁體中文化基準 — Traditional Chinese UI Localization Baseline 

&#x20;文件版本  v1.0 

&#x20;文件性質  MVP UI Localization  Freeze Baseline 

&#x20;適用專案  寵物美容／寵物住宿工作室 MVP 

&#x20;適用範圍  MVP 全部使用者可見 UI 

&#x20;語言  繁體中文（台灣） 

&#x20;狀態  FREEZE 

&#x20;Freeze 範圍  MVP Scope 

&#x20;決策基礎  Q1～Q610 已確認決策 + MVP 必要共用 UI 基準 

&#x20;後續用途  作為後續 TASK UI 實作之命名基準 



\---



\# 2. 文件目的



本文件定義寵物美容／寵物住宿工作室 MVP 的繁體中文 UI 基準。



本文件的目的不是建立完整企業級術語庫，也不是預先定義所有未來可能出現的 UI。



本文件的核心目的為：



&#x20;確保目前 MVP 實際落地時，使用者可見 UI 以一致、直覺、符合台灣小型寵物美容／住宿店家使用習慣的繁體中文呈現。



本文件 Freeze 後：



1\. 後續 TASK 不得自行重新翻譯已定義的核心 UI 詞彙。

2\. 相同業務概念不得在不同頁面使用不同中文名稱。

3\. 已定義之操作與狀態不得任意混用。

4\. 未來新增 UI 若本文件已有對應詞彙，必須直接沿用。

5\. 本文件未定義且實際開發時才首次出現的 UI，採「遇到再決定」原則。

6\. 新增詞彙不得破壞既有命名一致性。



\---



\# 3. MVP UI 中文化策略



\## 3.1 核心原則



本 MVP 採用：



&#x20;「先完成能落地使用的 UI 中文化，再於實際使用中迭代。」



不採用：



&#x20;「所有未來可能出現的 UI 術語必須在開發前全部定義。」



因此 UI 中文化的完成標準為：



&#x20;MVP 實際 UI 不應出現未處理的英文 UI 文字。



而不是：



&#x20;所有可能存在的英文單字都必須提前建立翻譯。



\---



\## 3.2 語言風格



UI 使用：



\- 繁體中文

\- 台灣用語

\- 小型寵物店家容易理解的語言

\- 簡潔

\- 直覺

\- 非企業 ERP 化

\- 非技術化

\- 不使用不必要的正式術語



主要使用者：



\- 老闆

\- 櫃台

\- 美容師



\---



\# 4. MVP Block 中文名稱基準



&#x20;Block  English  繁體中文 

\---------

&#x20;01  Staff  Auth  員工／帳號 

&#x20;02  Shop Settings  店家設定 

&#x20;03  Customer  客戶 

&#x20;04  Pet  寵物 

&#x20;05  Service  服務 

&#x20;06  Appointment  預約 

&#x20;07  Daily Operations  今日工作 

&#x20;08  Grooming  美容 

&#x20;09  Boarding  住宿 

&#x20;10  Order  訂單 

&#x20;11  Payment  付款 

&#x20;12  Product  商品 

&#x20;13  Report  報表 



以上為 MVP Block 固定中文名稱。



\---



\# 5. 核心 UI 詞彙基準



\## 5.1 導覽與基礎



&#x20;English  繁體中文 

\------

&#x20;Dashboard  首頁 

&#x20;Navigation  導覽列 

&#x20;Home  首頁 

&#x20;Shop Settings  店家設定 

&#x20;Customer  客戶 

&#x20;Pet  寵物 

&#x20;Appointment  預約 

&#x20;Daily Operations  今日工作 

&#x20;Breadcrumb separator  `` 



\---



\## 5.2 服務



&#x20;English  繁體中文 

\------

&#x20;Service Category  服務分類 

&#x20;Service Description  服務說明 

&#x20;Service Price  服務費用 

&#x20;Duration  服務時長 

&#x20;Service Type  服務類型 

&#x20;Selected Service  已選服務 

&#x20;Add Service  新增服務 

&#x20;Remove Service  移除服務 

&#x20;Service Notes  服務備註 

&#x20;Available Services  可提供服務 



\---



\## 5.3 員工與帳號



&#x20;English  繁體中文 

\------

&#x20;Staff  員工 

&#x20;Staff Name  員工姓名 

&#x20;Staff Role  員工角色 

&#x20;Owner  老闆 

&#x20;Front Desk  櫃台 

&#x20;Groomer  美容師 

&#x20;Login  登入 

&#x20;Logout  登出 

&#x20;Account  帳號 

&#x20;Password  密碼 

&#x20;Login Failed  登入失敗 

&#x20;Invalid Credentials  帳號或密碼錯誤 

&#x20;Session Expired  登入已逾時，請重新登入 

&#x20;Access Denied  沒有存取權限 

&#x20;Permission  權限 

&#x20;Unauthorized  未授權 

&#x20;Account Active  帳號已啟用 

&#x20;Account Inactive  帳號已停用 

&#x20;Change Password  變更密碼 

&#x20;Current Password  目前密碼 



\---



\## 5.4 美容與工作流程



&#x20;English  繁體中文 

\------

&#x20;Grooming  美容 

&#x20;Grooming Status  美容狀態 

&#x20;Waiting  等待中 

&#x20;In Progress  進行中 

&#x20;Grooming Started  已開始美容 

&#x20;Grooming Completed  美容完成 

&#x20;Service Completed  服務完成 

&#x20;Assigned Staff  負責員工 

&#x20;Assign Staff  指派員工 

&#x20;Start Work  開始工作 

&#x20;Grooming Appointment  美容預約 

&#x20;Grooming Details  美容詳細資料 

&#x20;Grooming Notes  美容備註 

&#x20;Grooming Instructions  美容注意事項 

&#x20;Grooming Start Time  美容開始時間 

&#x20;Grooming End Time  美容結束時間 

&#x20;Grooming Duration  美容時長 

&#x20;Groomer  美容師 

&#x20;Groomer Notes  美容師備註 

&#x20;Before Grooming  美容前 

&#x20;After Grooming  美容後 

&#x20;Grooming Photo  美容照片 

&#x20;Add Photo  新增照片 

&#x20;Upload Photo  上傳照片 

&#x20;Photo Uploaded  照片已上傳 



\---



\## 5.5 預約



&#x20;English  繁體中文 

\------

&#x20;Create Appointment  新增預約 

&#x20;Edit Appointment  編輯預約 

&#x20;Cancel Appointment  取消預約 

&#x20;Appointment Confirmation  預約確認 

&#x20;Confirm Appointment  確認預約 

&#x20;Appointment Cancelled  預約已取消 

&#x20;Reschedule  變更預約 

&#x20;Appointment Notification  客戶預約通知 

&#x20;Notify Customer  通知客戶 

&#x20;Appointment Notes  預約備註 

&#x20;Cancel Appointment Confirmation  取消預約確認 

&#x20;Reschedule Appointment  變更預約 

&#x20;Reschedule Appointment Confirmation  變更預約確認 

&#x20;Appointment Changed  預約已變更 

&#x20;Appointment Cancellation Reason  預約取消原因 

&#x20;Cancellation Reason  取消原因 

&#x20;Appointment Reminder  預約提醒 

&#x20;Reminder Sent  提醒已發送 



\---



\## 5.6 現場／到店



&#x20;English  繁體中文 

\------

&#x20;Walk-in  現場 

&#x20;Walk-in Customer  現場客戶 

&#x20;Walk-in Order  現場訂單 

&#x20;Create Walk-in Order  新增現場訂單 

&#x20;Walk-in Service  現場服務 

&#x20;Customer Arrival  客戶到店 

&#x20;Pet Arrival  寵物到店 

&#x20;Check-in Completed  已到店 

&#x20;No Appointment  未預約 

&#x20;Create Customer  新增客戶 

&#x20;Check-in  到店 

&#x20;Check-in Time  到店時間 

&#x20;Checked In  已到店 



\---



\## 5.7 寵物健康與注意事項



&#x20;English  繁體中文 

\------

&#x20;Health Information  健康資訊 

&#x20;Medical Information  醫療資訊 

&#x20;Allergy  過敏 

&#x20;Allergy Information  過敏資訊 

&#x20;Special Needs  特殊需求 

&#x20;Special Instructions  特別注意事項 

&#x20;Aggressive Behavior  攻擊性行為 

&#x20;Fear  Anxiety  害怕／焦慮 

&#x20;Handling Notes  操作注意事項 

&#x20;Customer Instructions  客戶要求 



\---



\## 5.8 報表與統計



&#x20;English  繁體中文 

\------

&#x20;Report  報表 

&#x20;Report Period  報表期間 

&#x20;Start Date  開始日期 

&#x20;End Date  結束日期 

&#x20;Date Range  日期範圍 

&#x20;This Month  本月 

&#x20;Last Month  上月 

&#x20;This Year  今年 

&#x20;Custom Range  自訂範圍 

&#x20;Total Appointments  預約總數 

&#x20;Completed Services  已完成服務 

&#x20;Total Revenue  總營收 

&#x20;Average Order Value  平均訂單金額 

&#x20;Customer Count  客戶數 

&#x20;Pet Count  寵物數 

&#x20;Service Count  服務數 

&#x20;Revenue by Service  服務營收 

&#x20;Revenue by Product  商品營收 

&#x20;Report Summary  報表摘要 

&#x20;Export  匯出 

&#x20;Print  列印 



\---



\## 5.9 每日工作與營運狀態



&#x20;English  繁體中文 

\------

&#x20;Today's Work  今日工作 

&#x20;Today's Schedule  今日預約 

&#x20;Today's Appointments  今日預約 

&#x20;Check-in  到店 

&#x20;Check-in Time  到店時間 

&#x20;Checked In  已到店 

&#x20;Waiting for Service  等待服務 

&#x20;Ready for Service  待服務 

&#x20;Service Started  服務開始 

&#x20;Service In Progress  服務進行中 

&#x20;Service Completed  服務完成 

&#x20;Ready for Pickup  待接回 

&#x20;Customer Notified  已通知客戶 

&#x20;Pickup  接回 

&#x20;Pickup Completed  已接回 

&#x20;No-show  未到店 

&#x20;Late Arrival  遲到 

&#x20;Overdue  已逾期 

&#x20;Cancelled by Customer  客戶取消 

&#x20;Cancelled by Shop  店家取消 

&#x20;Assigned Staff  負責員工 

&#x20;Assign Staff  指派員工 

&#x20;Start Work  開始工作 

&#x20;Work Started  工作已開始 

&#x20;Work Completed  工作已完成 

&#x20;Staff Notes  員工備註 



\---



\## 5.10 住宿



&#x20;English  繁體中文 

\------

&#x20;Boarding  住宿 

&#x20;Boarding Status  住宿狀態 

&#x20;Boarding Reservation  住宿預約 

&#x20;Boarding Details  住宿詳細資料 

&#x20;Boarding Notes  住宿備註 

&#x20;Boarding Instructions  住宿注意事項 

&#x20;Check-in for Boarding  入住 

&#x20;Check-out  退房 

&#x20;Check-in Date  入住日期 

&#x20;Check-out Date  退房日期 

&#x20;Check-in Time  入住時間 

&#x20;Check-out Time  退房時間 

&#x20;Boarding Nights  住宿晚數 

&#x20;Boarding Fee  住宿費用 

&#x20;Room  Area  住宿區域 

&#x20;Boarding Capacity  住宿容量 

&#x20;Available Capacity  剩餘容量 

&#x20;Boarding Started  已入住 

&#x20;Boarding In Progress  住宿中 

&#x20;Boarding Completed  住宿完成 

&#x20;Checked Out  已退房 

&#x20;Boarding Overdue  逾期未退房 



\---



\## 5.11 訂單



&#x20;English  繁體中文 

\------

&#x20;Order  訂單 

&#x20;Order Number  訂單編號 

&#x20;Order Date  訂單日期 

&#x20;Order Status  訂單狀態 

&#x20;Order Details  訂單詳細資料 

&#x20;Order Summary  訂單摘要 

&#x20;Order Item  訂單項目 

&#x20;Order Items  訂單項目 

&#x20;Add Item  新增項目 

&#x20;Remove Item  移除項目 

&#x20;Subtotal  小計 

&#x20;Discount  折扣 

&#x20;Discount Amount  折扣金額 

&#x20;Total Amount  總金額 

&#x20;Amount Due  應付金額 

&#x20;Paid Amount  已付金額 

&#x20;Remaining Amount  剩餘金額 

&#x20;Order Total  訂單總額 

&#x20;Create Order  新增訂單 

&#x20;Edit Order  編輯訂單 

&#x20;Cancel Order  取消訂單 

&#x20;Order Created  訂單已新增 



\---



\## 5.12 付款



&#x20;English  繁體中文 

\------

&#x20;Payment  付款 

&#x20;Payment Status  付款狀態 

&#x20;Payment Method  付款方式 

&#x20;Cash  現金 

&#x20;Credit Card  信用卡 

&#x20;Bank Transfer  銀行轉帳 

&#x20;Mobile Payment  行動支付 

&#x20;Payment Date  付款日期 

&#x20;Payment Time  付款時間 

&#x20;Payment Amount  付款金額 

&#x20;Paid  已付款 

&#x20;Unpaid  未付款 

&#x20;Partially Paid  部分付款 

&#x20;Payment Failed  付款失敗 

&#x20;Payment Confirmation  付款確認 

&#x20;Confirm Payment  確認付款 

&#x20;Refund  退款 

&#x20;Refund Amount  退款金額 

&#x20;Refunded  已退款 

&#x20;Outstanding Amount  未付金額 



\---



\## 5.13 商品



&#x20;English  繁體中文 

\------

&#x20;Product  商品 

&#x20;Product Name  商品名稱 

&#x20;Product Description  商品說明 

&#x20;Product Price  商品價格 

&#x20;Product Item  商品項目 

&#x20;Add Product  新增商品 

&#x20;Edit Product  編輯商品 

&#x20;Remove Product  移除商品 



Product 僅建立 MVP 所需的最低必要 UI 詞彙。



本 Freeze 不延伸至完整庫存、供應商、採購、SKU、條碼、庫存異動等功能。



\---



\# 6. 通用 UI 詞彙基準



以下為全系統共用 UI 基準。



&#x20;English  繁體中文 

\------

&#x20;Save  儲存 

&#x20;Cancel  取消 

&#x20;Confirm  確認 

&#x20;Close  關閉 

&#x20;Back  返回 

&#x20;Next  下一步 

&#x20;Previous  上一步 

&#x20;Search  搜尋 

&#x20;Filter  篩選 

&#x20;Clear  清除 

&#x20;Reset  重設 

&#x20;Refresh  重新整理 

&#x20;Loading  載入中 

&#x20;Submit  送出 

&#x20;View  查看 

&#x20;Details  詳細資料 

&#x20;More  更多 

&#x20;Required  必填 

&#x20;Optional  選填 

&#x20;Success  成功 

&#x20;Error  錯誤 

&#x20;Warning  警告 

&#x20;No Data  暫無資料 

&#x20;No Results  查無結果 

&#x20;Yes  是 

&#x20;No  否 



\---



\# 7. 核心命名規則



\## 7.1 核心業務概念固定名稱



以下詞彙為核心 UI 固定名稱：



&#x20;English  固定中文 

\------

&#x20;Customer  客戶 

&#x20;Pet  寵物 

&#x20;Staff  員工 

&#x20;Groomer  美容師 

&#x20;Appointment  預約 

&#x20;Service  服務 

&#x20;Daily Operations  今日工作 

&#x20;Grooming  美容 

&#x20;Boarding  住宿 

&#x20;Order  訂單 

&#x20;Payment  付款 

&#x20;Product  商品 

&#x20;Report  報表 



不得在不同頁面任意替換為同義詞。



\---



\## 7.2 Create  Add



Create  Add 在 MVP UI 中原則上使用：



&#x20;新增



例如：



\- 新增客戶

\- 新增寵物

\- 新增服務

\- 新增預約

\- 新增訂單

\- 新增商品



\---



\## 7.3 Edit



Edit 使用：



&#x20;編輯



例如：



\- 編輯客戶

\- 編輯寵物

\- 編輯預約

\- 編輯訂單

\- 編輯商品



\---



\## 7.4 Cancel



業務流程取消使用：



&#x20;取消



例如：



\- 取消預約

\- 取消訂單



不得以「刪除」代替業務取消。



\---



\## 7.5 Remove



從選擇項目或明細中移除使用：



&#x20;移除



例如：



\- 移除服務

\- 移除項目

\- 移除商品



\---



\## 7.6 Delete



只有真正執行資料刪除時才使用：



&#x20;刪除



不得因英文原文為 Delete，就在所有情境直接使用「刪除」。



\---



\# 8. 操作與狀態分離規則



操作與狀態不得混為一談。



例如：



&#x20;類型  English  中文 

\---------

&#x20;操作  Cancel Appointment  取消預約 

&#x20;結果狀態  Appointment Cancelled  預約已取消 

&#x20;操作  Reschedule  變更預約 

&#x20;結果狀態  Appointment Changed  預約已變更 

&#x20;操作  Assign Staff  指派員工 

&#x20;結果狀態  Assigned Staff  負責員工 

&#x20;操作  Start Work  開始工作 

&#x20;結果狀態  Work Started  工作已開始 



\---



\# 9. 狀態命名規則



\## 9.1 一般狀態



&#x20;English  中文 

\------

&#x20;Waiting  等待中 

&#x20;In Progress  進行中 

&#x20;Completed  已完成 



\## 9.2 服務狀態



&#x20;English  中文 

\------

&#x20;Waiting for Service  等待服務 

&#x20;Ready for Service  待服務 

&#x20;Service Started  服務開始 

&#x20;Service In Progress  服務進行中 

&#x20;Service Completed  服務完成 



\## 9.3 到店／接回



&#x20;English  中文 

\------

&#x20;Checked In  已到店 

&#x20;Ready for Pickup  待接回 

&#x20;Pickup Completed  已接回 

&#x20;No-show  未到店 

&#x20;Late Arrival  遲到 



\## 9.4 住宿



&#x20;English  中文 

\------

&#x20;Boarding Started  已入住 

&#x20;Boarding In Progress  住宿中 

&#x20;Boarding Completed  住宿完成 

&#x20;Checked Out  已退房 

&#x20;Boarding Overdue  逾期未退房 



\## 9.5 付款



&#x20;English  中文 

\------

&#x20;Paid  已付款 

&#x20;Unpaid  未付款 

&#x20;Partially Paid  部分付款 

&#x20;Payment Failed  付款失敗 

&#x20;Refunded  已退款 



\---



\# 10. 特殊命名規則



\## 10.1 Check-in



一般店家到店流程：



&#x20;Check-in → 到店



例如：



\- Customer Arrival → 客戶到店

\- Pet Arrival → 寵物到店

\- Check-in Time → 到店時間

\- Check-in Completed → 已到店



住宿流程：



&#x20;Check-in for Boarding → 入住



因此「到店」與「入住」不得混用。



\---



\## 10.2 Pickup



Pickup 統一使用：



&#x20;接回



例如：



\- Pickup → 接回

\- Ready for Pickup → 待接回

\- Pickup Time → 接回時間

\- Pickup Completed → 已接回



\---



\## 10.3 Boarding



Boarding 統一使用：



&#x20;住宿



不得因不同頁面任意改成：



\- 寄宿

\- 住店

\- 寄養



\---



\# 11. 通知命名規則



&#x20;English  中文 

\------

&#x20;Notification  通知 

&#x20;Notify Customer  通知客戶 

&#x20;Send Notification  發送通知 

&#x20;Notification Sent  通知已發送 

&#x20;Notification Failed  通知發送失敗 

&#x20;Notification History  通知紀錄 

&#x20;Notification Date  通知日期 

&#x20;Notification Time  通知時間 

&#x20;Appointment Notification  客戶預約通知 

&#x20;Appointment Reminder  預約提醒 

&#x20;Reminder Sent  提醒已發送 

&#x20;Customer Notified  已通知客戶 

&#x20;Notification Settings  通知設定 

&#x20;Enable Notifications  啟用通知 



Notification 與 Reminder 必須保持概念區分：



\- Notification → 通知

\- Reminder → 提醒



\---



\# 12. 金額命名規則



&#x20;English  中文 

\------

&#x20;Price  價格 

&#x20;Fee  費用 

&#x20;Amount  金額 

&#x20;Subtotal  小計 

&#x20;Discount  折扣 

&#x20;Discount Amount  折扣金額 

&#x20;Total Amount  總金額 

&#x20;Order Total  訂單總額 

&#x20;Amount Due  應付金額 

&#x20;Paid Amount  已付金額 

&#x20;Remaining Amount  剩餘金額 

&#x20;Outstanding Amount  未付金額 



\---



\# 13. 日期／時間命名規則



Date：



&#x20;日期



Time：



&#x20;時間



例如：



\- Start Date → 開始日期

\- End Date → 結束日期

\- Appointment Date → 預約日期

\- Check-in Date → 入住日期

\- Check-out Date → 退房日期

\- Payment Date → 付款日期

\- Check-in Time → 入住時間／到店時間，依業務情境決定

\- Payment Time → 付款時間

\- Pickup Time → 接回時間



同一業務情境不得任意混用「日期」「日」「時刻」等名稱。



\---



\# 14. UI 中文化範圍界線



\## 14.1 本次 Freeze 包含



\- MVP 13 Blocks

\- MVP 核心頁面名稱

\- 核心導覽

\- Breadcrumb

\- 核心欄位

\- 核心按鈕

\- 核心狀態

\- 核心提示

\- 核心通知

\- 核心金額

\- 核心日期／時間

\- MVP 必要商品 UI

\- 通用 UI



\---



\## 14.2 本次 Freeze 不包含



以下功能目前不屬於 MVP UI 中文化必要範圍：



\- 企業級 RBAC

\- 多租戶

\- SSO

\- MFA

\- LINE API

\- 線上公開預約平台

\- 完整 POS

\- 完整庫存管理

\- 採購管理

\- 供應商管理

\- SKU 管理

\- 條碼管理

\- 倉庫管理

\- 進階財務

\- 未實作報表

\- 未實作功能

\- 未來版本 UI

\- 尚未存在的特殊錯誤情境



\---



\# 15. Q1～Q610 決策狀態



本文件以 UI 繁體中文化決策流程 Q1～Q610 的已確認結果為基礎。



狀態：



&#x20;Q1～Q610：全部已確認。



其中已確認之核心詞彙與命名規則，本文件統一整理為 Baseline。



Q 編號本身僅屬於決策過程紀錄，不屬於後續程式實作需要引用的 UI ID。



後續 TASK 不需要逐題查詢 Q 編號，只需要依本文件之 English → 繁體中文 Baseline 執行。



\---



\# 16. 未來新增 UI 詞彙規則



Freeze 後，如果實作過程第一次遇到本文件沒有定義的 UI：



\## 情況 A：可依既有規則直接判定



直接依既有命名規則處理。



例如：



&#x20;Add Product



可依 Create  Add → 新增：



&#x20;新增商品



不需要重新建立完整決策流程。



\---



\## 情況 B：存在明顯語意歧義



才需要進行新決策。



例如：



\- 同一英文詞在不同業務情境有不同合理中文

\- 新功能引入新的核心業務概念

\- 新中文名稱可能與既有核心詞衝突



此時新增決策。



\---



\## 情況 C：未來版本功能



如果功能本身不屬於目前 MVP：



&#x20;不提前建立詞彙。



等實際進入該功能開發時再處理。



\---



\# 17. Freeze 後修改規則



\## 17.1 原則



Freeze 後：



&#x20;既有核心詞彙不得任意更換。



\---



\## 17.2 可以修改的情況



只有以下情況可修改：



1\. 實際使用發現明顯誤解。

2\. UI 實作與業務流程不一致。

3\. 使用者實際操作後證明原詞彙不適合。

4\. 新功能造成既有命名衝突。

5\. 明確的 MVP 需求變更。



\---



\## 17.3 修改方式



不得直接在單一頁面自行修改。



應：



1\. 提出修改原因。

2\. 評估影響範圍。

3\. 更新 UI Baseline。

4\. 確認受影響 UI。

5\. 後續 TASK 統一採用新版本。



\---



\# 18. 後續 TASK 實作要求



所有後續前端 TASK：



&#x20;必須以本文件作為 UI 中文命名基準。



AI／工程師不得：



\- 自行重新翻譯

\- 自行創造同義詞

\- 因頁面不同而改名

\- 將「取消」改成「刪除」

\- 將「移除」改成「刪除」

\- 將「預約」改成「預訂」

\- 將「客戶」改成「顧客」

\- 將「住宿」改成「寄宿」

\- 將「美容」改成「美容服務」

\- 將「付款」改成「支付」



除非依照第 17 節程序正式修改 Baseline。



\---



\# 19. MVP UI 繁體中文化 Definition of Done



本階段完成條件：



\- \[x] 13 個 MVP Block 均有固定中文名稱

\- \[x] 核心業務流程已有繁體中文 UI 基準

\- \[x] 核心導覽已有繁體中文

\- \[x] Breadcrumb 已有繁體中文規則

\- \[x] 核心按鈕已有繁體中文

\- \[x] 核心狀態已有繁體中文

\- \[x] 核心欄位已有繁體中文

\- \[x] 預約流程已有繁體中文

\- \[x] 到店流程已有繁體中文

\- \[x] 美容流程已有繁體中文

\- \[x] 住宿流程已有繁體中文

\- \[x] 訂單流程已有繁體中文

\- \[x] 付款流程已有繁體中文

\- \[x] 報表基本 UI 已有繁體中文

\- \[x] Product MVP 最低必要 UI 已建立

\- \[x] 共用 UI 基本詞彙已建立

\- \[x] 操作／狀態已建立區分規則

\- \[x] Cancel／Remove／Delete 已建立區分規則

\- \[x] 核心業務名稱已建立固定基準

\- \[x] 不要求未實作功能提前中文化

\- \[x] 不再以「完整所有未來術語」作為 MVP 中文化阻擋條件

\- \[x] 未來新增 UI 採遇到再決定原則



\---



\# 20. 最終 Freeze 判定



\## UI 繁體中文化



Status FREEZE



\### 判定：



&#x20;MVP Scope Ready



本階段已達到「可以支援 MVP 開發與落地」之最低必要完整度。



不再繼續無限增加 UI 詞彙問題。



後續工作流程改為：



&#x20;MVP 開發 → 實際使用 → 發現問題 → 個別調整 → 更新 Baseline → 繼續迭代



\---



\# 21. Freeze 後的核心原則



&#x20;不要為了完美而阻擋 MVP 落地。



&#x20;目前有 UI 就確保中文；目前沒有 UI 就不要提前設計。



&#x20;遇到問題再調整，而不是在開發前把所有未來問題都解決。



\---



\# 22. 最終基準



本文件 Freeze 後，以下原則正式成立：



&#x20;PSOP MVP UI 以繁體中文（台灣）為主要使用者介面語言。



&#x20;核心 UI 詞彙以本文件為唯一命名基準。



&#x20;後續 TASK 必須沿用既有中文名稱。



&#x20;新增 UI 採「遇到再決定」原則。



&#x20;UI 中文化不再作為 MVP 落地的長期阻擋項目。



\---



\# 23. 文件狀態



&#x20;項目  狀態 

\------

&#x20;UI 繁體中文化決策  FREEZE 

&#x20;Q1～Q610  已確認 

&#x20;MVP 13 Blocks  已盤點 

&#x20;核心 UI 詞彙  已建立 

&#x20;共用 UI 詞彙  已建立 

&#x20;Product MVP 最低詞彙  已建立 

&#x20;命名規則  已建立 

&#x20;操作／狀態規則  已建立 

&#x20;Definition of Done  已完成 

&#x20;Freeze 後修改規則  已建立 

&#x20;MVP UI 中文化  FREEZE 

&#x20;後續策略  開發優先，遇到問題再迭代 



\---



\# 24. 下一階段



UI 繁體中文化已完成 MVP Scope Freeze。



後續不再繼續 Q 題式 UI 詞彙盤點。



專案可以回到 MVP 主要工作：



&#x20;工程實作 → 啟動 → 驗證 → 實際操作 → 發現問題 → 修正 → 迭代。



本文件自此作為後續 TASK 的 UI 繁體中文命名基準。

