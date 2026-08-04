"use client";

import { useFormStatus } from "react-dom";
import { useOccupe } from "@/components/formulaire-editable";

/**
 * Bouton de soumission des formulaires de création.
 *
 * Un bouton ordinaire reste cliquable pendant l'aller-retour serveur : deux
 * clics, deux enregistrements créés — c'est ce qui produisait des actions en
 * double. `useFormStatus` connaît l'état de la soumission en cours, ce qui
 * permet de neutraliser le bouton tant qu'elle n'est pas terminée.
 *
 * `useOccupe` couvre l'autre cas : un champ pas encore prêt — une photo en
 * cours de conversion — dans un formulaire enveloppé d'une ZoneTraitement.
 */
export function BoutonCreer({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  const occupe = useOccupe();
  return (
    <button
      type="submit"
      disabled={pending || occupe}
      className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? "Enregistrement…" : children}
    </button>
  );
}
