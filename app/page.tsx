import { BoardPage } from "@/components/BoardPage";
import { getAuthProfile } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const profile = await getAuthProfile();
  if (!profile) redirect("/login");
  if (profile.role === "gestor") redirect("/gestor");

  return (
    <BoardPage
      talentId={profile.id}
      talentName={profile.name}
      talentEmail={profile.email}
      company={profile.company}
      readOnly={false}
      viewerRole={profile.role}
    />
  );
}
