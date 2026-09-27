\# Production Deployment Automation Design Freeze v1.0



\---



\# 1. Document Information



| Field | Value |

|---|---|

| Project | 寵物2.0 |

| Document | Production Deployment Automation Design Freeze |

| Version | v1.0 |

| Status | DESIGN FREEZE / CODING READY |

| Decision Range | Decision 01–50 |

| Decision 51 | 停止新增 Deployment Decision |

| Production Repository | `/home/zhe/pets` |

| Production User | `zhe` |

| Git Branch | `master` |

| Git Remote | `https://github.com/xmz9453-cmd/Pets.git` |

| Database | `psop\_one` |

| Backup Directory | `/home/zhe/pets-backups/` |

| Deployment State Directory | `/home/zhe/pets-deploy-state/` |



正式檔名：



`Production Deployment Automation 生產環境自動部署 Production Deployment Automation v1.0`



\---



\# 2. Document Purpose



本文件用於凍結「寵物2.0」Production Deployment Automation 的實作規格。



本文件完成後，AI Coding 階段必須依照本文件實作，不得重新設計 Deployment Architecture，不得擴張成 Enterprise CI/CD Platform，不得導入 Docker、Kubernetes、Terraform、Ansible 或其他非必要 Infrastructure。



本自動部署系統的目標：



> GitHub `master` 有新版本時，Production VM 可以安全地更新程式、安裝依賴、Build、建立 Production Database Backup、執行 Pending Migration、Restart Application、執行 Technical Health Check，完成後由人工執行 Production Verification 並確認正式部署成功。



\---



\# 3. Production Environment Baseline



\## 3.1 Operating System



\- Ubuntu 24.04.5 LTS

\- Production User：`zhe`



\## 3.2 Runtime



\- Node.js `v24.21.0`

\- npm `11.19.0`

\- Git `2.43.0`

\- MySQL `8.0.46`

\- Nginx `1.24.0`



\## 3.3 Repository



Production Repository：



`/home/zhe/pets`



Git Remote：



`https://github.com/xmz9453-cmd/Pets.git`



Production Branch：



`master`



Git Working Tree 在 Deployment 開始前必須為 CLEAN。



\## 3.4 Application Services



Backend：



\- systemd service：`pets-backend.service`

\- local address：`127.0.0.1:3001`



Frontend：



\- systemd service：`pets-frontend.service`

\- local address：`127.0.0.1:3000`



\## 3.5 Nginx



Public HTTP：



\- Nginx：`:80`



Routing：



\- `/api/\*` → `127.0.0.1:3001`

\- `/` → `127.0.0.1:3000`



\## 3.6 Production Database



Database：



`psop\_one`



MySQL：



`127.0.0.1:3306`



Production Database 不得透過 Deployment Automation 建立平行資料來源。



\---



\# 4. Deployment Scope



本 Automation 僅處理 Production Deployment 所需的最小流程：



1\. Git Update

2\. Backend Dependency Installation

3\. Frontend Dependency Installation

4\. Frontend Production Build

5\. Production Database Backup

6\. Pending Database Migration

7\. Backend Restart

8\. Frontend Restart

9\. Technical Health Check

10\. Deployment State

11\. Deployment Log

12\. Manual Production Verification Confirmation

13\. Database Restore Utility

14\. Deployment State Recovery Utility



\---



\# 5. Out of Scope



本 Automation 不得導入：



\- Docker

\- Kubernetes

\- Terraform

\- Ansible

\- Enterprise CI/CD Platform

\- Enterprise RBAC

\- SSO

\- MFA

\- Redis

\- Message Queue

\- Distributed Lock Server

\- Complex Rollback Framework

\- New API Client Layer

\- New Domain Architecture

\- New State Management Framework

\- Multi-tenant SaaS

\- Enterprise Infrastructure Architecture



本 Automation 不得重新設計既有 MVP Business Blocks。



不得修改：



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

\- 其他已 Freeze 的 MVP Business Logic



\---



\# 6. Deployment Scripts



預定 Deployment Automation Scripts：



\- `deploy/install.sh`

\- `deploy/deploy.sh`

\- `deploy/backup.sh`

\- `deploy/restore.sh`

\- `deploy/clear-state.sh`

\- `deploy/confirm.sh`



Deployment Documentation：



\- `DEPLOYMENT.md`



Environment Example：



\- `.env.example`



實際 Production Secret 不得進入 Git。



\---



\# 7. Main Deployment Flow



正式 Deployment 流程：



&#x20;   GitHub master

&#x20;       ↓

&#x20;   Working Tree CLEAN

&#x20;       ↓

&#x20;   Deployment State validation

&#x20;       ↓

&#x20;   Deployment Lock

&#x20;       ↓

&#x20;   Git fetch origin

&#x20;       ↓

&#x20;   Fast-forward only

&#x20;       ↓

&#x20;   固定 TARGET\_SHA

&#x20;       ↓

&#x20;   Target Commit consistency check

&#x20;       ↓

&#x20;   Backend npm ci

&#x20;       ↓

&#x20;   Frontend npm ci

&#x20;       ↓

&#x20;   Frontend production build

&#x20;       ↓

&#x20;   Production DB Backup

&#x20;       ↓

&#x20;   Pending Database Migration

&#x20;       ↓

&#x20;   Restart Backend

&#x20;       ↓

&#x20;   Restart Frontend

&#x20;       ↓

&#x20;   Technical Health Check

&#x20;       ↓

&#x20;   State = DEPLOYED

&#x20;       ↓

&#x20;   Manual Browser Production Verification

&#x20;       ↓

&#x20;   confirm.sh

&#x20;       ↓

&#x20;   State = SUCCESS



\---



\# 8. Git Update Rules



\## 8.1 Working Tree



Deployment 開始前：



\- Git Working Tree 必須 CLEAN。

\- 若 Working Tree DIRTY，Deployment 必須停止。



不得自動：



\- `git reset --hard`

\- `git clean -fd`

\- 強制覆蓋 Production Working Tree

\- 自動刪除 Production Working Tree 的修改



\## 8.2 Remote Update



Deployment 使用：



\- `git fetch origin`

\- `origin/master`

\- Fast-forward only



不得使用非 Fast-forward 的強制更新方式。



\## 8.3 Target Commit



Git Fast-forward 完成後立即取得：



&#x20;   git rev-parse HEAD



此 SHA 固定為本次 Deployment 的：



`TARGET\_SHA`



後續 Deployment 階段必須以此 Target Commit 為基準。



\## 8.4 Target Commit Consistency



Deployment 關鍵階段必須確認：



&#x20;   git rev-parse HEAD == TARGET\_SHA



若不一致：



\- Deployment = FAILED

\- 停止後續 Deployment

\- 不自動 Git Rollback

\- 不執行 `git reset --hard`

\- 不執行 `git clean -fd`



\---



\# 9. Previous Commit



`previous\_commit` 必須來自 Deployment State 中最後一次正式 `SUCCESS` 的：



`commit`



不得單純以部署開始時的 Git `HEAD` 取代。



例如：



&#x20;   最後 SUCCESS = AAAA

&#x20;   本次 Target = CCCC



則：



&#x20;   previous\_commit=AAAA

&#x20;   commit=CCCC



第一次沒有歷史 SUCCESS Deployment 時：



&#x20;   previous\_commit=NONE



\---



\# 10. Dependency Installation



Backend：



&#x20;   npm ci



Frontend：



&#x20;   npm ci



必須使用既有：



\- `package.json`

\- `package-lock.json`



不得引入新的 Package Manager。



不得在 Deployment 過程中：



\- 使用 `npm install` 取代 `npm ci`

\- 修改 package-lock 以繞過問題

\- 自動更新 dependencies

\- 引入新的 framework



\---



\# 11. Frontend Build



Frontend 必須執行 Production Build。



使用既有 Frontend Build Script：



&#x20;   npm run build



Build 必須成功後才能進入 Database Backup。



若 Build FAIL：



\- Deployment 停止

\- 不執行 Production Database Backup

\- 不執行 Migration

\- 不 Restart Services

\- Deployment State = FAILED

\- 保留完整 Deployment Log



Build FAIL 不進行自動 Git Rollback。



此時 Git Working Tree 可以已經位於新的 Target Commit，而目前正在執行的 Production Services 仍可能維持原本正在運行的版本。



\---



\# 12. Database Backup



\## 12.1 Backup Timing



Production Database Backup 必須在 Pending Migration 之前建立。



正式順序：



&#x20;   Build PASS

&#x20;       ↓

&#x20;   DB Backup

&#x20;       ↓

&#x20;   Migration



\## 12.2 Backup Location



固定：



&#x20;   /home/zhe/pets-backups/



不得將 Production Backup 放在 Git Repository 內。



\## 12.3 Backup Naming



格式：



&#x20;   psop\_one\_YYYYMMDD\_HHMMSS.sql.gz



\## 12.4 Backup Verification



Backup 建立後必須確認：



\- Backup File 存在

\- Backup File 非空

\- gzip integrity check PASS



只有 Backup Verification PASS，才允許執行 Migration。



\## 12.5 Backup Failure



若 Backup FAIL：



\- Deployment 停止

\- 不執行 Migration

\- 不 Restart Services

\- Backup 若已產生則保留

\- Deployment State = FAILED



不得以未驗證的 Backup 繼續 Migration。



\## 12.6 Backup Retention



Backup 保留：



`30 天`



超過 30 天的 Backup 可自動清理。



Backup Cleanup Failure 不阻止正式 Deployment，但必須寫入 Deployment Log。



\---



\# 13. Database Migration



\## 13.1 Migration Scope



只執行 Pending Migrations。



不得執行完整 Setup。



不得在 Routine Production Deployment 執行：



\- `database/scripts/setup.js`

\- Full Seed

\- Operational Data Reset

\- Reset Script

\- DROP Database

\- Delete Operational Data



\## 13.2 Migration Safety Guard



Migration Runner 本身必須具有 Production Safety Guard。



安全流程：



&#x20;   migrate()

&#x20;       ↓

&#x20;   Confirm DB Host

&#x20;       ↓

&#x20;   Confirm DB Name

&#x20;       ↓

&#x20;   Confirm Environment

&#x20;       ↓

&#x20;   Production Safety Guard PASS

&#x20;       ↓

&#x20;   Execute Pending Migrations



即使直接執行 Migration Script，也必須受到 Production Safety Guard 保護。



\## 13.3 Migration Failure



若 Migration FAIL：



\- Deployment 立即停止

\- 不 Restart Services

\- Backup 保留

\- 不自動 Restore

\- Deployment State = FAILED



DB Restore 是獨立的人工操作。



不得因 Migration Failure 自動執行：



\- `setup.js`

\- Reset

\- DROP Database

\- Full Seed

\- Automatic Restore



\---



\# 14. Service Restart



Migration PASS 後：



1\. Restart `pets-backend.service`

2\. Restart `pets-frontend.service`



採用固定 Restart 策略，不分析檔案 Diff 決定是否 Restart。



Deployment Release Unit：



&#x20;   Backend + Frontend



兩個 Production Application Services 視為同一個 Deployment Unit。



\---



\# 15. Technical Health Check



`deploy.sh` 只負責 Technical Health Check。



不得將完整 Browser Business Workflow 塞入 Shell Deployment Script。



Health Check 至少確認：



\## 15.1 Backend Service



確認：



&#x20;   pets-backend.service



為 Active。



\## 15.2 Backend HTTP Health



確認 Backend Health Endpoint PASS。



\## 15.3 Frontend Service



確認：



&#x20;   pets-frontend.service



為 Active。



\## 15.4 Frontend HTTP Response



確認 Frontend HTTP Response PASS。



\## 15.5 Nginx HTTP Response



確認 Nginx HTTP Response PASS。



\---



\# 16. Technical Health Check 與 Production Verification 的區分



Technical Health Check：



> Deployment Script 自動執行。



Production Verification：



> 人工透過 Browser 執行。



兩者不可混為一談。



Technical Health Check PASS 不代表 Deployment 已經正式 `SUCCESS`。



正式流程：



&#x20;   Technical Health Check PASS

&#x20;       ↓

&#x20;   DEPLOYED

&#x20;       ↓

&#x20;   Manual Production Verification

&#x20;       ↓

&#x20;   confirm.sh

&#x20;       ↓

&#x20;   SUCCESS



\---



\# 17. Deployment State



\## 17.1 Location



固定：



&#x20;   /home/zhe/pets-deploy-state/deployment.state



State 不放在 Git Repository。



\## 17.2 State Values



允許：



\- `RUNNING`

\- `DEPLOYED`

\- `SUCCESS`

\- `FAILED`



\## 17.3 State Meaning



\### RUNNING



代表 Deployment 已開始，但沒有正常完成。



即使 Production VM 因：



\- Power Loss

\- Process Crash

\- Shell Termination

\- SSH Disconnect

\- 其他非正常中斷



而沒有完成 Deployment，`RUNNING` 仍維持為異常狀態。



不得依 PID 或 Process 自動判斷是否可以 Resume。



\### DEPLOYED



代表：



\- Technical Deployment 已完成

\- Technical Health Check PASS

\- 尚未完成人工 Production Verification



此狀態必須包含：



&#x20;   verification=pending



\### SUCCESS



只有以下全部成立時才可以：



\- Technical Deployment 完成

\- Technical Health Check PASS

\- Manual Production Verification PASS

\- `confirm.sh` 執行成功



此時：



&#x20;   verification=PASS



\### FAILED



代表 Deployment 過程中發生失敗。



\---



\# 18. Deployment State Fields



State 至少包含：



&#x20;   status=<RUNNING|DEPLOYED|SUCCESS|FAILED>

&#x20;   commit=<target commit SHA>

&#x20;   previous\_commit=<previous successful commit SHA>

&#x20;   timestamp=<ISO 8601 +08:00>

&#x20;   backup=<backup filename>

&#x20;   verification=<pending|PASS>



必要時可在實作中增加與本文件一致且不包含 Secret 的狀態資訊，但不得將 State 擴張成資料庫或 Enterprise Deployment Registry。



\---



\# 19. State Write Safety



Deployment State 必須採用 Atomic Write。



不得直接在現有 State File 上進行可能產生半截檔案的覆寫流程。



概念流程：



&#x20;   建立 temporary state file

&#x20;       ↓

&#x20;   完整寫入

&#x20;       ↓

&#x20;   寫入成功

&#x20;       ↓

&#x20;   Atomic rename / mv

&#x20;       ↓

&#x20;   deployment.state



\---



\# 20. Deployment Lock



\## 20.1 Lock Mechanism



使用 Linux：



`flock`



不得導入：



\- Redis Lock

\- MySQL Distributed Lock

\- Lock Server

\- 其他外部 Lock Infrastructure



\## 20.2 Lock Scope



以下所有 State-changing scripts 使用相同 Deployment Lock：



\- `deploy.sh`

\- `confirm.sh`

\- `clear-state.sh`



\## 20.3 Concurrent Deployment



如果 Lock 無法取得：



&#x20;   deployment already running



該操作必須停止。



不得同時修改 Deployment State。



\---



\# 21. Deployment State Recovery



\## 21.1 clear-state.sh



提供：



&#x20;   ./deploy/clear-state.sh



用途：



\- 處理 `FAILED`

\- 處理異常留下的 `RUNNING`



\## 21.2 Explicit Confirmation



不得要求使用者直接：



&#x20;   rm deployment.state



必須由 `clear-state.sh` 顯示目前狀態並要求明確輸入：



&#x20;   CLEAR



只有明確確認後才可以清除異常 State。



\## 21.3 RUNNING Recovery



`RUNNING` 不自動 Resume。



Human 必須先確認：



\- Git Commit

\- Backend Service

\- Frontend Service

\- Database Migration State

\- Backup

\- Deployment Log

\- Production 實際狀態



確認後才能使用：



&#x20;   clear-state.sh



解除異常狀態。



\---



\# 22. Deployment Failure and Git Behavior



Deployment Failure 不自動 Git Rollback。



例如：



&#x20;   Production 正在運行 AAAA

&#x20;       ↓

&#x20;   Deployment 更新到 CCCC

&#x20;       ↓

&#x20;   Build FAIL

&#x20;       ↓

&#x20;   Deployment FAILED



此時可能存在：



&#x20;   Git HEAD = CCCC

&#x20;   Running Application = AAAA

&#x20;   Last SUCCESS = AAAA



這是允許的狀態。



不得因 Deployment Failure 自動：



\- `git reset --hard`

\- Checkout Previous Commit

\- `git clean -fd`



Application Rollback 是獨立的人工操作。



\---



\# 23. Health Failure Behavior



如果：



\- Service Restart Failure

\- Backend Health Failure

\- Frontend Health Failure

\- Nginx HTTP Failure



則：



&#x20;   Deployment = FAILED



不得假設舊版本已自動恢復。



不得宣稱：



> Health Check Failure 一定會保持原 Production Version。



因為 Migration 可能已經成功，Service 也可能已經部分 Restart。



因此：



\- 不自動 Git Rollback

\- 不自動 DB Restore

\- 保留 Deployment Backup

\- 保留 Deployment Log

\- State = FAILED



後續由人工判斷 Application Rollback 或 Database Restore。



\---



\# 24. Deployment Log



\## 24.1 Location



固定：



&#x20;   /home/zhe/pets-deploy-state/logs/



\## 24.2 File Naming



格式：



&#x20;   deploy-YYYYMMDD-HHMMSS.log



每次 Deployment 建立一份 Log。



\## 24.3 Retention



Deployment Log：



`30 天`



超過 30 天自動清理。



\## 24.4 Cleanup Timing



每次 `deploy.sh` 開始時：



&#x20;   取得 Deployment Lock

&#x20;       ↓

&#x20;   Validate State

&#x20;       ↓

&#x20;   Cleanup Logs > 30 days

&#x20;       ↓

&#x20;   建立本次 Deployment Log

&#x20;       ↓

&#x20;   開始 Deployment



\## 24.5 Cleanup Failure



Log Cleanup Failure：



\- 記錄 Warning

\- 不阻止 Deployment

\- 繼續 Deployment



Cleanup 屬於 Best-effort Maintenance。



\---



\# 25. Deployment Log Permissions



Directory：



&#x20;   /home/zhe/pets-deploy-state/



採用：



&#x20;   directory mode = 700

&#x20;   file mode = 600

&#x20;   owner = zhe

&#x20;   group = zhe



只有 `zhe` 可以讀寫 Deployment State 與 Deployment Logs。



\---



\# 26. Deployment Log Content



Deployment Log 至少包含：



\- OS User

\- `started\_at`

\- `finished\_at`

\- Target Commit

\- Previous Commit

\- Deployment Stages

\- Command

\- stdout

\- stderr

\- Exit Code

\- Stage Result

\- Final Deployment Summary

\- Production Verification Record



不得記錄：



\- Password

\- Token

\- API Secret

\- `.env` 內容

\- 其他敏感 Secret



\---



\# 27. Deployment Log User



記錄執行 Deployment 的 OS User。



例如：



&#x20;   user=zhe



來源使用系統實際執行者。



不得要求使用者額外輸入姓名、Email 或其他身份資料。



\---



\# 28. Deployment Time Format



所有 Deployment State / Log 時間統一使用：



`ISO 8601 +08:00`



例如：



&#x20;   2026-09-27T21:04:37+08:00



至少記錄：



\- `started\_at`

\- `finished\_at`



Deployment State 的 `timestamp` 亦使用相同格式。



\---



\# 29. Stage Logging



Deployment Log 不需要為每一個 Stage 建立獨立開始／結束時間。



整體使用：



&#x20;   started\_at

&#x20;   finished\_at



各 Stage 使用結果：



&#x20;   \[PASS] Git Update

&#x20;   \[PASS] Backend npm ci

&#x20;   \[PASS] Frontend npm ci

&#x20;   \[PASS] Frontend Build

&#x20;   \[PASS] DB Backup

&#x20;   \[PASS] Migration

&#x20;   \[PASS] Service Restart

&#x20;   \[PASS] Health Check



\---



\# 30. Command Logging



必要的 Deployment Commands / Operations 必須記錄。



例如：



&#x20;   COMMAND: git fetch origin

&#x20;   COMMAND: npm ci

&#x20;   COMMAND: npm run build

&#x20;   COMMAND: systemctl restart pets-backend.service



如果 Command 可能暴露 Secret：



\- 不得直接記錄敏感參數

\- 改為記錄操作名稱

\- 或使用 Masked Value



\---



\# 31. Command Output



重要 Command 的：



\- stdout

\- stderr



均可寫入 Deployment Log。



Command 必須同時記錄：



&#x20;   EXIT\_CODE

&#x20;   RESULT



例如：



&#x20;   COMMAND: npm run build



&#x20;   <stdout>

&#x20;   <stderr>



&#x20;   EXIT\_CODE: 1

&#x20;   RESULT: FAILED



Secret Masking 必須先於寫入 Log。



\---



\# 32. Secret Masking



Deployment Log 必須使用 Secret Masking。



流程：



&#x20;   Command

&#x20;       ↓

&#x20;   stdout / stderr

&#x20;       ↓

&#x20;   Secret Masking

&#x20;       ↓

&#x20;   Deployment Log



不得依賴「Application 不會輸出 Secret」作為唯一防護。



\---



\# 33. Secret Masking Source



Masking 主要針對 Production Environment 中實際已知的 Secret Value。



不：



\- 將 `.env` 寫入 Log

\- 將 `.env` 全部輸出

\- 將所有 Environment Variables 一律當作 Secret



已知 Secret Value 在 Log 中必須替換為：



&#x20;   \*\*\*\*



\---



\# 34. Short Secret Rule



只有 Secret Value 長度達到最小長度時才進行一般字串 Masking。



規則：



&#x20;   Secret length >= 4

&#x20;   → Masking



&#x20;   Secret length < 4

&#x20;   → 不進行一般字串全域替換



即使短 Secret 不進行一般替換，也不得主動將其放入 Command Line 或輸出內容。



\---



\# 35. Deployment Result Summary



每次 Deployment Log 結尾必須建立固定 Summary。



成功進入 `DEPLOYED` 時，Summary 至少包含：



&#x20;   status=DEPLOYED

&#x20;   target\_commit=<SHA>

&#x20;   previous\_commit=<SHA>

&#x20;   backup=<filename>

&#x20;   migration=PASS

&#x20;   backend=PASS

&#x20;   frontend=PASS

&#x20;   health\_check=PASS

&#x20;   started\_at=<ISO 8601>

&#x20;   finished\_at=<ISO 8601>



失敗時至少包含：



&#x20;   status=FAILED

&#x20;   target\_commit=<SHA>

&#x20;   previous\_commit=<SHA>

&#x20;   backup=<filename>

&#x20;   failed\_stage=<stage>

&#x20;   started\_at=<ISO 8601>

&#x20;   finished\_at=<ISO 8601>



\---



\# 36. Production Verification



Technical Health Check PASS 後，State：



&#x20;   status=DEPLOYED

&#x20;   verification=pending



此時必須由 Human 透過 Browser 執行 Production Verification。



Production Verification 不由 Deployment Shell Script 自動取代。



Verification 至少確認 Production Application 的實際可用性與既有核心操作流程。



\---



\# 37. confirm.sh



提供：



&#x20;   ./deploy/confirm.sh



`confirm.sh`：



1\. 取得相同 Deployment Lock

2\. 讀取目前 Deployment State

3\. 確認目前為 `DEPLOYED`

4\. 確認 `verification=pending`

5\. 顯示目前 Deployment 資訊

6\. 要求明確人工確認

7\. 接受 `CONFIRM`

8\. 更新 State：

&#x20;  - `status=SUCCESS`

&#x20;  - `verification=PASS`

9\. Atomic Write State

10\. 追加 Production Verification Record 到 Deployment Log



不得由 `confirm.sh` 自動推論 Browser Verification PASS。



\---



\# 38. Production Verification Record



`confirm.sh` 成功後，在該次 Deployment Log 追加：



&#x20;   ===== PRODUCTION VERIFICATION =====

&#x20;   user=zhe

&#x20;   verified\_at=<ISO 8601 +08:00>

&#x20;   verification=PASS

&#x20;   result=SUCCESS

&#x20;   ====================================



這讓同一份 Deployment Log 包含：



\- Technical Deployment

\- Technical Health Check

\- Manual Production Verification

\- Final SUCCESS



\---



\# 39. Deployment Success Definition



正式 `SUCCESS` 必須同時符合：



&#x20;   Git Target Commit 正確

&#x20;       +

&#x20;   Backend npm ci PASS

&#x20;       +

&#x20;   Frontend npm ci PASS

&#x20;       +

&#x20;   Frontend Build PASS

&#x20;       +

&#x20;   DB Backup PASS

&#x20;       +

&#x20;   Migration PASS

&#x20;       +

&#x20;   Backend Restart PASS

&#x20;       +

&#x20;   Frontend Restart PASS

&#x20;       +

&#x20;   Technical Health Check PASS

&#x20;       +

&#x20;   Manual Production Verification PASS

&#x20;       +

&#x20;   confirm.sh PASS



缺少任何必要條件，不得將 State 設為 `SUCCESS`。



\---



\# 40. Restore Script



提供：



&#x20;   ./deploy/restore.sh



Restore 是獨立於 Deployment 的人工操作。



Restore 不由：



&#x20;   deploy.sh



自動執行。



\---



\# 41. Restore Backup Source



`restore.sh` 只接受：



&#x20;   /home/zhe/pets-backups/



內符合：



&#x20;   psop\_one\_\*.sql.gz



格式的 Backup。



不得接受任意外部路徑作為 Production Restore Source。



\---



\# 42. Restore Pre-validation



Restore 修改 Production Database 前必須先：



1\. 確認 Backup Path

2\. 確認 Backup Filename

3\. 確認 File Exists

4\. 確認 File Readable

5\. 執行 gzip Integrity Check

6\. 驗證通過後才要求 Human Confirmation



\---



\# 43. Restore Confirmation



Restore 必須要求明確輸入：



&#x20;   RESTORE



不得使用：



\- 空白 Enter

\- `y`

\- 模糊 Yes

\- 自動確認



執行前必須顯示：



\- Database

\- Backup Filename

\- Backup Location

\- Restore Operation



\---



\# 44. Restore Service Handling



Restore 前：



&#x20;   stop pets-frontend.service

&#x20;   stop pets-backend.service



MySQL 保持執行。



Restore 完成後：



&#x20;   DB Validation

&#x20;       ↓

&#x20;   start pets-backend.service

&#x20;       ↓

&#x20;   start pets-frontend.service

&#x20;       ↓

&#x20;   Service Verification

&#x20;       ↓

&#x20;   Health Check



\---



\# 45. Restore Validation



Restore 完成後至少驗證：



\- `psop\_one` Database 存在

\- Table Count 正常

\- Migration State 可讀取

\- 基本 Operational Data 存在



Restore Script 不需要執行完整 Browser Business Workflow。



\---



\# 46. Restore Failure



若 Restore FAIL：



1\. 記錄 Failure

2\. 嘗試啟動 Backend

3\. 嘗試啟動 Frontend

4\. 執行 Service Verification

5\. 執行 Health Check

6\. 最終 Restore Result 仍為 `FAILED`



即使 Application Services 恢復並且 Health Check PASS，也不得把失敗的 Restore 判定為成功。



\---



\# 47. Rollback Boundary



Application Rollback 與 Database Rollback 必須分離。



Git Checkout 不代表 Database Rollback。



例如：



&#x20;   Application Commit A

&#x20;   Database Migration 018

&#x20;   ↓

&#x20;   Deployment Commit B

&#x20;   Database Migration 019

&#x20;   ↓

&#x20;   Application Rollback to A



不代表 Database 自動回到 Migration 018。



任何 Database Restore 必須使用明確的：



&#x20;   restore.sh



進行人工 Restore。



\---



\# 48. Deployment State Transition



正式 State Flow：



&#x20;   SUCCESS

&#x20;      ↓

&#x20;   New Deployment

&#x20;      ↓

&#x20;   RUNNING

&#x20;      ↓

&#x20;   Technical Deployment PASS

&#x20;      ↓

&#x20;   DEPLOYED

&#x20;      ↓

&#x20;   verification=pending

&#x20;      ↓

&#x20;   Manual Production Verification

&#x20;      ↓

&#x20;   confirm.sh

&#x20;      ↓

&#x20;   SUCCESS

&#x20;      ↓

&#x20;   verification=PASS



異常：



&#x20;   RUNNING

&#x20;      ↓

&#x20;   FAILED



或：



&#x20;   RUNNING

&#x20;      ↓

&#x20;   Power Loss / Process Termination

&#x20;      ↓

&#x20;   RUNNING



異常 State 必須由 Human 檢查後使用：



&#x20;   clear-state.sh



處理。



\---



\# 49. Deployment Failure Handling Matrix



| Failure Point | Action | Migration | Restart | Auto Rollback |

|---|---|---|---|---|

| Dirty Git Working Tree | Stop | No | No | No |

| Git Fetch / Fast-forward | Stop | No | No | No |

| Target Commit mismatch | Stop | No | No | No |

| Backend npm ci | Stop | No | No | No |

| Frontend npm ci | Stop | No | No | No |

| Frontend Build | Stop | No | No | No |

| DB Backup | Stop | No | No | No |

| Migration | Stop | Partial / failure state possible | No | No |

| Service Restart | FAILED | Already migrated if Migration passed | Partial possibility | No |

| Health Check | FAILED | Already migrated if Migration passed | Already attempted | No |

| Browser Verification | Not SUCCESS | No automatic DB action | No automatic rollback | No |



所有失敗必須保留必要的 Deployment Log 與 Backup，不自動執行破壞性 Recovery。



\---



\# 50. Design Freeze Rules



本 Design Freeze 完成後：



1\. AI Coding 不得重新詢問已確認的 Deployment Decision。

2\. AI Coding 不得重新設計 Deployment Flow。

3\. AI Coding 不得重新設計 MVP Business Blocks。

4\. AI Coding 不得引入非必要 Infrastructure。

5\. AI Coding 不得把 Deployment Automation 擴張成 Enterprise CI/CD。

6\. AI Coding 必須優先使用既有：

&#x20;  - Git

&#x20;  - npm

&#x20;  - shell scripts

&#x20;  - systemd

&#x20;  - Nginx

&#x20;  - MySQL

7\. Production Secret 不得進 Git。

8\. Production Secret 不得進 Deployment Log。

9\. Production Database 不得被 Routine Deployment Reset。

10\. Routine Deployment 不得執行 Full Seed。

11\. Routine Deployment 不得自動修改 Staff Password、Display Name 或 Status。

12\. Routine Deployment 不得刪除 Operational Data。

13\. Migration 必須受到 Production Safety Guard 保護。

14\. Backup 必須在 Migration 前完成並通過 Integrity Check。

15\. Restore 必須人工明確確認。

16\. Git Rollback 與 DB Restore 必須分離。

17\. Deployment State、Deployment Log、Backup 均必須位於 Repository 外。

18\. `deploy.sh`、`confirm.sh`、`clear-state.sh` 使用相同 Deployment Lock。

19\. Deployment State 必須 Atomic Write。

20\. `SUCCESS` 必須包含人工 Production Verification。



\---



\# 51. Coding Readiness



本文件完成後，Deployment Automation 已達：



&#x20;   DESIGN FREEZE

&#x20;   ↓

&#x20;   CODING READY



AI Coding 下一階段只需要依本文件建立實際 Script、Configuration 與 Documentation。



不得在 Coding 階段重新進行 Deployment Architecture Decision。



\---



\# 52. Definition of Done



Production Deployment Automation 必須至少完成：



\- \[ ] Deployment Scripts 建立

\- \[ ] Backup Script 建立

\- \[ ] Restore Script 建立

\- \[ ] State Management 建立

\- \[ ] Deployment Lock 建立

\- \[ ] Atomic State Write 建立

\- \[ ] Deployment Log 建立

\- \[ ] Secret Masking 建立

\- \[ ] Log Retention 建立

\- \[ ] Migration Production Safety Guard 建立

\- \[ ] Deployment Flow 實作

\- \[ ] Technical Health Check 實作

\- \[ ] Manual Production Verification Flow 實作

\- \[ ] `confirm.sh` 實作

\- \[ ] `clear-state.sh` 實作

\- \[ ] Production Restore 驗證

\- \[ ] Deployment Failure Handling 驗證

\- \[ ] Production Deployment 實際測試

\- \[ ] Human Acceptance PASS

\- \[ ] Git Checkpoint PASS



\---



\# 53. Final Design Status



```text

Production Deployment Automation

&#x20;       ↓

Read-only Inventory             PASS

&#x20;       ↓

Decision 01–50                  PASS

&#x20;       ↓

Decision 51                      PASS

&#x20;       ↓

Design Freeze v1.0              PASS

&#x20;       ↓

CODING READY                    PASS



本文件為 Production Deployment Automation 的唯一 Coding Design Baseline。



後續實作不得超出本文件已凍結的 Scope。



END

