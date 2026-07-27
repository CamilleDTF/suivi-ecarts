"use client";

import { useEffect } from "react";
import { IconFileText } from "@/components/icons";

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
export function BoutonExportPDF() {
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
    <button
      type="button"
      onClick={() => window.print()}
      className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
    >
      <IconFileText className="h-4 w-4" />
      Exporter en PDF
    </button>
  );
}
