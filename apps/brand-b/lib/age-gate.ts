import { existsSync } from "node:fs";
import { join } from "node:path";
import { cookies } from "next/headers";

export const AGE_COOKIE = "age_verified";
export const AGE_DECLINED_COOKIE = "age_declined";

/** Club photography behind the gate: drop a file at public/age-gate.jpg to enable it. */
export const AGE_GATE_IMAGE = existsSync(join(process.cwd(), "public", "age-gate.jpg")) ? "/age-gate.jpg" : null;

/** Declined screen's contact route (mailto: or URL). Hidden when unset. */
export const AGE_GATE_CONTACT = process.env.AGE_GATE_CONTACT_URL || null;

export async function getAgeGateState(): Promise<"verified" | "declined" | "ask"> {
  const store = await cookies();
  if (store.get(AGE_COOKIE)?.value === "1") return "verified";
  return store.get(AGE_DECLINED_COOKIE)?.value === "1" ? "declined" : "ask";
}
