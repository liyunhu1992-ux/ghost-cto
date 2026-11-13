<div align="center">

<img src="./plugin/assets/logo.svg" width="88" height="88" alt="GhostCTO Logo" />

# GhostCTO (影子 CTO) v2.0

### **"Built so complete beginners can actually Vibe Code real, working software — without getting fooled by fake AI code."**

**Zero-CLI install across Tencent WorkBuddy, CodeBuddy, Doubao/Trae, Google Antigravity, Cursor, Claude Code, Windsurf, and OpenAI Codex.**  
**From an empty folder's very first plain-language idea to production launch — GhostCTO decides tech stacks for you, catches fake in-memory buttons at 0 tokens, blocks secret leaks before `git commit`, snapshots Code + SQLite atomically, and gives you a visual cockpit in plain human language.**

[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0_(Pure_Node_Built--ins)-059669?style=flat-square)](#)
[![Audit Token Cost](https://img.shields.io/badge/Audit_Token_Cost-0_Tokens_(Deterministic_Lexer)-2563EB?style=flat-square)](#)
[![Always-On Router](https://img.shields.io/badge/Router_Footprint-410_Tokens_(90%25_KV_Cached)-7C3AED?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-18181B?style=flat-square)](./LICENSE)

[**简体中文旗舰文档**](./README.md) ｜ [**Install Guide**](./INSTALL.md) ｜ [**Security Policy**](./SECURITY.md) ｜ [**Changelog**](./CHANGELOG.md)

</div>

<p align="center">
  <img src="./docs/live-cockpit-demo.svg" width="100%" alt="GhostCTO 15s Live Cockpit Demo" />
</p>

---

## Why GhostCTO?

Existing agent skill repositories (`superpowers`, `gstack`, `OpenSpec`, `aislop`) are built **by software engineers, for software engineers** — assuming you understand Git worktrees, TDD mocks, and TypeScript AST jargon.

Non-technical founders building real commercial SaaS products hit completely different walls:
1. **Fake Persistence & Demo Shells**: AI mutates in-memory arrays or shows fake "Saved!" toasts without calling an API — customer data vanishes on refresh or server restart.
2. **Unprotected Admin Routes & Leaked Cloud Keys**: `/api/admin/*` routes shipped before auth middleware; OpenAI `sk-`, Aliyun `LTAI`, Tencent `AKID`, AWS `AKIA`, or DB password URIs accidentally committed to Git.
3. **Whack-a-Mole Regressions**: Asking to tweak one button breaks login because the agent edits 9 unrelated files or forgets to rebuild static `dist/` bundles.
4. **Cross-IDE Amnesia**: Switching between Cursor, Antigravity, Claude Code, Tencent WorkBuddy, or ByteDance Trae wipes project context.

## Core Architecture (Zero Runtime Dependencies, Node >= 18)

<p align="center">
  <img src="./docs/architecture.svg" width="100%" alt="GhostCTO Architecture" />
</p>

1. **`kernel/lexer.mjs` & `kernel/scanner.mjs`**: Single-pass `O(N)` polyglot finite-state lexer for JS/JSX/TS/TSX, Vue 3 `.vue`, Svelte `.svelte`, HTML `<script>`, `String.raw` embedded scripts, and Python — preserving exact 1-based line offsets.
2. **`kernel/lineage-graph.mjs`**: 3D Full-Stack Reconciler tracing `Frontend fetch / axios / wx.request / uni.request` -> `Node HTTP / Express / Next.js App & Pages Router / Python FastAPI & Flask` -> `Multi-hop Monorepo & @/ Path Alias Functions` -> `SQLite / Supabase / Prisma / Drizzle / Mongoose / SQLAlchemy Tables & Outbound LLM Calls`.
3. **`kernel/reality-audit.mjs` + Pre-Commit Secret Blocker**: Deterministic forensic & pre-launch scanner (`DEMO_SHELL_NO_DATABASE`, `FAKE_CLIENT_ONLY_SAVE`, `UNPROTECTED_ADMIN_API`, `VOLATILE_MEMORY_DB`, `BROKEN_API_CONTRACT`, `SILENT_CATCH`, `STALE_STATIC_DIST`, `HARDCODED_SECRET`, `ZOMBIE_UNMOUNTED_FILES`) plus automatic `.git/hooks/pre-commit` leak interception.
4. **`kernel/blast-radius.mjs`**: Bidirectional module/API/table dependency calculator supporting fuzzy localized UI button text lookup at 0 LLM tokens.
5. **`kernel/time-capsule.mjs`**: Dual-track Git + SQLite (including `-wal` write-ahead logs) gzipped SHA-256 atomic checkpoint & rewind engine with automatic pre-rewind rescue backups.
6. **`kernel/prompt-arsenal.mjs`**: 8 battle-tested Master Prompts (distilled from KKKKhazix, Andrej Karpathy's 4 Simplicity Laws, and Linear/Stripe Anti-AI-Slop UI) dynamically injected with the target repo's real DB tables, ports, and build commands at 0 idle tokens.
7. **`kernel/boss-dashboard.mjs` + `kernel/live-server.mjs` + `kernel/mcp-server.mjs`**: Dual-mode Offline `file://` + Live `127.0.0.1` 0-Token Interactive Cockpit (`ghost-cto studio`), OS-native folder-picker installers, and dual-framing Stdio JSON-RPC 2.0 MCP Server (7 tools).

## Quick Start

- **Zero-CLI Native Folder Picker**: Double-click `双击安装到我的项目.command` (macOS) or `双击安装到我的项目.bat` (Windows) and pick your project folder!
- **CLI**:
  ```bash
  npx ghost-cto try
  npx ghost-cto init /path/to/your-project
  npx ghost-cto studio /path/to/your-project
  npm test
  ```

## License

[MIT](./LICENSE)
