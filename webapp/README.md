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

- Page list and page editing
- Choice creation and target page selection
- Mermaid graph preview of the story structure
- Save/load story data to `output/authoring-story.json`

## Notes

The authoring tool is a starting point. The next steps are:

- import existing extracted page text into the editor
- export completed stories as static HTML for reading
- add graph editing and page search support
