from __future__ import annotations

import argparse
import os
from http.server import ThreadingHTTPServer
from pathlib import Path
from threading import Thread
from typing import Any

try:
    import webview
except ImportError as exc:
    raise SystemExit(
        "pywebview is not installed. Install dependencies with "
        "`python -m pip install -r requirements.txt`."
    ) from exc

try:
    from server import Handler
except ModuleNotFoundError:
    from .server import Handler


APP_TITLE = "EXIF-Banner"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765
DEFAULT_WIDTH = 1360
DEFAULT_HEIGHT = 860
MIN_WIDTH = 1024
MIN_HEIGHT = 680


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run EXIF-Banner as a desktop app.")
    parser.add_argument("--host", default=DEFAULT_HOST)
    parser.add_argument(
        "--port",
        type=int,
        default=DEFAULT_PORT,
        help="Local HTTP port. Use 0 to let the OS choose an available port.",
    )
    parser.add_argument("--debug", action="store_true", help="Enable pywebview debug tools.")
    return parser.parse_args()


def start_local_server(host: str, port: int) -> tuple[ThreadingHTTPServer, Thread, str]:
    server = ThreadingHTTPServer((host, port), Handler)
    actual_host, actual_port = server.server_address[:2]
    url = f"http://{actual_host}:{actual_port}/"
    thread = Thread(target=server.serve_forever, name="EXIF-Banner HTTP", daemon=True)
    thread.start()
    return server, thread, url


def shutdown_server(server: ThreadingHTTPServer, thread: Thread) -> None:
    server.shutdown()
    server.server_close()
    thread.join(timeout=3)


def webview_storage_path() -> str | None:
    candidates: list[Path] = []
    if os.name == "nt":
        base = os.environ.get("LOCALAPPDATA") or os.environ.get("APPDATA")
        if base:
            candidates.append(Path(base) / "EXIF-Banner" / "WebView")
        candidates.append(Path.home() / "AppData" / "Local" / "EXIF-Banner" / "WebView")
    else:
        candidates.append(Path(os.environ.get("XDG_DATA_HOME", Path.home() / ".local" / "share")) / "EXIF-Banner" / "WebView")
    candidates.append(Path.home() / ".exif-banner" / "webview")

    for path in candidates:
        try:
            path.mkdir(parents=True, exist_ok=True)
            return str(path)
        except OSError:
            continue
    return None


def start_webview(url: str, debug: bool) -> None:
    webview.create_window(
        APP_TITLE,
        url,
        width=DEFAULT_WIDTH,
        height=DEFAULT_HEIGHT,
        min_size=(MIN_WIDTH, MIN_HEIGHT),
    )
    start_kwargs: dict[str, Any] = {"debug": debug, "private_mode": False}
    storage_path = webview_storage_path()
    if storage_path:
        start_kwargs["storage_path"] = storage_path
    try:
        webview.start(**start_kwargs)
    except TypeError:
        start_kwargs.pop("storage_path", None)
        start_kwargs.pop("private_mode", None)
        webview.start(**start_kwargs)


def main() -> None:
    args = parse_args()
    server, thread, url = start_local_server(args.host, args.port)
    try:
        start_webview(url, args.debug)
    finally:
        shutdown_server(server, thread)


if __name__ == "__main__":
    main()
