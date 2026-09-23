import { BoardPage } from "@/components/BoardPage";
import { getAuthProfile } from "@/lib/auth";
import { getStore } from "@/lib/store";
import { notFound, redirect } from "next/navigation";

export default async function GestorTalentPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await getAuthProfile();
  if (!viewer) redirect("/login");
  if (viewer.role !== "gestor") redirect("/");

  const { id } = await params;
  const talent = await getStore().getProfile(id);
  if (!talent || talent.role !== "talento") notFound();

  return (
    <BoardPage
      talentId={talent.id}
      talentName={talent.name}
      talentEmail={talent.email}
      company={talent.company}
      readOnly
      viewerRole={viewer.role}
    />
  );
}
