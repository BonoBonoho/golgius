/** @type {import('next').NextConfig} */
// AWS(EC2) 배포용: standalone 서버 번들 + 프록시(CloudFront→Caddy→EC2) 뒤 Server Actions 신뢰.
// CloudFront가 뷰어 Host(공개 도메인)를 그대로 오리진에 전달하므로, Server Actions의
// Origin/Host 교차검증이 공개 도메인을 허용하도록 ALLOWED_ORIGINS(빌드시 주입, 스킴 없는
// 호스트명 콤마구분)로 등록한다. 예: ALLOWED_ORIGINS=dxxxx.cloudfront.net,golgius.example.com
// 미설정(로컬 검증)이면 same-origin(localhost)만 허용 — 기본 동작 유지.
const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig = {
  output: 'standalone',
  ...(extraOrigins.length
    ? {
        experimental: {
          serverActions: {
            allowedOrigins: extraOrigins,
            allowedForwardedHosts: extraOrigins,
          },
        },
      }
    : {}),
};

export default nextConfig;
