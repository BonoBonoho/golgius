"use client";

import { deleteOrder } from "@/app/actions/orders";

export default function DeleteOrderButton({ id }: { id: string }) {
  return (
    <form
      action={deleteOrder}
      onSubmit={(e) => {
        if (!confirm("이 발주 요청을 삭제할까요? 되돌릴 수 없습니다.")) e.preventDefault();
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
