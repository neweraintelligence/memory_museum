from PIL import Image
import os

here = os.path.dirname(__file__)
public = os.path.join(here, "..", "public")
assets = os.path.join(
    os.path.expanduser("~"),
    ".cursor",
    "projects",
    "i-Launch-Bay-Productivity-Memory-Museum",
    "assets",
)

sources = {
    "bookworm-welcome-day": {
        "file": "c__Users_Cal_AppData_Roaming_Cursor_User_workspaceStorage_46c0c5b02b5d06e3891a6ea3c21208d5_images_Bookworm_-_Day-d4aece50-afb1-44c5-bf02-6e4e6d438aae.png",
        "max_edge": 1280,
        "webp_q": 78,
    },
    "bookworm-welcome-night": {
        "file": "c__Users_Cal_AppData_Roaming_Cursor_User_workspaceStorage_46c0c5b02b5d06e3891a6ea3c21208d5_images_Bookworm_-_Night-ecbe6e4e-9a31-4ad8-be66-3954bf603747.png",
        "max_edge": 1280,
        "webp_q": 78,
    },
    # Small panel texture — max ~440px wide in UI; 640px edge is plenty for cover + retina.
    "bookworm-welcome-panel": {
        "file": "c__Users_Cal_AppData_Roaming_Cursor_User_workspaceStorage_46c0c5b02b5d06e3891a6ea3c21208d5_images_Brown_Leather-1bebd5f4-8fbb-4c0c-855d-3221b202212d.png",
        "max_edge": 640,
        "webp_q": 70,
    },
    "utilitarian-welcome-day": {
        "file": "c__Users_Cal_AppData_Roaming_Cursor_User_workspaceStorage_46c0c5b02b5d06e3891a6ea3c21208d5_images_Brutalist_-_Day-d0050d46-0155-41ed-aa07-4778cf1039ff.png",
        "max_edge": 1280,
        "webp_q": 78,
    },
    "utilitarian-welcome-night": {
        "file": "c__Users_Cal_AppData_Roaming_Cursor_User_workspaceStorage_46c0c5b02b5d06e3891a6ea3c21208d5_images_Brutalist_-_Night-c4551306-a779-4632-bd53-ef01e92db936.png",
        "max_edge": 1280,
        "webp_q": 78,
    },
    "blueprint-welcome-day": {
        "file": "c__Users_Cal_AppData_Roaming_Cursor_User_workspaceStorage_46c0c5b02b5d06e3891a6ea3c21208d5_images_Blueprint_-_Before-81768e6f-f8b5-473f-b120-6d530aedc2eb.png",
        "max_edge": 1280,
        "webp_q": 78,
    },
    "blueprint-welcome-night": {
        "file": "c__Users_Cal_AppData_Roaming_Cursor_User_workspaceStorage_46c0c5b02b5d06e3891a6ea3c21208d5_images_Blueprint_-_After-8203cecd-e800-45cd-abce-f44844049991.png",
        "max_edge": 1280,
        "webp_q": 78,
    },
    "clairvoyant-welcome-day": {
        "file": "c__Users_Cal_AppData_Roaming_Cursor_User_workspaceStorage_46c0c5b02b5d06e3891a6ea3c21208d5_images_Zen_-_Sunny-eecbe079-0931-407b-b0c8-7a6bcb56d2be.png",
        "max_edge": 1280,
        "webp_q": 78,
    },
    "clairvoyant-welcome-night": {
        "file": "c__Users_Cal_AppData_Roaming_Cursor_User_workspaceStorage_46c0c5b02b5d06e3891a6ea3c21208d5_images_Zen_-_Rainy-2387819e-4b8a-47b7-83d7-4ac63a0d5a18.png",
        "max_edge": 1280,
        "webp_q": 78,
    },
}

MAX_EDGE_DEFAULT = 2560
WEBP_Q_DEFAULT = 78


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


for stem, cfg in sources.items():
    src = os.path.join(assets, cfg["file"])
    webp_path = os.path.join(public, f"{stem}.webp")
    max_edge = cfg.get("max_edge", MAX_EDGE_DEFAULT)
    webp_q = cfg.get("webp_q", WEBP_Q_DEFAULT)
    with Image.open(src) as img:
        img = img.convert("RGB")
        resized = resize_to_max_edge(img, max_edge)
        resized.save(webp_path, "WEBP", quality=webp_q, method=6)
    webp_kb = os.path.getsize(webp_path) // 1024
    with Image.open(webp_path) as out:
        print(f"{stem}: {out.size[0]}x{out.size[1]} | webp {webp_kb}KB")
