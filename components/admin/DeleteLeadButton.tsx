"use client";

import { deleteLead } from "@/app/actions/leads";

export default function DeleteLeadButton({
  id,
  label = "삭제",
  className,
}: {
  id: string;
  label?: string;
  className?: string;
}) {
  return (
    <form
      action={deleteLead}
      onSubmit={(e) => {
        if (!confirm("이 문의를 삭제할까요? 되돌릴 수 없습니다.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button
        type="submit"
        className={
          className ??
          "rounded-md border border-line px-2 py-1 text-xs text-dim transition hover:border-[#e2574a] hover:text-[#e2574a]"
        }
      >
        {label}
      </button>
    </form>
  );
}
