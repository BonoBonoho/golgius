// 리드 인사이트 계산 (순수 함수). 현재 단계 스냅샷 + updated_at 기반.
// 풍부한 단계 이력(lead_events)은 운영이 쌓이면 더 정교한 분석에 활용.

import type { Lead, Stage } from "@/lib/leads";
import { PIPELINE } from "@/lib/leads";

export const STALL_DAYS = 3; // 이 일수 이상 현재 단계 정체 시 하이라이트

export function daysSince(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / 86_400_000));
}

export interface FunnelStep {
  stage: Stage;
  reached: number;
  conv: number | null; // 직전 단계 대비 전환율(%) — 첫 단계는 null
}

export interface Insights {
  total: number;
  byStage: Record<Stage, number>;
  funnel: FunnelStep[];
  byVertical: { gym: number; hospital: number };
  bySource: { source: string; count: number }[];
  stalled: { lead: Lead; days: number }[];
}

const ALL_STAGES: Stage[] = [...PIPELINE, "lost"];

export function computeInsights(leads: Lead[]): Insights {
  const byStage = Object.fromEntries(ALL_STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  for (const l of leads) byStage[l.stage] = (byStage[l.stage] ?? 0) + 1;

  const idx = (s: Stage) => PIPELINE.indexOf(s); // lost → -1
  const reached = PIPELINE.map(
    (_, i) => leads.filter((l) => l.stage !== "lost" && idx(l.stage) >= i).length
  );
  const funnel: FunnelStep[] = PIPELINE.map((stage, i) => ({
    stage,
    reached: reached[i],
    conv: i === 0 ? null : reached[i - 1] > 0 ? (reached[i] / reached[i - 1]) * 100 : 0,
  }));

  const bySourceMap = new Map<string, number>();
  for (const l of leads) {
    const s = l.source || "direct";
    bySourceMap.set(s, (bySourceMap.get(s) ?? 0) + 1);
  }
  const bySource = [...bySourceMap.entries()]
    .map(([source, count]) => ({ source, count }))
    .sort((a, b) => b.count - a.count);

  const stalled = leads
    .filter((l) => l.stage !== "open" && l.stage !== "lost")
    .map((lead) => ({ lead, days: daysSince(lead.updatedAt) }))
    .filter((x) => x.days >= STALL_DAYS)
    .sort((a, b) => b.days - a.days);

  return {
    total: leads.length,
    byStage,
    funnel,
    byVertical: {
      gym: leads.filter((l) => l.vertical === "gym").length,
      hospital: leads.filter((l) => l.vertical === "hospital").length,
    },
    bySource,
    stalled,
  };
}
