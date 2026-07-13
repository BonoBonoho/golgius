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

const POPUP_CLOSERS = [
  "text=오늘 하루 보지 않기",
  "text=오늘하루 열지않기",
  "text=닫기",
  ".layer_popup .close",
  ".popup .close",
  "[id^=popup] .close",
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
      const idInput = page
        .locator('input[name="m_id"], input[name="mem_id"], input[name="id"], input[name="userid"], #m_id, #login_id')
        .first();
      const pwInput = page
        .locator('input[type="password"]')
        .first();
      await idInput.fill(id, { timeout: 10000 });
      await pwInput.fill(pw, { timeout: 10000 });
      await Promise.all([
        page.waitForLoadState("domcontentloaded"),
        pwInput.press("Enter"),
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

    // 4) 인쇄 PDF 업로드 — 파일 인풋이 상품 페이지 또는 다음 단계에 있을 수 있음
    await runStep(ctx, "upload_pdf", true, async () => {
      if (!row.design_file) throw new Error("design_file 없음");
      const pdf = await downloadObject(row.design_file);
      const dir = mkdtempSync(path.join(tmpdir(), "adpia-"));
      const filePath = path.join(dir, "print.pdf");
      writeFileSync(filePath, pdf);

      let fileInput = page.locator('input[type="file"]').first();
      if ((await fileInput.count()) === 0) {
        // 업로드 UI가 버튼 뒤에 있는 경우: "파일선택/업로드" 류 버튼 클릭 후 재탐색
        const openBtn = page
          .locator("a,button", { hasText: /파일|업로드/ })
          .first();
        const label = (await openBtn.textContent().catch(() => "")) ?? "";
        assertClickSafe(label);
        await openBtn.click({ timeout: 5000 });
        await page.waitForTimeout(1000);
        fileInput = page.locator('input[type="file"]').first();
      }
      await fileInput.setInputFiles(filePath, { timeout: 15000 });
      await page.waitForTimeout(2000);
      return `print.pdf 업로드 (${Math.round(pdf.length / 1024)}KB)`;
    });

    // 5) 장바구니 담기
    await runStep(ctx, "add_to_cart", true, async () => {
      const btn = page
        .locator('a:has(img[alt*="장바구니"]), img[alt*="장바구니에담기"], a:has-text("장바구니에담기")')
        .first();
      await btn.click({ timeout: 10000 });
      await page.waitForLoadState("domcontentloaded");
      await closePopups(page);
      return "장바구니 담기 완료";
    });

    // 6) 장바구니 → 주문서 작성 진입 → ⛔ 정지
    await runStep(ctx, "open_order_sheet", true, async () => {
      if (!page.url().includes("order_cart")) {
        await page.goto(ADPIA.base + ADPIA.cartPath, { waitUntil: "domcontentloaded" });
        await closePopups(page);
      }
      const btn = page
        .locator('a:has(img[alt*="주문서작성"]), a:has(img[alt*="주문정보입력"]), a:has-text("주문서작성")')
        .first();
      const label = (await btn.textContent().catch(() => "")) ?? "주문서작성";
      assertClickSafe(label);
      await btn.click({ timeout: 10000 });
      await page.waitForLoadState("domcontentloaded");
      result.cartUrl = page.url();
      return `주문서 작성 페이지 도달: ${result.cartUrl} — 결제 직전 정지`;
    });

    return result;
  } finally {
    await browser?.close().catch(() => {});
  }
}
