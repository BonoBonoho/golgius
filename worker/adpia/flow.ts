// 성원애드피아 발주 플로우 — 결정적 스텝 + 실패 시 팝업 휴리스틱/Claude 폴백.
// 결제 직전(주문서 작성 페이지 도달)에서 반드시 정지한다.

import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { chromium, type Browser, type Page } from "playwright";
import { ADPIA, mapOptions } from "./mapping.js";
import {
  PaymentBoundaryError,
  assertClickSafe,
  checkBoundary,
  installGuards,
  maskSecrets,
} from "./guard.js";
import { applyRecovery, suggestRecovery } from "./claude-fallback.js";
import {
  addScreenshot,
  appendJobLog,
  downloadObject,
  uploadObject,
  type AdpiaOrderRow,
} from "../lib/supabase.js";

export type FlowResult = {
  cartUrl: string;
  priceText: string;
};

// 공지/이벤트 팝업 전용 — "닫기"·범용 .close는 파일업로드 팝업을 오폭할 수 있어 제외.
const POPUP_CLOSERS = [
  "text=오늘 하루 보지 않기",
  "text=오늘하루 열지않기",
  "text=하루 동안 열지 않기",
  ".main_popup .close",
  "#popup_notice .close",
];

async function closePopups(page: Page): Promise<void> {
  // 별도 팝업 창
  for (const p of page.context().pages()) {
    if (p !== page && !p.isClosed()) await p.close().catch(() => {});
  }
  // 레이어 팝업
  for (const sel of POPUP_CLOSERS) {
    const loc = page.locator(sel);
    const n = await loc.count().catch(() => 0);
    for (let i = 0; i < Math.min(n, 3); i++) {
      await loc.nth(i).click({ timeout: 1000 }).catch(() => {});
    }
  }
}

type StepCtx = {
  page: Page;
  row: AdpiaOrderRow;
  shotIndex: number;
  dryRun: boolean;
};

async function snap(ctx: StepCtx, step: string): Promise<string> {
  ctx.shotIndex += 1;
  const name = `adpia/${ctx.row.id}/${String(ctx.shotIndex).padStart(2, "0")}-${step}.png`;
  const buf = await ctx.page.screenshot({ type: "png", fullPage: false });
  await uploadObject(name, buf, "image/png");
  await addScreenshot(ctx.row, name);
  return name;
}

async function logStep(
  ctx: StepCtx,
  step: string,
  ok: boolean,
  detail: string,
  recoveredBy: string | null = null
): Promise<void> {
  const entry = {
    step,
    ok,
    at: new Date().toISOString(),
    detail: maskSecrets(detail).slice(0, 500),
    recoveredBy,
  };
  console.log(`[flow] ${step}: ${ok ? "ok" : "FAIL"} — ${entry.detail}`);
  await appendJobLog(ctx.row, entry).catch(() => {});
}

/** 스텝 실행 + 실패 시 팝업 정리 → Claude 폴백(최대 2회) → 재시도 */
async function runStep(
  ctx: StepCtx,
  name: string,
  allowFallback: boolean,
  fn: () => Promise<string>
): Promise<void> {
  let lastErr = "";
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      checkBoundary(ctx.page);
      const detail = await fn();
      checkBoundary(ctx.page);
      await snap(ctx, name);
      await logStep(ctx, name, true, detail, attempt > 0 ? "recovery" : null);
      return;
    } catch (e) {
      if (e instanceof PaymentBoundaryError) throw e;
      lastErr = maskSecrets((e as Error).message ?? String(e));
      await closePopups(ctx.page).catch(() => {});
      if (attempt < 2 && allowFallback) {
        const advice = await suggestRecovery(ctx.page, name, lastErr).catch(() => null);
        if (advice) {
          console.log(`[flow] ${name} 복구 시도: ${advice.action} ${advice.selector ?? ""} (${advice.reason})`);
          await applyRecovery(ctx.page, advice).catch(() => {});
          continue;
        }
      }
      if (attempt < 2) continue;
    }
  }
  await snap(ctx, `${name}-failed`).catch(() => {});
  await logStep(ctx, name, false, lastErr);
  throw new Error(`step ${name} 실패: ${lastErr}`);
}

export async function runAdpiaOrder(row: AdpiaOrderRow, dryRun: boolean): Promise<FlowResult> {
  const id = process.env.SWADPIA_ID ?? "";
  const pw = process.env.SWADPIA_PW ?? "";
  if (!id || !pw) throw new Error("SWADPIA_ID / SWADPIA_PW 필요");

  const mapped = mapOptions(row.options ?? {}); // 매핑 불가면 여기서 즉시 실패

  let browser: Browser | null = null;
  const result: FlowResult = { cartUrl: "", priceText: "" };
  try {
    browser = await chromium.launch({
      headless: true,
      args: ["--disable-dev-shm-usage", "--no-sandbox"],
    });
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      locale: "ko-KR",
    });
    const page = await context.newPage();
    installGuards(page);
    page.on("dialog", (d) => d.accept().catch(() => {}));

    const ctx: StepCtx = { page, row, shotIndex: 0, dryRun };

    // 1) 로그인 — Claude 폴백 비활성(자격증명 화면), 스크린샷은 로그인 후부터
    await runStep(ctx, "login", false, async () => {
      await page.goto(ADPIA.base + ADPIA.loginPath, { waitUntil: "domcontentloaded" });
      await closePopups(page);
      // 2026-07 실측: #mem_login_id(name=member_id) / #mem_login_pw(name=member_pw) / #icon_member_login(이미지 버튼)
      const idInput = page
        .locator('#mem_login_id, input[name="member_id"]')
        .first();
      const pwInput = page
        .locator('#mem_login_pw, input[name="member_pw"]')
        .first();
      await idInput.fill(id, { timeout: 10000 });
      await pwInput.fill(pw, { timeout: 10000 });
      const loginBtn = page.locator("#icon_member_login").first();
      await Promise.all([
        page.waitForLoadState("domcontentloaded"),
        (await loginBtn.count()) > 0 ? loginBtn.click() : pwInput.press("Enter"),
      ]);
      await closePopups(page);
      // 성공 판정: 로그아웃 존재 (실패 시 여기서 throw)
      await page
        .locator("text=로그아웃")
        .first()
        .waitFor({ state: "attached", timeout: 10000 });
      return "로그인 성공";
    });

    // 2) 상품 페이지
    await runStep(ctx, "goto_product", true, async () => {
      await page.goto(ADPIA.base + ADPIA.productPath, { waitUntil: "domcontentloaded" });
      await closePopups(page);
      await page.locator('select[name="paper_code"]').waitFor({ timeout: 10000 });
      return "일반지명함 페이지 도달";
    });

    // 3) 옵션 선택
    await runStep(ctx, "select_options", true, async () => {
      await page.selectOption('select[name="paper_code"]', mapped.paper_code);
      await page.selectOption('select[name="print_color_type"]', mapped.print_color_type);
      await page.selectOption('select[name="size_type"]', mapped.size_type);
      await page.selectOption('select[name="paper_size"]', mapped.paper_size);
      await page.selectOption('select[name="paper_qty"]', mapped.paper_qty);
      await page.selectOption('select[name="order_count"]', mapped.order_count);
      // 코팅 radio — 후보를 순서대로 시도
      let glossSet = false;
      for (const g of mapped.gloss) {
        const radio = page.locator(`input[name="${g.name}"][value="${g.value}"]`).first();
        if ((await radio.count()) > 0 && (await radio.isVisible().catch(() => false))) {
          await radio.check().catch(() => {});
          glossSet = true;
          break;
        }
      }
      await page.waitForTimeout(1000); // 가격 재계산 대기
      const price = await page
        .evaluate(() => document.querySelector("#total_price,.total_price,.price")?.textContent?.trim() ?? "")
        .catch(() => "");
      result.priceText = price;
      return `용지=${mapped.paper_code}, 인쇄=${mapped.print_color_type}, 수량=${mapped.paper_qty}, 코팅적용=${glossSet}, 표시가격=${price || "미확인"}`;
    });

    if (dryRun) {
      await logStep(ctx, "dry_run_stop", true, "DRY RUN — 업로드/장바구니 스킵");
      return result;
    }

    // 4) 파일업로드 팝업 열기 → PDF 첨부 + 주문제목 입력
    // 성원애드피아는 [바로주문]/[장바구니] 클릭 시 "파일업로드" 팝업(#order_title 포함)이 뜨고
    // 그 안에서 파일추가(plupload) → 주문제목 → [주문서 작성] 순서다.
    await runStep(ctx, "attach_file", true, async () => {
      if (!row.design_file) throw new Error("design_file 없음");
      const pdf = await downloadObject(row.design_file);
      const dir = mkdtempSync(path.join(tmpdir(), "adpia-"));
      const filePath = path.join(dir, `${row.name}_명함.pdf`);
      writeFileSync(filePath, pdf);

      // 파일업로드 팝업 열기 (이미 열려 있으면 스킵). 하단 버튼이라 scroll+force.
      // ★ 반드시 "장바구니"(#btn_cart_save)로 열어야 팝업 하단에 [장바구니 담기]가 표시된다.
      //   "바로주문"으로 열면 [주문서 작성](세션종속)만 표시됨.
      const titleVisible = await page
        .locator("#order_title")
        .isVisible()
        .catch(() => false);
      if (!titleVisible) {
        const opener = page.locator("#btn_cart_save").first();
        await opener.scrollIntoViewIfNeeded().catch(() => {});
        await opener.click({ timeout: 8000, force: true });
        await page.locator("#order_title").waitFor({ state: "visible", timeout: 10000 });
      }

      // 파일 첨부: plupload 업로더는 iframe(#iframe_InnoDS, plupload/index_ifr.php) 안에
      // input[type=file]을 둔다 → 메인 문서엔 없음. 모든 프레임을 순회해 찾는다.
      await page.waitForTimeout(2500); // iframe 로드 대기
      let attached = false;
      for (const frame of page.frames()) {
        const inp = frame.locator('input[type="file"]');
        const n = await inp.count().catch(() => 0);
        if (n > 0) {
          await inp.first().setInputFiles(filePath).catch(() => {});
          attached = true;
          break;
        }
      }
      if (!attached) throw new Error("파일 input을 어떤 프레임에서도 찾지 못함");

      // 업로드 진행률 100% 또는 파일명 표시 대기 (최대 20초)
      await Promise.race([
        page.locator("text=100%").first().waitFor({ state: "visible", timeout: 20000 }),
        page
          .locator(`text=${row.name}_명함`)
          .first()
          .waitFor({ state: "visible", timeout: 20000 }),
      ]).catch(() => {});
      await page.waitForTimeout(1500);

      await page.locator("#order_title").fill(`${row.name} 명함 (골지어스 자동발주)`).catch(() => {});
      return `PDF 첨부 + 주문제목 입력 완료 (${Math.round(pdf.length / 1024)}KB)`;
    });

    // 5) 팝업의 [장바구니에담기] 클릭 → 계정 장바구니(DB)에 저장 → ⛔ 정지.
    // 주문서작성(direct_order)은 워커 세션 종속이라 관리자가 못 이어받음 → 장바구니 경로 사용.
    await runStep(ctx, "add_to_cart", true, async () => {
      // 팝업 안 버튼으로 스코프(상품페이지 하단 동일 id 버튼과 구분)
      const btn = page.locator("#estimate_box_popup #btn_cart_save").first();
      assertClickSafe("장바구니에담기");
      // 담기 클릭 → 파일 업로드 + confirm 다이얼로그(자동 수락 설정됨)
      // 팝업 하단 버튼이라 스크롤 후 force 클릭(가림/뷰포트밖 대비)
      await btn.scrollIntoViewIfNeeded().catch(() => {});
      await btn.click({ timeout: 10000, force: true });
      await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
      await page.waitForTimeout(2000);
      // 장바구니 페이지로 이동 확인, 아니면 직접 이동해 담긴 항목 확인
      if (!page.url().includes("order_cart")) {
        await page
          .goto(ADPIA.base + ADPIA.cartPath, { waitUntil: "networkidle" })
          .catch(() => {});
      }
      result.cartUrl = ADPIA.base + ADPIA.cartPath;
      const empty = await page
        .locator("text=장바구니가 비어")
        .count()
        .catch(() => 0);
      if (empty > 0) throw new Error("장바구니가 비어 있음 — 담기 실패");
      return `장바구니 담김 완료: ${result.cartUrl} — 관리자가 로그인 후 결제 진행`;
    });

    return result;
  } finally {
    await browser?.close().catch(() => {});
  }
}
