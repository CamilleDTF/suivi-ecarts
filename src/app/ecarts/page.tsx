import Link from "next/link";
import { ActivityIcon, ArchiveIcon, ArrowLeftIcon, PlusIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { FiltresListe } from "@/components/filtres-liste";
import { buttonVariants } from "@/components/ui/button";
import { Origine } from "@/generated/prisma/enums";
import {
  ORIGINE_LABELS,
  STATUT_DOSSIER_ECART_LABELS,
  NATURES_OPTIONS,
  DOMAINES_OPTIONS,
  THEME_OPTIONS,
} from "@/lib/labels";
import { filtreArchive } from "@/lib/archivage";
import { cn } from "@/lib/utils";

const COLONNES = [
  { statut: "OUVERT", point: "bg-amber-500", fond: "bg-amber-500/10" },
  { statut: "EN_COURS", point: "bg-blue-500", fond: "bg-blue-500/10" },
  { statut: "CLOTURE", point: "bg-emerald-500", fond: "bg-emerald-500/10" },
] as const;

const POINT_CRITICITE: Record<string, string> = {
  Faible: "bg-emerald-500",
  Moyenne: "bg-amber-500",
  Élevée: "bg-red-500",
};

const PAR_COLONNE = 8;
const PAR_COLONNE_DEPLIEE = 60;

export default async function EcartsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; origine?: string; colonne?: string; archives?: string }>;
}) {
  const { q, origine, colonne, archives } = await searchParams;

  // Les listes à choix (natures, domaines, thèmes) sont stockées en tableaux :
  // on cherche d'abord quelles options correspondent au texte saisi, puis on
  // filtre sur celles-ci. Cela permet une recherche partielle et insensible à
  // la casse, ce que `has` seul ne permet pas.
  const optionsCorrespondantes = (options: string[]) =>
    q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : [];
  const naturesTrouvees = optionsCorrespondantes(NATURES_OPTIONS);
  const domainesTrouves = optionsCorrespondantes(DOMAINES_OPTIONS);
  const themesTrouves = optionsCorrespondantes(THEME_OPTIONS);

  const contient = { contains: q, mode: "insensitive" as const };
  const base = {
    ...filtreArchive(archives),
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

  const colonnes = await Promise.all(
    COLONNES.map(async (c) => {
      const where = { ...base, statut: c.statut };
      const [total, ecarts] = await Promise.all([
        prisma.ecart.count({ where }),
        prisma.ecart.findMany({
          where,
          orderBy: { dateDetection: "desc" },
          // `select` explicite : jamais `enregistrement` (photo/PDF en data URL)
          // du dossier, qui serait retéléchargé en entier pour chaque carte.
          select: {
            id: true,
            reference: true,
            description: true,
            criticite: true,
            dateDetection: true,
            dossier: { select: { reference: true, chantier: true } },
            _count: { select: { fichesSSE: true } },
          },
          take: colonne === c.statut ? PAR_COLONNE_DEPLIEE : PAR_COLONNE,
        }),
      ]);
      return { ...c, total, ecarts };
    }),
  );

  const total = colonnes.reduce((s, c) => s + c.total, 0);
  const filtreActif = !!q || !!origine;

  return (
    <div className="mx-auto max-w-[96rem] px-6 py-10 lg:px-10">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            {archives === "1" ? "Écarts archivés" : "Écarts"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {colonnes.map((c) => `${c.total} ${STATUT_DOSSIER_ECART_LABELS[c.statut].toLowerCase()}${c.total > 1 && c.statut !== "EN_COURS" ? "s" : ""}`).join(" · ")}
            {filtreActif ? " — filtre en cours" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={{ pathname: "/ecarts", query: archives === "1" ? {} : { archives: "1" } }}
            className={buttonVariants({ variant: "ghost", size: "lg" })}
          >
            {archives === "1" ? <ArrowLeftIcon /> : <ArchiveIcon />}
            {archives === "1" ? "Revenir au tableau" : "Archives"}
          </Link>
          <Link href="/ecarts/nouveau" className={buttonVariants({ size: "lg" })}>
            <PlusIcon /> Nouvel écart
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <FiltresListe
          basePath="/ecarts"
          placeholder="Rechercher un écart, un chantier, un déclarant…"
          recherche={q ?? ""}
          conserves={{ archives }}
          filtres={[
            {
              name: "origine",
              valeur: origine ?? "",
              options: [
                { value: "", label: "Toutes les origines" },
                ...Object.values(Origine).map((o) => ({ value: o, label: ORIGINE_LABELS[o] })),
              ],
            },
          ]}
        />
      </div>

      {total === 0 ? (
        <p className="rounded-lg border border-dashed py-16 text-center text-sm text-muted-foreground">
          {filtreActif ? "Aucun écart ne correspond à ces filtres." : "Aucun écart pour l'instant."}
        </p>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-3">
          {colonnes.map((c) => (
            <section key={c.statut} aria-label={STATUT_DOSSIER_ECART_LABELS[c.statut]}>
              <header className="mb-3 flex items-center gap-2.5 border-b-2 border-foreground/80 pb-2">
                <span className={cn("size-2.5 rounded-full", c.point)} aria-hidden />
                <h2 className="text-sm font-semibold uppercase tracking-wider">{STATUT_DOSSIER_ECART_LABELS[c.statut]}</h2>
                <span className="ml-auto rounded bg-foreground px-1.5 py-0.5 text-xs font-semibold tabular-nums text-background">
                  {c.total}
                </span>
              </header>

              <ul className="space-y-2.5">
                {c.ecarts.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/ecarts/${e.id}`}
                      className="group block rounded-md border bg-card p-3.5 shadow-xs transition-all hover:-translate-y-0.5 hover:border-foreground/30 hover:shadow-md"
                    >
                      <div className="mb-1.5 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                        <span className="font-semibold tracking-wide text-foreground">{e.reference}</span>
                        <span className="tabular-nums">{e.dateDetection.toLocaleDateString("fr-FR")}</span>
                      </div>
                      <p className="line-clamp-3 text-sm leading-snug">{e.description || "Sans description"}</p>
                      <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="min-w-0 flex-1 truncate">{e.dossier?.chantier ?? "Sans dossier"}</span>
                        {e._count.fichesSSE > 0 && (
                          <span className="flex items-center gap-1" title={`${e._count.fichesSSE} évènement(s) SSE`}>
                            <ActivityIcon className="size-3.5" aria-hidden />
                            {e._count.fichesSSE}
                          </span>
                        )}
                        {e.criticite && (
                          <span
                            className={cn("size-2.5 rounded-full", POINT_CRITICITE[e.criticite] ?? "bg-slate-400")}
                            title={`Criticité ${e.criticite.toLowerCase()}`}
                          />
                        )}
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>

              {c.total > c.ecarts.length && (
                <Link
                  href={{ pathname: "/ecarts", query: { ...(q ? { q } : {}), ...(origine ? { origine } : {}), ...(archives ? { archives } : {}), colonne: c.statut } }}
                  className="mt-3 block rounded-md border border-dashed py-2 text-center text-sm text-muted-foreground transition-colors hover:border-foreground/40 hover:text-foreground"
                >
                  Voir les {c.total - c.ecarts.length} autres
                </Link>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
