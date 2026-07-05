"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  adminAuthConfigured,
  canSignup,
  createAdminUser,
  createSessionToken,
  sessionCookieName,
  sessionMaxAge,
  verifyAdminLogin,
} from "@/lib/admin-auth";
import type { AuthState } from "@/app/admin/auth-state";

export type { AuthState };

function readCredentials(formData: FormData) {
  return {
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
    name: String(formData.get("name") ?? "").trim(),
  };
}

async function setSession(email: string) {
  const token = createSessionToken(email);
  if (!token) return false;
  const jar = await cookies();
  jar.set(sessionCookieName(), token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: sessionMaxAge(),
  });
  return true;
}

export async function login(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!adminAuthConfigured()) {
    return {
      error: "ADMIN_SESSION_SECRET 환경변수가 설정되지 않았습니다.",
      notice: "",
    };
  }

  const { email, password } = readCredentials(formData);
  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력하세요.", notice: "" };
  }

  const user = await verifyAdminLogin(email, password);
  if (!user) {
    return { error: "이메일 또는 비밀번호가 올바르지 않습니다.", notice: "" };
  }

  if (!(await setSession(user.email))) {
    return { error: "세션을 만들 수 없습니다. ADMIN_SESSION_SECRET을 확인하세요.", notice: "" };
  }

  redirect("/admin");
}

export async function signup(_prev: AuthState, formData: FormData): Promise<AuthState> {
  if (!adminAuthConfigured()) {
    return {
      error: "ADMIN_SESSION_SECRET 환경변수가 설정되지 않았습니다.",
      notice: "",
    };
  }

  const { email, password, name } = readCredentials(formData);
  if (!email || !password) {
    return { error: "이메일과 비밀번호를 입력하세요.", notice: "" };
  }

  if (!(await canSignup(email))) {
    const msg = allowedEmailsHint();
    return {
      error: msg
        ? `가입 허용된 이메일이 아니거나 이미 가입된 계정입니다. (${msg})`
        : "가입 허용된 이메일이 아니거나 이미 가입된 계정입니다.",
      notice: "",
    };
  }

  const created = await createAdminUser(email, password, name);
  if (!created.ok) {
    return { error: created.message, notice: "" };
  }

  if (!(await setSession(email))) {
    return { error: "가입은 완료됐지만 세션 생성에 실패했습니다. 로그인을 시도하세요.", notice: "" };
  }

  redirect("/admin");
}

function allowedEmailsHint(): string {
  const raw = process.env.ADMIN_ALLOWED_EMAILS ?? "";
  const emails = raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  if (emails.length === 0) return "";
  if (emails.length <= 2) return `허용: ${emails.join(", ")}`;
  return `허용 ${emails.length}개 이메일 — ADMIN_ALLOWED_EMAILS 확인`;
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(sessionCookieName());
  redirect("/admin/login");
}
