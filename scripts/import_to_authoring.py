#!/usr/bin/env python3
"""Import extracted Cave of Time pages into the authoring story JSON format.

Usage (from repo root):
    python scripts/import_to_authoring.py

Optional flags:
    --pages-dir  path to directory of *-CoT.txt files
    --output     path to write authoring-story.json
    --start-page story page number that is the canonical starting point
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

PAGE_FILE_RE = re.compile(r"^(\d+)-CoT\.txt$")

# Matches bare "turn/tum/go to page N" directives (same as build_story_graph.py)
TURN_TO_RE = re.compile(
    r"\b(?:turn|tum|go|follow|take|return)\b[^\n]{0,120}?\b(?:to|ta|io)\b[^\n]{0,20}?"
    r"(?:page|poge|p\.)\s*([0-9IlOoSsZz]{1,3})",
    flags=re.IGNORECASE,
)


def normalize_page_token(token: str) -> int | None:
    raw = token.strip()
    mapped = (
        raw.replace("O", "0")
        .replace("o", "0")
        .replace("I", "1")
        .replace("l", "1")
        .replace("L", "1")
        .replace("S", "5")
        .replace("s", "5")
        .replace("Z", "2")
        .replace("z", "2")
    )
    if not mapped.isdigit():
        return None
    value = int(mapped)
    return value if 1 <= value <= 300 else None


def clean_label(raw: str) -> str:
    """Collapse whitespace and strip trailing punctuation from a choice label."""
    label = re.sub(r"\s*\n\s*", " ", raw)
    label = re.sub(r"\s{2,}", " ", label)
    return label.strip().rstrip(".,;")


def extract_choices(text: str, known_pages: set[int]) -> list[dict]:
    """Extract labelled choices from page text.

    Strategy: split the text on blank lines to get individual blocks.
    Any block that contains a 'turn to page N' directive is a choice block.
    The label is everything in that block before the 'turn' keyword,
    starting from the last occurrence of 'If' (if present).
    """
    choices: list[dict] = []
    seen_targets: set[int] = set()

    blocks = re.split(r"\n\n+", text)
    for block in blocks:
        turn_match = TURN_TO_RE.search(block)
        if not turn_match:
            continue

        target = normalize_page_token(turn_match.group(1))
        if target is None or target not in known_pages or target in seen_targets:
            continue
        seen_targets.add(target)

        # Grab text before the "turn to page N" directive
        text_before = block[: turn_match.start()]

        # Find the last "If" occurrence as the label start
        if_matches = list(re.finditer(r"\bIf\b", text_before, flags=re.IGNORECASE))
        if if_matches:
            raw_label = text_before[if_matches[-1].start() :]
        else:
            raw_label = text_before

        label = clean_label(raw_label)
        choices.append({"label": label, "target": str(target)})

    return choices


def is_terminal(text: str) -> bool:
    return bool(re.search(r"\bthe\s+end\b", text, flags=re.IGNORECASE))


def strip_page_header(text: str) -> str:
    """Remove the leading 'Page N' header line inserted by the OCR extractor."""
    return re.sub(r"^\s*Page\s+\d+\s*\n?", "", text).strip()


def load_pages(pages_dir: Path) -> dict[int, str]:
    pages: dict[int, str] = {}
    for path in sorted(pages_dir.glob("*-CoT.txt")):
        m = PAGE_FILE_RE.match(path.name)
        if m:
            pages[int(m.group(1))] = path.read_text(encoding="utf-8", errors="ignore")
    return pages


def build_story(pages_dir: Path, start_page: int) -> dict:
    raw_pages = load_pages(pages_dir)
    known_pages = set(raw_pages.keys())
    sorted_page_nums = sorted(raw_pages.keys())

    pages_json: dict[str, dict] = {}
    for page_num in sorted_page_nums:
        raw_text = raw_pages[page_num]
        body = strip_page_header(raw_text)
        choices = extract_choices(raw_text, known_pages)

        # Pages that continue sequentially (no explicit choices, not terminal)
        if not choices and not is_terminal(raw_text):
            next_page = page_num + 1
            if next_page in known_pages:
                choices = [{"label": "Continue", "target": str(next_page)}]

        pages_json[str(page_num)] = {
            "id": str(page_num),
            "title": f"Page {page_num}",
            "text": body,
            "choices": choices,
        }

    return {
        "startPageId": str(start_page),
        "pages": pages_json,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import extracted CoT pages into authoring JSON.")
    parser.add_argument(
        "--pages-dir",
        type=Path,
        default=Path("cyoa-group4/output/cot-pages-ocr-v2"),
        help="Directory containing *-CoT.txt files",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("output/authoring-story.json"),
        help="Output path for authoring-story.json",
    )
    parser.add_argument(
        "--start-page",
        type=int,
        default=2,
        help="Story page number used as the canonical start (default: 2)",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    if not args.pages_dir.exists():
        raise FileNotFoundError(f"Pages directory not found: {args.pages_dir}")

    story = build_story(args.pages_dir, args.start_page)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(story, indent=2, ensure_ascii=False), encoding="utf-8")

    pages = story["pages"]
    terminal = sum(1 for p in pages.values() if not p["choices"])
    decisions = sum(1 for p in pages.values() if len(p["choices"]) > 1)
    sequential = sum(
        1 for p in pages.values()
        if len(p["choices"]) == 1 and p["choices"][0]["label"] == "Continue"
    )

    print(f"Imported {len(pages)} pages → {args.output}")
    print(f"  Start page      : {story['startPageId']}")
    print(f"  Decision pages  : {decisions}  (2+ choices)")
    print(f"  Sequential cont : {sequential}  (auto-Continue)")
    print(f"  Terminal pages  : {terminal}  (The End)")


if __name__ == "__main__":
    main()
