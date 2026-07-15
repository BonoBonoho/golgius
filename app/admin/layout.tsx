// 관리자 공통 레이아웃 — 모든 admin 페이지에 통일 네비(AdminNav) 적용.
// (AdminNav는 /admin/login·/admin/signup 에선 스스로 숨는다.)

import AdminNav from "@/components/admin/AdminNav";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}
