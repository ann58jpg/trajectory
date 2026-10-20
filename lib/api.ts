import { NextResponse } from "next/server";
import type { ZodError } from "zod";

export const apiError = (error: string, hint: string, status = 400) => NextResponse.json({ error, hint }, { status });

export const zodHint = (e: ZodError) =>
  e.issues.slice(0, 3).map((i) => `${i.path.join(".") || "тело"}: ${i.message}`).join("; ");
