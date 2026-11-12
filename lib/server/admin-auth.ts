import "server-only";
import { createHash } from "node:crypto";
import { cookies } from "next/headers";

/** Вход в /admin/* по ADMIN_PASSWORD: та же кука, что у воронки. */
export const ADMIN_COOKIE = "trajectory_admin";
export const adminToken = (pw: string) => createHash("sha256").update(`trajectory:${pw}`).digest("hex");

export async function isAdmin(): Promise<boolean> {
  const pw = process.env.ADMIN_PASSWORD;
  if (!pw) return false;
  return (await cookies()).get(ADMIN_COOKIE)?.value === adminToken(pw);
}

export async function tryLogin(password: FormDataEntryValue | null) {
  const pw = process.env.ADMIN_PASSWORD;
  if (pw && password === pw) {
    (await cookies()).set(ADMIN_COOKIE, adminToken(pw), { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/admin", maxAge: 60 * 60 * 8 });
  }
}
