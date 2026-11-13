---
name: ui-anti-slop
description: Trigger when founder asks to redesign, polish, or fix ugly/"AI-looking" UI or robotic copy ("美化", "太丑", "一股AI味", "改高级点", "改文案"). Enforces Linear/Stripe restraint and bans fake data or broken API bindings.
---

# Anti-AI-Slop UI & Plain Copy Discipline

1. **Banned "AI Slop" Blacklist (绝对禁区)**:
   - **No Neon Slop**: Ban generic purple-to-blue radial glows, floating blobs, rainbow gradient headings.
   - **No Card Soup & Emoji Clutter**: Ban lazy 3-column identical white card grids, raw emoji icons as primary UI chrome, and meaningless `✨ AI v2.0` pill badges.
   - **No Fake Metrics**: NEVER invent fake numbers (`50,000+ 企业`, `+47% 转化`). Bind to real DB stats or show clean empty states.
   - **No AI Buzzwords (去机器味)**: Ban "赋能、抓手、闭环、生态矩阵、智能中枢". Write crisp, actionable human Chinese on buttons and empty states.
2. **Commercial High-Taste Craft (Linear / Stripe Standard)**:
   - Crisp `1px` subtle borders, calm matte surfaces, disciplined single accent color, `font-variant-numeric: tabular-nums` on all prices/counts, and complete `hover`/`active`/`loading`/`empty` states.
3. **Zero Backend Regression**:
   - Preserve ALL existing `fetch` calls, auth headers, and DB bindings; rebuild static `dist/`/`public/` immediately after styling edits.
