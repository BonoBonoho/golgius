import Link from "next/link";
import { verticals, type VerticalKey } from "@/lib/verticals";
import Brandmark from "@/components/Brandmark";

// 단일 도메인 진입점. 방문자를 헬스장/병원 버티컬로 안내.
// (운영 시 광고 랜딩은 /gym, /hospital 로 직접 유입되는 경우가 많음)
export default function Home() {
  const keys: VerticalKey[] = ["gym", "hospital"];

  return (
    <main className="flex min-h-screen flex-col">
      <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-5 py-10">
        <div className="flex flex-wrap items-center gap-3">
          <Brandmark size="md" />
          <span className="text-sm text-dim">Your success is our career</span>
        </div>

        <div className="mt-14 max-w-2xl">
          <p className="eyebrow">Opening Partner</p>
          <h1 className="mt-4 text-4xl font-extrabold leading-tight tracking-tight md:text-5xl">
            무엇을 여시나요?
          </h1>
          <p className="mt-4 text-dim">
            헬스장과 병원, 분야에 맞춰 준비된 오픈 솔루션을 안내합니다.
          </p>
        </div>

        <div className="mt-12 grid flex-1 gap-5 md:grid-cols-2">
          {keys.map((k) => {
            const v = verticals[k];
            return (
              <Link
                key={k}
                href={`/${k}`}
                style={{ ["--accent" as string]: v.accent } as React.CSSProperties}
                className="group flex flex-col justify-between rounded-2xl border border-line bg-surface p-8 transition hover:border-[var(--accent)]"
              >
                <div>
                  <p className="eyebrow">{v.labelEn}</p>
                  <h2 className="mt-3 text-2xl font-extrabold">{v.label} 오픈</h2>
                  <p className="mt-3 text-sm leading-relaxed text-dim">{v.hero.sub}</p>
                </div>
                <span
                  className="mt-10 inline-flex items-center gap-2 text-sm font-semibold"
                  style={{ color: "var(--accent)" }}
                >
                  바로 보기
                  <span className="transition group-hover:translate-x-1">→</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
