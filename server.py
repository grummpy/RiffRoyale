#!/usr/bin/env python3
"""Local static server for Riff Royale.

Binds 127.0.0.1. The default port comes from arcade.json (8810) and walks
forward until it finds a free one. Opens the system browser unless
--no-browser is set.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
HOST = "127.0.0.1"


def default_port() -> int:
    path = os.path.join(ROOT, "arcade.json")
    try:
        with open(path, encoding="utf-8") as handle:
            data = json.load(handle)
        return int(data.get("port", 8810))
    except (OSError, ValueError, TypeError, json.JSONDecodeError):
        return 8810


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def bind_server(port: int, attempts: int = 20) -> tuple[ThreadingHTTPServer, int]:
    last_error: OSError | None = None
    for candidate in range(port, port + attempts):
        try:
            return ThreadingHTTPServer((HOST, candidate), Handler), candidate
        except OSError as exc:
            last_error = exc
    raise SystemExit(f"Could not bind {HOST} near port {port} ({attempts} tries). {last_error}")


def main(argv: list[str] | None = None) -> None:
    parser = argparse.ArgumentParser(description="Serve Riff Royale on localhost")
    parser.add_argument("--port", type=int, default=default_port())
    parser.add_argument("--no-browser", action="store_true", help="Do not open a browser window")
    args = parser.parse_args(argv)

    os.chdir(ROOT)
    httpd, port = bind_server(args.port)
    url = f"http://{HOST}:{port}/index.html"
    print(f"Riff Royale running at {url}")
    if not args.no_browser:
        webbrowser.open(url)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")
    finally:
        httpd.server_close()


if __name__ == "__main__":
    main()
