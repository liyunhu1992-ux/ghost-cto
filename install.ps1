param(
  [string]$TargetDir = (Get-Location).Path
)

$ErrorActionPreference = "Stop"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "🛡️ 正在将 GhostCTO（影子 CTO）安装到项目：$TargetDir"
node "$ScriptDir\bin\ghost-cto.mjs" init "$TargetDir"
node "$ScriptDir\bin\ghost-cto.mjs" doctor "$TargetDir"
