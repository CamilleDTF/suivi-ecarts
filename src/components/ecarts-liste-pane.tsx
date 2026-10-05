import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { Pagination } from "@/components/pagination";
import { Origine, StatutDossierEcart } from "@/generated/prisma/enums";
import {
  ORIGINE_LABELS,
  STATUT_DOSSIER_ECART_COLORS,
  STATUT_DOSSIER_ECART_LABELS,
  NATURES_OPTIONS,
  DOMAINES_OPTIONS,
  THEME_OPTIONS,
} from "@/lib/labels";
import { filtreStatutDossierEcart } from "@/lib/validation";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";

export type EcartsListeSearchParams = {
  q?: string;
  statut?: string;
  origine?: string;
  page?: string;
  taille?: string;
  archives?: string;
};

/**
 * Panneau de liste des écarts, partagé par /ecarts, /ecarts/[id] et
 * /ecarts/nouveau pour donner la vue liste+détail : chaque page fait sa
 * propre requête (searchParams n'est disponible que sur les pages, pas sur
 * un layout partagé), donc ce composant reste un simple serveur component
 * appelé depuis chacune plutôt qu'un layout.
 */
export async function EcartsListePane({
  searchParams,
  selectedId,
}: {
  searchParams: EcartsListeSearchParams;
  selectedId?: string;
}) {
  const { q, statut, origine, page: pageParam, taille, archives } = searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

  const optionsCorrespondantes = (options: string[]) =>
    q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : [];
  const naturesTrouvees = optionsCorrespondantes(NATURES_OPTIONS);
  const domainesTrouves = optionsCorrespondantes(DOMAINES_OPTIONS);
  const themesTrouves = optionsCorrespondantes(THEME_OPTIONS);

  const contient = { contains: q, mode: "insensitive" as const };
  const where = {
    ...filtreArchive(archives),
    statut: filtreStatutDossierEcart(statut),
    origine: origine ? (origine as Origine) : undefined,
    OR: q
      ? [
          { reference: contient },
          { description: contient },
          { declarant: contient },
          { mesureImmediate: contient },
          { cause: contient },
          { criticite: contient },
          { dossier: { chantier: contient } },
          { dossier: { reference: contient } },
          ...(naturesTrouvees.length ? [{ natures: { hasSome: naturesTrouvees } }] : []),
          ...(domainesTrouves.length ? [{ domaines: { hasSome: domainesTrouves } }] : []),
          ...(themesTrouves.length ? [{ theme: { hasSome: themesTrouves } }] : []),
        ]
      : undefined,
  };

  const [total, ecarts] = await Promise.all([
    prisma.ecart.count({ where }),
    prisma.ecart.findMany({
      where,
      orderBy: { dateDetection: "desc" as const },
      // `select` explicite : le panneau n'affiche que le chantier du dossier,
      // jamais sa pièce jointe (`enregistrement`, photo/PDF en data URL), qui
      // serait sinon retéléchargée en entier pour chaque écart de la liste.
      select: {
        id: true,
        reference: true,
        dateDetection: true,
        description: true,
        statut: true,
        dossier: { select: { chantier: true } },
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
  ]);

  const filtreActif = !!q || !!statut || !!origine;

  return (
    <div
      className="sticky top-16 flex w-[380px] shrink-0 flex-col self-start overflow-hidden border-r border-slate-200 bg-white"
      style={{ maxHeight: "calc(100vh - 4rem)" }}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3">
        <h1 className="text-base font-semibold text-slate-900">Écarts</h1>
        <Link
          href="/ecarts/nouveau"
          className="rounded-md bg-blue-600 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
        >
          + Nouvel écart
        </Link>
      </div>

      <form method="get" action="/ecarts" className="flex flex-col gap-2 border-b border-slate-100 px-4 py-3">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher un écart…"
          className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
        />
        <div className="flex gap-2">
          <SelectAutoSubmit
            name="statut"
            defaultValue={statut ?? ""}
            className="w-1/2 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
            options={[
              { value: "", label: "Statut : Tous" },
              ...Object.values(StatutDossierEcart)
                .filter((s) => s !== "A_QUALIFIER")
                .map((s) => ({ value: s, label: STATUT_DOSSIER_ECART_LABELS[s] })),
            ]}
          />
          <SelectAutoSubmit
            name="origine"
            defaultValue={origine ?? ""}
            className="w-1/2 rounded-md border border-slate-300 px-2 py-1.5 text-xs"
            options={[
              { value: "", label: "Origine : Toutes" },
              ...Object.values(Origine).map((o) => ({ value: o, label: ORIGINE_LABELS[o] })),
            ]}
          />
        </div>
        <div className="flex items-center justify-between">
          {filtreActif ? (
            <Link href="/ecarts" className="text-xs text-slate-500 hover:underline">
              Réinitialiser les filtres
            </Link>
          ) : (
            <span />
          )}
          <Link
            href={{ pathname: "/ecarts", query: archives === "1" ? { q, statut, origine } : { q, statut, origine, archives: "1" } }}
            className="text-xs text-slate-500 hover:underline"
          >
            {archives === "1" ? "← Revenir à la liste" : "Voir les archives"}
          </Link>
        </div>
      </form>

      <div className="flex-1 overflow-y-auto">
        {ecarts.map((e) => {
          const actif = e.id === selectedId;
          return (
            <Link
              key={e.id}
              href={`/ecarts/${e.id}`}
              className={`block border-b border-slate-100 px-4 py-3 ${actif ? "bg-blue-50" : "hover:bg-slate-50"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-slate-900">{e.reference}</span>
                <span className="shrink-0 text-xs text-slate-400">{e.dateDetection.toLocaleDateString("fr-FR")}</span>
              </div>
              <div className="mt-0.5 truncate text-xs text-slate-500">
                {e.dossier?.chantier ?? "—"} — {e.description}
              </div>
              <div className="mt-1.5">
                <Badge label={STATUT_DOSSIER_ECART_LABELS[e.statut]} colorClass={STATUT_DOSSIER_ECART_COLORS[e.statut]} />
              </div>
            </Link>
          );
        })}
        {ecarts.length === 0 && (
          <p className="px-4 py-6 text-center text-sm text-slate-400">
            {filtreActif ? "Aucun écart ne correspond à ce filtre." : "Aucun écart pour l'instant."}
          </p>
        )}
      </div>

      {total > 0 && (
        <Pagination
          total={total}
          page={page}
          pageSize={taillePage}
          baseParams={{ q, statut, origine, taille, archives }}
          basePath="/ecarts"
        />
      )}
    </div>
  );
}
