import { prisma } from "@/lib/prisma";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { ListePane, CLASSE_FILTRE_PANE } from "@/components/liste-pane";
import { Origine, StatutDossierEcart } from "@/generated/prisma/enums";
import {
  ORIGINE_LABELS,
  STATUT_DOSSIER_ECART_COLORS,
  STATUT_DOSSIER_ECART_LABELS,
  NATURES_OPTIONS,
  DOMAINES_OPTIONS,
  THEME_OPTIONS,
} from "@/lib/labels";
import { filtreStatutDossierEcart } from "@/lib/validation";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";

export type EcartsListeSearchParams = {
  q?: string;
  statut?: string;
  origine?: string;
  page?: string;
  taille?: string;
  archives?: string;
};

/**
 * Panneau de liste des écarts, partagé par /ecarts, /ecarts/[id] et
 * /ecarts/nouveau pour donner la vue liste+détail : chaque page fait sa
 * propre requête (searchParams n'est disponible que sur les pages, pas sur
 * un layout partagé), donc ce composant reste un simple serveur component
 * appelé depuis chacune plutôt qu'un layout.
 */
export async function EcartsListePane({
  searchParams,
  selectedId,
}: {
  searchParams: EcartsListeSearchParams;
  selectedId?: string;
}) {
  const { q, statut, origine, page: pageParam, taille, archives } = searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

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
      orderBy: { dateDetection: "desc" as const },
      // `select` explicite : le panneau n'affiche que le chantier du dossier,
      // jamais sa pièce jointe (`enregistrement`, photo/PDF en data URL), qui
      // serait sinon retéléchargée en entier pour chaque écart de la liste.
      select: {
        id: true,
        reference: true,
        dateDetection: true,
        description: true,
        statut: true,
        dossier: { select: { chantier: true } },
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
  ]);

  return (
    <ListePane
      titre="Écarts"
      basePath="/ecarts"
      nouveau={{ href: "/ecarts/nouveau", label: "+ Nouvel écart" }}
      recherche={{ valeur: q, placeholder: "Rechercher un écart…" }}
      filtres={
        <>
          <SelectAutoSubmit
            name="statut"
            defaultValue={statut ?? ""}
            className={CLASSE_FILTRE_PANE}
            options={[
              { value: "", label: "Statut : Tous" },
              ...Object.values(StatutDossierEcart)
                .filter((s) => s !== "A_QUALIFIER")
                .map((s) => ({ value: s, label: STATUT_DOSSIER_ECART_LABELS[s] })),
            ]}
          />
          <SelectAutoSubmit
            name="origine"
            defaultValue={origine ?? ""}
            className={CLASSE_FILTRE_PANE}
            options={[
              { value: "", label: "Origine : Toutes" },
              ...Object.values(Origine).map((o) => ({ value: o, label: ORIGINE_LABELS[o] })),
            ]}
          />
        </>
      }
      filtreActif={!!q || !!statut || !!origine}
      archives={archives}
      paramsConserves={{ q, statut, origine, taille }}
      lignes={ecarts.map((e) => ({
        id: e.id,
        reference: e.reference,
        date: e.dateDetection.toLocaleDateString("fr-FR"),
        resume: `${e.dossier?.chantier ?? "—"} — ${e.description}`,
        badges: [{ label: STATUT_DOSSIER_ECART_LABELS[e.statut], colorClass: STATUT_DOSSIER_ECART_COLORS[e.statut] }],
      }))}
      selectedId={selectedId}
      messageVide="Aucun écart pour l'instant."
      messageVideFiltre="Aucun écart ne correspond à ce filtre."
      pagination={{ total, page, pageSize: taillePage, baseParams: { q, statut, origine, taille, archives } }}
    />
  );
}
