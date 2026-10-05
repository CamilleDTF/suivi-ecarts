"use client";

import { useFormStatus } from "react-dom";
import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EntiteArchivable } from "@/lib/archivage";

function Bouton({ archive, className }: { archive: boolean; className: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="outline" size="lg" disabled={pending} className={className}>
      {archive ? <ArchiveRestoreIcon /> : <ArchiveIcon />}
      {pending ? "…" : archive ? "Désarchiver" : "Archiver"}
    </Button>
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
  className = "w-full justify-start",
}: {
  action: (formData: FormData) => void | Promise<void>;
  entite: EntiteArchivable;
  id: string;
  archive?: boolean;
  className?: string;
}) {
  return (
    <form action={action}>
      <input type="hidden" name="entite" value={entite} />
      <input type="hidden" name="id" value={id} />
      <Bouton archive={archive} className={className} />
    </form>
  );
}
