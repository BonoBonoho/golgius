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
  // 구 URL 영구 리다이렉트 (광고/북마크/검색엔진 유입 보존)
  async redirects() {
    return [{ source: '/hospital', destination: '/medical', permanent: true }];
  },
  // 부모 디렉터리 lockfile로 인한 워크스페이스 오인 방지 — standalone을 평평하게 유지
  outputFileTracingRoot: import.meta.dirname,
  // resvg 네이티브 바이너리는 번들 대신 node_modules에서 로드
  serverExternalPackages: ['@resvg/resvg-js'],
  // 인쇄 PDF 렌더(resvg)가 쓰는 로컬 폰트를 standalone 번들에 포함
  outputFileTracingIncludes: {
    '/api/design-agent/**': ['./assets/fonts/**'],
  },
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
