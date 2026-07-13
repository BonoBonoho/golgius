// 정찰 스크립트 — headed 브라우저로 성원애드피아를 열어 로그인 이후 화면
// (업로드 UI, 장바구니, 주문서 URL 패턴)을 사람이 확인하며 상수를 검증한다.
// 실행: SWADPIA_ID=.. SWADPIA_PW=.. npm run recon
// 자격증명이 없으면 상품 페이지(공개)만 연다.

import "dotenv/config";
import { chromium } from "playwright";
import { ADPIA } from "../adpia/mapping.js";

async function main() {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  const id = process.env.SWADPIA_ID;
  const pw = process.env.SWADPIA_PW;

  if (id && pw) {
    await page.goto(ADPIA.base + ADPIA.loginPath, { waitUntil: "domcontentloaded" });
    console.log("[recon] 로그인 페이지 —", page.url());
    console.log("[recon] input들:", await page.evaluate(() =>
      [...document.querySelectorAll("input")].map((i) => `${i.tagName}[name=${i.name}][type=${i.type}]`).join(", ")
    ));
    // 자동 입력 시도 (실패해도 headed라 수동 로그인 가능)
    await page.locator('input[name="m_id"], input[name="mem_id"], #m_id').first().fill(id).catch(() => {});
    await page.locator('input[type="password"]').first().fill(pw).catch(() => {});
    console.log("[recon] 로그인 후 Enter로 진행하세요 (60초 대기)");
    await page.waitForTimeout(60000);
  }

  await page.goto(ADPIA.base + ADPIA.productPath, { waitUntil: "domcontentloaded" });
  console.log("[recon] 상품 페이지 —", page.url());
  console.log(
    "[recon] file inputs:",
    await page.evaluate(() =>
      [...document.querySelectorAll('input[type="file"]')].map((f) => (f as HTMLInputElement).name || f.id).join(", ") || "(없음 — 다음 단계에서 등장)"
    )
  );
  console.log("[recon] 이후는 수동으로 진행하며 URL 패턴을 기록하세요. 10분 후 종료.");
  await page.waitForTimeout(10 * 60 * 1000);
  await browser.close();
}

main();
