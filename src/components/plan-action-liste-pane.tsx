import { prisma } from "@/lib/prisma";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { ListePane, CLASSE_ACTION_PANE, CLASSE_FILTRE_PANE } from "@/components/liste-pane";
import { StatutAction } from "@/generated/prisma/enums";
import { STATUT_ACTION_COLORS, STATUT_ACTION_LABELS, TYPE_ACTION_LABELS, RESPONSABLES } from "@/lib/labels";
import { filtreStatutAction } from "@/lib/validation";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";

export type PlanActionListeSearchParams = {
  q?: string;
  statut?: string;
  responsable?: string;
  page?: string;
  taille?: string;
  archives?: string;
};

/**
 * Panneau de liste du plan d'action, partagé par /plan-action,
 * /plan-action/[id] et /plan-action/nouveau pour donner la vue liste+détail :
 * chaque page fait sa propre requête (searchParams n'est disponible que sur
 * les pages, pas sur un layout partagé), donc ce composant reste un simple
 * serveur component appelé depuis chacune plutôt qu'un layout.
 */
export async function PlanActionListePane({
  searchParams,
  selectedId,
}: {
  searchParams: PlanActionListeSearchParams;
  selectedId?: string;
}) {
  const { q, statut, responsable, page: pageParam, taille, archives } = searchParams;
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
        ]
      : undefined,
  };

  const [total, actions] = await Promise.all([
    prisma.action.count({ where }),
    prisma.action.findMany({
      where,
      orderBy: { echeance: "asc" as const },
      // `select` explicite : le panneau n'affiche aucun rattachement et jamais
      // `preuve` (photo/PDF en data URL), qui serait sinon retéléchargée en
      // entier pour chaque action de la liste.
      select: {
        id: true,
        reference: true,
        type: true,
        action: true,
        responsable: true,
        echeance: true,
        statut: true,
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
  ]);

  const paramsExport = new URLSearchParams();
  if (statut) paramsExport.set("statut", statut);
  if (responsable) paramsExport.set("responsable", responsable);
  const hrefExport = `/plan-action/export${paramsExport.toString() ? `?${paramsExport.toString()}` : ""}`;

  return (
    <ListePane
      titre="Plan d'action"
      basePath="/plan-action"
      nouveau={{ href: "/plan-action/nouveau", label: "+ Nouvelle action" }}
      actions={
        // L'export reprend les filtres statut et responsable de la liste.
        <a href={hrefExport} className={CLASSE_ACTION_PANE}>
          Exporter
        </a>
      }
      recherche={{ valeur: q, placeholder: "Rechercher une action…" }}
      filtres={
        <>
          <SelectAutoSubmit
            name="statut"
            defaultValue={statut ?? ""}
            className={CLASSE_FILTRE_PANE}
            options={[
              { value: "", label: "Statut : Tous" },
              ...Object.values(StatutAction).map((s) => ({ value: s, label: STATUT_ACTION_LABELS[s] })),
            ]}
          />
          <SelectAutoSubmit
            name="responsable"
            defaultValue={responsable ?? ""}
            className={CLASSE_FILTRE_PANE}
            options={[
              { value: "", label: "Responsable : Tous" },
              ...RESPONSABLES.map((r) => ({ value: r, label: r })),
            ]}
          />
        </>
      }
      filtreActif={!!q || !!statut || !!responsable}
      archives={archives}
      paramsConserves={{ q, statut, responsable, taille }}
      lignes={actions.map((a) => ({
        id: a.id,
        reference: a.reference,
        date: a.echeance?.toLocaleDateString("fr-FR"),
        resume: `${a.action} — ${a.responsable}`,
        badges: [
          { label: STATUT_ACTION_LABELS[a.statut], colorClass: STATUT_ACTION_COLORS[a.statut] },
          { label: TYPE_ACTION_LABELS[a.type], colorClass: "bg-slate-100 text-slate-600" },
        ],
      }))}
      selectedId={selectedId}
      messageVide="Aucune action pour l'instant."
      messageVideFiltre="Aucune action ne correspond à ce filtre."
      pagination={{ total, page, pageSize: taillePage, baseParams: { q, statut, responsable, taille, archives } }}
    />
  );
}
