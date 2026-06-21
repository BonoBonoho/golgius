import { partners, type Partner } from "@/lib/partners";
import type { VerticalKey } from "@/lib/verticals";

// 함께 오픈한 센터 로고 마퀴(좌우 무한 흐름).
// 모든 로고를 균일한 흰색 타일에 담아 배경/색이 달라도 통일감 있게 보이게 한다.
function Tile({ p }: { p: Partner }) {
  return (
    <div className="flex h-20 w-44 shrink-0 items-center justify-center rounded-xl bg-white px-5 py-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={p.src}
        alt={p.name}
        loading="lazy"
        className="max-h-12 w-auto max-w-full object-contain"
      />
    </div>
  );
}

export default function PartnerMarquee({ vertical }: { vertical: VerticalKey }) {
  const list = partners[vertical];
  if (!list || list.length === 0) return null;

  // 끊김 없는 루프를 위해 두 벌 복제 → 트랙이 -50% 이동하면 정확히 한 바퀴
  const loop = [...list, ...list];
  // 로고 수에 비례해 속도 보정(개수 많아져도 비슷한 체감 속도)
  const duration = `${Math.max(24, list.length * 6)}s`;

  return (
    <div className="mt-12">
      <p className="text-sm text-dim">골지어스와 함께 오픈한 센터</p>
      <div className="marquee-wrap marquee-mask mt-5 overflow-hidden">
        <div
          className="marquee-track gap-4"
          style={{ ["--marquee-duration" as string]: duration }}
        >
          {loop.map((p, i) => (
            <Tile key={`${p.src}-${i}`} p={p} />
          ))}
        </div>
      </div>
    </div>
  );
}
