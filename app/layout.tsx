import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "골지어스 — 헬스장·병원 오픈 전문 컨설팅",
  description:
    "공간 배치부터 수익성 분석, 기구·IT·운영까지. 1,200곳을 열어본 오픈 실무 전문 컨설팅, 골지어스.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
