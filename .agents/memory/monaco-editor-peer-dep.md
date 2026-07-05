---
name: Monaco editor peer dependency
description: Installing @monaco-editor/react alone leaves a missing peer dependency that should be resolved explicitly.
---

`@monaco-editor/react` declares `monaco-editor` as a peer dependency (`>= 0.25.0 < 1`) but does not install it transitively in a way pnpm treats as satisfied in this workspace.

**Why:** Without it, `pnpm install` prints a "missing peer dependency" warning; TypeScript/Vite may still resolve at dev time via hoisting, but it's not guaranteed and should not be relied on.

**How to apply:** When adding `@monaco-editor/react` to a workspace package, also run `pnpm --filter <package> add monaco-editor` in the same step so the peer dependency is explicit and versioned in that package's `package.json`.
