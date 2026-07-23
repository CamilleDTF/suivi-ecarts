import { prisma } from "@/lib/prisma";
import { StatTile } from "@/components/stat-tile";
import { GraphiqueBarres } from "@/components/graphique-barres";
import { DonutChart } from "@/components/donut-chart";
import { ActiviteRecente, type ActiviteItem } from "@/components/activite-recente";
import { IconFolder, IconAlertTriangle, IconFileText } from "@/components/icons";
import {
  STATUT_DOSSIER_ECART_COLORS,
  STATUT_DOSSIER_ECART_LABELS,
  STATUT_FICHE_COLORS,
  STATUT_FICHE_LABELS,
} from "@/lib/labels";

const STATUT_ORDER = ["A_QUALIFIER", "OUVERT", "EN_COURS", "CLOTURE"] as const;
const STATUT_FICHE_ORDER = ["BROUILLON", "EN_COURS", "FINALISEE"] as const;
const STATUT_ECART_AMIANTE_ORDER = ["OUVERT", "EN_COURS", "CLOTURE"] as const;

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
  const typeRepartition = compterOccurrences(fichesFocus.map((f) => f.typeEvenement));

  const themeDominant = trouverDominant(themeRepartition, totalEvenements);
  const typeDominant = trouverDominant(typeRepartition, totalEvenements);

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Synthèse</h1>

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
