from __future__ import annotations

import argparse
import io
import json
import sys
import time
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
WEBAPP = ROOT / "webapp"
if str(WEBAPP) not in sys.path:
    sys.path.insert(0, str(WEBAPP))

import server  # noqa: E402


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Benchmark EXIF-Banner scan, preview, and export paths.")
    parser.add_argument("--album", required=True, help="Photo album folder to benchmark.")
    parser.add_argument("--recursive", action="store_true", help="Scan album recursively.")
    parser.add_argument("--sort-mode", default="dateAsc", choices=sorted(server.SORT_MODES))
    parser.add_argument("--preview-count", type=int, default=12)
    parser.add_argument("--export-count", type=int, default=0)
    parser.add_argument("--pptx-count", type=int, default=0)
    parser.add_argument("--scale", type=int, default=20, help="Export scale used by export benchmarks.")
    parser.add_argument("--quality", type=int, default=82, help="JPEG quality used by export benchmarks.")
    parser.add_argument("--output-dir", default=str(ROOT / ".verify_output" / "benchmark"))
    return parser.parse_args()


def elapsed(func):
    start = time.perf_counter()
    result = func()
    return result, time.perf_counter() - start


def main() -> None:
    args = parse_args()
    album_path = Path(args.album).expanduser()
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    album_payload, scan_seconds = elapsed(lambda: server.scan_album(album_path, args.recursive, args.sort_mode))
    album = server.SESSIONS[album_payload["albumId"]]
    photos = album["photos"]
    settings = server.merged_settings(album_payload["settings"])

    preview_photos = photos[: max(0, min(args.preview_count, len(photos)))]

    def render_previews() -> int:
        total_bytes = 0
        for photo in preview_photos:
            image = server.render_preview_composite(photo, settings, 1920)
            image.thumbnail((1920, 1920), server.RESAMPLE)
            buffer = io.BytesIO()
            image.save(buffer, "JPEG", quality=88, subsampling=2)
            total_bytes += len(buffer.getvalue())
        return total_bytes

    preview_bytes, preview_seconds = elapsed(render_previews)

    export_seconds = None
    export_count = max(0, min(args.export_count, len(photos)))
    if export_count:
        export_settings = dict(settings)
        export_settings["exportScalePct"] = args.scale
        export_settings["quality"] = args.quality
        targets = server.unique_export_paths(
            photos[:export_count],
            output_dir / "images",
            server.export_extension(export_settings),
            None,
        )
        _, export_seconds = elapsed(
            lambda: server.export_photo_images_parallel(photos[:export_count], targets, export_settings)
        )

    pptx_seconds = None
    pptx_count = max(0, min(args.pptx_count, len(photos)))
    if pptx_count:
        pptx_settings = dict(settings)
        pptx_settings["exportScalePct"] = args.scale
        pptx_settings["quality"] = args.quality
        _, pptx_seconds = elapsed(
            lambda: server.export_pptx(
                album_payload["albumId"],
                {
                    "settings": pptx_settings,
                    "selection": list(range(pptx_count)),
                    "outputDir": str(output_dir / "pptx"),
                },
            )
        )

    result = {
        "album": str(album_path),
        "count": len(photos),
        "exifSource": album_payload["exifSource"],
        "scanSeconds": round(scan_seconds, 3),
        "previewCount": len(preview_photos),
        "previewSeconds": round(preview_seconds, 3),
        "previewAvgSeconds": round(preview_seconds / max(1, len(preview_photos)), 3),
        "previewBytes": preview_bytes,
        "exportCount": export_count,
        "exportSeconds": round(export_seconds, 3) if export_seconds is not None else None,
        "pptxCount": pptx_count,
        "pptxSeconds": round(pptx_seconds, 3) if pptx_seconds is not None else None,
    }
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
