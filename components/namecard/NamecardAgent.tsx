"use client";

// 명함 디자인 에이전트 — 클라이언트 루트.
// 대화 히스토리(Anthropic 포맷)를 보관하고 매 턴 전체를 서버로 전송(스테이트리스 서버).
// SSE 이벤트를 파싱해 채팅 로그·프리뷰를 갱신한다.

import { useCallback, useRef, useState } from "react";
import ChatPanel, { type ChatEntry } from "./ChatPanel";
import PreviewPanel from "./PreviewPanel";
import OrderSheet from "./OrderSheet";
import type { PresetKey } from "@/lib/design-agent/presets";

export type Design = {
  frontSvg: string;
  backSvg: string;
  palette: string[];
  fonts: string[];
  summary: string;
};

// 서버로 그대로 전달되는 Anthropic 메시지(직렬화 가능 형태만 사용)
type ApiMessage = { role: "user" | "assistant"; content: unknown };

const MAX_AUTO_CONTINUE = 2;
const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function parseSseChunk(
  buffer: string,
  onEvent: (event: string, data: unknown) => void
): string {
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const part of parts) {
    let event = "";
    let data = "";
    for (const line of part.split("\n")) {
      if (line.startsWith("event: ")) event = line.slice(7).trim();
      else if (line.startsWith("data: ")) data += line.slice(6);
    }
    if (event && data) {
      try {
        onEvent(event, JSON.parse(data));
      } catch {
        /* 무시 */
      }
    }
  }
  return rest;
}

async function downscaleToDataUrl(file: File, maxDim = 512): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

export default function NamecardAgent({ product = "namecard" }: { product?: PresetKey }) {
  const [entries, setEntries] = useState<ChatEntry[]>([]);
  const [design, setDesign] = useState<Design | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [logoDataUrl, setLogoDataUrl] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const messagesRef = useRef<ApiMessage[]>([]);
  // 다음 사용자 메시지에 1회 동봉할 로고 컨텍스트(다운스케일 이미지 블록)
  const pendingLogoRef = useRef<{ mediaType: string; data: string } | null>(null);

  const pushEntry = useCallback((e: ChatEntry) => {
    setEntries((prev) => [...prev, e]);
  }, []);

  const appendAssistantText = useCallback((delta: string) => {
    setEntries((prev) => {
      const last = prev[prev.length - 1];
      if (last?.kind === "assistant") {
        return [...prev.slice(0, -1), { ...last, text: last.text + delta }];
      }
      return [...prev, { kind: "assistant", text: delta }];
    });
  }, []);

  const resolveToolEntry = useCallback((summary: string) => {
    setEntries((prev) => {
      const idx = prev.findLastIndex((e) => e.kind === "tool" && e.pending);
      if (idx < 0) return [...prev, { kind: "tool", summary }];
      const next = [...prev];
      next[idx] = { kind: "tool", summary };
      return next;
    });
  }, []);

  const runTurn = useCallback(
    async (autoDepth: number): Promise<void> => {
      const res = await fetch("/api/design-agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: messagesRef.current, product }),
      });

      if (!res.ok || !res.body) {
        const msg =
          res.status === 429
            ? "요청이 많아 잠시 후 다시 시도해 주세요."
            : "연결에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
        pushEntry({ kind: "error", text: msg });
        return;
      }

      let stopReason: string | null = null;
      let assistantContent: unknown = null;
      const toolIds: string[] = [];

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        buffer = parseSseChunk(buffer, (event, data) => {
          const d = data as Record<string, unknown>;
          switch (event) {
            case "text":
              appendAssistantText(String(d.t ?? ""));
              break;
            case "tool_start":
              pushEntry({ kind: "tool", summary: "시안 렌더링 중…", pending: true });
              break;
            case "tool": {
              const input = d.input as Record<string, unknown> | undefined;
              if (input && typeof input.front_svg === "string") {
                setDesign({
                  frontSvg: String(input.front_svg),
                  backSvg: String(input.back_svg ?? ""),
                  palette: Array.isArray(input.palette) ? (input.palette as string[]) : [],
                  fonts: Array.isArray(input.fonts) ? (input.fonts as string[]) : [],
                  summary: String(input.summary ?? ""),
                });
                resolveToolEntry(String(input.summary ?? "시안 업데이트"));
              }
              if (typeof d.id === "string") toolIds.push(d.id);
              break;
            }
            case "done":
              stopReason = String(d.stopReason ?? "");
              assistantContent = d.message;
              break;
            case "error":
              pushEntry({ kind: "error", text: String(d.message ?? "오류") });
              break;
          }
        });
      }

      if (assistantContent) {
        messagesRef.current = [
          ...messagesRef.current,
          { role: "assistant", content: assistantContent },
        ];
      }

      // 도구 호출로 턴이 끝나면 tool_result를 붙여 자동 이어가기 (마무리 멘트 유도)
      if (stopReason === "tool_use" && toolIds.length > 0) {
        messagesRef.current = [
          ...messagesRef.current,
          {
            role: "user",
            content: toolIds.map((id) => ({
              type: "tool_result",
              tool_use_id: id,
              content: "rendered. 고객이 미리보기를 보고 있음.",
            })),
          },
        ];
        if (autoDepth < MAX_AUTO_CONTINUE) {
          await runTurn(autoDepth + 1);
        }
      }
    },
    [appendAssistantText, pushEntry, resolveToolEntry, product]
  );

  const send = useCallback(
    async (text: string) => {
      if (streaming) return;
      const trimmed = text.trim();
      if (!trimmed) return;

      const logo = pendingLogoRef.current;
      pendingLogoRef.current = null;
      const content: unknown = logo
        ? [
            {
              type: "image",
              source: { type: "base64", media_type: logo.mediaType, data: logo.data },
            },
            {
              type: "text",
              text: `${trimmed}\n\n(고객이 로고 이미지를 업로드했습니다. SVG에서 asset:logo 로 참조하세요.)`,
            },
          ]
        : trimmed;

      messagesRef.current = [...messagesRef.current, { role: "user", content }];
      pushEntry({ kind: "user", text: trimmed });
      setStreaming(true);
      try {
        await runTurn(0);
      } catch {
        pushEntry({ kind: "error", text: "연결이 끊겼어요. 다시 시도해 주세요." });
      } finally {
        setStreaming(false);
      }
    },
    [runTurn, pushEntry, streaming]
  );

  const onLogoSelect = useCallback(
    async (file: File) => {
      if (file.size > MAX_LOGO_BYTES) {
        pushEntry({ kind: "error", text: "로고는 2MB 이하 PNG/JPG/SVG만 가능해요." });
        return;
      }
      if (!/^image\/(png|jpeg|svg\+xml)$/.test(file.type)) {
        pushEntry({ kind: "error", text: "PNG, JPG, SVG 형식만 지원해요." });
        return;
      }
      try {
        const [original, downscaled] = await Promise.all([
          fileToDataUrl(file),
          downscaleToDataUrl(file),
        ]);
        setLogoDataUrl(original);
        const m = downscaled.match(/^data:(image\/\w+);base64,(.+)$/);
        if (m) pendingLogoRef.current = { mediaType: m[1], data: m[2] };
        pushEntry({
          kind: "tool",
          summary: `로고 업로드됨 (${file.name}) — 다음 메시지와 함께 전달됩니다`,
        });
      } catch {
        pushEntry({ kind: "error", text: "로고를 읽지 못했어요. 다른 파일로 시도해 주세요." });
      }
    },
    [pushEntry]
  );

  return (
    <div className="flex flex-col-reverse gap-6 lg:grid lg:grid-cols-12 lg:items-start">
      <section className="lg:col-span-5">
        <ChatPanel
          product={product}
          entries={entries}
          streaming={streaming}
          onSend={send}
          onLogoSelect={onLogoSelect}
        />
      </section>

      <section className="lg:col-span-7 lg:sticky lg:top-6">
        <PreviewPanel product={product} design={design} logoDataUrl={logoDataUrl} />
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={!design || streaming}
            onClick={() => setSheetOpen(true)}
            className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-base transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            이 디자인으로 발주 요청
          </button>
        </div>
      </section>

      {sheetOpen && design && (
        <OrderSheet
          product={product}
          design={design}
          logoDataUrl={logoDataUrl}
          onClose={() => setSheetOpen(false)}
        />
      )}
    </div>
  );
}
