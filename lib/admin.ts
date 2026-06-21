// 어드민 인증 — 단일 비밀번호(ADMIN_PASSWORD 환경변수) 기반.
// 쿠키에는 비밀번호의 해시를 저장해 위조를 막는다(httpOnly).

import { createHash } from "crypto";
import { cookies } from "next/headers";

export const ADMIN_COOKIE = "golgius_admin";

export function adminPassword(): string | null {
  const p = process.env.ADMIN_PASSWORD;
  return p && p.length > 0 ? p : null;
}

// 비밀번호 + 고정 솔트의 해시 → 쿠키 값으로 사용
function tokenFor(password: string): string {
  return createHash("sha256").update(`golgius::${password}`).digest("hex");
}

export function expectedToken(): string | null {
  const p = adminPassword();
  return p ? tokenFor(p) : null;
}

export function verifyPassword(input: string): boolean {
  const p = adminPassword();
  return p !== null && input === p;
}

export async function isAuthed(): Promise<boolean> {
  const expected = expectedToken();
  if (!expected) return false;
  const jar = await cookies();
  return jar.get(ADMIN_COOKIE)?.value === expected;
}
