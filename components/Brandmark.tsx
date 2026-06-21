// 골지어스 로고 = G 심볼(메달리온) + 워드마크.
// 심볼의 G 고리가 어두워 다크 배경에선 묻히므로, 은은한 라이트 원형 배경 위에 올린다.
// 워드마크 글자는 기존 스타일(밝은 텍스트) 유지.

export default function Brandmark({
  size = "md",
  withWordmark = true,
}: {
  size?: "sm" | "md" | "lg";
  withWordmark?: boolean;
}) {
  const medallion =
    size === "lg" ? "h-12 w-12 p-2" : size === "sm" ? "h-8 w-8 p-1" : "h-9 w-9 p-1.5";
  const word =
    size === "lg" ? "text-2xl" : size === "sm" ? "text-base" : "text-xl";

  return (
    <span className="inline-flex items-center gap-2.5">
      <span className={`grid shrink-0 place-items-center rounded-full bg-ink ${medallion}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/golgius-mark.png" alt="GOLGIUS" className="h-full w-full object-contain" />
      </span>
      {withWordmark && (
        <span className={`font-extrabold tracking-tight ${word}`}>GOLGIUS</span>
      )}
    </span>
  );
}
