# 参与贡献（Contributing）

欢迎一起把 **GhostCTO（影子 CTO）** 打磨成全球非技术创始人最顺手的产品护航工具。

## 开发红线（提交 PR 前必查）

1. **保持零第三方依赖**：`package.json` 中严禁引入外部 `dependencies`，所有词法分析、路由追踪、数据库快照与 MCP 通信均使用 Node.js `>=18` 原生模块实现。
2. **严守 Token 预算门禁**：
   - 常驻路由 `plugin/rules/AGENTS.md` 必须严格 `< 420 tokens` 且保持字节级静态（以触发大模型 90% KV Prefix Cache 折扣）。
   - 每个按需技能 `plugin/skills/*/SKILL.md` 必须严格 `< 500 tokens`。
   - 跨软件记忆胶囊 `.vibe/capsule.md` 必须严格 `< 350 tokens`。
3. **坚持纯白话中文输出**：面向老板的体检报告与驾驶舱文案严禁堆砌未解释的缩写术语，每一条隐患必须说清「对生意的实际影响」并附带可一键复制的精准修复指令。

## 本地验证命令

```bash
# 1. 运行全部单元与跨进程端到端测试
npm test

# 2. 检查 Token 预算门禁
npm run budget

# 3. 运行 1 秒全链路沙箱自检演练
npm run try
```
