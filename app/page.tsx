import { BoardPage } from "@/components/BoardPage";
import { getAuthMode, getAuthUserId } from "@/lib/auth";
import { isGoogleAuthConfigured } from "@/lib/google-config";
import { redirect } from "next/navigation";

export default async function Home() {
  const userId = await getAuthUserId();

  if (isGoogleAuthConfigured() && !userId) {
    redirect("/login");
  }

  return <BoardPage authMode={getAuthMode()} />;
}
