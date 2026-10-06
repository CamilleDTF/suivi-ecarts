import { prisma } from "@/lib/prisma";
import { ActiviteRecente, type ActiviteItem } from "@/components/activite-recente";
import { IconFolder, IconAlertTriangle, IconFileText } from "@/components/icons";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";
import { ConteneurPage, EntetePage } from "@/components/page-liste";
import {
  Anneau,
  BarresClassees,
  Bloc,
  ColonnesGroupees,
  Indicateur,
  LignePoint,
  TitreSection,
  type TonSynthese,
} from "@/components/synthese-blocs";
import { SyntheseFiltres } from "@/components/synthese-filtres";
import { PERIODES } from "@/lib/synthese-periodes";
import { compterOccurrences } from "@/lib/statistiques";
import {
  STATUT_DOSSIER_ECART_LABELS,
  STATUT_ACTION_LABELS,
  STATUT_REMONTEE_LABELS,
} from "@/lib/labels";

// Le navigateur nomme le PDF d'après le titre du document : la date évite que
// deux exports pris à des moments différents portent le même nom.
export function generateMetadata() {
  return { title: `Synthèse au ${new Date().toLocaleDateString("fr-FR")}` };
}

const STATUT_ECART = ["OUVERT", "EN_COURS", "CLOTURE"] as const;
const TON_STATUT_ECART: Record<string, TonSynthese> = { OUVERT: "ambre", EN_COURS: "bleu", CLOTURE: "vert" };
const STATUT_ACTION = ["A_FAIRE", "EN_COURS", "EN_RETARD", "REALISEE", "ANNULEE"] as const;
const TON_STATUT_ACTION: Record<string, TonSynthese> = {
  A_FAIRE: "neutre",
  EN_COURS: "bleu",
  EN_RETARD: "rouge",
  REALISEE: "vert",
  ANNULEE: "neutre",
};
const STATUT_REMONTEE = ["A_TRAITER", "EN_COURS", "TRAITEE", "TRANSFORMEE_EN_ECART"] as const;
const TON_STATUT_REMONTEE: Record<string, TonSynthese> = {
  A_TRAITER: "ambre",
  EN_COURS: "bleu",
  TRAITEE: "vert",
  TRANSFORMEE_EN_ECART: "violet",
};
// Ordre de gravité croissante : un classement, pas un alphabet.
const CRITICITES = ["Faible", "Moyenne", "Élevée"] as const;
const TON_CRITICITE: Record<string, TonSynthese> = { Faible: "vert", Moyenne: "ambre", Élevée: "rouge" };

const MOIS_COURTS = ["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."];

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

/** Début de période, nombre de mois affichés dans l'évolution et début de la période précédente. */
function lirePeriode(cle: string, maintenant: Date) {
  const an = maintenant.getFullYear();
  const mois = maintenant.getMonth();
  if (cle === "annee") return { depuis: new Date(an, 0, 1), nbMois: mois + 1, comparable: true };
  if (cle === "tout") return { depuis: null, nbMois: 24, comparable: false };
  const n = cle === "3m" ? 3 : cle === "6m" ? 6 : 12;
  return { depuis: new Date(an, mois - (n - 1), 1), nbMois: n, comparable: true };
}

function moisAffiches(nbMois: number, maintenant: Date) {
  return Array.from({ length: nbMois }, (_, i) => {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth() - (nbMois - 1 - i), 1);
    return { annee: d.getFullYear(), mois: d.getMonth(), label: MOIS_COURTS[d.getMonth()] };
  });
}

function repartirParMois(mois: ReturnType<typeof moisAffiches>, dates: (Date | null | undefined)[]) {
  const index = new Map(mois.map((m, i) => [`${m.annee}-${m.mois}`, i]));
  const compte = new Array(mois.length).fill(0);
  for (const d of dates) {
    if (!d) continue;
    const i = index.get(`${d.getFullYear()}-${d.getMonth()}`);
    if (i !== undefined) compte[i]++;
  }
  return compte as number[];
}

const JOUR = 86_400_000;

export default async function SynthesePage({
  searchParams,
}: {
  searchParams: Promise<{ periode?: string; dossier?: string }>;
}) {
  const { periode: periodeDemandee, dossier: dossierDemande } = await searchParams;
  const periode = PERIODES.some((p) => p.cle === periodeDemandee) ? periodeDemandee! : "12m";
  const dossierId = dossierDemande || undefined;

  const maintenant = new Date();
  const { depuis, nbMois, comparable } = lirePeriode(periode, maintenant);
  const mois = moisAffiches(nbMois, maintenant);
  // Le graphique d'évolution ne remonte pas plus loin que ses mois affichés.
  const debutGraphique = depuis ?? new Date(maintenant.getFullYear(), maintenant.getMonth() - (nbMois - 1), 1);
  const debutPrecedent = depuis && comparable ? new Date(depuis.getFullYear(), depuis.getMonth() - nbMois, 1) : null;

  // Le chantier filtre ce qui s'y rattache : écarts, évènements SSE, actions
  // et remontées. Les écarts amiante n'ont pas de dossier.
  const parDossier = {
    ecart: dossierId ? { dossierId } : {},
    fiche: dossierId ? { ecart: { dossierId } } : {},
    lie: dossierId ? { ecarts: { some: { dossierId } } } : {},
  };
  // Borne haute : fin du mois courant, pour que les chiffres et le graphique
  // comptent la même chose (une date saisie dans le futur n'appartient à aucun
  // mois affiché).
  const finMois = new Date(maintenant.getFullYear(), maintenant.getMonth() + 1, 1);
  const intervalle = (champ: string, debut: Date | null, fin: Date = finMois) =>
    debut ? { [champ]: { gte: debut, lt: fin } } : { [champ]: { lt: fin } };

  const [dossiers, ecartsPeriode, ecartsPrecedent, ecartsOuverts, ecartsParStatut] = await Promise.all([
    prisma.dossier.findMany({
      where: { archiveLe: null },
      orderBy: { reference: "asc" },
      select: { id: true, reference: true, chantier: true },
    }),
    prisma.ecart.findMany({
      where: { archiveLe: null, ...parDossier.ecart, ...intervalle("dateDetection", depuis) },
      select: { dateDetection: true, statut: true },
    }),
    debutPrecedent && depuis
      ? prisma.ecart.count({
          where: { archiveLe: null, ...parDossier.ecart, ...intervalle("dateDetection", debutPrecedent, depuis) },
        })
      : Promise.resolve(null),
    prisma.ecart.findMany({
      where: { archiveLe: null, ...parDossier.ecart, statut: { not: "CLOTURE" } },
      orderBy: { dateDetection: "desc" },
      select: {
        id: true,
        reference: true,
        description: true,
        criticite: true,
        dateDetection: true,
        dossier: { select: { chantier: true } },
      },
    }),
    prisma.ecart.groupBy({ by: ["statut"], where: { archiveLe: null, ...parDossier.ecart }, _count: { _all: true } }),
  ]);

  const [actionsParStatut, actionsOuvertes, fichesPeriode, fichesPrecedent, remonteesPeriode, remonteesPrecedent] =
    await Promise.all([
      prisma.action.groupBy({ by: ["statut"], where: { archiveLe: null, ...parDossier.lie }, _count: { _all: true } }),
      prisma.action.findMany({
        where: { archiveLe: null, ...parDossier.lie, statut: { in: ["A_FAIRE", "EN_COURS", "EN_RETARD"] } },
        orderBy: { echeance: "asc" },
        // `select` : jamais la preuve (photo/PDF en data URL) d'une action.
        select: { id: true, reference: true, action: true, responsable: true, echeance: true, statut: true },
      }),
      prisma.ficheSSE.findMany({
        where: { archiveLe: null, ...parDossier.fiche, ...intervalle("dateHeure", depuis) },
        select: { dateHeure: true, typeEvenement: true, theme: true, domaine: true },
      }),
      debutPrecedent && depuis
        ? prisma.ficheSSE.count({
            where: { archiveLe: null, ...parDossier.fiche, ...intervalle("dateHeure", debutPrecedent, depuis) },
          })
        : Promise.resolve(null),
      prisma.remonteeInfo.findMany({
        where: { archiveLe: null, ...parDossier.lie, ...intervalle("dateRemontee", depuis) },
        select: { dateRemontee: true, categories: true, statut: true },
      }),
      debutPrecedent && depuis
        ? prisma.remonteeInfo.count({
            where: { archiveLe: null, ...parDossier.lie, ...intervalle("dateRemontee", debutPrecedent, depuis) },
          })
        : Promise.resolve(null),
    ]);

  const [amiantePeriode, rexTotal, rexBrouillons, rexParStatut] = await Promise.all([
    dossierId
      ? Promise.resolve(null)
      : prisma.ecartAmiante.findMany({
          where: { archiveLe: null, ...intervalle("date", depuis) },
          select: { statut: true },
        }),
    prisma.rex.count({ where: { brouillon: false } }),
    prisma.rex.count({ where: { brouillon: true } }),
    prisma.rex.groupBy({ by: ["statut"], _count: { _all: true }, where: { brouillon: false } }),
  ]);

  // ——— Écarts ———
  const ecartsDetectes = ecartsPeriode.length;
  const ecartsClotures = ecartsPeriode.filter((e) => e.statut === "CLOTURE").length;
  const tauxCloture = ecartsDetectes > 0 ? Math.round((ecartsClotures / ecartsDetectes) * 100) : null;
  const ouvertsEleves = ecartsOuverts.filter((e) => e.criticite === "Élevée");
  const ecartsStatutCounts = Object.fromEntries(ecartsParStatut.map((s) => [s.statut, s._count._all]));
  const criticiteOuverts = CRITICITES.map((c) => ({
    label: c,
    valeur: ecartsOuverts.filter((e) => e.criticite === c).length,
    ton: TON_CRITICITE[c],
  }));
  const parChantier = compterOccurrences(ecartsOuverts.map((e) => e.dossier?.chantier ?? "Sans dossier")).slice(0, 8);
  const critiques = ecartsOuverts
    .filter((e) => e.criticite === "Élevée" || e.criticite === "Moyenne")
    .sort((a, b) => Number(b.criticite === "Élevée") - Number(a.criticite === "Élevée"))
    .slice(0, 6);

  // ——— Actions ———
  const actionsStatutCounts = Object.fromEntries(actionsParStatut.map((a) => [a.statut, a._count._all]));
  const enRetard = actionsOuvertes.filter(
    (a) => a.statut === "EN_RETARD" || (a.echeance !== null && a.echeance.getTime() < maintenant.getTime()),
  );
  const retardsAffiches = enRetard.slice(0, 6);
  const parResponsable = compterOccurrences(actionsOuvertes.map((a) => a.responsable));
  const topResponsables = parResponsable.slice(0, 8);
  const resteResponsables = parResponsable.slice(8).reduce((s, r) => s + r.valeur, 0);
  const responsablesGraphique = resteResponsables
    ? [...topResponsables, { label: "Autres", valeur: resteResponsables }]
    : topResponsables;

  // ——— Évènements SSE ———
  const typeRepartition = decomposerTypeEvenement(fichesPeriode.map((f) => f.typeEvenement));
  const accidents = typeRepartition.find((t) => t.label === "Accident")?.valeur ?? 0;
  const themeRepartition = compterOccurrences(fichesPeriode.flatMap((f) => f.theme)).slice(0, 8);
  const domaineRepartition = compterOccurrences(fichesPeriode.flatMap((f) => f.domaine));

  // ——— Remontées ———
  const remonteesStatutCounts = Object.fromEntries(
    STATUT_REMONTEE.map((s) => [s, remonteesPeriode.filter((r) => r.statut === s).length]),
  );
  const categorieRepartition = compterOccurrences(remonteesPeriode.flatMap((r) => r.categories)).slice(0, 8);
  // Une catégorie qui revient au moins deux fois est candidate à un REX.
  const repetitions = categorieRepartition.filter((c) => c.valeur >= 2).length;

  // ——— REX ———
  const rexStatutCounts = Object.fromEntries(rexParStatut.map((r) => [r.statut, r._count._all]));
  const rexDiffuses = (rexStatutCounts.DIFFUSE ?? 0) + (rexStatutCounts.EFFICACITE_VERIFIEE ?? 0);
  const tauxDiffusion = rexTotal > 0 ? Math.round((rexDiffuses / rexTotal) * 100) : null;
  const tauxEfficacite =
    rexTotal > 0 ? Math.round(((rexStatutCounts.EFFICACITE_VERIFIEE ?? 0) / rexTotal) * 100) : null;

  const evolution = mois.map((m, i) => ({
    label: m.label,
    // Au-delà d'un an, les mois se répètent : l'année s'affiche au premier mois et à chaque janvier.
    annee: nbMois > 12 && (i === 0 || m.mois === 0) ? String(m.annee) : undefined,
    valeurs: [
      repartirParMois(
        mois,
        ecartsPeriode.map((e) => e.dateDetection).filter((d) => d >= debutGraphique),
      )[i],
      repartirParMois(
        mois,
        fichesPeriode.map((f) => f.dateHeure).filter((d): d is Date => !!d && d >= debutGraphique),
      )[i],
      repartirParMois(
        mois,
        remonteesPeriode.map((r) => r.dateRemontee).filter((d) => d >= debutGraphique),
      )[i],
    ],
  }));

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

  const libellePeriode = PERIODES.find((p) => p.cle === periode)!.label.toLowerCase();
  const chantierChoisi = dossiers.find((d) => d.id === dossierId);
  // Sans donnée sur la période précédente (l'historique ne remonte pas assez
  // loin), un « +91 » n'apprend rien : on n'affiche pas la variation.
  const variation = (courant: number, precedent: number | null, bonne: "baisse" | "hausse" | null) =>
    precedent === null || precedent === 0 ? undefined : { ecart: courant - precedent, bonne };

  return (
    <ConteneurPage>
      <EntetePage
        titre="Synthèse"
        sousTitre={`${
          chantierChoisi ? `Chantier ${chantierChoisi.chantier}` : "Tous les chantiers"
        } · ${periode === "tout" ? "toute la période" : periode === "annee" ? "année en cours" : `${libellePeriode} glissants`}`}
      >
        <div data-no-print>
          <BoutonExportPDF className="" />
        </div>
      </EntetePage>

      <div className="mb-8">
        <SyntheseFiltres
          periode={periode}
          dossier={dossierId ?? ""}
          dossiers={dossiers.map((d) => ({ id: d.id, libelle: `${d.chantier} (${d.reference})` }))}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
        <Indicateur
          label="Écarts ouverts"
          valeur={ecartsOuverts.length}
          detail={ouvertsEleves.length > 0 ? `dont ${ouvertsEleves.length} de criticité élevée` : "aucun de criticité élevée"}
          ton="ambre"
          href="/ecarts"
        />
        <Indicateur
          label="Écarts détectés"
          valeur={ecartsDetectes}
          variation={variation(ecartsDetectes, ecartsPrecedent, "baisse")}
          detail={tauxCloture === null ? undefined : `${tauxCloture} % clôturés`}
          ton="primaire"
        />
        <Indicateur
          label="Actions en retard"
          valeur={enRetard.length}
          detail={`sur ${actionsOuvertes.length} ouvertes`}
          ton={enRetard.length > 0 ? "rouge" : "vert"}
          href="/plan-action?statut=EN_RETARD"
        />
        <Indicateur
          label="Évènements SSE"
          valeur={fichesPeriode.length}
          variation={variation(fichesPeriode.length, fichesPrecedent, "baisse")}
          detail={accidents > 0 ? `dont ${accidents} accident${accidents > 1 ? "s" : ""}` : "aucun accident"}
          ton="bleu"
          href="/fiches-sse"
        />
        <Indicateur
          label="Remontées"
          valeur={remonteesPeriode.length}
          variation={variation(remonteesPeriode.length, remonteesPrecedent, null)}
          detail={`${remonteesStatutCounts.A_TRAITER ?? 0} à traiter`}
          ton="violet"
          href="/remontees"
        />
        <Indicateur
          label="REX diffusés"
          valeur={tauxDiffusion === null ? "—" : `${tauxDiffusion} %`}
          detail={`${rexTotal} publié${rexTotal > 1 ? "s" : ""} · ${rexBrouillons} brouillon${rexBrouillons > 1 ? "s" : ""}`}
          ton="vert"
          href="/rex"
        />
      </div>

      <TitreSection>À traiter en priorité</TitreSection>
      <div className="grid gap-4 lg:grid-cols-2">
        <Bloc titre="Actions en retard" complement={enRetard.length > retardsAffiches.length ? `${retardsAffiches.length} sur ${enRetard.length}` : undefined}>
          {retardsAffiches.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucune action en retard.</p>
          ) : (
            <ul className="divide-y">
              {retardsAffiches.map((a) => {
                const jours = a.echeance ? Math.max(0, Math.floor((maintenant.getTime() - a.echeance.getTime()) / JOUR)) : null;
                return (
                  <LignePoint
                    key={a.id}
                    href={`/plan-action/${a.id}`}
                    reference={a.reference}
                    texte={`${a.action} — ${a.responsable}`}
                    droite={jours === null ? "sans échéance" : jours === 0 ? "échue aujourd'hui" : `${jours} j de retard`}
                    ton="rouge"
                  />
                );
              })}
            </ul>
          )}
        </Bloc>
        <Bloc titre="Écarts ouverts les plus critiques">
          {critiques.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">Aucun écart ouvert de criticité moyenne ou élevée.</p>
          ) : (
            <ul className="divide-y">
              {critiques.map((e) => (
                <LignePoint
                  key={e.id}
                  href={`/ecarts/${e.id}`}
                  reference={e.reference}
                  texte={e.description || "Sans description"}
                  droite={e.criticite}
                  ton={TON_CRITICITE[e.criticite ?? ""] ?? "neutre"}
                />
              ))}
            </ul>
          )}
        </Bloc>
      </div>

      <TitreSection>Évolution</TitreSection>
      <Bloc titre="Détections par mois" complement={periode === "tout" ? "24 derniers mois" : undefined}>
        <ColonnesGroupees
          mois={evolution}
          series={[
            { nom: "Écarts", ton: "primaire" },
            { nom: "Évènements SSE", ton: "bleu" },
            { nom: "Remontées", ton: "violet" },
          ]}
        />
      </Bloc>

      <TitreSection>Écarts</TitreSection>
      <div className="grid gap-4 lg:grid-cols-3">
        <Bloc titre="Répartition par statut" complement="tous les écarts">
          <Anneau
            segments={STATUT_ECART.map((s) => ({
              label: STATUT_DOSSIER_ECART_LABELS[s],
              valeur: ecartsStatutCounts[s] ?? 0,
              ton: TON_STATUT_ECART[s],
            }))}
          />
        </Bloc>
        <Bloc titre="Ouverts par criticité">
          <BarresClassees donnees={criticiteOuverts} vide="Aucun écart ouvert." />
        </Bloc>
        <Bloc titre="Ouverts par chantier">
          <BarresClassees donnees={parChantier} ton="ambre" vide="Aucun écart ouvert." />
        </Bloc>
      </div>

      <TitreSection>Plan d&apos;action</TitreSection>
      <div className="grid gap-4 lg:grid-cols-2">
        <Bloc titre="Actions par statut">
          <Anneau
            segments={STATUT_ACTION.map((s) => ({
              label: STATUT_ACTION_LABELS[s],
              valeur: actionsStatutCounts[s] ?? 0,
              ton: TON_STATUT_ACTION[s],
            }))}
          />
        </Bloc>
        <Bloc titre="Actions ouvertes par responsable">
          <BarresClassees donnees={responsablesGraphique} ton="bleu" vide="Aucune action ouverte." />
        </Bloc>
      </div>

      <TitreSection>Évènements SSE</TitreSection>
      <div className="grid gap-4 lg:grid-cols-3">
        <Bloc titre="Par type d'évènement" complement={libellePeriode}>
          <BarresClassees donnees={typeRepartition} ton="bleu" />
        </Bloc>
        <Bloc titre="Par thème" complement={libellePeriode}>
          <BarresClassees donnees={themeRepartition} ton="violet" />
        </Bloc>
        <Bloc titre="Par domaine" complement={libellePeriode}>
          <BarresClassees donnees={domaineRepartition} ton="vert" />
        </Bloc>
      </div>

      <TitreSection>Remontées d&apos;informations et REX</TitreSection>
      <div className="grid gap-4 lg:grid-cols-3">
        <Bloc titre="Remontées par statut" complement={libellePeriode}>
          <Anneau
            segments={STATUT_REMONTEE.map((s) => ({
              label: STATUT_REMONTEE_LABELS[s],
              valeur: remonteesStatutCounts[s] ?? 0,
              ton: TON_STATUT_REMONTEE[s],
            }))}
          />
        </Bloc>
        <Bloc
          titre="Catégories les plus remontées"
          complement={repetitions > 0 ? `${repetitions} reviennent ≥ 2 fois : candidates à un REX` : undefined}
        >
          <BarresClassees donnees={categorieRepartition} ton="violet" />
        </Bloc>
        <Bloc titre="Retours d'expérience">
          <div className="grid grid-cols-2 gap-x-4 gap-y-5">
            {[
              { label: "Publiés", valeur: rexTotal },
              { label: "Brouillons", valeur: rexBrouillons },
              { label: "Taux de diffusion", valeur: tauxDiffusion === null ? "—" : `${tauxDiffusion} %` },
              { label: "Efficacité vérifiée", valeur: tauxEfficacite === null ? "—" : `${tauxEfficacite} %` },
            ].map((k) => (
              <div key={k.label}>
                <p className="font-display text-3xl font-semibold tabular-nums leading-none">{k.valeur}</p>
                <p className="mt-1.5 text-xs text-muted-foreground">{k.label}</p>
              </div>
            ))}
          </div>
        </Bloc>
      </div>

      <div className="mt-10 grid gap-4 lg:grid-cols-2">
        <Bloc titre="Écarts amiante" complement={libellePeriode}>
          {amiantePeriode === null ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Les écarts amiante ne sont pas rattachés à un dossier : choisissez « Tous les chantiers ».
            </p>
          ) : (
            <Anneau
              segments={STATUT_ECART.map((s) => ({
                label: STATUT_DOSSIER_ECART_LABELS[s],
                valeur: amiantePeriode.filter((a) => a.statut === s).length,
                ton: TON_STATUT_ECART[s],
              }))}
            />
          )}
        </Bloc>
        <ActiviteRecente items={activites} />
      </div>
    </ConteneurPage>
  );
}
