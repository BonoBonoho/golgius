// 방문자 유입 출처 추정 (클라이언트 전용 — window 사용).
// UTM 파라미터 우선, 없으면 리퍼러 도메인, 둘 다 없으면 direct.

export function deriveSource(): string {
  try {
    const p = new URLSearchParams(window.location.search);
    const us = p.get("utm_source");
    if (us) {
      const um = p.get("utm_medium");
      return `${us}${um ? `/${um}` : ""}`.slice(0, 60);
    }
    const ref = document.referrer;
    if (ref) {
      const host = new URL(ref).hostname.replace(/^www\./, "");
      if (host && host !== window.location.hostname) return host.slice(0, 60);
    }
  } catch {
    // ignore
  }
  return "direct";
}
