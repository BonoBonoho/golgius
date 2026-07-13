"use server";

import { revalidatePath } from "next/cache";
import { isAuthed } from "@/lib/admin";
import {
  adpiaTransition,
  getOrders,
  updateOrderStatus,
  deleteOrder as removeOrder,
  type OrderStatus,
} from "@/lib/orders";

const VALID: OrderStatus[] = [
  "requested",
  "quoted",
  "confirmed",
  "produced",
  "canceled",
];

export async function setOrderStatus(formData: FormData): Promise<void> {
  if (!(await isAuthed())) return;

  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as OrderStatus;
  if (!id || !VALID.includes(status)) return;

  await updateOrderStatus(id, status);
  revalidatePath("/admin/orders");
}

const ADPIA_MAX_ATTEMPTS = 3;

// 발주 승인/재시도 — idle·failed에서만 approved로 전이 (조건부 PATCH라 중복 무해)
export async function approveAdpiaOrder(formData: FormData): Promise<void> {
  if (!(await isAuthed())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const order = (await getOrders()).find((o) => o.id === id);
  if (!order) return;
  if (order.adpiaAttempts >= ADPIA_MAX_ATTEMPTS) return;

  await adpiaTransition(id, ["idle", "failed"], "approved", {
    adpia_error: null,
    adpia_attempts: order.adpiaAttempts + 1,
  });
  revalidatePath("/admin/orders");
}

// 관리자가 성원애드피아에서 결제 완료 후 수동 마킹
export async function markAdpiaOrdered(formData: FormData): Promise<void> {
  if (!(await isAuthed())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await adpiaTransition(id, ["awaiting_payment"], "ordered", {
    adpia_finished_at: new Date().toISOString(),
  });
  revalidatePath("/admin/orders");
}

export async function deleteOrder(formData: FormData): Promise<void> {
  if (!(await isAuthed())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await removeOrder(id);
  revalidatePath("/admin/orders");
}
