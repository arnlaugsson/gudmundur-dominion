#!/usr/bin/env python3
"""
Make small WebP thumbnails of the card scans for grids and lists.

The originals in Firebase Storage (cards/{slug}.jpg) are ~700 KB scans; the
UI shows them at ~150-220 CSS px, so a 400 px wide WebP (2x for retina) is
~25 KB. The frontend loads cards-thumb/{slug}.webp and falls back to the
original when a thumbnail is missing (see src/components/CardImage.jsx).

Usage (Pillow is a local tool dependency, not needed by the sync):
    pip install pillow
    gsutil -m cp "gs://dominon-1e56c.firebasestorage.app/cards/*" /tmp/cards-orig/
    python3 scripts/make_card_thumbs.py /tmp/cards-orig /tmp/cards-thumb
    gsutil -m -h "Cache-Control:public, max-age=2592000" -h "Content-Type:image/webp" \\
        cp /tmp/cards-thumb/*.webp gs://dominon-1e56c.firebasestorage.app/cards-thumb/

Only missing or outdated thumbnails are regenerated, so re-running after new
cards are added is cheap.
"""

import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("Pillow is required: pip install pillow")

THUMB_WIDTH = 400
WEBP_QUALITY = 78
SOURCE_SUFFIXES = {".jpg", ".jpeg", ".png", ".webp"}


def thumb_path(source, out_dir):
    return out_dir / f"{source.stem}.webp"


def is_up_to_date(source, target):
    return target.exists() and target.stat().st_mtime >= source.stat().st_mtime


def make_thumb(source, target):
    with Image.open(source) as img:
        rgb = img.convert("RGB")
        if rgb.width > THUMB_WIDTH:
            height = round(rgb.height * THUMB_WIDTH / rgb.width)
            rgb = rgb.resize((THUMB_WIDTH, height), Image.LANCZOS)
        rgb.save(target, "WEBP", quality=WEBP_QUALITY, method=6)


def main(argv):
    if len(argv) != 3:
        sys.exit(f"Usage: {argv[0]} <originals-dir> <output-dir>")
    src_dir, out_dir = Path(argv[1]), Path(argv[2])
    if not src_dir.is_dir():
        sys.exit(f"Not a directory: {src_dir}")
    out_dir.mkdir(parents=True, exist_ok=True)

    sources = sorted(p for p in src_dir.iterdir() if p.suffix.lower() in SOURCE_SUFFIXES)
    made, skipped, failed = 0, 0, []
    for source in sources:
        target = thumb_path(source, out_dir)
        if is_up_to_date(source, target):
            skipped += 1
            continue
        try:
            make_thumb(source, target)
            made += 1
        except OSError as err:
            failed.append(f"{source.name}: {err}")

    print(f"Thumbnails: {made} made, {skipped} up to date, {len(failed)} failed")
    for line in failed:
        print(f"  FAILED {line}")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
