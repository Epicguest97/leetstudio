---
name: Design subagent partial completion
description: A DESIGN subagent given a large multi-page frontend brief may complete only the most complex/central pages fully and leave others as minimal WIP placeholders, self-reporting this in its completion message.
---

When delegating a full multi-page app build (8-10+ routes) to a DESIGN subagent in one task, expect it to prioritize the pages it judges most central (e.g. layout, nav, auth gate, list/browse views, live leaderboard) and may leave secondary pages (create/edit forms, detail views) as one-line `<Page> (WIP)` stubs wrapped in the right auth guard.

**Why:** The subagent explicitly cites a "single request limit" constraint and reports which pages it prioritized vs. stubbed in its completion message — this is a known, self-disclosed tradeoff, not a silent failure.

**How to apply:** After a large design subagent task completes, check file sizes/timestamps under the frontend's `pages/` (or equivalent) directory rather than trusting the summary alone. Files under ~200 bytes are a strong signal of an unfinished stub. Read the subagent's fully-built pages first to learn the established visual/data patterns (component imports, styling conventions, hook usage), then finish the stubbed pages yourself matching that style — don't re-delegate for small remaining pages.
