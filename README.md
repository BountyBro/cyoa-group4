# Required Contents
Site URL: [FILL IN ONCE UPLOADED.]
Repo URL: https://github.com/BountyBro/cyoa-group4
Group Names: Dilshan Bedi, Leo Kotok, Noah Brestel

# choose-your-own-adventure

## Build Story Graph

Run:

```bash
python3 scripts/build_story_graph.py \
	--pages-dir output/cot-pages-ocr-v2 \
	--output output/cot-story-graph.mmd
```

Generated output:

- `output/cot-story-graph.mmd`: Mermaid graph of branching story transitions from the corrected OCR v2 page set

## Generate All Story Variants

Run:

```bash
python3 scripts/write_all_stories.py
```

Generated outputs:

- `output/cot-stories/story-0001.txt` (and additional numbered files): one complete path per file
- `output/cot-stories/manifest.json`: index of generated story files and page paths

Optional flags:

```bash
python3 scripts/write_all_stories.py \
	--graph output/cot-story-graph.mmd \
	--pages-dir output/cot-pages-ocr-v2 \
	--output-dir output/cot-stories \
	--start-page 2 \
	--max-decisions 20
```

## Re-Extract From Spread-Scanned PDF

The book scan is a two-page spread layout. The story starts on the left side of PDF page 8:

- PDF page 8 -> story pages 2 and 3
- PDF page 9 -> story pages 4 and 5

Run:

```bash
python3 scripts/reextract_cot_ocr_split.py \
	--pdf samples/the-cave-of-time.pdf \
	--pdf-start-page 8 \
	--pdf-end-page 66 \
	--story-start-page 2 \
	--output-dir output/cot-pages-ocr-v2
```

Generated output:

- `output/cot-pages-ocr-v2/*.txt`: OCR re-extraction using left/right half-page splitting

## Authoring Tool

A new lightweight authoring tool is available under `webapp/`.

Run:

```bash
python webapp/server.py
```

Then open:

```
http://127.0.0.1:8000/
```
