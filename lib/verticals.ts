// 병원/헬스장 두 버티컬의 콘텐츠·테마를 한 곳에서 관리.
// 컴포넌트는 하드코딩 대신 이 객체에서만 값을 가져온다.

export type VerticalKey = "gym" | "hospital";

export interface Strength {
  no: string;       // "01"
  title: string;
  body: string;
}

export interface Vertical {
  key: VerticalKey;
  label: string;          // 한글 라벨
  labelEn: string;        // 영문 라벨 (eyebrow용)
  accent: string;         // 런타임 주입되는 --accent 값
  hero: {
    eyebrow: string;
    title: string;
    sub: string;
    cta: string;
  };
  // Phase 2에서 확장될 자리 (스텁)
  strengths: Strength[];
  stats: { value: string; label: string }[];
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
  },
};

export const otherVertical = (k: VerticalKey): VerticalKey =>
  k === "gym" ? "hospital" : "gym";
