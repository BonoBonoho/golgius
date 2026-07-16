"use client";

// 터미널 로그 스타일 채팅 패널 (말풍선 없음 — Claude Code 무드).
// user: "❯ " 프롬프트 / assistant: 스트리밍 본문 / tool: ● 모노 라벨 한 줄

import { useEffect, useRef, useState } from "react";
import type { PresetKey } from "@/lib/design-agent/presets";

export type ChatEntry =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "tool"; summary: string; pending?: boolean }
  | { kind: "error"; text: string };

const PRODUCT_COPY: Record<
  PresetKey,
  { greeting: string; suggestions: string[]; placeholder: string }
> = {
  namecard: {
    greeting:
      "안녕하세요, 골지어스 디자인 에이전트입니다. 채팅으로 명함을 함께 만들어요. 이름·직함·연락처와 원하는 분위기를 알려주시면 바로 시안을 보여드릴게요.",
    suggestions: [
      "다크 배경에 골드 포인트 미니멀 명함",
      "화이트 클래식, 세리프 느낌으로",
      "피트니스 트레이너 명함, 볼드하게",
    ],
    placeholder: "예) 이름 홍길동, 직함 대표, 010-1234-5678 · 미니멀한 다크톤으로",
  },
  towel: {
    greeting:
      "안녕하세요, 골지어스 디자인 에이전트입니다. 헬스장 수건 나염 디자인을 함께 만들어요. 브랜드명·수건 바탕색·원하는 분위기를 알려주시면 바로 시안을 보여드릴게요.",
    suggestions: [
      "차콜 수건에 화이트 로고 타이포, 미니멀",
      "블랙 수건 중앙에 큰 볼드 레터링",
      "화이트 수건에 골드 라인 패턴",
    ],
    placeholder: "예) 골지어스 짐, 차콜 수건에 화이트 로고 · 볼드하게",
  },
  apparel: {
    greeting:
      "안녕하세요, 골지어스 디자인 에이전트입니다. 단체복 프린트 디자인을 함께 만들어요. 팀/브랜드명·옷 색·프린트 위치(가슴/등판)를 알려주시면 바로 시안을 보여드릴게요.",
    suggestions: [
      "블랙 티셔츠, 좌가슴 소형 로고 + 등판 큰 타이포",
      "화이트 티셔츠에 미니멀 라인 그래픽",
      "스트릿 무드의 볼드한 등판 프린트",
    ],
    placeholder: "예) 골지어스 크루, 블랙 티셔츠 · 등판에 크게 GOLGIUS",
  },
};

export default function ChatPanel({
  product = "namecard",
  entries,
  streaming,
  onSend,
  onLogoSelect,
}: {
  product?: PresetKey;
  entries: ChatEntry[];
  streaming: boolean;
  onSend: (text: string) => void;
  onLogoSelect: (file: File) => void;
}) {
  const copy = PRODUCT_COPY[product];
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [entries, streaming]);

  const submit = () => {
    if (streaming || !input.trim()) return;
    onSend(input);
    setInput("");
  };

  return (
    <div className="flex h-[70vh] flex-col overflow-hidden rounded-2xl border border-line bg-surface lg:h-[calc(100vh-180px)]">
      {/* 타이틀 바 */}
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-gold/80" />
        <span className="eyebrow">golgius design agent</span>
        <span className="ml-auto font-mono text-[0.65rem] text-dim">
          {streaming ? "streaming…" : "ready"}
        </span>
      </div>

      {/* 로그 */}
      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 font-mono text-[0.82rem] leading-relaxed">
        {entries.length === 0 && (
          <div className="space-y-4">
            <p className="text-dim">{copy.greeting}</p>
            <div className="flex flex-wrap gap-2">
              {copy.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSend(s + " — 일단 샘플 정보로 시안부터 보여주세요")}
                  className="rounded-full border border-line px-3 py-1.5 text-[0.72rem] text-dim transition hover:border-gold hover:text-ink"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {entries.map((e, i) => {
          switch (e.kind) {
            case "user":
              return (
                <p key={i} className="whitespace-pre-wrap text-ink">
                  <span className="select-none text-gold">❯ </span>
                  {e.text}
                </p>
              );
            case "assistant":
              return (
                <p key={i} className="whitespace-pre-wrap text-dim">
                  {e.text}
                </p>
              );
            case "tool":
              return (
                <p key={i} className="eyebrow flex items-center gap-2 normal-case tracking-normal">
                  <span className={e.pending ? "animate-pulse" : ""}>●</span>
                  <span>
                    render_design — {e.summary}
                  </span>
                </p>
              );
            case "error":
              return (
                <p key={i} className="text-[0.78rem] text-red-400">
                  ⚠ {e.text}
                </p>
              );
          }
        })}
        {streaming && <span className="inline-block h-4 w-2 animate-pulse bg-gold/80" />}
      </div>

      {/* 입력 */}
      <div className="border-t border-line p-3">
        <div className="flex items-end gap-2">
          <button
            type="button"
            title="로고 업로드 (PNG/JPG/SVG, 2MB 이하)"
            onClick={() => fileRef.current?.click()}
            className="shrink-0 rounded-lg border border-line px-3 py-2.5 font-mono text-xs text-dim transition hover:border-gold hover:text-ink"
          >
            + 로고
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/svg+xml"
            className="hidden"
            onChange={(ev) => {
              const f = ev.target.files?.[0];
              if (f) onLogoSelect(f);
              ev.target.value = "";
            }}
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                submit();
              }
            }}
            rows={2}
            maxLength={2000}
            placeholder={copy.placeholder}
            className="min-h-[2.75rem] flex-1 resize-none rounded-lg border border-line bg-base px-4 py-2.5 font-mono text-[0.82rem] text-ink outline-none placeholder:text-dim/60 focus:border-gold"
          />
          <button
            type="button"
            onClick={submit}
            disabled={streaming || !input.trim()}
            className="shrink-0 rounded-lg bg-gold px-4 py-2.5 font-mono text-xs font-semibold text-base transition hover:opacity-90 disabled:opacity-40"
          >
            ⏎
          </button>
        </div>
      </div>
    </div>
  );
}
