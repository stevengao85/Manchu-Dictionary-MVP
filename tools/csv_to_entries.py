#!/usr/bin/env python3
import csv
import json
import sys
from pathlib import Path


def split_simple(value: str):
    value = (value or "").strip()
    if not value:
        return []
    return [item.strip() for item in value.split("||") if item.strip()]


def split_forms(value: str):
    items = []
    for raw in split_simple(value):
        parts = [p.strip() for p in raw.split("::")]
        if len(parts) >= 3:
            items.append({
                "surface": parts[0],
                "type": parts[1],
                "explanation": parts[2],
            })
    return items


def split_derivations(value: str):
    items = []
    for raw in split_simple(value):
        parts = [p.strip() for p in raw.split("::")]
        if len(parts) >= 3:
            items.append({
                "term": parts[0],
                "relation": parts[1],
                "meaning": parts[2],
            })
    return items


def split_examples(value: str):
    items = []
    for raw in split_simple(value):
        parts = [p.strip() for p in raw.split("::")]
        if len(parts) >= 2:
            items.append({
                "latin": parts[0],
                "translation": parts[1],
                "notes": parts[2] if len(parts) >= 3 else "",
            })
    return items


def row_to_entry(row):
    headword = (row.get("headword") or "").strip()
    if not headword:
        return None
    return {
        "id": (row.get("id") or "").strip(),
        "headword": headword,
        "headword_script": (row.get("headword_script") or "").strip(),
        "stem": (row.get("stem") or "").strip() or headword,
        "citation_form": (row.get("citation_form") or "").strip(),
        "pos": (row.get("pos") or "").strip(),
        "core_meaning": (row.get("core_meaning") or "").strip(),
        "senses": split_simple(row.get("senses") or ""),
        "forms": split_forms(row.get("forms") or ""),
        "derivations": split_derivations(row.get("derivations") or ""),
        "examples": split_examples(row.get("examples") or ""),
        "related": split_simple(row.get("related") or ""),
        "tags": split_simple(row.get("tags") or ""),
    }


def main():
    if len(sys.argv) != 3:
        print("Usage: python tools/csv_to_entries.py <input.csv> <output.json>")
        sys.exit(1)

    input_path = Path(sys.argv[1])
    output_path = Path(sys.argv[2])

    if not input_path.exists():
        print(f"Input file not found: {input_path}")
        sys.exit(1)

    entries = []
    with input_path.open("r", encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            entry = row_to_entry(row)
            if entry is not None:
                entries.append(entry)

    output_path.write_text(json.dumps(entries, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote {len(entries)} entries to {output_path}")


if __name__ == "__main__":
    main()
