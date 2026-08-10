import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { BoutonRetour } from "@/components/bouton-retour";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";
import { ImpressionAutomatique } from "@/components/impression-automatique";
import { Logigramme, type NoeudLogigramme } from "@/components/logigramme";
import { ArbreCausesLecture } from "@/components/arbre-causes-lecture";
import {
  ORIGINE_LABELS,
  STATUT_ACTION_COLORS,
  STATUT_ACTION_LABELS,
  STATUT_DOSSIER_ECART_COLORS,
  STATUT_DOSSIER_ECART_LABELS,
  STATUT_FICHE_COLORS,
  STATUT_FICHE_LABELS,
  TYPE_ACTION_LABELS,
} from "@/lib/labels";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const dossier = await prisma.dossier.findUnique({ where: { id }, select: { reference: true } });
  return { title: dossier ? `Rapport ${dossier.reference}` : "Rapport de dossier" };
}

const fr = (d: Date | null | undefined) => (d ? d.toLocaleDateString("fr-FR") : "—");

function Champ({ libelle, children }: { libelle: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-slate-500">{libelle}</dt>
      <dd className="text-sm text-slate-900">{children || "—"}</dd>
    </div>
  );
}

export default async function RapportDossierPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ impression?: string }>;
}) {
  const { id } = await params;
  const { impression } = await searchParams;

  const dossier = await prisma.dossier.findUnique({
    where: { id },
    include: {
      ecarts: {
        orderBy: { reference: "asc" },
        include: {
          actions: { orderBy: { reference: "asc" } },
          fichesSSE: {
            orderBy: { reference: "asc" },
            include: {
              actions: { orderBy: { reference: "asc" } },
              causes: { orderBy: { createdAt: "asc" } },
            },
          },
        },
      },
    },
  });

  if (!dossier) notFound();

  const evenements = dossier.ecarts.flatMap((e) => e.fichesSSE);
  // Une action peut couvrir plusieurs écarts du dossier : sans dédoublonnage,
  // elle serait comptée deux fois dans le total annoncé en tête de rapport.
  const idsActions = new Set([
    ...dossier.ecarts.flatMap((e) => e.actions.map((a) => a.id)),
    ...evenements.flatMap((f) => f.actions.map((a) => a.id)),
  ]);
  const toutesActions = [
    ...dossier.ecarts.flatMap((e) => e.actions),
    ...evenements.flatMap((f) => f.actions),
  ].filter((a, i, tab) => tab.findIndex((b) => b.id === a.id) === i);
  const actionsOuvertes = toutesActions.filter(
    (a) => !["REALISEE", "ANNULEE"].includes(a.statut),
  ).length;

  // Vue d'ensemble : dossier -> écarts -> évènements. Elle s'arrête là. Un
  // écart sans évènement n'occupe qu'une ligne, alors que descendre jusqu'aux
  // actions en ajouterait une par action : la figure dépasserait la page, et
  // un logigramme coupé en deux ne se lit plus. Le détail complet est dans le
  // logigramme de chaque écart, plus bas.
  const apercu: NoeudLogigramme[] = [
    {
      id: dossier.id,
      titre: dossier.reference,
      sousTitre: dossier.chantier,
      etat: STATUT_DOSSIER_ECART_LABELS[dossier.statut],
      ton: "dossier",
      enfants: dossier.ecarts.map((e) => ({
        id: e.id,
        titre: e.reference,
        sousTitre: e.description,
        etat: `${e.fichesSSE.length} évènement(s) · ${e.actions.length} action(s)`,
        ton: "ecart" as const,
        enfants: e.fichesSSE.map((f) => ({
          id: `apercu-${f.id}`,
          titre: f.reference,
          sousTitre: f.typeEvenement ?? f.descriptionFactuelle,
          etat: `${STATUT_FICHE_LABELS[f.statutFiche]} · ${f.actions.length} action(s)`,
          ton: "evenement" as const,
        })),
      })),
    },
  ];

  return (
    <div className="mx-auto max-w-[70rem] px-6 py-8">
      {impression === "1" && <ImpressionAutomatique />}
      <div data-no-print>
        <BoutonRetour href={`/dossiers/${dossier.id}`} label="Retour au dossier" />
      </div>

      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">
              Rapport de dossier — {dossier.reference}
            </h1>
            <Badge
              label={STATUT_DOSSIER_ECART_LABELS[dossier.statut]}
              colorClass={STATUT_DOSSIER_ECART_COLORS[dossier.statut]}
            />
          </div>
          <p className="text-sm text-slate-500">
            {dossier.chantier} · édité le {new Date().toLocaleDateString("fr-FR")}
          </p>
        </div>
        <div data-no-print className="shrink-0">
          <BoutonExportPDF />
        </div>
      </div>

      <section className="mb-8 break-inside-avoid rounded-lg border border-slate-200 bg-white p-6">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
          Identification
        </h2>
        <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <Champ libelle="Chantier">{dossier.chantier}</Champ>
          <Champ libelle="Déclarant">{dossier.declarant}</Champ>
          <Champ libelle="Détecté le">{fr(dossier.dateDetection)}</Champ>
          <Champ libelle="Origine">{ORIGINE_LABELS[dossier.origine]}</Champ>
          <Champ libelle="Écarts">{dossier.ecarts.length}</Champ>
          <Champ libelle="Évènements SSE">{evenements.length}</Champ>
          <Champ libelle="Actions">
            {idsActions.size} dont {actionsOuvertes} ouverte(s)
          </Champ>
          <Champ libelle="Enregistrement joint">{dossier.enregistrementNom}</Champ>
        </dl>
      </section>

      <section className="mb-8">
        <h2 className="mb-3 text-lg font-semibold text-slate-900">Vue d&apos;ensemble</h2>
        {dossier.ecarts.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun écart rattaché à ce dossier.</p>
        ) : (
          <Logigramme
            racines={apercu}
            legende={[
              { ton: "dossier", libelle: "Dossier" },
              { ton: "ecart", libelle: "Écart" },
              { ton: "evenement", libelle: "Évènement SSE" },
            ]}
          />
        )}
      </section>

      {dossier.ecarts.map((ecart) => {
        // Chaque écart porte son propre logigramme : petit, il tient sur la
        // page et se lit sans revenir à la vue d'ensemble.
        const arbre: NoeudLogigramme[] = [
          {
            id: ecart.id,
            titre: ecart.reference,
            sousTitre: ecart.description,
            etat: STATUT_DOSSIER_ECART_LABELS[ecart.statut],
            ton: "ecart",
            enfants: [
              ...ecart.fichesSSE.map((f) => ({
                id: f.id,
                titre: f.reference,
                sousTitre: f.typeEvenement ?? f.descriptionFactuelle,
                etat: STATUT_FICHE_LABELS[f.statutFiche],
                ton: "evenement" as const,
                enfants: f.actions.map((a) => ({
                  id: a.id,
                  titre: a.reference,
                  sousTitre: a.action,
                  etat: `${a.responsable} · ${STATUT_ACTION_LABELS[a.statut]}`,
                  ton: "action" as const,
                })),
              })),
              ...ecart.actions.map((a) => ({
                id: a.id,
                titre: a.reference,
                sousTitre: a.action,
                etat: `${a.responsable} · ${STATUT_ACTION_LABELS[a.statut]}`,
                ton: "action" as const,
              })),
            ],
          },
        ];

        return (
          // Pas de saut de page forcé par écart : quatorze écarts feraient
          // quatorze pages, dont certaines presque vides. Ce sont les blocs
          // (cartes, figures, tableaux) qui refusent d'être coupés.
          <section key={ecart.id} className="mb-8">
            <h2 className="mb-1 break-after-avoid text-lg font-semibold text-slate-900">
              Écart {ecart.reference}{" "}
              <Badge
                label={STATUT_DOSSIER_ECART_LABELS[ecart.statut]}
                colorClass={STATUT_DOSSIER_ECART_COLORS[ecart.statut]}
              />
            </h2>
            <p className="mb-4 break-after-avoid text-sm text-slate-500">
              Détecté le {fr(ecart.dateDetection)} · {ORIGINE_LABELS[ecart.origine]} ·{" "}
              {ecart.declarant}
            </p>

            <div className="mb-4 break-inside-avoid rounded-lg border border-slate-200 bg-white p-5">
              <dl className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <Champ libelle="Natures">{ecart.natures.join(", ")}</Champ>
                <Champ libelle="Domaines">{ecart.domaines.join(", ")}</Champ>
                <Champ libelle="Thèmes">{ecart.theme.join(", ")}</Champ>
                <Champ libelle="Criticité">
                  {ecart.criticite
                    ? `${ecart.criticite} (G${ecart.gravite ?? "—"} × F${ecart.frequence ?? "—"})`
                    : null}
                </Champ>
              </dl>
              <dl className="mt-4 grid gap-4">
                <Champ libelle="Description">{ecart.description}</Champ>
                <Champ libelle="Mesure immédiate">{ecart.mesureImmediate}</Champ>
                <Champ libelle="Cause">{ecart.cause}</Champ>
              </dl>
            </div>

            <Logigramme
              racines={arbre}
              legende={[
                { ton: "ecart", libelle: "Écart" },
                { ton: "evenement", libelle: "Évènement SSE" },
                { ton: "action", libelle: "Action" },
              ]}
            />

            {ecart.fichesSSE.length > 0 && (
              <div className="mt-5">
                <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
                  Évènements SSE ({ecart.fichesSSE.length})
                </h3>
                {ecart.fichesSSE.map((f) => (
                  <div
                    key={f.id}
                    className="mb-3 break-inside-avoid rounded-lg border border-slate-200 bg-white p-5"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-3">
                      <span className="font-medium text-slate-900">{f.reference}</span>
                      <Badge
                        label={STATUT_FICHE_LABELS[f.statutFiche]}
                        colorClass={STATUT_FICHE_COLORS[f.statutFiche]}
                      />
                      <span className="text-sm text-slate-500">
                        {f.typeEvenement ?? "—"} · {fr(f.dateHeure)} · {f.nomChantier ?? "—"}
                      </span>
                    </div>
                    <dl className="grid gap-3">
                      <Champ libelle="Description factuelle">{f.descriptionFactuelle}</Champ>
                      <Champ libelle="Mesures immédiates">{f.mesuresImmediatesPrises}</Champ>
                      <Champ libelle="Criticité">
                        {f.criticite
                          ? `${f.criticite} (G${f.gravite ?? "—"} × F${f.frequence ?? "—"})`
                          : null}
                      </Champ>
                      <Champ libelle="Type d'analyse">{f.typeAnalyse}</Champ>
                    </dl>

                    {/* L'analyse des causes est ce qu'un auditeur vient
                        chercher en premier : elle figure au rapport dès qu'elle
                        existe, sans avoir à ouvrir la fiche. */}
                    {f.causes.length > 0 && (
                      <div className="mt-3 break-inside-avoid">
                        <h4 className="mb-1 text-xs uppercase tracking-wide text-slate-500">
                          Analyse des causes ({f.causes.length})
                        </h4>
                        <ArbreCausesLecture causes={f.causes} />
                      </div>
                    )}
                    {f.actions.length > 0 && (
                      <TableauActions
                        titre={`Actions de l'évènement (${f.actions.length})`}
                        actions={f.actions}
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {ecart.actions.length > 0 && (
              <div className="mt-5 break-inside-avoid">
                <TableauActions
                  titre={`Actions de l'écart (${ecart.actions.length})`}
                  actions={ecart.actions}
                />
              </div>
            )}

            {ecart.fichesSSE.length === 0 && ecart.actions.length === 0 && (
              <p className="mt-4 text-sm text-slate-400">
                Aucun évènement ni action rattaché à cet écart.
              </p>
            )}
          </section>
        );
      })}

      <p data-no-print className="mt-8 text-sm text-slate-400">
        <Link href={`/dossiers/${dossier.id}`} className="hover:underline">
          Retour au dossier {dossier.reference}
        </Link>
      </p>
    </div>
  );
}

function TableauActions({
  titre,
  actions,
}: {
  titre: string;
  actions: {
    id: string;
    reference: string;
    action: string;
    type: string;
    responsable: string;
    echeance: Date | null;
    realiseeLe: Date | null;
    statut: keyof typeof STATUT_ACTION_LABELS;
  }[];
}) {
  return (
    <div className="mt-4">
      <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">{titre}</h3>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-3 py-2 font-medium">Réf.</th>
              <th className="px-3 py-2 font-medium">Action</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 font-medium">Responsable</th>
              <th className="px-3 py-2 font-medium">Échéance</th>
              <th className="px-3 py-2 font-medium">Réalisée le</th>
              <th className="px-3 py-2 font-medium">État</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 last:border-0">
                <td className="whitespace-nowrap px-3 py-2 font-medium text-slate-900">
                  {a.reference}
                </td>
                <td className="px-3 py-2 text-slate-700">{a.action}</td>
                <td className="px-3 py-2 text-slate-700">{TYPE_ACTION_LABELS[a.type]}</td>
                <td className="px-3 py-2 text-slate-700">{a.responsable}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{fr(a.echeance)}</td>
                <td className="whitespace-nowrap px-3 py-2 text-slate-700">{fr(a.realiseeLe)}</td>
                <td className="whitespace-nowrap px-3 py-2">
                  <Badge
                    label={STATUT_ACTION_LABELS[a.statut]}
                    colorClass={STATUT_ACTION_COLORS[a.statut]}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
