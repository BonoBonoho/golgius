// 골지어스 성원애드피아 발주 워커 — Supabase 폴링 → Playwright 발주 → 결제 직전 정지.
// systemd(golgius-adpia-worker)로 상시 실행. 단일 프로세스 = 동시 1건 보장.
//
// 사용:
//   tsx index.ts            # 폴링 루프
//   tsx index.ts --once     # 1건만 처리 후 종료 (없으면 즉시 종료)
//   tsx index.ts --once --order <id>   # 특정 주문만
//   ADPIA_DRY_RUN=1 ...     # 로그인+옵션 선택까지만

import "dotenv/config";
import {
  claimNextApproved,
  failStaleOrdering,
  transition,
} from "./lib/supabase.js";
import { notifyAdmin } from "./lib/notify.js";
import { runAdpiaOrder } from "./adpia/flow.js";
import { maskSecrets, PaymentBoundaryError } from "./adpia/guard.js";

const POLL_MS = (Number(process.env.ADPIA_POLL_SEC) || 15) * 1000;
const JOB_TIMEOUT_MS = 5 * 60 * 1000;
const DRY_RUN = process.env.ADPIA_DRY_RUN === "1";

const args = process.argv.slice(2);
const ONCE = args.includes("--once");
const ORDER_ID = args.includes("--order")
  ? args[args.indexOf("--order") + 1]
  : undefined;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`작업 타임아웃(${ms / 1000}s)`)), ms);
    p.then(
      (v) => (clearTimeout(t), resolve(v)),
      (e) => (clearTimeout(t), reject(e))
    );
  });
}

async function processOne(): Promise<boolean> {
  const row = await claimNextApproved(ORDER_ID);
  if (!row) return false;

  console.log(`[worker] 발주 시작: ${row.id} (${row.name}) dryRun=${DRY_RUN}`);
  try {
    const result = await withTimeout(runAdpiaOrder(row, DRY_RUN), JOB_TIMEOUT_MS);

    if (DRY_RUN) {
      await transition(row.id, ["ordering"], "failed", {
        adpia_error: "DRY RUN 완료 — 실제 발주 아님 (스크린샷 확인 후 재승인)",
        adpia_finished_at: new Date().toISOString(),
      });
      console.log(`[worker] dry-run 완료: ${row.id}`);
      return true;
    }

    await transition(row.id, ["ordering"], "awaiting_payment", {
      adpia_cart_url: result.cartUrl,
      adpia_error: null,
      adpia_finished_at: new Date().toISOString(),
    });
    console.log(`[worker] 결제 대기 도달: ${row.id} ${result.cartUrl}`);
    await notifyAdmin(
      `[골지어스] 명함 발주 결제 대기 — ${row.name}`,
      `<p>성원애드피아 장바구니에 담기까지 완료됐습니다(파일 첨부 포함). 애드피아에 로그인해 장바구니에서 결제만 진행하면 됩니다.</p>
       <ul>
         <li>고객: ${row.name} (${row.phone})</li>
         <li>옵션: ${JSON.stringify(row.options)}</li>
         <li>표시 가격: ${result.priceText || "미확인"}</li>
       </ul>
       <p><a href="${result.cartUrl}">장바구니 열기</a>(로그인 필요) / 관리자 화면에서 스크린샷 확인 → 결제 → 발주완료 처리하세요.</p>`
    );
  } catch (e) {
    const msg = maskSecrets((e as Error).message ?? String(e)).slice(0, 400);
    const boundary = e instanceof PaymentBoundaryError;
    console.error(`[worker] 실패: ${row.id} — ${msg}`);
    await transition(row.id, ["ordering"], "failed", {
      adpia_error: boundary ? `안전장치 작동: ${msg}` : msg,
      adpia_finished_at: new Date().toISOString(),
    });
    await notifyAdmin(
      `[골지어스] 명함 자동 발주 실패 — ${row.name}`,
      `<p>${msg}</p><p>관리자 화면에서 스크린샷·로그 확인 후 재시도하거나 수동 발주하세요.</p>`
    );
  }
  return true;
}

async function main() {
  console.log(`[worker] 시작 — poll ${POLL_MS / 1000}s, dryRun=${DRY_RUN}, once=${ONCE}`);
  for (;;) {
    try {
      const swept = await failStaleOrdering();
      if (swept > 0) console.log(`[worker] stale ordering ${swept}건 → failed`);
      const did = await processOne();
      if (ONCE) {
        console.log(did ? "[worker] 1건 처리 완료" : "[worker] 처리할 주문 없음");
        break;
      }
      if (!did) await new Promise((r) => setTimeout(r, POLL_MS));
    } catch (e) {
      console.error("[worker] 루프 오류:", maskSecrets((e as Error).message ?? String(e)));
      if (ONCE) process.exit(1);
      await new Promise((r) => setTimeout(r, POLL_MS));
    }
  }
}

main();
