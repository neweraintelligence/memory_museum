#!/usr/bin/env python3
"""Generate floor and wall textures for the room architectural styles.

The output PNGs reuse the Industrial Loft floor/wall alpha masks so the editor
keeps the same isometric footprint, wall angle, and transparent bounds.

Visual target:
- soft 3/4 isometric object art, like the imported furniture references
- warm matte fills, cream highlights, caramel outlines, and restrained shadows
- flat floor surfaces that tile as one plane instead of raised individual pads
"""

from __future__ import annotations

import math
import random
from dataclasses import dataclass
from pathlib import Path
from typing import Callable

from PIL import Image, ImageChops, ImageDraw, ImageEnhance, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
FLOOR_MASKS = (
    ROOT / "public" / "floors" / "industrial-loft-floor-a.png",
    ROOT / "public" / "floors" / "industrial-loft-floor-b.png",
)
WALL_MASK_LEFT = ROOT / "public" / "walls" / "industrial-loft-wall-left-a.png"
WALL_MASK_RIGHT = ROOT / "public" / "walls" / "industrial-loft-wall-right-a.png"


RGBA = tuple[int, int, int, int]
Point = tuple[float, float]


@dataclass(frozen=True)
class StyleDef:
    slug: str
    floor_kind: str
    wall_kind: str
    floor_top: str
    floor_bottom: str
    wall_top: str
    wall_bottom: str
    accent: str
    dark: str
    light: str


STYLES: tuple[StyleDef, ...] = (
    StyleDef(
        "timeless-library",
        "dark-planks",
        "shelves",
        "#9a673e",
        "#67422c",
        "#7c5237",
        "#503424",
        "#d4aa5f",
        "#3b271c",
        "#f1cf95",
    ),
    StyleDef(
        "brutalist-atrium",
        "concrete",
        "concrete",
        "#cec8bb",
        "#aaa398",
        "#c9c3b8",
        "#ada69a",
        "#d66a4e",
        "#756e64",
        "#f1eadc",
    ),
    StyleDef(
        "tea-room",
        "tatami",
        "screens",
        "#e8d59b",
        "#ccb176",
        "#f6ecd8",
        "#dfd0b7",
        "#9b6f50",
        "#7b5b3d",
        "#fff7df",
    ),
    StyleDef(
        "futuristic-lab",
        "metal",
        "tech",
        "#7f91a6",
        "#4d5e73",
        "#71849d",
        "#435269",
        "#68d7f2",
        "#273344",
        "#d6f7ff",
    ),
    StyleDef(
        "enterprise-d",
        "enterprise-carpet",
        "enterprise-panels",
        "#b18f99",
        "#806873",
        "#9a5f60",
        "#6e4449",
        "#f1e6dd",
        "#372023",
        "#fff4e8",
    ),
    StyleDef(
        "courtroom",
        "oak-planks",
        "oak-panels",
        "#d09255",
        "#925c38",
        "#af7649",
        "#74482d",
        "#dfbb72",
        "#57351f",
        "#ffd996",
    ),
    StyleDef(
        "clinic",
        "clean-tiles",
        "clinic",
        "#eef2eb",
        "#cbded9",
        "#fbf6eb",
        "#d0e2de",
        "#5fbdb2",
        "#6f9993",
        "#fffefa",
    ),
    StyleDef(
        "greenhouse",
        "garden-tiles",
        "glass",
        "#c5a879",
        "#90785a",
        "#cfecd9",
        "#9bcdb0",
        "#73a85a",
        "#5e7f62",
        "#f5fff3",
    ),
    StyleDef(
        "beach-house",
        "honey-planks",
        "soft-panels",
        "#e8b66e",
        "#b97848",
        "#f4dec4",
        "#ddb894",
        "#cf7658",
        "#72452e",
        "#fff1d8",
    ),
    StyleDef(
        "marble-hall",
        "marble",
        "marble-blocks",
        "#f5eee3",
        "#d8d0c3",
        "#e8dfd3",
        "#c9bfb0",
        "#c0a15d",
        "#887f73",
        "#fffaf0",
    ),
    StyleDef(
        "gothic-belfry",
        "flagstone",
        "rough-stone",
        "#b4ac9f",
        "#90887c",
        "#a49d92",
        "#797166",
        "#caa86a",
        "#61584e",
        "#ded4c5",
    ),
    StyleDef(
        "private-study",
        "red-carpet",
        "walnut",
        "#8b3030",
        "#5d2022",
        "#765337",
        "#3e2819",
        "#ddb75f",
        "#24150f",
        "#f0c982",
    ),
)

EXCLUDED_STYLE_SLUGS = {"industrial-loft", "palace-ballroom", "private-study"}


class AlphaDraw:
    """ImageDraw wrapper that composites translucent strokes onto an RGBA image."""

    def __init__(self, img: Image.Image):
        self.img = img
        self.direct = ImageDraw.Draw(img)

    @staticmethod
    def _needs_layer(kwargs: dict) -> bool:
        for key in ("fill", "outline"):
            value = kwargs.get(key)
            if isinstance(value, tuple) and len(value) == 4 and value[3] < 255:
                return True
        return False

    def _call(self, method: str, *args, **kwargs) -> None:
        if self._needs_layer(kwargs):
            layer = Image.new("RGBA", self.img.size, (0, 0, 0, 0))
            getattr(ImageDraw.Draw(layer), method)(*args, **kwargs)
            self.img.alpha_composite(layer)
            return
        getattr(self.direct, method)(*args, **kwargs)

    def line(self, *args, **kwargs) -> None:
        self._call("line", *args, **kwargs)

    def polygon(self, *args, **kwargs) -> None:
        self._call("polygon", *args, **kwargs)

    def rectangle(self, *args, **kwargs) -> None:
        self._call("rectangle", *args, **kwargs)

    def rounded_rectangle(self, *args, **kwargs) -> None:
        self._call("rounded_rectangle", *args, **kwargs)

    def ellipse(self, *args, **kwargs) -> None:
        self._call("ellipse", *args, **kwargs)

    def arc(self, *args, **kwargs) -> None:
        self._call("arc", *args, **kwargs)

    def point(self, *args, **kwargs) -> None:
        self._call("point", *args, **kwargs)


def rgba(hex_color: str, alpha: int = 255) -> RGBA:
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
        alpha,
    )


def mix(a: RGBA, b: RGBA, t: float) -> RGBA:
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(4))  # type: ignore[return-value]


def shift(color: RGBA, amount: int, alpha: int | None = None) -> RGBA:
    return (
        max(0, min(255, color[0] + amount)),
        max(0, min(255, color[1] + amount)),
        max(0, min(255, color[2] + amount)),
        color[3] if alpha is None else alpha,
    )


def vertical_gradient(size: tuple[int, int], top: RGBA, bottom: RGBA) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size)
    draw = ImageDraw.Draw(img)
    for y in range(h):
        draw.line([(0, y), (w, y)], fill=mix(top, bottom, y / max(1, h - 1)))
    return img


def apply_soft_isometric_grade(img: Image.Image, light_hex: str, dark_hex: str) -> Image.Image:
    """Shift procedural textures toward the softer furniture-reference look."""
    w, h = img.size
    refined = img.resize((w * 2, h * 2), Image.Resampling.BICUBIC).resize((w, h), Image.Resampling.LANCZOS)
    refined = ImageEnhance.Color(refined).enhance(0.84)
    refined = ImageEnhance.Contrast(refined).enhance(0.86)
    refined = ImageEnhance.Brightness(refined).enhance(1.07)

    overlay = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    light = rgba(light_hex)
    dark = rgba(dark_hex)
    den = max(1, h - 1)
    for y in range(h):
        t = y / den
        highlight_alpha = int((1.0 - t) * 42)
        shadow_alpha = int((t**1.2) * 22)
        draw.line([(0, y), (w, y)], fill=(light[0], light[1], light[2], highlight_alpha))
        draw.line([(0, y), (w, y)], fill=(dark[0], dark[1], dark[2], shadow_alpha))
    cream = rgba("#fff8e9")
    draw.rectangle((0, 0, w, h), fill=(cream[0], cream[1], cream[2], 12))
    refined.alpha_composite(overlay)
    return refined


def apply_reference_alpha(img: Image.Image, mask_path: Path) -> Image.Image:
    reference_alpha = Image.open(mask_path).convert("RGBA").getchannel("A")
    alpha = img.getchannel("A")
    img.putalpha(ImageChops.multiply(alpha, reference_alpha))
    return img


def draw_alpha_outline(img: Image.Image, alpha: Image.Image, color: RGBA, width: int) -> None:
    dilated = alpha.filter(ImageFilter.MaxFilter(width * 2 + 1))
    eroded = alpha.filter(ImageFilter.MinFilter(width * 2 + 1))
    edge = ImageChops.subtract(dilated, eroded)
    edge = edge.point(lambda v: min(color[3], int(v * 1.4)))
    overlay = Image.new("RGBA", img.size, color[:3] + (0,))
    overlay.putalpha(edge)
    img.alpha_composite(overlay)


def floor_mapper(size: tuple[int, int]) -> Callable[[float, float], Point]:
    w, h = size
    top = (w / 2, 0.0)
    right = (w - 1.0, h / 2)
    left = (0.0, h / 2)

    def pt(u: float, v: float) -> Point:
        return (
            top[0] + (right[0] - top[0]) * u + (left[0] - top[0]) * v,
            top[1] + (right[1] - top[1]) * u + (left[1] - top[1]) * v,
        )

    return pt


def floor_quad(pt: Callable[[float, float], Point], u0: float, u1: float, v0: float, v1: float) -> list[Point]:
    return [pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)]


def floor_line(draw: AlphaDraw, pt: Callable[[float, float], Point], coords: list[tuple[float, float]], color: RGBA, width: int) -> None:
    draw.line([pt(u, v) for u, v in coords], fill=color, width=width)


def draw_floor_piece(
    draw: AlphaDraw,
    pt: Callable[[float, float], Point],
    u0: float,
    u1: float,
    v0: float,
    v1: float,
    fill: RGBA,
    style: StyleDef,
    rim_alpha: int = 105,
) -> None:
    """Draw one low-relief floor material piece in floor UV coordinates."""
    if u1 <= u0 or v1 <= v0:
        return
    q = floor_quad(pt, u0, u1, v0, v1)
    draw.polygon(q, fill=fill)
    soft_rim = min(70, max(18, round(rim_alpha * 0.48)))
    draw.line([q[0], q[1], q[2], q[3], q[0]], fill=rgba(style.dark, soft_rim), width=2)
    floor_line(draw, pt, [(u0 + 0.014, v0 + 0.014), (u1 - 0.014, v0 + 0.014)], rgba(style.light, 48), 2)
    floor_line(draw, pt, [(u0 + 0.014, v0 + 0.014), (u0 + 0.014, v1 - 0.014)], rgba(style.light, 30), 1)
    floor_line(draw, pt, [(u0 + 0.018, v1 - 0.018), (u1 - 0.018, v1 - 0.018)], rgba(style.dark, 24), 1)


def draw_floor_glint(
    draw: AlphaDraw,
    pt: Callable[[float, float], Point],
    u: float,
    v: float,
    scale: float,
    color: RGBA,
) -> None:
    floor_line(draw, pt, [(u, v), (u + 0.055 * scale, v + 0.018 * scale)], color, 2)


def draw_floor_grid(draw: AlphaDraw, pt: Callable[[float, float], Point], color: RGBA, step: float, width: int = 3) -> None:
    x = 0.0
    while x <= 1.001:
        floor_line(draw, pt, [(x, 0), (x, 1)], color, width)
        floor_line(draw, pt, [(0, x), (1, x)], color, width)
        x += step


def draw_floor_planks(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef, seed: int, dark: bool = False) -> None:
    random.seed(seed)
    base = rgba(style.floor_top)
    hi = rgba(style.light, 54 if dark else 64)
    step = 0.13
    for j in range(-1, 10):
        v0 = j * step
        v1 = v0 + step * 0.82
        offset = 0.0 if j % 2 else step * 0.52
        i = -2
        while i < 10:
            u0 = i * step * 1.55 + offset
            u1 = u0 + step * 1.36
            fill = shift(base, random.randint(-14, 16))
            draw_floor_piece(draw, pt, u0, u1, v0, v1, fill, style, rim_alpha=120)
            floor_line(draw, pt, [(u0 + 0.07, (v0 + v1) / 2), (u1 - 0.07, (v0 + v1) / 2 + random.uniform(-0.006, 0.006))], hi, 1)
            if random.random() > 0.84:
                c = pt((u0 + u1) / 2, (v0 + v1) / 2)
                draw.ellipse((c[0] - 7, c[1] - 2, c[0] + 7, c[1] + 2), outline=rgba(style.dark, 34), width=1)
            i += 1


def draw_tatami(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef) -> None:
    mat = rgba("#d9c486")
    edge = rgba("#7b6138", 180)
    green = rgba("#6d7b58", 135)
    for i in range(3):
        for j in range(3):
            u0 = i / 3
            u1 = (i + 1) / 3
            v0 = j / 3
            v1 = (j + 1) / 3
            draw_floor_piece(draw, pt, u0 + 0.006, u1 - 0.006, v0 + 0.006, v1 - 0.006, shift(mat, (i + j) * 5 - 7), style, rim_alpha=90)
            draw.line(floor_quad(pt, u0 + 0.012, u1 - 0.012, v0 + 0.012, v1 - 0.012) + [pt(u0 + 0.012, v0 + 0.012)], fill=edge, width=3)
            floor_line(draw, pt, [(u0 + 0.03, v0 + 0.5 * (v1 - v0)), (u1 - 0.03, v0 + 0.5 * (v1 - v0))], green, 2)
            for k in range(3):
                floor_line(draw, pt, [(u0 + 0.04, v0 + 0.12 + k * 0.07), (u1 - 0.04, v0 + 0.12 + k * 0.07)], rgba("#f4e6b7", 35), 1)


def draw_clean_tiles(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef) -> None:
    for i in range(4):
        for j in range(4):
            u0, u1 = i / 4 + 0.006, (i + 1) / 4 - 0.006
            v0, v1 = j / 4 + 0.006, (j + 1) / 4 - 0.006
            draw_floor_piece(draw, pt, u0, u1, v0, v1, shift(rgba(style.floor_top), ((i + j) % 2) * -6), style, rim_alpha=95)
            if (i + j) % 3 == 0:
                draw_floor_glint(draw, pt, i / 4 + 0.07, j / 4 + 0.06, 1.0, rgba("#ffffff", 88))


def draw_concrete(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef, seed: int) -> None:
    random.seed(seed)
    for i in range(3):
        for j in range(3):
            u0, u1 = i / 3 + 0.008, (i + 1) / 3 - 0.008
            v0, v1 = j / 3 + 0.008, (j + 1) / 3 - 0.008
            draw_floor_piece(draw, pt, u0, u1, v0, v1, shift(rgba(style.floor_top), random.randint(-9, 8)), style, rim_alpha=68)
            if random.random() > 0.45:
                floor_line(draw, pt, [(u0 + 0.08, v0 + 0.1), (u0 + 0.16, v0 + 0.16), (u0 + 0.21, v0 + 0.12)], rgba(style.dark, 58), 2)
    for _ in range(30):
        p = pt(random.random(), random.random())
        draw.point((round(p[0]), round(p[1])), fill=rgba(style.dark, 32))


def draw_metal(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef) -> None:
    for i in range(4):
        for j in range(4):
            u0, u1 = i / 4 + 0.007, (i + 1) / 4 - 0.007
            v0, v1 = j / 4 + 0.007, (j + 1) / 4 - 0.007
            draw_floor_piece(draw, pt, u0, u1, v0, v1, shift(rgba(style.floor_top), ((i + j) % 2) * -8), style, rim_alpha=120)
            cx = (i + 0.5) / 4
            cy = (j + 0.5) / 4
            floor_line(draw, pt, [(cx - 0.055, cy), (cx + 0.055, cy)], rgba(style.light, 78), 2)
            for du, dv in [(-0.09, -0.09), (0.09, -0.09), (-0.09, 0.09), (0.09, 0.09)]:
                p = pt(cx + du, cy + dv)
                draw.ellipse((p[0] - 2, p[1] - 2, p[0] + 2, p[1] + 2), fill=rgba(style.accent, 120))
    floor_line(draw, pt, [(0.08, 0.12), (0.92, 0.12)], rgba(style.accent, 62), 3)
    floor_line(draw, pt, [(0.12, 0.88), (0.88, 0.88)], rgba(style.accent, 46), 2)


def draw_enterprise_carpet(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef) -> None:
    carpet = rgba("#a98a94")
    panel = rgba("#b3949d")
    seam = rgba("#6f5962", 54)
    pale = rgba("#ead9d3", 46)
    shadow = rgba("#59444d", 36)

    # Soft TNG-style pink carpet: broad continuous panels with fine woven texture.
    for i in range(4):
        for j in range(4):
            u0, u1 = i / 4 + 0.004, (i + 1) / 4 - 0.004
            v0, v1 = j / 4 + 0.004, (j + 1) / 4 - 0.004
            fill = shift(panel if (i + j) % 2 == 0 else carpet, random.randint(-3, 3), 238)
            draw_floor_piece(draw, pt, u0, u1, v0, v1, fill, style, rim_alpha=34)

    for t in [0.25, 0.5, 0.75]:
        floor_line(draw, pt, [(0.06, t), (0.94, t)], seam, 1)
        floor_line(draw, pt, [(t, 0.06), (t, 0.94)], seam, 1)

    weave = 0.065
    t = 0.08
    while t < 0.94:
        floor_line(draw, pt, [(0.08, t), (0.92, t + 0.004)], rgba("#e0c5ca", 20), 1)
        floor_line(draw, pt, [(t, 0.08), (t + 0.004, 0.92)], rgba("#725760", 18), 1)
        t += weave

    draw.polygon(floor_quad(pt, 0.12, 0.88, 0.42, 0.58), fill=rgba("#c0a0aa", 28))
    draw.polygon(floor_quad(pt, 0.42, 0.58, 0.12, 0.88), fill=rgba("#8d707b", 22))
    floor_line(draw, pt, [(0.14, 0.42), (0.86, 0.42)], pale, 1)
    floor_line(draw, pt, [(0.14, 0.59), (0.86, 0.59)], shadow, 1)


def draw_marble(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef, seed: int) -> None:
    random.seed(seed)
    for i in range(4):
        for j in range(4):
            draw_floor_piece(draw, pt, i / 4 + 0.006, (i + 1) / 4 - 0.006, j / 4 + 0.006, (j + 1) / 4 - 0.006, shift(rgba(style.floor_top), random.randint(-5, 5)), style, rim_alpha=55)
    for _ in range(16):
        start_u = random.uniform(-0.1, 0.9)
        start_v = random.uniform(0, 1)
        coords = []
        for k in range(5):
            coords.append((start_u + k * 0.08, start_v + math.sin(k + seed) * 0.025 + random.uniform(-0.04, 0.04)))
        floor_line(draw, pt, coords, rgba("#8f887d", 85), 2)
    floor_line(draw, pt, [(0.16, 0.16), (0.52, 0.24)], rgba("#ffffff", 130), 3)


def draw_flagstone(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef, seed: int) -> None:
    random.seed(seed)
    for i in range(4):
        for j in range(4):
            u0 = i / 4 + random.uniform(0.0, 0.015)
            u1 = (i + 1) / 4 - random.uniform(0.0, 0.015)
            v0 = j / 4 + random.uniform(0.0, 0.015)
            v1 = (j + 1) / 4 - random.uniform(0.0, 0.015)
            draw_floor_piece(draw, pt, u0, u1, v0, v1, shift(rgba(style.floor_top), random.randint(-10, 9)), style, rim_alpha=80)
    for _ in range(10):
        u = random.random()
        v = random.random()
        floor_line(draw, pt, [(u, v), (u + random.uniform(-0.08, 0.08), v + random.uniform(-0.05, 0.06))], rgba(style.dark, 60), 2)


def draw_red_carpet(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef) -> None:
    border_outer = floor_quad(pt, 0.08, 0.92, 0.08, 0.92)
    border_inner = floor_quad(pt, 0.15, 0.85, 0.15, 0.85)
    draw.line(border_outer + [border_outer[0]], fill=rgba(style.accent, 160), width=8)
    draw.line(border_inner + [border_inner[0]], fill=rgba(style.accent, 90), width=3)
    for t in [0.25, 0.5, 0.75]:
        floor_line(draw, pt, [(0.12, t), (0.88, t)], rgba("#b84d4d", 50), 2)
        floor_line(draw, pt, [(t, 0.12), (t, 0.88)], rgba("#4d1d1e", 60), 2)


def draw_garden_tiles(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef, seed: int) -> None:
    random.seed(seed)
    for i in range(4):
        for j in range(4):
            draw_floor_piece(draw, pt, i / 4 + 0.006, (i + 1) / 4 - 0.006, j / 4 + 0.006, (j + 1) / 4 - 0.006, shift(rgba(style.floor_top), random.randint(-8, 7)), style, rim_alpha=72)
    for _ in range(24):
        p = pt(random.random(), random.random())
        draw.ellipse((p[0] - 3, p[1] - 2, p[0] + 4, p[1] + 3), fill=rgba(style.accent, random.randint(35, 78)))


def draw_floor_surface_finish(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef, variant: int) -> None:
    """Subtle shared finish: cream catchlight, tiny matte specks, soft plane edges."""
    random.seed(1091 + variant + len(style.slug))
    floor_line(draw, pt, [(0.08, 0.08), (0.48, 0.16)], rgba(style.light, 38), 2)
    floor_line(draw, pt, [(0.12, 0.18), (0.32, 0.23)], rgba("#fff8e8", 28), 1)
    floor_line(draw, pt, [(0.08, 0.92), (0.92, 0.92)], rgba(style.dark, 18), 1)
    for _ in range(16):
        p = pt(random.random(), random.random())
        if random.random() < 0.5:
            draw.point((round(p[0]), round(p[1])), fill=rgba(style.light, 24))
        else:
            draw.point((round(p[0]), round(p[1])), fill=rgba(style.dark, 18))


def draw_floor(style: StyleDef, mask_path: Path, out_path: Path, variant: int) -> None:
    mask = Image.open(mask_path).convert("RGBA").getchannel("A")
    img = vertical_gradient(mask.size, rgba(style.floor_top), rgba(style.floor_bottom))
    draw = AlphaDraw(img)
    pt = floor_mapper(mask.size)

    if style.floor_kind in {"dark-planks", "oak-planks", "honey-planks"}:
        draw_floor_planks(draw, pt, style, seed=variant + len(style.slug), dark=style.floor_kind == "dark-planks")
    elif style.floor_kind == "tatami":
        draw_tatami(draw, pt, style)
    elif style.floor_kind == "clean-tiles":
        draw_clean_tiles(draw, pt, style)
    elif style.floor_kind == "concrete":
        draw_concrete(draw, pt, style, seed=variant + 2)
    elif style.floor_kind == "metal":
        draw_metal(draw, pt, style)
    elif style.floor_kind == "enterprise-carpet":
        draw_enterprise_carpet(draw, pt, style)
    elif style.floor_kind == "marble":
        draw_marble(draw, pt, style, seed=variant + 3)
    elif style.floor_kind == "flagstone":
        draw_flagstone(draw, pt, style, seed=variant + 4)
    elif style.floor_kind == "red-carpet":
        draw_red_carpet(draw, pt, style)
    elif style.floor_kind == "garden-tiles":
        draw_garden_tiles(draw, pt, style, seed=variant + 5)

    draw_floor_surface_finish(draw, pt, style, variant)
    top = (mask.size[0] / 2, 0)
    right = (mask.size[0] - 1, mask.size[1] / 2)
    bottom = (mask.size[0] / 2, mask.size[1] - 1)
    left = (0, mask.size[1] / 2)
    draw.line([left, top, right], fill=rgba(style.light, 34), width=2)
    draw.line([left, bottom, right], fill=rgba(style.dark, 30), width=2, joint="curve")
    img = apply_soft_isometric_grade(img, style.light, style.dark)
    img = apply_reference_alpha(img, mask_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, optimize=True)


def wall_edges(alpha: Image.Image) -> tuple[Point, Point, Point, Point]:
    w, h = alpha.size

    def first_y(x: int) -> int:
        for y in range(h):
            if alpha.getpixel((x, y)) > 0:
                return y
        return 0

    def last_y(x: int) -> int:
        for y in range(h - 1, -1, -1):
            if alpha.getpixel((x, y)) > 0:
                return y
        return h - 1

    return (0, first_y(0)), (w - 1, first_y(w - 1)), (0, last_y(0)), (w - 1, last_y(w - 1))


def wall_mapper(alpha: Image.Image) -> Callable[[float, float], Point]:
    tl, tr, bl, _br = wall_edges(alpha)

    def pt(u: float, v: float) -> Point:
        return (
            tl[0] + (tr[0] - tl[0]) * u + (bl[0] - tl[0]) * v,
            tl[1] + (tr[1] - tl[1]) * u + (bl[1] - tl[1]) * v,
        )

    return pt


def wall_quad(pt: Callable[[float, float], Point], u0: float, u1: float, v0: float, v1: float) -> list[Point]:
    return [pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)]


def wall_line(draw: AlphaDraw, pt: Callable[[float, float], Point], coords: list[tuple[float, float]], color: RGBA, width: int) -> None:
    draw.line([pt(u, v) for u, v in coords], fill=color, width=width)


def wall_band(draw: AlphaDraw, pt: Callable[[float, float], Point], v0: float, v1: float, color: RGBA) -> None:
    draw.polygon(wall_quad(pt, 0, 1, v0, v1), fill=color)


def wall_side_depth(draw: AlphaDraw, pt: Callable[[float, float], Point], side: str, style: StyleDef) -> None:
    if side == "left":
        draw.polygon(wall_quad(pt, 0.0, 0.075, 0, 1), fill=rgba(style.dark, 50))
        wall_line(draw, pt, [(0.08, 0), (0.08, 1)], rgba(style.light, 32), 2)
    else:
        draw.polygon(wall_quad(pt, 0.925, 1.0, 0, 1), fill=rgba(style.dark, 50))
        wall_line(draw, pt, [(0.92, 0), (0.92, 1)], rgba(style.light, 32), 2)


def wall_cap(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef) -> None:
    wall_band(draw, pt, 0, 0.032, rgba(style.light, 150))
    wall_line(draw, pt, [(0, 0.037), (1, 0.037)], rgba(style.dark, 92), 3)


def wall_panel(draw: AlphaDraw, pt: Callable[[float, float], Point], u0: float, u1: float, v0: float, v1: float, fill: RGBA, style: StyleDef) -> None:
    panel = wall_quad(pt, u0, u1, v0, v1)
    inset = wall_quad(pt, u0 + 0.025, u1 - 0.025, v0 + 0.045, v1 - 0.045)
    draw.polygon(panel, fill=fill)
    draw.line(panel + [panel[0]], fill=rgba(style.dark, 98), width=3)
    draw.line(inset + [inset[0]], fill=rgba(style.light, 76), width=2)


def draw_wall_shelves(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef) -> None:
    random.seed(7343)
    case_fill = rgba("#9e6840", 238)
    case_mid = rgba("#b87949", 232)
    case_light = rgba("#f2c57c", 132)
    case_shadow = rgba("#3f2819", 138)
    recess = rgba("#563624", 220)

    def book3d(u0: float, u1: float, v0: float, v1: float, color_hex: str) -> None:
        """Draw a small spine as a chunky isometric volume inside the wall plane."""
        color = rgba(color_hex, 232)
        top_h = min(0.018, max(0.009, (v1 - v0) * 0.18))
        side_w = min(0.01, max(0.004, (u1 - u0) * 0.28))
        shadow = wall_quad(pt, u0 + 0.005, u1 + 0.005, v0 + 0.008, v1 + 0.008)
        front = wall_quad(pt, u0, u1, v0, v1)
        top = wall_quad(pt, u0, u1, v0, v0 + top_h)
        side = wall_quad(pt, u1 - side_w, u1, v0 + top_h * 0.25, v1)
        lower = wall_quad(pt, u0, u1, v1 - 0.008, v1)
        draw.polygon(shadow, fill=rgba("#120b08", 38))
        draw.polygon(front, fill=color)
        draw.polygon(top, fill=shift(color, 42, 205))
        draw.polygon(side, fill=shift(color, -38, 210))
        draw.polygon(lower, fill=shift(color, -25, 90))
        draw.line(front + [front[0]], fill=rgba("#1d120d", 54), width=1)
        if u1 - u0 > 0.018:
            wall_line(
                draw,
                pt,
                [(u0 + (u1 - u0) * 0.32, v0 + top_h + 0.012), (u0 + (u1 - u0) * 0.32, v1 - 0.015)],
                rgba("#fff0c7", 48),
                1,
            )

    # A single built-in bookcase mass first, so it reads as furniture rather
    # than books floating on wallpaper.
    outer = wall_quad(pt, 0.035, 0.965, 0.105, 0.93)
    inner = wall_quad(pt, 0.075, 0.925, 0.15, 0.855)
    draw.polygon(outer, fill=case_fill)
    draw.line(outer + [outer[0]], fill=case_shadow, width=4)
    draw.line(wall_quad(pt, 0.045, 0.955, 0.115, 0.13), fill=case_light, width=4)
    draw.line(wall_quad(pt, 0.045, 0.955, 0.92, 0.93), fill=rgba("#1a0f0a", 62), width=3)
    draw.polygon(inner, fill=recess)

    # Vertical case uprights between bays. These stay constant-u, matching the
    # reference wall perspective while giving the shelves real structure.
    for u in [0.07, 0.285, 0.5, 0.715, 0.93]:
        draw.polygon(wall_quad(pt, u - 0.015, u + 0.015, 0.13, 0.885), fill=case_mid)
        wall_line(draw, pt, [(u - 0.017, 0.13), (u - 0.017, 0.885)], case_shadow, 2)
        wall_line(draw, pt, [(u + 0.013, 0.13), (u + 0.013, 0.885)], case_light, 1)

    shelf_vs = [0.205, 0.385, 0.565, 0.745, 0.84]
    for v in shelf_vs:
        draw.polygon(wall_quad(pt, 0.055, 0.945, v - 0.014, v + 0.017), fill=case_mid)
        wall_line(draw, pt, [(0.055, v - 0.017), (0.945, v - 0.017)], case_light, 4)
        wall_line(draw, pt, [(0.055, v + 0.02), (0.945, v + 0.02)], case_shadow, 3)

    # Bottom plinth/cupboard band, inspired by the warm wood furniture refs.
    draw.polygon(wall_quad(pt, 0.055, 0.945, 0.84, 0.92), fill=rgba("#6e4127", 238))
    for u0 in [0.105, 0.32, 0.535, 0.75]:
        wall_panel(draw, pt, u0, u0 + 0.13, 0.858, 0.905, rgba("#8a522f", 214), style)

    book_colors = [
        "#b75d42",
        "#5f866e",
        "#6c82ac",
        "#d19b50",
        "#8b64a4",
        "#c97856",
        "#dfc47a",
        "#7ca19a",
    ]
    row_tops = [0.235, 0.415, 0.595]
    bay_ranges = [(0.095, 0.265), (0.315, 0.475), (0.53, 0.69), (0.745, 0.9)]
    for row, v0 in enumerate(row_tops):
        v_bottom = shelf_vs[row + 1] - 0.022 if row + 1 < len(shelf_vs) else 0.805
        for bay, (bay_u0, bay_u1) in enumerate(bay_ranges):
            u = bay_u0 + random.uniform(0.008, 0.02)
            while u < bay_u1 - 0.012:
                if random.random() < 0.2:
                    u += random.uniform(0.018, 0.038)
                    continue
                width = random.uniform(0.02, 0.038)
                height = random.uniform(0.07, min(0.128, max(0.074, v_bottom - v0 - 0.012)))
                if u + width > bay_u1:
                    break
                color = book_colors[(row * 5 + bay * 3 + int(u * 100)) % len(book_colors)]
                book3d(u, u + width, v_bottom - height, v_bottom, color)
                u += width + random.uniform(0.01, 0.02)

            # A few horizontal book stacks break up the barcode effect.
            if (row + bay) % 2 == 0:
                stack_u0 = bay_u0 + random.uniform(0.015, 0.07)
                stack_w = random.uniform(0.06, 0.095)
                for k in range(3):
                    vv = v_bottom - 0.012 - k * 0.015
                    stack_color = book_colors[(row + bay + k) % len(book_colors)]
                    book3d(stack_u0, min(bay_u1, stack_u0 + stack_w), vv - 0.011, vv, stack_color)


def draw_wall_concrete(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef, seed: int) -> None:
    random.seed(seed)
    for i in range(3):
        for j in range(3):
            u0, u1 = i / 3 + 0.008, (i + 1) / 3 - 0.008
            v0, v1 = 0.07 + j * 0.285, 0.07 + (j + 1) * 0.285 - 0.01
            panel = wall_quad(pt, u0, u1, v0, v1)
            draw.polygon(panel, fill=shift(rgba(style.wall_top), random.randint(-6, 6), 214))
            draw.line(panel + [panel[0]], fill=rgba(style.dark, 46), width=2)
            wall_line(draw, pt, [(u0 + 0.02, v0 + 0.02), (u1 - 0.02, v0 + 0.02)], rgba(style.light, 42), 1)
    for u in [0.18, 0.5, 0.82]:
        for v in [0.2, 0.52, 0.84]:
            p = pt(u, v)
            draw.ellipse((p[0] - 3, p[1] - 3, p[0] + 3, p[1] + 3), fill=rgba(style.dark, 42))
    for _ in range(7):
        u = random.random()
        v = random.random()
        coords = [(u, v)]
        for _i in range(3):
            u += random.uniform(-0.06, 0.06)
            v += random.uniform(-0.05, 0.05)
            coords.append((u, v))
        wall_line(draw, pt, coords, rgba(style.dark, 42), 1)


def draw_wall_screens(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef) -> None:
    frame = rgba(style.dark, 136)
    for u in [0.08, 0.255, 0.43, 0.605, 0.78, 0.93]:
        wall_line(draw, pt, [(u, 0.04), (u, 0.96)], frame, 4)
        wall_line(draw, pt, [(u + 0.012, 0.04), (u + 0.012, 0.96)], rgba(style.light, 42), 1)
    for v in [0.16, 0.36, 0.56, 0.76, 0.94]:
        wall_line(draw, pt, [(0.05, v), (0.95, v)], frame, 4)
        wall_line(draw, pt, [(0.05, v - 0.01), (0.95, v - 0.01)], rgba(style.light, 42), 1)
    for u in [0.165, 0.335, 0.505, 0.675, 0.845]:
        wall_line(draw, pt, [(u, 0.04), (u, 0.96)], rgba(style.light, 48), 1)


def draw_wall_tech(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef) -> None:
    for i in range(4):
        for j in range(4):
            u0, u1 = i / 4 + 0.018, (i + 1) / 4 - 0.018
            v0, v1 = 0.08 + j * 0.21, 0.08 + (j + 1) * 0.21 - 0.018
            panel = wall_quad(pt, u0, u1, v0, v1)
            draw.polygon(panel, fill=rgba("#43556e", 96))
            draw.line(panel + [panel[0]], fill=rgba("#132135", 76), width=2)
            wall_line(draw, pt, [(u0 + 0.012, v0 + 0.014), (u1 - 0.012, v0 + 0.014)], rgba(style.light, 36), 1)
    wall_line(draw, pt, [(0.08, 0.25), (0.58, 0.25), (0.58, 0.42), (0.9, 0.42)], rgba(style.accent, 116), 3)
    wall_line(draw, pt, [(0.12, 0.72), (0.44, 0.72), (0.44, 0.58), (0.82, 0.58)], rgba(style.accent, 82), 2)
    for u, v in [(0.22, 0.25), (0.58, 0.42), (0.44, 0.72), (0.82, 0.58)]:
        p = pt(u, v)
        draw.ellipse((p[0] - 4, p[1] - 4, p[0] + 4, p[1] + 4), fill=rgba(style.accent, 126))


def draw_wall_enterprise(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef) -> None:
    rose = rgba("#815052", 226)
    rose_dark = rgba("#5f373d", 228)
    rose_mid = rgba("#8f5b5b", 218)
    trim = rgba("#eadbd0", 216)
    light_strip = rgba("#fff7ee", 232)
    seam = rgba("#2f1c20", 78)
    highlight = rgba("#d4b0aa", 56)

    wall_band(draw, pt, 0.045, 0.13, rgba("#4c2528", 232))
    wall_band(draw, pt, 0.13, 0.86, rose)
    wall_band(draw, pt, 0.86, 0.94, trim)

    # Bright horizontal light bands near the ceiling, matching the reference room.
    wall_band(draw, pt, 0.072, 0.092, light_strip)
    wall_band(draw, pt, 0.112, 0.122, rgba("#f7eee8", 210))
    wall_line(draw, pt, [(0.035, 0.101), (0.965, 0.101)], rgba("#1d1114", 122), 2)

    # Vertical rose wall modules, all in wall-plane coordinates.
    for idx, u in enumerate([0.08, 0.2, 0.32, 0.44, 0.56, 0.68, 0.8, 0.92]):
        panel_color = rose_mid if idx % 2 else rose
        draw.polygon(wall_quad(pt, u - 0.052, u + 0.048, 0.15, 0.82), fill=panel_color)
        wall_line(draw, pt, [(u - 0.052, 0.15), (u - 0.052, 0.82)], seam, 2)
        wall_line(draw, pt, [(u + 0.048, 0.16), (u + 0.048, 0.82)], rgba("#ba8580", 44), 1)
        wall_line(draw, pt, [(u - 0.036, 0.19), (u - 0.036, 0.78)], highlight, 1)

    # Door/window-like light-gray insets from the reference, used sparingly.
    inset_specs = [(0.12, 0.28, 0.22, 0.58), (0.66, 0.84, 0.2, 0.62)]
    for idx, (u0, u1, v0, v1) in enumerate(inset_specs):
        outer = wall_quad(pt, u0, u1, v0, v1)
        inner = wall_quad(pt, u0 + 0.018, u1 - 0.018, v0 + 0.024, v1 - 0.024)
        draw.polygon(outer, fill=rgba("#e1d7cf", 186))
        draw.line(outer + [outer[0]], fill=rgba("#3d2928", 84), width=2)
        draw.polygon(inner, fill=rgba("#1b171a" if idx == 0 else "#b8b5b7", 210))
        if idx == 1:
            wall_line(draw, pt, [(u0 + 0.09, v0 + 0.04), (u0 + 0.09, v1 - 0.04)], rgba("#788084", 92), 2)

    wall_line(draw, pt, [(0.04, 0.835), (0.96, 0.835)], rgba("#fff3e4", 104), 3)
    wall_line(draw, pt, [(0.04, 0.865), (0.96, 0.865)], rgba("#3b2425", 72), 2)

    # Low dark furniture/console accent so the walls still read as starship interiors.
    console = wall_quad(pt, 0.08, 0.46, 0.68, 0.8)
    draw.polygon(console, fill=rgba("#1c1518", 116))
    wall_line(draw, pt, [(0.08, 0.68), (0.46, 0.68)], rgba("#6e2525", 112), 3)


def draw_wall_wood_panels(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef, soft: bool = False) -> None:
    chair = 0.58 if soft else 0.5
    wall_band(draw, pt, chair, 1, rgba(style.floor_top if soft else style.wall_bottom, 220))
    wall_line(draw, pt, [(0, chair - 0.024), (1, chair - 0.024)], rgba(style.light, 104), 4)
    wall_line(draw, pt, [(0, chair + 0.014), (1, chair + 0.014)], rgba(style.dark, 84), 3)
    count = 5
    for i in range(count):
        wall_panel(draw, pt, i / count + 0.035, (i + 1) / count - 0.035, chair + 0.08, 0.9, rgba(style.floor_bottom, 210), style)
    for u in [0.14, 0.3, 0.46, 0.62, 0.78, 0.94]:
        wall_line(draw, pt, [(u, chair + 0.04), (u + 0.05, 0.92)], rgba(style.light, 32), 1)


def draw_wall_clinic(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef) -> None:
    wall_band(draw, pt, 0.52, 0.6, rgba(style.accent, 104))
    wall_line(draw, pt, [(0, 0.515), (1, 0.515)], rgba("#ffffff", 120), 2)
    wall_line(draw, pt, [(0, 0.605), (1, 0.605)], rgba(style.dark, 42), 2)
    for i in range(5):
        u0, u1 = i / 5 + 0.01, (i + 1) / 5 - 0.01
        panel = wall_quad(pt, u0, u1, 0.63, 0.91)
        draw.line(panel + [panel[0]], fill=rgba(style.dark, 28), width=1)
        wall_line(draw, pt, [(u0 + 0.02, 0.65), (u1 - 0.02, 0.65)], rgba("#ffffff", 52), 1)
    wall_band(draw, pt, 0.9, 0.94, rgba(style.dark, 44))


def draw_wall_glass(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef) -> None:
    for u in [0.08, 0.25, 0.42, 0.59, 0.76, 0.93]:
        wall_line(draw, pt, [(u, 0.04), (u, 0.96)], rgba(style.dark, 112), 4)
    for v in [0.2, 0.4, 0.6, 0.8]:
        wall_line(draw, pt, [(0.05, v), (0.95, v)], rgba(style.dark, 108), 4)
    for u in [0.18, 0.52, 0.82]:
        wall_line(draw, pt, [(u - 0.06, 0.18), (u + 0.04, 0.08)], rgba("#ffffff", 88), 3)
        wall_line(draw, pt, [(u - 0.04, 0.5), (u + 0.08, 0.36)], rgba("#ffffff", 62), 2)
    wall_band(draw, pt, 0.88, 0.96, rgba("#6e8255", 128))
    wall_line(draw, pt, [(0, 0.875), (1, 0.875)], rgba("#eaffee", 58), 2)


def draw_wall_stone(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef, seed: int, marble: bool = False) -> None:
    random.seed(seed)
    courses = 7 if not marble else 5
    for r in range(courses + 1):
        v = 0.06 + r * 0.88 / courses
        wall_line(draw, pt, [(0.03, v), (0.97, v)], rgba(style.dark, 92 if not marble else 70), 3 if not marble else 2)
    for r in range(courses):
        count = 4 if marble else 5
        offset = 0.1 if r % 2 else 0
        for i in range(count):
            u = (i + offset) / count
            if 0.04 < u < 0.96:
                wall_line(draw, pt, [(u, 0.06 + r * 0.88 / courses), (u, 0.06 + (r + 1) * 0.88 / courses)], rgba(style.dark, 80 if not marble else 58), 3 if not marble else 2)
    if marble:
        for _ in range(18):
            u = random.random()
            v = random.random()
            wall_line(draw, pt, [(u, v), (u + random.uniform(-0.08, 0.1), v + random.uniform(-0.04, 0.05))], rgba("#857d71", 52), 1)
    else:
        for _ in range(40):
            p = pt(random.random(), random.random())
            draw.point((round(p[0]), round(p[1])), fill=rgba(style.dark, 34))


def draw_wall_walnut(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef) -> None:
    for u in [i / 9 for i in range(1, 9)]:
        wall_line(draw, pt, [(u, 0.04), (u, 0.96)], rgba(style.dark, 84), 2)
        wall_line(draw, pt, [(u + 0.01, 0.04), (u + 0.01, 0.96)], rgba(style.light, 34), 1)
    for v in [0.22, 0.52, 0.84]:
        wall_line(draw, pt, [(0.04, v), (0.96, v)], rgba(style.dark, 78), 3)
    for i in range(4):
        wall_panel(draw, pt, i / 4 + 0.045, (i + 1) / 4 - 0.045, 0.56, 0.84, rgba("#6c482d", 205), style)


def draw_wall_surface_finish(draw: AlphaDraw, pt: Callable[[float, float], Point], style: StyleDef) -> None:
    wall_line(draw, pt, [(0.06, 0.07), (0.58, 0.07)], rgba(style.light, 42), 2)
    wall_line(draw, pt, [(0.08, 0.13), (0.28, 0.13)], rgba("#fff8e8", 28), 1)
    wall_line(draw, pt, [(0.06, 0.94), (0.94, 0.94)], rgba(style.dark, 38), 2)


def draw_wall(style: StyleDef, mask_path: Path, out_path: Path, side: str) -> None:
    mask = Image.open(mask_path).convert("RGBA").getchannel("A")
    img = vertical_gradient(mask.size, rgba(style.wall_top), rgba(style.wall_bottom))
    draw = AlphaDraw(img)
    pt = wall_mapper(mask)

    if style.wall_kind == "shelves":
        draw_wall_shelves(draw, pt, style)
    elif style.wall_kind == "concrete":
        draw_wall_concrete(draw, pt, style, seed=len(style.slug))
    elif style.wall_kind == "screens":
        draw_wall_screens(draw, pt, style)
    elif style.wall_kind == "tech":
        draw_wall_tech(draw, pt, style)
    elif style.wall_kind == "enterprise-panels":
        draw_wall_enterprise(draw, pt, style)
    elif style.wall_kind == "oak-panels":
        draw_wall_wood_panels(draw, pt, style)
    elif style.wall_kind == "clinic":
        draw_wall_clinic(draw, pt, style)
    elif style.wall_kind == "glass":
        draw_wall_glass(draw, pt, style)
    elif style.wall_kind == "soft-panels":
        draw_wall_wood_panels(draw, pt, style, soft=True)
    elif style.wall_kind == "marble-blocks":
        draw_wall_stone(draw, pt, style, seed=9, marble=True)
    elif style.wall_kind == "rough-stone":
        draw_wall_stone(draw, pt, style, seed=12, marble=False)
    elif style.wall_kind == "walnut":
        draw_wall_walnut(draw, pt, style)

    draw_wall_surface_finish(draw, pt, style)
    wall_cap(draw, pt, style)
    wall_side_depth(draw, pt, side, style)
    draw_alpha_outline(img, mask, rgba(style.dark, 140), 1)
    img = apply_soft_isometric_grade(img, style.light, style.dark)
    img = apply_reference_alpha(img, mask_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, optimize=True)


def main() -> int:
    for style in STYLES:
        if style.slug in EXCLUDED_STYLE_SLUGS:
            print(f"skip excluded style {style.slug}")
            continue
        for idx, mask_path in enumerate(FLOOR_MASKS):
            suffix = "a" if idx == 0 else "b"
            draw_floor(
                style,
                mask_path,
                ROOT / "public" / "floors" / f"{style.slug}-floor-{suffix}.png",
                idx,
            )
        draw_wall(style, WALL_MASK_LEFT, ROOT / "public" / "walls" / f"{style.slug}-wall-left-a.png", "left")
        draw_wall(style, WALL_MASK_RIGHT, ROOT / "public" / "walls" / f"{style.slug}-wall-right-a.png", "right")
        print(f"wrote assets for {style.slug}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
