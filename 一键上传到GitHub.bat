@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ========================================================
echo 🚀 GhostCTO（影子 CTO）v2.0.0 一键开源发布到 GitHub 向导
echo ========================================================

for /f "delims=" %%i in ('git remote get-url origin 2^>nul') do set EXISTING_URL=%%i
if "%EXISTING_URL%"=="" set EXISTING_URL=https://github.com/你的用户名/ghost-cto

for /f "usebackq delims=" %%I in (`powershell -NoProfile -Sta -Command "Add-Type -AssemblyName Microsoft.VisualBasic; [Microsoft.VisualBasic.Interaction]::InputBox('第1步：浏览器打开 github.com/new 新建公开仓库（名字填 ghost-cto，不勾选 Add README）。`n`n第2步：把仓库网址粘贴在下方点确定：', '一键发布 GhostCTO 到 GitHub', '%EXISTING_URL%')"`) do set "REPO_URL=%%I"

if "%REPO_URL%"=="" (
  echo ℹ️ 已取消发布。
  pause
  exit /b 0
)

echo %REPO_URL% | findstr /C:"你的用户名" >nul
if %errorlevel%==0 (
  echo ⚠️ 请把网址里的“你的用户名”替换成你真实的 GitHub 仓库地址。
  pause
  exit /b 0
)

git remote get-url origin >nul 2>&1
if %errorlevel%==0 (
  git remote set-url origin "%REPO_URL%"
) else (
  git remote add origin "%REPO_URL%"
)

git branch -M main
git tag -f v2.0.0

echo.
echo 📤 正在推送源码与 v2.0.0 标签到 %REPO_URL% ...
git push -u origin main --tags
if %errorlevel%==0 (
  echo.
  echo 🎉 恭喜！GhostCTO v2.0.0 已成功开源上线！
  start "" "%REPO_URL:.git=%"
) else (
  echo.
  echo ⚠️ 推送未成功：请确认已登录 GitHub，且新建仓库时未勾选 Add README。
)
pause
