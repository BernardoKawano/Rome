export type Role = "gestor" | "talento";

export type Profile = {
  id: string;
  email: string;
  name: string;
  role: Role;
  company: string | null;
};

type Viewer = Pick<Profile, "id" | "role">;

export function canReadTalent(viewer: Viewer, talentId: string): boolean {
  return viewer.role === "gestor" || viewer.id === talentId;
}

export function canEditBoard(viewer: Viewer, talentId: string): boolean {
  if (viewer.role === "gestor") return true;
  return viewer.id === talentId;
}

export function canPostMessage(viewer: Viewer, talentId: string): boolean {
  if (viewer.role === "gestor") return true;
  return viewer.id === talentId;
}

export function canCreateMeeting(viewer: Viewer): boolean {
  return viewer.role === "gestor";
}

export function canEditReport(viewer: Viewer, talentId: string): boolean {
  return viewer.role === "talento" && viewer.id === talentId;
}

export function canManageTalents(viewer: Viewer): boolean {
  return viewer.role === "gestor";
}
