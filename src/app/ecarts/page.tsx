import Link from "next/link";
import { ArchiveIcon, ArrowLeftIcon, PlusIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BadgeStatut, type TonStatut } from "@/components/badge-statut";
import { FiltresListe } from "@/components/filtres-liste";
import { Pagination } from "@/components/pagination";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { Origine, StatutDossierEcart } from "@/generated/prisma/enums";
import {
  ORIGINE_LABELS,
  STATUT_DOSSIER_ECART_LABELS,
  NATURES_OPTIONS,
  DOMAINES_OPTIONS,
  THEME_OPTIONS,
} from "@/lib/labels";
import { filtreStatutDossierEcart } from "@/lib/validation";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";
import { construireTri } from "@/lib/tri";
import { EnteteTriable } from "@/components/entete-triable";

const COLONNES_TRI = {
  reference: "reference",
  dossier: "dossier.reference",
  description: "description",
  evenement: "fichesSSE._count",
  statut: "statut",
  dateDetection: "dateDetection",
};

const TON_STATUT: Record<string, TonStatut> = {
  A_QUALIFIER: "neutre",
  OUVERT: "ambre",
  EN_COURS: "bleu",
  CLOTURE: "vert",
};

export default async function EcartsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; origine?: string; page?: string; taille?: string; tri?: string; sens?: string; archives?: string }>;
}) {
  const { q, statut, origine, page: pageParam, taille, tri, sens, archives } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

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
      orderBy: construireTri(tri, sens, COLONNES_TRI, { createdAt: "desc" as const }, ["description"]),
      // Le décompte des évènements plutôt que le drapeau ficheSSECreee : ce
      // dernier reste à true si l'évènement est ensuite détaché ou supprimé.
      // `select` explicite : la liste n'affiche jamais `enregistrement`
      // (photo/PDF en data URL) du dossier, qui serait sinon retéléchargé en
      // entier pour chaque écart, à chaque page — c'est la page la plus
      // consultée de toute l'appli.
      select: {
        id: true,
        reference: true,
        description: true,
        statut: true,
        dateDetection: true,
        dossier: { select: { id: true, reference: true } },
        _count: { select: { fichesSSE: true } },
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
  ]);

  const filtreActif = !!q || !!statut || !!origine;
  const conserves = { tri, sens, taille, archives };
  const paramsEntete = { q, statut, origine, taille };

  return (
    <div className="mx-auto max-w-[100rem] px-6 py-8 lg:px-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {archives === "1" ? "Écarts archivés" : "Écarts"}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {total} écart{total > 1 ? "s" : ""}
            {filtreActif ? " correspondant aux filtres" : archives === "1" ? " archivés" : " au total"}
          </p>
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

      <div className="mb-4">
        <FiltresListe
          basePath="/ecarts"
          placeholder="Rechercher un écart, un chantier, un déclarant…"
          recherche={q ?? ""}
          conserves={conserves}
          filtres={[
            {
              name: "statut",
              valeur: statut ?? "",
              options: [
                { value: "", label: "Tous les statuts" },
                ...Object.values(StatutDossierEcart)
                  .filter((s) => s !== "A_QUALIFIER")
                  .map((s) => ({ value: s, label: STATUT_DOSSIER_ECART_LABELS[s] })),
              ],
            },
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

      <div className="overflow-hidden rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <EnteteTriable colonne="reference" libelle="Référence" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="dossier" libelle="Dossier" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="description" libelle="Description" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="evenement" libelle="Évènement" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="statut" libelle="Statut" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="dateDetection" libelle="Détecté le" triActuel={tri} sensActuel={sens} params={paramsEntete} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ecarts.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <Link href={`/ecarts/${e.id}`} className="font-medium text-foreground underline-offset-4 hover:underline">
                    {e.reference}
                  </Link>
                </TableCell>
                <TableCell>
                  {e.dossier ? (
                    <Link href={`/dossiers/${e.dossier.id}`} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                      {e.dossier.reference}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="max-w-md truncate">{e.description}</TableCell>
                <TableCell>
                  {e._count.fichesSSE > 0 ? (
                    <span className="font-medium">Oui</span>
                  ) : (
                    <span className="text-muted-foreground">Non</span>
                  )}
                </TableCell>
                <TableCell>
                  <BadgeStatut label={STATUT_DOSSIER_ECART_LABELS[e.statut]} ton={TON_STATUT[e.statut]} />
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {e.dateDetection.toLocaleDateString("fr-FR")}
                </TableCell>
              </TableRow>
            ))}
            {ecarts.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  {filtreActif ? "Aucun écart ne correspond à ces filtres." : "Aucun écart pour l'instant."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {total > 0 && (
          <Pagination total={total} page={page} pageSize={taillePage} baseParams={{ q, statut, origine, taille, tri, sens, archives }} />
        )}
      </div>
    </div>
  );
}
