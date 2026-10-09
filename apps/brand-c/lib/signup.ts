import { AU_STATE_OPTIONS, type SignupStep } from "@repo/ui";

/** Figma DC "Your details" (Staff / Friend or Family) → "Delivery address". */
export function signupSteps(email: string | null): SignupStep[] {
  return [
    {
      key: "you",
      label: "Your details",
      title: "Your details",
      intro: "Tell us how you are connected to Asahi.",
      submitLabel: "Continue to delivery address",
      fields: [
        {
          name: "memberType",
          label: "I am",
          type: "segmented",
          defaultValue: "staff",
          options: [
            { value: "staff", label: "Staff" },
            { value: "ff", label: "Friend or Family" },
          ],
        },
        { name: "firstName", label: "First name", type: "text", required: true, half: true },
        { name: "lastName", label: "Last name", type: "text", required: true, half: true },
        { name: "email", label: "Email address", type: "email", readOnly: true, defaultValue: email ?? "", hint: "Verified" },
        { name: "dob", label: "Date of birth", type: "dob", required: true, hint: "Required · you must be 18 or over" },
        { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "04__ ___ ___" },
        {
          name: "referralCode",
          label: "Referral code",
          type: "text",
          required: true,
          placeholder: "e.g. SAM-DC-2026",
          hint: "Required · from the Asahi staff member who invited you",
          showWhen: { field: "memberType", equals: "ff" },
        },
      ],
      footnote: "Staff are verified against the Asahi employee list. Friends and family need a staff member's referral code.",
    },
    {
      key: "address",
      label: "Delivery address",
      title: "Delivery address",
      intro: "Where should we deliver your orders?",
      submitLabel: "Create account",
      fields: [
        { name: "address1", label: "Street address", type: "text", required: true },
        { name: "address2", label: "Unit, suite or building (optional)", type: "text" },
        { name: "city", label: "Suburb", type: "text", required: true, half: true },
        { name: "zoneCode", label: "State", type: "select", required: true, half: true, options: AU_STATE_OPTIONS, placeholder: "Select" },
        { name: "zip", label: "Postcode", type: "postcode", required: true, half: true },
        { name: "terms", label: "I agree to the Terms of Sale and Privacy Policy, and confirm I'm 18 or over.", type: "checkbox", required: true },
      ],
    },
  ];
}

export const SIGNUP_CONTACT = process.env.SUPPORT_CONTACT_URL || process.env.AGE_GATE_CONTACT_URL || null;
