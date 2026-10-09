"use server";

import { redirect } from "next/navigation";
import { SignupError } from "@repo/customer-data";
import { stateForPostcode, validateSteps, type SignupState } from "@repo/ui";
import { getValidAccessToken, requireSession, setSessionCookie } from "../lib/session";
import { customerAccount, signupAdmin } from "../lib/shopify";
import { siteMembership } from "../lib/brand";
import { IS_CC, signupSteps } from "../lib/signup";

const text = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();

/**
 * Club Connect / Partner Connect sign-up: create the company straight away (pending), with the
 * person registering as main contact and Location admin. Asahi approves it in Shopify admin by
 * changing the company's Account status to approved.
 */
export async function submitSignup(_prev: SignupState, fd: FormData): Promise<SignupState> {
  const session = await requireSession();
  if (!signupAdmin) return { ok: false, message: "Sign-up isn't available on this site yet. Please contact us." };

  const values = Object.fromEntries(signupSteps(session.email).flatMap((s) => s.fields.map((f) => [f.name, text(fd, f.name)])));
  const { fieldErrors, step } = validateSteps(signupSteps(session.email), values);
  if (values.zip && values.zoneCode && stateForPostcode(values.zip) !== values.zoneCode) {
    fieldErrors.zip = `${values.zip} isn't a ${values.zoneCode} postcode.`;
  }
  if (Object.keys(fieldErrors).length) return { ok: false, message: "Please check the highlighted fields.", fieldErrors, step: step ?? "address" };

  // A double submit, or a person who already belongs to a company: don't create a second one.
  const token = await getValidAccessToken(session);
  const existing = await customerAccount.getAccessStatus(token).catch(() => null);
  if (existing?.company) {
    await setSessionCookie({ ...session, access: { state: existing.company.status === "approved" ? "approved" : "pending", checkedAt: Date.now() }, companyLocationId: existing.company.locationId });
    redirect("/pending");
  }

  const abn = values.abn!.replace(/\D/g, "");
  try {
    await signupAdmin.updateCustomer(session.customerId, { firstName: values.firstName!, lastName: values.lastName!, phone: values.phone });
    await signupAdmin.setMetafields(session.customerId, [
      { key: "club_position", value: values.position ?? "", type: "single_line_text_field" },
      { key: "how_heard", value: values.howHeard ?? "", type: "single_line_text_field" },
      { key: "date_of_birth", value: values.dob ?? "", type: "date" },
      { key: "terms_accepted_at", value: new Date().toISOString(), type: "date_time" },
    ]);
    const { locationId } = await signupAdmin.createCompanyForCustomer({
      customerId: session.customerId,
      companyName: values.companyName!,
      address: {
        address1: values.address1!,
        address2: values.address2,
        city: values.city!,
        zoneCode: values.zoneCode!,
        zip: values.zip!,
        phone: values.phone,
      },
      companyMetafields: [
        { key: "site_membership", value: siteMembership, type: "single_line_text_field" },
        { key: "abn", value: abn, type: "single_line_text_field" },
        ...(IS_CC
          ? [
              { key: "sport", value: values.sport ?? "", type: "single_line_text_field" },
              { key: "season", value: values.season ?? "", type: "single_line_text_field" },
              { key: "liquor_licence_number", value: values.licence ?? "", type: "single_line_text_field" },
              { key: "referral_code_entered", value: values.inviteCode ?? "", type: "single_line_text_field" },
            ]
          : [
              { key: "trading_name", value: values.tradingName ?? "", type: "single_line_text_field" },
              { key: "access_code_entered", value: values.accessCode ?? "", type: "single_line_text_field" },
            ]),
      ],
    });
    await setSessionCookie({ ...session, access: { state: "pending", checkedAt: Date.now() }, companyLocationId: locationId });
  } catch (err) {
    console.error("Sign-up failed", err);
    return { ok: false, message: err instanceof SignupError ? `We couldn't submit your request (${err.message}). Please try again.` : "We couldn't submit your request. Please try again." };
  }
  redirect("/pending");
}
