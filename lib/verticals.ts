// 병원/헬스장 두 버티컬의 콘텐츠·테마를 한 곳에서 관리.
// 컴포넌트는 하드코딩 대신 이 객체에서만 값을 가져온다.

export type VerticalKey = "gym" | "hospital";

export interface Strength {
  no: string; // "01"
  title: string;
  body: string;
}

export interface ProcessStep {
  no: string; // "01"
  title: string;
  body: string;
}

export interface CaseItem {
  name: string; // 프로젝트명 (※ 샘플 — 실제 실적으로 교체)
  meta: string; // 평수·유형 등
  result: string; // 핵심 성과
}

export interface Review {
  quote: string;
  author: string; // 익명/이니셜 권장
  role: string; // "헬스장 관장" 등
}

export interface OfferingGroup {
  tag: string; // 영문 태그 (AI, GEAR ...)
  title: string; // 한글 분류명
  items: string[]; // 취급 품목/서비스
}

export interface Vertical {
  key: VerticalKey;
  label: string; // 한글 라벨
  labelEn: string; // 영문 라벨 (eyebrow용)
  accent: string; // 런타임 주입되는 --accent 값
  hero: {
    eyebrow: string;
    title: string;
    sub: string;
    cta: string;
  };
  strengths: Strength[];
  stats: { value: string; label: string }[];
  process: ProcessStep[];
  cases: CaseItem[];
  reviews: Review[];
  offerings: OfferingGroup[];
  contact: {
    eyebrow: string;
    title: string;
    sub: string;
  };
}

export const verticals: Record<VerticalKey, Vertical> = {
  gym: {
    key: "gym",
    label: "헬스장",
    labelEn: "FITNESS",
    accent: "#e0892b", // 에너지 오렌지
    hero: {
      eyebrow: "Fitness Opening Partner",
      title: "헬스장 오픈,\n골지어스가 가장 많이 해봤습니다.",
      sub: "공간 배치부터 수익성 분석, 기구·인테리어·운영까지 — 1,200곳을 열어본 실무가 한 팀에 있습니다.",
      cta: "오픈 상담 신청",
    },
    strengths: [
      { no: "01", title: "공간·동선 설계", body: "평수와 콘셉트에 맞춘 배치로 회원 경험과 매출 동선을 동시에 잡습니다." },
      { no: "02", title: "수익성 분석", body: "오픈 전 손익 시뮬레이션으로 무리 없는 투자 구조를 설계합니다." },
      { no: "03", title: "기구·운영 일체", body: "기구 발주부터 CRM·결제·운영 시스템까지 한 번에 셋업합니다." },
    ],
    stats: [
      { value: "40", label: "월 평균 센터 오픈" },
      { value: "1,200+", label: "누적 센터 오픈" },
    ],
    process: [
      { no: "01", title: "상담·진단", body: "입지·평수·예산을 함께 진단하고 오픈 목표를 명확히 합니다." },
      { no: "02", title: "수익성 분석", body: "손익 시뮬레이션으로 회원가·정원·고정비 구조를 설계합니다." },
      { no: "03", title: "공간·동선 설계", body: "콘셉트에 맞춘 평면과 기구 배치로 매출 동선을 만듭니다." },
      { no: "04", title: "기구·인테리어 시공", body: "기구 발주부터 인테리어 시공까지 일정과 품질을 관리합니다." },
      { no: "05", title: "오픈·운영 지원", body: "CRM·결제 셋업과 오픈 마케팅으로 초기 운영을 안정화합니다." },
    ],
    cases: [
      { name: "한 팀이 전부", meta: "ONE-STOP", result: "공간·기구·인테리어·IT·보안·F&B까지 한 번에 — 업체 여러 곳 알아볼 필요 없습니다." },
      { name: "결정만 하세요", meta: "EASY", result: "복잡한 발주·시공·세팅은 골지어스가. 대표님은 콘셉트와 예산만 정하면 됩니다." },
      { name: "열면 바로 가동", meta: "READY", result: "CRM·결제·오픈 마케팅까지 세팅해, 오픈 첫날부터 운영에만 집중하도록." },
    ],
    reviews: [
      { quote: "오픈 일정과 예산을 한 번도 넘기지 않았어요. 처음 여는 입장에서 가장 든든했던 부분입니다.", author: "K 관장", role: "헬스장 신규 오픈" },
      { quote: "수익 구조부터 같이 짜주니 무리한 투자를 피할 수 있었습니다.", author: "J 대표", role: "복합 피트니스" },
    ],
    offerings: [
      { tag: "AI", title: "AI 솔루션", items: ["Formula X 헬스장 경영", "Milestone X 팀 프로젝트 관리", "BROJ"] },
      { tag: "CONSULT", title: "컨설팅", items: ["부띠끄·퍼블릭 피트니스 콘텐츠", "공간 배치·동선 설계", "수익성 분석"] },
      { tag: "GEAR", title: "기구 판매", items: ["헬스 기구", "유산소 머신", "웨이트 머신", "트레이닝 장비 일체"] },
      { tag: "RENTAL", title: "렌탈", items: ["코웨이", "SK매직", "LG", "청호", "쿠쿠", "큐밍", "웰스", "단말기", "세스코(향기·살균·방역)"] },
      { tag: "NETWORK·IT", title: "네트워크·IT", items: ["기업 인터넷", "셋탑 TV", "기업 WIFI", "네트워크 통합 포설", "PC", "IoT"] },
      { tag: "SIGN", title: "사이니지", items: ["DID", "LED", "LCD", "비디오월", "CMS", "옥외 전광판", "키오스크", "빔프로젝터"] },
      { tag: "LIVING", title: "생활·가전", items: ["복합기", "안마의자", "세라젬", "커피머신", "워시타워", "시스템 에어컨", "공기청정기"] },
      { tag: "SECURITY", title: "보안·CCTV", items: ["SECOM", "CAPS", "출입통제", "AI CCTV", "화재·사업장 책임보험"] },
      { tag: "F&B", title: "F&B", items: ["Vrink 무인 음료", "스마트 자판기 솔루션"] },
    ],
    contact: {
      eyebrow: "Get Started",
      title: "헬스장 오픈, 어디서부터 시작할지 같이 정리해 드립니다.",
      sub: "입지·평수·예산만 알려주시면 무료로 초기 진단을 도와드립니다.",
    },
  },
  hospital: {
    key: "hospital",
    label: "병원",
    labelEn: "CLINIC",
    accent: "#3b8fb0", // 임상 신뢰 블루
    hero: {
      eyebrow: "Clinic Opening Partner",
      title: "병원 개원,\n검증된 실무로 안전하게.",
      sub: "공간 설계와 인허가 동선, 장비·네트워크·사이니지까지 개원에 필요한 전 과정을 한 팀이 책임집니다.",
      cta: "개원 상담 신청",
    },
    strengths: [
      { no: "01", title: "공간·인허가 설계", body: "진료 동선과 인허가 요건을 함께 고려한 평면을 제안합니다." },
      { no: "02", title: "장비·IT 인프라", body: "의료장비, 네트워크, 사이니지, 보안까지 통합 구축합니다." },
      { no: "03", title: "운영 시스템", body: "예약·고객관리·결제 시스템을 개원 시점에 맞춰 안정화합니다." },
    ],
    stats: [
      { value: "1,200+", label: "누적 오픈 프로젝트" },
      { value: "원스톱", label: "설계·시공·운영 일괄" },
    ],
    process: [
      { no: "01", title: "개원 상담", body: "진료과목·입지·규모를 진단하고 개원 방향을 정리합니다." },
      { no: "02", title: "인허가·동선 설계", body: "의료법 요건을 검토해 진료 동선이 살아 있는 평면을 제안합니다." },
      { no: "03", title: "장비·IT 인프라", body: "의료장비, 네트워크, 보안, 사이니지를 통합 구축합니다." },
      { no: "04", title: "인테리어 시공", body: "공간 콘셉트와 일정·품질을 한 팀이 책임지고 관리합니다." },
      { no: "05", title: "운영 시스템·개원", body: "예약·CRM·결제 시스템을 안정화하고 개원을 지원합니다." },
    ],
    cases: [
      { name: "한 팀이 전부", meta: "ONE-STOP", result: "공간·인허가·장비·네트워크·사이니지까지 한 번에 — 창구 하나로 끝납니다." },
      { name: "진료 준비만 하세요", meta: "EASY", result: "인허가 동선·시공·셋업은 골지어스가. 원장님은 진료에만 집중하면 됩니다." },
      { name: "열면 바로 가동", meta: "READY", result: "예약·CRM·결제까지 세팅해, 개원 첫날부터 안정적으로." },
    ],
    reviews: [
      { quote: "인허가 동선까지 챙겨주셔서 개원 일정이 한 번도 밀리지 않았습니다.", author: "P 원장", role: "정형외과 개원" },
      { quote: "장비와 네트워크를 한 팀이 맡아주니 개원 준비가 훨씬 단순해졌어요.", author: "L 원장", role: "피부과 개원" },
    ],
    offerings: [],
    contact: {
      eyebrow: "Get Started",
      title: "개원 준비, 무엇부터 점검해야 할지 함께 정리해 드립니다.",
      sub: "진료과목·입지·규모만 알려주시면 무료로 초기 진단을 도와드립니다.",
    },
  },
};

export const otherVertical = (k: VerticalKey): VerticalKey =>
  k === "gym" ? "hospital" : "gym";
