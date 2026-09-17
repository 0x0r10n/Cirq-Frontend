---
name: Screen-by-screen workspace styling
description: The connected app workspace is being restyled one route at a time.
---

Connected workspace visual changes should be scoped to the active route instead of changing shared app styles globally.

**Why:** The redesign is intentionally being delivered screen by screen, so Scanner, Positions, and Settings must remain visually stable while Agent Chat is updated.

**How to apply:** Add a route-specific layout class or similarly narrow selector for each completed screen. Expand the scope only when that screen is explicitly selected for redesign.