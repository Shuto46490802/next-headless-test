import type { ReactNode } from "react";

export type SignupFieldType = "text" | "email" | "tel" | "select" | "dob" | "abn" | "postcode" | "segmented" | "checkbox" | "textarea";

export interface SignupField {
  name: string;
  label: ReactNode;
  type: SignupFieldType;
  required?: boolean;
  readOnly?: boolean;
  defaultValue?: string;
  placeholder?: string;
  hint?: string;
  options?: { value: string; label: string }[];
  /** Two short fields side by side on wider screens. */
  half?: boolean;
  /** Only shown (and validated) when another field has this value. */
  showWhen?: { field: string; equals: string };
}

export interface SignupStep {
  key: string;
  label: string;
  title: string;
  intro?: string;
  fields: SignupField[];
  submitLabel: string;
  footnote?: string;
}

export type SignupState = { ok: false; message: string; fieldErrors?: Record<string, string>; step?: string } | null;

const AU_STATES = ["ACT", "NSW", "NT", "QLD", "SA", "TAS", "VIC", "WA"];
export const AU_STATE_OPTIONS = AU_STATES.map((s) => ({ value: s, label: s }));

export function isVisible(f: SignupField, values: Record<string, string>) {
  return !f.showWhen || values[f.showWhen.field] === f.showWhen.equals;
}

/** Client-side checks so obvious mistakes are caught before the round trip. The server re-checks everything. */
export function validateField(f: SignupField, raw: string | undefined): string | null {
  const v = (raw ?? "").trim();
  if (f.type === "checkbox") return f.required && v !== "on" ? "Please tick to continue." : null;
  if (!v) return f.required ? "Required" : null;
  if (f.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Enter a valid email address.";
  if (f.type === "tel" && v.replace(/\D/g, "").length < 8) return "Enter a valid phone number.";
  if (f.type === "abn" && v.replace(/\D/g, "").length !== 11) return "An ABN has 11 digits.";
  if (f.type === "postcode" && !/^\d{4}$/.test(v)) return "Enter a 4-digit postcode.";
  if (f.type === "dob") {
    const m = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!m) return "Enter your date of birth.";
    const dob = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    const eighteen = new Date(dob.getFullYear() + 18, dob.getMonth(), dob.getDate());
    if (Number.isNaN(dob.getTime()) || eighteen > new Date()) return "You must be 18 or over.";
  }
  return null;
}

/** Server side: checks every visible field across all steps; returns the first failing step. */
export function validateSteps(steps: SignupStep[], values: Record<string, string>): { fieldErrors: Record<string, string>; step?: string } {
  const fieldErrors: Record<string, string> = {};
  let step: string | undefined;
  for (const s of steps) {
    for (const f of s.fields) {
      if (!isVisible(f, values)) continue;
      const err = validateField(f, values[f.name]);
      if (err) {
        fieldErrors[f.name] = err;
        step ??= s.key;
      }
    }
  }
  return { fieldErrors, step };
}
