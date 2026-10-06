import Link from "next/link";
import { ArchiveIcon, ArrowLeftIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BadgeStatut, type TonStatut } from "@/components/badge-statut";
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
import { filtreStatutDossierEcart } from "@/lib/validation";
import { filtreArchive } from "@/lib/archivage";
import { cn } from "@/lib/utils";

const TON_STATUT: Record<string, TonStatut> = {
  A_QUALIFIER: "neutre",
  OUVERT: "ambre",
  EN_COURS: "bleu",
  CLOTURE: "vert",
};
const POINT_CRITICITE: Record<string, string> = {
  Faible: "bg-emerald-500",
  Moyenne: "bg-amber-500",
  Élevée: "bg-red-500",
};

const TUILES = [
  { statut: "", label: "Tous" },
  { statut: "OUVERT", label: "Ouverts" },
  { statut: "EN_COURS", label: "En cours" },
  { statut: "CLOTURE", label: "Clôturés" },
] as const;

// Au-delà, une liste groupée n'est plus lisible : mieux vaut affiner la recherche.
const PLAFOND = 400;

export default async function EcartsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; origine?: string; archives?: string }>;
}) {
  const { q, statut, origine, archives } = await searchParams;

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

  const [parStatut, ecarts] = await Promise.all([
    prisma.ecart.groupBy({ by: ["statut"], where: base, _count: { _all: true } }),
    prisma.ecart.findMany({
      where: { ...base, statut: filtreStatutDossierEcart(statut) },
      orderBy: { dateDetection: "desc" },
      // `select` explicite : jamais `enregistrement` (photo/PDF en data URL) du
      // dossier, qui serait retéléchargé en entier pour chaque ligne.
      select: {
        id: true,
        reference: true,
        description: true,
        statut: true,
        criticite: true,
        dateDetection: true,
        dossier: { select: { id: true, reference: true, chantier: true } },
      },
      take: PLAFOND,
    }),
  ]);

  const compte = Object.fromEntries(parStatut.map((s) => [s.statut, s._count._all]));
  const totalTous = parStatut.reduce((s, x) => s + x._count._all, 0);

  // Un chantier par groupe : c'est à ce niveau qu'on suit l'avancement.
  type Groupe = { cle: string; dossier: (typeof ecarts)[number]["dossier"]; lignes: typeof ecarts };
  const groupes = new Map<string, Groupe>();
  for (const e of ecarts) {
    const cle = e.dossier?.id ?? "aucun";
    if (!groupes.has(cle)) groupes.set(cle, { cle, dossier: e.dossier, lignes: [] });
    groupes.get(cle)!.lignes.push(e);
  }
  const restants = (g: Groupe) => g.lignes.filter((l) => l.statut !== "CLOTURE").length;
  const liste = [...groupes.values()].sort(
    (a, b) => Number(a.cle === "aucun") - Number(b.cle === "aucun") || restants(b) - restants(a),
  );

  const filtreActif = !!q || !!origine;
  const lienTuile = (s: string) => ({
    pathname: "/ecarts",
    query: { ...(s ? { statut: s } : {}), ...(q ? { q } : {}), ...(origine ? { origine } : {}), ...(archives ? { archives } : {}) },
  });

  return (
    <div className="mx-auto max-w-[80rem] px-4 py-10 lg:px-8">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl font-semibold tracking-tight">
            {archives === "1" ? "Écarts archivés" : "Écarts"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Regroupés par chantier, les plus à traiter en premier.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={{ pathname: "/ecarts", query: archives === "1" ? {} : { archives: "1" } }}
            className={buttonVariants({ variant: "ghost", size: "lg" })}
          >
            {archives === "1" ? <ArrowLeftIcon /> : <ArchiveIcon />}
            {archives === "1" ? "Revenir à la liste" : "Archives"}
          </Link>
          <Link href="/ecarts/nouveau" className={buttonVariants({ size: "lg" })}>
            <PlusIcon /> Nouvel écart
          </Link>
        </div>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TUILES.map((t) => {
          const actif = (statut ?? "") === t.statut;
          const nombre = t.statut ? (compte[t.statut] ?? 0) : totalTous;
          return (
            <Link
              key={t.label}
              href={lienTuile(t.statut)}
              aria-current={actif ? "true" : undefined}
              className={cn(
                "rounded-xl border bg-card px-4 py-3 transition-all hover:border-primary/40",
                actif && "border-primary ring-2 ring-primary/15",
              )}
            >
              <p className="text-3xl font-semibold tabular-nums">{nombre}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                {t.statut && (
                  <span
                    className={cn(
                      "size-2 rounded-full",
                      { OUVERT: "bg-amber-500", EN_COURS: "bg-blue-500", CLOTURE: "bg-emerald-500" }[t.statut],
                    )}
                    aria-hidden
                  />
                )}
                {t.label}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="mb-6">
        <FiltresListe
          basePath="/ecarts"
          placeholder="Rechercher un écart, un chantier, un déclarant…"
          recherche={q ?? ""}
          conserves={{ statut, archives }}
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

      {liste.length === 0 ? (
        <p className="rounded-xl border border-dashed py-16 text-center text-sm text-muted-foreground">
          {filtreActif || statut ? "Aucun écart ne correspond à ces filtres." : "Aucun écart pour l'instant."}
        </p>
      ) : (
        <div className="space-y-4">
          {liste.map((g) => {
            const clotures = g.lignes.length - restants(g);
            const part = Math.round((clotures / g.lignes.length) * 100);
            const ouverts = g.lignes.filter((l) => l.statut === "OUVERT").length;
            const enCours = g.lignes.filter((l) => l.statut === "EN_COURS").length;
            return (
              <details key={g.cle} open={restants(g) > 0 || !!statut} className="group overflow-hidden rounded-xl border bg-card">
                <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-2 px-5 py-4 transition-colors hover:bg-muted/40 [&::-webkit-details-marker]:hidden">
                  <ChevronRightIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
                  <div className="min-w-0 flex-1 basis-56">
                    <p className="truncate font-display text-lg font-semibold leading-tight">
                      {g.dossier?.chantier ?? "Sans dossier"}
                    </p>
                    {g.dossier && <p className="text-xs text-muted-foreground">{g.dossier.reference}</p>}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    {ouverts > 0 && (
                      <span className="rounded-full bg-amber-500/15 px-2.5 py-1 font-medium text-amber-800">{ouverts} ouvert{ouverts > 1 ? "s" : ""}</span>
                    )}
                    {enCours > 0 && (
                      <span className="rounded-full bg-blue-500/15 px-2.5 py-1 font-medium text-blue-800">{enCours} en cours</span>
                    )}
                  </div>
                  <div className="flex w-44 items-center gap-2.5">
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-emerald-500" style={{ width: `${part}%` }} />
                    </div>
                    <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">
                      {clotures}/{g.lignes.length}
                    </span>
                  </div>
                </summary>
                <ul className="divide-y border-t">
                  {g.lignes.map((e) => (
                    <li key={e.id}>
                      <Link
                        href={`/ecarts/${e.id}`}
                        className="grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3 text-sm transition-colors hover:bg-muted/50 sm:grid-cols-[7.5rem_1fr_auto_6.5rem_5.5rem]"
                      >
                        <span className="font-medium">{e.reference}</span>
                        <span className="truncate text-foreground/80">{e.description || "Sans description"}</span>
                        <span
                          className={cn("size-2.5 rounded-full", POINT_CRITICITE[e.criticite ?? ""] ?? "bg-transparent")}
                          title={e.criticite ? `Criticité ${e.criticite.toLowerCase()}` : undefined}
                        />
                        <span className="hidden sm:block">
                          <BadgeStatut label={STATUT_DOSSIER_ECART_LABELS[e.statut]} ton={TON_STATUT[e.statut]} />
                        </span>
                        <span className="hidden text-right text-xs tabular-nums text-muted-foreground sm:block">
                          {e.dateDetection.toLocaleDateString("fr-FR")}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </details>
            );
          })}
          {ecarts.length === PLAFOND && (
            <p className="text-center text-xs text-muted-foreground">
              Les {PLAFOND} écarts les plus récents sont affichés : affinez la recherche pour voir les autres.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
