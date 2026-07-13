// 결제 경계 하드가드 — 어떤 경로(셀렉터 실수·Claude 폴백 오판)로도
// 결제/주문완료를 넘어가지 못하게 하는 2중 방어.

import type { Page } from "playwright";

// 결제성 URL 패턴 (주문서 "작성" 페이지는 허용, 결제 실행/완료는 차단)
export const PAYMENT_URL_RE =
  /(order_pay|payment|pay_proc|settle|order_end|order_result|order_complete|deposit_pay)/i;

// 결제성 버튼/링크 텍스트
export const PAYMENT_TEXT_RE =
  /(결제하기|결제요청|결제진행|주문완료|예치금\s*(결제|차감)|무통장|입금확인|카드결제|간편결제)/;

export class PaymentBoundaryError extends Error {
  constructor(where: string) {
    super(`결제 경계 도달 — 자동화 중단: ${where}`);
    this.name = "PaymentBoundaryError";
  }
}

/** 네비게이션 감시 — 결제 URL로 넘어가는 즉시 예외 */
export function installGuards(page: Page): void {
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame() && PAYMENT_URL_RE.test(frame.url())) {
      // 이벤트 핸들러라 throw가 플로우에 닿지 않을 수 있어 강제 종료 플래그도 세움
      (page as unknown as { __paymentBoundary?: string }).__paymentBoundary =
        frame.url();
    }
  });
}

export function checkBoundary(page: Page): void {
  const hit = (page as unknown as { __paymentBoundary?: string }).__paymentBoundary;
  if (hit) throw new PaymentBoundaryError(hit);
  if (PAYMENT_URL_RE.test(page.url())) throw new PaymentBoundaryError(page.url());
}

/** 클릭 대상 텍스트가 결제성으로 보이면 클릭 자체를 거부 */
export function assertClickSafe(label: string): void {
  if (PAYMENT_TEXT_RE.test(label)) {
    throw new PaymentBoundaryError(`결제성 버튼 클릭 시도 차단: "${label}"`);
  }
}

/** 로그/에러 직렬화 시 시크릿 마스킹 */
export function maskSecrets(s: string): string {
  let out = s;
  for (const key of ["SWADPIA_PW", "SWADPIA_ID", "SUPABASE_SERVICE_ROLE_KEY", "ANTHROPIC_API_KEY"]) {
    const v = process.env[key];
    if (v && v.length > 2) out = out.split(v).join("***");
  }
  return out;
}
