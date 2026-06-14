"""Extract the latest built-in imagegen two-view sprite sheet into object PNGs."""

from __future__ import annotations

import argparse
import os
import subprocess
import sys
from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
GENERATED = Path.home() / ".codex" / "generated_images"
TMP = ROOT / "tmp" / "imagegen"
OUT_DIR = ROOT / "public" / "objects"
REMOVER = Path.home() / ".codex" / "skills" / ".system" / "imagegen" / "scripts" / "remove_chroma_key.py"


def latest_generated() -> Path:
    files = sorted(GENERATED.rglob("*.png"), key=lambda p: p.stat().st_mtime, reverse=True)
    if not files:
        raise SystemExit(f"No generated PNGs found under {GENERATED}")
    return files[0]


def split_pair(alpha_path: Path, kind: str, max_size: int, pad: int) -> None:
    im = Image.open(alpha_path).convert("RGBA")
    w, h = im.size
    halves = [(0, 0, w // 2, h), (w // 2, 0, w, h)]
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for i, box in enumerate(halves):
        part = im.crop(box)
        bbox = part.getchannel("A").point(lambda v: 255 if v > 18 else 0).getbbox()
        if not bbox:
            raise SystemExit(f"No sprite content found for {kind} view {i}")

        x0 = max(0, bbox[0] - pad)
        y0 = max(0, bbox[1] - pad)
        x1 = min(part.width, bbox[2] + pad)
        y1 = min(part.height, bbox[3] + pad)
        crop = part.crop((x0, y0, x1, y1))

        canvas = Image.new("RGBA", (1024, 1024), (0, 0, 0, 0))
        crop.thumbnail((max_size, max_size), Image.Resampling.LANCZOS)
        canvas.alpha_composite(crop, ((1024 - crop.width) // 2, (1024 - crop.height) // 2))

        out = OUT_DIR / f"{kind}-{i}.png"
        canvas.save(out)
        print(f"wrote {out.relative_to(ROOT)} {canvas.getbbox()}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("kind")
    parser.add_argument("--max-size", type=int, default=900)
    parser.add_argument("--pad", type=int, default=75)
    args = parser.parse_args()

    source = latest_generated()
    TMP.mkdir(parents=True, exist_ok=True)
    work = TMP / f"{args.kind}-pair-source.png"
    alpha = TMP / f"{args.kind}-pair-alpha.png"
    work.write_bytes(source.read_bytes())

    subprocess.run(
        [
            sys.executable,
            str(REMOVER),
            "--input",
            str(work),
            "--out",
            str(alpha),
            "--auto-key",
            "border",
            "--soft-matte",
            "--transparent-threshold",
            "14",
            "--opaque-threshold",
            "220",
            "--despill",
        ],
        cwd=ROOT,
        check=True,
        env=os.environ.copy(),
    )
    split_pair(alpha, args.kind, args.max_size, args.pad)


if __name__ == "__main__":
    main()
