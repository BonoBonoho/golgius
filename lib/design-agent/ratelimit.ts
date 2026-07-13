// 공개 엔드포인트 남용 방지 — 인메모리 IP 레이트리밋.
// 단일 EC2 프로세스(systemd 1개) 전제라 인메모리로 충분하다.

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

// 전역 서킷브레이커 (시간당 총 요청)
let globalBucket: Bucket = { count: 0, resetAt: 0 };
const GLOBAL_LIMIT_PER_HOUR = 300;

function sweep(now: number) {
  if (buckets.size < 5000) return;
  for (const [k, b] of buckets) if (b.resetAt <= now) buckets.delete(k);
}

/** true = 허용, false = 초과 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): boolean {
  const now = Date.now();

  if (globalBucket.resetAt <= now) {
    globalBucket = { count: 0, resetAt: now + 60 * 60 * 1000 };
  }
  globalBucket.count += 1;
  if (globalBucket.count > GLOBAL_LIMIT_PER_HOUR) return false;

  sweep(now);
  const b = buckets.get(key);
  if (!b || b.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  b.count += 1;
  return b.count <= limit;
}

/** CloudFront 뒤에서 클라이언트 IP 추출 */
export function clientIp(req: Request): string {
  // CloudFront-Viewer-Address: "1.2.3.4:12345" 또는 "[2001:db8::1]:12345"
  const cfAddr = req.headers.get("cloudfront-viewer-address");
  if (cfAddr) return cfAddr.replace(/:\d+$/, "");
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0].trim();
  return "unknown";
}
