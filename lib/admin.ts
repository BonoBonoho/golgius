// 어드민 인증 — lib/admin-auth.ts re-export (기존 import 경로 유지).

export {
  adminAuthConfigured,
  getAdminUser,
  isAuthed,
  normalizeAdminEmail,
} from "@/lib/admin-auth";

export type AdminUser = { email: string; name: string | null };
