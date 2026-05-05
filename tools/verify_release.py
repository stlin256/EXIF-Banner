from __future__ import annotations

import argparse
import json
import os
import shutil
import subprocess
import sys
import time
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEBAPP = ROOT / "webapp"
if str(WEBAPP) not in sys.path:
    sys.path.insert(0, str(WEBAPP))

import server  # noqa: E402
from PIL import Image  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run pre-release verification for EXIF-Banner.")
    parser.add_argument("--album", help="Optional real album folder. If omitted, a synthetic album is generated.")
    parser.add_argument("--output-dir", default=str(ROOT / ".verify_output" / "release-check"))
    parser.add_argument("--skip-node", action="store_true", help="Skip JavaScript syntax check.")
    return parser.parse_args()


def run_command(command: list[str]) -> dict[str, object]:
    started = time.perf_counter()
    completed = subprocess.run(
        command,
        cwd=str(ROOT),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return {
        "command": command,
        "seconds": round(time.perf_counter() - started, 3),
        "returncode": completed.returncode,
        "stdout": completed.stdout.strip(),
        "stderr": completed.stderr.strip(),
    }


def require_command(result: dict[str, object]) -> None:
    if result["returncode"] != 0:
        raise RuntimeError(f"Command failed: {result['command']}\n{result['stderr']}")


def prepare_album(output_dir: Path, album: str | None) -> Path:
    if album:
        return Path(album).expanduser()
    album_dir = output_dir / "synthetic-album"
    if album_dir.exists():
        shutil.rmtree(album_dir)
    album_dir.mkdir(parents=True, exist_ok=True)
    colors = [(180, 72, 72), (72, 132, 180), (96, 150, 92)]
    for index, color in enumerate(colors, start=1):
        image = Image.new("RGB", (1800, 1200), color)
        exif = Image.Exif()
        exif[271] = "EXIF-Banner Verify"
        exif[272] = f"Verify Camera {index}"
        exif[305] = "EXIF-Banner"
        exif[306] = "2026:05:05 12:00:00"
        image.save(album_dir / f"sample_{index:02d}.jpg", "JPEG", quality=90, exif=exif)
    return album_dir


def verify_app_paths(album_dir: Path, output_dir: Path) -> dict[str, object]:
    os.environ["EXIF_BANNER_CACHE_DIR"] = str(output_dir / "cache")
    album_payload = server.scan_album(album_dir, recursive=False, sort_mode="nameAsc")
    album = server.SESSIONS[album_payload["albumId"]]
    photos = album["photos"]
    if len(photos) < 2:
        raise RuntimeError("Verification album must contain at least 2 images.")

    settings = dict(album_payload["settings"])
    settings["exportScalePct"] = 20
    settings["quality"] = 82

    preview = server.render_preview_composite(photos[0], settings, 1200)
    preview_path = output_dir / "preview-check.jpg"
    preview.save(preview_path, "JPEG", quality=88, subsampling=2)

    image_result = server.export_images(
        album_payload["albumId"],
        {
            "settings": settings,
            "selection": [0, 1],
            "outputDir": str(output_dir / "images"),
        },
    )
    if image_result["count"] != 2:
        raise RuntimeError("Image export count mismatch.")
    verify_exported_exif(Path(image_result["files"][0]), "Verify Camera 1")

    png_settings = dict(settings)
    png_settings["exportFormat"] = "png"
    png_result = server.export_images(
        album_payload["albumId"],
        {
            "settings": png_settings,
            "selection": [0],
            "outputDir": str(output_dir / "png-images"),
        },
    )
    if png_result["count"] != 1:
        raise RuntimeError("PNG export count mismatch.")
    verify_exported_exif(Path(png_result["files"][0]), "Verify Camera 1")

    pptx_path = output_dir / "pptx" / "release-check.pptx"
    pptx_result = server.export_pptx(
        album_payload["albumId"],
        {
            "settings": settings,
            "selection": [0, 1],
            "outputDir": str(pptx_path.parent),
            "outputFile": str(pptx_path),
        },
    )
    with zipfile.ZipFile(pptx_path) as package:
        slide_count = len([
            name for name in package.namelist()
            if name.startswith("ppt/slides/slide") and name.endswith(".xml")
        ])
    if slide_count != 2:
        raise RuntimeError("PPTX slide count mismatch.")

    return {
        "albumCount": len(photos),
        "preview": str(preview_path),
        "imageExportCount": image_result["count"],
        "pngExportCount": png_result["count"],
        "pptx": pptx_result["outputFile"],
        "pptxSlides": slide_count,
    }


def verify_exported_exif(path: Path, expected_model: str) -> None:
    with Image.open(path) as image:
        exif = image.getexif()
        if not exif:
            raise RuntimeError("Exported image EXIF is missing.")
        if exif.get(272) != expected_model:
            raise RuntimeError(f"Exported image EXIF model mismatch: {exif.get(272)!r}")
        if exif.get(274, 1) != 1:
            raise RuntimeError("Exported image EXIF orientation should be normalized to 1.")


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    checks: dict[str, object] = {}
    py_compile = run_command([
        sys.executable,
        "-m",
        "py_compile",
        "webapp/server.py",
        "webapp/desktop.py",
        "tools/benchmark.py",
        "tools/verify_release.py",
    ])
    require_command(py_compile)
    checks["pythonCompile"] = py_compile

    if not args.skip_node:
        node = shutil.which("node")
        if node:
            node_check = run_command([node, "--check", "webapp/static/app.js"])
            require_command(node_check)
            checks["nodeCheck"] = node_check
        else:
            checks["nodeCheck"] = "skipped: node not found"

    album_dir = prepare_album(output_dir, args.album)
    checks["appPaths"] = verify_app_paths(album_dir, output_dir)
    checks["ok"] = True
    print(json.dumps(checks, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
