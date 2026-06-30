import { readBoardFromFile, writeBoardToFile } from "@/lib/board-file-store";
import { readBoardFromGoogleDrive, writeBoardToGoogleDrive } from "@/lib/google-drive-board";
import { isGoogleAuthConfigured } from "@/lib/google-config";
import { GoogleReauthRequiredError } from "@/lib/google-oauth";
import {
  clearGoogleSessionCookie,
  getGoogleSessionFromCookies,
  updateGoogleSessionCookie,
  type GoogleSession,
} from "@/lib/google-session";

export async function getActiveGoogleSession(): Promise<GoogleSession | null> {
  if (!isGoogleAuthConfigured()) return null;
  return getGoogleSessionFromCookies();
}

export async function readBoardForSession(): Promise<{
  data: unknown | null;
  userId: string;
}> {
  const googleSession = await getGoogleSessionFromCookies();
  if (googleSession) {
    try {
      const { data, session } = await readBoardFromGoogleDrive(googleSession);
      if (
        session.accessToken !== googleSession.accessToken ||
        session.accessTokenExp !== googleSession.accessTokenExp ||
        session.driveFileId !== googleSession.driveFileId
      ) {
        await updateGoogleSessionCookie(session);
      }
      return { data, userId: `google:${session.sub}` };
    } catch (e) {
      if (e instanceof GoogleReauthRequiredError) {
        await clearGoogleSessionCookie();
      }
      throw e;
    }
  }

  if (process.env.NODE_ENV === "development") {
    const userId = "local-dev";
    return { data: await readBoardFromFile(userId), userId };
  }

  throw new Error("Não autenticado");
}

export async function writeBoardForSession(data: unknown): Promise<void> {
  const googleSession = await getGoogleSessionFromCookies();
  if (googleSession) {
    try {
      const updated = await writeBoardToGoogleDrive(googleSession, data);
      if (
        updated.accessToken !== googleSession.accessToken ||
        updated.accessTokenExp !== googleSession.accessTokenExp ||
        updated.driveFileId !== googleSession.driveFileId
      ) {
        await updateGoogleSessionCookie(updated);
      }
      return;
    } catch (e) {
      if (e instanceof GoogleReauthRequiredError) {
        await clearGoogleSessionCookie();
      }
      throw e;
    }
  }

  if (process.env.NODE_ENV === "development") {
    await writeBoardToFile("local-dev", data);
    return;
  }

  throw new Error("Não autenticado");
}
