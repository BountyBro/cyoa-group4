# CYOA Authoring Tool

This folder contains a lightweight web-based authoring tool for branching "Choose Your Own Adventure" stories.

## Run the authoring tool

This version of the authoring tool is now static-only and works entirely in the browser. You can open `webapp/static/index.html` directly or serve the `webapp/static` folder from any static host.

To preview locally with a simple file server:

```bash
cd webapp/static
python -m http.server 8000
```

Then open:

```
http://127.0.0.1:8000/
```

## Features included

- Page list with search, status badges, and per-page delete
- Page title, text, and choice editing with auto-save to `localStorage`
- Live validation of choice targets (red outline for dangling IDs)
- Undo stack (30 steps) with `Ctrl/Cmd+Z`
- Clickable Mermaid graph preview that jumps to the clicked page
- Story health panel (terminal, branch, orphan, empty, unreachable)
- Reader mode for following story paths inside the app
- Download story JSON, Upload story JSON
- Import the Cave of Time example (shipped as `cot-example.json`)
- Export Reader — downloads a self-contained `story-reader.html`
- Generate Variants — bounded path enumeration to `story-variants.json`

## Regenerating the Cave of Time example

The `cot-example.json` shipped in `webapp/static/` is built from the OCR pages via:

```bash
python scripts/import_to_authoring.py --output webapp/static/cot-example.json
```

Only needed if the source OCR or import logic changes.

## Notes

This tool is intended to support authoring and exploring branching stories. The current implementation includes:

- an editable authoring interface for pages and choices
- a reader mode for interactive path navigation
- story status insights to help identify structural issues
- a graph preview for visualizing story flow

Future improvements may include static HTML export, story history tracking, and graph editing features.
