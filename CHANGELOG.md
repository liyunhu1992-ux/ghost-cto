# Changelog

All notable changes to **GhostCTO (影子 CTO)** are documented in this file.

## [2.0.0] - 2026-11-13 — Complete Open-Source Release
### Added
- **Zero-CLI Native Folder-Picker Installers (`双击安装到我的项目.command` & `.bat`)**: Non-technical founders can double-click to select any project folder via native macOS Finder / Windows Explorer dialogs, install across 8 AI tools, and auto-open the Cockpit without typing a single terminal path.
- **Dual-Mode Live Interactive Cockpit (`kernel/live-server.mjs`, `ghost-cto studio`, `打开实时驾驶舱.command/.bat`)**: Upgrades `老板全景驾驶舱.html` so it works 100% offline via `file://` AND supports 0-Token live browser actions (1-click re-audit, atomic Git+SQLite checkpoint creation, 1-click instant rewind, and live Chinese UI button blast-radius lookup) with localhost CSRF protection.
- **Git Pre-Commit Secret-Leak Guard (`ghost-cto precommit-check`)**: Automatically blocks accidental commits of `.env` files or hardcoded domestic/global secrets (OpenAI/DeepSeek `sk-`, Aliyun `LTAI`, Tencent Cloud `AKID`, AWS `AKIA`, GitHub tokens, Stripe live keys, and database password URIs).
- **Universal Modern & Domestic Stack Coverage**:
  - Next.js / Vite / Nuxt `@/...` and `~/...` path alias resolution & Next.js Pages Router (`pages/api/...`) support.
  - Vue 3 `.vue` & Svelte `.svelte` Single-File Component script/template extraction with exact 1-based line preservation.
  - Supabase (`.from().insert/select`), Drizzle ORM (`db.insert` / `pgTable` / `sqliteTable`), Mongoose, and Python SQLAlchemy / Django ORM persistence recognition.
  - WeChat Mini-Program / Uni-app / Taro (`wx.request`, `uni.request`, `Taro.request`) API call tracing.
- **Score History Delta & Shareable Readiness Report**: Tracks score progression (e.g. `+57 分`) and provides 1-click team/social readiness report copy.
- **Context-Injected Master Prompt Arsenal (`kernel/prompt-arsenal.mjs`) & `ui-anti-slop` Skill**: 8 battle-tested prompts inspired by KKKKhazix & Andrej Karpathy dynamically pre-filled with the project's real DB tables, ports, and static build guardrails at 0 idle tokens (`AGENTS.md` locked at `410 tokens`).

## [1.1.0] - 2026-11-13
- Added `String.raw` embedded JS unwrapping, Python FastAPI/Flask lexer, Chinese 2-gram fuzzy button search, non-destructive `mcp.json` merging, and `ghost-cto doctor` / `ghost-cto try`.
