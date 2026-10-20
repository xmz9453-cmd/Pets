@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
if errorlevel 1 goto DirectoryError

where.exe node.exe >nul 2>nul
if errorlevel 1 goto NodeMissing

node.exe --version
if errorlevel 1 goto NodeFailed

node.exe -e "const { randomUUID } = require('node:crypto'); if (typeof randomUUID !== 'function') process.exit(1);" >nul 2>nul
if errorlevel 1 goto NodeTooOld

echo 正在啟動寵物3.0本機管理中心...
echo 服務啟動後會開啟瀏覽器。關閉此視窗即可停止服務。
echo.
node.exe "%~dp0server.js"
set "EXIT_CODE=%ERRORLEVEL%"
if not "%EXIT_CODE%"=="0" (
  echo.
  echo 服務已停止或未能啟動；請查看上方錯誤訊息。
  echo 程式結束代碼：%EXIT_CODE%
  pause
)
exit /b %EXIT_CODE%

:DirectoryError
echo 無法切換至管理中心資料夾：
echo "%~dp0"
echo 請確認資料夾仍存在，且目前帳號可以讀取。
echo.
pause
exit /b 1

:NodeMissing
echo 找不到 Node.js。請先安裝 Node.js，並確認 node.exe 已加入 PATH。
echo.
pause
exit /b 1

:NodeFailed
echo 找到 Node.js，但無法讀取版本。請修復 Node.js 安裝後再試。
echo.
pause
exit /b 1

:NodeTooOld
echo 目前的 Node.js 缺少管理中心需要的內建功能。
echo 請安裝較新的 Node.js 版本後再試。
echo.
pause
exit /b 1
