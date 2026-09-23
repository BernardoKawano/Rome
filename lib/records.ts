import type { ImpactSummary } from "./impact";
import type { Role } from "./access";

export type AppMessage = {
  id: string;
  talentId: string;
  authorId: string;
  authorRole: Role;
  body: string;
  createdAt: string;
};

export type Meeting = {
  id: string;
  talentId: string;
  title: string;
  startsAt: string;
  link: string | null;
  notes: string | null;
  createdAt: string;
};

export type WeeklyReport = {
  talentId: string;
  periodStart: string;
  periodEnd: string;
  narrative: string;
  snapshot: ImpactSummary;
  updatedAt: string;
};
