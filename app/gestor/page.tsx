import { ManagerHome } from "@/components/ManagerHome";
import { getAuthProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function GestorPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "gestor") redirect("/");
  return <ManagerHome />;
}
