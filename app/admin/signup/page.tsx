import { redirect } from "next/navigation";
import { isAuthed, adminAuthConfigured } from "@/lib/admin";
import SignupForm from "./SignupForm";

export const dynamic = "force-dynamic";

export default async function AdminSignupPage() {
  if (await isAuthed()) redirect("/admin");

  return <SignupForm configured={adminAuthConfigured()} />;
}
