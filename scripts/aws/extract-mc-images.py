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

try:
    import cv2
    import numpy as np
except ImportError:
    print("OpenCV 필요: pip install opencv-python-headless numpy", file=sys.stderr)
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
    """흰 배경 위에 떠 있는 파란색 워터마크(THOMSON 등)만 삭제.

    파란 클러스터의 주변이 대부분 흰 배경일 때만 로고로 판정한다.
    기구 자체에 파란 부품이 있는 경우(H60 등)는 주변이 어두워 보존된다.
    """
    img = np.array(crop.convert("RGB"))
    h, w = img.shape[:2]
    r = img[:, :, 0].astype(np.int16)
    g = img[:, :, 1].astype(np.int16)
    b = img[:, :, 2].astype(np.int16)
    blue = ((b > 90) & (b > r + 35) & (b > g + 25)).astype(np.uint8)
    if blue.sum() < 15:
        return crop.convert("RGB")

    gray = np.array(crop.convert("L"))
    # 로고 글자들을 하나의 클러스터로 묶음
    clustered = cv2.dilate(blue, np.ones((25, 25), np.uint8))
    n, labels = cv2.connectedComponents(clustered)
    out = img.copy()
    for i in range(1, n):
        cluster = labels == i
        ys, xs = np.nonzero(cluster & (blue > 0))
        if len(xs) < 15:
            continue
        pad = 8
        x0, x1 = max(0, xs.min() - pad), min(w, xs.max() + pad)
        y0, y1 = max(0, ys.min() - pad), min(h, ys.max() + pad)
        # 주변 링 검사: 흰 배경 위 워터마크인지
        rx0, rx1 = max(0, x0 - 12), min(w, x1 + 12)
        ry0, ry1 = max(0, y0 - 12), min(h, y1 + 12)
        ring = np.ones((ry1 - ry0, rx1 - rx0), bool)
        ring[(y0 - ry0):(y1 - ry0), (x0 - rx0):(x1 - rx0)] = False
        ring_px = gray[ry0:ry1, rx0:rx1][ring]
        if ring_px.size == 0 or (ring_px > 225).mean() < 0.8:
            continue  # 주변이 어두움 → 기구 부품, 보존
        out[y0:y1, x0:x1] = 255
    return Image.fromarray(out)


def _remove_printed_logo(crop: Image.Image) -> Image.Image:
    """사진에 인쇄된 타사 로고 제거.

    (a) 어두운 프레임 위 소형 밝은 글자 클러스터(CYBEX·Life Fitness 등) → 인페인트
    (b) 성근 회색조 로고 블록(Hammer Strength 다리 로고 등) → 인페인트
    (c) 스택 커버의 순백 세로 스티커 라벨 → 주변 프레임 색으로 치환
    순백(>=235) 성분은 (a)(b)에서 제외해 기구 틈 사이 배경을 보호한다.
    """
    img = cv2.cvtColor(np.array(crop.convert("RGB")), cv2.COLOR_RGB2BGR)
    h, w = img.shape[:2]
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    area_img = h * w

    # 테두리와 연결된 밝은 영역 = 배경
    bright_bg = (gray > 235).astype(np.uint8)
    ff = bright_bg.copy()
    holes = np.zeros((h + 2, w + 2), np.uint8)
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if ff[seed[1], seed[0]]:
            cv2.floodFill(ff, holes, seed, 2)
    background = ff == 2

    inside_bright = ((gray > 145) & ~background).astype(np.uint8)

    n, labels, stats, _ = cv2.connectedComponentsWithStats(inside_bright, 8)
    letter_mask = np.zeros((h, w), np.uint8)
    block_mask = np.zeros((h, w), np.uint8)
    out = img.copy()
    patched = False

    for i in range(1, n):
        x, y, bw, bh, area = stats[i]
        if area < 6:
            continue
        comp = (labels == i).astype(np.uint8)
        dil = cv2.dilate(comp, np.ones((9, 9), np.uint8))
        ring = (dil > 0) & (comp == 0) & ~background
        if ring.sum() < 12:
            continue
        if np.median(gray[ring]) > 115:
            continue  # 주변이 밝음 → 프레임 위 로고 아님
        fill = area / max(1, bw * bh)
        mean = float(gray[comp > 0].mean())

        # (a) 소형 글자 후보
        if area <= area_img * 0.0025 and bw < w * 0.2 and bh < h * 0.2:
            if (area <= 120 or fill < 0.8) and mean < 240:
                letter_mask |= comp
            continue

        # (b) 성근 회색조 로고 블록
        if (
            area <= area_img * 0.015
            and bw < w * 0.3
            and bh < h * 0.35
            and fill < 0.55
            and mean < 235
        ):
            block_mask |= comp
            continue

        # (c) 순백 세로 스티커 라벨 (스택 커버)
        if (
            area_img * 0.001 <= area <= area_img * 0.03
            and fill >= 0.55
            and mean >= 235
            and bh >= bw * 2.2
            and bw < w * 0.18
        ):
            ring_color = np.median(img[ring], axis=0)
            grown = cv2.dilate(comp, np.ones((7, 7), np.uint8)) > 0
            grown &= ~background
            out[grown] = ring_color
            patched = True

    # 기구 위 파란 스티커·플래카드 (기구 자체는 흑백·빨강·크림 계열)
    bch = img[:, :, 0].astype(np.int16)
    gch = img[:, :, 1].astype(np.int16)
    rch = img[:, :, 2].astype(np.int16)
    blue_px = ((bch > 80) & (bch > rch + 30) & (bch > gch + 15) & ~background).astype(np.uint8)
    if blue_px.sum() >= 20:
        blue_blob = cv2.dilate(blue_px, np.ones((7, 7), np.uint8))
        bn, blabels, bstats, _ = cv2.connectedComponentsWithStats(blue_blob, 8)
        for i in range(1, bn):
            bx, by, bbw, bbh, barea = bstats[i]
            if barea < 20 or barea > area_img * 0.02:
                continue
            block_mask |= ((blabels == i) & (blue_blob > 0)).astype(np.uint8)

    # 글자는 3개 이상 모인 클러스터만 지움 (금속 반사광 등 오검출 방지)
    if letter_mask.sum() > 0:
        clustered = cv2.dilate(letter_mask, np.ones((11, 11), np.uint8))
        cn, clabels = cv2.connectedComponents(clustered)
        for i in range(1, cn):
            cluster = (clabels == i) & (letter_mask > 0)
            sub_n, _ = cv2.connectedComponents(cluster.astype(np.uint8))
            if sub_n - 1 >= 3:
                block_mask |= cluster.astype(np.uint8)

    if block_mask.sum() > 0:
        m = cv2.dilate(block_mask, np.ones((5, 5), np.uint8))
        m[background] = 0
        out = cv2.inpaint(out, m, 4, cv2.INPAINT_TELEA)
        patched = True

    if not patched:
        return crop
    return Image.fromarray(cv2.cvtColor(out, cv2.COLOR_BGR2RGB))


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
    crop = _remove_blue_logo(crop)
    return _remove_printed_logo(crop)


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
        if "page" not in prod["image"]:
            continue  # 엑셀 임베디드 이미지 등 PDF 외 소스
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
