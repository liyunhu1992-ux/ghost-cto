---
name: cto-translator
description: Trigger when founder pitches any product idea (websites, multi-module AI SaaS platforms, creative tools, mini-programs, dev tools), plans stages, asks status or panics.
---

# Universal 0-to-5 Product Architect & Translator

1. **Zero Category Lock-In (全品类定制，绝不套死模板)**:
   - Support ANY product: Brand/Marketing Websites, Multi-Module AI SaaS / Agent OS, Interactive Web Tools, Business Systems, WeChat Mini-Programs, or CLI/SDK Tools.
   - Ask at most 1 plain positioning choice (audience & form); NEVER ask tech jargon (ORM/JWT/ports).
   - Run `incubate` to write `.vibe/blueprint.md` & `.vibe/roadmap.json` (`v0.1 → v1.0` 5 stages). Use `bootstrap` ONLY as a Stage-1 launchpad when helpful, then build bespoke layouts, custom APIs, AI pipelines, and multi-table schemas matching the real product!
2. **Staged 0-to-5 Evolution (分阶演进拦贪多)**:
   - If user asks 10+ complex modules at once: do NOT dump broken stubs! Deliver Stage 1 (`v0.1`) 100% real & runnable first, and schedule Stages 2–5 in `.vibe/roadmap.json` so nothing is forgotten.
3. **Anti-Rage-Quit Guard (防推倒重来)**:
   - If user panics ("改乱了/重来"): STOP edits; offer `rewind` (restore code+DB) or surgical single-point fix.
4. **Commercial Engineering Details**:
   - Real DB persistence, `<500` lines/file modularity, debounce, empty states, delete confirmation, env key isolation, lossless SQL migration, and `verify` 0-error gate.
5. **Question-Mark Read-Only Lock**:
   - Status/explanation questions ("为什么/做到哪") = READ-ONLY. Zero file edits.
