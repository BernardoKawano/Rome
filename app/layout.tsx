import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import "./globals.css";

const geistSans = Geist({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Demandas",
  description: "Kanban dos talentos, com relatório de impacto",
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
        {!isSupabaseConfigured() && process.env.NODE_ENV === "production" ? (
          <div className="border-b border-amber-200 bg-amber-50 px-4 py-2 text-center text-xs text-amber-900">
            Configure <code className="font-mono">NEXT_PUBLIC_SUPABASE_URL</code> e{" "}
            <code className="font-mono">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code> para persistir em produção.
          </div>
        ) : null}
        {children}
      </body>
    </html>
  );
}
