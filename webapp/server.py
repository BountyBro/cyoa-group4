#!/usr/bin/env python3
"""A small web server for CYOA story authoring."""

from __future__ import annotations

import json
from http.server import HTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import urlparse

from story_model import (
    generate_story_variants,
    import_cot_pages,
    load_story,
    save_story,
    save_story_variants,
    story_status,
    story_to_mermaid,
)

BASE_DIR = Path(__file__).resolve().parent
STATIC_DIR = BASE_DIR / "static"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8000


class AuthoringRequestHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(STATIC_DIR), **kwargs)

    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/story":
            self.send_json(load_story())
            return
        if parsed.path == "/api/status":
            self.send_json(story_status(load_story()))
            return
        if parsed.path == "/api/graph":
            self.send_text(story_to_mermaid(load_story()), content_type="text/plain")
            return
        if parsed.path == "/api/import":
            story = import_cot_pages()
            save_story(story)
            self.send_json({
                "status": "ok",
                "page_count": len(story.get("pages", {})),
                "start_page": story.get("startPageId"),
            })
            return
        if parsed.path == "/api/generate":
            story = load_story()
            variants = generate_story_variants(story)
            manifest = save_story_variants(variants)
            self.send_json({
                "status": "ok",
                "story_count": len(variants),
                "manifest": manifest,
                "output_dir": str(Path("output") / "authoring-stories"),
            })
            return
        super().do_GET()

    def do_POST(self) -> None:
        parsed = urlparse(self.path)
        if parsed.path == "/api/story":
            content_length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(content_length).decode("utf-8")
            story = json.loads(body)
            save_story(story)
            self.send_json({"status": "ok"})
            return
        self.send_error(404, "Not Found")

    def send_json(self, value: object) -> None:
        payload = json.dumps(value, indent=2, ensure_ascii=False).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def send_text(self, text: str, content_type: str = "text/plain") -> None:
        payload = text.encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", f"{content_type}; charset=utf-8")
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)


def run_server(host: str = DEFAULT_HOST, port: int = DEFAULT_PORT) -> None:
    server_address = (host, port)
    httpd = HTTPServer(server_address, AuthoringRequestHandler)
    print(f"Serving authoring tool at http://{host}:{port}/")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("Shutting down server.")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
