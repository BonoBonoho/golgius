// 버티컬과 무관한 회사 공통 정보(연락처 등) 단일 소스.
// Footer·문의 CTA 등 여러 곳에서 같은 값을 참조한다.

export const site = {
  name: "GOLGIUS",
  tagline: "Your success is our career",
  description:
    "헬스장·병원 오픈 전문 컨설팅. 공간 배치부터 수익성 분석, 기구·IT·운영까지 한 팀이 책임집니다.",
  contact: {
    ceo: "김영재",
    phone: "010-6381-5008",
    email: "yj@golgius.com",
    instagram: "@golgius_0_jae",
    instagramUrl: "https://instagram.com/golgius_0_jae",
    address: "서울 영등포구 영등포로 150, B동 712호",
  },
} as const;

// tel: 링크용 — 숫자만
export const telHref = `tel:${site.contact.phone.replace(/-/g, "")}`;
export const mailHref = `mailto:${site.contact.email}`;
