"use client";

export function SelectAutoSubmit({
  name,
  defaultValue,
  options,
  form,
  className = "rounded-md border border-slate-300 px-3 py-2 text-sm",
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  /**
   * Id du formulaire auquel rattacher le champ quand il n'est pas à
   * l'intérieur. C'est ce qui permet à l'écran Réunion de poser un filtre dans
   * l'entête de chaque section tout en n'ayant qu'un seul formulaire : sans ça,
   * changer un filtre perdrait la valeur des autres.
   */
  form?: string;
  className?: string;
}) {
  return (
    <select
      name={name}
      form={form}
      defaultValue={defaultValue}
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
      className={className}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
