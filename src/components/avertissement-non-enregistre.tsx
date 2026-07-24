"use client";

import { useEffect, useRef } from "react";

const MESSAGE = "Cet évènement n'est pas enregistré. Si vous quittez cette page, les données saisies seront perdues.";

// Avertit avant de quitter la page tant que le formulaire parent n'a pas été
// soumis : à la fois pour un déchargement réel du navigateur (fermeture,
// rechargement, saisie d'URL) via "beforeunload", et pour une navigation
// interne via <Link> (SPA, qui ne déclenche jamais "beforeunload" car la page
// n'est jamais réellement déchargée) via une interception des clics sur les
// liens en phase de capture.
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
    function onClickCapture(e: MouseEvent) {
      if (soumis.current) return;
      const lien = (e.target as HTMLElement)?.closest("a");
      if (!lien) return;
      const href = lien.getAttribute("href");
      if (!href || href.startsWith("#") || lien.target === "_blank") return;
      if (href === window.location.pathname + window.location.search) return;

      if (!window.confirm(MESSAGE)) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      } else {
        soumis.current = true;
      }
    }

    window.addEventListener("beforeunload", onBeforeUnload);
    form?.addEventListener("submit", onSubmit);
    document.addEventListener("click", onClickCapture, true);
    return () => {
      window.removeEventListener("beforeunload", onBeforeUnload);
      form?.removeEventListener("submit", onSubmit);
      document.removeEventListener("click", onClickCapture, true);
    };
  }, []);

  return <div ref={ancreRef} className="hidden" />;
}
