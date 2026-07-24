"use client";

import { useEffect, useRef } from "react";

// Avertit avant de quitter la page (fermeture, rechargement, saisie d'URL)
// tant que le formulaire parent n'a pas été soumis. Ne couvre pas la
// navigation interne via <Link> (SPA, pas de déchargement réel de la page).
export function AvertissementNonEnregistre() {
  const ancreRef = useRef<HTMLDivElement>(null);
  const soumis = useRef(false);

  useEffect(() => {
    const form = ancreRef.current?.closest("form");

    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (soumis.current) return;
      e.preventDefault();
      e.returnValue = "";
    }
    function onSubmit() {
      soumis.current = true;
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    form?.addEventListener("submit", onSubmit);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      form?.removeEventListener("submit", onSubmit);
    };
  }, []);

  return <div ref={ancreRef} className="hidden" />;
}
