// design-agent가 사용하는 Anthropic tool 정의.
// render_namecard: Claude가 시안을 만들/고칠 때마다 호출 — 구조화된 SVG 계약으로
// 클라이언트 프리뷰와 서버 PDF가 동일 데이터를 사용한다.

import type { Tool } from "@anthropic-ai/sdk/resources/messages";
import { ALLOWED_FONTS } from "./presets";

export type RenderNamecardInput = {
  front_svg: string;
  back_svg: string;
  palette: string[];
  fonts: string[];
  summary: string;
};

export const RENDER_NAMECARD_TOOL: Tool = {
  name: "render_namecard",
  description:
    "명함 시안을 생성하거나 수정할 때마다 호출한다. 앞면·뒷면 SVG 전체 문서를 전달하면 고객 화면에 즉시 렌더링된다. 부분 수정이라도 항상 두 면의 완전한 SVG를 다시 보낸다.",
  input_schema: {
    type: "object" as const,
    additionalProperties: false,
    required: ["front_svg", "back_svg", "palette", "fonts", "summary"],
    properties: {
      front_svg: {
        type: "string",
        description: '앞면 SVG 전체. viewBox="0 0 92 52", 1 unit = 1mm.',
      },
      back_svg: {
        type: "string",
        description: "뒷면 SVG 전체. 앞면과 동일 규격.",
      },
      palette: {
        type: "array",
        items: { type: "string" },
        description: "사용한 hex 색상 목록 (예: #0b0b0d)",
      },
      fonts: {
        type: "array",
        items: { type: "string", enum: [...ALLOWED_FONTS] },
        description: "사용한 폰트 패밀리 — 허용 목록 내에서만",
      },
      summary: {
        type: "string",
        description: "이번 시안/수정의 한 줄 요약 (고객 화면 로그에 표시)",
      },
    },
  },
};

export function isRenderNamecardInput(v: unknown): v is RenderNamecardInput {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.front_svg === "string" &&
    typeof o.back_svg === "string" &&
    Array.isArray(o.palette) &&
    Array.isArray(o.fonts) &&
    typeof o.summary === "string"
  );
}
