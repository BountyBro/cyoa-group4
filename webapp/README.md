# CYOA Authoring Tool

This folder contains a lightweight web-based authoring tool for branching "Choose Your Own Adventure" stories.

## Run the authoring tool

From the repository root:

```bash
python webapp/server.py
```

Then open:

```
http://127.0.0.1:8000/
```

## Features included

- Page list with search and status badges
- Page title, text, and choice editing
- Story health panel showing terminal, branch, orphan, empty, and unreachable pages
- Live Mermaid graph preview of the story structure
- Interactive reader mode for following story paths inside the app
- Save and download story JSON
- Import the extracted Cave of Time pages into the authoring story
- Generate story variants from the current story data

## Notes

This tool is intended to support authoring and exploring branching stories. The current implementation includes:

- an editable authoring interface for pages and choices
- a reader mode for interactive path navigation
- story status insights to help identify structural issues
- a graph preview for visualizing story flow

Future improvements may include static HTML export, story history tracking, and graph editing features.
