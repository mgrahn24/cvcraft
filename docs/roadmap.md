# Blitz — Product Roadmap

Organised by dependency and effort. Fix bugs first, build foundation second, then improve the edit loop, then tackle the big architectural changes.

---

## Tier 1 — Bug Fixes (Current Quality)

These affect what ships today and should be fixed before any new features.

| ID | Item | Notes |
|----|------|-------|
| ~~1A~~ | ~~**Broken images**~~ | ✅ Done. Decorative images use `picsum.photos/seed/…`; user-specific images use `placehold.co` + `data-blitz-upload` with a click-to-upload / hover-to-replace overlay in the editor. |
| 1B | **Interactive content not always functioning** | Alpine.js components injected via `innerHTML` after page load are not always picked up by Alpine's MutationObserver. Fix: call `Alpine.initTree(el)` explicitly after every `innerHTML` assignment in `canvasManager.ts`. (Already partially in place — verify timing edge cases.) |
| ~~1C~~ | ~~**Use an icon library instead of LLM-drawn SVGs**~~ | ✅ Done. Lucide loaded via CDN; `canvasManager` calls `lucide.createIcons()` after every DOM update; prompt now instructs the LLM to use `<i data-lucide="…">` with a curated name list instead of drawing SVG paths. |

---

## Tier 2 — Foundation (Unlocks Many Other Features)

Nothing else scales without these.

| ID | Item | Dependencies | Notes |
|----|------|-------------|-------|
| ~~2A~~ | ~~**Local storage persistence**~~ | — | ✅ Done. `lib/utils/storage.ts` auto-saves `PageState` to `blitz-autosave` on every change; `EditorLayout` restores on mount. |
| ~~2B~~ | ~~**Save / load / export**~~ | ~~2A~~ | ✅ Done. Named saves in `blitz-saves` (localStorage). Save/Load/Export buttons in TopBar each open a centred modal. Export downloads a self-contained HTML file with DaisyUI + Tailwind + Alpine.js + Lucide CDN links inlined. JSON export omitted by user request. |
| 2C | **Preview mode** | — | Route or toggle that hides all editor chrome and renders the canvas full-width. Useful for client demos. Could be `/preview` route or a keyboard shortcut. |

---

## Tier 3 — Editor Experience (High Value, Moderate Effort)

Improve the core edit loop without needing architectural changes.

| ID | Item | Notes |
|----|------|-------|
| ~~3A~~ | ~~**Direct inline text editing**~~ | ✅ Done. Double-click any text node to enter `contenteditable` mode; commit on blur or Enter (headings); cancel with Escape; `pushHistory()` called on change. Icon click opens Lucide picker. |
| 3B | **Quick actions panel on selection** | Floating toolbar above the selection rect: Edit with AI, Duplicate, Move up/down, Delete. Already have selection rects — just needs a positioned React component. |
| 3C | **LLM uses full page context when updating** | When `/api/update` is called with a selection, pass all other components as read-only context. Small prompt + payload change with meaningful quality improvement for coherent edits. |

---

## Tier 4 — Architecture / Platform (Higher Effort)

These require deliberate design decisions before starting.

| ID | Item | Dependencies | Notes |
|----|------|-------------|-------|
| 4A | **Flexible layout model** (side-by-side / nested) | — | Current `Component.html` is a full-width block. Needs a column/grid slot concept — significant change to `PageState` and generation prompts. Tackle before multi-page. |
| 4B | **Multiple pages** | 2A, 2B, 4A | `PageState[]` in store + router/tab switcher + shared theme. Navigation between pages needs to be generated or manually configured. |
| 4C | **Data / file upload in generated sites** | 2A | For generated apps that need data (CSV upload, JSON input). Alpine.js `fetch` or embedded JSON works for light cases. Heavier use needs a backend. |
| 4D | **Sharing / published sites** | 2B | Start with "export to HTML file". Hosted sharing needs a backend (Vercel Blob, Supabase, etc.). Could offer a sharable URL that loads a saved JSON from a key-value store. |

---

## Suggested Execution Order

```
1B → 1C → 1A   fix bugs (1A partly done, 1B & 1C independent)
2A → 2B → 2C   foundation (sequential — 2B needs 2A; 2C is standalone but useful alongside 2B)
3A  3B  3C      editor UX (mostly parallel, no inter-dependencies)
4A → 4B         architecture (4A must precede 4B)
4C  4D          platform (parallel, both need 2A/2B)
```

---

## Deferred / Needs More Scoping

- **User accounts / auth** — not needed until sharing (4D) requires identity.
- **Collaborative editing** — long-term; needs a real backend and OT/CRDT strategy.
