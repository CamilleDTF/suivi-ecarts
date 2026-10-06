"use client";

import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/button";
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
    <Button type="submit" size="lg" disabled={pending || occupe}>
      {pending ? "Enregistrement…" : children}
    </Button>
  );
}
