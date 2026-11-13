---
name: surgical-guard
description: Trigger before editing existing UI, buttons, APIs, or database logic. Locks blast radius to prevent whack-a-mole regressions.
---

# Surgical Blast-Radius Guard

1. **Save -> Measure -> Cut**:
   - Call `ghost_save_checkpoint` before multi-file edits.
   - Call `ghost_blast_radius` with the user's Chinese UI label or module keyword to get `TARGETS`, `LOCKED_APIS`, and `REQUIRED_POST_BUILD`.
2. **Hard Boundaries**:
   - Edit ONLY `TARGETS` (stay within `max_edit_files`). Never reformat unrelated files.
   - Preserve all existing API response keys and DB columns (additive changes only).
   - If a file exceeds 550 lines, extract new UI sections into a separate component file.
3. **Static Build Sync**:
   - Always execute `REQUIRED_POST_BUILD` (`npm run build`) when static `dist/` is served so browser refresh shows changes immediately.
