# golgius.vercel.app → golgius.milestone-x.app 리다이렉트 껍데기

AWS 이전(2026-07-04) 후 golgius.vercel.app 을 무거운 Next.js 앱 대신 이 정적 리다이렉트로
교체했다. 네이버 CPC 등 golgius.vercel.app 을 가리키는 광고·자료 링크가 새 도메인으로
자동 이동(308)하므로 유입이 끊기지 않고, Vercel 에서 SSR·함수가 돌지 않아 과금 위험도 없다.

재배포(설정 틀어졌을 때):
  # golgius Vercel 프로젝트 framework=Other 로 설정돼 있어야 함(정적)
  cd deploy/vercel-redirect && npx vercel deploy --prod --yes --scope bono-hans-projects
  # .vercel/project.json 은 golgius 프로젝트 것을 복사해 사용

광고 URL 을 전부 golgius.milestone-x.app 으로 옮기고 유입이 0 이 되면 이 프로젝트도 정지 가능.
