import { BoardPage } from "@/components/BoardPage";
import { getAuthMode, getAuthUserId } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const mode = getAuthMode();
  const userId = await getAuthUserId();

  if ((mode === "clerk" || mode === "app") && !userId) {
    redirect(mode === "clerk" ? "/sign-in" : "/login");
  }

  return <BoardPage authMode={mode} />;
}
