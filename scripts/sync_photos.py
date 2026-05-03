#!/usr/bin/env python3

from __future__ import annotations

import json
import math
import re
import subprocess
from datetime import datetime, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parent.parent
PHOTOS_DIR = REPO_ROOT / "photos"
PHOTOS_JSON = REPO_ROOT / "photos.json"
PHOTO_OVERRIDES_JSON = REPO_ROOT / "photos.overrides.json"
GOLDEN_ANGLE = math.pi * (3 - math.sqrt(5))
DEFAULT_LANDSCAPE_WIDTH = 480
DEFAULT_PORTRAIT_WIDTH = 360
DEFAULT_LANDSCAPE_HEIGHT = 360
RESERVED_OVERRIDE_FIELDS = {"rename_from"}
ROMAN_NUMERALS = {
    2: "II",
    3: "III",
    4: "IV",
    5: "V",
    6: "VI",
    7: "VII",
    8: "VIII",
    9: "IX",
    10: "X",
}


def main() -> None:
    existing_entries = load_existing_entries(PHOTOS_JSON)
    overrides = load_overrides(PHOTO_OVERRIDES_JSON)
    photo_paths = sorted(
        path for path in PHOTOS_DIR.iterdir() if path.is_file() and not path.name.startswith(".")
    )

    layout_seed = []

    for photo_path in photo_paths:
        existing_entry = resolve_existing_entry(photo_path, existing_entries, overrides.get(photo_path.name, {}))

        if existing_entry is not None:
            layout_seed.append(apply_override(existing_entry, overrides.get(photo_path.name, {}), photo_path.name))

    step, offset = estimate_spiral(layout_seed)
    next_index = len(layout_seed)
    synced_entries = []

    for photo_path in photo_paths:
        override = overrides.get(photo_path.name, {})
        existing_entry = resolve_existing_entry(photo_path, existing_entries, override)

        if existing_entry is not None:
            synced_entries.append(apply_override(existing_entry, override, photo_path.name))
            continue

        entry = build_generated_entry(photo_path)

        entry["x"], entry["y"] = generate_position(entry, next_index, step, offset)
        synced_entries.append(apply_override(entry, override, photo_path.name))
        next_index += 1

    PHOTOS_JSON.write_text(f"{json.dumps(synced_entries, indent=2)}\n")
    print(f"Synced {len(synced_entries)} entries to {PHOTOS_JSON.name}")


def load_existing_entries(path: Path) -> dict[str, dict]:
    with path.open() as handle:
        entries = json.load(handle)

    return {Path(entry["src"]).name: entry for entry in entries}


def load_overrides(path: Path) -> dict[str, dict]:
    if not path.exists():
        return {}

    with path.open() as handle:
        overrides = json.load(handle)

    if not isinstance(overrides, dict):
        raise ValueError(f"Expected {path.name} to contain an object keyed by photo filename")

    return {
        filename: value
        for filename, value in overrides.items()
        if isinstance(filename, str) and isinstance(value, dict)
    }


def resolve_existing_entry(photo_path: Path, existing_entries: dict[str, dict], override: dict) -> dict | None:
    existing_entry = existing_entries.get(photo_path.name)

    if existing_entry is not None:
        return normalize_existing_entry(existing_entry)

    rename_from = override.get("rename_from")

    if isinstance(rename_from, str):
        previous_entry = existing_entries.get(rename_from)

        if previous_entry is not None:
            return migrate_entry(previous_entry, photo_path)

    return None


def migrate_entry(entry: dict, photo_path: Path) -> dict:
    migrated = normalize_existing_entry(entry)
    migrated["src"] = f"photos/{photo_path.name}"
    migrated["title"] = derive_title(photo_path.stem)
    migrated["date"] = derive_date(photo_path)
    return migrated


def apply_override(entry: dict, override: dict, filename: str) -> dict:
    merged = dict(entry)

    for key, value in override.items():
        if key in RESERVED_OVERRIDE_FIELDS or key == "src":
            continue

        merged[key] = value

    merged["src"] = f"photos/{filename}"
    return merged


def build_generated_entry(photo_path: Path) -> dict:
    dimensions = get_image_dimensions(photo_path)
    width = choose_display_width(dimensions)
    entry = {
        "src": f"photos/{photo_path.name}",
        "x": 0,
        "y": 0,
        "width": width,
        "title": derive_title(photo_path.stem),
        "date": derive_date(photo_path),
    }

    if dimensions is not None:
        source_width, source_height = dimensions

        if source_width > 0 and source_height > 0 and not is_default_landscape(dimensions):
            entry["height"] = source_height

    return entry


def estimate_spiral(entries: list[dict]) -> tuple[float, float]:
    if not entries:
        return 340.0, 2.4

    centers = []

    for index, entry in enumerate(entries):
        center_x = entry["x"] + entry["width"] / 2
        center_y = entry["y"] + get_display_height(entry) / 2
        centers.append((index, center_x, center_y))

    step_numerator = sum(math.sqrt(index + 1) * math.hypot(center_x, center_y) for index, center_x, center_y in centers)
    step_denominator = sum(index + 1 for index, *_ in centers)
    step = step_numerator / step_denominator if step_denominator else 340.0

    sin_total = 0.0
    cos_total = 0.0

    for index, center_x, center_y in centers:
        angle = math.atan2(center_y, center_x)
        diff = angle - index * GOLDEN_ANGLE
        sin_total += math.sin(diff)
        cos_total += math.cos(diff)

    offset = math.atan2(sin_total, cos_total)
    return step, offset


def generate_position(entry: dict, index: int, step: float, offset: float) -> tuple[int, int]:
    radius = step * math.sqrt(index + 1)
    angle = index * GOLDEN_ANGLE + offset
    center_x = radius * math.cos(angle)
    center_y = radius * math.sin(angle)
    width = entry["width"]
    height = get_display_height(entry)
    return round(center_x - width / 2), round(center_y - height / 2)


def get_display_height(entry: dict) -> float:
    source_height = entry.get("height")
    source_width = entry.get("width")

    if isinstance(source_height, (int, float)) and isinstance(source_width, (int, float)) and source_width > 0:
        return entry["width"] * (source_height / source_width)

    return DEFAULT_LANDSCAPE_HEIGHT if entry["width"] == DEFAULT_LANDSCAPE_WIDTH else entry["width"] * 0.75


def choose_display_width(dimensions: tuple[int, int] | None) -> int:
    if dimensions is None:
        return DEFAULT_LANDSCAPE_WIDTH

    source_width, source_height = dimensions
    return DEFAULT_PORTRAIT_WIDTH if source_height > source_width else DEFAULT_LANDSCAPE_WIDTH


def is_default_landscape(dimensions: tuple[int, int]) -> bool:
    source_width, source_height = dimensions
    return source_width > source_height and abs((source_height / source_width) - 0.75) < 0.01


def derive_title(stem: str) -> str:
    tokens = re.findall(r"\d+(?:st|nd|rd|th)?|[A-Z]?[a-z]+|[A-Z]+(?![a-z])", stem)

    if len(tokens) > 1 and tokens[-1].isdigit():
        suffix = int(tokens[-1])

        if suffix in ROMAN_NUMERALS and len(tokens[-1]) <= 2:
            tokens[-1] = ROMAN_NUMERALS[suffix]

    return " ".join(tokens)


def normalize_existing_entry(entry: dict) -> dict:
    normalized = dict(entry)
    title = normalized.get("title")

    if isinstance(title, str):
        normalized["title"] = re.sub(r"\b(\d+) (st|nd|rd|th)\b", r"\1\2", title)

    return normalized


def derive_date(photo_path: Path) -> str:
    mdls_date = get_mdls_creation_date(photo_path)

    if mdls_date is not None:
        return mdls_date

    modified_time = datetime.fromtimestamp(photo_path.stat().st_mtime, tz=timezone.utc)
    return modified_time.date().isoformat()


def get_mdls_creation_date(photo_path: Path) -> str | None:
    try:
        result = subprocess.run(
            ["mdls", "-raw", "-name", "kMDItemContentCreationDate", str(photo_path)],
            check=False,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        return None

    if result.returncode != 0:
        return None

    value = result.stdout.strip()

    if not value or value == "(null)":
        return None

    try:
        return datetime.strptime(value, "%Y-%m-%d %H:%M:%S %z").date().isoformat()
    except ValueError:
        return value.split(" ", maxsplit=1)[0]


def get_image_dimensions(photo_path: Path) -> tuple[int, int] | None:
    try:
        result = subprocess.run(
            ["sips", "-g", "pixelWidth", "-g", "pixelHeight", str(photo_path)],
            check=False,
            capture_output=True,
            text=True,
        )
    except FileNotFoundError:
        return None

    if result.returncode != 0:
        return None

    width = None
    height = None

    for line in result.stdout.splitlines():
        if "pixelWidth:" in line:
            width = int(line.split(":", maxsplit=1)[1].strip())
        elif "pixelHeight:" in line:
            height = int(line.split(":", maxsplit=1)[1].strip())

    if width is None or height is None:
        return None

    return width, height


if __name__ == "__main__":
    main()