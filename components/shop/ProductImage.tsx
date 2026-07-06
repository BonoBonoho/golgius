// 상품 이미지 — 없으면 카테고리 이니셜 플레이스홀더
export default function ProductImage({
  src,
  alt,
  label,
  className = "",
}: {
  src?: string;
  alt: string;
  label: string; // 플레이스홀더용 (카테고리/이름)
  className?: string;
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={`bg-white object-contain p-2 ${className}`}
        loading="lazy"
      />
    );
  }
  return (
    <div
      className={`grid place-items-center bg-gradient-to-br from-surface to-base ${className}`}
      aria-label={alt}
    >
      <span className="font-mono text-xs tracking-[0.2em] text-dim">{label}</span>
    </div>
  );
}

export function formatPrice(price: number | null): string {
  if (price === null) return "견적 문의";
  return `${price.toLocaleString("ko-KR")}원`;
}
