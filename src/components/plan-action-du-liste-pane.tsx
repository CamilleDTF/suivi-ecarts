import { prisma } from "@/lib/prisma";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { ListePane, CLASSE_ACTION_PANE, CLASSE_FILTRE_PANE } from "@/components/liste-pane";
import { RESPONSABLES_DU, TYPES_ACTION_DU, referenceActionDU, avecValeursExistantes } from "@/lib/labels";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";

export type PlanActionDUListeSearchParams = {
  q?: string;
  typeAction?: string;
  responsable?: string;
  page?: string;
  taille?: string;
  archives?: string;
};

const COULEUR_NEUTRE = "bg-slate-100 text-slate-700";

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

/**
 * Panneau de liste du plan d'action DU, partagé par /plan-action-du,
 * /plan-action-du/[id] et /plan-action-du/nouveau : chaque page le rend avec
 * ses propres searchParams (indisponibles sur un layout partagé).
 */
export async function PlanActionDUListePane({
  searchParams,
  selectedId,
}: {
  searchParams: PlanActionDUListeSearchParams;
  selectedId?: string;
}) {
  const { q, typeAction, responsable, page: pageParam, taille, archives } = searchParams;
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
      // L'ordre du document lui-même : PA1, PA2, PA3…
      orderBy: { numero: "asc" as const },
      select: { id: true, numero: true, action: true, typeAction: true, responsable: true },
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

  // L'export reprend les filtres de type et de responsable de la liste.
  const paramsExport = new URLSearchParams();
  if (typeAction) paramsExport.set("typeAction", typeAction);
  if (responsable) paramsExport.set("responsable", responsable);
  const hrefExport = `/plan-action-du/export${paramsExport.toString() ? `?${paramsExport.toString()}` : ""}`;

  return (
    <ListePane
      titre="Plan d'action DU"
      basePath="/plan-action-du"
      nouveau={{ href: "/plan-action-du/nouveau", label: "+ Nouvelle action" }}
      actions={
        <a href={hrefExport} className={CLASSE_ACTION_PANE}>
          Exporter
        </a>
      }
      recherche={{ valeur: q, placeholder: "Rechercher (PA3, un risque, une preuve…)" }}
      filtres={
        <>
          <SelectAutoSubmit
            name="typeAction"
            defaultValue={typeAction ?? ""}
            className={CLASSE_FILTRE_PANE}
            options={[
              { value: "", label: "Type : Tous" },
              ...avecValeursExistantes(
                TYPES_ACTION_DU,
                typesUtilises.map((t) => t.typeAction!),
              ).map((t) => ({ value: t, label: t })),
            ]}
          />
          <SelectAutoSubmit
            name="responsable"
            defaultValue={responsable ?? ""}
            className={CLASSE_FILTRE_PANE}
            options={[
              { value: "", label: "Responsable : Tous" },
              ...avecValeursExistantes(
                RESPONSABLES_DU,
                responsablesUtilises.map((r) => r.responsable!),
              ).map((r) => ({ value: r, label: r })),
            ]}
          />
        </>
      }
      filtreActif={!!q || !!typeAction || !!responsable}
      archives={archives}
      paramsConserves={{ q, typeAction, responsable, taille }}
      lignes={actions.map((a) => ({
        id: a.id,
        reference: referenceActionDU(a.numero),
        resume: a.action,
        badges: [a.typeAction, a.responsable]
          .filter((v): v is string => !!v)
          .map((label) => ({ label, colorClass: COULEUR_NEUTRE })),
      }))}
      selectedId={selectedId}
      messageVide="Aucune action pour l'instant."
      messageVideFiltre="Aucune action ne correspond à ce filtre."
      pagination={{ total, page, pageSize: taillePage, baseParams: { q, typeAction, responsable, taille, archives } }}
    />
  );
}
