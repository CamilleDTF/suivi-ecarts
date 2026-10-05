import { prisma } from "@/lib/prisma";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { ListePane, CLASSE_FILTRE_PANE } from "@/components/liste-pane";
import { Origine, StatutDossierEcart } from "@/generated/prisma/enums";
import { ORIGINE_LABELS, STATUT_DOSSIER_ECART_COLORS, STATUT_DOSSIER_ECART_LABELS } from "@/lib/labels";
import { filtreStatutDossierEcart } from "@/lib/validation";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";

export type DossiersListeSearchParams = {
  q?: string;
  statut?: string;
  origine?: string;
  page?: string;
  taille?: string;
  archives?: string;
};

/**
 * Panneau de liste des dossiers, partagé par /dossiers, /dossiers/[id] et
 * /dossiers/nouveau pour donner la vue liste+détail : chaque page fait sa
 * propre requête (searchParams n'est disponible que sur les pages, pas sur
 * un layout partagé), donc ce composant reste un simple serveur component
 * appelé depuis chacune plutôt qu'un layout.
 */
export async function DossiersListePane({
  searchParams,
  selectedId,
}: {
  searchParams: DossiersListeSearchParams;
  selectedId?: string;
}) {
  const { q, statut, origine, page: pageParam, taille, archives } = searchParams;
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
      orderBy: { createdAt: "desc" as const },
      // `select` explicite plutôt que `include` : `enregistrement` (photo/PDF en
      // data URL) ne doit jamais être retéléchargé pour toute une liste, alors
      // qu'aucune ligne ne l'affiche.
      select: {
        id: true,
        reference: true,
        chantier: true,
        declarant: true,
        statut: true,
        dateDetection: true,
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
  ]);

  // Écarts restant à traiter par dossier. "Ouvert" au sens du suivi = pas
  // encore clôturé, donc "Ouvert" comme "En cours".
  const ouvertsParDossier = new Map(
    (
      await prisma.ecart.groupBy({
        by: ["dossierId"],
        where: { dossierId: { in: dossiers.map((d) => d.id) }, statut: { not: "CLOTURE" } },
        _count: { _all: true },
      })
    ).map((r) => [r.dossierId, r._count._all]),
  );

  return (
    <ListePane
      titre="Dossiers"
      basePath="/dossiers"
      nouveau={{ href: "/dossiers/nouveau", label: "+ Nouveau dossier" }}
      recherche={{ valeur: q, placeholder: "Rechercher un dossier…" }}
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
      lignes={dossiers.map((d) => {
        const ouverts = ouvertsParDossier.get(d.id) ?? 0;
        const s = ouverts > 1 ? "s" : "";
        return {
          id: d.id,
          reference: d.reference,
          date: d.dateDetection.toLocaleDateString("fr-FR"),
          resume: `${d.chantier} — ${d.declarant}`,
          badges: [
            { label: STATUT_DOSSIER_ECART_LABELS[d.statut], colorClass: STATUT_DOSSIER_ECART_COLORS[d.statut] },
            ...(ouverts > 0
              ? [{ label: `${ouverts} écart${s} ouvert${s}`, colorClass: "bg-slate-100 text-slate-700" }]
              : []),
          ],
        };
      })}
      selectedId={selectedId}
      messageVide="Aucun dossier pour l'instant."
      messageVideFiltre="Aucun dossier ne correspond à ce filtre."
      pagination={{ total, page, pageSize: taillePage, baseParams: { q, statut, origine, taille, archives } }}
    />
  );
}
