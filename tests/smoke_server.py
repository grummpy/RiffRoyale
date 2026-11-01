#!/usr/bin/env python3
"""Headless smoke launch: server.py serves index.html on 127.0.0.1."""

from __future__ import annotations

import os
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, ROOT)

import server  # noqa: E402


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


def fetch(url: str) -> tuple[int, bytes]:
    with urllib.request.urlopen(url, timeout=2) as response:
        return response.status, response.read()


def main() -> int:
    if server.HOST != "127.0.0.1":
        raise SystemExit(f"server host must be 127.0.0.1, got {server.HOST}")
    if server.default_port() != 8810:
        raise SystemExit(f"default port must be 8810, got {server.default_port()}")

    port = free_port()
    proc = subprocess.Popen(
        [sys.executable, os.path.join(ROOT, "server.py"), "--port", str(port), "--no-browser"],
        cwd=ROOT,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )
    base = f"http://127.0.0.1:{port}"
    try:
        body = b""
        status = None
        last_error: Exception | None = None
        for _ in range(50):
            if proc.poll() is not None:
                output = proc.stdout.read() if proc.stdout else ""
                raise SystemExit(f"server exited early:\n{output}")
            try:
                status, body = fetch(f"{base}/index.html")
                break
            except (urllib.error.URLError, TimeoutError, ConnectionError) as exc:
                last_error = exc
                time.sleep(0.1)
        else:
            raise SystemExit(f"no response from {base}/index.html: {last_error}")

        text = body.decode("utf-8", "replace")
        if status != 200:
            raise SystemExit(f"expected 200 from index.html, got {status}")
        if "Riff Royale" not in text or "<canvas" not in text:
            raise SystemExit("index.html is missing the title or the canvas")

        arcade_status, arcade = fetch(f"{base}/arcade.json")
        if arcade_status != 200 or b'"riffroyale"' not in arcade:
            raise SystemExit("arcade.json was not served")

        script_status, script = fetch(f"{base}/src/main.js")
        if script_status != 200 or b"createLoop" not in script:
            raise SystemExit("src/main.js was not served")

        print(f"smoke ok {base}/index.html")
        return 0
    finally:
        proc.terminate()
        try:
            proc.wait(timeout=3)
        except subprocess.TimeoutExpired:
            proc.kill()


if __name__ == "__main__":
    sys.exit(main())
