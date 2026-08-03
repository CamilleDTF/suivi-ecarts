"use client";

/**
 * Champ date d'un formulaire de filtre, qui applique le filtre dès qu'une date
 * est choisie — comme les listes déroulantes de filtre à côté.
 *
 * `onChange` plutôt qu'un bouton « Filtrer » : le sélecteur de date natif ne
 * renvoie l'évènement qu'une fois la date complète, il n'y a donc pas de
 * soumission à chaque frappe.
 */
export function DateAutoSubmit({
  name,
  defaultValue,
  label,
}: {
  name: string;
  defaultValue: string;
  label: string;
}) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-slate-500">
      {label}
      <input
        type="date"
        name={name}
        defaultValue={defaultValue}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900"
      />
    </label>
  );
}
