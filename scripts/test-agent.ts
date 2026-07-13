// 디자인 에이전트 CLI 검증 — UI 없이 프롬프트·툴 계약 품질을 확인한다.
// 실행: npm run test:agent  (ANTHROPIC_API_KEY 필요 — .env.local 로드)
//
// 시나리오: 명함 요청 → render_namecard 호출 확인 → SVG 계약 단언
//           → tool_result 반환 → 수정 요청 → 재렌더 확인

import "dotenv/config";
import { config } from "dotenv";
config({ path: ".env.local" });

import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam, ToolUseBlock } from "@anthropic-ai/sdk/resources/messages";
import { buildSystemPrompt } from "../lib/design-agent/system-prompt";
import { RENDER_NAMECARD_TOOL, isRenderNamecardInput } from "../lib/design-agent/tools";
import { ALLOWED_FONTS, PRODUCT_PRESETS, viewBoxOf } from "../lib/design-agent/presets";

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) {
  console.error("✗ ANTHROPIC_API_KEY가 없습니다 (.env.local 확인)");
  process.exit(1);
}

const client = new Anthropic({ apiKey });
const model = process.env.DESIGN_AGENT_MODEL ?? "claude-sonnet-5";

let failures = 0;
function assert(cond: boolean, label: string) {
  console.log(`${cond ? "✓" : "✗"} ${label}`);
  if (!cond) failures += 1;
}

function checkSvg(svg: string, face: string) {
  const vb = viewBoxOf(PRODUCT_PRESETS.namecard);
  assert(svg.includes(`viewBox="${vb}"`), `${face}: viewBox="${vb}"`);
  assert(!/<script/i.test(svg), `${face}: <script> 없음`);
  assert(!/<foreignObject/i.test(svg), `${face}: <foreignObject> 없음`);
  assert(!/\son\w+=/i.test(svg), `${face}: on* 핸들러 없음`);
  assert(
    !/href="(?!asset:logo)(?!#)(?!data:image\/)/i.test(svg),
    `${face}: 외부 href 없음`
  );
}

async function turn(messages: MessageParam[]) {
  const res = await client.messages.create({
    model,
    max_tokens: 8000,
    system: buildSystemPrompt(),
    tools: [RENDER_NAMECARD_TOOL],
    messages,
  });
  return res;
}

async function main() {
  console.log(`model: ${model}\n── 1턴: 시안 요청 ──`);
  const messages: MessageParam[] = [
    {
      role: "user",
      content:
        "명함 만들어주세요. 이름 홍길동, 직함 트레이닝 팀장, 회사 골지어스 짐, 전화 010-1234-5678, 이메일 hong@golgius.com. 다크 + 골드 포인트의 미니멀한 느낌이요.",
    },
  ];

  const first = await turn(messages);
  const toolUse = first.content.find(
    (b): b is ToolUseBlock => b.type === "tool_use" && b.name === "render_namecard"
  );
  assert(!!toolUse, "render_namecard 호출됨");
  if (!toolUse) process.exit(1);

  const input = toolUse.input;
  assert(isRenderNamecardInput(input), "input 스키마 형태 일치");
  if (!isRenderNamecardInput(input)) process.exit(1);

  checkSvg(input.front_svg, "front");
  checkSvg(input.back_svg, "back");
  assert(
    input.fonts.every((f) => (ALLOWED_FONTS as readonly string[]).includes(f)),
    `fonts ⊆ 허용 목록 (${input.fonts.join(", ")})`
  );
  assert(input.palette.every((c) => /^#[0-9a-fA-F]{3,8}$/.test(c)), "palette hex 형식");
  assert(/<text/i.test(input.front_svg) && input.front_svg.includes("홍길동"), "앞면에 이름 텍스트");
  console.log(`  summary: ${input.summary}`);

  console.log("\n── 2턴: 수정 요청 ──");
  messages.push({ role: "assistant", content: first.content });
  messages.push({
    role: "user",
    content: [
      {
        type: "tool_result",
        tool_use_id: toolUse.id,
        content: "rendered. 고객이 미리보기를 보고 있음.",
      },
      { type: "text", text: "좋아요! 뒷면을 영문 버전으로 바꿔주세요." },
    ],
  });

  const second = await turn(messages);
  const toolUse2 = second.content.find(
    (b): b is ToolUseBlock => b.type === "tool_use" && b.name === "render_namecard"
  );
  assert(!!toolUse2, "수정 요청에 재렌더링");
  if (toolUse2 && isRenderNamecardInput(toolUse2.input)) {
    checkSvg(toolUse2.input.back_svg, "back(수정)");
    assert(/Hong|HONG|Gildong|Gil-dong/i.test(toolUse2.input.back_svg), "뒷면 영문 반영");
    console.log(`  summary: ${toolUse2.input.summary}`);
  }

  console.log(failures === 0 ? "\n모든 단언 통과 ✓" : `\n실패 ${failures}건 ✗`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => {
  console.error("✗ 실행 오류:", e?.message ?? e);
  process.exit(1);
});
