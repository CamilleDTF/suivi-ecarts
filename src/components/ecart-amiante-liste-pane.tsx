import { prisma } from "@/lib/prisma";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { ListePane, CLASSE_FILTRE_PANE } from "@/components/liste-pane";
import { STATUT_DOSSIER_ECART_LABELS, STATUT_DOSSIER_ECART_COLORS } from "@/lib/labels";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";

export type EcartAmianteListeSearchParams = {
  q?: string;
  onglet?: string;
  periode?: string;
  page?: string;
  taille?: string;
  archives?: string;
};

const PERIODE_OPTIONS = [
  { value: "", label: "Période : Toutes" },
  { value: "7j", label: "7 derniers jours" },
  { value: "30j", label: "30 derniers jours" },
  { value: "annee", label: "Cette année" },
];

function dateDebutPeriode(periode: string | undefined): Date | undefined {
  const maintenant = new Date();
  if (periode === "7j") return new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (periode === "30j") return new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (periode === "annee") return new Date(maintenant.getFullYear(), 0, 1);
  return undefined;
}

/**
 * Panneau de liste des écarts amiante, partagé par /ecart-amiante,
 * /ecart-amiante/[id] et /ecart-amiante/nouveau pour la vue liste+détail :
 * chaque page résout ses searchParams et appelle ce composant serveur, un
 * layout partagé n'y ayant pas accès.
 */
export async function EcartAmianteListePane({
  searchParams,
  selectedId,
}: {
  searchParams: EcartAmianteListeSearchParams;
  selectedId?: string;
}) {
  const { q, onglet, periode, page: pageParam, taille, archives } = searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);
  const debutPeriode = dateDebutPeriode(periode);

  const contient = { contains: q, mode: "insensitive" as const };
  const whereBase = {
    date: debutPeriode ? { gte: debutPeriode } : undefined,
    OR: q
      ? [
          { reference: contient },
          { nomChantier: contient },
          { numeroChantier: contient },
          { conducteur: contient },
          { chef: contient },
          { zone: contient },
          { processus: contient },
          { typeAnalyse: contient },
          { referenceAnalyse: contient },
          { typeEcart: contient },
          { resultatAttendu: contient },
          { resultatObtenu: contient },
          { description: contient },
          { personneConcernee: contient },
          { pasNouvelleAnalyse: contient },
          { laboratoireNouvelleAnalyse: contient },
          { chantierNouvelleAnalyse: contient },
          { resultatAttenduNouvelleAnalyse: contient },
          { resultatObtenuNouvelleAnalyse: contient },
          { cause: contient },
        ]
      : undefined,
  };

  const whereOnglet =
    onglet === "ouverts"
      ? { statut: "OUVERT" as const }
      : onglet === "en_cours"
        ? { statut: "EN_COURS" as const }
        : onglet === "clotures"
          ? { statut: "CLOTURE" as const }
          : {};

  const where = { ...filtreArchive(archives), ...whereBase, ...whereOnglet };

  const [total, ecarts, totalTous, totalOuverts, totalEnCours, totalClotures] = await Promise.all([
    prisma.ecartAmiante.count({ where }),
    prisma.ecartAmiante.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        reference: true,
        date: true,
        nomChantier: true,
        numeroChantier: true,
        conducteur: true,
        statut: true,
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
    prisma.ecartAmiante.count({ where: whereBase }),
    prisma.ecartAmiante.count({ where: { ...whereBase, statut: "OUVERT" } }),
    prisma.ecartAmiante.count({ where: { ...whereBase, statut: "EN_COURS" } }),
    prisma.ecartAmiante.count({ where: { ...whereBase, statut: "CLOTURE" } }),
  ]);

  // Les anciens onglets deviennent un filtre de statut, avec leurs compteurs.
  const ongletActif = onglet && ["ouverts", "en_cours", "clotures"].includes(onglet) ? onglet : undefined;

  return (
    <ListePane
      titre="Écarts amiante"
      basePath="/ecart-amiante"
      nouveau={{ href: "/ecart-amiante/nouveau", label: "+ Nouvel écart amiante" }}
      recherche={{ valeur: q, placeholder: "Rechercher un écart amiante…" }}
      filtres={
        <>
          <SelectAutoSubmit
            name="onglet"
            defaultValue={ongletActif ?? ""}
            className={CLASSE_FILTRE_PANE}
            options={[
              { value: "", label: `Statut : Tous (${totalTous})` },
              { value: "ouverts", label: `Ouverts (${totalOuverts})` },
              { value: "en_cours", label: `En cours (${totalEnCours})` },
              { value: "clotures", label: `Clôturés (${totalClotures})` },
            ]}
          />
          <SelectAutoSubmit
            name="periode"
            defaultValue={periode ?? ""}
            className={CLASSE_FILTRE_PANE}
            options={PERIODE_OPTIONS}
          />
        </>
      }
      filtreActif={!!q || !!periode || !!ongletActif}
      archives={archives}
      paramsConserves={{ q, onglet: ongletActif, periode, taille }}
      lignes={ecarts.map((e) => ({
        id: e.id,
        reference: e.reference,
        date: e.date.toLocaleDateString("fr-FR"),
        resume: `${e.nomChantier} (${e.numeroChantier}) — ${e.conducteur}`,
        badges: [{ label: STATUT_DOSSIER_ECART_LABELS[e.statut], colorClass: STATUT_DOSSIER_ECART_COLORS[e.statut] }],
      }))}
      selectedId={selectedId}
      messageVide="Aucun écart amiante pour l'instant."
      messageVideFiltre="Aucun écart amiante ne correspond à ce filtre."
      pagination={{
        total,
        page,
        pageSize: taillePage,
        baseParams: { q, onglet: ongletActif, periode, taille, archives },
      }}
    />
  );
}
