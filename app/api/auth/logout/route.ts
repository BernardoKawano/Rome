import { NextResponse } from "next/server";
import { clearGoogleSessionCookie } from "@/lib/google-session";

export async function POST() {
  await clearGoogleSessionCookie();
  return NextResponse.json({ ok: true });
}
