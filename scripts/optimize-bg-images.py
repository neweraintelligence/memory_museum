from PIL import Image, ImageFilter
import os

public = os.path.join(os.path.dirname(__file__), "..", "public")

targets = {
    "bookworm-bg.jpg": {
        "max_edge": 2560,
        "blur": 0,
        "webp_q": 72,
        "jpeg_q": 74,
    },
    "clairvoyant-bg.jpg": {
        "max_edge": 1920,
        "blur": 0.6,
        "webp_q": 72,
        "jpeg_q": 74,
    },
    "utilitarian-bg.jpg": {
        "max_edge": 2560,
        "blur": 0,
        "webp_q": 72,
        "jpeg_q": 74,
    },
    "blueprint-bg.jpg": {
        "max_edge": 1024,
        "blur": 0,
        "webp_q": 82,
        "jpeg_q": 80,
    },
}


def resize_to_max_edge(img: Image.Image, max_edge: int) -> Image.Image:
    w, h = img.size
    if max(w, h) <= max_edge:
        return img
    if w >= h:
        new_w = max_edge
        new_h = round(h * max_edge / w)
    else:
        new_h = max_edge
        new_w = round(w * max_edge / h)
    return img.resize((new_w, new_h), Image.Resampling.LANCZOS)


for filename, cfg in targets.items():
    src = os.path.join(public, filename)
    stem = filename.rsplit(".", 1)[0]
    webp_path = os.path.join(public, f"{stem}.webp")
    jpg_path = os.path.join(public, filename)

    with Image.open(src) as img:
        img = img.convert("RGB")
        resized = resize_to_max_edge(img, cfg["max_edge"])
        if cfg["blur"]:
            resized = resized.filter(ImageFilter.GaussianBlur(radius=cfg["blur"]))

        resized.save(webp_path, "WEBP", quality=cfg["webp_q"], method=6)
        resized.save(jpg_path, "JPEG", quality=cfg["jpeg_q"], optimize=True, progressive=True)

    webp_kb = os.path.getsize(webp_path) // 1024
    jpg_kb = os.path.getsize(jpg_path) // 1024
    with Image.open(webp_path) as out:
        print(f"{stem}: {out.size[0]}x{out.size[1]} | webp {webp_kb}KB | jpg {jpg_kb}KB")
