import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { isGoogleAuthConfigured } from "@/lib/google-config";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Demandas",
  description: "Kanban minimalista com Google Drive",
  icons: {
    icon: [
      { url: "/icon/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icon/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt">
      <body className={`${geistSans.className} min-h-screen antialiased`}>
        {!isGoogleAuthConfigured() ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
            {process.env.VERCEL ? (
              <>
                Configure <code className="font-mono">GOOGLE_CLIENT_ID</code>,{" "}
                <code className="font-mono">GOOGLE_CLIENT_SECRET</code> e{" "}
                <code className="font-mono">AUTH_SESSION_SECRET</code> na Vercel e faça redeploy.
              </>
            ) : (
              <>
                Defina <code className="font-mono">GOOGLE_CLIENT_ID</code> e{" "}
                <code className="font-mono">GOOGLE_CLIENT_SECRET</code> em{" "}
                <code className="font-mono">.env.local</code>.
              </>
            )}
          </div>
        ) : null}
        {children}
      </body>
    </html>
  );
}
