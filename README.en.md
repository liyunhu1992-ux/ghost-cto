<div align="center">

<img src="./plugin/assets/logo.svg" width="84" height="84" alt="GhostCTO Logo" />

# GhostCTO (影子 CTO)

### **A 100% free, zero-dependency engineering guardrail that guides non-coders from `0` to `5` inside their AI chat box — generating real SQLite Web & WeChat Mini-Program apps, auto-migrating schemas without data loss, and blocking fake buttons or broken imports at 0 LLM tokens.**

[![Zero Dependencies](https://img.shields.io/badge/Dependencies-0_(Pure_Node_Built--ins)-059669?style=flat-square)](#)
[![Local Verifier](https://img.shields.io/badge/Verifier_Token_Cost-0_Tokens_(Local_Compiler_Gate)-2563EB?style=flat-square)](#)
[![Always-On Router](https://img.shields.io/badge/AGENTS.md_Footprint-412_Tokens_(KV_Cached)-7C3AED?style=flat-square)](#)
[![Tests](https://img.shields.io/badge/Adversarial_Tests-15%2F15_Passing-059669?style=flat-square)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT_(100%25_Free)-18181B?style=flat-square)](./LICENSE)

[**简体中文文档**](./README.md) ｜ [**Beginner Step-by-Step Guide (小白通关手册)**](./小白与AI对话全链路通关手册.md) ｜ [**Install Guide**](./INSTALL.md) ｜ [**Security Policy**](./SECURITY.md)

</div>

<p align="center">
  <img src="./docs/zero-to-five-flow.svg" width="100%" alt="GhostCTO 0-to-5 Vibe Coding Guard Flow" />
</p>

---

## What GhostCTO Deterministically Guarantees (Verified by 15 Automated & Adversarial Test Suites)

1. **Step `0 → 1` Three Production-Grade Chassis Modes (`kernel/idea-incubator.mjs`, `kernel/golden-scaffold.mjs`, `kernel/miniprogram-scaffold.mjs`)**:
   - **Mode A (`--audience self`)**: Personal zero-login responsive Web app backed by real `node:sqlite` (`WAL` mode), inline edit, debounce lock, two-step delete confirmation, and UTF-8 BOM CSV export (`100/100` audit score).
   - **Mode B (`--audience commercial`)**: Multi-account commercial system with `crypto.scryptSync` salted password hashing, `HttpOnly` sessions, `admin` vs `staff` `401/403` RBAC, `138****8801` phone masking, `audit_logs`, `.env.example`, and `Dockerfile`.
   - **Mode C (`--platform miniprogram`)**: Native WeChat Mini-Program client (`miniprogram/` with free `touristappid` & `urlCheck: false`) wired via real `wx.request` to the local SQLite server.
2. **Step `2 → 4` Lossless SQLite Auto-Migration, Blast-Radius Lock & Dual-Track Time Machine**:
   - Built-in `autoMigrateSqliteSchema` automatically runs safe `ALTER TABLE ADD COLUMN` whenever new columns are added to `SCHEMA_SQL`, preserving existing user rows without `no such column` crashes.
   - Atomic Git + SQLite (`.sqlite` + `-wal`) snapshots with SHA-256 verification and 1-second `rewind`.
3. **Step `5` Compiler/Linker/SQL Gate + IDE `Stop` Hook (`kernel/code-verifier.mjs`, `.vibe/ghost-hook-check.mjs`)**:
   - Catches JS/HTML/JSON syntax errors, **uninstalled npm packages (`UNINSTALLED_PACKAGE`), broken local imports (`BROKEN_LOCAL_IMPORT`), missing named ESM exports (`MISSING_NAMED_EXPORT`), SQL column typos (`SQL_COLUMN_MISMATCH`)**, 404 dead APIs, empty click handlers, fake client-only toasts, silent `catch {}`, plaintext passwords, and hardcoded cloud secrets (`.git/hooks/pre-commit`).

## Quick Start

```bash
git clone https://github.com/liyunhu1992-ux/ghost-cto.git
cd ghost-cto
npm test                                          # Run all 15 unit + adversarial E2E test suites
node bin/ghost-cto.mjs try                        # 1-second live sandbox self-trial
node bin/ghost-cto.mjs create "my-app"            # Create a clean starter workspace on Desktop
node bin/ghost-cto.mjs init /path/to/your-project # Install into an existing repository
```

## License

[MIT](./LICENSE) — 100% free and open-source forever.
