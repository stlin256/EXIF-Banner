# EXIF-Banner Web App

This folder contains the local web application for EXIF-Banner.

Run from the repository root:

```powershell
pip install -r requirements.txt
python webapp\server.py
```

Default URL:

```text
http://127.0.0.1:8765/
```

Capabilities:

- scan local JPG/JPEG albums
- parse EXIF natively, with optional ExifTool enrichment
- preview banner layout in the browser
- auto-match built-in camera brand logos from `logos/logo-rules.json`
- manually choose a logo when automatic matching is not enough
- navigate previews smoothly with wheel/keyboard and background pre-rendering
- export JPEG / PNG composite images
- export PPTX decks with one rendered image per slide

Logo assets are stored in `webapp/logos/`. To add another brand, copy the logo image into that folder and add a matching rule to `webapp/logos/logo-rules.json`.
