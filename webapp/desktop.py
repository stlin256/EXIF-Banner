from __future__ import annotations

import argparse
import ctypes
import locale
import os
import subprocess
import sys
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
    from server import Handler, rendered_photo_clipboard_dib, start_cache_maintenance
except ModuleNotFoundError:
    from .server import Handler, rendered_photo_clipboard_dib, start_cache_maintenance


APP_TITLE = "EXIF-Banner"
APP_USER_MODEL_ID = "stlin256.EXIFBanner"
DEFAULT_HOST = "127.0.0.1"
DEFAULT_PORT = 8765
DEFAULT_WIDTH = 1360
DEFAULT_HEIGHT = 860
MIN_WIDTH = 1024
MIN_HEIGHT = 680

LOCALIZATIONS = {
    "en": {
        "global.quitConfirmation": "Do you really want to quit EXIF-Banner?",
        "global.ok": "OK",
        "global.quit": "Quit",
        "global.cancel": "Cancel",
    },
    "zh": {
        "global.quitConfirmation": "确定要退出 EXIF-Banner 吗？",
        "global.ok": "确定",
        "global.quit": "退出",
        "global.cancel": "取消",
    },
}

MESSAGE_ICON_FLAGS = {
    "error": 0x10,
    "warning": 0x30,
    "info": 0x40,
}


class NativeDialogs:
    def show_message(self, kind: str, title: str, message: str) -> bool:
        show_native_message(kind, title, message)
        return True

    def copy_current_image(self, album_id: str, index: int, settings: dict[str, Any]) -> bool:
        data = rendered_photo_clipboard_dib(album_id, index, settings)
        return copy_dib_to_clipboard(data)

    def open_path(self, path: str) -> bool:
        open_local_path(path)
        return True

    def confirm_open_path(self, title: str, message: str, path: str) -> bool:
        if show_native_question(title, message):
            open_local_path(path)
            return True
        return False


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
    parser.add_argument(
        "--language",
        choices=("auto", "zh", "en"),
        default="auto",
        help="Desktop shell language. Use auto to follow the system language.",
    )
    return parser.parse_args()


def start_local_server(host: str, port: int) -> tuple[ThreadingHTTPServer, Thread, str]:
    server = ThreadingHTTPServer((host, port), Handler)
    actual_host, actual_port = server.server_address[:2]
    url = f"http://{actual_host}:{actual_port}/"
    start_cache_maintenance()
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


def desktop_language(language: str) -> str:
    if language in ("zh", "en"):
        return language

    values = [
        os.environ.get("LANGUAGE", ""),
        os.environ.get("LC_ALL", ""),
        os.environ.get("LC_MESSAGES", ""),
        os.environ.get("LANG", ""),
    ]
    for category in (locale.LC_CTYPE, locale.LC_TIME):
        try:
            values.append(locale.getlocale(category)[0] or "")
        except (TypeError, ValueError):
            continue
    text = " ".join(values).casefold()
    return "zh" if "zh" in text or "chinese" in text else "en"


def desktop_localization(language: str) -> dict[str, str]:
    return LOCALIZATIONS[desktop_language(language)]


def show_native_message(kind: str, title: str, message: str) -> None:
    title_text = clean_dialog_text(title) or APP_TITLE
    message_text = clean_dialog_text(message)
    if os.name == "nt":
        flags = MESSAGE_ICON_FLAGS.get(kind, MESSAGE_ICON_FLAGS["info"]) | 0x10000 | 0x40000
        ctypes.windll.user32.MessageBoxW(None, message_text, title_text, flags)
        return

    try:
        import tkinter as tk
        from tkinter import messagebox

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        if kind == "error":
            messagebox.showerror(title_text, message_text, parent=root)
        elif kind == "warning":
            messagebox.showwarning(title_text, message_text, parent=root)
        else:
            messagebox.showinfo(title_text, message_text, parent=root)
        root.destroy()
    except Exception:
        print(f"{title_text}\n{message_text}")


def show_native_question(title: str, message: str) -> bool:
    title_text = clean_dialog_text(title) or APP_TITLE
    message_text = clean_dialog_text(message)
    if os.name == "nt":
        flags = 0x04 | 0x20 | 0x10000 | 0x40000
        return ctypes.windll.user32.MessageBoxW(None, message_text, title_text, flags) == 6

    try:
        import tkinter as tk
        from tkinter import messagebox

        root = tk.Tk()
        root.withdraw()
        root.attributes("-topmost", True)
        result = messagebox.askyesno(title_text, message_text, parent=root)
        root.destroy()
        return bool(result)
    except Exception:
        return False


def open_local_path(path: str) -> None:
    target = Path(clean_dialog_text(path)).expanduser()
    if target.is_file():
        target = target.parent
    if not target.exists():
        raise FileNotFoundError(str(target))
    if os.name == "nt":
        os.startfile(str(target))  # type: ignore[attr-defined]
    elif sys.platform == "darwin":
        subprocess.Popen(["open", str(target)])
    else:
        subprocess.Popen(["xdg-open", str(target)])


def copy_dib_to_clipboard(data: bytes) -> bool:
    if os.name != "nt":
        return False
    if not data:
        raise RuntimeError("Rendered image is empty.")

    user32 = ctypes.windll.user32
    kernel32 = ctypes.windll.kernel32
    kernel32.GlobalAlloc.argtypes = [ctypes.c_uint, ctypes.c_size_t]
    kernel32.GlobalAlloc.restype = ctypes.c_void_p
    kernel32.GlobalLock.argtypes = [ctypes.c_void_p]
    kernel32.GlobalLock.restype = ctypes.c_void_p
    kernel32.GlobalUnlock.argtypes = [ctypes.c_void_p]
    kernel32.GlobalFree.argtypes = [ctypes.c_void_p]
    user32.SetClipboardData.argtypes = [ctypes.c_uint, ctypes.c_void_p]
    user32.SetClipboardData.restype = ctypes.c_void_p

    handle = kernel32.GlobalAlloc(0x0002, len(data))
    if not handle:
        raise RuntimeError("Unable to allocate clipboard memory.")
    try:
        pointer = kernel32.GlobalLock(handle)
        if not pointer:
            raise RuntimeError("Unable to lock clipboard memory.")
        try:
            ctypes.memmove(pointer, data, len(data))
        finally:
            kernel32.GlobalUnlock(handle)

        if not user32.OpenClipboard(None):
            raise RuntimeError("Clipboard is unavailable.")
        try:
            user32.EmptyClipboard()
            if not user32.SetClipboardData(8, handle):
                raise RuntimeError("Unable to write image to clipboard.")
            handle = None
        finally:
            user32.CloseClipboard()
    finally:
        if handle:
            kernel32.GlobalFree(handle)
    return True


def set_windows_app_user_model_id() -> None:
    if os.name != "nt":
        return
    try:
        ctypes.windll.shell32.SetCurrentProcessExplicitAppUserModelID(APP_USER_MODEL_ID)
    except (AttributeError, OSError):
        pass


def clean_dialog_text(value: Any) -> str:
    return str(value or "").replace("\r\n", "\n").strip()


def start_webview(url: str, debug: bool, language: str) -> None:
    webview.create_window(
        APP_TITLE,
        url,
        js_api=NativeDialogs(),
        width=DEFAULT_WIDTH,
        height=DEFAULT_HEIGHT,
        min_size=(MIN_WIDTH, MIN_HEIGHT),
        confirm_close=True,
        localization=desktop_localization(language),
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
    set_windows_app_user_model_id()
    server, thread, url = start_local_server(args.host, args.port)
    try:
        start_webview(url, args.debug, args.language)
    finally:
        shutdown_server(server, thread)


if __name__ == "__main__":
    main()
