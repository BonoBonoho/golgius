// 어드민 계정 저장소 — AWS DynamoDB(운영) + 메모리 폴백(로컬).
//
// 환경변수:
//   ADMIN_USERS_TABLE  DynamoDB 테이블명 (예: golgius-admin-users)

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "crypto";

const REGION = process.env.AWS_REGION ?? "ap-northeast-2";
const TABLE = (process.env.ADMIN_USERS_TABLE ?? "").trim();

export type StoredAdminUser = {
  email: string;
  passwordHash: string;
  name: string | null;
  createdAt: string;
};

export function isAdminUsersPersistent(): boolean {
  return TABLE.length > 0;
}

let ddbDoc: DynamoDBDocumentClient | null = null;
function ddb(): DynamoDBDocumentClient {
  if (!ddbDoc) {
    ddbDoc = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
      marshallOptions: { removeUndefinedValues: true },
    });
  }
  return ddbDoc;
}

const mem = ((globalThis as Record<string, unknown>).__golgiusAdminUsers ??= new Map<
  string,
  StoredAdminUser
>()) as Map<string, StoredAdminUser>;

export function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  try {
    const expected = Buffer.from(hash, "hex");
    const actual = scryptSync(password, salt, 64);
    return timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

export async function getAdminByEmail(email: string): Promise<StoredAdminUser | null> {
  const key = normalizeAdminEmail(email);
  if (!key) return null;

  if (!isAdminUsersPersistent()) {
    return mem.get(key) ?? null;
  }

  const res = await ddb().send(
    new GetCommand({
      TableName: TABLE,
      Key: { email: key },
    }),
  );
  const item = res.Item as StoredAdminUser | undefined;
  return item ?? null;
}

export async function createAdminUser(
  email: string,
  password: string,
  name?: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  const key = normalizeAdminEmail(email);
  if (!key) return { ok: false, message: "이메일을 입력하세요." };
  if (password.length < 8) return { ok: false, message: "비밀번호는 8자 이상이어야 합니다." };

  const existing = await getAdminByEmail(key);
  if (existing) return { ok: false, message: "이미 가입된 이메일입니다. 로그인하세요." };

  const user: StoredAdminUser = {
    email: key,
    passwordHash: hashPassword(password),
    name: name?.trim() || null,
    createdAt: new Date().toISOString(),
  };

  if (!isAdminUsersPersistent()) {
    mem.set(key, user);
    return { ok: true };
  }

  await ddb().send(
    new PutCommand({
      TableName: TABLE,
      Item: user,
      ConditionExpression: "attribute_not_exists(email)",
    }),
  );
  return { ok: true };
}

export function allowedEmailsFromEnv(): Set<string> {
  const raw = process.env.ADMIN_ALLOWED_EMAILS ?? "";
  return new Set(
    raw
      .split(",")
      .map((e) => normalizeAdminEmail(e))
      .filter(Boolean),
  );
}

export async function canSignup(email: string): Promise<boolean> {
  const key = normalizeAdminEmail(email);
  if (!key) return false;
  if (!allowedEmailsFromEnv().has(key)) return false;
  return (await getAdminByEmail(key)) === null;
}

export async function verifyAdminLogin(
  email: string,
  password: string,
): Promise<StoredAdminUser | null> {
  const user = await getAdminByEmail(email);
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  return user;
}

// 세션 서명 — ADMIN_SESSION_SECRET 으로 HMAC
const SESSION_COOKIE = "golgius_admin_session";
const SESSION_MAX_AGE = 60 * 60 * 8; // 8시간

function sessionSecret(): string | null {
  const s = process.env.ADMIN_SESSION_SECRET?.trim();
  return s && s.length >= 16 ? s : null;
}

type SessionPayload = { email: string; exp: number };

function signPayload(payload: SessionPayload): string | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}

function parseSession(token: string): SessionPayload | null {
  const secret = sessionSecret();
  if (!secret) return null;
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = createHmac("sha256", secret).update(body).digest("base64url");
  if (sig.length !== expected.length || !timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
    return null;
  }
  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;
    if (!payload.email || typeof payload.exp !== "number") return null;
    if (payload.exp < Date.now()) return null;
    return payload;
  } catch {
    return null;
  }
}

export function adminAuthConfigured(): boolean {
  return sessionSecret() !== null;
}

export function sessionCookieName(): string {
  return SESSION_COOKIE;
}

export function createSessionToken(email: string): string | null {
  return signPayload({
    email: normalizeAdminEmail(email),
    exp: Date.now() + SESSION_MAX_AGE * 1000,
  });
}

export function sessionMaxAge(): number {
  return SESSION_MAX_AGE;
}

export async function getSessionAdmin(): Promise<StoredAdminUser | null> {
  const { cookies } = await import("next/headers");
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = parseSession(token);
  if (!payload) return null;
  const user = await getAdminByEmail(payload.email);
  return user;
}

export async function isAuthed(): Promise<boolean> {
  return (await getSessionAdmin()) !== null;
}

export async function getAdminUser(): Promise<{ email: string; name: string | null } | null> {
  const user = await getSessionAdmin();
  if (!user) return null;
  return { email: user.email, name: user.name };
}
