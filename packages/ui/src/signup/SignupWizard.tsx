"use client";

import { useActionState, useMemo, useState, type ReactNode } from "react";
import { isVisible, validateField, type SignupState, type SignupStep } from "./validation";

const inputCls = (error?: string, readOnly?: boolean) =>
  `w-full rounded-sm border px-3 py-2.5 text-base outline-none focus:border-brand ${readOnly ? "border-neutral-200 bg-neutral-100 text-neutral-500" : "bg-white text-neutral-900"} ${error ? "border-red-600" : readOnly ? "" : "border-neutral-300"}`;

function DobInput({ name, value, onChange, error }: { name: string; value: string; onChange: (v: string) => void; error?: string }) {
  const [y = "", m = "", d = ""] = value ? value.split("-") : [];
  const set = (part: "d" | "m" | "y", v: string) => {
    const parts = { d, m, y, [part]: v.replace(/\D/g, "") };
    onChange(parts.y || parts.m || parts.d ? `${parts.y}-${parts.m.padStart(parts.m ? 2 : 0, "0")}-${parts.d.padStart(parts.d ? 2 : 0, "0")}` : "");
  };
  const cell = "w-16 rounded-sm border px-2 py-2.5 text-center text-base outline-none focus:border-brand";
  return (
    <div className="flex items-center gap-2" role="group" aria-label="Date of birth">
      <input aria-label="Day" inputMode="numeric" maxLength={2} placeholder="DD" defaultValue={d} onChange={(e) => set("d", e.target.value)} className={`${cell} ${error ? "border-red-600" : "border-neutral-300"}`} />
      <span className="text-neutral-400">/</span>
      <input aria-label="Month" inputMode="numeric" maxLength={2} placeholder="MM" defaultValue={m} onChange={(e) => set("m", e.target.value)} className={`${cell} ${error ? "border-red-600" : "border-neutral-300"}`} />
      <span className="text-neutral-400">/</span>
      <input aria-label="Year" inputMode="numeric" maxLength={4} placeholder="YYYY" defaultValue={y} onChange={(e) => set("y", e.target.value)} className={`${cell} w-20 ${error ? "border-red-600" : "border-neutral-300"}`} />
      <input type="hidden" name={name} value={value} />
    </div>
  );
}

/**
 * Figma "Create account" cards: a stepped form (Your details → Club details → Club address for
 * Club Connect; Your details → Delivery address for Drinks Cart). Each step is checked before
 * moving on; the last step submits every value to the server action in one go, and a server
 * error jumps back to the step with the problem.
 */
export function SignupWizard({ eyebrow = "Create account", steps, action }: { eyebrow?: string; steps: SignupStep[]; action: (prev: SignupState, formData: FormData) => Promise<SignupState> }) {
  const initial = useMemo(() => Object.fromEntries(steps.flatMap((s) => s.fields.map((f) => [f.name, f.defaultValue ?? ""]))), [steps]);
  const [values, setValues] = useState<Record<string, string>>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [index, setIndex] = useState(0);
  const [state, formAction, pending] = useActionState(async (prev: SignupState, fd: FormData) => {
    const r = await action(prev, fd);
    if (r && !r.ok) {
      setErrors(r.fieldErrors ?? {});
      const back = r.step ? steps.findIndex((s) => s.key === r.step) : steps.findIndex((s) => s.fields.some((f) => r.fieldErrors?.[f.name]));
      if (back >= 0) setIndex(back);
    }
    return r;
  }, null);

  const step = steps[index]!;
  const last = index === steps.length - 1;
  const set = (name: string, v: string) => {
    setValues((s) => ({ ...s, [name]: v }));
    setErrors((e) => {
      if (!e[name]) return e;
      const { [name]: _gone, ...rest } = e;
      return rest;
    });
  };

  function checkStep(): boolean {
    const found: Record<string, string> = {};
    for (const f of step.fields) {
      if (!isVisible(f, values)) continue;
      const err = validateField(f, values[f.name]);
      if (err) found[f.name] = err;
    }
    setErrors(found);
    return Object.keys(found).length === 0;
  }

  return (
    <div className="flex min-h-[70vh] items-start justify-center bg-brand-dark px-4 py-10 sm:py-16">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!checkStep()) return e.preventDefault();
          if (!last) {
            e.preventDefault();
            setIndex(index + 1);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }
        }}
        noValidate
        className="w-full max-w-[420px] rounded-lg bg-white p-6 shadow-xl sm:p-7"
      >
        <p className="font-heading text-sm font-bold uppercase tracking-[0.05em] text-neutral-500">{eyebrow}</p>
        <h1 className="mt-2 font-heading text-3xl font-bold text-brand">{step.title}</h1>
        {step.intro ? <p className="mt-2 text-sm text-neutral-500">{step.intro}</p> : null}

        <ol className="mt-5 grid gap-2" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label="Sign-up steps">
          {steps.map((s, i) => (
            <li key={s.key} aria-current={i === index ? "step" : undefined} className="flex flex-col gap-1.5">
              <span className={`h-0.5 ${i <= index ? "bg-brand" : "bg-neutral-200"}`} />
              <span className={`text-xs ${i === index ? "text-neutral-900" : "text-neutral-500"}`}>{i < index ? "✓ " : ""}{s.label}</span>
            </li>
          ))}
        </ol>

        {state && !state.ok ? <p role="alert" className="mt-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{state.message}</p> : null}

        {/* Every value travels with the final submit, including fields on earlier steps. */}
        {steps.flatMap((s) => s.fields).filter((f) => !step.fields.includes(f)).map((f) => (
          <input key={`h-${f.name}`} type="hidden" name={f.name} value={isVisible(f, values) ? values[f.name] ?? "" : ""} />
        ))}

        <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4">
          {step.fields.map((f) => {
            if (!isVisible(f, values)) return null;
            const id = `su-${f.name}`;
            const err = errors[f.name];
            const span = f.half ? "col-span-2 sm:col-span-1" : "col-span-2";
            if (f.type === "segmented") {
              return (
                <div key={f.name} className={span} role="radiogroup" aria-label={typeof f.label === "string" ? f.label : f.name}>
                  <input type="hidden" name={f.name} value={values[f.name] ?? ""} />
                  <div className="grid border border-neutral-900" style={{ gridTemplateColumns: `repeat(${f.options?.length ?? 1}, minmax(0, 1fr))` }}>
                    {f.options?.map((o) => (
                      <button key={o.value} type="button" role="radio" aria-checked={values[f.name] === o.value} onClick={() => set(f.name, o.value)} className={`px-3 py-1.5 text-xs ${values[f.name] === o.value ? "bg-brand text-white" : "bg-white text-neutral-700"}`}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            }
            if (f.type === "checkbox") {
              return (
                <label key={f.name} className={`${span} flex items-start gap-2 text-sm text-neutral-700`}>
                  <input type="checkbox" name={f.name} checked={values[f.name] === "on"} onChange={(e) => set(f.name, e.target.checked ? "on" : "")} className="mt-0.5 h-[18px] w-[18px] shrink-0 accent-[var(--brand-color)]" />
                  <span>
                    {f.label}
                    {err ? <span className="mt-1 block text-xs text-red-700">{err}</span> : null}
                  </span>
                </label>
              );
            }
            return (
              <div key={f.name} className={span}>
                <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-neutral-900">{f.label}</label>
                {f.type === "select" ? (
                  <select id={id} name={f.name} value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} className={inputCls(err)}>
                    <option value="">{f.placeholder ?? "Select"}</option>
                    {f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                ) : f.type === "dob" ? (
                  <DobInput name={f.name} value={values[f.name] ?? ""} onChange={(v) => set(f.name, v)} error={err} />
                ) : f.type === "textarea" ? (
                  <textarea id={id} name={f.name} rows={3} value={values[f.name] ?? ""} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} className={inputCls(err)} />
                ) : (
                  <input
                    id={id}
                    name={f.name}
                    type={f.type === "email" ? "email" : f.type === "tel" ? "tel" : "text"}
                    inputMode={f.type === "abn" || f.type === "postcode" ? "numeric" : undefined}
                    readOnly={f.readOnly}
                    value={values[f.name] ?? ""}
                    onChange={(e) => set(f.name, e.target.value)}
                    placeholder={f.placeholder}
                    aria-invalid={Boolean(err)}
                    className={inputCls(err, f.readOnly)}
                  />
                )}
                {err ? <p className="mt-1 text-xs text-red-700">{err}</p> : f.hint || f.required ? <p className="mt-1 text-xs text-neutral-500">{f.hint ?? "Required"}</p> : null}
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          {index > 0 ? (
            <button type="button" onClick={() => setIndex(index - 1)} className="text-sm text-brand underline">Back</button>
          ) : null}
          <button type="submit" disabled={pending} className="rounded-sm bg-brand px-5 py-3 font-heading text-base font-bold uppercase tracking-[0.05em] text-white hover:opacity-90 disabled:opacity-60">
            {pending ? "Submitting…" : step.submitLabel}
          </button>
        </div>
        {step.footnote ? <p className="mt-4 text-xs text-neutral-500">{step.footnote}</p> : null}
      </form>
    </div>
  );
}

/** "We're reviewing your request" / "We couldn't approve your request". */
export function SignupPending({
  state,
  title,
  body,
  details,
  contactHref,
  contactLabel = "Contact us",
}: {
  state: "pending" | "rejected";
  title: string;
  body: ReactNode;
  details?: { label: string; value: string }[];
  contactHref?: string | null;
  contactLabel?: string;
}) {
  return (
    <div className="flex min-h-[70vh] items-start justify-center bg-brand-dark px-4 py-10 sm:py-16">
      <section className="w-full max-w-[520px] rounded-lg bg-white p-6 text-center shadow-xl sm:p-10">
        <span aria-hidden className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full text-2xl ${state === "pending" ? "bg-brand-tint text-brand" : "bg-red-50 text-red-700"}`}>
          {state === "pending" ? "⏳" : "!"}
        </span>
        <h1 className="mt-4 font-heading text-3xl font-bold text-brand sm:text-4xl">{title}</h1>
        <div className="mt-3 text-base text-neutral-600">{body}</div>
        {details?.length ? (
          <dl className="mt-6 divide-y divide-neutral-200 rounded border border-neutral-200 text-left text-sm">
            {details.map((d) => (
              <div key={d.label} className="flex justify-between gap-4 px-4 py-2.5">
                <dt className="text-neutral-500">{d.label}</dt>
                <dd className="text-right font-medium text-neutral-900">{d.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {contactHref ? <a href={contactHref} className="rounded-sm border border-brand px-5 py-3 font-heading text-sm font-bold uppercase tracking-[0.05em] text-brand">{contactLabel}</a> : null}
          <form action="/api/auth/logout" method="POST">
            <button type="submit" className="rounded-sm bg-brand px-5 py-3 font-heading text-sm font-bold uppercase tracking-[0.05em] text-white">Log out</button>
          </form>
        </div>
      </section>
    </div>
  );
}
