import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/badge";
import { Pagination } from "@/components/pagination";

/** Classe à passer aux SelectAutoSubmit placés dans `filtres` : deux par ligne. */
export const CLASSE_FILTRE_PANE = "w-full rounded-md border border-slate-300 px-2 py-1.5 text-xs";

/** Style des boutons secondaires de l'en-tête (export…) passés dans `actions`. */
export const CLASSE_ACTION_PANE =
  "rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50";

export type LigneListe = {
  id: string;
  reference: string;
  /** Déjà formatée (ex. 24/09/2026). */
  date?: string;
  /** Seconde ligne, tronquée à une ligne. */
  resume?: string;
  badges?: { label: string; colorClass: string }[];
};

/**
 * Panneau de liste du mode liste + détail : titre et création, recherche,
 * filtres, lignes cliquables, pagination. Il ne fait aucune requête : chaque
 * module prépare ses lignes, car les colonnes, filtres et recherches diffèrent.
 *
 * Le formulaire cible toujours `basePath`, jamais la page courante : affiché
 * depuis une fiche, un envoi relatif resterait sur l'URL de cette fiche.
 */
export function ListePane({
  titre,
  basePath,
  nouveau,
  actions,
  recherche,
  filtres,
  filtreActif,
  archives,
  paramsConserves,
  lignes,
  selectedId,
  messageVide,
  messageVideFiltre,
  pagination,
}: {
  titre: string;
  basePath: string;
  nouveau: { href: string; label: string };
  /** Boutons secondaires (export…), à gauche du bouton de création. */
  actions?: ReactNode;
  recherche: { valeur?: string; placeholder: string };
  /** SelectAutoSubmit (avec CLASSE_FILTRE_PANE) : ils s'envoient au changement. */
  filtres?: ReactNode;
  filtreActif: boolean;
  archives?: string;
  /** Paramètres à garder en basculant vers/depuis les archives (hors page, archives). */
  paramsConserves: Record<string, string | undefined>;
  lignes: LigneListe[];
  selectedId?: string;
  messageVide: string;
  messageVideFiltre: string;
  pagination: { total: number; page: number; pageSize: number; baseParams: Record<string, string | undefined> };
}) {
  const queryArchives: Record<string, string> = {};
  for (const [cle, valeur] of Object.entries(paramsConserves)) {
    if (valeur) queryArchives[cle] = valeur;
  }
  if (archives !== "1") queryArchives.archives = "1";

  return (
    <div
      className="flex flex-col overflow-hidden border-r border-slate-200 bg-white"
      style={{ height: "calc(100vh - 4rem)" }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h2 className="text-base font-semibold text-slate-900">{titre}</h2>
        <div className="flex items-center gap-2">
          {actions}
          <Link
            href={nouveau.href}
            className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
          >
            {nouveau.label}
          </Link>
        </div>
      </div>

      <form method="get" action={basePath} className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3">
        <input
          type="text"
          name="q"
          defaultValue={recherche.valeur ?? ""}
          placeholder={recherche.placeholder}
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        {/* Ni la taille de page ni la vue archives ne sont des champs du
            formulaire : sans eux, filtrer les remettrait à zéro. */}
        {paramsConserves.taille && <input type="hidden" name="taille" value={paramsConserves.taille} />}
        {archives === "1" && <input type="hidden" name="archives" value="1" />}
        {filtres && <div className="grid grid-cols-2 gap-2">{filtres}</div>}
        <div className="flex items-center justify-between">
          {filtreActif ? (
            <Link href={basePath} className="text-xs text-slate-500 hover:underline">
              Réinitialiser les filtres
            </Link>
          ) : (
            <span />
          )}
          <Link
            href={{ pathname: basePath, query: queryArchives }}
            className="text-xs text-slate-500 hover:underline"
          >
            {archives === "1" ? "← Revenir à la liste" : "Voir les archives"}
          </Link>
        </div>
      </form>

      <div className="flex-1 overflow-y-auto">
        {lignes.map((l) => (
          <Link
            key={l.id}
            href={`${basePath}/${l.id}`}
            className={`block border-b border-slate-100 px-4 py-3 ${
              l.id === selectedId ? "bg-blue-50" : "hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-slate-900">{l.reference}</span>
              {l.date && <span className="shrink-0 text-xs text-slate-400">{l.date}</span>}
            </div>
            {l.resume && <div className="mt-0.5 truncate text-xs text-slate-500">{l.resume}</div>}
            {l.badges && l.badges.length > 0 && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                {l.badges.map((b) => (
                  <Badge key={b.label} label={b.label} colorClass={b.colorClass} />
                ))}
              </div>
            )}
          </Link>
        ))}
        {lignes.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            {filtreActif ? messageVideFiltre : messageVide}
          </p>
        )}
      </div>

      {pagination.total > 0 && (
        <Pagination
          total={pagination.total}
          page={pagination.page}
          pageSize={pagination.pageSize}
          baseParams={pagination.baseParams}
          basePath={basePath}
        />
      )}
    </div>
  );
}
