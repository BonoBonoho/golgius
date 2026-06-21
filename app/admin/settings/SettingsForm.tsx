"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveSettings, type SettingsState } from "@/app/actions/settings";

export interface Field {
  key: string;
  label: string;
  secret: boolean;
  value: string; // 일반 필드: 현재값(프리필) / 비밀 필드: 마스킹 표시용
  source: "db" | "env" | "none";
  placeholder?: string;
}

export interface Group {
  title: string;
  status: string; // "활성" | "미설정"
  active: boolean;
  fields: Field[];
}

const initial: SettingsState = { ok: false, message: "" };

function sourceTag(source: Field["source"]) {
  if (source === "db") return "DB 저장됨";
  if (source === "env") return "환경변수 사용 중";
  return "미설정";
}

export default function SettingsForm({ groups }: { groups: Group[] }) {
  const [state, action, pending] = useActionState(saveSettings, initial);

  return (
    <form action={action} className="mt-8 space-y-8">
      {groups.map((g) => (
        <div key={g.title} className="rounded-2xl border border-line bg-surface p-6">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-bold">{g.title}</h2>
            <span
              className="rounded-full px-2.5 py-1 text-xs font-semibold"
              style={{
                color: g.active ? "var(--accent)" : "var(--color-dim)",
                border: `1px solid ${g.active ? "var(--accent)" : "var(--color-line)"}`,
              }}
            >
              {g.status}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {g.fields.map((f) => (
              <label key={f.key} className="block">
                <span className="flex items-baseline justify-between text-sm">
                  <span className="text-dim">{f.label}</span>
                  <span className="font-mono text-xs text-dim">{sourceTag(f.source)}</span>
                </span>
                <input
                  name={f.key}
                  type={f.secret ? "password" : "text"}
                  autoComplete="off"
                  defaultValue={f.secret ? "" : f.value}
                  placeholder={
                    f.secret
                      ? f.source === "none"
                        ? f.placeholder ?? "값 입력"
                        : `변경하려면 입력 (현재: ${f.value})`
                      : f.placeholder ?? ""
                  }
                  className="mt-1.5 w-full rounded-lg border border-line bg-base px-4 py-3 text-sm outline-none transition focus:border-[var(--accent)]"
                />
              </label>
            ))}
          </div>
        </div>
      ))}

      {state.message && (
        <p
          className="text-sm"
          style={{ color: state.ok ? "var(--accent)" : "#e2574a" }}
          role="alert"
        >
          {state.message}
        </p>
      )}

      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-gold px-6 py-3 text-sm font-semibold text-base transition hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "저장 중…" : "설정 저장"}
        </button>
        <Link href="/admin" className="text-sm text-dim transition hover:text-ink">
          ← 접수 내역으로
        </Link>
      </div>

      <p className="text-xs text-dim">
        비밀 키는 보안상 전체값을 표시하지 않습니다. 비워두면 기존 값이 유지됩니다.
        저장 즉시 적용되며 재배포가 필요 없습니다.
      </p>
    </form>
  );
}
