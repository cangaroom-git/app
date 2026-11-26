import { redirect } from "next/navigation";

export default function LegacySuperAdminRedirectPage() {
  redirect("/admin");
}
