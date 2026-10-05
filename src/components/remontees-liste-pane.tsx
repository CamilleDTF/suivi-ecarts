import { prisma } from "@/lib/prisma";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { ListePane, CLASSE_FILTRE_PANE } from "@/components/liste-pane";
import { OrigineRemontee, StatutRemontee } from "@/generated/prisma/enums";
import {
  ORIGINE_REMONTEE_LABELS,
  STATUT_REMONTEE_COLORS,
  STATUT_REMONTEE_LABELS,
  CATEGORIES_REMONTEE,
  NATURES_REMONTEE,
  avecValeursExistantes,
} from "@/lib/labels";
import { filtreStatutRemontee } from "@/lib/validation";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";

export type RemonteesListeSearchParams = {
  q?: string;
  statut?: string;
  origine?: string;
  categorie?: string;
  chantier?: string;
  page?: string;
  taille?: string;
  archives?: string;
};

const COULEUR_CATEGORIE = "bg-slate-100 text-slate-600";

/**
 * Panneau de liste des remontées, partagé par /remontees, /remontees/[id] et
 * /remontees/nouveau pour donner la vue liste+détail : chaque page fait sa
 * propre requête (searchParams n'est disponible que sur les pages, pas sur
 * un layout partagé), donc ce composant reste un simple serveur component
 * appelé depuis chacune plutôt qu'un layout.
 */
export async function RemonteesListePane({
  searchParams,
  selectedId,
}: {
  searchParams: RemonteesListeSearchParams;
  selectedId?: string;
}) {
  const { q, statut, origine, categorie, chantier, page: pageParam, taille, archives } = searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

  const naturesTrouvees = q
    ? NATURES_REMONTEE.filter((n) => n.toLowerCase().includes(q.toLowerCase()))
    : [];
  const categoriesTrouvees = q
    ? CATEGORIES_REMONTEE.filter((c) => c.toLowerCase().includes(q.toLowerCase()))
    : [];

  const where = {
    ...filtreArchive(archives),
    statut: filtreStatutRemontee(statut),
    origine: origine && origine in OrigineRemontee ? (origine as OrigineRemontee) : undefined,
    categories: categorie ? { has: categorie } : undefined,
    chantierService: chantier || undefined,
    OR: q
      ? [
          { reference: { contains: q, mode: "insensitive" as const } },
          { objet: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
          { suiteDonnee: { contains: q, mode: "insensitive" as const } },
          { chantierService: { contains: q, mode: "insensitive" as const } },
          { personneRemontant: { contains: q, mode: "insensitive" as const } },
          { personneSaisie: { contains: q, mode: "insensitive" as const } },
          // Chercher la référence du rattachement ramène la remontée : c'est
          // souvent par l'écart qu'on revient à ce qui l'a signalé.
          { ecarts: { some: { reference: { contains: q, mode: "insensitive" as const } } } },
          { ficheSSE: { reference: { contains: q, mode: "insensitive" as const } } },
          // Les natures et catégories sont stockées en tableau : on cherche
          // d'abord les options correspondant au texte saisi, puis on filtre
          // dessus.
          ...(naturesTrouvees.length ? [{ natures: { hasSome: naturesTrouvees } }] : []),
          ...(categoriesTrouvees.length ? [{ categories: { hasSome: categoriesTrouvees } }] : []),
        ]
      : undefined,
  };

  const [total, remontees, chantiers, toutesCategories] = await Promise.all([
    prisma.remonteeInfo.count({ where }),
    prisma.remonteeInfo.findMany({
      where,
      orderBy: { dateRemontee: "desc" as const },
      select: {
        id: true,
        reference: true,
        dateRemontee: true,
        chantierService: true,
        objet: true,
        categories: true,
        statut: true,
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
    prisma.remonteeInfo.findMany({
      distinct: ["chantierService"],
      select: { chantierService: true },
      orderBy: { chantierService: "asc" },
    }),
    prisma.remonteeInfo.findMany({ select: { categories: true } }),
  ]);

  // D'anciennes remontées portent des catégories antérieures au référentiel
  // actuel (ex. "Sécurité") : sans elles dans les options, le menu ne peut pas
  // s'afficher sélectionné sur ce filtre alors même que la liste, elle, est
  // bien filtrée. Dédupliquées : plusieurs remontées peuvent partager la même
  // ancienne valeur, et `avecValeursExistantes` ne le fait pas elle-même (elle
  // reçoit d'ordinaire les catégories d'une seule fiche, jamais en double).
  const categoriesFiltre = avecValeursExistantes(
    CATEGORIES_REMONTEE,
    [...new Set(toutesCategories.flatMap((r) => r.categories))],
  );

  return (
    <ListePane
      titre="Remontées"
      basePath="/remontees"
      nouveau={{ href: "/remontees/nouveau", label: "+ Nouvelle remontée" }}
      recherche={{ valeur: q, placeholder: "Rechercher une remontée…" }}
      filtres={
        <>
          <SelectAutoSubmit
            name="origine"
            defaultValue={origine ?? ""}
            className={CLASSE_FILTRE_PANE}
            options={[
              { value: "", label: "Origine : Toutes" },
              ...Object.values(OrigineRemontee).map((o) => ({ value: o, label: ORIGINE_REMONTEE_LABELS[o] })),
            ]}
          />
          <SelectAutoSubmit
            name="statut"
            defaultValue={statut ?? ""}
            className={CLASSE_FILTRE_PANE}
            options={[
              { value: "", label: "Statut : Tous" },
              ...Object.values(StatutRemontee).map((s) => ({ value: s, label: STATUT_REMONTEE_LABELS[s] })),
            ]}
          />
          <SelectAutoSubmit
            // Forcé au changement de valeur : sans clé, une navigation interne (le
            // clic sur une pastille de répétition, par exemple) filtre bien la
            // liste mais laisse le menu affiché sur son ancienne valeur, React ne
            // réappliquant pas `defaultValue` sur un composant déjà monté.
            key={categorie ?? ""}
            name="categorie"
            defaultValue={categorie ?? ""}
            className={CLASSE_FILTRE_PANE}
            options={[
              { value: "", label: "Catégorie : Toutes" },
              ...categoriesFiltre.map((c) => ({ value: c, label: c })),
            ]}
          />
          <SelectAutoSubmit
            name="chantier"
            defaultValue={chantier ?? ""}
            className={CLASSE_FILTRE_PANE}
            options={[
              { value: "", label: "Chantier / Service : Tous" },
              ...chantiers.map((c) => ({ value: c.chantierService, label: c.chantierService })),
            ]}
          />
        </>
      }
      filtreActif={!!q || !!statut || !!origine || !!categorie || !!chantier}
      archives={archives}
      paramsConserves={{ q, statut, origine, categorie, chantier, taille }}
      lignes={remontees.map((r) => ({
        id: r.id,
        reference: r.reference,
        date: r.dateRemontee.toLocaleDateString("fr-FR"),
        resume: `${r.chantierService} — ${r.objet}`,
        badges: [
          { label: STATUT_REMONTEE_LABELS[r.statut], colorClass: STATUT_REMONTEE_COLORS[r.statut] },
          ...r.categories.map((c) => ({ label: c, colorClass: COULEUR_CATEGORIE })),
        ],
      }))}
      selectedId={selectedId}
      messageVide="Aucune remontée d'information pour l'instant."
      messageVideFiltre="Aucune remontée ne correspond à ce filtre."
      pagination={{
        total,
        page,
        pageSize: taillePage,
        baseParams: { q, statut, origine, categorie, chantier, taille, archives },
      }}
    />
  );
}
