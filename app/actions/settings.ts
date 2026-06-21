"use server";

import { isAuthed } from "@/lib/admin";
import {
  SETTING_ENV,
  SECRET_KEYS,
  saveDbSettings,
  getDbSettings,
  settingsBacked,
  type SettingKey,
} from "@/lib/settings";

export interface SettingsState {
  ok: boolean;
  message: string;
}

export async function saveSettings(
  _prev: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  if (!(await isAuthed())) {
    return { ok: false, message: "권한이 없습니다. 다시 로그인해 주세요." };
  }
  if (!settingsBacked()) {
    return { ok: false, message: "Supabase가 연결되어야 설정을 저장할 수 있습니다." };
  }

  const current = await getDbSettings();
  const entries: Record<string, string> = {};

  for (const key of Object.keys(SETTING_ENV) as SettingKey[]) {
    const raw = String(formData.get(key) ?? "").trim();
    if (SECRET_KEYS.includes(key)) {
      // 비밀 키: 빈 입력이면 기존 값 유지(덮어쓰지 않음)
      if (raw) entries[key] = raw;
    } else {
      // 일반 값: 항상 제출값으로 갱신(비우면 비움)
      if (raw !== (current[key] ?? "")) entries[key] = raw;
    }
  }

  if (Object.keys(entries).length === 0) {
    return { ok: true, message: "변경된 내용이 없습니다." };
  }

  try {
    await saveDbSettings(entries);
  } catch {
    return { ok: false, message: "저장 중 오류가 발생했습니다." };
  }

  return { ok: true, message: "설정이 저장되었습니다. 즉시 적용됩니다." };
}
