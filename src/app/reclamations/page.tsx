import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BadgeStatut, type TonStatut } from "@/components/badge-statut";
import { EnteteTriable } from "@/components/entete-triable";
import { FiltresListe } from "@/components/filtres-liste";
import { BoutonArchives, BoutonNouveau, CadreTableau, ConteneurPage, EntetePage } from "@/components/page-liste";
import { Pagination } from "@/components/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatutReclamation, TypeReclamation } from "@/generated/prisma/enums";
import { STATUT_RECLAMATION_LABELS, TYPE_RECLAMATION_LABELS } from "@/lib/labels";
import { filtreStatutReclamation } from "@/lib/validation";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";
import { construireTri } from "@/lib/tri";
import { criticiteMax } from "@/lib/reclamations";
import { cn } from "@/lib/utils";

const COLONNES_TRI = {
  date: "dateReception",
};

const TON_STATUT: Record<string, TonStatut> = {
  OUVERTE: "ambre",
  EN_COURS: "bleu",
  CLOTUREE: "vert",
};
const TON_CRITICITE: Record<string, TonStatut> = { Faible: "vert", Moyenne: "ambre", Élevée: "rouge" };

const TUILES = [
  { statut: "OUVERTE", label: "Ouvertes", point: "bg-amber-500" },
  { statut: "EN_COURS", label: "En cours", point: "bg-blue-500" },
  { statut: "CLOTUREE", label: "Clôturées", point: "bg-emerald-500" },
] as const;

export default async function ReclamationsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    statut?: string;
    type?: string;
    chantier?: string;
    reponse?: string;
    page?: string;
    taille?: string;
    archives?: string;
    tri?: string;
    sens?: string;
  }>;
}) {
  const { q, statut, type, chantier, reponse, page: pageParam, taille, archives, tri, sens } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

  const contient = { contains: q, mode: "insensitive" as const };
  // Tout sauf le statut : les tuiles comptent par statut sur ce périmètre.
  const base = {
    ...filtreArchive(archives),
    type: type && type in TypeReclamation ? (type as TypeReclamation) : undefined,
    chantier: chantier || undefined,
    // « Sans réponse » : ce que le plaignant attend encore.
    dateReponse: reponse === "attente" ? null : undefined,
    OR: q
      ? [
          { reference: contient },
          { objet: contient },
          { description: contient },
          { emetteur: contient },
          { chantier: contient },
          { analyse: contient },
          { reponse: contient },
          { points: { some: { description: contient } } },
        ]
      : undefined,
  };
  const where = { ...base, statut: filtreStatutReclamation(statut) };

  const [total, reclamations, parStatut, sansReponse, chantiers] = await Promise.all([
    prisma.reclamation.count({ where }),
    prisma.reclamation.findMany({
      where,
      orderBy: construireTri(tri, sens, COLONNES_TRI, { dateReception: "desc" as const }),
      // `select` : jamais `enregistrement` (le courrier en data URL).
      select: {
        id: true,
        reference: true,
        type: true,
        dateReception: true,
        emetteur: true,
        chantier: true,
        objet: true,
        dateReponse: true,
        statut: true,
        points: { select: { criticite: true } },
        _count: { select: { actions: true } },
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
    prisma.reclamation.groupBy({ by: ["statut"], where: base, _count: { _all: true } }),
    prisma.reclamation.count({ where: { ...filtreArchive(archives), dateReponse: null } }),
    prisma.reclamation.findMany({
      where: { chantier: { not: null } },
      distinct: ["chantier"],
      select: { chantier: true },
      orderBy: { chantier: "asc" },
    }),
  ]);

  const compte = Object.fromEntries(parStatut.map((s) => [s.statut, s._count._all]));
  const filtreActif = !!q || !!statut || !!type || !!chantier || !!reponse;
  const baseParams = { q, statut, type, chantier, reponse, taille, tri, sens, archives };
  const paramsEntete = { q, statut, type, chantier, reponse, taille, archives };

  // Un second clic sur la tuile active retire le filtre.
  const lienTuile = (valeurs: { statut?: string; reponse?: string }) => ({
    pathname: "/reclamations",
    query: Object.fromEntries(
      Object.entries({ q, statut, type, chantier, reponse, taille, tri, sens, archives, ...valeurs }).filter(([, v]) => v),
    ),
  });

  return (
    <ConteneurPage>
      <EntetePage
        titre={archives === "1" ? "Réclamations archivées" : "Plaintes et réclamations"}
        sousTitre={`Ce que les clients, maîtres d’ouvrage ou riverains nous reprochent · ${total} réclamation${total > 1 ? "s" : ""}${filtreActif ? " correspondant aux filtres" : ""}`}
      >
        <BoutonArchives
          basePath="/reclamations"
          archives={archives}
          params={{ q, statut, type, chantier, reponse, taille, tri, sens }}
        />
        <BoutonNouveau href="/reclamations/nouveau">Nouvelle réclamation</BoutonNouveau>
      </EntetePage>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TUILES.map((t) => {
          const actif = statut === t.statut;
          return (
            <Link
              key={t.statut}
              href={lienTuile({ statut: actif ? undefined : t.statut })}
              aria-current={actif ? "true" : undefined}
              className={cn(
                "rounded-xl border bg-card px-4 py-3 transition-all hover:border-primary/40",
                actif && "border-primary ring-2 ring-primary/15",
              )}
            >
              <p className="text-3xl font-semibold tabular-nums">{compte[t.statut] ?? 0}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className={cn("size-2 shrink-0 rounded-full", t.point)} aria-hidden />
                {t.label}
              </p>
            </Link>
          );
        })}
        <Link
          href={lienTuile({ reponse: reponse === "attente" ? undefined : "attente" })}
          aria-current={reponse === "attente" ? "true" : undefined}
          className={cn(
            "rounded-xl border bg-card px-4 py-3 transition-all hover:border-primary/40",
            reponse === "attente" && "border-primary ring-2 ring-primary/15",
          )}
        >
          <p className="text-3xl font-semibold tabular-nums">{sansReponse}</p>
          <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="size-2 shrink-0 rounded-full bg-red-500" aria-hidden />
            En attente de réponse
          </p>
        </Link>
      </div>

      <div className="mb-4">
        <FiltresListe
          basePath="/reclamations"
          placeholder="Rechercher une réclamation, un émetteur, un chantier…"
          recherche={q ?? ""}
          conserves={{ tri, sens, taille, archives, reponse }}
          filtres={[
            {
              name: "type",
              valeur: type ?? "",
              options: [
                { value: "", label: "Plaintes et réclamations" },
                ...Object.values(TypeReclamation).map((t) => ({ value: t, label: TYPE_RECLAMATION_LABELS[t] })),
              ],
            },
            {
              name: "statut",
              valeur: statut ?? "",
              options: [
                { value: "", label: "Tous les statuts" },
                ...Object.values(StatutReclamation).map((s) => ({ value: s, label: STATUT_RECLAMATION_LABELS[s] })),
              ],
            },
            {
              name: "chantier",
              valeur: chantier ?? "",
              options: [
                { value: "", label: "Tous les chantiers" },
                ...chantiers.map((c) => ({ value: c.chantier!, label: c.chantier! })),
              ],
            },
          ]}
        />
      </div>

      <CadreTableau>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Référence</TableHead>
              <EnteteTriable colonne="date" libelle="Reçue le" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <TableHead>Émetteur</TableHead>
              <TableHead>Chantier</TableHead>
              <TableHead className="w-full">Objet</TableHead>
              <TableHead>Criticité</TableHead>
              <TableHead>Réponse</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reclamations.map((r) => {
              const criticite = criticiteMax(r.points);
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/reclamations/${r.id}`} className="font-medium underline-offset-4 hover:underline">
                      {r.reference}
                    </Link>
                    {r.type === "PLAINTE" && (
                      <span className="mt-0.5 block text-xs text-muted-foreground">{TYPE_RECLAMATION_LABELS[r.type]}</span>
                    )}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {r.dateReception.toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate" title={r.emetteur}>
                    {r.emetteur}
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate text-muted-foreground" title={r.chantier ?? undefined}>
                    {r.chantier || "—"}
                  </TableCell>
                  <TableCell className="w-full min-w-[12rem] max-w-0" title={r.objet}>
                    <span className="block truncate">{r.objet}</span>
                    <span className="block text-xs text-muted-foreground">
                      {r.points.length} point{r.points.length > 1 ? "s" : ""} · {r._count.actions} action
                      {r._count.actions > 1 ? "s" : ""}
                    </span>
                  </TableCell>
                  <TableCell>
                    {criticite ? (
                      <BadgeStatut label={criticite} ton={TON_CRITICITE[criticite] ?? "neutre"} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap tabular-nums">
                    {r.dateReponse ? (
                      <span className="text-muted-foreground">{r.dateReponse.toLocaleDateString("fr-FR")}</span>
                    ) : (
                      <span className="text-red-700">En attente</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <BadgeStatut label={STATUT_RECLAMATION_LABELS[r.statut]} ton={TON_STATUT[r.statut]} />
                  </TableCell>
                </TableRow>
              );
            })}
            {reclamations.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  {filtreActif ? "Aucune réclamation ne correspond à ces filtres." : "Aucune réclamation pour l’instant."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {total > 0 && <Pagination total={total} page={page} pageSize={taillePage} baseParams={baseParams} />}
      </CadreTableau>
    </ConteneurPage>
  );
}
