#!/usr/bin/env python3
"""기구 PDF에서 상품 썸네일 크롭 → PNG 출력."""
from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    print("Pillow 필요: pip install Pillow", file=sys.stderr)
    sys.exit(1)

PDF_PATH = Path("/Users/bonohan/Downloads/매머드컴퍼니 MC 카달로그.pdf")
RENDER_DIR = Path("/tmp/mc-catalog")
OUT_DIR = Path("/tmp/mc-products")

# page -> layout: grid2x2 | grid2x1 | single | grid3v
PAGE_LAYOUT = {
    14: "grid2x1",
    19: "single",
    27: "grid3v",
    32: "single",
    45: "single",
    47: "single",
}


def crop_slot(img: Image.Image, layout: str, slot: int) -> Image.Image:
    w, h = img.size
    if layout == "single":
        # 상단 75% — 하단 텍스트 제외
        return img.crop((0, 0, w, int(h * 0.72)))
    if layout == "grid2x1":
        cw = w // 2
        x0 = slot * cw
        cell = img.crop((x0, 0, x0 + cw, h))
        return cell.crop((0, 0, cw, int(h * 0.72)))
    if layout == "grid3v":
        ch = h // 3
        y0 = slot * ch
        cell = img.crop((0, y0, w, y0 + ch))
        return cell.crop((0, 0, w, int(ch * 0.72)))
    # grid2x2 (default)
    cw, ch = w // 2, h // 2
    col, row = slot % 2, slot // 2
    x0, y0 = col * cw, row * ch
    cell = img.crop((x0, y0, x0 + cw, y0 + ch))
    return cell.crop((0, 0, cw, int(ch * 0.72)))


def main() -> None:
    import importlib.util

    data_path = Path(__file__).resolve().parent / "mc-catalog-data.mjs"
    # Node로 JSON export
    import subprocess

    node = subprocess.run(
        [
            "node",
            "-e",
            f"import {{ MC_CATALOG }} from '{data_path}'; console.log(JSON.stringify(MC_CATALOG));",
        ],
        capture_output=True,
        text=True,
        cwd=data_path.parent,
    )
    if node.returncode != 0:
        print(node.stderr, file=sys.stderr)
        sys.exit(1)
    products = json.loads(node.stdout)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, str] = {}

    for prod in products:
        page = prod["image"]["page"]
        slot = prod["image"]["slot"]
        src = RENDER_DIR / f"page-{page:02d}.png"
        if not src.exists():
            print(f"skip (no page): {prod['id']}", file=sys.stderr)
            continue
        layout = PAGE_LAYOUT.get(page, "grid2x2")
        img = Image.open(src)
        crop = crop_slot(img, layout, slot)
        # 흰 배경, 적당한 크기
        crop = crop.convert("RGB")
        max_w = 800
        if crop.width > max_w:
            ratio = max_w / crop.width
            crop = crop.resize((max_w, int(crop.height * ratio)), Image.Resampling.LANCZOS)
        out = OUT_DIR / f"{prod['id']}.jpg"
        crop.save(out, "JPEG", quality=88, optimize=True)
        manifest[prod["id"]] = str(out)
        print(f"  {prod['id']}")

    (OUT_DIR / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"완료: {len(manifest)}개 → {OUT_DIR}")


if __name__ == "__main__":
    main()
