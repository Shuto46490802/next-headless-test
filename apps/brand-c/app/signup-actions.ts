"use server";

import { redirect } from "next/navigation";
import { SignupError } from "@repo/customer-data";
import { stateForPostcode, validateSteps, type SignupState } from "@repo/ui";
import { requireSession, setSessionCookie } from "../lib/session";
import { signupAdmin } from "../lib/shopify";
import { signupSteps } from "../lib/signup";
import { validateReferralCode, verifyStaff } from "../lib/backend";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/**
 * Drinks Cart sign-up. Friends & family: the referral code is checked with the backend first;
 * a valid code approves the account straight away, an invalid one is sent back to fix. Staff:
 * approved when the backend confirms the email is on the employee list, otherwise left pending
 * for Asahi to review.
 */
export async function submitSignup(_prev: SignupState, fd: FormData): Promise<SignupState> {
  const session = await requireSession();
  if (!signupAdmin) return { ok: false, message: "Sign-up isn't available on this site yet. Please contact us." };

  const steps = signupSteps(session.email);
  const values = Object.fromEntries(steps.flatMap((s) => s.fields.map((f) => [f.name, text(fd, f.name)])));
  const { fieldErrors, step } = validateSteps(steps, values);
  if (values.zip && values.zoneCode && stateForPostcode(values.zip) !== values.zoneCode) {
    fieldErrors.zip = `${values.zip} isn't a ${values.zoneCode} postcode.`;
  }
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Please check the highlighted fields.", fieldErrors, step: step ?? "address" };

  const isFriend = values.memberType === "ff";
  let approved = false;
  let referrer: string | null = null;
  if (isFriend) {
    const check = await validateReferralCode(values.referralCode!);
    if (check.status === "invalid") return { ok: false, message: "That referral code isn't valid.", fieldErrors: { referralCode: "Check the code with the person who invited you." }, step: "you" };
    if (check.status === "unavailable") return { ok: false, message: "We can't check referral codes right now. Please try again shortly.", step: "you" };
    approved = true;
    referrer = check.referrerCustomerId;
  } else {
    approved = session.email ? await verifyStaff(session.email) : false;
  }

  try {
    await signupAdmin.updateCustomer(session.customerId, { firstName: values.firstName!, lastName: values.lastName!, phone: values.phone });
    await signupAdmin.addDefaultAddress(session.customerId, {
      firstName: values.firstName,
      lastName: values.lastName,
      address1: values.address1!,
      address2: values.address2,
      city: values.city!,
      zoneCode: values.zoneCode!,
      zip: values.zip!,
      phone: values.phone,
    });
    await signupAdmin.setMetafields(session.customerId, [
      { key: "date_of_birth", value: values.dob!, type: "date" },
      { key: "terms_accepted_at", value: new Date().toISOString(), type: "date_time" },
      { key: "referral_code_entered", value: isFriend ? values.referralCode!.toUpperCase() : "", type: "single_line_text_field" },
      { key: "referred_by", value: referrer ?? "", type: "customer_reference" },
      // Written last, so a half-finished save never reads as approved.
      { key: "account_status", value: approved ? "approved" : "pending", type: "single_line_text_field" },
    ]);
    await setSessionCookie({ ...session, access: { state: approved ? "approved" : "pending", checkedAt: Date.now() } });
  } catch (err) {
    console.error("Sign-up failed", err);
    return { ok: false, message: err instanceof SignupError ? `We couldn't create your account (${err.message}). Please try again.` : "We couldn't create your account. Please try again." };
  }
  redirect(approved ? "/" : "/pending");
}
