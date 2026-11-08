# 寵物3.0管理中心（本機網頁版）

## 啟動與停止

在 Windows 檔案總管中雙擊「啟動管理中心.bat」。服務只監聽本機 `127.0.0.1:4173`，啟動成功後會嘗試開啟預設瀏覽器。若瀏覽器沒有自動開啟，請前往 http://127.0.0.1:4173/。

關閉啟動時的命令視窗即可停止本機服務。若連接埠 4173 已被占用，啟動視窗會顯示說明；請先關閉占用該連接埠的程式。

## 功能

- **主機選擇與指紋信任**：MVP、PETS、PETS 2.0 有各自的 SSH 主機身分。新主機必須先在 Ubuntu 主控台核對 ED25519 SHA256 指紋；管理中心掃描到相符的公鑰後，才會寫入該 profile 專用的 `known_hosts`。MVP 沿用原本 Windows OpenSSH `known_hosts`，新主機不會覆蓋舊信任。
- **首次建置 Ubuntu**：只允許 PETS / PETS 2.0 profile。透過已核對的 SSH 金鑰將初始化腳本送入 Ubuntu，安裝 Node.js 24、Git、MySQL、Nginx，建立空白資料庫、專案服務及初始管理者，最後執行既有部署檢查。需要 Ubuntu 24.04、SSH 已啟用、`zhe` 帳號已授權管理端公鑰且具 sudo 權限。初始管理者密碼只供首次 seed 使用，成功後會從 `.env` 移除；操作前須確認版本基準及 GitHub 讀取方式。
- **查看狀態**：顯示本機分支、版本及工作目錄狀態；選擇目標主機後，唯讀查詢其部署狀態。
- **建立備份**：使用既有 Production 備份腳本。確認前會告知腳本會清除超過 30 天的舊備份及 checksum；成功結果還會驗證新備份及 checksum。
- **更新網站**：使用既有 `deploy-production.ps1` 部署流程。保留分支、乾淨工作目錄及遠端預檢等限制，並在網頁逐步取得推送授權、部署確認、人工瀏覽器驗收及最終確認。
- **還原資料**：列出可用備份並限制檔名；執行前要求確認 backend 與 frontend 服務已停止，並兩度輸入 `RESTORE`。管理中心不會代為停止服務。
- **本機 Git 提交**：一次預覽並提交所有可提交的本機修改，不需逐檔勾選。敏感檔案不顯示差異、不納入提交，`.github` 路徑不會列出或納入提交。此功能只建立本機提交，不連線或上傳 GitHub；Production 部署仍要求工作目錄乾淨。

維運操作以 Production 為目標。網頁不保存密碼，服務端只有固定功能 API；Production 操作與本機 Git 寫入不可同時執行。Git 提交可能執行本機 hook 或檔案過濾設定。逾時或中斷而無法確認結果時，頁面會標示結果未確認，不會自動重試。服務只綁定 `127.0.0.1`，每次啟動產生新的本機請求權杖。

主機 profile 與已核對的指紋保存在 `%LOCALAPPDATA%\Pets-Operations-Center\hosts.json` 及各 profile 的 `known_hosts` 檔，不寫入 Git。新機指紋需先在 VM 主控台執行 `sudo ssh-keygen -lf /etc/ssh/ssh_host_ed25519_key.pub`，並輸入管理中心與主控台完全相同的 SHA256 值。掃描新主機金鑰時會優先使用 Git for Windows 的 `ssh-keyscan`（若已安裝），再使用 Windows OpenSSH 版本，以避開 Windows 內建掃描器與部分 Ubuntu SSH KEX 組合不相容的情形。連線參數使用專用 `known_hosts` 檔；若 Windows 使用者路徑含空格，管理中心會轉成短路徑再傳給 OpenSSH。新舊 VM 共用同一對外 IP 時，切換期間只能啟動其中一台；錯選 profile 會因主機金鑰不符而拒絕連線。

首次建置只處理主機環境與空白資料庫，不會備份或還原舊主機資料。建置成功後仍須完成瀏覽器驗收，再由既有部署流程確認成功。Ubuntu 初始安裝必須已啟用 SSH；若尚未安裝或開啟 SSH，需先透過 VM 主控台完成這一步。

**重要前置條件：**首次建置使用 NodeSource Node.js 24.x 與 Oracle MySQL 8.4 LTS 官方 APT 套件，並驗證安裝的 major version。MVP 已盤點為 Node.js 24.22.2、npm 11.19.1、MySQL 8.4.13、Nginx 1.24.0、Git 2.43.0；MySQL 8.4 LTS repository 目前提供 8.4.13，與 MVP 相符。GitHub Repository 目前為公開，首次建置會以無憑證 HTTPS 讀取；若日後改為 private，必須先設計唯讀認證方式，不能把個人存取權杖放進腳本或 `.env`。

**注意：**這些操作會觸及 Production。請先檢查操作摘要與確認畫面；還原會覆寫資料庫及合約 PDF。部署會遵守既有部署入口的人工授權與驗收關卡。部署要求本機位於 `master` 且工作目錄乾淨；變更未提交時會阻擋。

## 本機測試

在此目錄執行 Node.js 內建測試：`node --test`。測試應使用 mock 驗證流程，不連線 Production。
