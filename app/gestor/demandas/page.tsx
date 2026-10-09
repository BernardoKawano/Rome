import { BoardPage } from "@/components/BoardPage";
import { getAuthProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function GestorDemandasPage() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "gestor") redirect("/");

  return (
    <BoardPage
      talentId={profile.id}
      talentName="Minhas demandas"
      talentEmail={profile.email}
      company={null}
      readOnly={false}
      viewerRole={profile.role}
      personal
    />
  );
}
