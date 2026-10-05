import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Mise en page liste + détail partagée par les modules : le panneau de liste
 * reste affiché à gauche pendant la lecture d'une fiche ou d'un formulaire.
 *
 * Sous lg, deux colonnes ne tiennent pas : on n'affiche que l'un des deux. La
 * liste quand aucun détail n'est ouvert, le détail sinon (avec RetourListe
 * pour revenir).
 */
export function SplitView({
  liste,
  detailOuvert,
  children,
}: {
  liste: ReactNode;
  detailOuvert: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex items-start">
      {/* sticky porté par ce conteneur et non par le panneau : une pastille
          sticky ne peut pas sortir du bloc parent, qui aurait sa propre hauteur. */}
      <div
        className={`sticky top-16 shrink-0 self-start lg:block lg:w-[380px] ${
          detailOuvert ? "hidden" : "w-full"
        }`}
      >
        {liste}
      </div>
      <div className={`min-w-0 flex-1 ${detailOuvert ? "" : "hidden lg:block"}`}>{children}</div>
    </div>
  );
}

/** Contenu du volet de détail quand rien n'est sélectionné. */
export function PanneauVide({ children }: { children: ReactNode }) {
  return <div className="px-6 py-8">{children}</div>;
}

/** Retour vers la liste, visible seulement là où le panneau de liste est masqué. */
export function RetourListe({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="mb-2 block w-fit text-sm text-slate-500 hover:underline lg:hidden">
      ← {label}
    </Link>
  );
}
