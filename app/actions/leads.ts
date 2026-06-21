"use server";

import { revalidatePath } from "next/cache";
import { isAuthed } from "@/lib/admin";
import { updateLeadStage, type Stage } from "@/lib/leads";

const VALID: Stage[] = ["inquiry", "consult", "quote", "contract", "open", "lost"];

export async function moveStage(formData: FormData): Promise<void> {
  if (!(await isAuthed())) return;

  const id = String(formData.get("id") ?? "");
  const from = String(formData.get("from") ?? "") as Stage;
  const to = String(formData.get("to") ?? "") as Stage;

  if (!id || !VALID.includes(to) || from === to) return;

  await updateLeadStage(id, from, to);
  revalidatePath("/admin");
}
