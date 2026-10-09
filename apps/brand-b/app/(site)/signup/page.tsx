import type { Metadata } from "next";
import { SignupWizard } from "@repo/ui";
import { requireSession } from "../../../lib/session";
import { signupSteps } from "../../../lib/signup";
import { submitSignup } from "../../signup-actions";

export const metadata: Metadata = { title: "Create account", robots: { index: false } };

/** Shown by the middleware to signed-in people with no company yet. */
export default async function SignupPage() {
  const session = await requireSession();
  return <SignupWizard steps={signupSteps(session.email)} action={submitSignup} />;
}
