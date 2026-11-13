---
name: time-machine
description: 当老板说“帮我存个档”、“备份一下”、“刚才改坏了”、“退回上一步”或准备做高风险改动前触发。执行代码与SQLite数据库双轨原子备份与恢复。
---

# 代码 + 数据库双轨原子时光机

1. **为什么普通 Git 回滚不够**：
   - 老板在本地录入了宝贵的门店、客户、套餐测试数据（存在 `.sqlite` / `.db` 及 `-wal` 文件中）。只回滚代码或误删库会导致客户数据全丢！
2. **存档标准动作**：
   - 调用 MCP `ghost_save_checkpoint`（或运行 `npx ghost-cto save "中文存档说明"`），同时锁定 Git 代码树与全部 SQLite 数据库快照（含 SHA-256 校验）。
3. **后悔药回退标准动作**：
   - 调用 MCP `ghost_rewind_checkpoint`（或运行 `npx ghost-cto rewind <编号或latest>`）。
   - 系统会自动先创建一份 `自动急救备份_回退前`，再原子恢复代码与数据库，并检查静态 `dist/` 是否同步，最后用大白话告知老板已安全回到哪个时间点。
