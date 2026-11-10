# 寵物3.0管理中心（本機網頁版）

## 啟動與停止

在 Windows 檔案總管中雙擊「啟動管理中心.bat」。服務只監聽本機 `127.0.0.1:4173`，啟動成功後會嘗試開啟預設瀏覽器。若瀏覽器沒有自動開啟，請前往 http://127.0.0.1:4173/。

關閉啟動時的命令視窗即可停止本機服務。若連接埠 4173 已被占用，啟動視窗會顯示說明；請先關閉占用該連接埠的程式。

## 功能

- **Pets 主機選擇與設定**：管理中心專門管理 Pets 系統，提供 MVP、PETS、PETS 2.0 三個固定主機設定，不支援新增其他系統或自訂 Profile。可編輯名稱、IP／網域及網站網址，也可移除或還原預設主機設定；至少保留一個主機。移除只影響本機設定，不會操作 Ubuntu。若 IP／網域改變，原主機指紋信任會清除。部署帳號固定為 `zhe`，因 Pets 部署腳本和服務目錄仍以此帳號為基準。
- **主機指紋核對**：主機首次使用或連線位置變更後，必須先在 Ubuntu 主控台核對 ED25519 SHA256 指紋。管理中心掃描到相符的公鑰後，才會寫入該主機專用的 `known_hosts`；MVP 原有 Windows OpenSSH `known_hosts` 只在建立本機專用信任前作為相容性備援。
- **SSH 金鑰設定／輪替**：在所選且已信任的主機上，點選「設定／輪替 SSH 金鑰」並輸入 Ubuntu 帳號密碼。管理中心在 Windows 產生該主機專用的 ED25519 私鑰、限制私鑰檔案權限，透過已驗證指紋的 SSH 密碼連線將公鑰加入 Ubuntu，再測試新私鑰登入；確認成功後才切換 Windows 私鑰。私鑰不會傳到 Ubuntu，密碼不會寫入設定檔。新私鑰不設 passphrase，以配合非互動 SSH；請以 Windows 帳號權限及電腦本身安全措施保護私鑰，絕不可分享或貼到聊天。未輪替的主機仍使用舊版共用私鑰；如多個主機設定指向同一 IP／帳號，需逐一輪替，工具會在尚有設定沿用舊金鑰時暫緩撤銷 Ubuntu 上的舊公鑰。若舊公鑰無法確認移除，畫面會明確顯示警告。
- **首次建置 Ubuntu**：只允許 PETS / PETS 2.0 profile。透過已核對的 SSH 金鑰將初始化腳本送入 Ubuntu，安裝 Node.js 24、Git、MySQL、Nginx，建立空白資料庫、專案服務及初始管理者，最後執行既有部署檢查。需要 Ubuntu 24.04、SSH 已啟用、`zhe` 帳號已授權管理端公鑰且具 sudo 權限。初始管理者密碼只供首次 seed 使用，成功後會從 `.env` 移除；操作前須確認版本基準及 GitHub 讀取方式。
- **查看狀態**：顯示本機分支、版本及工作目錄狀態；選擇目標主機後，唯讀查詢其部署狀態。
- **建立備份**：使用既有 Production 備份腳本。確認前會告知腳本會清除超過 30 天的舊備份及 checksum；成功結果還會驗證新備份及 checksum。
- **更新網站**：使用既有 `deploy-production.ps1` 部署流程。保留分支、乾淨工作目錄及遠端預檢等限制，並在網頁逐步取得推送授權、部署確認、人工瀏覽器驗收及最終確認。
- **還原資料**：列出可用備份並限制檔名；執行前要求確認 backend 與 frontend 服務已停止，並兩度輸入 `RESTORE`。管理中心不會代為停止服務。
- **本機 Git 提交**：一次預覽並提交所有可提交的本機修改，不需逐檔勾選。敏感檔案不顯示差異、不納入提交，`.github` 路徑不會列出或納入提交。此功能只建立本機提交，不連線或上傳 GitHub；Production 部署仍要求工作目錄乾淨。

維運操作以 Production 為目標。網頁不保存密碼，服務端只有固定功能 API；Production 操作與本機 Git 寫入不可同時執行。Git 提交可能執行本機 hook 或檔案過濾設定。逾時或中斷而無法確認結果時，頁面會標示結果未確認，不會自動重試。服務只綁定 `127.0.0.1`，每次啟動產生新的本機請求權杖。

主機設定與已核對的指紋保存在 `%LOCALAPPDATA%\Pets-Operations-Center\hosts.json` 及各主機的 `known_hosts` 檔，不寫入 Git。指紋需在 Ubuntu 主控台執行 `sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`，並輸入管理中心與主控台完全相同的 SHA256 值。掃描主機金鑰時會優先使用 Git for Windows 的 `ssh-keyscan`（若已安裝），再使用 Windows OpenSSH 版本，以避開 Windows 內建掃描器與部分 Ubuntu SSH KEX 組合不相容的情形。若 Windows 使用者路徑含空格，管理中心會將 `known_hosts` 路徑轉成短路徑再傳給 OpenSSH。新舊 VM 共用同一對外 IP 時，切換期間只能啟動其中一台；錯選設定會因主機金鑰不符而拒絕連線。

### 全新 Ubuntu 首次連線

全新 Ubuntu 尚未接受管理中心的 SSH 公鑰時，請先透過 Ubuntu 本機螢幕／鍵盤或 VMware 主控台完成初始設定：

1. 安裝 Ubuntu 時建立登入帳號 `zhe`、設定密碼並保留 sudo 權限；現有 Pets 部署腳本固定使用此帳號與 `/home/zhe` 目錄，不能只在管理中心更改帳號來替代。
2. 以該帳號登入 Ubuntu 主控台，安裝並啟用 OpenSSH Server：

   ```bash
   sudo apt update
   sudo apt install -y openssh-server
   sudo systemctl enable --now ssh
   sudo systemctl status ssh
   ```

   若 Ubuntu 使用 UFW 防火牆且已啟用，允許 SSH：`sudo ufw allow OpenSSH`。也需確認 Windows 管理電腦可連到該主機的 TCP 22 埠。
3. 在 Ubuntu 主控台取得 ED25519 主機指紋：`sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`。回到管理中心選擇正確主機，按「核對／更新主機指紋」，輸入完全相同的 `SHA256:...` 值。指紋不符時不要信任。
4. 完成指紋信任後，按「設定／輪替 SSH 金鑰」。在彈出的密碼欄位輸入該 Ubuntu 帳號密碼。這是透過已核對主機指紋的一次性 SSH 密碼登入，用來安裝 Windows 新公鑰；管理中心不會保存密碼。

若 Ubuntu 尚未安裝／啟用 SSH、網路不通、密碼登入被停用或帳號無法登入，管理中心無法替一台完全不可登入的主機建立第一條連線；請先從 Ubuntu 主控台修復 SSH／網路／帳號，再重試。私鑰保留在 Windows 的 `%USERPROFILE%\.ssh`；每個主機完成輪替後會有自己的 `pets3_production-<主機ID>` 私鑰。舊版 `%USERPROFILE%\.ssh\pets3_production` 會在其他設定仍使用時保留，不要手動刪除，直到相關主機都完成輪替並驗證登入。

此管理中心、首次建置、部署、備份與還原皆為 Pets 專用功能，不提供 Car 或考勤等其他系統的部署流程。

首次建置只處理主機環境與空白資料庫，不會備份或還原舊主機資料。建置成功後仍須完成瀏覽器驗收，再由既有部署流程確認成功。Ubuntu 初始安裝必須已啟用 SSH；若尚未安裝或開啟 SSH，需先透過 VM 主控台完成這一步。

**重要前置條件：**首次建置使用 NodeSource Node.js 24.x 與 Oracle MySQL 8.4 LTS 官方 APT 套件，並驗證安裝的 major version。MVP 已盤點為 Node.js 24.22.2、npm 11.19.1、MySQL 8.4.13、Nginx 1.24.0、Git 2.43.0；MySQL 8.4 LTS repository 目前提供 8.4.13，與 MVP 相符。GitHub Repository 目前為公開，首次建置會以無憑證 HTTPS 讀取；若日後改為 private，必須先設計唯讀認證方式，不能把個人存取權杖放進腳本或 `.env`。

**注意：**這些操作會觸及 Production。請先檢查操作摘要與確認畫面；還原會覆寫資料庫及合約 PDF。部署會遵守既有部署入口的人工授權與驗收關卡。部署要求本機位於 `master` 且工作目錄乾淨；變更未提交時會阻擋。

## 本機測試

在此目錄執行 Node.js 內建測試：`node --test`。測試應使用 mock 驗證流程，不連線 Production。
