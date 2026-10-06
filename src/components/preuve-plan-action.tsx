"use client";

import { FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Preuve d'une action en lecture : photo affichée, PDF ouvert dans un onglet,
 * ou texte repris de l'Excel d'origine. Reprend l'affichage du champ de saisie
 * (ChampFichier) sans ses boutons d'ajout, de remplacement et de retrait.
 */
export function PreuveAction({ valeur }: { valeur: string }) {
  const estImage = valeur.startsWith("data:image/");
  const estPdf = valeur.startsWith("data:application/pdf");

  // Les navigateurs bloquent l'ouverture directe d'une URL `data:` dans un
  // onglet : on repasse par un blob, que rien n'interdit.
  function ouvrirDocument() {
    const [entete, base64] = valeur.split(",");
    const type = entete.slice(5).split(";")[0];
    const binaire = atob(base64);
    const octets = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([octets], { type }));
    window.open(url, "_blank", "noopener");
    // Libérer tout de suite fermerait le document dans l'onglet qui vient de
    // s'ouvrir : on laisse le temps au navigateur de le charger.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  if (estImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- data URL : next/image n'a rien à optimiser
      <img src={valeur} alt="Preuve" className="max-h-96 rounded-lg border object-contain" />
    );
  }

  if (estPdf) {
    return (
      <div className="flex items-center gap-3 rounded-lg border bg-muted/40 px-3 py-2">
        <FileTextIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
        <span className="min-w-0 flex-1 truncate text-sm">Document PDF</span>
        <Button type="button" variant="outline" size="sm" onClick={ouvrirDocument} data-no-print>
          Ouvrir
        </Button>
      </div>
    );
  }

  return (
    <p className="whitespace-pre-line text-sm">
      {valeur}
      <span className="ml-2 text-xs text-muted-foreground">(texte repris de l&apos;Excel)</span>
    </p>
  );
}
