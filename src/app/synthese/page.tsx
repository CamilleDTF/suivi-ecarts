import { prisma } from "@/lib/prisma";
import { StatTile } from "@/components/stat-tile";
import { GraphiqueBarres } from "@/components/graphique-barres";
import { GraphiqueColonnes } from "@/components/graphique-colonnes";
import { DonutChart } from "@/components/donut-chart";
import { ActiviteRecente, type ActiviteItem } from "@/components/activite-recente";
import { IconFolder, IconAlertTriangle, IconFileText } from "@/components/icons";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";

// Le navigateur nomme le PDF d'après le titre du document : la date évite que
// deux exports pris à des moments différents portent le même nom.
export function generateMetadata() {
  return { title: `Synthèse au ${new Date().toLocaleDateString("fr-FR")}` };
}
import {
  STATUT_DOSSIER_ECART_COLORS,
  STATUT_DOSSIER_ECART_LABELS,
  STATUT_FICHE_COLORS,
  STATUT_FICHE_LABELS,
  STATUT_ACTION_COLORS,
  STATUT_ACTION_LABELS,
  STATUT_REMONTEE_COLORS,
  STATUT_REMONTEE_LABELS,
  CRITICITE_COLORS,
} from "@/lib/labels";

const STATUT_ORDER = ["OUVERT", "EN_COURS", "CLOTURE"] as const;
const STATUT_FICHE_ORDER = ["BROUILLON", "EN_COURS", "FINALISEE"] as const;
const STATUT_ECART_AMIANTE_ORDER = ["OUVERT", "EN_COURS", "CLOTURE"] as const;
const STATUT_ACTION_ORDER = ["A_FAIRE", "EN_COURS", "EN_RETARD", "REALISEE", "VERIFIEE_EFFICACE", "ANNULEE"] as const;
const STATUT_REMONTEE_ORDER = ["A_TRAITER", "EN_COURS", "TRAITEE", "TRANSFORMEE_EN_ECART"] as const;
// Ordre de gravité croissante : un classement, pas un alphabet.
const CRITICITE_ORDER = ["Faible", "Moyenne", "Élevée"] as const;

const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

/** Les 12 derniers mois, du plus ancien au plus récent. */
function douzeDerniersMois() {
  const maintenant = new Date();
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - (11 - i), 1);
    return { annee: d.getFullYear(), mois: d.getMonth(), label: MOIS_COURTS[d.getMonth()] };
  });
}

function repartirParMois(dates: (Date | null | undefined)[]) {
  const mois = douzeDerniersMois();
  const index = new Map(mois.map((m, i) => [`${m.annee}-${m.mois}`, i]));
  const compte = new Array(mois.length).fill(0);
  for (const d of dates) {
    if (!d) continue;
    const i = index.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) compte[i]++;
  }
  return mois.map((m, i) => ({ label: m.label, valeur: compte[i] }));
}

function compterOccurrences(valeurs: (string | null | undefined)[]): { label: string; valeur: number }[] {
  const counts: Record<string, number> = {};
  for (const v of valeurs) {
    if (!v) continue;
    counts[v] = (counts[v] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([label, valeur]) => ({ label, valeur }))
    .sort((a, b) => b.valeur - a.valeur);
}

// Les types d'évènement composés ("Situation dangereuse & comportement à
// risque") comptent pour chacune des catégories qui les composent, plutôt
// que d'apparaître comme une catégorie séparée. La casse varie selon la
// position dans la chaîne d'origine ("... & situation dangereuse"), d'où la
// normalisation vers les 5 libellés canoniques.
const CATEGORIES_EVENEMENT = [
  "Accident",
  "Presqu'accident",
  "Situation dangereuse",
  "Comportement à risque",
  "Impact environnemental",
];

function decomposerTypeEvenement(valeurs: (string | null | undefined)[]): { label: string; valeur: number }[] {
  const counts: Record<string, number> = {};
  for (const v of valeurs) {
    if (!v) continue;
    for (const partie of v.split("&").map((p) => p.trim())) {
      const canonique = CATEGORIES_EVENEMENT.find((c) => c.toLowerCase() === partie.toLowerCase()) ?? partie;
      counts[canonique] = (counts[canonique] ?? 0) + 1;
    }
  }
  return Object.entries(counts)
    .map(([label, valeur]) => ({ label, valeur }))
    .sort((a, b) => b.valeur - a.valeur);
}

function trouverDominant(repartition: { label: string; valeur: number }[], total: number) {
  if (repartition.length === 0) return null;
  const top = repartition[0];
  return { label: top.label, valeur: top.valeur, part: total > 0 ? Math.round((top.valeur / total) * 100) : 0 };
}

export default async function SynthesePage() {
  const [
    dossiersOuverts,
    ecartsOuverts,
    fichesBrouillon,
    ecartAmianteOuverts,
    dossiersParStatut,
    ecartsParStatut,
    fichesParStatut,
    ecartAmianteParCloture,
  ] = await Promise.all([
    prisma.dossier.count({ where: { statut: { not: "CLOTURE" } } }),
    prisma.ecart.count({ where: { statut: { not: "CLOTURE" } } }),
    prisma.ficheSSE.count({ where: { statutFiche: "BROUILLON" } }),
    prisma.ecartAmiante.count({ where: { statut: { not: "CLOTURE" } } }),
    prisma.dossier.groupBy({ by: ["statut"], _count: { _all: true } }),
    prisma.ecart.groupBy({ by: ["statut"], _count: { _all: true } }),
    prisma.ficheSSE.groupBy({ by: ["statutFiche"], _count: { _all: true } }),
    prisma.ecartAmiante.groupBy({ by: ["statut"], _count: { _all: true } }),
  ]);

  const statutCounts = Object.fromEntries(dossiersParStatut.map((d) => [d.statut, d._count._all]));
  const ecartsStatutCounts = Object.fromEntries(ecartsParStatut.map((d) => [d.statut, d._count._all]));
  const fichesStatutCounts = Object.fromEntries(fichesParStatut.map((d) => [d.statutFiche, d._count._all]));
  const ecartAmianteCounts = Object.fromEntries(ecartAmianteParCloture.map((d) => [d.statut, d._count._all]));

  const [
    ecartsCriticite,
    actionsParStatut,
    actionsOuvertes,
    remonteesParStatut,
    remonteesCategories,
    remonteesTotal,
    ecartsDates,
    remonteesDates,
  ] = await Promise.all([
    prisma.ecart.groupBy({ by: ["criticite"], _count: { _all: true } }),
    prisma.action.groupBy({ by: ["statut"], _count: { _all: true } }),
    prisma.action.findMany({
      where: { statut: { in: ["A_FAIRE", "EN_COURS", "EN_RETARD"] } },
      select: { responsable: true },
    }),
    prisma.remonteeInfo.groupBy({ by: ["statut"], _count: { _all: true } }),
    prisma.remonteeInfo.findMany({ select: { categorie: true } }),
    prisma.remonteeInfo.count(),
    prisma.ecart.findMany({ select: { dateDetection: true } }),
    prisma.remonteeInfo.findMany({ select: { dateRemontee: true } }),
  ]);

  const criticiteCounts = Object.fromEntries(ecartsCriticite.map((c) => [c.criticite ?? "", c._count._all]));
  const actionsStatutCounts = Object.fromEntries(actionsParStatut.map((a) => [a.statut, a._count._all]));
  const remonteesStatutCounts = Object.fromEntries(remonteesParStatut.map((r) => [r.statut, r._count._all]));

  // Au-delà d'une dizaine de barres la lecture se perd : on garde les
  // responsables les plus chargés, le reste est regroupé.
  const parResponsable = compterOccurrences(actionsOuvertes.map((a) => a.responsable));
  const topResponsables = parResponsable.slice(0, 8);
  const resteResponsables = parResponsable.slice(8).reduce((s, r) => s + r.valeur, 0);
  const responsablesGraphique = resteResponsables
    ? [...topResponsables, { label: "Autres", valeur: resteResponsables }]
    : topResponsables;

  const categorieRepartition = compterOccurrences(remonteesCategories.map((r) => r.categorie));
  const ecartsParMois = repartirParMois(ecartsDates.map((e) => e.dateDetection));
  const remonteesParMois = repartirParMois(remonteesDates.map((r) => r.dateRemontee));

  const fichesFocus = await prisma.ficheSSE.findMany({
    select: { domaine: true, theme: true, typeEvenement: true, dateHeure: true },
  });

  const [dossiersRecents, ecartsRecents, fichesRecentes, ecartAmianteRecents] = await Promise.all([
    prisma.dossier.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, reference: true, createdAt: true } }),
    prisma.ecart.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, reference: true, createdAt: true } }),
    prisma.ficheSSE.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, reference: true, createdAt: true, updatedAt: true, statutFiche: true },
    }),
    prisma.ecartAmiante.findMany({
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: { id: true, reference: true, createdAt: true, updatedAt: true, statut: true },
    }),
  ]);

  const activites: ActiviteItem[] = [
    ...dossiersRecents.map((d) => ({
      label: "Dossier créé",
      reference: d.reference,
      href: `/dossiers/${d.id}`,
      date: d.createdAt,
      icon: <IconFolder className="h-4 w-4" />,
      couleurBg: "bg-blue-50",
      couleurTexte: "text-blue-600",
    })),
    ...ecartsRecents.map((e) => ({
      label: "Écart créé",
      reference: e.reference,
      href: `/ecarts/${e.id}`,
      date: e.createdAt,
      icon: <IconAlertTriangle className="h-4 w-4" />,
      couleurBg: "bg-amber-50",
      couleurTexte: "text-amber-600",
    })),
    ...fichesRecentes.map((f) => ({
      label: f.statutFiche === "FINALISEE" ? "Évènement SSE finalisé" : "Évènement SSE créé",
      reference: f.reference,
      href: `/fiches-sse/${f.id}`,
      date: f.statutFiche === "FINALISEE" ? f.updatedAt : f.createdAt,
      icon: <IconFileText className="h-4 w-4" />,
      couleurBg: "bg-purple-50",
      couleurTexte: "text-purple-600",
    })),
    ...ecartAmianteRecents.map((a) => ({
      label: a.statut === "CLOTURE" ? "Écart amiante clôturé" : "Écart amiante créé",
      reference: a.reference,
      href: `/ecart-amiante/${a.id}`,
      date: a.statut === "CLOTURE" ? a.updatedAt : a.createdAt,
      icon: <IconAlertTriangle className="h-4 w-4" />,
      couleurBg: "bg-teal-50",
      couleurTexte: "text-teal-600",
    })),
  ]
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, 6);

  const totalEvenements = fichesFocus.length;
  const evenementsParAnnee = compterOccurrences(
    fichesFocus.map((f) => (f.dateHeure ? String(f.dateHeure.getFullYear()) : null)),
  ).sort((a, b) => Number(a.label) - Number(b.label));
  const domaineRepartition = compterOccurrences(fichesFocus.flatMap((f) => f.domaine));
  const themeRepartition = compterOccurrences(fichesFocus.flatMap((f) => f.theme));
  const typeRepartition = decomposerTypeEvenement(fichesFocus.map((f) => f.typeEvenement));

  const themeDominant = trouverDominant(themeRepartition, totalEvenements);
  const typeDominant = trouverDominant(typeRepartition, totalEvenements);

  return (
    <div className="mx-auto max-w-[100rem] px-6 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <h1 className="text-2xl font-semibold text-slate-900">Synthèse</h1>
        <div data-no-print>
          <BoutonExportPDF />
        </div>
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile
          label="Dossiers ouverts"
          value={dossiersOuverts}
          icon={<IconFolder className="h-5 w-5" />}
          couleur="bleu"
        />
        <StatTile
          label="Écarts ouverts"
          value={ecartsOuverts}
          icon={<IconAlertTriangle className="h-5 w-5" />}
          couleur="orange"
        />
        <StatTile
          label="Évènements SSE en brouillon"
          value={fichesBrouillon}
          icon={<IconFileText className="h-5 w-5" />}
          couleur="violet"
        />
        <StatTile
          label="Écarts amiante ouverts"
          value={ecartAmianteOuverts}
          icon={<IconAlertTriangle className="h-5 w-5" />}
          couleur="sarcelle"
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GraphiqueColonnes titre="Écarts détectés par mois" donnees={ecartsParMois} couleur="bg-amber-500" />
        <GraphiqueColonnes
          titre="Remontées d'informations par mois"
          donnees={remonteesParMois}
          couleur="bg-blue-500"
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DonutChart
          titre="Dossiers par statut"
          segments={STATUT_ORDER.map((s) => ({
            label: STATUT_DOSSIER_ECART_LABELS[s],
            valeur: statutCounts[s] ?? 0,
            colorClass: STATUT_DOSSIER_ECART_COLORS[s],
          }))}
        />
        <ActiviteRecente items={activites} />
      </div>

      {remonteesTotal > 0 && (
        <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <DonutChart
            titre="Remontées par statut"
            segments={STATUT_REMONTEE_ORDER.map((s) => ({
              label: STATUT_REMONTEE_LABELS[s],
              valeur: remonteesStatutCounts[s] ?? 0,
              colorClass: STATUT_REMONTEE_COLORS[s],
            }))}
          />
          <GraphiqueBarres
            titre="Remontées par catégorie"
            donnees={categorieRepartition}
            couleurUnique="bg-blue-400"
          />
        </div>
      )}

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <GraphiqueBarres
          titre="Écarts par criticité"
          donnees={CRITICITE_ORDER.map((c) => ({
            label: c,
            valeur: criticiteCounts[c] ?? 0,
            colorClass: CRITICITE_COLORS[c],
          }))}
        />
        <GraphiqueBarres
          titre="Actions ouvertes par responsable"
          donnees={responsablesGraphique}
          couleurUnique="bg-teal-400"
        />
      </div>

      <div className="mb-8">
        <GraphiqueBarres
          titre="Actions par statut"
          donnees={STATUT_ACTION_ORDER.map((s) => ({
            label: STATUT_ACTION_LABELS[s],
            valeur: actionsStatutCounts[s] ?? 0,
            colorClass: STATUT_ACTION_COLORS[s],
          }))}
        />
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <GraphiqueBarres
          titre="Écarts par statut"
          donnees={STATUT_ORDER.map((s) => ({
            label: STATUT_DOSSIER_ECART_LABELS[s],
            valeur: ecartsStatutCounts[s] ?? 0,
            colorClass: STATUT_DOSSIER_ECART_COLORS[s],
          }))}
        />
        <GraphiqueBarres
          titre="Évènements SSE par statut"
          donnees={STATUT_FICHE_ORDER.map((s) => ({
            label: STATUT_FICHE_LABELS[s],
            valeur: fichesStatutCounts[s] ?? 0,
            colorClass: STATUT_FICHE_COLORS[s],
          }))}
        />
        <GraphiqueBarres
          titre="Écarts amiante par état"
          donnees={STATUT_ECART_AMIANTE_ORDER.map((s) => ({
            label: STATUT_DOSSIER_ECART_LABELS[s],
            valeur: ecartAmianteCounts[s] ?? 0,
            colorClass: STATUT_DOSSIER_ECART_COLORS[s],
          }))}
        />
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Focus Évènements SSE</h2>

        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatTile
            label="Total évènements"
            value={totalEvenements}
            icon={<IconFileText className="h-5 w-5" />}
            couleur="violet"
          />
          {evenementsParAnnee.map((a) => (
            <StatTile
              key={a.label}
              label={`Évènements en ${a.label}`}
              value={a.valeur}
              icon={<IconFileText className="h-5 w-5" />}
              couleur="bleu"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <GraphiqueBarres titre="Répartition par domaine" donnees={domaineRepartition} couleurUnique="bg-blue-400" />
          <GraphiqueBarres titre="Répartition par thème" donnees={themeRepartition} couleurUnique="bg-purple-400" />
          <GraphiqueBarres
            titre="Répartition par type d'événement"
            donnees={typeRepartition}
            couleurUnique="bg-amber-400"
          />
        </div>

        {(themeDominant || typeDominant) && (
          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            {themeDominant && (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="mb-2 text-sm font-semibold uppercase text-slate-500">Thème dominant</h3>
                <p className="text-lg font-semibold text-slate-900">{themeDominant.label}</p>
                <p className="text-sm text-slate-500">
                  {themeDominant.valeur} évènement(s) · {themeDominant.part}% du total
                </p>
              </div>
            )}
            {typeDominant && (
              <div className="rounded-lg border border-slate-200 bg-white p-4">
                <h3 className="mb-2 text-sm font-semibold uppercase text-slate-500">
                  Type d&apos;événement dominant
                </h3>
                <p className="text-lg font-semibold text-slate-900">{typeDominant.label}</p>
                <p className="text-sm text-slate-500">
                  {typeDominant.valeur} évènement(s) · {typeDominant.part}% du total
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
