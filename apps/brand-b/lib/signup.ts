import { AU_STATE_OPTIONS, type SignupStep } from "@repo/ui";
import { siteMembership } from "./brand";

export const IS_CC = siteMembership === "CC";

const opts = (xs: string[]) => xs.map((x) => ({ value: x, label: x }));

/** Figma "Your details" → "Club details" → "Club address" (Partner Connect: business). Lists to confirm with Asahi. */
export function signupSteps(email: string | null): SignupStep[] {
  const org = IS_CC ? "club" : "business";
  const Org = IS_CC ? "Club" : "Business";
  const addressStep: SignupStep = {
    key: "address",
    label: `${Org} address`,
    title: `${Org} address`,
    intro: `Where should we deliver? This becomes your ${org}'s delivery address.`,
    submitLabel: "Submit for review",
    fields: [
      { name: "address1", label: "Street address", type: "text", required: true },
      { name: "address2", label: "Unit, suite or building (optional)", type: "text" },
      { name: "city", label: "Suburb", type: "text", required: true, half: true },
      { name: "zoneCode", label: "State", type: "select", required: true, half: true, options: AU_STATE_OPTIONS, placeholder: "Select" },
      { name: "zip", label: "Postcode", type: "postcode", required: true, half: true },
      { name: "terms", label: "I agree to the Terms of Sale and Privacy Policy, and confirm I'm 18 or over.", type: "checkbox", required: true },
    ],
    footnote: `Our team checks every ${org} before the account goes live. We'll email you once it's approved.`,
  };

  if (IS_CC) {
    return [
      {
        key: "you",
        label: "Your details",
        title: "Your details",
        intro: "Your email is verified. Tell us about you, then your club.",
        submitLabel: "Continue to club details",
        fields: [
          { name: "firstName", label: "First name", type: "text", required: true, half: true },
          { name: "lastName", label: "Last name", type: "text", required: true, half: true },
          { name: "email", label: "Email address", type: "email", readOnly: true, defaultValue: email ?? "", hint: "Verified" },
          {
            name: "position",
            label: "Role at the club",
            type: "select",
            required: true,
            placeholder: "Select your role",
            options: opts(["President", "Secretary", "Treasurer", "Committee member", "Canteen manager", "Bar manager", "Volunteer", "Other"]),
          },
          { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "04__ ___ ___" },
          { name: "howHeard", label: "How did you hear about Club Connect", type: "text", placeholder: "How did you hear about us?" },
        ],
      },
      {
        key: "org",
        label: "Club details",
        title: "Club details",
        intro: "Tell us about the club you are registering. Our team verifies these details before your account goes live.",
        submitLabel: "Continue to club address",
        fields: [
          { name: "companyName", label: "Club name", type: "text", required: true, hint: "Enter your club's full name as it should appear on your account" },
          {
            name: "sport",
            label: "Sport type",
            type: "select",
            required: true,
            placeholder: "Select a sport",
            options: opts(["Australian rules football", "Basketball", "Bowls", "Cricket", "Golf", "Hockey", "Netball", "Rugby league", "Rugby union", "Soccer", "Tennis", "Other"]),
          },
          { name: "season", label: "Club season", type: "select", required: true, placeholder: "Select a season", options: opts(["Summer", "Winter", "All year"]) },
          { name: "abn", label: "ABN", type: "abn", required: true, placeholder: "00 000 000 000", hint: "Required for club accounts" },
          { name: "licence", label: "Liquor licence number", type: "text", placeholder: "Enter licence number", hint: "Optional" },
          { name: "inviteCode", label: "Invite code", type: "text", placeholder: "e.g. RIVER-2026", hint: "Optional · from the club that invited you" },
        ],
      },
      addressStep,
    ];
  }

  return [
    {
      key: "you",
      label: "Your details",
      title: "Your details",
      intro: "Your email is verified. Tell us about you, then your business.",
      submitLabel: "Continue to business details",
      fields: [
        { name: "firstName", label: "First name", type: "text", required: true, half: true },
        { name: "lastName", label: "Last name", type: "text", required: true, half: true },
        { name: "email", label: "Email address", type: "email", readOnly: true, defaultValue: email ?? "", hint: "Verified" },
        { name: "dob", label: "Date of birth", type: "dob", required: true, hint: "Required · you must be 18 or over" },
        { name: "phone", label: "Phone number", type: "tel", required: true, placeholder: "04__ ___ ___" },
        { name: "position", label: "Your role", type: "text", placeholder: "e.g. Venue manager" },
      ],
    },
    {
      key: "org",
      label: "Business details",
      title: "Business details",
      intro: "Tell us about the business you are registering. Our team verifies these details before your account goes live.",
      submitLabel: "Continue to business address",
      fields: [
        { name: "companyName", label: "Business name", type: "text", required: true, hint: "Registered business name" },
        { name: "tradingName", label: "Trading name", type: "text", hint: "Optional · if different" },
        { name: "abn", label: "ABN", type: "abn", required: true, placeholder: "00 000 000 000" },
        { name: "accessCode", label: "Access code", type: "text", required: true, hint: "From your Asahi account manager" },
      ],
    },
    addressStep,
  ];
}

/** Support route shown on the pending screen. */
export const SIGNUP_CONTACT = process.env.SUPPORT_CONTACT_URL || process.env.AGE_GATE_CONTACT_URL || null;
