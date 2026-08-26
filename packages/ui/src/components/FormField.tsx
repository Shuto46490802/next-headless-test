import type { InputHTMLAttributes, ReactNode } from "react";

export interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

export function FormField({ label, error, id, className = "", ...props }: FormFieldProps) {
  const inputId = id ?? props.name;
  return (
    <label className="flex flex-col gap-1.5 text-sm" htmlFor={inputId}>
      <span className="font-medium text-neutral-700">{label}</span>
      <input
        id={inputId}
        className={`rounded-lg border border-neutral-300 px-3 py-2 text-neutral-900 outline-none focus:border-brand focus:ring-1 focus:ring-brand ${className}`}
        {...props}
      />
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </label>
  );
}

export function FieldGroup({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>;
}
