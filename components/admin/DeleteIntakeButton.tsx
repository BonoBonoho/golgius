"use client";

import { deleteIntake } from "@/app/actions/intakes";

export default function DeleteIntakeButton({ id }: { id: string }) {
  return (
    <form
      action={deleteIntake}
      onSubmit={(e) => {
        if (!confirm("이 제출 건을 삭제할까요? 첨부 서류 정보도 함께 사라지며 되돌릴 수 없습니다.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className="rounded-md border border-line px-2.5 py-1 text-xs font-semibold text-dim transition hover:border-[#e2574a] hover:text-[#e2574a]"
      >
        삭제
      </button>
    </form>
  );
}
