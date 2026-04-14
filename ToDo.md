## What's Already Built

### 1. Cave of Time extraction pipeline (done, stable)
Location: [cyoa-group4/](cyoa-group4/)

- [scripts/reextract_cot_ocr_split.py](cyoa-group4/scripts/reextract_cot_ocr_split.py) — OCR extracts the PDF's spread pages into per-story-page text
- [scripts/build_story_graph.py](cyoa-group4/scripts/build_story_graph.py) — parses "turn to page X" choices into a Mermaid graph
- [scripts/write_all_stories.py](cyoa-group4/scripts/write_all_stories.py) — enumerates bounded story paths (45 variants)
- [scripts/render_story_graph_svg.py](cyoa-group4/scripts/render_story_graph_svg.py) — renders the Mermaid graph to SVG
- Outputs in [cyoa-group4/output/](cyoa-group4/output/): `cot-pages-ocr-v2/` (125 pages), `cot-story-graph.mmd`, `cot-story-graph.svg`, `cot-stories/` (45 stories + manifest)

### 2. Web authoring tool (functional prototype)
Location: [webapp/](webapp/)

- **Stack**: Pure Python stdlib `http.server` (no Flask); vanilla JS frontend; Mermaid.js CDN for graph rendering
- **Backend** [webapp/server.py](webapp/server.py):
  - `GET /api/story` — load story JSON
  - `POST /api/story` — save story JSON
  - `GET /api/graph` — generate Mermaid syntax
  - `GET /api/import` — import Cave of Time OCR pages into the editor
  - `GET /api/generate` — enumerate and write all story variants as .txt files
- **Data model** [webapp/story_model.py](webapp/story_model.py): `Story { startPageId, pages: { id → { id, title, text, choices:[{label, target}] } } }`
- **Persistence**: single file `output/authoring-story.json`
- **UI** [webapp/static/](webapp/static/): page list, inline editor for title/text/choices, add/delete choices, Mermaid graph preview, save button

---

## What's Missing / Weak

### Authoring tool gaps
- **No page deletion** in UI (can add but not remove pages)
- **No choice-target validation** — a choice pointing to a non-existent page is silently allowed
- **Graph doesn't auto-refresh** — requires manual save + refresh
- **Missing-page warnings hidden** — backend flags them but UI doesn't surface
- **No page search / filter** — painful once a story has dozens of pages
- **Race conditions** in choice-syncing JS ([webapp/static/app.js](webapp/static/app.js) around lines 164-176 vs 207-211)
- **No import UI button** — `/api/import` exists but you must hit it manually
- **OCR import is fragile** — regex-based choice extraction in [webapp/story_model.py](webapp/story_model.py) lines 154-166

### Reader view (not started)
- Fork instructions call for a **static HTML reader** so end-users can play through a completed story. Nothing exists for this yet.

### Nice-to-haves from Fork-Instructions
- Visualize **unfinished branches** (pages with dangling choices)
- Highlight **similar endings** / pages reachable from multiple paths
- Easily navigate between paths in the graph

### Project hygiene
- No tests anywhere
- Two parallel `output/` directories (root `output/` vs `cyoa-group4/output/`) — relationship unclear and confusing
- No chat/session log for this webapp work (Fork-Instructions asks contributors to keep that practice)
