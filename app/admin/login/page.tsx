import { redirect } from "next/navigation";
import { isAuthed, adminAuthConfigured } from "@/lib/admin";
import LoginForm from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLoginPage() {
  if (await isAuthed()) redirect("/admin");

  return <LoginForm configured={adminAuthConfigured()} />;
}
