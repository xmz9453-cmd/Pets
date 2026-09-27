\# 02 生產部署自動化 AI Coding Prompt Production Deployment Automation AI Coding Prompt v1.0



\---



\# 1. Document Information



| Field | Value |

|---|---|

| Project | 寵物2.0 |

| Document | Production Deployment Automation AI Coding Prompt |

| Version | v1.0 |

| Status | CODING READY |

| Design Baseline | Production Deployment Automation Design Freeze v1.0 |

| Decision Range | Decision 01–50 |

| Decision 51 | 停止新增 Deployment Decision |

| Production Repository | `/home/zhe/pets` |

| Production User | `zhe` |

| Production Branch | `master` |



正式檔名：



`02 生產部署自動化 AI Coding Prompt Production Deployment Automation AI Coding Prompt v1.0.md`



\---



\# 2. AI Coding Role



你現在進入：



&#x20;   Production Deployment Automation

&#x20;   AI Coding Stage



你的任務不是重新設計 Production Deployment。



你的任務是：



> 依照「Production Deployment Automation Design Freeze v1.0」將已確認的 Deployment Design 實作成可執行的 Production Automation。



Design Freeze 是本次 Coding 的唯一規格基準。



\---



\# 3. Absolute Coding Rules



必須遵守以下規則：



1\. 不重新進行 Deployment Decision。

2\. 不重新詢問 Decision 01–50。

3\. 不新增 Decision 52 或後續 Decision。

4\. 不重新設計 Deployment Architecture。

5\. 不擴大 Deployment Scope。

6\. 不修改已 Freeze 的 MVP Business Logic。

7\. 不重新設計 Customer、Pet、Appointment、Daily Operations、Grooming、Boarding、Order、Payment、Product、Report。

8\. 不導入 Enterprise Architecture。

9\. 不導入 Docker。

10\. 不導入 Kubernetes。

11\. 不導入 Terraform。

12\. 不導入 Ansible。

13\. 不導入 Redis。

14\. 不導入 Distributed Lock Server。

15\. 不導入新的 CI/CD Platform。

16\. 不導入新的 State Management Framework。

17\. 不導入新的 API Client Layer。

18\. 不導入新的 Domain Architecture。

19\. 不使用 TypeScript。

20\. 不使用 Tailwind。

21\. 不使用 Prisma。

22\. 不修改既有 MVP 技術 Baseline。

23\. 不自行建立平行 Production Database。

24\. 不在 Routine Deployment 執行 Full Seed。

25\. 不在 Routine Deployment 執行 `setup.js`。

26\. 不在 Routine Deployment 執行 Operational Data Reset。

27\. 不在 Routine Deployment 執行 DROP Database。

28\. 不自動 Restore Database。

29\. 不自動 Git Rollback。

30\. 不使用 `git reset --hard` 作為 Deployment Recovery。

31\. 不使用 `git clean -fd` 作為 Deployment Recovery。

32\. 不將 Production Secrets 寫入 Git。

33\. 不將 Production Secrets 寫入 Deployment Log。



\---



\# 4. First Action — Repository Inspection



Coding 開始前，必須先檢查目前 Repository 實際狀態。



不得假設檔案一定存在。



必須檢查至少：



\## 4.1 Repository



確認：



&#x20;   pwd

&#x20;   git status

&#x20;   git branch

&#x20;   git remote -v

&#x20;   git log -1 --oneline



\## 4.2 Deployment Existing Files



確認：



&#x20;   deploy/

&#x20;   deploy.sh

&#x20;   .env.example

&#x20;   DEPLOYMENT.md



是否已存在。



如果不存在，依 Design Freeze 建立。



如果已存在：



> 先檢查內容，再進行最小必要修改。



不得直接覆蓋未知既有內容。



\## 4.3 Backend



檢查：



&#x20;   backend/package.json

&#x20;   backend/package-lock.json

&#x20;   backend/src/server.js

&#x20;   backend/src/app.js



確認既有 scripts。



\## 4.4 Frontend



檢查：



&#x20;   frontend/package.json

&#x20;   frontend/package-lock.json

&#x20;   frontend/next.config.js



確認既有 Build / Start 流程。



\## 4.5 Database



檢查：



&#x20;   database/scripts/migrate.js

&#x20;   database/scripts/helpers.js

&#x20;   database/migrations/



確認目前 Migration Architecture。



特別確認目前 `migrate()` 與 `executeSqlFile()` 的實際實作。



\## 4.6 Production Configuration



確認目前：



&#x20;   /etc/systemd/system/pets-backend.service

&#x20;   /etc/systemd/system/pets-frontend.service

&#x20;   /etc/nginx/sites-available/pets



確認實際 Service Name、Working Directory、Environment Loading、Port 與 Start Command。



不得憑猜測修改。



\---



\# 5. Pre-Coding Report



Repository Inspection 完成後，先整理：



&#x20;   Existing Files

&#x20;   New Files

&#x20;   Modified Files

&#x20;   Deployment Dependencies

&#x20;   Existing Migration Behavior

&#x20;   Existing Service Configuration

&#x20;   Existing Health Endpoint



並指出：



&#x20;   目前實際需要修改哪些檔案

&#x20;   每個檔案為何需要修改



這個 Report 不是新的 Decision。



不得等待使用者重新確認已 Freeze 的規格。



\---



\# 6. Target Implementation



本次 Coding 的主要實作範圍：



&#x20;   deploy/install.sh

&#x20;   deploy/deploy.sh

&#x20;   deploy/backup.sh

&#x20;   deploy/restore.sh

&#x20;   deploy/clear-state.sh

&#x20;   deploy/confirm.sh

&#x20;   .env.example

&#x20;   DEPLOYMENT.md



以及：



&#x20;   database/scripts/migrate.js

&#x20;   database/scripts/helpers.js



如 Repository Inspection 發現實際結構不同，必須：



1\. 以現有 Repository 結構為準。

2\. 做最小必要調整。

3\. 不重新設計架構。

4\. 在 Coding Report 中說明差異。



\---



\# 7. deploy/install.sh



`install.sh` 負責建立 Deployment Automation 所需的本機目錄、權限與必要初始化。



至少處理：



&#x20;   /home/zhe/pets-backups/

&#x20;   /home/zhe/pets-deploy-state/

&#x20;   /home/zhe/pets-deploy-state/logs/



Permissions：



&#x20;   directory = 700

&#x20;   file = 600

&#x20;   owner = zhe:zhe



不得：



\- 建立 Git Repository

\- 修改 Application Business Logic

\- 建立 Database

\- Reset Database

\- 執行 Full Seed

\- 修改 Production Operational Data



如果需要建立 Lock File 或 State File，必須遵守同一個 Deployment State / Lock Design。



\---



\# 8. deploy/deploy.sh



`deploy.sh` 是主要 Deployment Entry Point。



正式流程必須為：



&#x20;   Acquire Deployment Lock

&#x20;       ↓

&#x20;   Read Deployment State

&#x20;       ↓

&#x20;   Validate Deployment State

&#x20;       ↓

&#x20;   Cleanup old logs

&#x20;       ↓

&#x20;   Confirm Working Tree CLEAN

&#x20;       ↓

&#x20;   git fetch origin

&#x20;       ↓

&#x20;   Fast-forward only

&#x20;       ↓

&#x20;   Fix TARGET\_SHA

&#x20;       ↓

&#x20;   TARGET\_SHA consistency check

&#x20;       ↓

&#x20;   Backend npm ci

&#x20;       ↓

&#x20;   TARGET\_SHA consistency check

&#x20;       ↓

&#x20;   Frontend npm ci

&#x20;       ↓

&#x20;   TARGET\_SHA consistency check

&#x20;       ↓

&#x20;   Frontend build

&#x20;       ↓

&#x20;   TARGET\_SHA consistency check

&#x20;       ↓

&#x20;   DB Backup

&#x20;       ↓

&#x20;   TARGET\_SHA consistency check

&#x20;       ↓

&#x20;   Pending Migration

&#x20;       ↓

&#x20;   TARGET\_SHA consistency check

&#x20;       ↓

&#x20;   Restart Backend

&#x20;       ↓

&#x20;   Restart Frontend

&#x20;       ↓

&#x20;   Technical Health Check

&#x20;       ↓

&#x20;   TARGET\_SHA consistency check

&#x20;       ↓

&#x20;   State = DEPLOYED

&#x20;       ↓

&#x20;   verification=pending

&#x20;       ↓

&#x20;   Release Lock



\---



\# 9. Deployment State Validation



`deploy.sh` 開始時必須讀取：



&#x20;   /home/zhe/pets-deploy-state/deployment.state



如果 State 為：



&#x20;   SUCCESS



允許開始新的 Deployment。



如果 State 為：



&#x20;   FAILED



不得直接開始新 Deployment。



如果 State 為：



&#x20;   RUNNING



不得直接開始新 Deployment。



如果 State 為：



&#x20;   DEPLOYED



不得直接開始另一個 Deployment。



Human 必須先處理現有狀態。



\---



\# 10. RUNNING State



Deployment 開始後立即將 State 設為：



&#x20;   status=RUNNING



並寫入：



&#x20;   commit=<TARGET\_SHA>

&#x20;   previous\_commit=<last SUCCESS commit or NONE>

&#x20;   timestamp=<ISO 8601 +08:00>

&#x20;   backup=<backup filename or pending>



Deployment 若中途非正常結束，不得自動 Resume。



\---



\# 11. Target Commit



Git Update 成功後：



&#x20;   TARGET\_SHA="$(git rev-parse HEAD)"



TARGET\_SHA 必須固定。



後續不得重新自行選擇另一個 Commit。



每個重要 Stage 前後可以進行：



&#x20;   git rev-parse HEAD



確認結果仍等於：



&#x20;   TARGET\_SHA



如果：



&#x20;   HEAD != TARGET\_SHA



立即：



&#x20;   status=FAILED



並停止 Deployment。



不得自動 Rollback。



\---



\# 12. Git Update Implementation



Git Update 必須：



1\. 確認 Working Tree CLEAN。

2\. 執行 `git fetch origin`。

3\. 以 Fast-forward only 更新 `master`。

4\. 不強制覆蓋 Production Working Tree。



不得使用：



&#x20;   git reset --hard

&#x20;   git clean -fd



作為正常 Deployment Update。



如果 Git Update 無法 Fast-forward：



&#x20;   Deployment = FAILED



\---



\# 13. Dependency Installation



Backend：



&#x20;   cd backend

&#x20;   npm ci



Frontend：



&#x20;   cd frontend

&#x20;   npm ci



必須使用既有：



&#x20;   package-lock.json



不得：



\- 自動更新 dependencies

\- 修改 package-lock

\- 使用 `npm install` 代替 `npm ci`



Command Result 必須進入 Deployment Log。



\---



\# 14. Frontend Build



使用既有 Frontend Build Script：



&#x20;   npm run build



Build 必須在 Database Backup 之前。



Build FAIL：



&#x20;   Deployment = FAILED



並且：



&#x20;   DB Backup = 不執行

&#x20;   Migration = 不執行

&#x20;   Service Restart = 不執行



\---



\# 15. Backup Integration



`deploy.sh` 必須呼叫：



&#x20;   deploy/backup.sh



Backup 必須在 Migration 前完成。



Backup PASS 的必要條件：



&#x20;   file exists

&#x20;   file non-empty

&#x20;   gzip integrity PASS



Backup FAIL：



&#x20;   Deployment = FAILED



不得進入 Migration。



\---



\# 16. backup.sh



Backup Script：



&#x20;   deploy/backup.sh



固定 Backup Directory：



&#x20;   /home/zhe/pets-backups/



固定 Filename Pattern：



&#x20;   psop\_one\_YYYYMMDD\_HHMMSS.sql.gz



使用既有 Production Database Configuration。



不得將 Password 直接寫在 Shell Command Line。



應使用安全方式取得 MySQL Authentication。



Backup 完成後必須執行 gzip integrity verification。



Backup Script 不得：



\- Reset DB

\- Modify Operational Data

\- Run Migration

\- Run Seed

\- Restart Application



\---



\# 17. Backup Retention



`backup.sh` 或 Deployment Cleanup 必須處理：



&#x20;   > 30 days



的舊 Backup。



Cleanup Failure：



&#x20;   Warning only



不得因單純 Cleanup Failure 導致 Deployment FAIL。



\---



\# 18. Migration Safety Guard



必須修改現有 Migration Runner，使 Production Safety Guard 成為 Migration 本身的一部分。



Migration 必須在真正執行 SQL 前確認：



&#x20;   DB Host

&#x20;   DB Name

&#x20;   Environment



並通過：



&#x20;   Production Safety Guard



只有 Guard PASS 才可以執行 Pending Migration。



\---



\# 19. Migration Implementation Constraint



Migration 必須維持：



&#x20;   Pending migrations only



不得因加入 Safety Guard 而改變既有 Migration Semantics。



不得：



\- Full Seed

\- Full Setup

\- Reset

\- DROP Database

\- Delete Operational Data

\- 修改既有 Business Data Model



除非現有 Migration 機制本身要求，否則不得重新設計 Migration Framework。



\---



\# 20. Migration Failure



Migration FAIL 時：



&#x20;   status=FAILED



並且：



&#x20;   不 Restart Backend

&#x20;   不 Restart Frontend

&#x20;   不自動 Restore

&#x20;   Backup 保留

&#x20;   Log 保留



不得執行任何自動資料回復。



\---



\# 21. Service Restart



Migration PASS 後固定：



&#x20;   systemctl restart pets-backend.service

&#x20;   systemctl restart pets-frontend.service



兩個 Service 都必須處理。



不得自行加入 Diff-based Restart Optimization。



\---



\# 22. Technical Health Check



Deployment 必須執行：



\## Backend



確認：



&#x20;   pets-backend.service = active



並呼叫現有 Backend HTTP Health Endpoint。



\## Frontend



確認：



&#x20;   pets-frontend.service = active



並確認 Frontend HTTP Response。



\## Nginx



確認 Production HTTP Response。



Health Endpoint Path：



> 必須從現有 Repository / Production Configuration 找到實際值。



不得自行發明新的 Health Endpoint。



如果目前沒有適合的 Health Endpoint：



\- 不得自行建立完整新架構。

\- 先依現有 Application 結構判斷最小必要實作方式。

\- 在 Coding Report 中明確記錄。



\---



\# 23. Production Verification Boundary



不得把完整 Browser Business Workflow 寫進 `deploy.sh`。



Technical Health Check 只驗證：



&#x20;   Service

&#x20;   HTTP

&#x20;   Nginx



Browser Production Verification 由 Human 執行。



\---



\# 24. confirm.sh



實作：



&#x20;   deploy/confirm.sh



流程：



&#x20;   Acquire Deployment Lock

&#x20;       ↓

&#x20;   Read deployment.state

&#x20;       ↓

&#x20;   Confirm status=DEPLOYED

&#x20;       ↓

&#x20;   Confirm verification=pending

&#x20;       ↓

&#x20;   Display Deployment Information

&#x20;       ↓

&#x20;   Ask for CONFIRM

&#x20;       ↓

&#x20;   Atomic State Update

&#x20;       ↓

&#x20;   status=SUCCESS

&#x20;   verification=PASS

&#x20;       ↓

&#x20;   Append Verification Record

&#x20;       ↓

&#x20;   Release Lock



只有輸入：



&#x20;   CONFIRM



才可以確認。



\---



\# 25. clear-state.sh



實作：



&#x20;   deploy/clear-state.sh



用途：



&#x20;   FAILED

&#x20;   RUNNING



的人工 Recovery。



流程：



&#x20;   Acquire Deployment Lock

&#x20;       ↓

&#x20;   Display Current State

&#x20;       ↓

&#x20;   Ask CLEAR

&#x20;       ↓

&#x20;   Clear / Resolve Abnormal State

&#x20;       ↓

&#x20;   Release Lock



只有明確輸入：



&#x20;   CLEAR



才可以執行。



不得要求使用者自行：



&#x20;   rm deployment.state



\---



\# 26. restore.sh



實作：



&#x20;   deploy/restore.sh



Restore 必須：



1\. 僅接受 `/home/zhe/pets-backups/` 下的 Backup。

2\. 僅接受 `psop\_one\_\*.sql.gz`。

3\. 先驗證 File。

4\. 執行 gzip integrity check。

5\. 顯示 Database / Backup 資訊。

6\. 要求輸入 `RESTORE`。

7\. Stop Frontend。

8\. Stop Backend。

9\. 保持 MySQL 執行。

10\. 執行 Restore。

11\. 執行 Database Validation。

12\. Start Backend。

13\. Start Frontend。

14\. 執行 Service Verification。

15\. 執行 Health Check。

16\. 回報最終 Restore Result。



\---



\# 27. Restore Failure



如果 Restore 本身失敗：



&#x20;   restore result = FAILED



即使後續：



&#x20;   Backend = active

&#x20;   Frontend = active

&#x20;   Health Check = PASS



也不得將 Restore 判定為 PASS。



不得自動選擇另一個 Backup 再次 Restore。



\---



\# 28. Deployment Log



建立：



&#x20;   /home/zhe/pets-deploy-state/logs/



每次 Deployment：



&#x20;   deploy-YYYYMMDD-HHMMSS.log



Log 必須包含：



&#x20;   user

&#x20;   started\_at

&#x20;   target\_commit

&#x20;   previous\_commit

&#x20;   stage operations

&#x20;   stdout

&#x20;   stderr

&#x20;   exit code

&#x20;   result

&#x20;   deployment summary



\---



\# 29. Secret Masking



所有 Command Output 寫入 Log 前必須經過 Secret Masking。



Masking Source：



> Production `.env` 中實際存在且已知的 Secret Values。



不得：



&#x20;   cat .env

&#x20;   printenv

&#x20;   env



並將完整結果寫入 Log。



已知 Secret：



&#x20;   length >= 4



進行一般 Value Masking：



&#x20;   \*\*\*\*



短於 4 個字元的 Secret 不進行一般字串全域替換。



但仍不得主動將其輸出至：



\- Command Line

\- stdout

\- stderr

\- Deployment Log



\---



\# 30. Deployment State Atomic Write



所有 State 更新必須：



1\. 建立 temporary file。

2\. 完整寫入內容。

3\. 寫入成功後 atomic `mv` 至正式 State File。



不得直接進行可能留下半截內容的 State File overwrite。



\---



\# 31. Deployment Lock



所有 State-changing Operations 必須使用相同 Linux `flock`：



&#x20;   deploy.sh

&#x20;   confirm.sh

&#x20;   clear-state.sh



Lock 無法取得：



&#x20;   deployment already running



立即停止。



不得建立外部 Lock Server。



\---



\# 32. Deployment State Fields



至少使用：



&#x20;   status=

&#x20;   commit=

&#x20;   previous\_commit=

&#x20;   timestamp=

&#x20;   backup=

&#x20;   verification=



禁止寫入：



&#x20;   password

&#x20;   token

&#x20;   API secret

&#x20;   .env contents



\---



\# 33. Deployment State Semantics



\## RUNNING



&#x20;   Deployment 已開始但尚未正常完成。



\## DEPLOYED



&#x20;   Technical Deployment PASS

&#x20;   Technical Health Check PASS

&#x20;   verification=pending



\## SUCCESS



&#x20;   Technical Deployment PASS

&#x20;   Manual Production Verification PASS

&#x20;   verification=PASS



\## FAILED



&#x20;   Deployment 發生失敗。



\---



\# 34. Deployment Summary



`deploy.sh` 最後必須寫入固定 Summary。



DEPLOYED：



&#x20;   ===== DEPLOYMENT SUMMARY =====

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

&#x20;   ===============================



FAILED：



&#x20;   ===== DEPLOYMENT SUMMARY =====

&#x20;   status=FAILED

&#x20;   target\_commit=<SHA>

&#x20;   previous\_commit=<SHA>

&#x20;   backup=<filename>

&#x20;   failed\_stage=<stage>

&#x20;   started\_at=<ISO 8601>

&#x20;   finished\_at=<ISO 8601>

&#x20;   ===============================



不得在 Summary 中寫入 Secret。



\---



\# 35. Production Verification Record



`confirm.sh` 必須追加：



&#x20;   ===== PRODUCTION VERIFICATION =====

&#x20;   user=zhe

&#x20;   verified\_at=<ISO 8601 +08:00>

&#x20;   verification=PASS

&#x20;   result=SUCCESS

&#x20;   ====================================



不得建立第二份 Deployment Log。



必須追加至該 Deployment 的原始 Log。



\---



\# 36. Time Handling



所有時間統一：



&#x20;   ISO 8601

&#x20;   +08:00



例如：



&#x20;   2026-09-27T21:04:37+08:00



至少記錄：



&#x20;   started\_at

&#x20;   finished\_at



不需要建立每一 Stage 的獨立 start/end timestamps。



\---



\# 37. Log Retention



Deployment Logs：



&#x20;   30 days



超過 30 天：



&#x20;   自動清理



Cleanup Failure：



&#x20;   Warning only



不得阻止 Deployment。



\---



\# 38. File Permissions



固定：



&#x20;   /home/zhe/pets-deploy-state/

&#x20;       owner = zhe:zhe

&#x20;       mode = 700



State / Log files：



&#x20;   owner = zhe:zhe

&#x20;   mode = 600



Backup Directory：



&#x20;   owner = zhe:zhe

&#x20;   mode = 700



Backup Files：



&#x20;   僅允許必要的 Production User 存取。



\---



\# 39. Environment Configuration



建立：



&#x20;   .env.example



只能提供 Configuration Structure / Placeholder。



不得包含實際 Production Secret。



Production `.env`：



\- 不得進 Git。

\- 不得被 Deployment Log 輸出。

\- 不得被 Coding Agent 修改成公開 Secret。



維持現有：



&#x20;   NEXT\_PUBLIC\_API\_BASE\_URL=



的 same-origin Production 設計，不得自行改成 Public Backend URL。



\---



\# 40. Existing Production Configuration



不要自行假設 Production Configuration。



Coding 時必須實際檢查：



&#x20;   /etc/systemd/system/pets-backend.service

&#x20;   /etc/systemd/system/pets-frontend.service

&#x20;   /etc/nginx/sites-available/pets



再決定 Script 使用的：



\- Working Directory

\- Node Binary

\- Environment

\- Service Name

\- Port

\- Health Endpoint



不得因 Script 設計而重新建立另一套 Application Runtime Configuration。



\---



\# 41. Nginx Scope



本次 Coding 不重新設計 Nginx Architecture。



只使用現有：



&#x20;   /api/\* → Backend

&#x20;   / → Frontend



如果 Deployment Documentation 需要說明 Nginx：



> 以 Production 現況為準。



不得因 Automation 自行增加 Reverse Proxy Layer。



\---



\# 42. Database Credentials



不得將 Database Password 放在：



&#x20;   Shell Command Arguments



例如不得：



&#x20;   mysql -pPASSWORD



應使用既有安全 Configuration。



不得將 Password 寫入：



\- Git

\- State

\- Log

\- stdout

\- stderr



\---



\# 43. Error Handling



所有主要 Deployment Stage 必須：



1\. 執行 Command。

2\. 捕捉 stdout。

3\. 捕捉 stderr。

4\. 記錄 Exit Code。

5\. 記錄 Result。

6\. PASS 才進入下一 Stage。

7\. FAIL 則設定 State = FAILED。

8\. 停止不應繼續的後續 Stage。



不得吞掉 Error。



不得使用：



&#x20;   || true



掩蓋真正 Deployment Failure。



如果某個操作確實屬於 Best-effort，例如 Log Cleanup：



> 必須明確標記為 Warning，不得混淆為 Deployment PASS。



\---



\# 44. Shell Script Safety



Shell Scripts 應使用適當的：



&#x20;   set -euo pipefail



並對必要的 Optional / Best-effort Operations 明確處理 Error。



Script 必須：



\- 使用固定路徑或可靠的 Script-relative path。

\- 避免依賴目前 Shell Working Directory。

\- 正確處理空白與特殊字元。

\- 正確處理 Exit Code。

\- 避免破壞性 Command。

\- 避免未預期的資料刪除。



\---



\# 45. Path Safety



Production Backup、State、Log 均為 Repository 外固定位置。



不得讓使用者輸入任意 Path 直接進入：



&#x20;   rm

&#x20;   mysqldump

&#x20;   mysql

&#x20;   gzip

&#x20;   restore



Restore 尤其只能從：



&#x20;   /home/zhe/pets-backups/



取得合法 Backup。



\---



\# 46. install.sh Safety



`install.sh` 不得執行 Production Deployment。



不得因第一次安裝而：



\- Reset Database

\- Run Full Seed

\- Modify Staff Data

\- Delete Data

\- Restart Application without necessity



`install.sh` 的責任是：



> 建立 Deployment Automation 所需的本機 Infrastructure。



\---



\# 47. DEPLOYMENT.md



建立或更新：



&#x20;   DEPLOYMENT.md



至少說明：



\## Installation



&#x20;   ./deploy/install.sh



\## Deployment



&#x20;   ./deploy/deploy.sh



\## Production Verification



Browser Verification PASS 後：



&#x20;   ./deploy/confirm.sh



\## Abnormal State Recovery



&#x20;   ./deploy/clear-state.sh



\## Database Backup



說明 Backup Location、Naming、Retention。



\## Database Restore



說明：



&#x20;   ./deploy/restore.sh



以及明確確認：



&#x20;   RESTORE



\## Deployment State



說明：



&#x20;   RUNNING

&#x20;   DEPLOYED

&#x20;   SUCCESS

&#x20;   FAILED



\## Deployment Logs



說明：



&#x20;   /home/zhe/pets-deploy-state/logs/



\## Backup



說明：



&#x20;   /home/zhe/pets-backups/



\---



\# 48. Testing Requirements



Coding 完成後不得只做 Syntax Check。



至少執行：



\## 48.1 Shell Syntax



對所有 Shell Scripts 執行 Shell Syntax Validation。



例如：



&#x20;   bash -n deploy/install.sh

&#x20;   bash -n deploy/deploy.sh

&#x20;   bash -n deploy/backup.sh

&#x20;   bash -n deploy/restore.sh

&#x20;   bash -n deploy/clear-state.sh

&#x20;   bash -n deploy/confirm.sh



實際 Script 若不同，依實際檔案執行。



\## 48.2 Existing Application Checks



Backend：



&#x20;   npm run check



Frontend：



&#x20;   npm run build



不得因 Deployment Automation 破壞既有 Application Build。



\## 48.3 Migration Check



確認 Migration Script：



\- 可以讀取 Migration State

\- Production Safety Guard 存在

\- Pending Migration 邏輯沒有被破壞



不得直接對 Production 執行破壞性測試。



\---



\# 49. Deployment Automation Verification



必須驗證：



\### Git



\- \[ ] CLEAN Working Tree 可以開始

\- \[ ] DIRTY Working Tree 會停止

\- \[ ] `git fetch origin` 正常

\- \[ ] Fast-forward only 正常

\- \[ ] TARGET\_SHA 正確固定

\- \[ ] TARGET\_SHA mismatch 會 FAIL



\### Dependency



\- \[ ] Backend `npm ci` PASS

\- \[ ] Frontend `npm ci` PASS



\### Build



\- \[ ] Frontend Build PASS

\- \[ ] Build Failure 可以停止 Deployment



\### Backup



\- \[ ] Backup 建立

\- \[ ] Backup 非空

\- \[ ] gzip Integrity PASS

\- \[ ] Backup Failure 阻止 Migration

\- \[ ] 30-day Cleanup 正常



\### Migration



\- \[ ] Safety Guard PASS

\- \[ ] Pending Migration PASS

\- \[ ] Migration Failure 停止 Deployment

\- \[ ] 不執行 Full Seed



\### Services



\- \[ ] Backend Restart PASS

\- \[ ] Frontend Restart PASS



\### Health



\- \[ ] Backend Service PASS

\- \[ ] Backend HTTP Health PASS

\- \[ ] Frontend Service PASS

\- \[ ] Frontend HTTP PASS

\- \[ ] Nginx HTTP PASS



\### State



\- \[ ] RUNNING

\- \[ ] DEPLOYED

\- \[ ] SUCCESS

\- \[ ] FAILED

\- \[ ] Atomic Write

\- \[ ] State Lock



\### Logs



\- \[ ] Deployment Log 建立

\- \[ ] stdout 保留

\- \[ ] stderr 保留

\- \[ ] Exit Code 保留

\- \[ ] Secret Masking PASS

\- \[ ] 30-day Retention

\- \[ ] Permissions PASS



\### Confirmation



\- \[ ] `confirm.sh` 只接受 `DEPLOYED`

\- \[ ] 要求 `CONFIRM`

\- \[ ] 更新為 SUCCESS

\- \[ ] 寫入 Verification Record



\### Recovery



\- \[ ] `clear-state.sh` 要求 `CLEAR`

\- \[ ] `restore.sh` 只接受合法 Backup

\- \[ ] `restore.sh` 要求 `RESTORE`

\- \[ ] Restore Validation PASS

\- \[ ] Restore Failure 正確回報



\---



\# 50. Production Safety Verification



Coding 完成後，任何 Production 測試都必須避免破壞既有 Operational Data。



不得用以下方式驗證 Deployment：



\- DROP Database

\- Full Reset

\- Delete Operational Data

\- Full Seed

\- 任意修改 Staff Authentication

\- 任意清空 Orders

\- 任意清空 Payments

\- 任意清空 Appointments



若需要測試 Failure Handling：



> 應優先使用安全、可控、不破壞 Production Data 的方法。



\---



\# 51. Browser Production Verification



Technical Deployment 完成後，State 必須為：



&#x20;   DEPLOYED



此時停止自動流程，不得自動呼叫 `confirm.sh`。



Human 必須透過 Browser 驗證 Production。



至少確認：



1\. Production Login

2\. Application Navigation

3\. Customer

4\. Pet

5\. Appointment

6\. Daily Operations

7\. Grooming / Boarding

8\. Order

9\. Payment

10\. Report



依目前 Production MVP 實際可用功能進行確認。



不得因 Deployment Automation 驗證重新設計任何 Business Block。



\---



\# 52. AI Coding Output Requirements



Coding 過程中，每完成一個主要階段，提供簡潔的工程結果：



&#x20;   Action

&#x20;   Files Changed

&#x20;   Result

&#x20;   Verification



例如：



&#x20;   Action:

&#x20;   Implement deployment state manager



&#x20;   Files:

&#x20;   deploy/deploy.sh

&#x20;   deploy/confirm.sh

&#x20;   deploy/clear-state.sh



&#x20;   Result:

&#x20;   PASS



&#x20;   Verification:

&#x20;   Shell syntax PASS



不得用大量理論重新解釋 Design Decision。



\---



\# 53. No Scope Drift



如果 Coding 過程發現：



\- Existing Architecture 與 Freeze 不完全一致

\- Health Endpoint 不存在

\- systemd Configuration 不同

\- Migration Helper 實作不同

\- Existing Deployment File 已存在

\- 某項 Freeze 規格與實際 Repository 結構衝突



不得自行擴大 Scope。



處理順序：



&#x20;   Inspect actual repository

&#x20;       ↓

&#x20;   Choose minimal implementation compatible with Freeze

&#x20;       ↓

&#x20;   Record concrete discrepancy

&#x20;       ↓

&#x20;   Implement minimum required change



只有在無法安全實作時，才停止並指出實際阻塞點。



不得自行創造新的 Deployment Architecture。



\---



\# 54. Git Rules During Coding



AI Coding 階段：



\- 可以修改檔案。

\- 可以新增檔案。

\- 可以執行測試。

\- 可以執行 Build。

\- 可以執行必要的安全驗證。



不得自行：



&#x20;   git reset --hard

&#x20;   git clean -fd

&#x20;   git push

&#x20;   git commit



除非使用者另外明確要求。



\---



\# 55. Git Checkpoint Boundary



Production Deployment Automation Coding 完成後：



&#x20;   Coding

&#x20;       ↓

&#x20;   Verification

&#x20;       ↓

&#x20;   Human Acceptance

&#x20;       ↓

&#x20;   Git Checkpoint



Git Checkpoint 不屬於本 Coding Prompt 的自動操作。



不得自行 Commit。



\---



\# 56. Final Coding Acceptance Criteria



AI Coding 階段只有在以下條件全部成立後，才可宣告 Coding Complete：



\- \[ ] 所有必要 Deployment Scripts 已實作

\- \[ ] Existing Migration Safety Guard 已完成

\- \[ ] Git Fast-forward only 已實作

\- \[ ] TARGET\_SHA 已固定

\- \[ ] TARGET\_SHA consistency check 已實作

\- \[ ] Backend `npm ci` 已實作

\- \[ ] Frontend `npm ci` 已實作

\- \[ ] Frontend Build 已實作

\- \[ ] Backup-before-Migration 已實作

\- \[ ] Backup Integrity Check 已實作

\- \[ ] Migration Failure Stop 已實作

\- \[ ] Backend Restart 已實作

\- \[ ] Frontend Restart 已實作

\- \[ ] Technical Health Check 已實作

\- \[ ] Deployment State 已實作

\- \[ ] Deployment Lock 已實作

\- \[ ] Atomic State Write 已實作

\- \[ ] Deployment Log 已實作

\- \[ ] Secret Masking 已實作

\- \[ ] Log Retention 已實作

\- \[ ] Backup Retention 已實作

\- \[ ] `confirm.sh` 已實作

\- \[ ] `clear-state.sh` 已實作

\- \[ ] `restore.sh` 已實作

\- \[ ] Restore Confirmation 已實作

\- \[ ] Restore Validation 已實作

\- \[ ] Restore Failure Handling 已實作

\- \[ ] `.env.example` 已建立或確認現有版本

\- \[ ] `DEPLOYMENT.md` 已建立或更新

\- \[ ] Shell Syntax Check PASS

\- \[ ] Backend Check PASS

\- \[ ] Frontend Build PASS

\- \[ ] Deployment Automation Verification PASS

\- \[ ] 無 Production Secret 進入 Git

\- \[ ] 無 Production Secret 進入 Log

\- \[ ] 無 MVP Business Scope Drift



\---



\# 57. Final Instruction to AI Coding



現在開始執行：



&#x20;   Production Deployment Automation AI Coding



第一步只做：



&#x20;   Repository Inspection



確認實際 Repository、Deployment Files、Migration、systemd、Nginx、package scripts 與 Health Endpoint。



Inspection 完成後：



1\. 列出實際 Existing Files。

2\. 列出 New Files。

3\. 列出 Modified Files。

4\. 說明每個修改的必要性。

5\. 確認沒有 Scope Drift。

6\. 然後依本 Prompt 開始 Coding。



不要重新進行 Decision。



不要要求使用者重新回答 Decision 01–50。



不要提出 Decision 52+。



不要重新設計 Production Deployment。



不要修改已 Freeze 的 MVP Business Logic。



所有實作必須以：



&#x20;   Production Deployment Automation Design Freeze v1.0



為唯一 Design Baseline。



\# END

