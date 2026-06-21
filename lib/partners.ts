// 골지어스와 함께 오픈한 센터(파트너) 로고 — 버티컬별 관리.
//
// 로고 추가 방법:
//   1) 이미지 파일을 public/partners/ 에 넣는다 (가급적 배경 투명 PNG 권장).
//   2) 아래 배열에 { name, src } 한 줄 추가. src 는 "/partners/파일명".
//   배경이 있는 로고도 흰색 타일 위에 올라가 통일감 있게 보인다.

import type { VerticalKey } from "@/lib/verticals";

export interface Partner {
  name: string; // 접근성 alt
  src: string; // /partners/...
}

export const partners: Record<VerticalKey, Partner[]> = {
  gym: [
    { name: "SENSE GYM", src: "/partners/sense-gym.svg" },
    { name: "RAPS FITNESS 24/365", src: "/partners/rapsfitness.svg" },
    { name: "UrbanField", src: "/partners/urbanfield.svg" },
    { name: "파트너 센터", src: "/partners/mask.svg" },
    { name: "BODY CHANNEL", src: "/partners/bodychannel.svg" },
  ],
  hospital: [],
};
