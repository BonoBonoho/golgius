"use client";

import { useActionState } from "react";
import { signup } from "@/app/actions/admin";
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

export default function SignupForm({ configured }: { configured: boolean }) {
  const [state, action, pending] = useActionState(signup, authInitial);

  return (
    <AuthShell
      title="관리자 회원가입"
      subtitle="허용된 이메일만 가입할 수 있습니다."
      footer={
        <>
          이미 계정이 있으신가요? <AuthLink href="/admin/login">로그인</AuthLink>
        </>
      }
    >
      {!configured ? (
        <AuthSetupNotice />
      ) : (
        <form action={action} className="mt-6 space-y-4">
          <AuthField label="이름" name="name" placeholder="홍길동" autoComplete="name" required={false} />
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
            placeholder="8자 이상"
            autoComplete="new-password"
          />
          <AuthAlert message={state.error} />
          <AuthNotice message={state.notice} />
          <AuthSubmit pending={pending} label="회원가입" />
        </form>
      )}
    </AuthShell>
  );
}
