import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Geist } from "next/font/google";
import { isAppAuthConfigured } from "@/lib/app-auth-config";
import { isClerkConfigured } from "@/lib/clerk-config";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Demandas",
  description: "Kanban minimalista",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const clerkOn = isClerkConfigured();
  const appAuthOn = isAppAuthConfigured();

  return (
    <html lang="pt">
      <body className={`${geistSans.className} min-h-screen antialiased`}>
        {!clerkOn && !appAuthOn ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
            Modo local: defina credenciais em <code className="font-mono">.env.local</code> (
            <code className="font-mono">APP_AUTH_USERNAME</code> / <code className="font-mono">APP_AUTH_PASSWORD</code>
            ) ou chaves Clerk.
          </div>
        ) : null}
        {clerkOn ? <ClerkProvider>{children}</ClerkProvider> : children}
      </body>
    </html>
  );
}
