"use client";

import { ExternalLinkIcon, FileTextIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Enregistrement joint à un dossier, en lecture : aperçu d'une photo, ou nom
 * d'un PDF avec de quoi l'ouvrir. L'ajout et le remplacement se font dans le
 * panneau de modification, via le champ de fichier du formulaire.
 */
export function DossierEnregistrement({ valeur, nom }: { valeur: string; nom?: string | null }) {
  const estImage = valeur.startsWith("data:image/");
  const estPdf = valeur.startsWith("data:application/pdf");

  // Les navigateurs bloquent l'ouverture directe d'une URL `data:` dans un
  // onglet : on repasse par un blob, que rien n'interdit.
  function ouvrir() {
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
      <img
        src={valeur}
        alt={nom || "Enregistrement du dossier"}
        className="max-h-96 w-full rounded-lg bg-muted/40 object-contain"
      />
    );
  }

  return (
    <div className="flex items-center gap-3">
      <FileTextIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0 flex-1 truncate text-sm font-medium">
        {nom || (estPdf ? "Document PDF" : "Fichier joint")}
      </span>
      {estPdf && (
        <Button type="button" variant="outline" size="sm" onClick={ouvrir} data-no-print>
          <ExternalLinkIcon /> Ouvrir
        </Button>
      )}
    </div>
  );
}
