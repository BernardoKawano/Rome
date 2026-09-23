import { z } from "zod";

export const loginInputSchema = z.object({
  email: z.string().trim().email().max(200),
  password: z.string().min(1).max(200),
});

export const createTalentInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().email().max(200),
  password: z.string().min(8).max(200),
  company: z.string().trim().min(1).max(120),
});

export const updateTalentInputSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  company: z.string().trim().max(120).nullable().optional(),
});

export const messageInputSchema = z.object({
  body: z.string().trim().min(1).max(4000),
});

export const meetingInputSchema = z.object({
  title: z.string().trim().min(1).max(200),
  startsAt: z.string().datetime(),
  link: z.string().trim().max(500).optional(),
  notes: z.string().trim().max(2000).optional(),
});

export const reportInputSchema = z.object({
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  narrative: z.string().max(8000),
});
