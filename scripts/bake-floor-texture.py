#!/usr/bin/env python3
"""Bake isometric floor-tile fixes into PNG assets.

Rotates plank direction and applies a 2:1 diamond alpha mask so textures
align with the Konva tile clip without runtime floorTextureRotation.

Usage:
  python scripts/bake-floor-texture.py public/floors/industrial-loft-floor-a.png \\
      public/floors/industrial-loft-floor-b.png
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw

# Match src/lib/iso.ts — 88×44 tile, image drawn as TILE_W square on canvas.
TILE_W = 88
TILE_H = 44


def iso_diamond_mask(size: int) -> Image.Image:
    """2:1 isometric diamond alpha mask centered in a square canvas."""
    half_w = size // 2
    half_h = round(size * TILE_H / TILE_W / 2)
    cx = cy = size // 2
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.polygon(
        [(cx, cy - half_h), (cx + half_w, cy), (cx, cy + half_h), (cx - half_w, cy)],
        fill=255,
    )
    return mask


def bake_floor_texture(path: Path, rotation_deg: float, size: int = 500) -> None:
    img = Image.open(path).convert("RGBA")
    if img.size != (size, size):
        img = img.resize((size, size), Image.Resampling.LANCZOS)

    # Konva floorTextureRotation -13 (CCW on screen) maps to PIL rotate(-13) here.
    rotated = img.rotate(
        rotation_deg,
        resample=Image.Resampling.BICUBIC,
        expand=False,
        fillcolor=(0, 0, 0, 0),
    )

    mask = iso_diamond_mask(size)
    r, g, b, a = rotated.split()
    a = Image.composite(a, Image.new("L", (size, size), 0), mask)
    baked = Image.merge("RGBA", (r, g, b, a))
    baked.save(path, optimize=True)
    print(f"baked {path}  rotation={rotation_deg:+.1f}°  mask=2:1 diamond")


def main() -> int:
    parser = argparse.ArgumentParser(description="Bake isometric floor texture alignment.")
    parser.add_argument("files", nargs="+", type=Path, help="PNG files to process in place")
    parser.add_argument(
        "--rotation",
        type=float,
        default=-13.0,
        help="PIL rotation in degrees (default -13 = former Konva floorTextureRotation -13)",
    )
    parser.add_argument("--size", type=int, default=500, help="Square canvas size")
    args = parser.parse_args()

    for path in args.files:
        if not path.is_file():
            print(f"skip missing file: {path}", file=sys.stderr)
            continue
        bake_floor_texture(path, args.rotation, args.size)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
