import { SignIn } from "@clerk/nextjs";
import { isAppAuthConfigured } from "@/lib/app-auth-config";
import { isClerkConfigured } from "@/lib/clerk-config";
import Link from "next/link";
import { redirect } from "next/navigation";

export default function SignInPage() {
  if (isAppAuthConfigured() && !isClerkConfigured()) {
    redirect("/login");
  }
  if (!isClerkConfigured()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[var(--background)] px-4 text-center text-sm text-neutral-600">
        <p>Autenticação não configurada.</p>
        <Link href="/login" className="text-neutral-900 underline">
          Ir para login
        </Link>
      </div>
    );
  }
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
}
