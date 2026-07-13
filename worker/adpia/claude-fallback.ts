// 예상외 화면 복구 어드바이저 — 결정적 스텝이 실패했을 때만 호출.
// 스크린샷+축약 DOM을 Claude에 보여주고 다음 액션 1개를 제안받는다.
// 자격증명은 절대 프롬프트에 넣지 않으며, 로그인 스텝에서는 사용하지 않는다.

import Anthropic from "@anthropic-ai/sdk";
import type { Page } from "playwright";
import { assertClickSafe } from "./guard.js";

export type RecoveryAction = {
  action: "click" | "fill" | "select" | "close_popup" | "abort";
  selector?: string;
  value?: string;
  reason: string;
};

const TOOL = {
  name: "suggest_action",
  description: "다음에 수행할 브라우저 액션 1개를 제안한다.",
  input_schema: {
    type: "object" as const,
    additionalProperties: false,
    required: ["action", "reason"],
    properties: {
      action: { type: "string", enum: ["click", "fill", "select", "close_popup", "abort"] },
      selector: { type: "string", description: "CSS 셀렉터" },
      value: { type: "string", description: "fill/select일 때의 값" },
      reason: { type: "string" },
    },
  },
};

export async function suggestRecovery(
  page: Page,
  stepName: string,
  errorMsg: string
): Promise<RecoveryAction | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const screenshot = await page.screenshot({ type: "jpeg", quality: 60 });
  const domSummary = await page.evaluate(() => {
    const clickables = [...document.querySelectorAll("a,button,input,select")]
      .slice(0, 60)
      .map((el) => {
        const e = el as HTMLElement;
        const tag = e.tagName.toLowerCase();
        const id = e.id ? `#${e.id}` : "";
        const name = e.getAttribute("name") ? `[name=${e.getAttribute("name")}]` : "";
        const text = (e.textContent || (e as HTMLInputElement).value || "")
          .trim()
          .slice(0, 24);
        return `${tag}${id}${name} "${text}"`;
      });
    return `URL: ${location.href}\n본문(앞 1500자): ${document.body.innerText.slice(0, 1500)}\n요소:\n${clickables.join("\n")}`;
  });

  const client = new Anthropic({ apiKey });
  const res = await client.messages.create({
    model: process.env.DESIGN_AGENT_MODEL ?? "claude-sonnet-5",
    max_tokens: 1024,
    system:
      "당신은 한국 인쇄 쇼핑몰(성원애드피아) 브라우저 자동화의 복구 어드바이저입니다. " +
      "스텝이 실패한 화면을 보고 다음 액션 1개만 suggest_action으로 제안하세요. " +
      "공지/이벤트 팝업이면 닫기를 제안하세요. 절대 금지: 결제·주문완료·예치금 관련 버튼 클릭, 로그인 정보 입력. " +
      "확신이 없으면 abort를 제안하세요.",
    tools: [TOOL],
    tool_choice: { type: "tool", name: "suggest_action" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: {
              type: "base64",
              media_type: "image/jpeg",
              data: screenshot.toString("base64"),
            },
          },
          {
            type: "text",
            text: `실패한 스텝: ${stepName}\n오류: ${errorMsg}\n\n${domSummary}`,
          },
        ],
      },
    ],
  });

  const tu = res.content.find((b) => b.type === "tool_use");
  if (!tu || tu.type !== "tool_use") return null;
  const a = tu.input as RecoveryAction;
  if (a.action === "click" && a.selector) {
    // 결제성 텍스트를 가진 요소 클릭 제안은 거부
    const label = await page
      .locator(a.selector)
      .first()
      .textContent()
      .catch(() => "");
    assertClickSafe(label ?? "");
  }
  return a;
}

export async function applyRecovery(page: Page, a: RecoveryAction): Promise<void> {
  switch (a.action) {
    case "click":
    case "close_popup":
      if (!a.selector) throw new Error("recovery selector 없음");
      await page.locator(a.selector).first().click({ timeout: 5000 });
      break;
    case "fill":
      if (!a.selector) throw new Error("recovery selector 없음");
      await page.locator(a.selector).first().fill(a.value ?? "", { timeout: 5000 });
      break;
    case "select":
      if (!a.selector) throw new Error("recovery selector 없음");
      await page.selectOption(a.selector, a.value ?? "", { timeout: 5000 });
      break;
    case "abort":
      throw new Error(`복구 불가(어드바이저 판단): ${a.reason}`);
  }
}
