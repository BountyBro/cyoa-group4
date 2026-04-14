from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any, Dict, List, Tuple

STORY_FILE = Path("output") / "authoring-story.json"
STORY_OUTPUT_DIR = Path("output") / "authoring-stories"
COT_PAGES_DIR = Path("output") / "cot-pages-ocr-v2"

_PAGE_FILE_RE = re.compile(r"^(\d+)-CoT\.txt$")
_TURN_TO_RE = re.compile(
    r"\b(?:turn|tum|go|follow|take|return)\b[^\n]{0,120}?\b(?:to|ta|io)\b[^\n]{0,20}?"
    r"(?:page|poge|p\.)\s*([0-9IlOoSsZz]{1,3})",
    flags=re.IGNORECASE,
)

Story = Dict[str, Any]
StoryPage = Dict[str, Any]


def default_story() -> Story:
    return {
        "startPageId": "1",
        "pages": {
            "1": {
                "id": "1",
                "title": "Start",
                "text": "Write the opening of your story here. Add choices to branch the adventure.",
                "choices": [
                    {
                        "label": "Add a choice to begin",
                        "target": "2",
                    }
                ],
            },
            "2": {
                "id": "2",
                "title": "Next Page",
                "text": "Write the next page of the story.",
                "choices": [],
            },
        },
    }


def load_story() -> Story:
    if STORY_FILE.exists():
        try:
            return json.loads(STORY_FILE.read_text(encoding="utf-8"))
        except (json.JSONDecodeError, OSError):
            pass
    return default_story()


def save_story(story: Story) -> None:
    STORY_FILE.parent.mkdir(parents=True, exist_ok=True)
    STORY_FILE.write_text(json.dumps(story, indent=2, ensure_ascii=False), encoding="utf-8")


def story_pages(story: Story) -> Dict[str, StoryPage]:
    return story.get("pages", {})


def page_parents(story: Story) -> Dict[str, List[str]]:
    pages = story_pages(story)
    parents: Dict[str, List[str]] = {page_id: [] for page_id in pages}
    for page_id, page in pages.items():
        for choice in page.get("choices", []):
            target = str(choice.get("target", "")).strip()
            if target and target in parents:
                parents[target].append(page_id)
    return parents


def story_status(story: Story) -> Dict[str, object]:
    pages = story_pages(story)
    parents = page_parents(story)
    start_page = choose_start_page(story)
    status_map: Dict[str, Dict[str, object]] = {}

    terminal_pages = 0
    orphan_pages = 0
    branch_pages = 0
    empty_pages = 0
    unreachable_pages = 0

    for page_id, page in pages.items():
        text = str(page.get("text", "")).strip()
        out_count = sum(1 for choice in page.get("choices", []) if choice.get("target"))
        in_count = len(parents.get(page_id, []))
        is_terminal = out_count == 0
        is_orphan = in_count == 0 and page_id != start_page
        is_branch = out_count > 1
        is_empty = len(text) == 0

        if is_terminal:
            terminal_pages += 1
        if is_orphan:
            orphan_pages += 1
        if is_branch:
            branch_pages += 1
        if is_empty:
            empty_pages += 1

        status_map[page_id] = {
            "incoming": in_count,
            "outgoing": out_count,
            "is_terminal": is_terminal,
            "is_orphan": is_orphan,
            "is_branch": is_branch,
            "is_start": page_id == start_page,
            "has_text": not is_empty,
        }

    total_pages = len(pages)
    unreachable_pages = sum(1 for page_id, stats in status_map.items() if stats["incoming"] == 0 and not stats["is_start"])

    return {
        "total_pages": total_pages,
        "start_page": start_page,
        "page_count": total_pages,
        "terminal_pages": terminal_pages,
        "orphan_pages": orphan_pages,
        "branch_pages": branch_pages,
        "empty_pages": empty_pages,
        "unreachable_pages": unreachable_pages,
        "page_status": status_map,
    }


def choose_start_page(story: Story) -> str:
    pages = story_pages(story)
    start_page = story.get("startPageId")
    if start_page and start_page in pages:
        return start_page
    if pages:
        return sorted(pages.keys(), key=lambda value: int(value))[0]
    return "1"


def enumerate_story_paths(story: Story, max_decisions: int = 20) -> List[Dict[str, Any]]:
    pages = story_pages(story)
    start_page = choose_start_page(story)
    results: List[Dict[str, Any]] = []

    def dfs(path: List[str], decision_points: int) -> None:
        current = path[-1]
        page = pages.get(current)
        if page is None:
            results.append({"path": path[:], "reason": "missing"})
            return

        choices = [choice for choice in page.get("choices", []) if choice.get("target")]
        if not choices:
            results.append({"path": path[:], "reason": "end"})
            return

        next_decision_points = decision_points + (1 if len(choices) > 1 else 0)
        if next_decision_points > max_decisions:
            results.append({"path": path[:], "reason": "max-decisions"})
            return

        for choice in choices:
            target = str(choice["target"])
            if target in path:
                results.append({"path": path + [target], "reason": "cycle"})
                continue
            dfs(path + [target], next_decision_points)

    dfs([start_page], 0)
    return results


def render_path_text(path: List[str], story: Story, reason: str) -> str:
    pages = story_pages(story)
    lines: List[str] = ["Path: " + " -> ".join(path), ""]
    for idx, page_id in enumerate(path, start=1):
        page = pages.get(page_id, {})
        lines.append(f"=== Step {idx}: Page {page_id} ===")
        lines.append(page.get("text", "[Missing page text]"))
        lines.append("")
    if reason != "end":
        lines.append(f"[Path terminated by: {reason}]")
        lines.append("")
    return "\n".join(lines).rstrip() + "\n"


def generate_story_variants(story: Story, max_decisions: int = 20) -> List[Dict[str, Any]]:
    variants: List[Dict[str, Any]] = []
    for path_info in enumerate_story_paths(story, max_decisions=max_decisions):
        path = path_info["path"]
        reason = path_info["reason"]
        text = render_path_text(path, story, reason)
        variants.append({"path": path, "reason": reason, "text": text})
    return variants


def save_story_variants(variants: List[Dict[str, Any]], output_dir: Path = STORY_OUTPUT_DIR) -> List[Dict[str, Any]]:
    output_dir.mkdir(parents=True, exist_ok=True)
    for old_file in output_dir.glob("story-*.txt"):
        old_file.unlink()

    manifest: List[Dict[str, Any]] = []
    for idx, variant in enumerate(variants, start=1):
        filename = f"story-{idx:04d}.txt"
        (output_dir / filename).write_text(variant["text"], encoding="utf-8")
        manifest.append({
            "file": filename,
            "path": variant["path"],
            "end_reason": variant["reason"],
            "length": len(variant["path"]),
        })

    manifest_path = output_dir / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    return manifest


def _normalize_page_token(token: str) -> int | None:
    mapped = (
        token.strip()
        .replace("O", "0").replace("o", "0")
        .replace("I", "1").replace("l", "1").replace("L", "1")
        .replace("S", "5").replace("s", "5")
        .replace("Z", "2").replace("z", "2")
    )
    if not mapped.isdigit():
        return None
    value = int(mapped)
    return value if 1 <= value <= 300 else None


def _extract_choices(text: str, known_pages: set) -> list:
    choices = []
    seen: set = set()
    for block in re.split(r"\n\n+", text):
        m = _TURN_TO_RE.search(block)
        if not m:
            continue
        target = _normalize_page_token(m.group(1))
        if target is None or target not in known_pages or target in seen:
            continue
        seen.add(target)
        before = block[: m.start()]
        if_matches = list(re.finditer(r"\bIf\b", before, flags=re.IGNORECASE))
        raw = before[if_matches[-1].start() :] if if_matches else before
        label = re.sub(r"\s*\n\s*", " ", raw).strip().rstrip(".,;")
        choices.append({"label": label, "target": str(target)})
    return choices


def import_cot_pages(pages_dir: Path = COT_PAGES_DIR, start_page: int = 2) -> Story:
    """Build an authoring story from the extracted Cave of Time page files."""
    raw: dict[int, str] = {}
    for path in sorted(pages_dir.glob("*-CoT.txt")):
        m = _PAGE_FILE_RE.match(path.name)
        if m:
            raw[int(m.group(1))] = path.read_text(encoding="utf-8", errors="ignore")

    known = set(raw.keys())
    pages: dict[str, Any] = {}
    for num in sorted(raw.keys()):
        text = raw[num]
        body = re.sub(r"^\s*Page\s+\d+\s*\n?", "", text).strip()
        choices = _extract_choices(text, known)
        is_terminal = bool(re.search(r"\bthe\s+end\b", text, flags=re.IGNORECASE))
        if not choices and not is_terminal and (num + 1) in known:
            choices = [{"label": "Continue", "target": str(num + 1)}]
        pages[str(num)] = {"id": str(num), "title": f"Page {num}", "text": body, "choices": choices}

    return {"startPageId": str(start_page), "pages": pages}


def story_to_mermaid(story: Story) -> str:
    lines: List[str] = ["graph TD"]
    pages = story.get("pages", {})
    for page_id, page in sorted(pages.items(), key=lambda item: int(item[0])):
        title = page.get("title", "")
        label = f"{page_id}: {title}" if title else page_id
        lines.append(f'  P{page_id}["{label}" ]')
    for page_id, page in sorted(pages.items(), key=lambda item: int(item[0])):
        for choice in page.get("choices", []):
            target = choice.get("target")
            if target:
                label = choice.get("label", "")
                edge = f"  P{page_id} -->|{label}| P{target}" if label else f"  P{page_id} --> P{target}"
                lines.append(edge)
    return "\n".join(lines) + "\n"
