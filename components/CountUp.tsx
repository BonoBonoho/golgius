"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

// SSR 경고 없이 레이아웃 이펙트 사용
const useIso = typeof window !== "undefined" ? useLayoutEffect : useEffect;

// "1,200+" → { prefix:"", num:1200, suffix:"+" }, "원스톱" → num:null
function parse(value: string) {
  const m = value.match(/[\d,]+/);
  if (!m) return { prefix: value, num: null as number | null, suffix: "" };
  const num = Number(m[0].replace(/,/g, ""));
  return {
    prefix: value.slice(0, m.index),
    num: Number.isFinite(num) ? num : null,
    suffix: value.slice((m.index ?? 0) + m[0].length),
  };
}

export default function CountUp({
  value,
  durationMs = 1400,
}: {
  value: string;
  durationMs?: number;
}) {
  const { prefix, num, suffix } = parse(value);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  // SSR/초기 렌더는 최종값(하이드레이션 불일치·SEO 방지)
  const [display, setDisplay] = useState(value);

  useIso(() => {
    if (num === null) return; // 숫자가 아니면 정적 표시(예: 원스톱)

    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return; // 모션 최소화: 최종값 유지

    const fmt = (n: number) => `${prefix}${n.toLocaleString("en-US")}${suffix}`;
    setDisplay(fmt(0)); // 페인트 전에 0으로 세팅 → 깜빡임 없음

    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const run = () => {
      if (started.current) return;
      started.current = true;
      const start = performance.now();
      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / durationMs);
        const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic — 룰렛이 멈추듯 감속
        setDisplay(fmt(Math.round(eased * num)));
        if (t < 1) raf = requestAnimationFrame(tick);
        else setDisplay(fmt(num));
      };
      raf = requestAnimationFrame(tick);
    };

    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          run();
          io.disconnect();
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);

    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <span ref={ref} className="tabular-nums">
      {display}
    </span>
  );
}
