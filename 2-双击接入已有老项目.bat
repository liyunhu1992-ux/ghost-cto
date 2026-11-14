@echo off
chcp 65001 >nul
setlocal
set "SCRIPT_DIR=%~dp0"

echo ========================================================
echo [GhostCTO] 欢迎使用影子 CTO 老项目保护接入向导
echo 请在弹出的窗口中，选择您已有的项目文件夹...
echo ========================================================

where node >nul 2>&1
if errorlevel 1 (
  echo [环境提示] 尚未检测到免费的底层运行环境 Node.js（装一次终身可用）。
  echo 正在为您打开 Node.js 中文官网，请下载左侧 LTS 版本安装后再双击本文件！
  start "" "https://nodejs.org/zh-cn"
  pause
  exit /b 1
)

for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = '请选择您已有的业务项目文件夹'; if ($f.ShowDialog() -eq 'OK') { $f.SelectedPath }"`) do set "TARGET_DIR=%%I"

if "%TARGET_DIR%"=="" (
  echo 已取消文件夹选择，未做任何修改。
  pause
  exit /b 0
)

node "%SCRIPT_DIR%bin\ghost-cto.mjs" init "%TARGET_DIR%"
node "%SCRIPT_DIR%bin\ghost-cto.mjs" doctor "%TARGET_DIR%"

echo.
echo 接入完成！现在用 WorkBuddy / 豆包 / Trae / Antigravity / Cursor 打开该项目即可！
pause
