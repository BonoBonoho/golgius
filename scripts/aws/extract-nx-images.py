"""제품목록 엑셀(니트로·엑스 시트)에서 임베디드 제품 이미지를 추출한다.

사용법:
  python extract-nx-images.py "/path/to/제품목록 최신.xlsx" /tmp/mc-products
"""

import io
import sys
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

from PIL import Image

NS = {
    "xdr": "http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing",
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
}
RNS = "{http://schemas.openxmlformats.org/officeDocument/2006/relationships}"
MAIN_NS = "{http://schemas.openxmlformats.org/spreadsheetml/2006/main}"

SHEET = "니트로,엑스"
# 시트 행(1-based) → 제품코드. 데이터가 3행(NX01)부터 시작.
ROW_TO_CODE = {row: f"NX{row - 2:02d}" for row in range(3, 21)}

CANVAS = (900, 760)  # 기존 카탈로그 크롭과 비슷한 비율의 흰 캔버스
MARGIN = 40


def normalize(img: Image.Image) -> Image.Image:
    """흰 배경 캔버스 중앙에 제품 사진을 배치."""
    img = img.convert("RGB")
    w, h = img.size
    scale = min((CANVAS[0] - 2 * MARGIN) / w, (CANVAS[1] - 2 * MARGIN) / h)
    img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.LANCZOS)
    canvas = Image.new("RGB", CANVAS, (255, 255, 255))
    canvas.paste(img, ((CANVAS[0] - img.width) // 2, (CANVAS[1] - img.height) // 2))
    return canvas


def main() -> None:
    xlsx, out_dir = sys.argv[1], Path(sys.argv[2])
    out_dir.mkdir(parents=True, exist_ok=True)
    z = zipfile.ZipFile(xlsx)

    wb = ET.fromstring(z.read("xl/workbook.xml"))
    wb_rels = ET.fromstring(z.read("xl/_rels/workbook.xml.rels"))
    relmap = {r.get("Id"): r.get("Target") for r in wb_rels}
    ws_file = None
    for s in wb.find(f"{MAIN_NS}sheets"):
        if s.get("name") == SHEET:
            ws_file = relmap[s.get(f"{RNS}id")].split("/")[-1]
    assert ws_file, f"시트 없음: {SHEET}"

    ws_rels = ET.fromstring(z.read(f"xl/worksheets/_rels/{ws_file}.rels"))
    drawing = next(
        r.get("Target").replace("../", "xl/") for r in ws_rels if "drawing" in r.get("Type")
    )
    dr_rels = ET.fromstring(
        z.read(drawing.replace("drawings/", "drawings/_rels/") + ".rels")
    )
    img_map = {r.get("Id"): r.get("Target").replace("../", "xl/") for r in dr_rels}
    dr = ET.fromstring(z.read(drawing))

    count = 0
    for anchor in dr.findall("xdr:twoCellAnchor", NS) + dr.findall("xdr:oneCellAnchor", NS):
        row = int(anchor.find("xdr:from", NS).find("xdr:row", NS).text) + 1
        code = ROW_TO_CODE.get(row)
        blip = anchor.find(".//a:blip", NS)
        if not code or blip is None:
            continue
        raw = z.read(img_map[blip.get(f"{RNS}embed")])
        img = normalize(Image.open(io.BytesIO(raw)))
        dest = out_dir / f"mc-{code.lower()}.jpg"
        img.save(dest, "JPEG", quality=90)
        count += 1
        print(f"{code} -> {dest.name}")
    print(f"완료: {count}개")


if __name__ == "__main__":
    main()
