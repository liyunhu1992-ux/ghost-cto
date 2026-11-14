<div align="center">

<img src="./plugin/assets/logo.svg" width="84" height="84" alt="GhostCTO Logo" />

# GhostCTO (影子 CTO)

### **A zero-dependency engineering guardrail that guides non-coders from `0` to `5` inside their AI chat box — catching fake buttons, locking edit blast radius, and snapshotting Code + SQLite atomically.**

[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0_(Pure_Node_Built--ins)-059669?style=flat-square)](#)
[![Local Verifier](https://img.shields.io/badge/Verifier_Token_Cost-0_Tokens_(Local_Compiler_Gate)-2563EB?style=flat-square)](#)
[![Always-On Router](https://img.shields.io/badge/AGENTS.md_Footprint-411_Tokens_(KV_Cached)-7C3AED?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-18181B?style=flat-square)](./LICENSE)

[**简体中文文档**](./README.md) ｜ [**Beginner Step-by-Step Guide (小白通关手册)**](./小白与AI对话全链路通关手册.md) ｜ [**Install Guide**](./INSTALL.md) ｜ [**Security Policy**](./SECURITY.md)

</div>

<p align="center">
  <img src="./docs/zero-to-five-flow.svg" width="100%" alt="GhostCTO 0-to-5 Vibe Coding Guard Flow" />
</p>

---

## What GhostCTO Actually Does (Verified by 13 End-to-End & Adversarial Test Suites)

Most AI coding toolkits assume the user is already a software engineer comfortable with Git branches, AST jargon, and debugging silent frontend mocks. When complete beginners try to build real software with AI, they hit very specific failure modes:
1. **Sprawl & Fake Persistence**: Asking for 15 features at once produces pretty buttons wired to empty `() => {}` handlers, client-only fake "Saved!" toasts, or volatile in-memory arrays that wipe data on restart.
2. **Missing Pro-Team Foundations**: Beginners don't know to ask for `scrypt` salted password hashing, HttpOnly session cookies, Admin vs Staff RBAC, phone-number privacy masking, button debounce, two-step delete confirmation, or UTF-8 BOM CSV export.
3. **Whack-a-Mole Regressions & Rage-Quitting**: Tweaking one label breaks login because the agent edits unrelated files — pushing beginners to abandon the folder and start over from scratch.

GhostCTO solves this deterministically using **pure Node.js built-ins (`>= 18`, 0 npm packages)**:
- **Step `0 → 1` Dual-Mode Pro Chassis (`kernel/idea-incubator.mjs`, `kernel/golden-scaffold.mjs`)**: Coaches the user in plain language to pick **Mode A (Personal Self-Use, no login)** or **Mode B (Commercial Multi-Account with `crypto.scryptSync` password hashing, Admin/Staff RBAC, `138****8801` phone masking, operation `audit_logs`, and `Dockerfile`)** — both backed by real `node:sqlite` (`WAL` mode) + inline edit + debounce + two-step delete confirmation + UTF-8 BOM CSV export, scoring `100/100` out of the box.
- **Step `2 → 4` Blast-Radius Lock & Dual-Track Time Machine (`kernel/blast-radius.mjs`, `kernel/time-capsule.mjs`)**: Maps localized UI button labels to exact source files (`<= 3` files) and snapshots Git code + SQLite (`.sqlite` + `-wal`) with SHA-256 verification for 1-second atomic rewind.
- **Step `5` 0-Token Compiler & Reality Verifier (`kernel/code-verifier.mjs`, `kernel/reality-audit.mjs`, `kernel/lineage-graph.mjs`)**: Blocks JS syntax errors, HTML `<script>` syntax errors, broken JSON, 404 dead API contracts, volatile memory DBs, empty `onClick` handlers, fake client-only save toasts, silent `catch {}`, unprotected `/api/admin/*` routes, plaintext passwords, and hardcoded cloud/LLM API keys (`.git/hooks/pre-commit`).

<p align="center">
  <img src="./docs/architecture.svg" width="100%" alt="GhostCTO Architecture" />
</p>

## Quick Start

1. **Zero-CLI Native Launchers** (after downloading & unzipping this repository):
   - **Start a brand-new project**: Double-click `1-双击新建我的空白项目.command` (macOS) or `1-双击新建我的空白项目.bat` (Windows) -> creates a clean workspace on your Desktop with all 8 IDE rules & offline MCP pre-wired.
   - **Protect an existing project**: Double-click `2-双击接入已有老项目.command` (macOS) or `2-双击接入已有老项目.bat` (Windows).
2. **CLI**:
   ```bash
   git clone https://github.com/liyunhu1992-ux/ghost-cto.git
   cd ghost-cto
   npm test                                          # Run all 13 unit + adversarial E2E test suites
   node bin/ghost-cto.mjs try                        # 1-second live sandbox self-trial
   node bin/ghost-cto.mjs create "my-app"            # Create a clean starter workspace on Desktop
   node bin/ghost-cto.mjs init /path/to/your-project # Install into an existing repository
   ```

## Honest Engineering Boundaries

- **Deterministic Local Code vs LLM Compliance**: Syntax verification (`verify`), lineage auditing (`audit`), secret-leak `pre-commit` blocking, Mode A/B scaffolding (`bootstrap`), and Git+SQLite rewind (`rewind`) are 100% deterministic local Node.js code. Prompt-level behaviors (such as asking A/B first) rely on IDE rules (`AGENTS.md` + `.vibe/engine` CLI fallback), with `verify` and `vibe-shield.js` catching model slip-ups.
- **Target Form Factor**: The built-in golden scaffold generates responsive Desktop + Mobile Web full-stack applications (`node:http` + `node:sqlite`). While the static lineage scanner also supports Next.js, Vue, Python FastAPI/Flask, and WeChat Mini-Program `wx.request` auditing, native App Store / WeChat Mini-Program packaging and merchant payment certificates still require platform-specific developer accounts.

## License

[MIT](./LICENSE)
