"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/app/actions/admin";

const initial: LoginState = { error: "" };

export default function AdminLogin({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(login, initial);

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="text-2xl font-extrabold tracking-tight">GOLGIUS 관리자</h1>
      <p className="mt-2 text-sm text-dim">문의 접수 내역을 확인하려면 로그인하세요.</p>

      {!configured ? (
        <p className="mt-6 rounded-lg border border-line bg-surface p-4 text-sm text-dim">
          <span className="font-semibold text-ink">설정 필요:</span> 환경변수{" "}
          <code className="font-mono">ADMIN_PASSWORD</code> 를 지정해야 로그인할 수 있습니다.
        </p>
      ) : (
        <form action={action} className="mt-6">
          <input
            name="password"
            type="password"
            required
            autoFocus
            placeholder="관리자 비밀번호"
            className="w-full rounded-lg border border-line bg-surface px-4 py-3 text-sm outline-none transition focus:border-gold"
          />
          {state.error && (
            <p className="mt-3 text-sm" style={{ color: "#e2574a" }} role="alert">
              {state.error}
            </p>
          )}
          <button
            type="submit"
            disabled={pending}
            className="mt-4 w-full rounded-full bg-gold px-6 py-3 text-sm font-semibold text-base transition hover:opacity-90 disabled:opacity-60"
          >
            {pending ? "확인 중…" : "로그인"}
          </button>
        </form>
      )}
    </main>
  );
}
