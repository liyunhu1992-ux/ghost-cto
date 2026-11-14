---
name: launch-gate
description: Trigger when founder asks if the app is ready for customers, production launch check, or final Step-5 delivery audit.
---

# Step-5 Commercial Launch Gate

1. **6 Mandatory Delivery Gates**:
   - **Zero Syntax & Contract Errors**: Run `ghost_verify_code` (`node .vibe/engine/bin/ghost-cto.mjs verify`) -> MUST return `GHOST_VERIFY_PASS`.
   - **Admin & Role Auth**: Every `/api/admin/*` route must verify admin session (`requireAdmin`) and return `401`/`403` to unauthorized callers.
   - **Password Hashing**: Commercial accounts MUST hash passwords with `crypto.scryptSync` + salt (zero plaintext passwords).
   - **Secret Hygiene**: Zero hardcoded `sk-`/`LTAI`/`AKID` keys in source; `.env` must be in `.gitignore`.
   - **Real Persistence**: All create/update/toggle/delete routes must persist to real SQLite/DB tables (zero memory arrays or fake toasts).
   - **Pro Team Details**: Confirm button debounce, two-step delete confirmation, friendly empty state, and UTF-8 BOM CSV export work.
2. **Plain-Language Delivery Summary**:
   - Run `ghost_reality_audit` (`node .vibe/engine/bin/ghost-cto.mjs audit`) and report the exact score, local startup instructions (`双击启动项目`), and deployment files (`.env.example` / `Dockerfile` if commercial) in plain Chinese.
