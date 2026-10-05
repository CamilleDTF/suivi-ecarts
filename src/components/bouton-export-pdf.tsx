"use client";

import { useEffect } from "react";
import { PrinterIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Export PDF via l'impression du navigateur ("Enregistrer au format PDF").
 *
 * Ce choix évite une seconde mise en page à maintenir en parallèle de la fiche :
 * le PDF est la fiche elle-même, filtrée par la feuille de styles d'impression,
 * donc les deux ne peuvent pas diverger.
 *
 * Les zones de texte ne s'agrandissent pas toutes seules : à l'impression, leur
 * contenu serait coupé à la hauteur affichée. On les déplie juste avant, et on
 * les remet ensuite.
 */
export function BoutonExportPDF({ className = "w-full justify-start" }: { className?: string }) {
  useEffect(() => {
    const hauteursInitiales = new Map<HTMLTextAreaElement, string>();

    function avantImpression() {
      document.querySelectorAll("textarea").forEach((zone) => {
        hauteursInitiales.set(zone, zone.style.height);
        zone.style.height = "auto";
        zone.style.height = `${zone.scrollHeight}px`;
      });
    }

    function apresImpression() {
      for (const [zone, hauteur] of hauteursInitiales) {
        zone.style.height = hauteur;
      }
      hauteursInitiales.clear();
    }

    // Ces évènements couvrent aussi Ctrl+P, pas seulement le bouton.
    window.addEventListener("beforeprint", avantImpression);
    window.addEventListener("afterprint", apresImpression);
    return () => {
      window.removeEventListener("beforeprint", avantImpression);
      window.removeEventListener("afterprint", apresImpression);
    };
  }, []);

  return (
    <Button type="button" variant="outline" size="lg" onClick={() => window.print()} className={className}>
      <PrinterIcon />
      Exporter en PDF
    </Button>
  );
}
