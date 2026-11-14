@echo off
chcp 65001 >nul
setlocal
set "SCRIPT_DIR=%~dp0"

echo ========================================================
echo [GhostCTO] 欢迎使用影子 CTO 零基础新项目创建向导
echo ========================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [环境提示] 尚未检测到免费的底层运行环境 Node.js（装一次终身可用）。
  echo 正在为您打开 Node.js 中文官网，请下载左侧 LTS 版本安装后再双击本文件！
  start "" "https://nodejs.org/zh-cn"
  pause
  exit /b 1
)

set /p PROJ_NAME=请给您的新作品起个名字（直接按回车默认叫“我的第一个AI小工具”）：
if "%PROJ_NAME%"=="" set "PROJ_NAME=我的第一个AI小工具"

set "DESKTOP_DIR=%USERPROFILE%\Desktop"
node "%SCRIPT_DIR%bin\ghost-cto.mjs" create "%PROJ_NAME%" --parent "%DESKTOP_DIR%"
node "%SCRIPT_DIR%bin\ghost-cto.mjs" doctor "%DESKTOP_DIR%\%PROJ_NAME%"

explorer "%DESKTOP_DIR%\%PROJ_NAME%"

echo.
echo ========================================================
echo [成功] 已在您的【桌面】建好干净新项目：%PROJ_NAME%
echo 下一步（完全免费·无需背任何复杂提示词）：
echo   1. 打开 豆包 / Trae / 腾讯 WorkBuddy / Cursor
echo   2. 点击【打开文件夹】，选中桌面上的「%PROJ_NAME%」
echo   3. 在聊天框直接用大白话告诉 AI 你想做什么即可！
echo ========================================================
pause
