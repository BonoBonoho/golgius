"use server";

import { revalidatePath } from "next/cache";
import { isAuthed } from "@/lib/admin";
import { updateIntakeStatus, deleteIntake as removeIntake, type IntakeStatus } from "@/lib/intakes";

const VALID: IntakeStatus[] = ["received", "reviewed", "done"];

export async function setIntakeStatus(formData: FormData): Promise<void> {
  if (!(await isAuthed())) return;
  const id = String(formData.get("id") ?? "");
  const status = String(formData.get("status") ?? "") as IntakeStatus;
  if (!id || !VALID.includes(status)) return;
  await updateIntakeStatus(id, status);
  revalidatePath("/admin/intakes");
}

export async function deleteIntake(formData: FormData): Promise<void> {
  if (!(await isAuthed())) return;
  const id = String(formData.get("id") ?? "");
  if (!id) return;
  await removeIntake(id);
  revalidatePath("/admin/intakes");
}
