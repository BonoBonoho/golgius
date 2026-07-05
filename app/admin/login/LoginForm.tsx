"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/admin";
import { authInitial } from "@/app/admin/auth-state";
import {
  AuthAlert,
  AuthField,
  AuthLink,
  AuthNotice,
  AuthSetupNotice,
  AuthShell,
  AuthSubmit,
} from "../auth-ui";

export default function LoginForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(login, authInitial);

  return (
    <AuthShell
      title="GOLGIUS 관리자"
      subtitle="이메일과 비밀번호로 로그인하세요."
      footer={
        <>
          계정이 없으신가요? <AuthLink href="/admin/signup">회원가입</AuthLink>
        </>
      }
    >
      {!configured ? (
        <AuthSetupNotice />
      ) : (
        <form action={action} className="mt-6 space-y-4">
          <AuthField
            label="이메일"
            name="email"
            type="email"
            placeholder="you@example.com"
            autoComplete="email"
          />
          <AuthField
            label="비밀번호"
            name="password"
            type="password"
            placeholder="비밀번호"
            autoComplete="current-password"
          />
          <AuthAlert message={state.error} />
          <AuthNotice message={state.notice} />
          <AuthSubmit pending={pending} label="로그인" />
        </form>
      )}
    </AuthShell>
  );
}
