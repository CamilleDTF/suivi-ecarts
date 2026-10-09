import Link from "next/link";
import { DownloadIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BadgeStatut, type TonStatut } from "@/components/badge-statut";
import { EnteteTriable } from "@/components/entete-triable";
import { FiltresListe } from "@/components/filtres-liste";
import { BoutonArchives, BoutonNouveau, CadreTableau, ConteneurPage, EntetePage } from "@/components/page-liste";
import { Pagination } from "@/components/pagination";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatutAction } from "@/generated/prisma/enums";
import { STATUT_ACTION_LABELS, TYPE_ACTION_LABELS, RESPONSABLES } from "@/lib/labels";
import { filtreStatutAction } from "@/lib/validation";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";
import { construireTri } from "@/lib/tri";

const COLONNES_TRI = {
  reference: "reference",
  type: "type",
  action: "action",
  responsable: "responsable",
  echeance: "echeance",
  statut: "statut",
};

const TON_STATUT: Record<string, TonStatut> = {
  A_FAIRE: "neutre",
  EN_COURS: "bleu",
  EN_RETARD: "rouge",
  REALISEE: "vert",
  ANNULEE: "neutre",
};

const LIEN_RATTACHEMENT = "text-muted-foreground underline-offset-4 hover:text-foreground hover:underline";

export default async function PlanActionPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    statut?: string;
    responsable?: string;
    page?: string;
    taille?: string;
    tri?: string;
    sens?: string;
    archives?: string;
  }>;
}) {
  const { q, statut, responsable, page: pageParam, taille, tri, sens, archives } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

  const contient = { contains: q, mode: "insensitive" as const };
  const where = {
    ...filtreArchive(archives),
    statut: filtreStatutAction(statut),
    responsable: responsable || undefined,
    OR: q
      ? [
          { reference: contient },
          { action: contient },
          { responsable: contient },
          { origine: contient },
          { ecarts: { some: { reference: contient } } },
          { ecarts: { some: { description: contient } } },
          { ecarts: { some: { dossier: { chantier: contient } } } },
          { ficheSSE: { reference: contient } },
          { ecartAmiante: { reference: contient } },
          { ecartAmiante: { nomChantier: contient } },
          { remontee: { reference: contient } },
          { remontee: { objet: contient } },
          { rex: { reference: contient } },
          { rex: { titre: contient } },
          { reclamation: { reference: contient } },
          { reclamation: { objet: contient } },
        ]
      : undefined,
  };

  const [total, actions] = await Promise.all([
    prisma.action.count({ where }),
    prisma.action.findMany({
      where,
      orderBy: construireTri(tri, sens, COLONNES_TRI, { echeance: "asc" as const }, ["echeance"]),
      // `select` explicite : la liste n'affiche que la référence de chaque
      // rattachement, jamais `preuve` (photo/PDF en data URL) ni le dossier de
      // l'écart lié — les deux seraient sinon retéléchargés en entier pour
      // chaque action, à chaque page.
      select: {
        id: true,
        reference: true,
        type: true,
        action: true,
        responsable: true,
        echeance: true,
        statut: true,
        ecarts: { select: { id: true, reference: true } },
        ficheSSE: { select: { id: true, reference: true } },
        ecartAmiante: { select: { id: true, reference: true } },
        remontee: { select: { id: true, reference: true } },
        rex: { select: { id: true, reference: true } },
        reclamation: { select: { id: true, reference: true } },
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
  ]);

  const filtreActif = !!q || !!statut || !!responsable;
  const paramsEntete = { q, statut, responsable, taille, archives };

  // Un responsable passé dans l'URL mais absent de la liste (ancienne valeur)
  // reste affiché dans le filtre plutôt que de le laisser vide.
  const responsables = !responsable || RESPONSABLES.includes(responsable) ? RESPONSABLES : [responsable, ...RESPONSABLES];

  const paramsExport = new URLSearchParams();
  if (statut) paramsExport.set("statut", statut);
  if (responsable) paramsExport.set("responsable", responsable);
  const hrefExport = `/plan-action/export${paramsExport.toString() ? `?${paramsExport.toString()}` : ""}`;

  return (
    <ConteneurPage>
      <EntetePage
        titre={archives === "1" ? "Plan d'action archivé" : "Plan d'action"}
        sousTitre={`${total} action${total > 1 ? "s" : ""}${filtreActif ? " correspondant aux filtres" : ""}`}
      >
        <BoutonArchives basePath="/plan-action" archives={archives} params={{ q, statut, responsable, taille, tri, sens }} />
        <a href={hrefExport} className={buttonVariants({ variant: "outline", size: "lg" })}>
          <DownloadIcon /> Exporter
        </a>
        <BoutonNouveau href="/plan-action/nouveau">Nouvelle action</BoutonNouveau>
      </EntetePage>

      <div className="mb-4">
        <FiltresListe
          basePath="/plan-action"
          placeholder="Rechercher une action, un responsable, un rattachement…"
          recherche={q ?? ""}
          conserves={{ tri, sens, taille, archives }}
          filtres={[
            {
              name: "statut",
              valeur: statut ?? "",
              options: [
                { value: "", label: "Tous les statuts" },
                ...Object.values(StatutAction).map((s) => ({ value: s, label: STATUT_ACTION_LABELS[s] })),
              ],
            },
            {
              name: "responsable",
              valeur: responsable ?? "",
              options: [{ value: "", label: "Tous les responsables" }, ...responsables.map((r) => ({ value: r, label: r }))],
            },
          ]}
        />
      </div>

      <CadreTableau>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <EnteteTriable colonne="reference" libelle="Référence" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <TableHead>Rattaché à</TableHead>
              <EnteteTriable colonne="type" libelle="Type" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="action" libelle="Action" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="responsable" libelle="Responsable" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="echeance" libelle="Échéance" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="statut" libelle="Statut" triActuel={tri} sensActuel={sens} params={paramsEntete} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {actions.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link href={`/plan-action/${a.id}`} className="font-medium underline-offset-4 hover:underline">
                    {a.reference}
                  </Link>
                </TableCell>
                <TableCell>
                  {a.ecarts.length > 0 ? (
                    // Plusieurs écarts : tous listés, chacun cliquable. En
                    // afficher un seul laisserait croire à un rattachement
                    // unique.
                    <span className="flex max-w-56 flex-wrap gap-x-2 gap-y-0.5">
                      {a.ecarts.map((e) => (
                        <Link key={e.id} href={`/ecarts/${e.id}`} title="Écart" className={LIEN_RATTACHEMENT}>
                          {e.reference}
                        </Link>
                      ))}
                    </span>
                  ) : a.ficheSSE ? (
                    <Link href={`/fiches-sse/${a.ficheSSE.id}`} title="Évènement SSE" className={LIEN_RATTACHEMENT}>
                      {a.ficheSSE.reference}
                    </Link>
                  ) : a.ecartAmiante ? (
                    <Link href={`/ecart-amiante/${a.ecartAmiante.id}`} title="Écart amiante" className={LIEN_RATTACHEMENT}>
                      {a.ecartAmiante.reference}
                    </Link>
                  ) : a.remontee ? (
                    <Link href={`/remontees/${a.remontee.id}`} title="Remontée" className={LIEN_RATTACHEMENT}>
                      {a.remontee.reference}
                    </Link>
                  ) : a.rex ? (
                    <Link href={`/rex/${a.rex.id}`} title="REX" className={LIEN_RATTACHEMENT}>
                      {a.rex.reference}
                    </Link>
                  ) : a.reclamation ? (
                    <Link href={`/reclamations/${a.reclamation.id}`} title="Réclamation" className={LIEN_RATTACHEMENT}>
                      {a.reclamation.reference}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{TYPE_ACTION_LABELS[a.type]}</TableCell>
                <TableCell className="max-w-sm truncate" title={a.action}>
                  {a.action}
                </TableCell>
                <TableCell className="text-muted-foreground">{a.responsable}</TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {a.echeance ? a.echeance.toLocaleDateString("fr-FR") : "—"}
                </TableCell>
                <TableCell>
                  <BadgeStatut label={STATUT_ACTION_LABELS[a.statut]} ton={TON_STATUT[a.statut]} />
                </TableCell>
              </TableRow>
            ))}
            {actions.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
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
            baseParams={{ q, statut, responsable, taille, tri, sens, archives }}
          />
        )}
      </CadreTableau>
    </ConteneurPage>
  );
}
