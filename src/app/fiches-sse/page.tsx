import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BadgeStatut, type TonStatut } from "@/components/badge-statut";
import { EnteteTriable } from "@/components/entete-triable";
import { FiltresFichesSSE } from "@/components/filtres-fiches-sse";
import { BoutonArchives, BoutonNouveau, CadreTableau, ConteneurPage, EntetePage } from "@/components/page-liste";
import { Pagination } from "@/components/pagination";
import { Table, TableBody, TableCell, TableHeader, TableRow, TableHead } from "@/components/ui/table";
import { StatutFiche } from "@/generated/prisma/enums";
import {
  STATUT_FICHE_LABELS,
  THEME_OPTIONS,
  DOMAINES_OPTIONS,
  TYPE_EVENEMENT_OPTIONS,
  avecValeursExistantes,
} from "@/lib/labels";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";
import { construireTri } from "@/lib/tri";

const COLONNES_TRI = {
  reference: "reference",
  date: "dateHeure",
  type: "typeEvenement",
  chantier: "nomChantier",
  emetteur: "emetteur",
  statut: "statutFiche",
};

// Colonnes pouvant être vides : sans `nulls: "last"`, trier par date
// décroissante remonterait d'abord les évènements dont la date n'est pas
// saisie.
const COLONNES_NULLABLES = ["date", "type", "chantier", "emetteur"];

const TON_STATUT: Record<string, TonStatut> = {
  EN_COURS: "bleu",
  FINALISEE: "vert",
};

export default async function FichesSSEPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    statut?: string;
    type?: string;
    du?: string;
    au?: string;
    page?: string;
    taille?: string;
    tri?: string;
    sens?: string;
    archives?: string;
  }>;
}) {
  const { q, statut, type, du, au, page: pageParam, taille, tri, sens, archives } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

  // Une date d'URL invalide ("2026-13-45", un paramètre bricolé à la main)
  // donnerait un Invalid Date, que Prisma refuse : le filtre est alors ignoré
  // plutôt que de faire échouer la page.
  const jour = (valeur: string | undefined, fin: boolean) => {
    if (!valeur) return undefined;
    const d = new Date(`${valeur}T${fin ? "23:59:59.999" : "00:00:00.000"}Z`);
    return Number.isNaN(d.getTime()) ? undefined : d;
  };
  const depuis = jour(du, false);
  const jusqua = jour(au, true);

  const optionsCorrespondantes = (options: string[]) =>
    q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : [];
  const themesTrouves = optionsCorrespondantes(THEME_OPTIONS);
  const domainesTrouves = optionsCorrespondantes(DOMAINES_OPTIONS);

  const contient = { contains: q, mode: "insensitive" as const };
  const where = {
    ...filtreArchive(archives),
    statutFiche: statut ? (statut as StatutFiche) : undefined,
    typeEvenement: type || undefined,
    // Une seule des deux bornes suffit : « depuis le… » et « jusqu'au… » sont
    // des filtres à part entière.
    dateHeure: depuis || jusqua ? { gte: depuis, lte: jusqua } : undefined,
    OR: q
      ? [
          { reference: contient },
          { nomChantier: contient },
          { emetteur: contient },
          { numeroInterne: contient },
          { typeEvenement: contient },
          { lieuZone: contient },
          { personnesImpliquees: contient },
          { temoins: contient },
          { descriptionFactuelle: contient },
          { typeAnalyse: contient },
          { criticite: contient },
          { declarationExterneA: contient },
          { referencePreuve: contient },
          { procedureLaquelle: contient },
          { referenceDUERP: contient },
          { miseAJourAutrePrecision: contient },
          { referenceNouveauRisque: contient },
          { typeCommunication: contient },
          { validationNom: contient },
          { validationFonction: contient },
          { causes: { some: { libelle: contient } } },
          // Chercher la référence du parent ramène ses évènements, quel que
          // soit le type de rattachement.
          { ecart: { reference: contient } },
          { ecartAmiante: { reference: contient } },
          { ecartAmiante: { nomChantier: contient } },
          { reclamation: { reference: contient } },
          ...(themesTrouves.length ? [{ theme: { hasSome: themesTrouves } }] : []),
          ...(domainesTrouves.length ? [{ domaine: { hasSome: domainesTrouves } }] : []),
        ]
      : undefined,
  };

  const [total, fiches, typesEnBase] = await Promise.all([
    prisma.ficheSSE.count({ where }),
    prisma.ficheSSE.findMany({
      where,
      orderBy: construireTri(tri, sens, COLONNES_TRI, { createdAt: "desc" as const }, COLONNES_NULLABLES),
      // `select` explicite : la liste n'affiche jamais le dossier de l'écart
      // rattaché, qui embarquerait sinon sa pièce jointe (`enregistrement`) en
      // entier pour chaque évènement.
      select: {
        id: true,
        reference: true,
        dateHeure: true,
        typeEvenement: true,
        nomChantier: true,
        emetteur: true,
        statutFiche: true,
        ecart: { select: { id: true, reference: true } },
        ecartAmiante: { select: { id: true, reference: true } },
        reclamation: { select: { id: true, reference: true } },
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
    // Les types repris de l'Excel ne figurent pas tous dans la liste de saisie :
    // sans eux, les évènements concernés seraient introuvables au filtre.
    prisma.ficheSSE.findMany({ distinct: ["typeEvenement"], select: { typeEvenement: true } }),
  ]);

  const typesProposes = avecValeursExistantes(
    TYPE_EVENEMENT_OPTIONS,
    typesEnBase.map((f) => f.typeEvenement).filter((t): t is string => !!t),
  );

  const filtreActif = !!q || !!statut || !!type || !!du || !!au;
  // Les entêtes de tri et la pagination doivent reconduire les filtres en
  // cours, sinon trier une liste filtrée la déferait.
  const paramsListe = { q, statut, type, du, au, taille, archives };

  return (
    <ConteneurPage>
      <EntetePage
        titre={archives === "1" ? "Évènements SSE archivés" : "Évènements SSE"}
        sousTitre={`${total} évènement${total > 1 ? "s" : ""}${filtreActif ? " correspondant aux filtres" : ""}`}
      >
        <BoutonArchives basePath="/fiches-sse" archives={archives} params={{ q, statut, type, du, au, taille, tri, sens }} />
        <BoutonNouveau href="/fiches-sse/nouveau">Nouvel évènement SSE</BoutonNouveau>
      </EntetePage>

      <div className="mb-4">
        <FiltresFichesSSE
          recherche={q ?? ""}
          statut={statut ?? ""}
          type={type ?? ""}
          du={du ?? ""}
          au={au ?? ""}
          statuts={[
            { value: "", label: "Tous les statuts" },
            ...Object.values(StatutFiche).map((s) => ({ value: s, label: STATUT_FICHE_LABELS[s] })),
          ]}
          types={[{ value: "", label: "Tous les types" }, ...typesProposes.map((t) => ({ value: t, label: t }))]}
          conserves={{ tri, sens, taille, archives }}
        />
      </div>

      <CadreTableau>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <EnteteTriable colonne="reference" libelle="Référence" triActuel={tri} sensActuel={sens} params={paramsListe} />
              <EnteteTriable colonne="date" libelle="Date" triActuel={tri} sensActuel={sens} params={paramsListe} />
              <EnteteTriable colonne="type" libelle="Type d'évènement" triActuel={tri} sensActuel={sens} params={paramsListe} />
              <TableHead>Rattaché à</TableHead>
              <EnteteTriable colonne="chantier" libelle="Chantier" triActuel={tri} sensActuel={sens} params={paramsListe} />
              <EnteteTriable colonne="emetteur" libelle="Émetteur" triActuel={tri} sensActuel={sens} params={paramsListe} />
              <EnteteTriable colonne="statut" libelle="Statut" triActuel={tri} sensActuel={sens} params={paramsListe} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {fiches.map((f) => (
              <TableRow key={f.id}>
                <TableCell>
                  <Link href={`/fiches-sse/${f.id}`} className="font-medium underline-offset-4 hover:underline">
                    {f.reference}
                  </Link>
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {f.dateHeure ? f.dateHeure.toLocaleDateString("fr-FR") : "—"}
                </TableCell>
                <TableCell className="max-w-xs truncate">{f.typeEvenement || "—"}</TableCell>
                <TableCell>
                  {/* Un évènement peut naître d'un écart ou d'un écart amiante :
                      la colonne montrait le premier cas et affichait "Aucun"
                      pour le second, alors que le rattachement existe. */}
                  {f.ecart ? (
                    <Link href={`/ecarts/${f.ecart.id}`} className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
                      {f.ecart.reference}
                    </Link>
                  ) : f.ecartAmiante ? (
                    <Link
                      href={`/ecart-amiante/${f.ecartAmiante.id}`}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {f.ecartAmiante.reference}
                      <span className="ml-1 text-xs">(amiante)</span>
                    </Link>
                  ) : f.reclamation ? (
                    <Link
                      href={`/reclamations/${f.reclamation.id}`}
                      className="text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                    >
                      {f.reclamation.reference}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">Aucun</span>
                  )}
                </TableCell>
                <TableCell className="max-w-xs truncate">{f.nomChantier || "—"}</TableCell>
                <TableCell className="text-muted-foreground">{f.emetteur || "—"}</TableCell>
                <TableCell>
                  <BadgeStatut label={STATUT_FICHE_LABELS[f.statutFiche]} ton={TON_STATUT[f.statutFiche]} />
                </TableCell>
              </TableRow>
            ))}
            {fiches.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                  {filtreActif ? "Aucun évènement ne correspond à ces filtres." : "Aucun évènement SSE pour l'instant."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {total > 0 && (
          <Pagination total={total} page={page} pageSize={taillePage} baseParams={{ ...paramsListe, tri, sens }} />
        )}
      </CadreTableau>
    </ConteneurPage>
  );
}
