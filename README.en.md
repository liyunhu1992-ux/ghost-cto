<div align="center">

<img src="./plugin/assets/logo.svg" width="88" height="88" alt="GhostCTO Logo" />

# GhostCTO (影子 CTO)

### **"A Zero-Token Product Reality Engine & Safety Harness for Non-Technical Vibe Coders."**

**One command installs across WorkBuddy, CodeBuddy, Doubao/Trae, Google Antigravity, Cursor, Claude Code, Windsurf, and Codex.**  
**Speak plain language — GhostCTO catches fake in-memory features, locks edit blast-radius, snapshots Code + SQLite atomically, and renders an offline visual Cockpit you can understand without reading code.**

[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0_(Pure_Node_Built--ins)-059669?style=flat-square)](#)
[![Audit Token Cost](https://img.shields.io/badge/Audit_Token_Cost-0_Tokens_(Deterministic_Lexer)-2563EB?style=flat-square)](#)
[![Always-On Router](https://img.shields.io/badge/Router_Footprint-387_Tokens_(90%25_KV_Cached)-7C3AED?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-18181B?style=flat-square)](./LICENSE)

[**简体中文旗舰文档**](./README.md)

</div>

---

## Why GhostCTO?

Existing agent skill repositories (`superpowers`, `gstack`, `OpenSpec`, `aislop`) are built **by software engineers, for software engineers** — assuming you understand Git worktrees, TDD mocks, and TypeScript AST smells.

Non-technical founders building real commercial SaaS products hit completely different walls:
1. **Fake Persistence**: AI mutates in-memory arrays instead of writing to real SQLite/Postgres tables — data vanishes on server restart.
2. **Unprotected Admin Routes & Leaked Keys**: `/api/admin/*` routes shipped before auth middleware; `http.request` proxies missing `.on('error')` crashing on socket resets.
3. **Whack-a-Mole Regressions**: Asking to tweak one button breaks login because the agent edits 9 unrelated files or forgets to rebuild static `dist/` bundles.
4. **Cross-IDE Amnesia**: Switching between Cursor, Antigravity, Claude Code, Tencent WorkBuddy, or ByteDance Trae wipes project context.

## Core Subsystems (Zero Runtime Dependencies, Node >= 18)

1. **`kernel/lexer.mjs`**: Single-pass O(N) finite-state JS/JSX/TS/TSX lexer stripping comments & string literals while preserving exact 1-based line offsets and template `${expr}` expressions.
2. **`kernel/lineage-graph.mjs`**: 3D Full-Stack Reconciler tracing `Frontend fetch/apiFetch` -> `Backend HTTP/Express/Next Routes` -> `Multi-hop Monorepo @scope/* Functions` -> `SQLite/ORM Tables & Outbound LLM Calls`.
3. **`kernel/reality-audit.mjs`**: 10-dimension deterministic forensic & pre-launch scanner (`UNPROTECTED_ADMIN_API`, `VOLATILE_MEMORY_DB`, `BROKEN_API_CONTRACT`, `UNSAFE_PROXY_STREAM`, `SILENT_CATCH`, `STALE_STATIC_DIST`, `HARDCODED_SECRET`, `FAKE_UI_HANDLER`, `PLAINTEXT_PASSWORD_DB`, `GOD_FILE_COMPLEXITY`).
4. **`kernel/blast-radius.mjs`**: Bidirectional module/API/table dependency calculator matching even localized UI button strings at 0 LLM tokens.
5. **`kernel/time-capsule.mjs`**: Dual-track Git + SQLite (including `-wal` write-ahead logs) gzipped SHA-256 atomic checkpoint & rewind engine with automatic pre-rewind rescue backups.
6. **`kernel/boss-dashboard.mjs` & `kernel/mcp-server.mjs`**: Standalone offline visual HTML Cockpit + self-healing OS launchers + dual-framing Stdio JSON-RPC 2.0 MCP Server.

## Quick Start

```bash
npx ghost-cto init /path/to/your-project
npm test
```

## License

MIT
