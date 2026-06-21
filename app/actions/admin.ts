"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ADMIN_COOKIE, adminPassword, expectedToken, verifyPassword } from "@/lib/admin";

export interface LoginState {
  error: string;
}

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  if (!adminPassword()) {
    return { error: "관리자 비밀번호(ADMIN_PASSWORD)가 설정되지 않았습니다." };
  }
  const input = String(formData.get("password") ?? "");
  if (!verifyPassword(input)) {
    return { error: "비밀번호가 올바르지 않습니다." };
  }

  const token = expectedToken()!;
  const jar = await cookies();
  jar.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8시간
  });
  redirect("/admin");
}

export async function logout(): Promise<void> {
  const jar = await cookies();
  jar.delete(ADMIN_COOKIE);
  redirect("/admin");
}
