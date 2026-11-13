# 安全与隐私说明（Security Policy）

GhostCTO 专为非技术业务创始人设计，坚守三条安全底线：

1. **100% 本地离线运行，零数据外传**：
   - GhostCTO 内核仅使用 Node.js 官方内置标准库（`node:fs`、`node:path`、`node:crypto`、`node:zlib`、`node:child_process`），**没有任何第三方 npm 依赖**，杜绝供应链投毒风险。
   - 代码扫描、真假接口血缘穿透、SQLite 数据库备份全部在你的本机硬盘内完成，**不会发起任何联网请求**，你的商业源码与客户数据绝不离开本机。
2. **全程标准沙箱兼容（零越权英文弹窗）**：
   - 所有命令与内嵌离线引擎（`.vibe/engine/`）均在当前项目目录内闭环执行，不需要跨系统目录或申请管理员 root 权限。
3. **不覆盖已有配置、回退必留急救档**：
   - 安装时若你的 `.cursor/mcp.json` 或 `.workbuddy/mcp.json` 已有其他 MCP 工具（如 Figma、Mobbin），GhostCTO 只会增量合并写入 `ghost-cto` 节点，绝不覆盖你原有的工具配置。
   - 执行 `ghost-cto rewind` 时光机回退前，系统会强制先为当前现场拍一张 `自动急救备份` 快照，并对 SQLite 与 `-wal` 文件执行 SHA-256 完整性校验，确保任何情况下都不会误删客户数据。
