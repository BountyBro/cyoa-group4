# ToDo

_Last reviewed against repo state at commit `dd1dba6` (post-Netlify refactor)._

## What's Already Built

### 1. Cave of Time extraction pipeline (done, stable)
Location: [cyoa-group4/](cyoa-group4/)

- [scripts/reextract_cot_ocr_split.py](cyoa-group4/scripts/reextract_cot_ocr_split.py) — OCR extracts the PDF's spread pages into per-story-page text
- [scripts/build_story_graph.py](cyoa-group4/scripts/build_story_graph.py) — parses "turn to page X" choices into a Mermaid graph
- [scripts/write_all_stories.py](cyoa-group4/scripts/write_all_stories.py) — enumerates bounded story paths (45 variants)
- [scripts/render_story_graph_svg.py](cyoa-group4/scripts/render_story_graph_svg.py) — renders the Mermaid graph to SVG
- Outputs in [cyoa-group4/output/](cyoa-group4/output/): `cot-pages-ocr-v2/` (125 pages), `cot-story-graph.mmd`, `cot-story-graph.svg`, `cot-stories/` (45 stories + manifest)

### 2. Web authoring tool — now 100% static (Netlify-ready)
Location: [webapp/static/](webapp/static/)

- **Stack**: Static site, no backend. Vanilla JS + Mermaid.js CDN. Deployable to Netlify via [netlify.toml](netlify.toml) (publishes `webapp/static`)
- **Persistence**: `localStorage` key `cyoa-authoring-story` (per-browser, per-device); plus JSON upload/download for portability
- **Data model** (in [webapp/static/app.js](webapp/static/app.js)): `Story { startPageId, pages: { id → { id, title, text, choices:[{label, target}] } } }`. Backend-equivalent logic is now client-side:
  - `storyToMermaid()` — generates Mermaid `flowchart LR` syntax
  - `computeStoryStatus()` — per-page orphan/terminal/branch/empty flags and aggregate counts
  - `generateStoryVariants()` + `renderPathText()` — DFS variant enumeration with cycle and max-decision limits
- **UI features**:
  - Edit mode with title/text/choices editor, add/delete choices
  - **Page deletion** — hover-revealed × button on each page item; warns about dangling incoming choices and reassigns `startPageId` when deleting the start page
  - **Reader mode** — click-through playthrough with back-to-start
  - **Page search** — live filter of the page list
  - **Upload / Download JSON** — import/export story files from the browser
  - **Generate Variants** button — downloads all bounded paths as `story-variants.json`
  - **Status panel** — live counts for terminal/branching/orphan/empty/unreachable
  - **Page badges** — Start / Terminal / Orphan / Branch / Empty flags next to each page
  - Live Mermaid graph preview

---

## What's Still Missing

### Regressions caused by the Netlify static refactor
- **Import CoT button is broken** — `importCoT()` in [webapp/static/app.js](webapp/static/app.js) now just shows an alert: "Import from the server is disabled in static mode. Use Upload Story to load a story JSON file instead." The Cave of Time example is no longer reachable from the UI. Fix: ship a pre-built `authoring-story.cot.json` inside `webapp/static/` and have the button `fetch()` it as a static asset
- **Orphaned backend code** — [webapp/server.py](webapp/server.py), [webapp/story_model.py](webapp/story_model.py), and [scripts/import_to_authoring.py](scripts/import_to_authoring.py) are no longer used by the deployed site. Either delete them or keep them as an optional local-dev fallback and document the split
- **localStorage is single-browser** — there is no longer any way to share an in-progress story across devices or browsers except manual Download/Upload JSON
- **Starter story is hardcoded in JS** — `DEFAULT_STORY` lives at the top of [webapp/static/app.js](webapp/static/app.js) instead of a JSON asset, so editing the starter requires a code change

### Authoring tool — remaining gaps
_All five items below were closed in [webapp/static/app.js](webapp/static/app.js), [webapp/static/index.html](webapp/static/index.html), and [webapp/static/styles.css](webapp/static/styles.css)._
- ~~**No choice-target validation while editing**~~ — target inputs get a red `.invalid` outline live when the value doesn't match an existing page ID
- ~~**Deleted pages leave dangling choices behind**~~ — `deletePage` now strips every matching `target` from all other pages and the confirm dialog shows the exact choice-removal count
- ~~**Mode switches drop unsaved edits silently**~~ — auto-save via `persist()` on every title/text/choice keystroke; Save button is now just an explicit graph refresh
- ~~**Graph isn't interactive**~~ — Mermaid `click` directives + `selectPageFromGraph` bridge jump the editor to the clicked page (requires `securityLevel: "loose"`, now initialized)
- ~~**No undo / history**~~ — 30-entry `undoStack`; `snapshot()` is taken before add/delete page, add/delete choice, and upload. Undo button in the header plus Ctrl/Cmd+Z

### Reader / export
- ~~**No standalone static-HTML export**~~ — `exportReader()` in [webapp/static/app.js](webapp/static/app.js) builds a self-contained `story-reader.html` with the story JSON + minimal inline CSS/JS baked in. Triggered by the "Export Reader" header button
- **No "similar endings" detection** — status counts terminals but doesn't cluster pages that end the same way

### Project hygiene
- **No tests anywhere** — neither the extraction pipeline nor the webapp has any automated tests
- **Duplicate `output/` trees** — both root `output/` and [cyoa-group4/output/](cyoa-group4/output/) hold identical `cot-pages-ocr-v2/` (125 files each) and graph/story artifacts. Now that the webapp is static and doesn't read them, these are pure source-data duplicates — pick one
- **No AI session log for webapp work** — Fork-Instructions asks contributors to keep chat logs like [AI-session-log-20260408950.json](AI-session-log-20260408950.json); nothing exists for the post-fork authoring-tool work
- **No CLAUDE.md / AGENTS.md** — conventions and run commands live only in [Codebase.md](Codebase.md) and [webapp/README.md](webapp/README.md)
- **`webapp/README.md` and [Codebase.md](Codebase.md) are out of sync with the refactor** — README was updated for static mode but Codebase.md still describes the old server workflow

---

## Suggested Next Priorities

1. **Fix the broken Import CoT button** — ship `cot-example.json` as a static asset and load it via `fetch()`; restores a one-click example without needing a server
2. **Decide on the orphaned backend** — either delete [webapp/server.py](webapp/server.py) + [webapp/story_model.py](webapp/story_model.py) + [scripts/import_to_authoring.py](scripts/import_to_authoring.py), or keep them as an opt-in local dev mode and document the two-track workflow
3. **Update [Codebase.md](Codebase.md)** to reflect static-only mode so the next contributor doesn't re-learn from stale notes
