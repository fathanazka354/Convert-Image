"""
server/app.py
Responsible for: finding a free port, starting the HTTPServer,
and opening the browser at the correct URL.
"""

import os
import socket
import threading
import webbrowser
from http.server import HTTPServer

from .handler import RequestHandler


class ServerApp:
    """Top-level server orchestrator."""

    # ── Public API ─────────────────────────────────────────────────────────────
    def run(self) -> None:
        # If PORT env var exists, we are in production (e.g. Render/Railway)
        port_env = os.environ.get("PORT")
        is_prod = bool(port_env)
        
        host = "0.0.0.0" if is_prod else "127.0.0.1"
        port = int(port_env) if is_prod else self._find_free_port()
        url  = f"http://{'127.0.0.1' if host == '0.0.0.0' else host}:{port}"
        
        server = HTTPServer((host, port), RequestHandler)

        self._print_banner(url)
        
        # Only open browser automatically in local development
        if not is_prod:
            threading.Timer(0.8, lambda: webbrowser.open(url)).start()

        try:
            server.serve_forever()
        except KeyboardInterrupt:
            print("\n  Server stopped.")
            server.shutdown()

    # ── Private helpers ────────────────────────────────────────────────────────
    @staticmethod
    def _find_free_port() -> int:
        with socket.socket() as s:
            s.bind(("", 0))
            return s.getsockname()[1]

    @staticmethod
    def _print_banner(url: str) -> None:
        print("\n  🖼️  Image Converter Pro")
        print(f"  Running at: {url}")
        print("  Press Ctrl+C to quit.\n")
