"use client";

import { useFormStatus } from "react-dom";
import type { EntiteArchivable } from "@/lib/archivage";

function Bouton({ archive }: { archive: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="whitespace-nowrap rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
    >
      {pending ? "…" : archive ? "Désarchiver" : "Archiver"}
    </button>
  );
}

/**
 * Pendant du bouton Supprimer : retire l'enregistrement des listes sans le
 * détruire. Pas de confirmation — le geste est réversible d'un clic.
 */
export function BoutonArchiver({
  action,
  entite,
  id,
  archive = false,
}: {
  action: (formData: FormData) => void | Promise<void>;
  entite: EntiteArchivable;
  id: string;
  archive?: boolean;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="entite" value={entite} />
      <input type="hidden" name="id" value={id} />
      <Bouton archive={archive} />
    </form>
  );
}
