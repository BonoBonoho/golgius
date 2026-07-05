import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/admin";
import {
  getDbSettings,
  effective,
  settingsBacked,
  maskSecret,
  SHOP_COPY_DEFAULTS,
  type SettingKey,
} from "@/lib/settings";
import SettingsForm, { type Group } from "./SettingsForm";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!(await isAuthed())) redirect("/admin");

  if (!settingsBacked()) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-12">
        <h1 className="text-2xl font-extrabold tracking-tight">알림 설정</h1>
        <p className="mt-4 rounded-2xl border border-line bg-surface p-6 text-sm text-dim">
          설정을 저장하려면 Supabase 연결이 필요합니다(환경변수{" "}
          <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> /{" "}
          <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code>).
        </p>
      </main>
    );
  }

  const db = await getDbSettings();
  const eff = (k: SettingKey) => effective(k, db);

  const field = (
    key: SettingKey,
    label: string,
    secret: boolean,
    placeholder?: string
  ) => {
    const e = eff(key);
    return {
      key,
      label,
      secret,
      value: secret ? maskSecret(e.value) : e.value,
      source: e.source,
      placeholder,
    };
  };

  const emailActive = !!eff("resend_api_key").value && !!eff("notify_email").value;
  const smsActive =
    !!eff("solapi_api_key").value &&
    !!eff("solapi_api_secret").value &&
    !!eff("solapi_sender").value;

  const groups: Group[] = [
    {
      title: "이메일 (Resend)",
      active: emailActive,
      status: emailActive ? "활성" : "미설정",
      fields: [
        field("resend_api_key", "Resend API Key", true, "re_..."),
        field("notify_email", "담당자 수신 이메일", false, "yj@golgius.com"),
        field("resend_from", "보내는 주소 (인증 도메인, 선택)", false, "골지어스 <noreply@golgius.com>"),
      ],
    },
    {
      title: "문자 (Solapi)",
      active: smsActive,
      status: smsActive ? "활성" : "미설정",
      fields: [
        field("solapi_api_key", "Solapi API Key", true),
        field("solapi_api_secret", "Solapi API Secret", true),
        field("solapi_sender", "등록 발신번호", false, "0212345678"),
        field("notify_phone", "담당자 수신 번호", false, "01063815008"),
      ],
    },
    {
      title: "기구 스토어 문구 (/gym/shop)",
      active: true,
      status: "즉시 적용",
      fields: [
        field("shop_title", "제목 (비우면 기본 문구)", false, SHOP_COPY_DEFAULTS.title),
        field("shop_sub", "소개 문구 (비우면 기본 문구)", false, SHOP_COPY_DEFAULTS.sub),
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-2xl px-5 py-12">
      <h1 className="text-2xl font-extrabold tracking-tight">설정</h1>
      <p className="mt-2 text-sm text-dim">
        알림 키·수신처와 기구 스토어 문구를 여기서 관리합니다. DB에 저장되며 재배포 없이 즉시 적용됩니다.
      </p>
      <SettingsForm groups={groups} />
    </main>
  );
}
