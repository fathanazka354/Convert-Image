"""
server/handler.py
Responsible for: routing HTTP requests to the correct responder.
Single Responsibility — only dispatches; business logic lives elsewhere.
"""

import json
import os
from http.server import BaseHTTPRequestHandler

from core.converter import ImageConverter
from core.multipart_parser import MultipartParser

# ── Static asset root ──────────────────────────────────────────────────────────
BASE_DIR       = os.path.dirname(os.path.dirname(__file__))
TEMPLATES_DIR  = os.path.join(BASE_DIR, "templates")

# ── MIME type registry ─────────────────────────────────────────────────────────
MIME_TYPES: dict[str, str] = {
    ".html": "text/html; charset=utf-8",
    ".js":   "application/javascript; charset=utf-8",
    ".css":  "text/css; charset=utf-8",
}

IMAGE_MIME: dict[str, str] = {
    "JPEG": "image/jpeg",
    "WEBP": "image/webp",
    "PNG":  "image/png",
    "BMP":  "image/bmp",
}


class RequestHandler(BaseHTTPRequestHandler):
    """Routes every HTTP request and sends back an appropriate response."""

    # ── Routing ────────────────────────────────────────────────────────────────
    def do_GET(self) -> None:
        routes = {
            "/":            lambda: self._serve_template("index.html"),
            "/js/app.js":   lambda: self._serve_template("js/app.js"),
        }
        handler = routes.get(self.path)
        if handler:
            handler()
        else:
            self._send_json({"error": "Not found"}, status=404)

    def do_POST(self) -> None:
        if self.path == "/api/convert":
            self._handle_convert()
        else:
            self._send_json({"error": "Not found"}, status=404)

    # ── Route handlers ─────────────────────────────────────────────────────────
    def _handle_convert(self) -> None:
        try:
            content_type = self.headers.get("Content-Type", "")
            length       = int(self.headers.get("Content-Length", 0))
            body         = self.rfile.read(length)

            fields   = MultipartParser(body, content_type).parse()
            fmt      = fields.get("format", b"JPEG").decode().upper()
            quality  = int(fields.get("quality", b"90").decode())
            raw_file = fields.get("file")

            if not raw_file:
                raise ValueError("No file uploaded.")

            result = ImageConverter().convert(raw_file, fmt, quality)

            self.send_response(200)
            self.send_header("Content-Type", IMAGE_MIME.get(fmt, "application/octet-stream"))
            self.send_header("Content-Length", str(len(result)))
            self.end_headers()
            self.wfile.write(result)

        except Exception as exc:
            self._send_json({"error": str(exc)}, status=500)

    # ── Response helpers ───────────────────────────────────────────────────────
    def _serve_template(self, relative_path: str) -> None:
        abs_path = os.path.join(TEMPLATES_DIR, relative_path)
        ext      = os.path.splitext(abs_path)[1]
        mime     = MIME_TYPES.get(ext, "text/plain")

        try:
            with open(abs_path, "rb") as f:
                data = f.read()
            self.send_response(200)
            self.send_header("Content-Type", mime)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        except FileNotFoundError:
            self._send_json({"error": f"{relative_path} not found"}, status=404)

    def _send_json(self, payload: dict, status: int = 200) -> None:
        data = json.dumps(payload).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    # ── Silence default request logs ───────────────────────────────────────────
    def log_message(self, fmt, *args) -> None:  # noqa: N802
        pass
