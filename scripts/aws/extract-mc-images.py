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

# page -> layout: grid2x2 | grid2x1 | single
# 27페이지는 2×2 그리드에 3개만 배치된 형태라 기본 grid2x2 사용
PAGE_LAYOUT = {
    14: "grid2x1",
    19: "single",
    32: "single",
    45: "single",
    47: "single",
}


DARK_THRESHOLD = 235  # 이보다 어두우면 콘텐츠 픽셀로 간주


def _content_rows(gray: Image.Image) -> list[tuple[int, int]]:
    """콘텐츠(어두운 픽셀)가 있는 행을 밴드 단위로 반환 [(start, end), ...]."""
    w, h = gray.size
    px = gray.load()
    rows = []
    for y in range(h):
        dark = 0
        for x in range(0, w, 2):  # 성능: 2px 간격 샘플링
            if px[x, y] < DARK_THRESHOLD:
                dark += 1
                if dark >= 3:
                    break
        rows.append(dark >= 3)

    bands: list[tuple[int, int]] = []
    start = None
    for y, on in enumerate(rows):
        if on and start is None:
            start = y
        elif not on and start is not None:
            bands.append((start, y - 1))
            start = None
    if start is not None:
        bands.append((start, h - 1))
    return bands


def _machine_bbox(cell: Image.Image) -> tuple[int, int, int, int] | None:
    """셀에서 기구 렌더 영역만 감지 — 상단 이미지 밴드(들)를 취하고 하단 텍스트 밴드 제외."""
    gray = cell.convert("L")
    w, h = gray.size
    bands = _content_rows(gray)
    if not bands:
        return None

    # 밴드 사이 간격이 좁으면 같은 덩어리로 병합 (기구 내부의 얇은 틈 대응)
    merged: list[tuple[int, int]] = []
    gap = max(4, int(h * 0.006))
    for b in bands:
        if merged and b[0] - merged[-1][1] <= gap:
            merged[-1] = (merged[-1][0], b[1])
        else:
            merged.append(b)

    # 기구 렌더 = 가장 키가 큰 덩어리. 제목·스펙 텍스트 줄은 높이가 낮아 자연 제외됨.
    top, bottom = max(merged, key=lambda b: b[1] - b[0])

    # 좌우 트림 — 해당 세로 구간에서 어두운 픽셀 열 범위
    px = gray.load()
    left, right = w - 1, 0
    for y in range(top, bottom + 1, 2):
        for x in range(w):
            if px[x, y] < DARK_THRESHOLD:
                if x < left:
                    left = x
                break
        for x in range(w - 1, -1, -1):
            if px[x, y] < DARK_THRESHOLD:
                if x > right:
                    right = x
                break
    if left >= right:
        return None

    pad = int(min(w, h) * 0.02)
    return (
        max(0, left - pad),
        max(0, top - pad),
        min(w, right + pad),
        min(h, bottom + pad),
    )


def _remove_blue_logo(crop: Image.Image) -> Image.Image:
    """파란색 브랜드 로고(THOMSON 등)를 영역째 흰색으로 삭제.

    기구는 흑백·빨강 계열이므로 파란 픽셀은 로고뿐. 파란 픽셀들의 bbox를
    여유 있게 잡아 통째로 지워 잔상(테두리·안티앨리어싱)이 남지 않게 한다.
    """
    rgb = crop.convert("RGB")
    px = rgb.load()
    w, h = rgb.size

    xs: list[int] = []
    ys: list[int] = []
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if b > 90 and b > r + 35 and b > g + 25:
                xs.append(x)
                ys.append(y)

    if len(xs) < 15:  # 노이즈 수준이면 무시
        return rgb

    pad = max(6, int(min(w, h) * 0.03))
    x0, x1 = max(0, min(xs) - pad * 3), min(w, max(xs) + pad * 3)
    y0, y1 = max(0, min(ys) - pad), min(h, max(ys) + pad)
    for y in range(y0, y1):
        for x in range(x0, x1):
            px[x, y] = (255, 255, 255)
    return rgb


def _strip_bottom_text(crop: Image.Image) -> Image.Image:
    """크롭 하단에 붙은 제목 텍스트 제거.

    패턴: [기구] → 저밀도 골(valley) → 고밀도·낮은 높이 텍스트 밴드(맨 아래).
    기구 받침대는 텍스트보다 키가 크므로 오검출을 피한다.
    """
    gray = crop.convert("L")
    w, h = gray.size
    px = gray.load()

    counts = []
    for y in range(h):
        dark = 0
        for x in range(0, w, 2):
            if px[x, y] < 100:
                dark += 1
        counts.append(dark)

    text_min = max(20, int(w * 0.06))   # 텍스트 줄로 볼 최소 밀도
    valley_max = max(5, int(w * 0.012))  # 골로 볼 최대 밀도

    # 맨 아래 고밀도 클러스터
    y = h - 1
    while y >= 0 and counts[y] < text_min:
        y -= 1
    if y < 0:
        return crop
    cluster_end = y
    while y >= 0 and counts[y] >= valley_max:
        y -= 1
    cluster_start = y + 1
    cluster_h = cluster_end - cluster_start + 1

    # 텍스트 조건: 낮은 높이(<8%), 하단 15% 이내에서 시작
    if cluster_h > h * 0.08 or cluster_start < h * 0.75:
        return crop

    # 클러스터 위에 골이 있고, 그 위에 기구 본체가 있어야 함
    v = y
    while v >= 0 and counts[v] < valley_max:
        v -= 1
    valley_len = y - v
    if valley_len < 2 or v < h * 0.3:
        return crop

    return crop.crop((0, 0, w, cluster_start - valley_len // 2))


def crop_slot(img: Image.Image, layout: str, slot: int) -> Image.Image:
    """카탈로그 셀 → 기구 렌더만 자동 감지 크롭 (하단 텍스트 제외)."""
    w, h = img.size
    if layout == "single":
        cell = img.crop((0, 0, w, int(h * 0.80)))
    elif layout == "grid2x1":
        cw = w // 2
        x0 = slot * cw
        cell = img.crop((x0, 0, x0 + cw, int(h * 0.85)))
    elif layout == "grid3v":
        ch = h // 3
        y0 = slot * ch
        cell = img.crop((0, y0, w, y0 + ch))
    else:  # grid2x2
        cw, ch = w // 2, h // 2
        col, row = slot % 2, slot // 2
        x0, y0 = col * cw, row * ch
        cell = img.crop((x0, y0, x0 + cw, y0 + ch))

    bbox = _machine_bbox(cell)
    crop = cell.crop(bbox) if bbox else cell
    crop = _strip_bottom_text(crop)
    return _remove_blue_logo(crop)


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
