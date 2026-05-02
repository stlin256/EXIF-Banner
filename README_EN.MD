# EXIF-Banner

[![Release](https://img.shields.io/github/v/release/stlin256/EXIF-Banner?label=release)](https://github.com/stlin256/EXIF-Banner/releases)

[中文](README.MD)

EXIF-Banner is a local photo EXIF banner generator. It runs on your computer, uses the browser as the UI, scans local albums, reads EXIF metadata, and batch-exports composite images or PPTX decks with a clean parameter banner.

This project evolved from the earlier [PPT-EXIF-Banner](https://github.com/stlin256/PPT-EXIF-Banner) PowerPoint macro workflow. The macro-based approach required manually preparing ExifTool, exporting EXIF data, and then configuring image, CSV, and logo paths inside Office. EXIF-Banner turns that workflow into a local web app, reducing friction from Office macro security settings, repeated path selection, and batch processing.

Author: [@stlin256](https://github.com/stlin256/EXIF-Banner)

## Download Release

Windows users can download the single-file executable:

[Go to GitHub Releases](https://github.com/stlin256/EXIF-Banner/releases)

Download and double-click the executable. It starts a local web service and opens the browser UI; album scanning, rendering, and export all happen on your computer.

## Examples

Editor interface:

![EXIF-Banner editor interface](images/webpage.png)

Example images:

![COMAC C909](images/c909.png)
![Tachybaptus ruficollis](images/Tachybaptus_ruficollis.png)
![HongKong Route 1](images/Route_1.png)

## Features

- Runs locally and does not upload photos or EXIF data.
- Browser UI for choosing albums, manually choosing a logo, and previewing the banner.
- Native EXIF parsing for common fields, with optional ExifTool enrichment when available.
- Displays camera model, lens model, focal length, aperture, shutter speed, and ISO.
- Automatically matches built-in logos by camera brand; prompts for manual logo loading when no brand rule matches.
- Caches settings and logo path for the next launch.
- Supports smooth page navigation with mouse wheel, keyboard shortcuts, background preview pre-rendering, and preview caching.
- Uses a cleaner loading animation and export progress indicator.
- Exports JPEG / PNG composite images.
- Exports at a resolution percentage based on the original photo pixels; `100%` keeps the photo area at source resolution.
- Preserves source folder structure when exporting recursive albums.
- Exports PPTX files with one composite image per slide.

## Install

Python 3.10 or newer is recommended.

```powershell
pip install -r requirements.txt
```

## Run

```powershell
python webapp\server.py
```

On Windows, you can also double-click:

```text
start-web.bat
```

Default URL:

```text
http://127.0.0.1:8765/
```

## Workflow

1. Click "Choose Album" and select a local photo folder.
2. Enable recursive scanning if you want to include subfolders.
3. Click "Scan".
4. Adjust background, logo, slide aspect ratio, banner dimensions, fonts, margins, export format, JPEG quality, and export resolution in the right panel. Leave the logo path empty to use automatic brand matching.
5. Select the photos to export in the left panel.
6. Click "Export Images" or "Export PPTX", then choose the output folder.

## Logo Matching

EXIF-Banner includes built-in logos for common camera brands and matches them from EXIF `Make` / `Model` fields:

```text
SONY / NIKON / OLYMPUS / CANON / PENTAX / PANASONIC / RICOH
```

Built-in logo files live in:

```text
webapp/logos/
```

Matching rules live in:

```text
webapp/logos/logo-rules.json
```

To add a brand, place the logo image in `webapp/logos/` and add a rule to `logo-rules.json`. A manually selected logo always overrides automatic matching. If the current photo brand has no matching rule, the app shows a toast suggesting manual logo selection.

## Export Notes

### Images

- JPEG is the default format. It is faster and smaller, which fits photo output well.
- PNG is lossless, larger, and slower. Use it when you need lossless files.
- Export resolution is based on the source photo pixels: `100%` keeps the photo area at source resolution, while `90%` scales the photo area down to 90% of the original pixels.

### PPTX

PPTX export uses `python-pptx`. Each slide contains one rendered composite image, making the deck suitable for presentation or slide-order editing.

## Preview Experience

The preview area supports mouse wheel and keyboard navigation. The app continuously pre-renders nearby photos in the background based on your recent navigation direction and caches rendered previews. When a cached preview is available, page changes display immediately. Scanning, loading, and exporting use a shutter-style loading animation; export jobs also show a progress bar.

## EXIF Reading

EXIF-Banner first uses native Python parsing for basic EXIF fields. If ExifTool is available, it is used to enrich manufacturer and lens information.

ExifTool lookup order:

1. `EXIFTOOL_PATH` environment variable
2. `exiftool.exe` in the selected album folder
3. `tools/exiftool/exiftool.exe` in this repository
4. `exiftool` or `exiftool.exe` on `PATH`

ExifTool is optional. Without it, EXIF-Banner still attempts native Python parsing.

## Project Structure

```text
webapp/               local web app
webapp/server.py      backend service, EXIF parsing, rendering, and export
webapp/static/        frontend page, styles, and interaction script
webapp/logos/         built-in brand logos and matching rules
tools/                optional utility scripts
images/               README example images
requirements.txt      Python dependencies
start-web.bat         Windows launcher
```

## Privacy

EXIF-Banner is designed for a local workflow. Album scanning, EXIF parsing, rendering, image export, and PPTX export all happen on your computer.
