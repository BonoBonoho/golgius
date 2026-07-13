"use client";

// 발주 에이전트 진행 중일 때 5초마다 서버 컴포넌트 새로고침.
// 페이지가 force-dynamic이라 별도 API 없이 router.refresh로 충분.

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdpiaLive({ active }: { active: boolean }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), 5000);
    return () => clearInterval(t);
  }, [active, router]);
  return null;
}
