"use client";

// Claude Code 뷰를 참고한 터미널 채팅 패널:
//  · ⏺ tool(args) + ⎿ 결과 들여쓰기 (도구 호출 시그니처)
//  · ✳ 회전 스피너 + 경과초 + 수신 문자수
//  · ❯ 프롬프트 입력, 박스형 웰컴 배너, 하단 상태줄(모델·품목·턴)

import { useEffect, useRef, useState } from "react";
import type { PresetKey } from "@/lib/design-agent/presets";

export type ChatEntry =
  | { kind: "user"; text: string }
  | { kind: "assistant"; text: string }
  | { kind: "tool"; summary: string; pending?: boolean }
  | { kind: "error"; text: string };

const PRODUCT_COPY: Record<
  PresetKey,
  { label: string; greeting: string; suggestions: string[]; placeholder: string }
> = {
  namecard: {
    label: "명함",
    greeting:
      "채팅으로 명함을 함께 만들어요. 이름·직함·연락처와 원하는 분위기를 알려주시면 바로 시안을 보여드릴게요.",
    suggestions: [
      "다크 배경에 골드 포인트 미니멀 명함",
      "화이트 클래식, 세리프 느낌으로",
      "피트니스 트레이너 명함, 볼드하게",
    ],
    placeholder: "예) 이름 홍길동, 직함 대표, 010-1234-5678 · 미니멀한 다크톤으로",
  },
  towel: {
    label: "수건",
    greeting:
      "헬스장 수건 나염 디자인을 함께 만들어요. 브랜드명·수건 바탕색·원하는 분위기를 알려주시면 바로 시안을 보여드릴게요.",
    suggestions: [
      "차콜 수건에 화이트 로고 타이포, 미니멀",
      "블랙 수건 중앙에 큰 볼드 레터링",
      "화이트 수건에 골드 라인 패턴",
    ],
    placeholder: "예) 골지어스 짐, 차콜 수건에 화이트 로고 · 볼드하게",
  },
  apparel: {
    label: "단체복",
    greeting:
      "단체복 프린트 디자인을 함께 만들어요. 팀/브랜드명·옷 색·프린트 위치(가슴/등판)를 알려주시면 바로 시안을 보여드릴게요.",
    suggestions: [
      "블랙 티셔츠, 좌가슴 소형 로고 + 등판 큰 타이포",
      "화이트 티셔츠에 미니멀 라인 그래픽",
      "스트릿 무드의 볼드한 등판 프린트",
    ],
    placeholder: "예) 골지어스 크루, 블랙 티셔츠 · 등판에 크게 GOLGIUS",
  },
};

// Claude Code 풍 스피너: 글리프 회전 + 작업 동사 순환
const SPINNER_GLYPHS = ["✳", "✶", "✻", "✽"];
const SPINNER_VERBS = ["구상하는 중", "선을 긋는 중", "색을 고르는 중", "다듬는 중"];

function Spinner({ chars }: { chars: number }) {
  const [tick, setTick] = useState(0);
  const startRef = useRef(Date.now());
  useEffect(() => {
    const t = setInterval(() => setTick((v) => v + 1), 300);
    return () => clearInterval(t);
  }, []);
  const glyph = SPINNER_GLYPHS[tick % SPINNER_GLYPHS.length];
  const verb = SPINNER_VERBS[Math.floor(tick / 10) % SPINNER_VERBS.length];
  const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
  const kb = chars >= 1000 ? `${(chars / 1000).toFixed(1)}k` : `${chars}`;
  return (
    <p className="flex items-center gap-2 text-gold">
      <span className="inline-block w-4 text-center">{glyph}</span>
      <span>
        {verb}… <span className="text-dim">({elapsed}s · {kb} chars)</span>
      </span>
    </p>
  );
}

export default function ChatPanel({
  product = "namecard",
  entries,
  streaming,
  receivedChars = 0,
  turns = 0,
  onSend,
  onLogoSelect,
}: {
  product?: PresetKey;
  entries: ChatEntry[];
  streaming: boolean;
  receivedChars?: number;
  turns?: number;
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
        <span className="font-mono text-sm text-gold">✻</span>
        <span className="eyebrow">golgius design agent</span>
        <span className="ml-auto font-mono text-[0.65rem] text-dim">
          {streaming ? "streaming…" : "ready"}
        </span>
      </div>

      {/* 로그 */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto px-4 py-5 font-mono text-[0.82rem] leading-relaxed"
      >
        {/* 웰컴 배너 (Claude Code 스타일 박스) */}
        {entries.length === 0 && (
          <div className="space-y-4">
            <div className="rounded-lg border border-gold/40 px-4 py-3">
              <p className="text-ink">
                <span className="text-gold">✻</span> GOLGIUS 디자인 에이전트에 오신 걸
                환영합니다!
              </p>
              <p className="mt-2 text-[0.76rem] text-dim">{copy.greeting}</p>
            </div>
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
                <p key={i} className="whitespace-pre-wrap pt-2 text-ink">
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
              // Claude Code 시그니처: ⏺ tool(args) + ⎿ 결과
              return (
                <div key={i} className="text-[0.78rem]">
                  <p className="text-ink">
                    <span className={e.pending ? "animate-pulse text-gold" : "text-gold"}>
                      ⏺
                    </span>{" "}
                    render_design({copy.label})
                  </p>
                  <p className="pl-4 text-dim">
                    <span className="select-none">⎿ </span>
                    {e.pending ? "시안을 그리는 중…" : `${e.summary} — 프리뷰 업데이트됨`}
                  </p>
                </div>
              );
            case "error":
              return (
                <div key={i} className="text-[0.78rem]">
                  <p className="text-red-400">
                    <span>⏺</span> Error
                  </p>
                  <p className="pl-4 text-red-400/80">
                    <span className="select-none">⎿ </span>
                    {e.text}
                  </p>
                </div>
              );
          }
        })}
        {streaming && <Spinner chars={receivedChars} />}
      </div>

      {/* 입력 — ❯ 프롬프트 박스 */}
      <div className="border-t border-line p-3">
        <div className="flex items-end gap-2 rounded-lg border border-line bg-base px-3 py-2 focus-within:border-gold">
          <span className="select-none pb-1.5 font-mono text-sm text-gold">❯</span>
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
            className="min-h-[2.5rem] flex-1 resize-none bg-transparent py-1 font-mono text-[0.82rem] text-ink outline-none placeholder:text-dim/50"
          />
          <div className="flex shrink-0 items-center gap-1.5 pb-0.5">
            <button
              type="button"
              title="로고 업로드 (PNG/JPG/SVG, 2MB 이하)"
              onClick={() => fileRef.current?.click()}
              className="rounded-md border border-line px-2.5 py-1.5 font-mono text-[0.7rem] text-dim transition hover:border-gold hover:text-ink"
            >
              + 로고
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={streaming || !input.trim()}
              className="rounded-md bg-gold px-3 py-1.5 font-mono text-[0.7rem] font-semibold text-base transition hover:opacity-90 disabled:opacity-40"
            >
              ⏎
            </button>
          </div>
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
        </div>
        {/* 하단 상태줄 (Claude Code 풍) */}
        <div className="mt-2 flex items-center justify-between px-1 font-mono text-[0.62rem] text-dim/70">
          <span>claude-sonnet-5 · {copy.label}</span>
          <span>
            {turns} turn{turns === 1 ? "" : "s"} · shift+⏎ 줄바꿈
          </span>
        </div>
      </div>
    </div>
  );
}
