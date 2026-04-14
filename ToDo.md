# ToDo

_Last reviewed against repo state at commit `955982d` (post-pull from main)._

## What's Already Built

### 1. Cave of Time extraction pipeline (done, stable)
Location: [cyoa-group4/](cyoa-group4/)

- [scripts/reextract_cot_ocr_split.py](cyoa-group4/scripts/reextract_cot_ocr_split.py) — OCR extracts the PDF's spread pages into per-story-page text
- [scripts/build_story_graph.py](cyoa-group4/scripts/build_story_graph.py) — parses "turn to page X" choices into a Mermaid graph
- [scripts/write_all_stories.py](cyoa-group4/scripts/write_all_stories.py) — enumerates bounded story paths (45 variants)
- [scripts/render_story_graph_svg.py](cyoa-group4/scripts/render_story_graph_svg.py) — renders the Mermaid graph to SVG
- Outputs in [cyoa-group4/output/](cyoa-group4/output/): `cot-pages-ocr-v2/` (125 pages), `cot-story-graph.mmd`, `cot-story-graph.svg`, `cot-stories/` (45 stories + manifest)

### 2. Web authoring tool — significantly expanded
Location: [webapp/](webapp/)

- **Stack**: Pure Python stdlib `http.server` (no Flask); vanilla JS frontend; Mermaid.js CDN for graph rendering
- **Backend** [webapp/server.py](webapp/server.py):
  - `GET /api/story` — load story JSON
  - `POST /api/story` — save story JSON
  - `GET /api/status` — per-page health data (orphan/terminal/branch/empty flags)
  - `GET /api/graph` — generate Mermaid syntax
  - `GET /api/import` — import Cave of Time OCR pages into the editor
  - `GET /api/generate` — enumerate and write all story variants as .txt files
- **Data model** [webapp/story_model.py](webapp/story_model.py): `Story { startPageId, pages: { id → { id, title, text, choices:[{label, target}] } } }` plus computed `story_status()` with per-page badges and aggregate counts
- **Persistence**: single file `output/authoring-story.json` (gitignored)
- **UI** [webapp/static/](webapp/static/):
  - Edit mode with title/text/choices editor, add/delete choices
  - **Reader mode** — click-through playthrough with back-to-start
  - **Page search** — live filter of the page list
  - **Upload / Download JSON** — import/export story files from the browser
  - **Generate Variants** button — writes bounded stories to `output/authoring-stories/`
  - **Import CoT** button — loads the extracted Cave of Time as an example
  - **Status panel** — live counts for terminal/branching/orphan/empty/unreachable
  - **Page badges** — Start / Terminal / Orphan / Branch / Empty flags next to each page
  - Graph auto-refresh on save

---

## What's Still Missing

### Authoring tool — remaining gaps
- ~~**No page deletion in UI**~~ — ✅ Done: hover over any page in the sidebar to reveal a × button; warns about dangling choices before deleting
- **No choice-target validation on save** — a choice pointing to a non-existent page is accepted silently. Status panel flags dangling targets after the fact, but the edit form doesn't warn while typing
- **OCR import is regex-fragile** — [webapp/story_model.py:235-251](webapp/story_model.py) works well for CoT but would break on stories with different choice phrasing
- **Mode switches drop unsaved edits silently** — `setMode("reader")` calls `updateCurrentPage()` which mutates in-memory only; nothing warns about unsaved state
- **Graph isn't interactive** — Mermaid renders but you can't click a node to jump to that page
- **No undo / history** — destructive actions (delete choice, Import CoT) are one-way

### Reader / export
- **No standalone static-HTML export** — Fork-Instructions calls for a shippable reader so end-users can play a completed story without the server. Current reader mode only works inside the authoring app
- **No "similar endings" detection** — status counts terminals but doesn't cluster pages that end the same way

### Project hygiene
- **No tests anywhere** — neither the extraction pipeline nor the webapp has any automated tests
- **Duplicate `output/` trees** — both root `output/` and [cyoa-group4/output/](cyoa-group4/output/) hold identical `cot-pages-ocr-v2/` (125 files each) and graph/story artifacts. Pick one source of truth; `webapp/story_model.py` already reads from the root `output/cot-pages-ocr-v2`
- **No AI session log for webapp work** — Fork-Instructions asks contributors to keep chat logs like [AI-session-log-20260408950.json](AI-session-log-20260408950.json); nothing exists for the post-fork authoring-tool work
- **No CLAUDE.md / AGENTS.md** — conventions, run commands, and the "run server from repo root" rule live only in [Codebase.md](Codebase.md) and [webapp/README.md](webapp/README.md)

---

## Suggested Next Priorities

1. **Static HTML reader export** — biggest user-facing gap; small scope (render the existing reader pane as a self-contained `.html` bundle)
2. **Page deletion + choice-target validation** — tightens the core authoring loop
3. **Consolidate the duplicate `output/` directories** — low-risk cleanup that prevents drift
4. **Clickable graph nodes** — Mermaid supports click handlers; would make navigation much nicer for medium/large stories
