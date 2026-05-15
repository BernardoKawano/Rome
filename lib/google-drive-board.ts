import { google } from "googleapis";
import {
  GOOGLE_BOARD_FILENAME,
  GOOGLE_BOARD_MIME,
  googleClientId,
  googleClientSecret,
  googleRedirectUri,
} from "@/lib/google-config";
import { refreshGoogleAccessToken } from "@/lib/google-oauth";
import type { GoogleSession } from "@/lib/google-session";

export type GoogleBoardReadResult = {
  data: unknown | null;
  session: GoogleSession;
};

const DRIVE_FILE_QUERY = `name='${GOOGLE_BOARD_FILENAME}' and trashed=false and 'appDataFolder' in parents`;

function createOAuthClient(session: GoogleSession) {
  const client = new google.auth.OAuth2(googleClientId(), googleClientSecret(), googleRedirectUri());
  client.setCredentials({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
    expiry_date: session.accessTokenExp,
  });
  return client;
}

async function ensureFreshTokens(session: GoogleSession): Promise<GoogleSession> {
  const marginMs = 60_000;
  if (Date.now() < session.accessTokenExp - marginMs) return session;
  const tokens = await refreshGoogleAccessToken(session.refreshToken);
  return {
    ...session,
    accessToken: tokens.access_token,
    accessTokenExp: Date.now() + tokens.expires_in * 1000,
  };
}

function driveErrorMessage(err: unknown): string {
  if (err && typeof err === "object" && "message" in err) {
    return String((err as { message: string }).message);
  }
  return "Erro desconhecido no Google Drive";
}

async function findBoardFileId(drive: ReturnType<typeof google.drive>): Promise<string | null> {
  const res = await drive.files.list({
    q: DRIVE_FILE_QUERY,
    fields: "files(id,name)",
    pageSize: 1,
    spaces: "drive",
  });
  return res.data.files?.[0]?.id ?? null;
}

async function createBoardFile(drive: ReturnType<typeof google.drive>, initialJson: string): Promise<string> {
  const res = await drive.files.create({
    requestBody: {
      name: GOOGLE_BOARD_FILENAME,
      mimeType: GOOGLE_BOARD_MIME,
      parents: ["appDataFolder"],
    },
    media: { mimeType: GOOGLE_BOARD_MIME, body: initialJson },
    fields: "id",
  });
  const id = res.data.id;
  if (!id) throw new Error("Google Drive não devolveu id do ficheiro");
  return id;
}

async function readFileContent(drive: ReturnType<typeof google.drive>, fileId: string): Promise<unknown> {
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );
  const buf = res.data as ArrayBuffer;
  const text = Buffer.from(buf).toString("utf-8");
  if (!text.trim()) return null;
  return JSON.parse(text) as unknown;
}

export async function readBoardFromGoogleDrive(session: GoogleSession): Promise<GoogleBoardReadResult> {
  let current = await ensureFreshTokens(session);
  const auth = createOAuthClient(current);
  const drive = google.drive({ version: "v3", auth });

  const fileId = current.driveFileId ?? (await findBoardFileId(drive));
  if (!fileId) {
    return { data: null, session: current };
  }

  try {
    const data = await readFileContent(drive, fileId);
    current = { ...current, driveFileId: fileId };
    return { data, session: current };
  } catch (err) {
    throw new Error(`Não foi possível ler o ficheiro no Drive: ${driveErrorMessage(err)}`);
  }
}

export async function writeBoardToGoogleDrive(session: GoogleSession, data: unknown): Promise<GoogleSession> {
  const current = await ensureFreshTokens(session);
  const auth = createOAuthClient(current);
  const drive = google.drive({ version: "v3", auth });
  const body = JSON.stringify(data);

  try {
    let fileId = current.driveFileId ?? (await findBoardFileId(drive));
    if (!fileId) {
      fileId = await createBoardFile(drive, body);
      return { ...current, driveFileId: fileId };
    }

    await drive.files.update({
      fileId,
      media: { mimeType: GOOGLE_BOARD_MIME, body },
    });
    return { ...current, driveFileId: fileId };
  } catch (err) {
    throw new Error(`Não foi possível guardar no Drive: ${driveErrorMessage(err)}`);
  }
}
