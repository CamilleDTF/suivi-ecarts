export function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: "neutral" | "critical" | "good";
}) {
  const toneClasses = {
    neutral: "border-slate-200 bg-white",
    critical: "border-red-200 bg-white",
    good: "border-green-200 bg-white",
  }[tone];

  const valueClasses = {
    neutral: "text-slate-900",
    critical: "text-[#d03b3b]",
    good: "text-[#0ca30c]",
  }[tone];

  return (
    <div className={`flex flex-col rounded-lg border p-4 ${toneClasses}`}>
      <div className="min-h-[2.5rem] text-sm text-slate-500">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${valueClasses}`}>{value}</div>
    </div>
  );
}
