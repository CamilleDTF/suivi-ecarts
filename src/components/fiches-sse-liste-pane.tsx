import { prisma } from "@/lib/prisma";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { DateAutoSubmit } from "@/components/date-auto-submit";
import { ListePane, CLASSE_FILTRE_PANE } from "@/components/liste-pane";
import { StatutFiche } from "@/generated/prisma/enums";
import {
  STATUT_FICHE_COLORS,
  STATUT_FICHE_LABELS,
  THEME_OPTIONS,
  DOMAINES_OPTIONS,
  TYPE_EVENEMENT_OPTIONS,
  avecValeursExistantes,
} from "@/lib/labels";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";

export type FichesSSEListeSearchParams = {
  q?: string;
  statut?: string;
  type?: string;
  du?: string;
  au?: string;
  page?: string;
  taille?: string;
  archives?: string;
};

/**
 * Panneau de liste des évènements SSE, partagé par /fiches-sse,
 * /fiches-sse/[id] et /fiches-sse/nouveau : chaque page fait sa propre requête
 * (searchParams n'est disponible que sur les pages, pas sur un layout).
 */
export async function FichesSSEListePane({
  searchParams,
  selectedId,
}: {
  searchParams: FichesSSEListeSearchParams;
  selectedId?: string;
}) {
  const { q, statut, type, du, au, page: pageParam, taille, archives } = searchParams;
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
          { mesuresImmediatesPrises: contient },
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
          ...(themesTrouves.length ? [{ theme: { hasSome: themesTrouves } }] : []),
          ...(domainesTrouves.length ? [{ domaine: { hasSome: domainesTrouves } }] : []),
        ]
      : undefined,
  };

  const [total, fiches, typesEnBase] = await Promise.all([
    prisma.ficheSSE.count({ where }),
    prisma.ficheSSE.findMany({
      where,
      orderBy: { createdAt: "desc" as const },
      select: {
        id: true,
        reference: true,
        dateHeure: true,
        typeEvenement: true,
        nomChantier: true,
        statutFiche: true,
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

  return (
    <ListePane
      titre="Évènements SSE"
      basePath="/fiches-sse"
      nouveau={{ href: "/fiches-sse/nouveau", label: "+ Nouvel évènement" }}
      recherche={{ valeur: q, placeholder: "Rechercher un évènement…" }}
      filtres={
        <>
          <SelectAutoSubmit
            name="statut"
            defaultValue={statut ?? ""}
            className={CLASSE_FILTRE_PANE}
            options={[
              { value: "", label: "Statut : Tous" },
              ...Object.values(StatutFiche).map((s) => ({ value: s, label: STATUT_FICHE_LABELS[s] })),
            ]}
          />
          <SelectAutoSubmit
            name="type"
            defaultValue={type ?? ""}
            className={CLASSE_FILTRE_PANE}
            options={[
              { value: "", label: "Type : Tous" },
              ...typesProposes.map((t) => ({ value: t, label: t })),
            ]}
          />
          {/* DateAutoSubmit n'accepte pas de classe : les sélecteurs de variante
              ramènent ses champs à la taille des autres filtres du panneau. */}
          <div className="col-span-2 grid grid-cols-2 gap-2 [&_input]:min-w-0 [&_input]:flex-1 [&_input]:px-2 [&_input]:py-1.5 [&_input]:text-xs [&_label]:min-w-0 [&_label]:text-xs">
            <DateAutoSubmit name="du" defaultValue={du ?? ""} label="Du" />
            <DateAutoSubmit name="au" defaultValue={au ?? ""} label="au" />
          </div>
        </>
      }
      filtreActif={!!q || !!statut || !!type || !!du || !!au}
      archives={archives}
      paramsConserves={{ q, statut, type, du, au, taille }}
      lignes={fiches.map((f) => ({
        id: f.id,
        reference: f.reference,
        date: f.dateHeure?.toLocaleDateString("fr-FR"),
        resume: [f.nomChantier, f.typeEvenement].filter(Boolean).join(" — ") || undefined,
        badges: [{ label: STATUT_FICHE_LABELS[f.statutFiche], colorClass: STATUT_FICHE_COLORS[f.statutFiche] }],
      }))}
      selectedId={selectedId}
      messageVide="Aucun évènement SSE pour l'instant."
      messageVideFiltre="Aucun évènement ne correspond à ce filtre."
      pagination={{ total, page, pageSize: taillePage, baseParams: { q, statut, type, du, au, taille, archives } }}
    />
  );
}
