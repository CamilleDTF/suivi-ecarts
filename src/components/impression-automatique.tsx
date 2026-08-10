"use client";

import { useEffect } from "react";

/**
 * Ouvre la boîte d'impression dès l'affichage de la page.
 *
 * Permet au bouton « Exporter en PDF » d'un dossier de mener directement au
 * rapport complet et d'en lancer l'impression : sans cela il faudrait ouvrir le
 * rapport, puis cliquer une seconde fois.
 *
 * Le rendu doit être terminé avant l'appel, sinon Chrome imprime une page
 * incomplète ; deux `requestAnimationFrame` laissent passer la peinture.
 */
export function ImpressionAutomatique() {
  useEffect(() => {
    let annule = false;
    const t = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (!annule) window.print();
      }),
    );
    return () => {
      annule = true;
      cancelAnimationFrame(t);
    };
  }, []);
  return null;
}
