"use server";

import { revalidatePath } from "next/cache";
import { isAuthed } from "@/lib/admin";
import { updateOrderStatus, type OrderStatus } from "@/lib/orders";

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
