# 寵物 3.0 Operations Center 正式進度基準

## 文件用途與狀態定義

本文件是 Operations Center 的**唯一正式進度基準**。功能實作、驗收證據、未完成事項與下一步均以本文件記錄為準；程式碼存在或低層級測試通過，不單獨代表功能已完成。更新進度時應保留可追溯證據，並追加變更紀錄。

所有功能統一使用下列狀態：

| 狀態 | 定義 |
|---|---|
| `未開始` | 尚未實作。 |
| `實作中` | 正在開發，尚未達到待驗收條件。 |
| `待驗收` | 已有實作，但指定的驗收尚未完成。 |
| `已完成` | 符合事先定義的驗收條件，且有可追溯的驗收證據。 |
| `受阻` | 有明確障礙，無法繼續。 |

部分完成的功能應使用最符合現況的上述狀態，並於表格中記錄已完成與未完成部分，不得將部分完成誤標為整體完成。

## Git 基準

### 最近一次已知 checkpoint

| 項目 | 已知 checkpoint 資訊 |
|---|---|
| Branch | `master` |
| 本機 HEAD | `2903ec07da502e6fe60a0470cb3d81a80b90d71f` |
| 該 checkpoint 已確認的 GitHub `origin/master` SHA | `2903ec07da502e6fe60a0470cb3d81a80b90d71f` |
| 最近一次已確認成功的 Operations Center GitHub Push | 2026-10-17 13:50:16–13:50:20（台灣時間） |
| Push 證據 | 推送成功；輸出確認推送後 GitHub SHA 與本機 HEAD 相同。 |

上述 Push 是該次 checkpoint 的實際推送證據，不代表所有 Push UI 分支、取消、逾時或例外情境均已驗收。

### 本文件建立時的唯讀觀察

| 項目 | 實際觀察 |
|---|---|
| Branch | `master` |
| 本機 HEAD | `2903ec07da502e6fe60a0470cb3d81a80b90d71f` |
| 本機 `refs/remotes/origin/master` tracking ref | `2903ec07da502e6fe60a0470cb3d81a80b90d71f` |
| 工作樹 | `git status --short --branch` 顯示 `## master...origin/master`，另有未追蹤 `.github/workflows/production-deploy.yml`。 |
| 與最近一次已知 checkpoint 的差異 | Branch、HEAD 與本機 tracking ref 一致。此處的即時唯讀檢查未執行 fetch 或即時 GitHub 查詢；GitHub SHA 的實際推送確認仍以最近一次已知 checkpoint 證據為準。 |

未追蹤的 `.github/workflows/production-deploy.yml` 不屬於本文件變更範圍；本文件不推測其來源，也不將其列入或改寫為已追蹤成果。

## 功能進度表

「已有驗收證據」欄區分已提供的 checkpoint 證據、程式／Git 歷史證據與尚未驗收項目。僅有程式或提交記錄，不視為真實 UI 或 Production 驗收。

| 功能 | 目前狀態 | 已實作內容 | 已有驗收證據 | 尚缺驗收／未完成項目 | 最近相關 commit（已知） | 下一個必要動作 |
|---|---|---|---|---|---|---|
| GitHub Push | `待驗收` | Push 前檢查、確認對話框、確認後再次檢查 SHA、執行 `git push origin master`，並於推送後檢查 GitHub SHA。 | 2026-10-17 13:50:16–13:50:20（台灣時間）實際 Push 成功；輸出確認推送後 GitHub SHA 與本機 HEAD 相同。相關程式與歷史可追溯至 `0a4653a`、`0799417`。 | 這次成功不涵蓋所有 UI 分支、取消、逾時及例外情境；尚缺這些情境的驗收。 | `0799417`、`0a4653a` | 待使用者確認後，以隔離 Git 情境補驗尚未涵蓋的 Push 分支；不得以真實 Push 作測試。 |
| Git／Branch／SHA Preflight | `待驗收` | 檢查分支、HEAD、含未追蹤檔案的工作樹、本機追蹤關係及 GitHub `master` SHA，並比較 SHA。 | 程式與歷史提交可追溯至 `09fa629`、`17070db`。最近一次盤點沒有重新執行完整 Preflight UI，也沒有即時遠端查詢。 | 缺本功能完整 UI 驗收及新鮮的遠端查詢證據。 | `09fa629`、`17070db` | 待確認後，在安全條件下驗收完整 Preflight UI 與不同 Git 狀態分支。 |
| Production 唯讀狀態查詢 | `待驗收` | 以 SSH 讀取固定狀態檔；驗證欄位白名單與狀態組合；缺檔、格式錯誤或查詢失敗時不宣稱狀態已確認。 | 實作與控制項修正可追溯至 `b75f0c2`、`92e19bc`。 | Production 狀態檔路徑尚未獨立確認；沒有本次實際 Production 查詢或查詢 UI 驗收證據。 | `b75f0c2`、`92e19bc` | 先確認狀態檔路徑，再經授權執行唯讀查詢並記錄結果；不可將固定路徑或程式常數視為 Production 實況。 |
| Operations Center Production Deploy | `未開始` | Operations Center 有標示第二階段啟用的 Deploy 按鈕，目前停用且未接通部署流程。獨立入口 `deploy-production.ps1`／`deploy.sh` 存在，並含固定 SHA 等檢查。 | 獨立部署實作歷史可追溯至 `82915fc`、`5aeb5dc`、`f517066`。`deploy-sha.test.js` 存有 mock 測試程式；本次未執行測試。 | Operations Center Deploy 尚未實作／接通；獨立入口與 mock 程式均不能作為 Operations Center Deploy 完成或 Production 驗收證據。 | `82915fc`、`5aeb5dc`、`f517066` | 維持按鈕停用；只有取得明確核准並完成安全設計後，才開始整合及定義驗收。 |
| Backup 與備份目的地驗證 | `待驗收` | 檢查目的地存在、非符號連結、權限與標準化路徑；驗證通過後才允許備份；以成功退出碼及唯一符合預期的目標檔案標記判定完成。 | 相關程式及修正歷史可追溯至 `ead1822`、`2b1cf5f`。 | Production 備份目的地尚未實際確認；沒有本次 Production 目的地或備份驗收證據。 | `ead1822`、`2b1cf5f` | 在授權且適當的驗收條件下確認目的地閘門；未確認前不得將 Production 備份列為驗收通過。 |
| 備份產物唯讀檢查 | `待驗收` | Operations Center 提供獨立檢查入口；只接受固定 `/home/zhe/pets-backups` 目錄下符合命名格式的檔案，檢查一般檔案、非零大小與相鄰 `.sha256` sidecar 對外層 archive 的 SHA-256 比對，並區分 `PASS`、`FAIL` 與遠端結果未確認。Archive 內的 `SHA256SUMS` 僅驗證 bundle 內部成員，不作為外層 archive checksum。 | 隔離 Mock 測試 17 項通過；PowerShell Parser、backup.sh Bash syntax 通過；本機 fixture 驗證正確 checksum 為 PASS、不符為 FAIL；未連線 Production。 | 尚未在真實 UI 或 Production 執行唯讀驗證；未確認 Production 是否已有對應 `.sha256` sidecar。既有備份不會因本次變更自動補產生 sidecar。 | 本次尚未建立 commit | 使用者先審閱本次實作；後續 Production 唯讀驗證需另行明確授權。 |
| Restore 與停止服務確認 | `待驗收` | 有遠端備份檔案清單、路徑格式限制、操作警告、人工確認服務已停止及精確輸入 `RESTORE`；`restore.sh` 另要求再次確認。 | Restore 接線及停止服務確認修正歷史可追溯至 `bae8f94`、`8d5ffca`。 | 尚無本次 UI 或 Production Restore 驗收證據。停止服務目前是人工聲明，不是遠端 `systemctl` 狀態驗證；流程不會自動停止服務。 | `bae8f94`、`8d5ffca` | 待使用者確認後，對取消與執行防護進行隔離 mock 驗收；不執行 Production Restore。 |
| Rebuild | `未開始` | UI 顯示尚無完整重建流程；按鈕未接線且停用。 | 程式目前明示沒有完整流程；未有完整背景重建作業或完成驗收證據。 | 完整重建流程及處理器尚未實作，沒有可驗收的完成證據。 | 尚無可確認的完整重建實作 commit | 保持停用；待明確授權後再定義範圍與安全驗收條件。 |
| SSH 與認證 | `待驗收` | 有主機／帳號驗證、密碼 `SecureString` 處理、SSH.NET 主機指紋檢查，以及遠端 OpenSSH 私鑰與 `StrictHostKeyChecking=yes`。 | 相關實作與修正歷史可追溯至 `c0193f0`、`bae8f94`。 | 尚無本次真實 SSH 連線驗收證據；程式存在不代表 Production 認證已通過。 | `c0193f0`、`bae8f94` | 待授權後選擇適當環境驗收主機金鑰、認證成功與失敗路徑；不得以本文件建立工作為由連線 Production。 |
| 操作紀錄、錯誤摘要及敏感資訊遮蔽 | `待驗收` | 有 UI 操作紀錄、錯誤摘要與敏感資訊遮蔽。 | 最新相關 commit 為 `2903ec07da502e6fe60a0470cb3d81a80b90d71f`。該 checkpoint 已提供 PowerShell Parser PASS、`git diff --check` PASS 及模擬驗證證據，涵蓋 Authorization Basic／Bearer／CustomScheme、TOKEN／API_KEY、HTTPS 認證 URL、敏感子字串不出現在紀錄、stderr／stdout 摘要、`permission denied`、`ERROR`、退出碼 17、成功摘要、逾時／取消及保留詳細輸出。這些是 Parser／模擬證據，不是真實 UI 驗收。 | 尚缺真實 UI 驗收；遮蔽案例不代表涵蓋所有格式。操作紀錄目前供 UI 顯示，不是持久化稽核紀錄。 | `2903ec0`（`2903ec07da502e6fe60a0470cb3d81a80b90d71f`） | 在不記錄秘密的前提下，規劃並驗收 UI 呈現及必要遮蔽案例；不得宣稱有持久化稽核功能。 |
| UI 按鈕、確認對話框、停用狀態與處理器 | `待驗收` | Push、Preflight、唯讀狀態查詢、Backup、Restore、SSH 有相關程式與處理器；Deploy／Rebuild 維持停用。 | 靜態程式及相關提交可供追溯；Push 有上述單次實際成功證據。整體 UI 未完成驗收。 | 尚未驗收取消、停用按鈕、完成／失敗狀態及所有確認對話框的整體行為。 | 依各功能列所列 commit；最新診斷修正為 `2903ec0` | 待確認後按功能及狀態分支執行隔離 UI 驗收；在核准前不得啟用 Deploy／Rebuild。 |

## 驗收層級與證據規則

驗收證據依其實際層級記錄，不得以低層級 PASS 代替高層級驗收：

| 層級 | 可證明事項 | 不可替代事項 |
|---|---|---|
| PowerShell Parser 檢查 | 指定 PowerShell 檔案可通過語法剖析。 | 不證明處理器正確、UI 可操作或遠端操作成功。 |
| 靜態檢查（例如 `git diff --check`） | 指定差異符合相應靜態格式檢查。 | 不證明執行時行為或 Production 狀態。 |
| Mock／模擬測試 | 被模擬的輸入、輸出與分支符合測試預期。 | 不等同真實 UI、真實 SSH 或 Production 驗收。 |
| 真實 UI 操作驗收 | 實際介面及已測試的使用者操作流程符合驗收條件。 | 不代表 Production 已驗證或操作成功。 |
| Production 唯讀驗證 | 在指定時間唯讀觀察到的 Production 狀態。 | 不代表已執行或驗收任何 Production 寫入操作。 |
| Production 實際操作驗收 | 指定 Production 操作及其明確驗收條件有可追溯結果。 | 不應由程式、文件或模擬結果推定。 |

沒有相應證據時應記為「尚未驗收」；不推測結果，也不把 Git commit 本身當作驗收紀錄。

## 必要回歸防護

後續修改 Operations Center 或其直接相關功能時，至少保留下列行為，並以隔離驗收驗證：

- **Push：**僅允許 `master`；檢查完整歷史、工作樹（含未追蹤檔案）、遠端追蹤關係與 SHA；Push 前再次檢查。不得自動 commit、pull、merge、rebase、reset 或 force push。使用隔離 Git 情境測試，不以真實 Push 作為測試。
- **Production 狀態：**唯讀；嚴格驗證欄位及狀態組合；錯誤、缺檔或無法確認時回報未知／未確認。
- **Backup：**驗證目的地；拒絕符號連結、不存在或無權限路徑；驗證失敗時阻止操作；成功必須有唯一且符合預期的目標檔案證據。
- **備份產物唯讀檢查：**只允許固定備份目錄及命名格式；需用同目錄相鄰 `.sha256` sidecar 驗證外層 archive，bundle 內 `SHA256SUMS` 不得當作外層 checksum；sidecar 缺失、格式錯誤、目標未列入或重複列入、不可讀或 SHA-256 不符時不得 PASS；逾時、取消、結果格式無效或 SSH 清理失敗時不得回報 PASS。
- **Restore：**驗證備份路徑；保留警告、人工停止服務確認與精確 `RESTORE`；取消時不得執行遠端還原；取消、逾時及失敗不得顯示成功。
- **SSH／紀錄：**保留主機指紋及嚴格主機金鑰檢查、密碼清理、錯誤摘要和敏感資訊遮蔽。
- **按鈕與處理器：**未獲明確核准前，Deploy／Rebuild 維持停用；只有在程序確實停止且結果確認後，才能將取消或關閉流程報告為成功。

## 唯一下一步

**待使用者確認後，對 Restore 的取消與執行防護進行隔離 mock 測試。**

這是待核准的下一步，不代表本文件建立時已執行測試；不在此同時展開其他功能開發。

## 變更紀錄

| 日期 | 變更內容 | 實際修改檔案 | 驗收結果 | Checkpoint SHA |
|---|---|---|---|---|
| 2026-10-17 | 建立 Operations Center 正式進度基準；整理 checkpoint 與本次 Git 觀察、功能狀態、驗收層級、回歸防護及唯一下一步。 | `docs/OPERATIONS-CENTER-STATUS.md` | 文件內容與欄位檢查、行尾空白檢查通過；`git diff --check` 對既有差異通過。新文件的 `git diff --no-index --check` 無空白錯誤診斷（退出碼 1 表示新文件與空檔有差異）。 | 尚未建立 |
| 2026-10-17 | 新增備份產物唯讀檢查入口及隔離 Mock 測試。 | `tools/Pets-Operations-Center.ps1`、`testing/tests/operations-center-backup-artifact-check.test.js`、`docs/OPERATIONS-CENTER-STATUS.md` | PowerShell Parser 通過；備份產物、既有 Backup 及 Restore 專項測試共 3 suites／49 tests 通過；`git diff --check` 通過。未連線 Production。 | 未提交；基準 checkpoint 為 `745d7646777b4df94e082136863628a14ce98c24` |
| 2026-10-17 | 讓備份腳本發布外層 archive `.sha256` sidecar，並使唯讀檢查以該 sidecar 驗證 archive。 | `deploy/backup.sh`、`tools/Pets-Operations-Center.ps1`、`testing/tests/operations-center-backup-artifact-check.test.js`、`docs/OPERATIONS-CENTER-STATUS.md` | 隔離測試 17 項通過；PowerShell Parser 與 backup.sh Bash syntax 通過；本機生成命令 fixture 的正確 checksum 為 PASS、不符為 FAIL；`git diff --check` 通過。未執行 SSH 或 Production 操作。 | 未提交 |
