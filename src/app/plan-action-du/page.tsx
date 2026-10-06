import Link from "next/link";
import { DownloadIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { EnteteTriable } from "@/components/entete-triable";
import { FiltresListe } from "@/components/filtres-liste";
import { ListePreuves } from "@/components/liste-preuves";
import { BoutonArchives, BoutonNouveau, CadreTableau, ConteneurPage, EntetePage } from "@/components/page-liste";
import { Pagination } from "@/components/pagination";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RESPONSABLES_DU, TYPES_ACTION_DU, referenceActionDU, avecValeursExistantes } from "@/lib/labels";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";
import { construireTri } from "@/lib/tri";

const COLONNES_TRI = {
  numero: "numero",
  action: "action",
  typeAction: "typeAction",
  responsable: "responsable",
};

// Les mesures du DU sont des phrases entières et plusieurs cellules reviennent
// à la ligne : on aligne tout en haut, avec un peu plus d'air que le défaut.
const CELLULE = "py-3 align-top whitespace-normal";

/**
 * "PA3", "pa 3" ou "3" désignent le numéro 3.
 *
 * Le numéro est stocké en entier, donc une recherche textuelle ne le trouverait
 * jamais : c'est pourtant ainsi qu'on cherche une ligne du DU.
 */
function numeroRecherche(q: string | undefined): number | undefined {
  const m = q?.trim().match(/^(?:pa\s*)?(\d+)$/i);
  return m ? Number(m[1]) : undefined;
}

export default async function PlanActionDUPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    typeAction?: string;
    responsable?: string;
    page?: string;
    taille?: string;
    tri?: string;
    sens?: string;
    archives?: string;
  }>;
}) {
  const { q, typeAction, responsable, page: pageParam, taille, tri, sens, archives } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

  const contient = { contains: q, mode: "insensitive" as const };
  const numero = numeroRecherche(q);
  const where = {
    ...filtreArchive(archives),
    typeAction: typeAction || undefined,
    responsable: responsable || undefined,
    OR: q
      ? [
          { action: contient },
          { risquesConcernes: contient },
          { responsable: contient },
          { preuveRealisation: contient },
          ...(numero ? [{ numero }] : []),
        ]
      : undefined,
  };

  const [total, actions, responsablesUtilises, typesUtilises] = await Promise.all([
    prisma.actionDU.count({ where }),
    prisma.actionDU.findMany({
      where,
      // Par défaut l'ordre du document lui-même : PA1, PA2, PA3…
      orderBy: construireTri(tri, sens, COLONNES_TRI, { numero: "asc" as const }, [
        "typeAction",
        "responsable",
      ]),
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
    // Les valeurs déjà saisies alimentent les filtres : le responsable est un
    // champ libre, une liste figée n'en proposerait qu'une partie.
    prisma.actionDU.findMany({
      where: { responsable: { not: null } },
      distinct: ["responsable"],
      select: { responsable: true },
      orderBy: { responsable: "asc" },
    }),
    prisma.actionDU.findMany({
      where: { typeAction: { not: null } },
      distinct: ["typeAction"],
      select: { typeAction: true },
      orderBy: { typeAction: "asc" },
    }),
  ]);

  const filtreActif = !!q || !!typeAction || !!responsable;
  const params = { q, typeAction, responsable, taille, archives };

  const paramsExport = new URLSearchParams();
  if (typeAction) paramsExport.set("typeAction", typeAction);
  if (responsable) paramsExport.set("responsable", responsable);
  const hrefExport = `/plan-action-du/export${paramsExport.toString() ? `?${paramsExport.toString()}` : ""}`;

  return (
    <ConteneurPage>
      <EntetePage
        titre={archives === "1" ? "Plan d'action DU archivé" : "Plan d'action DU"}
        sousTitre={`${total} action${total > 1 ? "s" : ""}${filtreActif ? " correspondant aux filtres" : ""}. Mesures de prévention du Document Unique : les numéros PA sont ceux auxquels renvoient les fiches de risques.`}
      >
        <BoutonArchives basePath="/plan-action-du" archives={archives} params={{ ...params, tri, sens }} />
        <a href={hrefExport} className={buttonVariants({ variant: "outline", size: "lg" })}>
          <DownloadIcon /> Exporter
        </a>
        <BoutonNouveau href="/plan-action-du/nouveau">Nouvelle action</BoutonNouveau>
      </EntetePage>

      <div className="mb-4">
        <FiltresListe
          basePath="/plan-action-du"
          placeholder="Rechercher (PA3, un risque, une preuve…)"
          recherche={q ?? ""}
          conserves={{ tri, sens, taille, archives }}
          filtres={[
            {
              name: "typeAction",
              valeur: typeAction ?? "",
              options: [
                { value: "", label: "Tous les types" },
                ...avecValeursExistantes(
                  TYPES_ACTION_DU,
                  typesUtilises.map((t) => t.typeAction!),
                ).map((t) => ({ value: t, label: t })),
              ],
            },
            {
              name: "responsable",
              valeur: responsable ?? "",
              options: [
                { value: "", label: "Tous les responsables" },
                ...avecValeursExistantes(
                  RESPONSABLES_DU,
                  responsablesUtilises.map((r) => r.responsable!),
                ).map((r) => ({ value: r, label: r })),
              ],
            },
          ]}
        />
      </div>

      <CadreTableau>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <EnteteTriable colonne="numero" libelle="N°" triActuel={tri} sensActuel={sens} params={params} />
              <EnteteTriable colonne="action" libelle="Action" triActuel={tri} sensActuel={sens} params={params} />
              <TableHead>Risques concernés</TableHead>
              <EnteteTriable
                colonne="typeAction"
                libelle="Type d'action"
                triActuel={tri}
                sensActuel={sens}
                params={params}
              />
              <EnteteTriable
                colonne="responsable"
                libelle="Responsable"
                triActuel={tri}
                sensActuel={sens}
                params={params}
              />
              <TableHead>Preuve de réalisation</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {actions.map((a) => (
              <TableRow key={a.id}>
                <TableCell className={`${CELLULE} whitespace-nowrap`}>
                  <Link href={`/plan-action-du/${a.id}`} className="font-medium underline-offset-4 hover:underline">
                    {referenceActionDU(a.numero)}
                  </Link>
                </TableCell>
                {/* Pas de troncature sur l'action : les mesures du DU sont des
                    phrases entières, et le tableau sert à les relire. */}
                <TableCell className={`${CELLULE} min-w-[22rem]`}>{a.action}</TableCell>
                <TableCell className={`${CELLULE} min-w-[8rem] text-muted-foreground`}>
                  {a.risquesConcernes || "—"}
                </TableCell>
                <TableCell className={`${CELLULE} whitespace-nowrap text-muted-foreground`}>
                  {a.typeAction || "—"}
                </TableCell>
                <TableCell className={`${CELLULE} min-w-[9rem] text-muted-foreground`}>
                  {a.responsable || "—"}
                </TableCell>
                <TableCell className={`${CELLULE} min-w-[10rem] text-muted-foreground`}>
                  {/* ListePreuves colore son tiret en gris ardoise : on gère le
                      cas vide ici pour rester sur la palette de la refonte. */}
                  {a.preuveRealisation?.trim() ? <ListePreuves valeur={a.preuveRealisation} /> : "—"}
                </TableCell>
              </TableRow>
            ))}
            {actions.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  {filtreActif ? "Aucune action ne correspond à ces filtres." : "Aucune action pour l'instant."}
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
            baseParams={{ ...params, tri, sens }}
          />
        )}
      </CadreTableau>
    </ConteneurPage>
  );
}
