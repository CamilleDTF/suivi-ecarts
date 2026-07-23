"use client";

export function StatutSelectForm({
  action,
  hiddenName,
  hiddenValue,
  selectName,
  defaultValue,
  options,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hiddenName: string;
  hiddenValue: string;
  selectName: string;
  defaultValue: string;
  options: { value: string; label: string }[];
}) {
  return (
    <form action={action}>
      <input type="hidden" name={hiddenName} value={hiddenValue} />
      <label className="text-xs font-medium uppercase text-slate-400">Statut</label>
      <select
        name={selectName}
        defaultValue={defaultValue}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="mt-1 block w-full rounded-md border border-slate-300 px-2 py-1 text-sm"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </form>
  );
}
