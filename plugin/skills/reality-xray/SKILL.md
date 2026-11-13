---
name: reality-xray
description: Trigger on bug reports, dead buttons, data vanishing on restart, fake AI suspicions, or project health checks. Runs 0-token deterministic audit.
---

# 0-Token Reality & Lineage X-Ray

1. **Never Blind-Read Repo**:
   - Call MCP `ghost_reality_audit` or `ghost_xray_lineage` (or run `node .vibe/engine/bin/ghost-cto.mjs audit --ai`) to get exact `file:line` defects at 0 exploration tokens.
2. **5 Fake-Feature Traps to Eliminate**:
   - `VOLATILE_MEMORY_DB`: Mutating module arrays/Maps instead of SQLite/DB tables.
   - `SILENT_CATCH`: Empty `catch {}` swallowing API or LLM errors silently.
   - `BROKEN_API_CONTRACT`: Frontend `/api/*` call missing backend route.
   - `UNSAFE_PROXY_STREAM`: `http.request` proxy missing `.on('error')`.
   - `STALE_STATIC_DIST`: `src/` newer than served `dist/index.html`.
3. **Verify**: Re-run `ghost_reality_audit` after fixing and explain business impact in plain Chinese.
