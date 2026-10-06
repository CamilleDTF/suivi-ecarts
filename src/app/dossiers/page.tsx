import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BadgeStatut, type TonStatut } from "@/components/badge-statut";
import { EnteteTriable } from "@/components/entete-triable";
import { FiltresListe } from "@/components/filtres-liste";
import { BoutonArchives, BoutonNouveau, CadreTableau, ConteneurPage, EntetePage } from "@/components/page-liste";
import { Pagination } from "@/components/pagination";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { Origine, StatutDossierEcart } from "@/generated/prisma/enums";
import { ORIGINE_LABELS, STATUT_DOSSIER_ECART_LABELS } from "@/lib/labels";
import { filtreStatutDossierEcart } from "@/lib/validation";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";
import { construireTri } from "@/lib/tri";

const COLONNES_TRI = {
  reference: "reference",
  chantier: "chantier",
  declarant: "declarant",
  origine: "origine",
  statut: "statut",
  dateDetection: "dateDetection",
};

const TON_STATUT: Record<string, TonStatut> = {
  A_QUALIFIER: "neutre",
  OUVERT: "ambre",
  EN_COURS: "bleu",
  CLOTURE: "vert",
};

export default async function DossiersPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    statut?: string;
    origine?: string;
    page?: string;
    taille?: string;
    tri?: string;
    sens?: string;
    archives?: string;
  }>;
}) {
  const { q, statut, origine, page: pageParam, taille, tri, sens, archives } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

  const where = {
    ...filtreArchive(archives),
    statut: filtreStatutDossierEcart(statut),
    origine: origine ? (origine as Origine) : undefined,
    OR: q
      ? [
          { reference: { contains: q, mode: "insensitive" as const } },
          { chantier: { contains: q, mode: "insensitive" as const } },
          { declarant: { contains: q, mode: "insensitive" as const } },
        ]
      : undefined,
  };

  const [total, dossiers] = await Promise.all([
    prisma.dossier.count({ where }),
    prisma.dossier.findMany({
      where,
      orderBy: construireTri(tri, sens, COLONNES_TRI, { createdAt: "desc" as const }),
      // `select` explicite plutôt que `include` : `enregistrement` (photo/PDF en
      // data URL) ne doit jamais être retéléchargé pour toute une liste, alors
      // qu'aucune ligne ne l'affiche.
      select: {
        id: true,
        reference: true,
        chantier: true,
        declarant: true,
        origine: true,
        statut: true,
        dateDetection: true,
        _count: { select: { ecarts: true } },
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
  ]);

  // Écarts restant à traiter par dossier. Prisma ne sait pas renvoyer dans le
  // même _count le total et un sous-total filtré : on compte à part.
  // "Ouvert" au sens du suivi = pas encore clôturé, donc "Ouvert" comme
  // "En cours".
  const ouvertsParDossier = new Map(
    (
      await prisma.ecart.groupBy({
        by: ["dossierId"],
        where: { dossierId: { in: dossiers.map((d) => d.id) }, statut: { not: "CLOTURE" } },
        _count: { _all: true },
      })
    ).map((r) => [r.dossierId, r._count._all]),
  );

  const filtreActif = !!q || !!statut || !!origine;
  const paramsEntete = { q, statut, origine, taille };

  return (
    <ConteneurPage>
      <EntetePage
        titre={archives === "1" ? "Dossiers archivés" : "Dossiers"}
        sousTitre={`${total} dossier${total > 1 ? "s" : ""}${filtreActif ? " correspondant aux filtres" : ""}`}
      >
        <BoutonArchives basePath="/dossiers" archives={archives} params={{ q, statut, origine, taille, tri, sens }} />
        <BoutonNouveau href="/dossiers/nouveau">Nouveau dossier</BoutonNouveau>
      </EntetePage>

      <div className="mb-4">
        <FiltresListe
          basePath="/dossiers"
          placeholder="Rechercher un dossier, un chantier, un déclarant…"
          recherche={q ?? ""}
          conserves={{ tri, sens, taille, archives }}
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

      <CadreTableau>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <EnteteTriable colonne="reference" libelle="Référence" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="chantier" libelle="Chantier" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="declarant" libelle="Déclarant" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="origine" libelle="Origine" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="statut" libelle="Statut" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <TableHead className="text-right">Écarts</TableHead>
              <TableHead className="text-right">Ouverts</TableHead>
              <EnteteTriable colonne="dateDetection" libelle="Détecté le" triActuel={tri} sensActuel={sens} params={paramsEntete} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {dossiers.map((d) => {
              const ouverts = ouvertsParDossier.get(d.id) ?? 0;
              return (
                <TableRow key={d.id}>
                  <TableCell>
                    <Link href={`/dossiers/${d.id}`} className="font-medium underline-offset-4 hover:underline">
                      {d.reference}
                    </Link>
                  </TableCell>
                  <TableCell className="max-w-xs truncate">{d.chantier}</TableCell>
                  <TableCell className="text-muted-foreground">{d.declarant}</TableCell>
                  <TableCell className="text-muted-foreground">{ORIGINE_LABELS[d.origine]}</TableCell>
                  <TableCell>
                    <BadgeStatut label={STATUT_DOSSIER_ECART_LABELS[d.statut]} ton={TON_STATUT[d.statut]} />
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{d._count.ecarts}</TableCell>
                  <TableCell className={`text-right tabular-nums ${ouverts > 0 ? "font-medium" : "text-muted-foreground"}`}>
                    {ouverts}
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {d.dateDetection.toLocaleDateString("fr-FR")}
                  </TableCell>
                </TableRow>
              );
            })}
            {dossiers.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  {filtreActif ? "Aucun dossier ne correspond à ces filtres." : "Aucun dossier pour l'instant."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {total > 0 && (
          <Pagination
            total={total}
            page={page}
            pageSize={taillePage}
            baseParams={{ q, statut, origine, taille, tri, sens, archives }}
          />
        )}
      </CadreTableau>
    </ConteneurPage>
  );
}
