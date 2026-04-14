from __future__ import annotations

import json
from pathlib import Path
from typing import Any, Dict, List, Tuple

STORY_FILE = Path("output") / "authoring-story.json"
STORY_OUTPUT_DIR = Path("output") / "authoring-stories"

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
