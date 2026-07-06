// 기구 상품 시드 데이터 (PDF 1차 정리)
// image: { page, slot } — slot 0~3 = 2×2 그리드(좌상·우상·좌하·우하), 단일 페이지는 slot 0

const BRAND = "MC";

function p(category, code, name, sizeCm, image, featured = false) {
  const id = `mc-${code.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
  return {
    id,
    name: name.startsWith("MC ") ? name : `MC ${name}`,
    category,
    brand: BRAND,
    price: null,
    summary: `${category} — ${name.replace(/^MC /, "")}. 모델 ${code}.`,
    specs: [
      { label: "모델", value: code },
      { label: "크기 (cm)", value: sizeCm },
    ],
    image,
    featured,
    status: "active",
  };
}

/** @type {import("./mc-catalog-seed.mjs").CatalogProduct[]} */
export const MC_CATALOG = [
  // ── Plate Loaded ──
  ...[
    p("Plate Loaded", "S35", "Plate Loaded Leg Press", "211 × 163 × 137", { page: 6, slot: 0 }, true),
    p("Plate Loaded", "S36", "Plate Loaded Hack Squat Press", "206 × 155 × 137", { page: 6, slot: 1 }),
    p("Plate Loaded", "S37", "Plate Loaded Squat Press", "208 × 170 × 135", { page: 6, slot: 2 }),
    p("Plate Loaded", "S38", "Plate Loaded Pulldown", "124 × 211 × 183", { page: 6, slot: 3 }),
    p("Plate Loaded", "S34", "Plate Loaded Smith Press", "137 × 213 × 213", { page: 7, slot: 0 }, true),
    p("Plate Loaded", "S32", "Plate Loaded Incline Press", "150 × 140 × 112", { page: 7, slot: 1 }),
    p("Plate Loaded", "S31", "Plate Loaded Chest Press", "127 × 150 × 132", { page: 7, slot: 2 }),
    p("Plate Loaded", "S33", "Plate Loaded Overhead Press", "135 × 137 × 124", { page: 7, slot: 3 }),
  ],

  // ── Select Pro2 ──
  ...[
    p("Select Pro2", "SPR-HS13", "Seated Leg Press", "201 × 102 × 180", { page: 9, slot: 0 }),
    p("Select Pro2", "SPR-HS14", "Leg Extension", "119 × 104 × 163", { page: 9, slot: 1 }),
    p("Select Pro2", "SPR-HS18", "Standing Calf", "148 × 114 × 183", { page: 9, slot: 2 }),
    p("Select Pro2", "SPR-HS17", "Leg Curl", "165 × 99 × 140", { page: 9, slot: 3 }),
    p("Select Pro2", "SPR-HS05", "Shoulder Press", "152 × 142 × 163", { page: 10, slot: 0 }),
    p("Select Pro2", "SPR-HS06", "Lateral Raise", "107 × 94 × 140", { page: 10, slot: 1 }),
    p("Select Pro2", "SPR-HS07", "Pectoral Fly / Rear Deltoid", "124 × 142 × 180", { page: 10, slot: 2 }),
    p("Select Pro2", "SPR-HS08", "Pectoral Fly", "124 × 142 × 206", { page: 10, slot: 3 }),
    p("Select Pro2", "SPR-HS09", "Lat Pulldown", "137 × 84 × 226", { page: 11, slot: 0 }, true),
    p("Select Pro2", "SPR-HS10", "Fixed Pulldown", "139 × 147 × 185", { page: 11, slot: 1 }),
    p("Select Pro2", "SPR-HS11", "Seated Leg Curl", "140 × 86 × 140", { page: 11, slot: 2 }),
    p("Select Pro2", "SPR-HS12", "Horizontal Calf", "155 × 81 × 140", { page: 11, slot: 3 }),
    p("Select Pro2", "SPR-HS19", "Hip and Glute", "165 × 99 × 183", { page: 12, slot: 0 }),
    p("Select Pro2", "SPR-HS20", "Abdominal Crunch", "158 × 89 × 140", { page: 12, slot: 1 }),
    p("Select Pro2", "SPR-HS21", "Back Extension", "117 × 102 × 140", { page: 12, slot: 2 }),
    p("Select Pro2", "SPR-HS22", "Assist Dip Chin", "118 × 113 × 221", { page: 12, slot: 3 }),
    p("Select Pro2", "SPR-HS01", "Triceps Extension", "144 × 112 × 140", { page: 13, slot: 0 }),
    p("Select Pro2", "SPR-HS02", "Biceps Curl", "114 × 104 × 140", { page: 13, slot: 1 }),
    p("Select Pro2", "SPR-HS03", "Seated Row", "132 × 86 × 180", { page: 13, slot: 2 }),
    p("Select Pro2", "SPR-HS04", "Chest Press", "104 × 145 × 163", { page: 13, slot: 3 }, true),
    p("Select Pro2", "SPR-HS15", "Hip Adduction", "155 × 66 × 140", { page: 14, slot: 0 }),
    p("Select Pro2", "SPR-HS16", "Hip Abduction", "155 × 66 × 140", { page: 14, slot: 1 }),
  ],

  // ── MTS ──
  ...[
    p("MTS", "MTSHR", "MTS Lateral High Row", "130 × 158 × 209", { page: 16, slot: 0 }),
    p("MTS", "MTSCP", "MTS Lateral Chest Press", "102 × 173 × 196", { page: 16, slot: 1 }, true),
    p("MTS", "MTSFP", "MTS Lateral Front Pulldown", "122 × 148 × 204", { page: 16, slot: 2 }),
    p("MTS", "MTSBC", "MTS Lateral Biceps Curl", "97 × 148 × 150", { page: 16, slot: 3 }),
    p("MTS", "MTSIP", "MTS Lateral Incline Press", "102 × 173 × 296", { page: 17, slot: 0 }),
    p("MTS", "MTSTE", "MTS Lateral Triceps Extension", "92 × 133 × 153", { page: 17, slot: 1 }),
    p("MTS", "MTSDP", "MTS Lateral Decline Press", "100 × 163 × 168", { page: 17, slot: 2 }),
    p("MTS", "MTSLE", "MTS Lateral Leg Extension", "122 × 145 × 140", { page: 17, slot: 3 }),
    p("MTS", "MTSKC", "MTS Lateral Kneeling Leg Curl", "115 × 158 × 138", { page: 18, slot: 0 }),
    p("MTS", "MTSVS", "MTS V Squat", "244 × 79 × 201", { page: 18, slot: 1 }),
    p("MTS", "MTSSP", "MTS Lateral Shoulder Press", "155 × 158 × 138", { page: 18, slot: 2 }),
    p("MTS", "MTSRW", "MTS Lateral Row", "130 × 158 × 209", { page: 18, slot: 3 }),
    p("MTS", "MTSAB", "MTS Abdominal Crunch", "112 × 100 × 143", { page: 19, slot: 0 }),
  ],

  // ── ISO ──
  ...[
    p("ISO", "H74", "ISO Seated Biceps", "112 × 117 × 140", { page: 21, slot: 0 }),
    p("ISO", "H68", "ISO Lateral Row", "155 × 127 × 132", { page: 21, slot: 1 }),
    p("ISO", "H67", "ISO Lateral Low Row", "127 × 122 × 168", { page: 21, slot: 2 }),
    p("ISO", "H66", "ISO Lateral D.Y. Row", "142 × 155 × 203", { page: 21, slot: 3 }),
    p("ISO", "H65", "ISO Lateral High Row", "163 × 145 × 201", { page: 22, slot: 0 }),
    p("ISO", "H63", "ISO Lateral Wide Pulldown", "123 × 180 × 201", { page: 22, slot: 1 }),
    p("ISO", "H61", "ISO Lateral Shoulder Press", "132 × 152 × 185", { page: 22, slot: 2 }),
    p("ISO", "H64", "ISO Lateral Front Lat Pulldown", "165 × 124 × 201", { page: 22, slot: 3 }),
    p("ISO", "H80", "ISO Abdominal Oblique Crunch", "148 × 144 × 154", { page: 23, slot: 0 }),
    p("ISO", "H78", "ISO Pullover", "140 × 163 × 147", { page: 23, slot: 1 }),
    p("ISO", "H77", "ISO Lateral Raise", "114 × 142 × 119", { page: 23, slot: 2 }),
    p("ISO", "H75", "ISO Seated Dip", "168 × 124 × 109", { page: 23, slot: 3 }),
    p("ISO", "H91", "ISO Seated Calf Raise", "124 × 84 × 112", { page: 24, slot: 0 }),
    p("ISO", "H82", "ISO Linear Hack Press", "214 × 155 × 138", { page: 24, slot: 1 }),
    p("ISO", "H83", "ISO Linear Leg Press", "241 × 165 × 145", { page: 24, slot: 2 }, true),
    p("ISO", "H81", "ISO V-Squat", "247 × 107 × 205", { page: 24, slot: 3 }),
    p("ISO", "H59", "ISO Lateral Wide Chest", "195 × 114 × 189", { page: 25, slot: 0 }),
    p("ISO", "H58", "ISO Lateral Horizontal Bench Press", "153 × 175 × 146", { page: 25, slot: 1 }),
    p("ISO", "H57", "ISO Lateral Decline Chest Press", "145 × 170 × 173", { page: 25, slot: 2 }),
    p("ISO", "H56", "ISO Lateral Super Incline Press", "127 × 150 × 153", { page: 25, slot: 3 }),
    p("ISO", "H60", "ISO Lateral Chest / Back", "198 × 137 × 229", { page: 26, slot: 0 }),
    p("ISO", "H132", "ISO T-Bar Row", "211 × 83 × 53", { page: 26, slot: 1 }),
    p("ISO", "H141", "ISO Belt Squat", "198 × 160 × 132", { page: 26, slot: 2 }),
    p("ISO", "H140", "ISO Glute Drive", "173 × 149 × 102", { page: 26, slot: 3 }),
    p("ISO", "H55", "ISO Lateral Incline Press", "117 × 140 × 191", { page: 27, slot: 0 }),
    p("ISO", "H54", "ISO Lateral Bench Press", "130 × 143 × 209", { page: 27, slot: 1 }),
    p("ISO", "H-NEW", "ISO Hack Squat", "216 × 155 × 153", { page: 27, slot: 2 }),
  ],

  // ── Leverage ──
  ...[
    p("Leverage", "CXN5003", "Leverage Abdominal Crunch", "157 × 156 × 156", { page: 29, slot: 0 }),
    p("Leverage", "CXN5002", "Leverage Biceps Curl", "155 × 157 × 104", { page: 29, slot: 1 }),
    p("Leverage", "CXN1111", "Leverage Deadlift Shrug", "188 × 156 × 79", { page: 29, slot: 2 }),
    p("Leverage", "CXN2002", "Leverage Chest Press", "180 × 150 × 147", { page: 29, slot: 3 }),
    p("Leverage", "CXN2003", "Leverage Incline Press", "193 × 130 × 130", { page: 30, slot: 0 }),
    p("Leverage", "CXN2004", "Leverage Decline Press", "206 × 147 × 124", { page: 30, slot: 1 }),
    p("Leverage", "CXN4002", "Leverage Shoulder Press", "180 × 130 × 147", { page: 30, slot: 2 }),
    p("Leverage", "CXN3004", "Leverage Low Row", "201 × 130 × 117", { page: 30, slot: 3 }),
    p("Leverage", "CXN3005", "Leverage High Row", "218 × 130 × 185", { page: 31, slot: 0 }),
    p("Leverage", "CXN3003", "Leverage Lat Pull Down", "206 × 130 × 203", { page: 31, slot: 1 }),
    p("Leverage", "CXN1130", "Leverage Hack Squat", "236 × 182 × 119", { page: 31, slot: 2 }),
    p("Leverage", "CXN1141", "Leverage Leg Press", "229 × 182 × 147", { page: 31, slot: 3 }, true),
    p("Leverage", "CXN1112", "Leverage Incline T-Bar Row", "183 × 86 × 124", { page: 32, slot: 0 }),
  ],

  // ── 프리웨이트·랙·멀티 ──
  ...[
    p("프리웨이트·랙·멀티", "HM-59", "Olympic Decline Bench", "178 × 132 × 130", { page: 34, slot: 0 }),
    p("프리웨이트·랙·멀티", "HM-49", "Back Extension", "150 × 71 × 114", { page: 34, slot: 1 }),
    p("프리웨이트·랙·멀티", "HM-53", "Adjustable Bench", "137 × 68 × 46", { page: 34, slot: 2 }),
    p("프리웨이트·랙·멀티", "HM-64", "HD Elite Power Rack", "150 × 141 × 244", { page: 34, slot: 3 }, true),
    p("프리웨이트·랙·멀티", "H110", "Utility Bench-75 Degree", "130 × 66 × 97", { page: 35, slot: 0 }),
    p("프리웨이트·랙·멀티", "H122", "Deluxe Weight Tree", "74 × 58 × 99", { page: 35, slot: 1 }),
    p("프리웨이트·랙·멀티", "H119", "Two Tier Dumbbell Rack", "53 × 229 × 84", { page: 35, slot: 2 }),
    p("프리웨이트·랙·멀티", "H112", "ISO Seated Arm Curl", "97 × 86 × 107", { page: 35, slot: 3 }),
    p("프리웨이트·랙·멀티", "H101", "Olympic Flat Bench", "133 × 127 × 127", { page: 36, slot: 0 }),
    p("프리웨이트·랙·멀티", "H102", "Olympic Incline Bench", "130 × 133 × 148", { page: 36, slot: 1 }),
    p("프리웨이트·랙·멀티", "H105", "Olympic Bench Weight Storage", "56 × 39 × 117", { page: 36, slot: 2 }),
    p("프리웨이트·랙·멀티", "H62", "ISO Smith Machine", "126 × 220 × 236", { page: 36, slot: 3 }, true),
    p("프리웨이트·랙·멀티", "SPR-F03", "4 Stack Multi Station", "503 × 557 × 285", { page: 37, slot: 0 }),
    p("프리웨이트·랙·멀티", "SPR-F02", "Adjustable Cable Crossover", "381 × 72 × 239", { page: 37, slot: 1 }, true),
    p("프리웨이트·랙·멀티", "SPR-F01", "Dual Adjustable Pulley", "112 × 158 × 242", { page: 37, slot: 2 }),
    p("프리웨이트·랙·멀티", "SPR-F05", "LF Olympic Flat Bench", "125 × 130 × 130", { page: 37, slot: 3 }),
    p("프리웨이트·랙·멀티", "SPR-F07", "LF Olympic Decline Bench", "173 × 130 × 130", { page: 38, slot: 0 }),
    p("프리웨이트·랙·멀티", "SPR-F06", "LF Olympic Incline Bench", "257 × 305 × 145", { page: 38, slot: 1 }),
    p("프리웨이트·랙·멀티", "SPR-F17", "LF Adjustable Decline Abdominal Crunch", "155 × 112 × 81", { page: 38, slot: 2 }),
    p("프리웨이트·랙·멀티", "SPR-F16", "LF Leg Raise Dip Chin", "114 × 127 × 233", { page: 38, slot: 3 }),
    p("프리웨이트·랙·멀티", "SPR-F15", "LF Arm Curl Bench", "119 × 84 × 117", { page: 39, slot: 0 }),
    p("프리웨이트·랙·멀티", "SPR-F13", "LF Multi Adjustable Bench", "135 × 81 × 114", { page: 39, slot: 1 }),
    p("프리웨이트·랙·멀티", "SPR-F11", "LF Flat Bench", "119 × 79 × 42", { page: 39, slot: 2 }),
    p("프리웨이트·랙·멀티", "SPR-F12", "LF Utility Bench", "91 × 71 × 91", { page: 39, slot: 3 }),
    p("프리웨이트·랙·멀티", "SPR-F10", "LF Olympic Bench Weight Storage", "44 × 72 × 125", { page: 40, slot: 0 }),
    p("프리웨이트·랙·멀티", "SPR-F09", "LF Olympic Squat Rack", "305 × 305 × 192", { page: 40, slot: 1 }),
    p("프리웨이트·랙·멀티", "SPR-F08", "LF Olympic Military Bench", "122 × 130 × 168", { page: 40, slot: 2 }),
    p("프리웨이트·랙·멀티", "SPR-F14", "LF Calf Raise", "155 × 74 × 107", { page: 40, slot: 3 }),
    p("프리웨이트·랙·멀티", "SPR-F27", "LF Barbell Rack", "97 × 88 × 156", { page: 41, slot: 0 }),
    p("프리웨이트·랙·멀티", "SPR-F26", "LF Handle Rack", "97 × 76 × 76", { page: 41, slot: 1 }),
    p("프리웨이트·랙·멀티", "SPR-F25", "LF Olympic Weight Tree", "69 × 58 × 94", { page: 41, slot: 2 }),
    p("프리웨이트·랙·멀티", "SPR-F23", "LF Single Tier Dumbbell Rack", "227 × 56 × 74", { page: 41, slot: 3 }),
    p("프리웨이트·랙·멀티", "SPR-F24", "LF Two Tier Dumbbell Rack", "229 × 64 × 84", { page: 42, slot: 0 }),
    p("프리웨이트·랙·멀티", "SPR-F22", "LF Back Extension", "127 × 94 × 97", { page: 42, slot: 1 }),
    p("프리웨이트·랙·멀티", "SPR-F21", "LF Leg Raise", "117 × 84 × 163", { page: 42, slot: 2 }),
    p("프리웨이트·랙·멀티", "SPR-F20", "LF Abdominal Crunch Bench", "156 × 81 × 97", { page: 42, slot: 3 }),
    p("프리웨이트·랙·멀티", "HM-65", "HD Elite Half Rack", "94 × 141 × 244", { page: 43, slot: 0 }),
    p("프리웨이트·랙·멀티", "HM-48", "Chin Dip Leg Raise", "124 × 112 × 234", { page: 43, slot: 1 }),
    p("프리웨이트·랙·멀티", "HM-55", "Abdominal Bench", "170 × 61 × 89", { page: 43, slot: 2 }),
    p("프리웨이트·랙·멀티", "HM-66", "Multi Adjustable Bench", "133 × 57 × 47", { page: 43, slot: 3 }),
    p("프리웨이트·랙·멀티", "SPR-F18", "LF Smith Machine", "221 × 125 × 236", { page: 44, slot: 0 }),
    p("프리웨이트·랙·멀티", "SPR-F19", "LF Linear Leg Press", "249 × 155 × 155", { page: 44, slot: 1 }),
    p("프리웨이트·랙·멀티", "SPR-F04", "8 Stack Multi Station", "562 × 366 × 239", { page: 44, slot: 2 }),
    p("프리웨이트·랙·멀티", "H107", "Olympic Power Rack", "163 × 171 × 239", { page: 44, slot: 3 }),
    p("프리웨이트·랙·멀티", "H108", "Flat Bench", "127 × 48 × 41", { page: 45, slot: 0 }),
  ],

  // ── 유산소 ──
  p("유산소", "MC-STAIRS", "Stairs", "170 × 85 × 210", { page: 47, slot: 0 }, true),
];

export const LEGACY_SEED_IDS = [
  "seed-power-rack",
  "seed-treadmill",
  "seed-lat-pulldown",
  "seed-dumbbell-set",
];
