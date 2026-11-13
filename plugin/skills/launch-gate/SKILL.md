---
name: launch-gate
description: Trigger when founder asks if the app is ready for customers, production launch check, or refreshing the visual Boss Dashboard.
---

# Pre-Launch Gate & Boss Cockpit

1. **5 Mandatory Commercial Gates**:
   - **Admin Auth**: Every `/api/admin/*` route must verify admin credentials and never leak plaintext LLM keys.
   - **Secret Hygiene**: Zero hardcoded `sk-...` keys in source; `.env` must be in `.gitignore`.
   - **Proxy Resilience**: Gateway `http.request` streams must attach `.on('error')`.
   - **Real Persistence**: All create/update/delete routes must persist to real DB tables.
   - **Password Hashing**: Hash user passwords (`crypto.scryptSync`) with backward-compatible login upgrade.
2. **Deliver Visual Cockpit**:
   - Call `ghost_boss_dashboard` (or `node .vibe/engine/bin/ghost-cto.mjs dashboard`) so the founder can double-click `老板全景驾驶舱.html` to review everything in plain Chinese.
