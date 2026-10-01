"use server";

import { cookies } from "next/headers";
import { AGE_COOKIE, AGE_DECLINED_COOKIE } from "../lib/age-gate";

const base = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

/** "Yes": held for the browser session, or 30 days with "Remember me on this device". */
export async function confirmAge(remember: boolean): Promise<void> {
  const store = await cookies();
  store.delete(AGE_DECLINED_COOKIE);
  store.set(AGE_COOKIE, "1", remember ? { ...base, maxAge: 60 * 60 * 24 * 30 } : base);
}

/** "No": a dead end for the rest of the session. */
export async function declineAge(): Promise<void> {
  (await cookies()).set(AGE_DECLINED_COOKIE, "1", base);
}
