import Link from "next/link";
import type { ReactNode } from "react";

const field =
  "w-full rounded-lg border border-line bg-surface px-4 py-3 text-sm outline-none transition focus:border-gold";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-dim">{subtitle}</p>
      {children}
      {footer && <div className="mt-6 text-center text-sm text-dim">{footer}</div>}
    </main>
  );
}

export function AuthField({
  label,
  name,
  type = "text",
  placeholder,
  autoComplete,
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-semibold text-dim">{label}</span>
      <input
        name={name}
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        className={field}
      />
    </label>
  );
}

export function AuthSubmit({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-4 w-full rounded-full bg-gold px-6 py-3 text-sm font-semibold text-base transition hover:opacity-90 disabled:opacity-60"
    >
      {pending ? "처리 중…" : label}
    </button>
  );
}

export function AuthAlert({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="mt-3 text-sm" style={{ color: "#e2574a" }} role="alert">
      {message}
    </p>
  );
}

export function AuthNotice({ message }: { message: string }) {
  if (!message) return null;
  return (
    <p className="mt-3 rounded-lg border border-line bg-surface p-3 text-sm text-dim" role="status">
      {message}
    </p>
  );
}

export function AuthLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-semibold text-ink underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}

export function AuthSetupNotice() {
  return (
    <p className="mt-6 rounded-lg border border-line bg-surface p-4 text-sm text-dim">
      <span className="font-semibold text-ink">설정 필요:</span>{" "}
      <code className="font-mono">ADMIN_SESSION_SECRET</code>(16자 이상),{" "}
      <code className="font-mono">ADMIN_ALLOWED_EMAILS</code>(회원가입 허용 이메일)을 지정하세요.
      운영 환경에서는 <code className="font-mono">ADMIN_USERS_TABLE=golgius-admin-users</code>도
      설정하세요.
    </p>
  );
}
