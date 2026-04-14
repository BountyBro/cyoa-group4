# AI Session Log — 2026-04-14

**Agent:** Claude Opus 4.6 (via Claude Code)
**Branch:** main
**Scope:** Close the remaining ToDo items on the static CYOA authoring tool, fix a Netlify build failure, and trim the project ToDo down to what's actually open.

This log covers a single working session that touched the static webapp, the ToDo and Codebase docs, and a handful of repo-hygiene fixes. It is intentionally a summary — the canonical record is the git history referenced by each commit hash.

---

## Turn 1 — Close the "Authoring tool — remaining gaps" section

**User:** "### Authoring tool — remaining gaps — go ahead and close these gaps"

Five gaps were listed in `ToDo.md`:
1. No choice-target validation while editing
2. `deletePage` leaves dangling choices behind
3. Mode switches drop unsaved edits silently
4. Graph isn't interactive
5. No undo / history

**Planning:** Entered plan mode, explored [webapp/static/app.js](webapp/static/app.js) to map line numbers for `renderChoices`, `updateCurrentPage`, `deletePage`, `storyToMermaid`, and the event wiring block. Wrote a consolidated plan covering all five fixes with shared helpers (`persist()`, `snapshot()`).

**Implementation (commit `1ca541f`):**
- **Validation:** `isValidTarget()` helper. `renderChoices` tags the target input with class `invalid` when the value isn't a known page ID. A new `choicesContainer` `input` listener toggles the class live while typing.
- **Dangling cleanup:** `deletePage` now strips every matching `target` from all other pages after the delete. Confirm dialog copy updated to show the exact choice-removal count.
- **Auto-save:** `persist()` helper wired to title/text/choice input listeners; `snapshot()` + `persist()` added at the start of every destructive action (`addPage`, `addChoice`, `deleteChoice`, `deletePage`, `handleUploadFile`). The manual Save button stays as an explicit graph-refresh affordance.
- **Clickable graph:** `storyToMermaid` emits `click <id> call selectPageFromGraph("<page.id>")` lines; `window.selectPageFromGraph` jumps to edit mode and selects the page. Mermaid is now initialized with `securityLevel: "loose"` (click handlers are disabled under the default `strict` level).
- **Undo:** 30-entry `undoStack` with `snapshot()` / `undo()` helpers, a new Undo button in the header, and a `Ctrl/Cmd+Z` keyboard handler that is suppressed while the focus is inside an input/textarea.

Files: [webapp/static/app.js](webapp/static/app.js), [webapp/static/index.html](webapp/static/index.html), [webapp/static/styles.css](webapp/static/styles.css).

---

## Turn 2 — "Update toDo and push to main"

- Fast-forwarded local `main` (remote had picked up `DilshanTranscript.md`).
- Struck through the five closed gaps in [ToDo.md](ToDo.md) with one-line notes describing how each was closed.
- Pushed `1ca541f`.

---

## Turn 3 — Reader / export priority

**User:** "Reader / export is your priority now. Keep it simple."

Added a one-click **Export Reader** button that downloads a self-contained `story-reader.html` with the story JSON and a minimal inline reader (render, choose, restart). No dependencies, no server, no build step — one HTML file the author can hand to a reader.

Implementation: `exportReader()` in [webapp/static/app.js](webapp/static/app.js) builds the HTML string with `<script>const STORY = ...;</script>` inlined (JSON-escaped so `</script>` and `-->` can't break out) plus a ~40-line inline reader. Hooked up via a new header button and a button click listener.

Commit `b037064`. ToDo updated to cross off "No standalone static-HTML export".

---

## Turn 4 — Close the Netlify regressions

**User:** "Regressions caused by the Netlify static refactor in todo is your priority now."

Four items were flagged:
1. Import CoT button was a stub alert
2. Orphaned backend code (`webapp/server.py`, `webapp/story_model.py`)
3. localStorage is single-browser
4. Starter story hardcoded as a JS constant

**Implementation (commit `cc56b7d`):**
- **Import CoT:** Ran `python3 scripts/import_to_authoring.py --output webapp/static/cot-example.json` to generate `cot-example.json` (111 pages, 35 decision pages, 42 endings). `importCoT()` rewritten to `confirm()`, `snapshot()`, `fetch("cot-example.json")`, and swap in the imported story.
- **Starter story:** `DEFAULT_STORY` constant removed. New `webapp/static/default-story.json` is fetched on first visit (`fetchStory()` is now `async`). A tiny inline `FALLBACK_STORY` is used only if the fetch fails.
- **Orphaned backend:** Deleted `webapp/server.py`, `webapp/story_model.py`, and every committed `__pycache__/*.pyc`. Kept [scripts/import_to_authoring.py](scripts/import_to_authoring.py) as a build-time tool and documented its role in [webapp/README.md](webapp/README.md).
- **localStorage single-browser:** Marked "no fix planned" in ToDo — the static-only deployment means there's no shared storage to plug in.
- Added a minimal `.gitignore` (`__pycache__/`, `*.pyc`).

---

## Turn 5 — "Clean up the ToDo list"

**User:** "I want you to clean up to do list - keep only what is actually necessary."

Overwrote `ToDo.md` with a short "Open" section and a "Deferred / won't-do" section. Removed the "What's Already Built" inventory (git history is authoritative) and every crossed-off line. Five open items left: Codebase.md update, duplicate `output/` trees, similar-endings detection, no tests, localStorage single-browser. Two explicit defers.

---

## Turn 6 — Netlify build failure

**User pasted:**
```
fatal: No url found for submodule path 'cyoa-group4' in .gitmodules
Failing build: Failed to prepare repo
```

**Root cause:** `cyoa-group4` was committed as a gitlink (mode `160000`, commit `d447ae0`) with no `.gitmodules` entry. Netlify's submodule-checkout step aborted before the build could start. Confirmed via `git ls-files --stage cyoa-group4`.

The webapp doesn't read `cyoa-group4/` at runtime (only [scripts/import_to_authoring.py](scripts/import_to_authoring.py) does, and only at build time to regenerate `cot-example.json` — which is already committed). Netlify has no reason to fetch it.

**Fix (commit `75ff10b`):**
- `git rm --cached cyoa-group4` to drop the gitlink without touching the local directory
- Added `cyoa-group4/` to [.gitignore](.gitignore)
- Added a one-line note in [webapp/README.md](webapp/README.md) that the pages dir is local-only

---

## Turn 7 — "Finish the ToDo list — do what you can without rewriting everything"

Tackled the simple remaining items:

- **Codebase.md update (commit `911cadf`):** Added a top-level note that the workspace has two parts (extraction pipeline and static webapp) and pointed at [webapp/README.md](webapp/README.md) and [netlify.toml](netlify.toml). Left the pipeline documentation untouched — it's still accurate.
- **Similar endings detection:** Added `findSimilarEndings()` to [webapp/static/app.js](webapp/static/app.js). Buckets terminal pages by the last 80 chars of their normalized text; any bucket with 2+ pages is a group. Rendered under the existing status notes as `Similar endings (N groups): id, id · id, id, id`.
- **Duplicate `output/` trees:** Already resolved implicitly in Turn 6 — the `cyoa-group4/` copy is now gitignored, leaving the root `output/` as the single tracked tree. Removed from ToDo.
- **Tests and localStorage:** Left as explicit "not doing this session" items. Tests need a harness decision; localStorage needs a backend.

Final ToDo is two lines of genuinely open work plus two explicit defers.

---

## Commit sequence

| Commit | Subject |
|--------|---------|
| `1ca541f` | Close authoring tool gaps: validation, cleanup, auto-save, graph clicks, undo |
| `b037064` | Add Export Reader: one-click self-contained HTML playthrough |
| `cc56b7d` | Close Netlify regressions: fix Import CoT, extract starter, drop orphan backend |
| `75ff10b` | Fix Netlify build: drop broken cyoa-group4 gitlink |
| `911cadf` | Close remaining ToDo items: docs, similar endings, trim list |

## Files touched this session

- [webapp/static/app.js](webapp/static/app.js) — the bulk of the feature work
- [webapp/static/index.html](webapp/static/index.html) — Undo and Export Reader buttons
- [webapp/static/styles.css](webapp/static/styles.css) — `.invalid` and disabled-button rules
- [webapp/static/default-story.json](webapp/static/default-story.json) — new, replaces the `DEFAULT_STORY` JS constant
- [webapp/static/cot-example.json](webapp/static/cot-example.json) — new, 111-page Cave of Time export
- [webapp/README.md](webapp/README.md) — rewritten feature list plus local-only `cyoa-group4/` note
- [Codebase.md](Codebase.md) — top note about the static webapp
- [ToDo.md](ToDo.md) — rewritten twice, now a short open-items list
- [.gitignore](.gitignore) — new, then extended with `cyoa-group4/`
- `webapp/server.py`, `webapp/story_model.py`, committed `__pycache__/` files — deleted
- `cyoa-group4` gitlink — unstaged
