\# TASK-00 — 任務框架 — Task Framework



\- Document ID: TASK-00

\- Document Name: 任務框架 — Task Framework

\- Version: v1.0

\- Status: FREEZE

\- Project: 小型寵物美容／寵物住宿工作室 MVP 營運管理系統

\- Created: 2026-08-17

\- Filename: `TASK-00-任務框架-Task-Framework-v1.0.md`



\---



\# 1. Document Purpose



本文件定義 PSOP MVP 專案後續所有工程 TASK 的標準框架、執行規則、驗收規則與 Coding AI Handoff 規則。



本文件的核心目的：



> 將已完成 Freeze 的 Phase、Business Block、Architecture 與工程規格，轉換成 Coding AI 可以直接執行、測試、驗收與回報的標準工程工作單位。



正式工程鏈：



```text

PHASE FREEZE

&#x20;   ↓

BLOCK SPECIFICATION

&#x20;   ↓

TASK

&#x20;   ↓

CODING AI

&#x20;   ↓

IMPLEMENTATION

&#x20;   ↓

TESTING

&#x20;   ↓

VERIFICATION

&#x20;   ↓

PASS / FAIL / BLOCKED

&#x20;   ↓

TASK FREEZE

```



\---



\# 2. TASK Framework Status



本 Framework 已完成：



```text

Q1～Q40

→ 全部完成

→ 全部採用 AI 推薦答案

→ Framework Review 完成

→ TASK Framework FREEZE

```



本文件自此成為：



> \*\*所有後續正式 TASK 的共同工程標準。\*\*



除非依 Change Request 規則重新開啟，否則不得自行修改本 Framework。



\---



\# 3. TASK Definition



TASK 定義為：



> 一個具有明確範圍、前置條件、工程要求、驗收條件與驗證方式，並且可以交給 Coding AI 執行的獨立工程工作單位。



TASK 不是：



\- 待辦事項

\- 技術筆記

\- 開發日誌

\- 隨意的工作描述

\- Coding AI 自行發揮的需求



TASK 必須能夠回答：



```text

做什麼？

為什麼做？

依據什麼做？

哪些可以做？

哪些不能做？

需要什麼前置條件？

怎麼實作？

怎麼測試？

怎麼驗證？

什麼情況必須停止？

什麼情況算 PASS？

```



\---



\# 4. Project Engineering Hierarchy



TASK 必須服從既有專案架構：



```text

PHASE

&#x20;   ↓

BUSINESS BLOCK

&#x20;   ↓

BLOCK SPECIFICATION

&#x20;   ↓

TASK

&#x20;   ↓

IMPLEMENTATION

&#x20;   ↓

VERIFICATION

```



各層責任：



\## PHASE



負責：



\- Product Decision

\- Business Decision

\- Scope Decision

\- Architecture Decision

\- Engineering Planning Decision



\## BUSINESS BLOCK



負責：



\- Business Responsibility

\- Domain Boundary

\- Block Capability

\- Block Collaboration



\## TASK



負責：



\- Engineering Implementation

\- Testing

\- Verification

\- Delivery



\## CODING AI



負責：



> Implementation Agent



不得取代 Product Owner、Business Decision Maker 或 Architecture Decision Maker。



\---



\# 5. Source of Truth



TASK 必須明確指定 Source of Truth。



正式優先順序：



```text

Approved Freeze

&#x20;   ↓

TASK

&#x20;   ↓

Implementation

```



TASK 不得覆蓋既有 Freeze。



如果 TASK 與既有 Freeze 發生衝突：



```text

TASK

&#x20;   ↓

Conflict Detected

&#x20;   ↓

STOP

&#x20;   ↓

REPORT

&#x20;   ↓

CHANGE REQUEST

&#x20;   ↓

Approved Decision

&#x20;   ↓

Update TASK

&#x20;   ↓

Continue

```



Coding AI 不得自行選擇較合理的方案。



\---



\# 6. TASK Standard Metadata



每個正式 TASK 必須至少包含：



```text

TASK ID

TASK Name

Version

Status

```



範例：



```text

TASK-0001

Customer Backend Foundation

v1.0

READY

```



\---



\# 7. TASK Standard Structure



正式 TASK 應依下列標準結構撰寫：



```text

TASK ID

TASK Name

Version

Status



Purpose

Goal



Source of Truth

Input Documents

Dependencies

Preconditions



Scope

Out of Scope

Constraints

Do Not



Implementation Requirements



Expected Files / Modules

Database Changes

Backend Changes

Frontend Changes



Testing Requirements

Verification Procedure

Regression Requirements



Acceptance Criteria

Expected Deliverables



Human Verification Required



Stop Conditions

Failure Handling

Rollback Considerations



Change Request Trigger



Git / Commit Relationship



PASS Criteria



Task Completion Report

Change Log

```



不是每一個 TASK 都會實際產生所有類型的變更。



例如：



```text

Database Changes

→ None

```



仍可明確標示。



\---



\# 8. TASK Purpose



Purpose 必須說明：



> 為什麼需要這個 TASK。



不得只寫：



```text

完成 Customer

```



應能清楚描述工程目的。



\---



\# 9. TASK Goal



Goal 必須說明：



> 本 TASK 最終要完成什麼。



Goal 必須可以被驗收。



避免：



```text

改善系統

優化 Customer

完成後端

```



等無法明確驗收的描述。



\---



\# 10. Input Documents



每個 TASK 必須列出執行前需要閱讀的正式文件。



例如：



```text

PHASE Specification

Block Specification

Architecture Specification

TASK Framework

相關 Freeze 文件

```



Coding AI 在 Implementation 前必須先閱讀相關 Source of Truth。



\---



\# 11. Dependencies



TASK 必須明確列出依賴項目。



Dependency 可以是：



\- 前置 TASK

\- 前置 Block

\- 前置文件

\- 技術元件

\- Database Foundation

\- Testing Foundation

\- Environment Foundation



標準：



```text

Dependency 未完成

&#x20;   ↓

依賴該 Dependency 的 TASK 不得開始

```



除非明確標示：



```text

Non-blocking Dependency

```



\---



\# 12. Preconditions



TASK 必須列出開始執行前必須成立的條件。



例如：



```text

Node.js 已可使用

MySQL 已可連線

專案 Repository 已建立

Foundation 已 PASS

相關 Dependency 已 PASS

```



Preconditions 與 Dependencies 不同：



```text

Dependencies

→ 依賴哪些前置工作



Preconditions

→ 開始執行時環境必須具備什麼

```



\---



\# 13. Scope



Scope 必須明確定義：



> 本 TASK 可以做什麼。



Scope 是 Coding AI 的主要工作邊界。



Coding AI 不得自行擴大 Scope。



\---



\# 14. Out of Scope



每個 TASK 必須明確列出：



> 本 TASK 不做什麼。



例如：



```text

Out of Scope:

\- Pet Block

\- Authentication redesign

\- V2 features

\- Inventory

\- LINE API

```



目的：



> 防止 Coding AI 超前實作。



\---



\# 15. Constraints



TASK 必須遵守：



\- Existing Freeze

\- Existing Architecture

\- Technical Baseline

\- Business Rules

\- MVP Scope

\- Block Boundary

\- Project Engineering Rules



不得因為 Implementation 方便而修改上述內容。



\---



\# 16. Do Not



TASK 應明確列出禁止事項。



例如：



```text

Do Not:

\- 修改既有 Business Rule

\- 新增未批准功能

\- 修改其他 Block

\- 導入未批准技術

\- 自行修改 Architecture

\- 自行增加 Database Domain

\- 順手進行大型重構

```



\---



\# 17. Implementation Requirements



Implementation Requirements 必須描述：



> Coding AI 實作時必須遵守的工程要求。



例如：



```text

Language:

JavaScript



Backend:

Express.js



Frontend:

Next.js + Bootstrap



Database:

MySQL



Database Driver:

mysql2



ORM:

None



Testing:

Jest + Supertest

```



TASK 不得自行更換技術基準。



\---



\# 18. Expected Files / Modules



TASK 可以指定：



> 預期修改或新增的檔案／模組區域。



建議使用：



```text

Expected Area:

backend/customer/

backend/tests/customer/

```



而不是無必要地將每一個檔名完全鎖死。



如果需要修改預期範圍以外的檔案：



> 必須說明原因。



\---



\# 19. Database Changes



涉及 Database 的 TASK 必須明確描述：



```text

New Table

Alter Table

Index

Constraint

Migration

Seed

None

```



如果不涉及：



```text

Database Changes:

None

```



Database 變更不得在 TASK 執行時自行擴張 Domain。



\---



\# 20. Backend Changes



如果涉及 Backend，TASK 應描述：



\- API

\- Controller

\- Business Logic

\- Data Access

\- Validation

\- Error Handling

\- Testing



並遵守既有架構：



```text

Controller

&#x20;   ↓

Business Logic

&#x20;   ↓

Data Access

&#x20;   ↓

mysql2

&#x20;   ↓

MySQL

```



Controller 不得承擔大量 Business Logic。



\---



\# 21. Frontend Changes



如果涉及 Frontend，TASK 應描述：



\- Page

\- Component

\- Form

\- State

\- API Integration

\- Validation

\- Error Display

\- Browser Verification



Frontend 必須遵守既有：



```text

Next.js

JavaScript

Bootstrap

```



技術基準。



\---



\# 22. Testing Requirements



Testing Requirements 必須依 TASK 類型決定。



不是所有 TASK 都強制使用完全相同測試。



例如：



```text

Database TASK

→ Database Verification



Backend TASK

→ Unit Test

→ API Integration Test



Frontend TASK

→ Browser Verification



Full Flow TASK

→ Integration Test

→ Browser Verification

```



但每個 TASK 都必須具有適合其性質的 Verification。



\---



\# 23. Verification Procedure



Verification 必須回答：



> 如何證明 TASK 已經完成。



Verification 可以包含：



```text

Unit Test

API Test

Integration Test

Database Verification

Build Verification

Browser Verification

Manual Operation

Regression Test

```



不得只寫：



```text

測試成功

```



而必須描述實際驗證方式。



\---



\# 24. Acceptance Criteria



每個 TASK 必須有 Acceptance Criteria。



Acceptance Criteria 定義：



> 什麼條件成立後，TASK 才能判定成功。



例如：



```text

AC-01

API 可以成功建立 Customer



AC-02

Duplicate Phone 被正確拒絕



AC-03

Unit Test PASS



AC-04

API Integration Test PASS



AC-05

Browser Verification PASS

```



所有必要 Acceptance Criteria 都必須通過。



\---



\# 25. Regression Requirements



如果 TASK 可能影響既有 PASS 功能：



```text

Existing PASS

&#x20;   ↓

TASK Implementation

&#x20;   ↓

Regression Verification

```



不得只驗證新功能。



必須確認：



> 既有功能仍然正常。



不是所有 TASK 都必須完整重跑整個專案測試。



Regression 範圍依 TASK 影響範圍決定。



\---



\# 26. Expected Deliverables



TASK 必須說明完成後應產生的交付物。



可能包含：



```text

Source Code

Tests

Database Migration

Configuration

Documentation

Verification Result

Completion Report

```



範例：



```text

Expected Deliverables:

\- Customer Controller

\- Customer Business Logic

\- Customer Data Access

\- Customer API Tests

\- Verification Report

```



\---



\# 27. Human Verification



TASK 必須標示：



```text

Human Verification Required:

YES / NO

```



涉及實際使用者流程、UI、瀏覽器、操作體驗時：



> 原則上需要 Human Verification。



AI 自動測試 PASS 不等於 Human Verification PASS。



\---



\# 28. AI Verification 與 Human Verification



兩者必須分開：



```text

AI Verification

&#x20;   ↓

PASS



Human Verification

&#x20;   ↓

PASS

```



如果兩者都屬於 TASK 必要條件：



```text

AI PASS

\+

Human PASS

=

TASK PASS

```



\---



\# 29. Stop Conditions



Coding AI 遇到以下情況必須停止受影響工作：



```text

1\. 發現 Freeze 衝突

2\. 缺少必要規格

3\. Scope 不明

4\. 需要新增 Business Rule

5\. 需要修改其他 Block

6\. 需要破壞既有 PASS

7\. Migration 無法安全執行

8\. Technical Baseline 無法滿足

9\. Preconditions 不成立

10\. 無法在既有規格下安全完成

```



標準流程：



```text

STOP

&#x20;   ↓

REPORT

&#x20;   ↓

WAIT FOR DECISION

```



Coding AI 不得透過猜測繼續。



\---



\# 30. Failure Handling



TASK 執行失敗時：



```text

Implementation

&#x20;   ↓

Verification

&#x20;   ↓

FAIL

&#x20;   ↓

Fix

&#x20;   ↓

Verification

```



不得直接：



```text

FAIL

↓

PASS

```



不得刪除失敗紀錄。



\---



\# 31. Rollback Considerations



涉及：



\- Database Migration

\- Environment Change

\- Dependency Change

\- 大型 Code Change



時，TASK 必須說明必要的 Rollback Considerations。



例如：



```text

Migration Failure:

Stop deployment

Restore previous schema state

Report failure

```



不涉及 Rollback 時：



```text

Rollback:

Not Applicable

```



\---



\# 32. Change Request Trigger



下列情況必須提出 Change Request：



```text

1\. 需要修改既有 Freeze

2\. 需要修改 Business Rule

3\. 需要新增 Business Capability

4\. 需要新增 Business Block

5\. 需要擴大 MVP Scope

6\. 需要修改 Architecture

7\. 需要修改既有 Block Responsibility

8\. 需要破壞既有 PASS

9\. 原規格與實際需求發生真正衝突

```



Coding AI 不得自行完成上述決策。



\---



\# 33. Change Request Process



正式流程：



```text

TASK

&#x20;   ↓

Problem Detected

&#x20;   ↓

Determine CR Trigger

&#x20;   ↓

STOP

&#x20;   ↓

Change Request

&#x20;   ↓

User Decision

&#x20;   ↓

Approved

&#x20;   ↓

Update Relevant Freeze

&#x20;   ↓

Update TASK

&#x20;   ↓

Implementation Continue

```



若 Change Request 被拒絕：



```text

TASK

&#x20;   ↓

保持原規格

&#x20;   ↓

重新尋找符合既有規格的 Implementation

```



\---



\# 34. Minimum Necessary Change



所有 TASK 採：



> \*\*Minimum Necessary Change\*\*



意思是：



> 只進行完成 TASK 所必要的最小合理變更。



不得因為「順便整理」而進行無關的大型重構。



例如：



```text

TASK:

建立 Customer API

```



不得自行順便：



```text

重寫 Authentication

重構 Pet

重寫 Database Layer

導入 ORM

改變 Frontend Framework

```



若大型重構確實必要：



> 建立獨立 TASK 或提出 Change Request。



\---



\# 35. Unrequested Feature Rule



Coding AI 不得自行新增未要求功能。



例如：



```text

TASK:

Customer Search

```



不得自行增加：



```text

Customer Membership

Customer Points

Customer Tags

Customer CRM

Customer Loyalty

```



即使 AI 認為未來可能有用。



\---



\# 36. Repository Inspection



Coding AI 在開始修改前必須：



```text

Read TASK

&#x20;   ↓

Read Source of Truth

&#x20;   ↓

Inspect Repository

&#x20;   ↓

Check Existing Implementation

&#x20;   ↓

Check Dependencies

&#x20;   ↓

Check Preconditions

&#x20;   ↓

Implementation

```



不得盲目按照文件建立可能已存在的程式碼。



\---



\# 37. Existing Project State



Coding AI 必須以實際 Repository 狀態為準進行：



\- File Inspection

\- Dependency Inspection

\- Configuration Inspection

\- Database Inspection

\- Test Inspection

\- Existing Implementation Inspection



如果文件與實際 Repository 狀態不同：



> 不得自行判定哪個正確。



應依 Stop Conditions 處理。



\---



\# 38. Git Relationship



TASK 與 Git 必須保持可追溯關係。



標準：



```text

TASK-0001

&#x20;   ↓

Implementation

&#x20;   ↓

Git Commit(s)

&#x20;   ↓

Verification

&#x20;   ↓

PASS

```



一個 TASK：



> 可以包含多個 Git Commit。



不強制：



> 一 TASK = 一 Commit。



\---



\# 39. Git Scope Control



Coding AI 不應將與 TASK 無關的修改混入 TASK Commit。



原則：



```text

TASK Scope

&#x20;   ↓

Relevant Changes

&#x20;   ↓

Commit

```



不得：



```text

TASK A

&#x20;   ↓

修改 A + B + C + D

&#x20;   ↓

全部混在一起

```



如果發現其他問題：



> 視情況建立新的 TASK 或 Change Request。



\---



\# 40. TASK Versioning



每個 TASK 必須具備 Version。



標準：



```text

v1.0

```



一般規格修正：



```text

v1.1

```



重大規格變更：



```text

v2.0

```



TASK Version 必須與 Change Log 一起維護。



\---



\# 41. Change Log



TASK 修改後必須保留 Change Log。



至少包含：



```text

Version

Date

Change

Reason

```



範例：



```text

| Version | Date | Change | Reason |

|---|---|---|---|

| v1.0 | 2026-08-17 | Initial | Initial TASK |

| v1.1 | 2026-08-18 | Updated API acceptance criteria | Specification clarification |

```



\---



\# 42. TASK Status



正式 TASK 狀態：



```text

DRAFT

READY

IN PROGRESS

VERIFICATION

PASS

FAIL

BLOCKED

```



\---



\# 43. Status Meaning



\## DRAFT



TASK 尚未準備好交給 Coding AI。



\## READY



TASK 已完成定義，可以開始執行。



\## IN PROGRESS



Coding AI 正在 Implementation。



\## VERIFICATION



Implementation 已完成，正在進行測試與驗證。



\## PASS



所有必要 Acceptance Criteria 與 Verification 均通過。



\## FAIL



Verification 未通過。



\## BLOCKED



因規格、Dependency、環境或其他必要條件無法繼續。



\---



\# 44. TASK Lifecycle



正式生命週期：



```text

DRAFT

&#x20;   ↓

READY

&#x20;   ↓

IN PROGRESS

&#x20;   ↓

VERIFICATION

&#x20;   ↓

PASS

```



失敗：



```text

VERIFICATION

&#x20;   ↓

FAIL

&#x20;   ↓

FIX

&#x20;   ↓

VERIFICATION

```



阻塞：



```text

IN PROGRESS

&#x20;   ↓

BLOCKED

&#x20;   ↓

Resolve Dependency / Change Request

&#x20;   ↓

IN PROGRESS

```



\---



\# 45. TASK PASS



TASK 必須在以下條件全部成立後才可 PASS：



```text

Scope Completed

\+

Implementation Requirements Satisfied

\+

Acceptance Criteria PASS

\+

Required Tests PASS

\+

Required Verification PASS

\+

Required Regression PASS

\+

Required Human Verification PASS

```



若某項不適用：



```text

N/A

```



但不得無理由省略。



\---



\# 46. TASK PASS 不等於 Block PASS



正式定義：



```text

TASK PASS

```



只代表：



> 該工程 TASK 完成並通過驗收。



不代表：



```text

BLOCK PASS

```



也不代表：



```text

INTEGRATION PASS

```



更不代表：



```text

MVP PASS

```



\---



\# 47. TASK Freeze



TASK PASS 後：



> 該 TASK 的 Implementation Result 可以進入 TASK Freeze。



TASK Freeze 定義：



> 該 TASK 已完成、驗證並確認結果。



TASK Freeze 不等於 Business Freeze。



```text

Business Freeze

≠

TASK Freeze

```



\---



\# 48. Block Completion Relationship



Block 的完成需要：



```text

Multiple TASKs

&#x20;   ↓

TASK PASS

&#x20;   ↓

Block Verification

&#x20;   ↓

Block PASS

```



因此：



> 不可因單一 TASK PASS 就宣告整個 Block 完成。



\---



\# 49. Dependency Execution Rule



如果：



```text

TASK-B

depends on TASK-A

```



則：



```text

TASK-A PASS

&#x20;   ↓

TASK-B READY

```



如果 TASK-A 尚未 PASS：



```text

TASK-B

→ BLOCKED / NOT READY

```



除非 Dependency 明確標示為 Non-blocking。



\---



\# 50. AI Handoff Ready



所有正式 TASK 必須符合：



> \*\*AI Handoff Ready\*\*



意思是：



> 使用者可以直接將 TASK 文件交給 Coding AI，而不需要重新口頭解釋專案。



Coding AI 應能從：



```text

TASK

\+

Source of Truth

\+

Input Documents

```



理解：



```text

Why

What

Scope

Constraint

How

Test

Verify

Stop

PASS

```



\---



\# 51. Coding AI Standard Execution Contract



Coding AI 接收 TASK 後，應遵守：



```text

1\. Read TASK

2\. Read Source of Truth

3\. Inspect Repository

4\. Check Dependencies

5\. Check Preconditions

6\. Confirm Scope

7\. Implement

8\. Test

9\. Verify

10\. Run Regression if required

11\. Perform Human Verification if required

12\. Generate Completion Report

```



\---



\# 52. Coding AI Prohibited Behavior



Coding AI 不得：



```text

1\. 自行修改 Freeze

2\. 自行修改 Business Rule

3\. 自行增加 Scope

4\. 自行增加 MVP Feature

5\. 自行增加 Business Block

6\. 自行修改 Architecture

7\. 自行導入未批准技術

8\. 自行解決規格矛盾

9\. 將 FAIL 假設為 PASS

10\. 隱藏 Implementation 問題

11\. 進行無關大型重構

12\. 修改無關功能

```



\---



\# 53. Task Completion Report



Coding AI 完成 TASK 後，必須提供標準化 Completion Report。



格式：



```text

TASK ID:

Status:



Implementation Summary:



Changed Files:



Database Changes:



Tests Executed:



Test Results:



Verification Results:



Regression Results:



Acceptance Criteria Results:



Human Verification Status:



Known Issues:



Change Request Required:



Final Result:

```



Final Result 必須為：



```text

PASS

FAIL

BLOCKED

```



不得只使用：



```text

Done

Completed

Finished

```



\---



\# 54. Human Verification Report



需要 Human Verification 時，至少記錄：



```text

Scenario

Expected Result

Actual Result

Status

```



例如：



```text

Scenario:

建立 Customer



Expected:

Customer 建立成功並出現在 List



Actual:

符合預期



Status:

PASS

```



\---



\# 55. Framework Governance



TASK Framework 是所有後續 TASK 的共同工程規範。



正式 TASK：



```text

TASK-0001

TASK-0002

TASK-0003

...

TASK-NNNN

```



均必須遵守本 Framework。



若某 TASK 有特殊需求：



> 可以在 TASK 內補充，不得無聲地違反 Framework。



\---



\# 56. Exception Handling



若某 TASK 無法使用標準 Framework 某一欄位：



```text

Not Applicable

```



必須明確標示。



不得直接刪除欄位而造成不同 TASK 格式逐漸失控。



\---



\# 57. TASK Numbering



正式 TASK 採：



```text

TASK-0001

TASK-0002

TASK-0003

...

```



編號原則：



> 唯一、連續、不可重複使用。



TASK 編號一旦建立，不因 FAIL 或取消而重新分配給其他工作。



\---



\# 58. TASK Naming



TASK 名稱應：



\- 清楚

\- 可辨識

\- 具體

\- 對應工程目的



避免：



```text

Fix Stuff

Backend Work

Customer Things

Improve System

```



建議：



```text

TASK-0001 — Project Runtime Foundation

TASK-0002 — Customer Backend Implementation

TASK-0003 — Customer API Testing

```



\---



\# 59. TASK Documentation Language



正式 TASK 文件以：



> Traditional Chinese + English Technical Terms



為主要格式。



專案使用者可理解的 Business Description：



> 優先使用繁體中文。



工程名稱、API、程式語言、Framework、Database、Testing Tool：



> 保留正式英文名稱。



\---



\# 60. TASK 與 MVP Boundary



TASK 不得自行突破 MVP Boundary。



如果 Implementation 發現：



> 完成需求必須增加 MVP Scope。



則：



```text

STOP

↓

Change Request

```



而不是直接增加功能。



\---



\# 61. TASK 與 Business Block Boundary



TASK 不得自行改變 Business Block Responsibility。



例如：



```text

Customer

```



不得因 Implementation 方便而承擔：



```text

Pet

Appointment

Order

Payment

```



的核心 Business Responsibility。



如果確實需要跨 Block：



> 必須依既有 Block Collaboration 規則處理。



\---



\# 62. TASK 與 Architecture Boundary



TASK 必須遵守既有 Architecture。



正式基準：



```text

Next.js

&#x20;   ↓

Express.js API

&#x20;   ↓

Business Logic

&#x20;   ↓

Data Access

&#x20;   ↓

mysql2

&#x20;   ↓

MySQL

```



不得因單一 TASK 方便而：



\- 導入 ORM

\- 改變 Backend Framework

\- 改變 Frontend Framework

\- 改變 Database

\- 改變 Language

\- 改變既有 Layer Responsibility



若確實需要：



> Change Request。



\---



\# 63. TASK 與 Technical Baseline



現階段正式 Technical Baseline：



\## Frontend



```text

Next.js

JavaScript

Bootstrap

```



\## Backend



```text

Express.js

JavaScript

```



\## Database



```text

MySQL

```



\## Database Driver



```text

mysql2

```



\## ORM



```text

None

```



\## Testing



```text

Jest

Supertest

```



TASK 不得自行改變以上 Baseline。



\---



\# 64. TASK Security of Scope



TASK 文件本身必須具有足夠的 Scope Boundary，使 Coding AI 無法合理地將下列行為視為 TASK 內工作：



```text

Unrequested Feature

Architecture Rewrite

Business Rule Change

MVP Expansion

Cross-Block Redesign

Unrelated Refactor

```



\---



\# 65. TASK Quality Criteria



一份 TASK 在進入 READY 前，至少必須符合：



```text

Purpose Clear

Goal Clear

Source of Truth Defined

Scope Defined

Out of Scope Defined

Dependencies Defined

Preconditions Defined

Implementation Requirements Defined

Acceptance Criteria Defined

Verification Defined

Stop Conditions Defined

Expected Deliverables Defined

```



\---



\# 66. TASK READY Criteria



TASK 只有在：



```text

Definition Complete

\+

Dependencies Known

\+

Preconditions Known

\+

Scope Clear

\+

Acceptance Criteria Testable

\+

Verification Defined

```



後才能標記：



```text

READY

```



\---



\# 67. TASK Verification Philosophy



本專案採：



> \*\*Evidence-Based Completion\*\*



而不是：



> AI Assertion-Based Completion



也就是：



```text

AI 說完成

```



不足以構成 PASS。



必須有：



```text

Implementation Evidence

\+

Test Evidence

\+

Verification Evidence

```



\---



\# 68. TASK Completion Philosophy



正式完成定義：



```text

Implementation

≠

Completion

```



真正完成：



```text

Implementation

\+

Testing

\+

Verification

\+

Acceptance

=

TASK PASS

```



\---



\# 69. TASK Framework and Block-Based Development



本專案採：



> Block-based Development



因此：



```text

Block

&#x20;   ↓

TASK Breakdown

&#x20;   ↓

TASK Execution

&#x20;   ↓

TASK PASS

&#x20;   ↓

Block Verification

&#x20;   ↓

Block PASS

```



不是一次建立整個系統。



\---



\# 70. TASK Execution Principle



正式工程原則：



> \*\*先定義，再實作；先驗證，再宣告完成。\*\*



禁止：



```text

先寫程式

↓

再想需求

```



應為：



```text

Freeze

↓

TASK

↓

Implementation

↓

Verification

```



\---



\# 71. TASK Failure Transparency



任何失敗都必須被保留並回報。



例如：



```text

Test Failure

Build Failure

Migration Failure

API Failure

Browser Failure

Regression Failure

```



Coding AI 不得：



\- 隱藏錯誤

\- 移除測試只為讓測試通過

\- 降低 Acceptance Criteria

\- 修改預期結果以製造 PASS



\---



\# 72. Test Integrity



Coding AI 不得透過降低測試品質來取得 PASS。



禁止：



```text

刪除失敗 Test

降低 Assertion

跳過必要 Test

修改 Expected Result 以符合錯誤結果

```



若測試本身有問題：



> 提出問題並依 Change Request / Task 修正流程處理。



\---



\# 73. Database Safety



涉及 Database 的 TASK：



> 不得在未知狀態下進行破壞性操作。



尤其：



```text

DROP

TRUNCATE

Destructive Migration

Data Rewrite

```



必須有明確授權與 Verification。



如果無法安全執行：



```text

STOP

↓

REPORT

```



\---



\# 74. Existing PASS Protection



任何新 TASK 都不得無意間破壞：



```text

Existing TASK PASS

Existing Block PASS

Existing Integration PASS

```



若預期會影響既有功能：



> TASK 必須明確定義 Regression Requirements。



\---



\# 75. TASK Review Before Execution



正式 TASK 在交給 Coding AI 前，應由專案流程確認：



```text

Source of Truth

Scope

Dependencies

Preconditions

Acceptance Criteria

Verification

Stop Conditions

```



確認完成後：



```text

READY

```



才可交給 Coding AI。



\---



\# 76. TASK Completion Review



Coding AI 回報後，專案流程應確認：



```text

Implementation

↓

Tests

↓

Verification

↓

Acceptance Criteria

↓

Regression

↓

Human Verification

```



再決定：



```text

PASS

FAIL

BLOCKED

```



\---



\# 77. TASK PASS to Next TASK



當 TASK PASS：



```text

TASK PASS

&#x20;   ↓

Update Dependency State

&#x20;   ↓

Unblock Dependent TASKs

&#x20;   ↓

Next TASK READY

```



因此 TASK 系統可以逐步形成：



```text

Engineering Dependency Graph

```



\---



\# 78. TASK Framework Final Model



正式模型：



```text

PRODUCT / BUSINESS DECISION

&#x20;           ↓

&#x20;       PHASE FREEZE

&#x20;           ↓

&#x20;     BLOCK SPECIFICATION

&#x20;           ↓

&#x20;       TASK DEFINITION

&#x20;           ↓

&#x20;      CODING AI HANDOFF

&#x20;           ↓

&#x20;       REPOSITORY INSPECT

&#x20;           ↓

&#x20;       IMPLEMENTATION

&#x20;           ↓

&#x20;          TEST

&#x20;           ↓

&#x20;       VERIFICATION

&#x20;           ↓

&#x20;    REGRESSION IF REQUIRED

&#x20;           ↓

&#x20;    HUMAN VERIFICATION

&#x20;           ↓

&#x20;      COMPLETION REPORT

&#x20;           ↓

&#x20;    PASS / FAIL / BLOCKED

&#x20;           ↓

&#x20;        TASK FREEZE

```



\---



\# 79. Formal Framework Freeze



本文件正式確認：



```text

TASK Framework Definition

→ COMPLETE



TASK Framework Review

→ COMPLETE



TASK Framework

→ FREEZE

```



Freeze Scope：



```text

TASK Structure

TASK Lifecycle

TASK Scope Control

TASK Dependency

TASK Source of Truth

TASK Versioning

TASK Git Relationship

TASK Testing

TASK Verification

TASK Regression

TASK Human Verification

TASK Stop Conditions

TASK Change Request

TASK PASS / FAIL / BLOCKED

TASK Completion Report

AI Handoff Contract

```



\---



\# 80. Post-Freeze Rule



TASK Framework FREEZE 後：



> 不得因為某一個 TASK 的 Implementation 不方便，就自行修改 Framework。



如果未來發現 Framework 確實不足：



```text

Problem

↓

Impact Analysis

↓

Change Request

↓

User Approval

↓

Framework Version Update

↓

New TASK Framework Version

```



不得偷偷修改。



\---



\# 81. First Implementation Task



TASK Framework 完成後，專案正式進入：



> \*\*TASK Implementation Phase\*\*



下一個正式工程工作將使用：



```text

TASK-0001

```



TASK-0001 必須：



\- 遵守本 Framework

\- 指定 Source of Truth

\- 明確 Scope

\- 明確 Out of Scope

\- 明確 Dependencies

\- 明確 Preconditions

\- 明確 Acceptance Criteria

\- 明確 Verification

\- 可直接交給 Coding AI

\- 不得自行突破 PHASE / BLOCK Freeze



\---



\# 82. Document Freeze Declaration



```text

Document ID:

TASK-00



Document:

任務框架 — Task Framework



Version:

v1.0



Status:

FREEZE



Effective:

2026-08-17

```



本文件自 Freeze 後正式成為：



> \*\*PSOP MVP 後續所有工程 TASK 的標準 Framework 與 AI Handoff Contract。\*\*



\---



\# END OF DOCUMENT

