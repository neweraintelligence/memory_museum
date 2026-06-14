#!/usr/bin/env python3
"""Generate Victorian Parlor floor and wall textures.

The generated PNGs intentionally reuse the Industrial Loft alpha masks so the
canvas size, isometric angles, and transparent bounds stay identical.
"""

from __future__ import annotations

import math
import random
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
FLOOR_MASK_A = ROOT / "public" / "floors" / "industrial-loft-floor-a.png"
FLOOR_MASK_B = ROOT / "public" / "floors" / "industrial-loft-floor-b.png"
WALL_MASK_LEFT = ROOT / "public" / "walls" / "industrial-loft-wall-left-a.png"
WALL_MASK_RIGHT = ROOT / "public" / "walls" / "industrial-loft-wall-right-a.png"

FLOOR_OUT_A = ROOT / "public" / "floors" / "victorian-parlor-floor-a.png"
FLOOR_OUT_B = ROOT / "public" / "floors" / "victorian-parlor-floor-b.png"
WALL_OUT_LEFT = ROOT / "public" / "walls" / "victorian-parlor-wall-left-a.png"
WALL_OUT_RIGHT = ROOT / "public" / "walls" / "victorian-parlor-wall-right-a.png"


class AlphaDraw:
    """ImageDraw wrapper that alpha-composites translucent marks."""

    def __init__(self, img: Image.Image):
        self.img = img
        self.direct = ImageDraw.Draw(img)

    @staticmethod
    def needs_layer(kwargs: dict) -> bool:
        for key in ("fill", "outline"):
            value = kwargs.get(key)
            if isinstance(value, tuple) and len(value) == 4 and value[3] < 255:
                return True
        return False

    def call(self, method: str, *args, **kwargs) -> None:
        if self.needs_layer(kwargs):
            layer = Image.new("RGBA", self.img.size, (0, 0, 0, 0))
            getattr(ImageDraw.Draw(layer), method)(*args, **kwargs)
            self.img.alpha_composite(layer)
            return
        getattr(self.direct, method)(*args, **kwargs)

    def line(self, *args, **kwargs) -> None:
        self.call("line", *args, **kwargs)

    def rectangle(self, *args, **kwargs) -> None:
        self.call("rectangle", *args, **kwargs)

    def polygon(self, *args, **kwargs) -> None:
        self.call("polygon", *args, **kwargs)

    def ellipse(self, *args, **kwargs) -> None:
        self.call("ellipse", *args, **kwargs)

    def arc(self, *args, **kwargs) -> None:
        self.call("arc", *args, **kwargs)

    def rounded_rectangle(self, *args, **kwargs) -> None:
        self.call("rounded_rectangle", *args, **kwargs)

    def point(self, *args, **kwargs) -> None:
        self.call("point", *args, **kwargs)


def rgba(hex_color: str, alpha: int = 255) -> tuple[int, int, int, int]:
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
        alpha,
    )


def mix(
    a: tuple[int, int, int, int],
    b: tuple[int, int, int, int],
    t: float,
) -> tuple[int, int, int, int]:
    return tuple(round(a[i] + (b[i] - a[i]) * t) for i in range(4))  # type: ignore[return-value]


def vertical_gradient(
    size: tuple[int, int],
    top: tuple[int, int, int, int],
    bottom: tuple[int, int, int, int],
) -> Image.Image:
    w, h = size
    img = Image.new("RGBA", size)
    draw = ImageDraw.Draw(img)
    for y in range(h):
        t = y / max(1, h - 1)
        draw.line([(0, y), (w, y)], fill=mix(top, bottom, t))
    return img


def apply_reference_alpha(img: Image.Image, mask_path: Path) -> Image.Image:
    reference_alpha = Image.open(mask_path).convert("RGBA").getchannel("A")
    alpha = img.getchannel("A")
    img.putalpha(ImageChops.multiply(alpha, reference_alpha))
    return img


def draw_alpha_outline(
    img: Image.Image,
    alpha: Image.Image,
    color: tuple[int, int, int, int],
    width: int,
) -> None:
    dilated = alpha.filter(ImageFilter.MaxFilter(width * 2 + 1))
    eroded = alpha.filter(ImageFilter.MinFilter(width * 2 + 1))
    edge = ImageChops.subtract(dilated, eroded)
    edge = edge.point(lambda v: min(color[3], int(v * 1.5)))
    overlay = Image.new("RGBA", img.size, color[:3] + (0,))
    overlay.putalpha(edge)
    img.alpha_composite(overlay)


def floor_points(size: tuple[int, int]) -> tuple[tuple[float, float], ...]:
    w, h = size
    return (
        (w / 2, 0),
        (w - 1, h / 2),
        (w / 2, h - 1),
        (0, h / 2),
    )


def uv_to_floor(
    u: float,
    v: float,
    top: tuple[float, float],
    right: tuple[float, float],
    left: tuple[float, float],
) -> tuple[float, float]:
    return (
        top[0] + (right[0] - top[0]) * u + (left[0] - top[0]) * v,
        top[1] + (right[1] - top[1]) * u + (left[1] - top[1]) * v,
    )


def draw_polyline(
    draw: ImageDraw.ImageDraw,
    points: list[tuple[float, float]],
    fill: tuple[int, int, int, int],
    width: int,
) -> None:
    draw.line([(round(x), round(y)) for x, y in points], fill=fill, width=width, joint="curve")


def draw_floor(mask_path: Path, out_path: Path, seed: int, offset: float) -> None:
    random.seed(seed)
    mask = Image.open(mask_path).convert("RGBA").getchannel("A")
    w, h = mask.size
    img = vertical_gradient(
        (w, h),
        rgba("#ca8848"),
        rgba("#8e542f"),
    )
    draw = AlphaDraw(img)

    top, right, bottom, left = floor_points((w, h))

    # Broad candle-warm wash, matching the soft object reference style.
    for y in range(0, h, 2):
        t = y / h
        shade = int(28 * (1 - abs(t - 0.35)))
        draw.line([(0, y), (w, y)], fill=(255, 224, 166, max(0, shade)), width=2)

    cell = 0.118
    plank_len = cell * 1.38
    plank_w = cell * 0.7
    outline = rgba("#5a321f", 150)
    highlight = rgba("#f3c982", 90)
    lowlight = rgba("#6f3f24", 105)
    palette = [
        rgba("#c98443"),
        rgba("#b9763b"),
        rgba("#d09552"),
        rgba("#a96535"),
        rgba("#c6864a"),
    ]

    for i in range(-4, 12):
        for j in range(-4, 12):
            base_u = i * cell + offset
            base_v = j * cell - offset * 0.55
            if (i + j + seed) % 2 == 0:
                rect = [
                    (base_u, base_v),
                    (base_u + plank_len, base_v),
                    (base_u + plank_len, base_v + plank_w),
                    (base_u, base_v + plank_w),
                ]
                grain_a = (base_u + 0.02, base_v + plank_w * 0.48)
                grain_b = (base_u + plank_len - 0.02, base_v + plank_w * 0.55)
            else:
                rect = [
                    (base_u, base_v),
                    (base_u + plank_w, base_v),
                    (base_u + plank_w, base_v + plank_len),
                    (base_u, base_v + plank_len),
                ]
                grain_a = (base_u + plank_w * 0.45, base_v + 0.02)
                grain_b = (base_u + plank_w * 0.55, base_v + plank_len - 0.02)

            pts = [uv_to_floor(u, v, top, right, left) for u, v in rect]
            color = palette[(i * 5 + j * 3 + seed) % len(palette)]
            jitter = random.randint(-10, 12)
            color = (
                max(0, min(255, color[0] + jitter)),
                max(0, min(255, color[1] + jitter)),
                max(0, min(255, color[2] + jitter)),
                255,
            )
            draw.polygon(pts, fill=color)
            draw.line(pts + [pts[0]], fill=outline, width=3, joint="curve")

            ga = uv_to_floor(*grain_a, top, right, left)
            gb = uv_to_floor(*grain_b, top, right, left)
            draw.line([ga, gb], fill=lowlight, width=2)
            if random.random() > 0.45:
                draw.line(
                    [
                        uv_to_floor(grain_a[0], grain_a[1] - plank_w * 0.12, top, right, left),
                        uv_to_floor(grain_b[0], grain_b[1] - plank_w * 0.10, top, right, left),
                    ],
                    fill=highlight,
                    width=2,
                )

    # Subtle wood knots and long grain lines.
    for n in range(34):
        u = random.random()
        v = random.random()
        x, y = uv_to_floor(u, v, top, right, left)
        rx = random.randint(5, 13)
        ry = random.randint(2, 5)
        draw.ellipse((x - rx, y - ry, x + rx, y + ry), outline=rgba("#5f3420", 80), width=2)
        if n % 3 == 0:
            draw.arc((x - rx * 1.7, y - ry * 1.8, x + rx * 1.7, y + ry * 1.8), 10, 320, fill=rgba("#e5b66b", 70), width=2)

    # Dark beveled front/right edges like the Industrial Loft tiles.
    inner_bottom = (bottom[0], bottom[1] - 13)
    inner_left = (left[0] + 26, left[1] - 5)
    inner_right = (right[0] - 26, right[1] - 5)
    draw.polygon([left, bottom, inner_bottom, inner_left], fill=rgba("#724329", 158))
    draw.polygon([bottom, right, inner_right, inner_bottom], fill=rgba("#663a24", 168))
    draw.line([left, top, right], fill=rgba("#f0c47a", 95), width=3)
    draw.line([left, bottom, right], fill=rgba("#3f2519", 205), width=4, joint="curve")

    draw_alpha_outline(img, mask, rgba("#3f2519", 210), 2)
    img = apply_reference_alpha(img, mask_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, optimize=True)
    print(f"wrote {out_path.relative_to(ROOT)} {img.size}")


def draw_damask(
    draw: ImageDraw.ImageDraw,
    x: float,
    y: float,
    color: tuple[int, int, int, int],
    accent: tuple[int, int, int, int],
) -> None:
    draw.ellipse((x - 6, y - 6, x + 6, y + 6), outline=accent, width=3)
    draw.ellipse((x - 2, y - 2, x + 2, y + 2), fill=accent)
    for side in (-1, 1):
        pts = []
        for k in range(20):
            t = k / 19
            px = x + side * (8 + 17 * math.sin(t * math.pi))
            py = y - 26 + 52 * t
            pts.append((px, py))
        draw_polyline(draw, pts, color, 3)
        draw.arc((x + side * 8 - 20, y - 23, x + side * 8 + 20, y + 17), 90, 270, fill=color, width=3)
        draw.arc((x + side * 10 - 20, y - 2, x + side * 10 + 20, y + 35), -90, 90, fill=color, width=3)


def wall_edges(mask: Image.Image) -> tuple[tuple[int, int], tuple[int, int], tuple[int, int], tuple[int, int]]:
    """Return TL, TR, BL, BR points from the reference wall alpha."""
    w, h = mask.size

    def first_y(x: int) -> int:
        for y in range(h):
            if mask.getpixel((x, y)) > 0:
                return y
        return 0

    def last_y(x: int) -> int:
        for y in range(h - 1, -1, -1):
            if mask.getpixel((x, y)) > 0:
                return y
        return h - 1

    return (0, first_y(0)), (w - 1, first_y(w - 1)), (0, last_y(0)), (w - 1, last_y(w - 1))


def wall_mapper(
    mask: Image.Image,
) -> tuple[
    callable[[float, float], tuple[float, float]],
    tuple[tuple[int, int], tuple[int, int], tuple[int, int], tuple[int, int]],
]:
    tl, tr, bl, br = wall_edges(mask)

    def pt(u: float, v: float) -> tuple[float, float]:
        # Affine wall-plane coordinates. U follows the slanted top edge, V drops
        # straight down the wall, matching the Industrial Loft source art.
        return (
            tl[0] + (tr[0] - tl[0]) * u + (bl[0] - tl[0]) * v,
            tl[1] + (tr[1] - tl[1]) * u + (bl[1] - tl[1]) * v,
        )

    return pt, (tl, tr, bl, br)


def wall_quad(
    pt: callable[[float, float], tuple[float, float]],
    u0: float,
    u1: float,
    v0: float,
    v1: float,
) -> list[tuple[float, float]]:
    return [pt(u0, v0), pt(u1, v0), pt(u1, v1), pt(u0, v1)]


def draw_wall_band(
    draw: AlphaDraw,
    pt: callable[[float, float], tuple[float, float]],
    v0: float,
    v1: float,
    color: tuple[int, int, int, int],
) -> None:
    draw.polygon(wall_quad(pt, 0, 1, v0, v1), fill=color)


def draw_wall_line(
    draw: AlphaDraw,
    pt: callable[[float, float], tuple[float, float]],
    u0: float,
    u1: float,
    v: float,
    color: tuple[int, int, int, int],
    width: int,
) -> None:
    draw.line([pt(u0, v), pt(u1, v)], fill=color, width=width)


def draw_wall_ellipse(
    draw: AlphaDraw,
    pt: callable[[float, float], tuple[float, float]],
    u: float,
    v: float,
    ru: float,
    rv: float,
    color: tuple[int, int, int, int],
    width: int,
) -> None:
    points = []
    for i in range(49):
        t = (i / 48) * math.tau
        points.append(pt(u + math.cos(t) * ru, v + math.sin(t) * rv))
    draw.line(points, fill=color, width=width)


def draw_wall_curve(
    draw: AlphaDraw,
    pt: callable[[float, float], tuple[float, float]],
    coords: list[tuple[float, float]],
    color: tuple[int, int, int, int],
    width: int,
) -> None:
    draw.line([pt(u, v) for u, v in coords], fill=color, width=width)


def draw_wall_damask(
    draw: AlphaDraw,
    pt: callable[[float, float], tuple[float, float]],
    u: float,
    v: float,
    scale: float,
) -> None:
    gold = rgba("#f3d08a", 142)
    warm = rgba("#f7b95f", 150)
    draw_wall_ellipse(draw, pt, u, v, 0.018 * scale, 0.017 * scale, warm, 2)
    draw_wall_ellipse(draw, pt, u, v, 0.006 * scale, 0.006 * scale, rgba("#f8d07a", 170), 2)
    for side in (-1, 1):
        upper = [
            (
                u + side * (0.012 + math.sin(t * math.pi) * 0.047) * scale,
                v - 0.048 * scale + t * 0.085 * scale,
            )
            for t in [i / 18 for i in range(19)]
        ]
        lower = [
            (
                u + side * (0.015 + math.sin(t * math.pi) * 0.038) * scale,
                v - 0.006 * scale + t * 0.073 * scale,
            )
            for t in [i / 18 for i in range(19)]
        ]
        draw_wall_curve(draw, pt, upper, gold, 2)
        draw_wall_curve(draw, pt, lower, gold, 2)


def draw_wall(mask_path: Path, out_path: Path, side: str) -> None:
    mask = Image.open(mask_path).convert("RGBA").getchannel("A")
    w, h = mask.size
    img = vertical_gradient((w, h), rgba("#9a5064"), rgba("#69364a"))
    draw = AlphaDraw(img)
    pt, _edges = wall_mapper(mask)

    chair_v = 0.62

    # Wallpaper, all drawn in Industrial Loft wall-plane coordinates.
    for i in range(12):
        u0 = i / 12
        u1 = (i + 1) / 12
        color = rgba("#b86878", 88) if i % 2 else rgba("#5f2c42", 84)
        draw.polygon(wall_quad(pt, u0, u1, 0.0, chair_v + 0.015), fill=color)

    for row, v in enumerate([0.095, 0.205, 0.315, 0.425, 0.535]):
        for col in range(5):
            u = 0.1 + col * 0.205 + (0.1 if row % 2 else 0)
            if 0.035 < u < 0.97:
                draw_wall_damask(draw, pt, u, v, 1.0)

    for v in [0.08, 0.2, 0.32, 0.44, 0.56]:
        draw_wall_line(draw, pt, 0, 1, v, rgba("#f0be7a", 38), 2)

    # Chair rail, wainscoting, and baseboard. Their long edges now follow the
    # same diagonal as the Industrial Loft brick courses.
    draw_wall_band(draw, pt, chair_v, 1.0, rgba("#a66435", 255))
    for i in range(14):
        v0 = chair_v + i * (1 - chair_v) / 14
        v1 = chair_v + (i + 1) * (1 - chair_v) / 14
        color = mix(rgba("#c98345", 255), rgba("#754328", 255), i / 13)
        draw_wall_band(draw, pt, v0, v1, color)

    panel_count = 5
    for i in range(panel_count):
        u0 = i / panel_count + 0.035
        u1 = (i + 1) / panel_count - 0.035
        v0 = chair_v + 0.105
        v1 = 0.9
        panel = wall_quad(pt, u0, u1, v0, v1)
        inset = wall_quad(pt, u0 + 0.028, u1 - 0.028, v0 + 0.055, v1 - 0.055)
        draw.polygon(panel, fill=rgba("#b9773c", 228))
        draw.line(panel + [panel[0]], fill=rgba("#553023", 185), width=4)
        draw.line(inset + [inset[0]], fill=rgba("#e7b366", 130), width=3)
        draw_wall_line(draw, pt, u0 + 0.02, u1 - 0.02, v0 + 0.035, rgba("#f1c77c", 80), 2)
        draw_wall_line(draw, pt, u0 + 0.02, u1 - 0.02, v1 - 0.03, rgba("#603722", 120), 2)

    draw_wall_band(draw, pt, chair_v - 0.02, chair_v - 0.004, rgba("#edbd72", 245))
    draw_wall_line(draw, pt, 0, 1, chair_v - 0.026, rgba("#f8db93", 150), 4)
    draw_wall_line(draw, pt, 0, 1, chair_v + 0.01, rgba("#4f2f24", 160), 4)
    draw_wall_band(draw, pt, 0.925, 0.965, rgba("#724027", 235))
    draw_wall_line(draw, pt, 0, 1, 0.918, rgba("#e8ad64", 130), 4)

    # Top crown/cap and side-depth hints, matched to the reference wall axes.
    draw_wall_band(draw, pt, 0.0, 0.035, rgba("#d49a5f", 238))
    draw_wall_line(draw, pt, 0, 1, 0.04, rgba("#533025", 155), 4)
    if side == "left":
        draw.polygon(wall_quad(pt, 0.0, 0.085, 0.0, 1.0), fill=rgba("#4f2d27", 70))
        draw_wall_curve(draw, pt, [(0.09, 0), (0.09, 1)], rgba("#f0c982", 50), 2)
    else:
        draw.polygon(wall_quad(pt, 0.915, 1.0, 0.0, 1.0), fill=rgba("#4f2d27", 70))
        draw_wall_curve(draw, pt, [(0.91, 0), (0.91, 1)], rgba("#f0c982", 50), 2)

    # Soft surface noise: enough to feel hand-rendered, not gritty.
    random.seed(123 if side == "left" else 456)
    for _ in range(180):
        x = random.randrange(w)
        y = random.randrange(h)
        color = rgba("#ffffff", random.randrange(10, 28)) if random.random() > 0.52 else rgba("#3c241d", random.randrange(10, 25))
        draw.point((x, y), fill=color)

    draw_alpha_outline(img, mask, rgba("#4e2c24", 215), 2)
    img = apply_reference_alpha(img, mask_path)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    img.save(out_path, optimize=True)
    print(f"wrote {out_path.relative_to(ROOT)} {img.size}")


def main() -> None:
    draw_floor(FLOOR_MASK_A, FLOOR_OUT_A, seed=11, offset=0.0)
    draw_floor(FLOOR_MASK_B, FLOOR_OUT_B, seed=23, offset=0.038)
    draw_wall(WALL_MASK_LEFT, WALL_OUT_LEFT, "left")
    draw_wall(WALL_MASK_RIGHT, WALL_OUT_RIGHT, "right")


if __name__ == "__main__":
    main()
