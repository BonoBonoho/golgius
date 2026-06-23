import { addIntake, uploadIntakeFile, isPersistent } from "@/lib/intakes";
import { notifyNewIntake } from "@/lib/notify";

export const dynamic = "force-dynamic";

const PHONE_RE = /^[0-9+\-\s()]{7,20}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DAYS = ["10", "15", "20", "25"];
const MAX_BYTES = 4 * 1024 * 1024;

function json(body: unknown, status = 200) {
  return Response.json(body, { status });
}

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return json({ ok: false, message: "잘못된 요청입니다." }, 400);
  }

  if (String(form.get("company") ?? "").length > 0) {
    return json({ ok: true, message: "제출되었습니다." });
  }

  const name = String(form.get("name") ?? "").trim();
  const phone = String(form.get("phone") ?? "").trim();
  const ext = String(form.get("ext") ?? "").trim().slice(0, 30);
  const address = String(form.get("address") ?? "").trim();
  const withdrawalDay = String(form.get("withdrawal_day") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const installDate = String(form.get("install_date") ?? "").trim().slice(0, 100);
  const note = String(form.get("note") ?? "").trim().slice(0, 1000);

  if (name.length < 2) return json({ ok: false, message: "담당자 성함을 입력해 주세요." }, 400);
  if (!PHONE_RE.test(phone)) return json({ ok: false, message: "휴대폰번호를 정확히 입력해 주세요." }, 400);
  if (!EMAIL_RE.test(email)) return json({ ok: false, message: "이메일을 정확히 입력해 주세요." }, 400);
  if (address.length < 4) return json({ ok: false, message: "설치 주소를 입력해 주세요." }, 400);
  if (!DAYS.includes(withdrawalDay)) return json({ ok: false, message: "출금일을 선택해 주세요." }, 400);

  // 파일 검증 (사업자등록증 필수, 통장/카드 1개 이상 필수)
  const bizFileRaw = form.get("biz_file");
  const bankRaw = form.getAll("bank_files").filter((f) => f instanceof File && f.size > 0) as File[];
  const hasBiz = bizFileRaw instanceof File && bizFileRaw.size > 0;
  if (!hasBiz) return json({ ok: false, message: "사업자등록증을 첨부해 주세요." }, 400);
  if (bankRaw.length === 0) return json({ ok: false, message: "통장사본 또는 카드 앞뒷면을 첨부해 주세요." }, 400);

  const allFiles = [bizFileRaw as File, ...bankRaw];
  if (allFiles.some((f) => f.size > MAX_BYTES)) {
    return json({ ok: false, message: "각 파일은 4MB 이하만 업로드할 수 있습니다." }, 400);
  }

  let bizFile: string | null = null;
  const bankFiles: string[] = [];
  if (isPersistent()) {
    try {
      bizFile = await uploadIntakeFile(bizFileRaw as File, "biz");
      for (const f of bankRaw) {
        const p = await uploadIntakeFile(f, "bank");
        if (p) bankFiles.push(p);
      }
    } catch {
      return json({ ok: false, message: "파일 업로드에 실패했습니다." }, 500);
    }
  } else {
    // 로컬 폴백: 파일명만 기록
    bizFile = (bizFileRaw as File).name;
    bankRaw.forEach((f) => bankFiles.push(f.name));
  }

  try {
    const intake = await addIntake({
      name,
      phone,
      ext,
      address,
      withdrawalDay,
      email,
      installDate,
      bizFile,
      bankFiles,
      note,
    });
    await notifyNewIntake(intake);
  } catch {
    return json({ ok: false, message: "제출 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요." }, 500);
  }

  return json({ ok: true, message: "제출이 완료되었습니다. 확인 후 빠르게 진행하겠습니다." });
}
