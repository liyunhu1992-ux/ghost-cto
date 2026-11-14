---
name: time-machine
description: 当用户说“存个档”、“备份一下”、“改崩了”、“退回刚才”或准备做高风险修改前触发。执行代码与SQLite双轨原子备份与恢复。
---

# 代码 + SQLite 双轨原子时光机

1. **为什么普通 Git 回滚不够**：
   - 用户本地录入了重要的客户与订单数据（存在 `.sqlite` / `.db` 及 `-wal` 中），只回滚代码或删库会导致数据全丢。
2. **存档标准动作**：
   - 调用 `ghost_save_checkpoint`（或执行 `node .vibe/engine/bin/ghost-cto.mjs save "说明"`），同时锁定 Git 代码与全部 SQLite 快照（含 SHA-256 校验）。
3. **后悔药回退标准动作**：
   - 调用 `ghost_rewind_checkpoint`（或执行 `node .vibe/engine/bin/ghost-cto.mjs rewind latest`）。
   - 系统会先自动留一份急救备份，再原子恢复代码与数据库，完成后用大白话告知已回到正常状态。
