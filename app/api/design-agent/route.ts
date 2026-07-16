// 명함 디자인 에이전트 — SSE 스트리밍 채팅.
// 클라이언트가 전체 대화 히스토리(Anthropic MessageParam[])를 매 턴 전송하는
// 스테이트리스 서버. Claude는 render_design 도구로 시안을 전달한다.
//
// SSE 이벤트: text {t} · tool_start {name} · tool_progress {n} ·
//             tool {id, input} · done {stopReason, message} · error {message}

import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages";
import { buildSystemPrompt } from "@/lib/design-agent/system-prompt";
import { RENDER_DESIGN_TOOL } from "@/lib/design-agent/tools";
import { PRODUCT_PRESETS, isPresetKey } from "@/lib/design-agent/presets";
import { checkRateLimit, clientIp } from "@/lib/design-agent/ratelimit";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_MESSAGES = 40; // ≈ 12턴 (tool_result 왕복 포함)
const MAX_TEXT_CHARS = 2000; // 사용자 텍스트 1건
const MAX_BODY_BYTES = 1_500_000; // 히스토리+로고 이미지 블록 포함 상한

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

/** 클라이언트가 보낸 히스토리 최소 검증 (형식·크기만 — 내용은 모델이 판단) */
function validateMessages(raw: unknown): MessageParam[] | null {
  if (!Array.isArray(raw) || raw.length === 0 || raw.length > MAX_MESSAGES) {
    return null;
  }
  for (const m of raw) {
    if (typeof m !== "object" || m === null) return null;
    const { role, content } = m as { role?: unknown; content?: unknown };
    if (role !== "user" && role !== "assistant") return null;
    if (typeof content === "string") {
      if (role === "user" && content.length > MAX_TEXT_CHARS) return null;
      continue;
    }
    if (!Array.isArray(content)) return null;
    for (const b of content) {
      const t = (b as { type?: unknown }).type;
      if (
        t !== "text" &&
        t !== "tool_use" &&
        t !== "tool_result" &&
        t !== "image" &&
        // Sonnet 5 adaptive thinking 블록 — 툴 연속 호출 시 원본 그대로 반환 필요
        t !== "thinking" &&
        t !== "redacted_thinking"
      ) {
        return null;
      }
      if (t === "text") {
        const txt = (b as { text?: unknown }).text;
        if (typeof txt !== "string") return null;
        if (role === "user" && txt.length > MAX_TEXT_CHARS) return null;
      }
    }
  }
  return raw as MessageParam[];
}

export async function POST(req: Request) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json({ ok: false, message: "AI 기능이 아직 설정되지 않았습니다." }, 503);
  }

  const ip = clientIp(req);
  if (!checkRateLimit(`chat:${ip}`, 20, 10 * 60 * 1000)) {
    return json(
      { ok: false, message: "요청이 많아 잠시 후 다시 시도해 주세요." },
      429
    );
  }

  const bodyText = await req.text();
  if (bodyText.length > MAX_BODY_BYTES) {
    return json({ ok: false, message: "대화가 너무 깁니다. 새로 시작해 주세요." }, 413);
  }

  let messages: MessageParam[] | null = null;
  let productKey = "namecard";
  try {
    const parsed = JSON.parse(bodyText) as { messages?: unknown; product?: unknown };
    messages = validateMessages(parsed.messages);
    if (typeof parsed.product === "string" && isPresetKey(parsed.product)) {
      productKey = parsed.product;
    }
  } catch {
    /* fallthrough */
  }
  if (!messages) {
    return json({ ok: false, message: "잘못된 요청입니다." }, 400);
  }
  const preset = PRODUCT_PRESETS[productKey as keyof typeof PRODUCT_PRESETS];

  const client = new Anthropic({ apiKey });
  const model = process.env.DESIGN_AGENT_MODEL ?? "claude-sonnet-5";
  const encoder = new TextEncoder();

  const rs = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };
      try {
        const stream = client.messages.stream({
          model,
          max_tokens: 8000,
          system: [
            {
              type: "text",
              text: buildSystemPrompt(preset),
              cache_control: { type: "ephemeral" },
            },
          ],
          tools: [RENDER_DESIGN_TOOL],
          messages: messages!,
        });

        stream.on("text", (delta) => send("text", { t: delta }));
        stream.on("streamEvent", (e) => {
          if (
            e.type === "content_block_start" &&
            e.content_block.type === "tool_use"
          ) {
            send("tool_start", { name: e.content_block.name });
          } else if (
            e.type === "content_block_delta" &&
            e.delta.type === "input_json_delta"
          ) {
            send("tool_progress", { n: e.delta.partial_json.length });
          }
        });

        const final = await stream.finalMessage();
        for (const block of final.content) {
          if (block.type === "tool_use" && block.name === RENDER_DESIGN_TOOL.name) {
            send("tool", { id: block.id, input: block.input });
          }
        }
        send("done", { stopReason: final.stop_reason, message: final.content });
      } catch (err) {
        console.error("[design-agent] stream error:", err);
        send("error", {
          message: "응답 생성 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(rs, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
