@echo off
chcp 65001 >nul
setlocal
set "SCRIPT_DIR=%~dp0"

echo ========================================================
echo [GhostCTO] 欢迎使用影子 CTO 零代码双击安装向导
echo 请在弹出的窗口中，选择您要保护的项目文件夹...
echo ========================================================

for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.Description = '请选择您要安装【影子 CTO】的项目文件夹'; if ($f.ShowDialog() -eq 'OK') { $f.SelectedPath }"`) do set "TARGET_DIR=%%I"

if "%TARGET_DIR%"=="" (
  echo 已取消文件夹选择，未做任何修改。
  pause
  exit /b 0
)

node "%SCRIPT_DIR%bin\ghost-cto.mjs" init "%TARGET_DIR%"
node "%SCRIPT_DIR%bin\ghost-cto.mjs" doctor "%TARGET_DIR%"

if exist "%TARGET_DIR%\老板全景驾驶舱.html" (
  start "" "%TARGET_DIR%\老板全景驾驶舱.html"
)

echo.
echo 安装完成！您现在可以用 WorkBuddy / 豆包 / Trae / Antigravity / Cursor 打开该项目了！
pause
