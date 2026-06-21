import type { CSSProperties, ReactNode } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { verticals, type VerticalKey } from "@/lib/verticals";

export default function VerticalShell({
  vertical,
  children,
}: {
  vertical: VerticalKey;
  children: ReactNode;
}) {
  const v = verticals[vertical];

  // 런타임에 버티컬 액센트를 CSS 변수로 주입 → 하위 전체가 var(--accent) 사용
  const style = { "--accent": v.accent } as CSSProperties;

  return (
    <div style={style} className="flex min-h-screen flex-col">
      <Header vertical={vertical} />
      <main className="flex-1">{children}</main>
      <Footer />
    </div>
  );
}
