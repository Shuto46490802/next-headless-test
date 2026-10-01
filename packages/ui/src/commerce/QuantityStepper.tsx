"use client";

/** Figma "Action/Quantity Stepper" (outline): − value + in a pill. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  disabled = false,
  className = "",
  label = "Quantity",
}: {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
  className?: string;
  label?: string;
}) {
  const btn = "flex h-full w-8 items-center justify-center text-neutral-700 transition hover:text-black disabled:opacity-30";
  return (
    <div role="group" aria-label={label} className={`flex h-12 w-[104px] shrink-0 items-center justify-between rounded-full border border-neutral-400 px-1 ${disabled ? "opacity-50" : ""} ${className}`}>
      <button type="button" aria-label="Decrease quantity" className={btn} disabled={disabled || value <= min} onClick={() => onChange(Math.max(min, value - 1))}>
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><path d="M3 8h10" /></svg>
      </button>
      <span className="min-w-6 text-center text-sm tabular-nums" aria-live="polite">{value}</span>
      <button type="button" aria-label="Increase quantity" className={btn} disabled={disabled || value >= max} onClick={() => onChange(Math.min(max, value + 1))}>
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden><path d="M3 8h10M8 3v10" /></svg>
      </button>
    </div>
  );
}
