from __future__ import annotations

import argparse
import html
import re
import subprocess
from pathlib import Path


MODEL_TAG_NAMES = {"LensID", "LensType", "LensType2", "LensType3", "RFLensType"}


def main() -> None:
    parser = argparse.ArgumentParser(description="Extract lookup tables from ExifTool -listx output.")
    parser.add_argument("exiftool", help="Path to exiftool or exiftool.exe")
    parser.add_argument(
        "--scope",
        choices=("lens-models", "all-values"),
        default="lens-models",
        help="Use lens-models for the app runtime table, or all-values for every ExifTool value table.",
    )
    parser.add_argument(
        "--output",
        default="webapp/lens_profiles.py",
        help="Python module to write. Defaults to webapp/lens_profiles.py.",
    )
    args = parser.parse_args()

    xml_text = subprocess.run(
        [args.exiftool, "-listx"],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
        check=True,
    ).stdout

    tables = extract_value_tables(xml_text, args.scope)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(render_python_module(tables, args.scope), encoding="utf-8")
    print(f"Wrote {output} with {len(tables)} tables ({args.scope}).")


def extract_value_tables(xml_text: str, scope: str) -> list[dict[str, object]]:
    tables: list[dict[str, object]] = []
    seen: set[tuple[str, str, tuple[tuple[str, str], ...]]] = set()
    for table_match in re.finditer(r"<table name='([^']+)'([^>]*)>(.*?)</table>", xml_text, re.S):
        table_name, table_attrs, table_body = table_match.groups()
        table_group1 = attr_value(table_attrs, "g1")
        table_group2 = attr_value(table_attrs, "g2")
        for tag_match in re.finditer(r"<tag id='([^']*)' name='([^']*)'([^>]*)>(.*?)</tag>", table_body, re.S):
            tag_id, tag_name, tag_attrs, tag_body = tag_match.groups()
            if scope == "lens-models" and tag_name not in MODEL_TAG_NAMES:
                continue
            values = extract_values(tag_body)
            if not values:
                continue
            value_tuple = tuple(sorted(values.items()))
            dedupe_key = (table_name, tag_name, value_tuple)
            if dedupe_key in seen:
                continue
            seen.add(dedupe_key)
            tables.append(
                {
                    "table": html.unescape(table_name),
                    "group1": html.unescape(attr_value(tag_attrs, "g1") or table_group1),
                    "group2": html.unescape(attr_value(tag_attrs, "g2") or table_group2),
                    "tag_id": html.unescape(tag_id),
                    "tag": html.unescape(tag_name),
                    "values": values,
                }
            )
    return sorted(tables, key=lambda item: (str(item["table"]), str(item["tag"]), str(item["tag_id"])))


def extract_values(tag_body: str) -> dict[str, str]:
    values: dict[str, str] = {}
    for match in re.finditer(r"<key id='([^']+)'>\s*<val lang='en'>(.*?)</val>", tag_body, re.S):
        key = html.unescape(match.group(1)).strip()
        value = re.sub(r"\s+", " ", html.unescape(match.group(2))).strip()
        if key and value and not is_non_lens_value(value):
            values[key] = value
    return values


def is_non_lens_value(value: str) -> bool:
    lowered = value.lower()
    if lowered in {"n/a", "none", "unknown", "unknown lens"}:
        return True
    return False


def attr_value(attrs: str, name: str) -> str:
    match = re.search(rf"\b{name}='([^']*)'", attrs)
    return html.unescape(match.group(1)) if match else ""


def render_python_module(tables: list[dict[str, object]], scope: str) -> str:
    if scope == "all-values":
        return render_all_values_module(tables)
    return render_lens_module(tables)


def render_lens_module(tables: list[dict[str, object]]) -> str:
    nikon_values: dict[str, str] = {}
    for table in tables:
        if table["table"] == "Composite" and table["tag_id"] == "Nikon-LensID":
            nikon_values = dict(table["values"])  # type: ignore[arg-type]
            break

    lines = [
        '"""Lens lookup tables used by the native EXIF reader.\n',
        "\n",
        "Generated from ExifTool's public `-listx` output by\n",
        "`tools/extract_exiftool_lens_tables.py`. Runtime scanning does not\n",
        "require ExifTool when these tables are present.\n",
        '"""\n',
        "\n",
        "NIKON_LENS_IDS = {\n",
    ]
    for key, value in sorted(nikon_values.items()):
        lines.append(f"    {key!r}: {value!r},\n")
    lines.extend(["}\n", "\n", "LENS_VALUE_TABLES = [\n"])
    for table in tables:
        lines.append("    {\n")
        lines.append(f"        'table': {table['table']!r},\n")
        lines.append(f"        'group1': {table['group1']!r},\n")
        lines.append(f"        'group2': {table['group2']!r},\n")
        lines.append(f"        'tag_id': {table['tag_id']!r},\n")
        lines.append(f"        'tag': {table['tag']!r},\n")
        lines.append("        'values': {\n")
        for key, value in sorted(dict(table["values"]).items()):  # type: ignore[arg-type]
            lines.append(f"            {key!r}: {value!r},\n")
        lines.append("        },\n")
        lines.append("    },\n")
    lines.append("]\n")
    return "".join(lines)


def render_all_values_module(tables: list[dict[str, object]]) -> str:
    lines = [
        '"""ExifTool value lookup tables.\n',
        "\n",
        "Generated from ExifTool's public `-listx` output by\n",
        "`tools/extract_exiftool_lens_tables.py --scope all-values`.\n",
        '"""\n',
        "\n",
        "EXIFTOOL_VALUE_TABLES = [\n",
    ]
    for table in tables:
        lines.append("    {\n")
        lines.append(f"        'table': {table['table']!r},\n")
        lines.append(f"        'group1': {table['group1']!r},\n")
        lines.append(f"        'group2': {table['group2']!r},\n")
        lines.append(f"        'tag_id': {table['tag_id']!r},\n")
        lines.append(f"        'tag': {table['tag']!r},\n")
        lines.append("        'values': {\n")
        for key, value in sorted(dict(table["values"]).items()):  # type: ignore[arg-type]
            lines.append(f"            {key!r}: {value!r},\n")
        lines.append("        },\n")
        lines.append("    },\n")
    lines.append("]\n")
    return "".join(lines)


if __name__ == "__main__":
    main()
