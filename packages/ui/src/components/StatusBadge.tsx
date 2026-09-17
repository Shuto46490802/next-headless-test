const TONES = {
  success: "bg-emerald-50 text-emerald-700",
  warning: "bg-amber-50 text-amber-700",
  neutral: "bg-neutral-100 text-neutral-500",
} as const;

export function StatusBadge({ tone = "neutral", children }: { tone?: keyof typeof TONES; children: string }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium uppercase tracking-wide ${TONES[tone]}`}>
      {children}
    </span>
  );
}
