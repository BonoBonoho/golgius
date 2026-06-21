export default function Footer() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-lg font-extrabold tracking-tight">GOLGIUS</div>
            <p className="mt-1 text-sm text-dim">Your success is our career</p>
            <p className="mt-4 max-w-sm text-sm text-dim">
              헬스장·병원 오픈 전문 컨설팅. 공간 배치부터 수익성 분석, 기구·IT·운영까지
              한 팀이 책임집니다.
            </p>
          </div>

          <div className="text-sm">
            <p className="eyebrow mb-3">Contact</p>
            <dl className="space-y-1.5 text-dim">
              <div className="flex gap-2">
                <dt className="text-ink">대표</dt>
                <dd>김영재</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ink">전화</dt>
                <dd>010-6381-5008</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ink">이메일</dt>
                <dd>yj@golgius.com</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ink">인스타</dt>
                <dd>@golgius_0_jae</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-ink">주소</dt>
                <dd>서울 영등포구 영등포로 150, B동 712호</dd>
              </div>
            </dl>
          </div>
        </div>

        <div className="mt-10 border-t border-line pt-6 text-xs text-dim">
          © {new Date().getFullYear()} GOLGIUS. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
