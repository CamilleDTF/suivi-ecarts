import type { ReactNode } from "react";

const COULEURS = {
  bleu: { bg: "bg-primary/10", text: "text-primary" },
  orange: { bg: "bg-amber-50", text: "text-amber-600" },
  violet: { bg: "bg-purple-50", text: "text-purple-600" },
  sarcelle: { bg: "bg-teal-50", text: "text-teal-600" },
  vert: { bg: "bg-green-50", text: "text-green-600" },
  rouge: { bg: "bg-red-50", text: "text-red-600" },
} as const;

export function StatTile({
  label,
  value,
  tone = "neutral",
  icon,
  couleur = "bleu",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "critical" | "good";
  icon?: ReactNode;
  couleur?: keyof typeof COULEURS;
}) {
  const toneClasses = {
    neutral: "border-border bg-card",
    critical: "border-red-200 bg-card",
    good: "border-green-200 bg-card",
  }[tone];

  const valueClasses = {
    neutral: "text-slate-900",
    critical: "text-[#d03b3b]",
    good: "text-[#0ca30c]",
  }[tone];

  const c = COULEURS[couleur];

  return (
    <div className={`rounded-xl border p-4 ${toneClasses}`}>
      <div className="mb-3 flex min-h-[2.5rem] items-center gap-3">
        {icon && (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${c.bg} ${c.text}`}>
            {icon}
          </span>
        )}
        <div className="text-sm text-slate-500">{label}</div>
      </div>
      <div className={`text-3xl font-semibold ${valueClasses}`}>{value}</div>
    </div>
  );
}
