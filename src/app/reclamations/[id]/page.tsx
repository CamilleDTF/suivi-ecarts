import { ORDRE_ACTIONS } from "@/lib/ordre-actions";
import { dateHeureParis, dateParis } from "@/lib/date-paris";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  STATUT_RECLAMATION_LABELS,
  TYPE_RECLAMATION_LABELS,
  TYPE_ACTIVITE_LABELS,
  STATUT_FICHE_LABELS,
  TYPE_ACTION_LABELS,
  STATUT_ACTION_LABELS,
} from "@/lib/labels";
import {
  mettreAJourReclamation,
  mettreAJourStatutReclamation,
  supprimerReclamation,
} from "@/app/reclamations/actions";
import { archiver, desarchiver } from "@/app/archivage/actions";
import { compterImpactSuppressionReclamation } from "@/lib/suppression";
import { criticiteMax, suggestionsReclamation } from "@/lib/reclamations";
import { BadgeStatut, type TonStatut } from "@/components/badge-statut";
import { Chronologie, type EvenementChrono } from "@/components/chronologie";
import { DossierEnregistrement } from "@/components/dossier-enregistrement";
import { BoutonModifier, EditionEnPlace, ZoneEdition, ZoneLecture } from "@/components/edition-en-place";
import { Carte, EtatVide, FicheSection, Pastilles, Propriete, Proprietes, TexteLong } from "@/components/fiche";
import { ParcoursTraitement, type EtapeParcours } from "@/components/parcours-traitement";
import { ReclamationFields } from "@/components/reclamation-fields";
import { StatutParcours } from "@/components/statut-parcours";
import { BoutonArchiver } from "@/components/bouton-archiver";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TON_STATUT: Record<string, TonStatut> = {
  OUVERTE: "ambre",
  EN_COURS: "bleu",
  CLOTUREE: "vert",
};
const TON_CRITICITE: Record<string, TonStatut> = { Faible: "vert", Moyenne: "ambre", Élevée: "rouge" };
const TON_FICHE: Record<string, TonStatut> = { EN_COURS: "bleu", FINALISEE: "vert" };
const TON_ACTION: Record<string, TonStatut> = {
  A_FAIRE: "neutre",
  EN_COURS: "bleu",
  EN_RETARD: "rouge",
  REALISEE: "vert",
  ANNULEE: "neutre",
};
const ETAPES_STATUT = (["OUVERTE", "EN_COURS", "CLOTUREE"] as const).map((s) => ({
  value: s,
  label: STATUT_RECLAMATION_LABELS[s],
  ton: TON_STATUT[s],
}));

// Le navigateur nomme le PDF d’après le titre du document : sans titre
// propre à la fiche, tous les exports s’enregistreraient sous le même nom.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fiche = await prisma.reclamation.findUnique({ where: { id }, select: { reference: true } });
  return { title: fiche ? `Réclamation ${fiche.reference}` : "Réclamation" };
}

export default async function ReclamationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const reclamation = await prisma.reclamation.findUnique({
    where: { id },
    include: {
      points: { orderBy: { ordre: "asc" } },
      fichesSSE: {
        orderBy: { createdAt: "desc" },
        select: { id: true, reference: true, typeEvenement: true, emetteur: true, statutFiche: true, createdAt: true },
      },
      // `select` : jamais la preuve (photo/PDF en data URL) d'une action.
      actions: {
        orderBy: ORDRE_ACTIONS,
        select: {
          id: true,
          reference: true,
          type: true,
          action: true,
          responsable: true,
          echeance: true,
          statut: true,
          realiseeLe: true,
        },
      },
    },
  });

  if (!reclamation) notFound();

  const [impact, { chantiersConnus, emetteursConnus }] = await Promise.all([
    compterImpactSuppressionReclamation(reclamation.id),
    suggestionsReclamation(),
  ]);

  const criticite = criticiteMax(reclamation.points);
  const aAnalyse = !!reclamation.analyse?.trim();
  const actionsSoldees = reclamation.actions.filter((a) => a.statut === "REALISEE" || a.statut === "ANNULEE").length;
  const parcours: EtapeParcours[] = [
    {
      label: "Réception",
      legende: `${reclamation.dateReception.toLocaleDateString("fr-FR")} · ${reclamation.emetteur}`,
      fait: true,
    },
    { label: "Analyse", legende: aAnalyse ? "Renseignée" : "À analyser", fait: aAnalyse },
    {
      label: "Actions",
      legende:
        reclamation.actions.length === 0
          ? "Aucune action"
          : `${actionsSoldees}/${reclamation.actions.length} soldée${actionsSoldees > 1 ? "s" : ""}`,
      fait: reclamation.actions.length > 0 && actionsSoldees === reclamation.actions.length,
    },
    {
      label: "Réponse",
      legende: reclamation.dateReponse ? `Le ${reclamation.dateReponse.toLocaleDateString("fr-FR")}` : "En attente",
      fait: !!reclamation.dateReponse,
    },
    {
      label: "Clôture",
      legende: reclamation.statut === "CLOTUREE" ? "Clôturée" : "En attente",
      fait: reclamation.statut === "CLOTUREE",
    },
  ];

  const chrono: EvenementChrono[] = [
    {
      date: reclamation.dateReception,
      titre: `${TYPE_RECLAMATION_LABELS[reclamation.type]} reçue`,
      detail: [reclamation.emetteur, reclamation.canal].filter(Boolean).join(" · "),
      rang: 0,
      ton: "ambre",
    },
    ...reclamation.fichesSSE.map<EvenementChrono>((f) => ({
      date: f.createdAt,
      titre: `Évènement SSE ${f.reference} ouvert`,
      detail: STATUT_FICHE_LABELS[f.statutFiche],
      href: `/fiches-sse/${f.id}`,
      rang: 2,
      ton: "bleu",
    })),
    // Comme ailleurs, seule la réalisation d'une action entre à l'historique.
    ...reclamation.actions
      .filter((a) => a.realiseeLe)
      .map<EvenementChrono>((a) => ({
        date: a.realiseeLe!,
        titre: `Action ${a.reference} réalisée`,
        detail: `${a.action} — ${a.responsable}`,
        href: `/plan-action/${a.id}`,
        rang: 4,
        ton: "vert",
      })),
    ...(reclamation.dateReponse
      ? [{ date: reclamation.dateReponse, titre: "Réponse apportée", rang: 5, ton: "violet" as const }]
      : []),
    ...(reclamation.modifieLe
      ? [
          {
            date: reclamation.modifieLe,
            titre: "Fiche modifiée",
            detail: reclamation.modifiePar ? `Par ${reclamation.modifiePar}` : undefined,
            rang: 6,
            ton: "neutre" as const,
          },
        ]
      : []),
  ];

  const lienAjout = buttonVariants({ variant: "outline", size: "sm" });

  return (
    <EditionEnPlace>
      <div className="mx-auto max-w-[100rem] px-4 py-8 lg:px-8">
        <nav
          data-no-print
          aria-label="Fil d'Ariane"
          className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"
        >
          <Link href="/reclamations" className="hover:text-foreground hover:underline">
            Réclamations
          </Link>
          <ChevronRightIcon className="size-3.5" aria-hidden />
          <span className="text-foreground">{reclamation.reference}</span>
        </nav>

        {/* Un <div> et non un <header> : la feuille d'impression masque les
            <header>, le titre disparaîtrait du PDF. */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 max-w-3xl space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold tracking-wide text-primary-foreground">
                {reclamation.reference}
              </span>
              <BadgeStatut label={TYPE_RECLAMATION_LABELS[reclamation.type]} ton="violet" />
              <BadgeStatut label={STATUT_RECLAMATION_LABELS[reclamation.statut]} ton={TON_STATUT[reclamation.statut]} />
              {criticite && (
                <BadgeStatut label={`Criticité ${criticite.toLowerCase()}`} ton={TON_CRITICITE[criticite] ?? "neutre"} />
              )}
            </div>
            <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">{reclamation.objet}</h1>
          </div>
          <div data-no-print className="flex items-center gap-2">
            <BoutonModifier />
            <Link href={`/plan-action/nouveau?reclamationId=${reclamation.id}`} className={buttonVariants({ size: "lg" })}>
              <PlusIcon /> Action
            </Link>
          </div>
        </div>

        <div className="mb-8 space-y-3">
          <ParcoursTraitement etapes={parcours} />
          <StatutParcours
            action={mettreAJourStatutReclamation}
            id={reclamation.id}
            etapes={ETAPES_STATUT}
            courant={reclamation.statut}
          />
        </div>

        <ZoneEdition
          titre={`Modifier ${reclamation.reference}`}
          description="Les changements sont enregistrés pour tous."
          action={mettreAJourReclamation}
          hiddenFields={{ id: reclamation.id }}
        >
          <ReclamationFields v={reclamation} chantiersConnus={chantiersConnus} emetteursConnus={emetteursConnus} />
        </ZoneEdition>

        <ZoneLecture>
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
            <div className="space-y-8">
              {reclamation.description?.trim() && (
                <Carte className="p-5">
                  <TexteLong label="Description" valeur={reclamation.description} />
                </Carte>
              )}

              <FicheSection titre="Points soulevés" compteur={reclamation.points.length}>
                {reclamation.points.length === 0 ? (
                  <EtatVide>Aucun point n’a été détaillé.</EtatVide>
                ) : (
                  <Carte className="overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead className="w-10">N°</TableHead>
                          <TableHead>Point</TableHead>
                          <TableHead>Cause</TableHead>
                          <TableHead className="text-right">Criticité</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reclamation.points.map((p) => (
                          <TableRow key={p.id}>
                            <TableCell className="align-top tabular-nums text-muted-foreground">{p.ordre}</TableCell>
                            <TableCell className="max-w-md whitespace-pre-line align-top">{p.description}</TableCell>
                            <TableCell className="max-w-xs whitespace-pre-line align-top text-muted-foreground">
                              {p.cause || "—"}
                            </TableCell>
                            <TableCell className="text-right align-top">
                              {p.criticite ? (
                                <BadgeStatut
                                  label={`${p.criticite} (${p.gravite}×${p.frequence})`}
                                  ton={TON_CRITICITE[p.criticite] ?? "neutre"}
                                />
                              ) : (
                                <span className="text-muted-foreground">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Carte>
                )}
              </FicheSection>

              <div className="grid gap-4 sm:grid-cols-2">
                <Carte className="p-5">
                  <TexteLong label="Analyse" valeur={reclamation.analyse} />
                </Carte>
                <Carte className="p-5">
                  <TexteLong
                    label={
                      reclamation.dateReponse
                        ? `Réponse du ${reclamation.dateReponse.toLocaleDateString("fr-FR")}`
                        : "Réponse apportée"
                    }
                    valeur={reclamation.reponse}
                  />
                </Carte>
              </div>

              {(reclamation.domaines.length > 0 || reclamation.theme.length > 0) && (
                <Carte className="grid gap-4 p-5 sm:grid-cols-2">
                  <Pastilles label="Domaine" valeurs={reclamation.domaines} />
                  <Pastilles label="Thème" valeurs={reclamation.theme} />
                </Carte>
              )}

              <FicheSection
                titre="Plan d’action"
                compteur={reclamation.actions.length}
                action={
                  <Link
                    href={`/plan-action/nouveau?reclamationId=${reclamation.id}`}
                    className={lienAjout}
                    data-no-print
                  >
                    <PlusIcon /> Action
                  </Link>
                }
              >
                {reclamation.actions.length === 0 ? (
                  <EtatVide>Aucune action n’a encore été définie pour cette réclamation.</EtatVide>
                ) : (
                  <Carte className="overflow-hidden">
                    <Table>
                      <TableBody>
                        {reclamation.actions.map((a) => (
                          <TableRow key={a.id}>
                            <TableCell className="whitespace-nowrap">
                              <Link href={`/plan-action/${a.id}`} className="font-medium underline-offset-4 hover:underline">
                                {a.reference}
                              </Link>
                              <span className="mt-0.5 block text-xs text-muted-foreground">{TYPE_ACTION_LABELS[a.type]}</span>
                            </TableCell>
                            <TableCell className="max-w-sm whitespace-normal">{a.action}</TableCell>
                            <TableCell className="whitespace-nowrap text-muted-foreground">
                              {a.responsable}
                              <span className="mt-0.5 block text-xs tabular-nums">
                                {a.echeance ? `avant le ${a.echeance.toLocaleDateString("fr-FR")}` : "sans échéance"}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <BadgeStatut label={STATUT_ACTION_LABELS[a.statut]} ton={TON_ACTION[a.statut]} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Carte>
                )}
              </FicheSection>

              <FicheSection
                titre="Évènements SSE"
                compteur={reclamation.fichesSSE.length}
                action={
                  <Link href={`/fiches-sse/nouveau?reclamationId=${reclamation.id}`} className={lienAjout} data-no-print>
                    <PlusIcon /> Évènement
                  </Link>
                }
              >
                {reclamation.fichesSSE.length === 0 ? (
                  <EtatVide>Aucun évènement SSE n’est lié à cette réclamation.</EtatVide>
                ) : (
                  <Carte className="overflow-hidden">
                    <Table>
                      <TableBody>
                        {reclamation.fichesSSE.map((f) => (
                          <TableRow key={f.id}>
                            <TableCell>
                              <Link href={`/fiches-sse/${f.id}`} className="font-medium underline-offset-4 hover:underline">
                                {f.reference}
                              </Link>
                            </TableCell>
                            <TableCell className="text-muted-foreground">{f.typeEvenement || "—"}</TableCell>
                            <TableCell className="text-right">
                              <BadgeStatut label={STATUT_FICHE_LABELS[f.statutFiche]} ton={TON_FICHE[f.statutFiche]} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </Carte>
                )}
              </FicheSection>

              <FicheSection titre="Courrier du plaignant">
                {reclamation.enregistrement ? (
                  <Carte className="p-5">
                    <DossierEnregistrement valeur={reclamation.enregistrement} nom={reclamation.enregistrementNom} />
                  </Carte>
                ) : (
                  <EtatVide>Aucun courrier n’est joint à cette réclamation.</EtatVide>
                )}
              </FicheSection>

              <details className="group rounded-xl border bg-card">
                <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
                  <ChevronRightIcon
                    className="size-4 text-muted-foreground transition-transform group-open:rotate-90"
                    aria-hidden
                  />
                  Historique
                  <span className="font-normal text-muted-foreground">{chrono.length}</span>
                </summary>
                <div className="border-t px-6 py-6">
                  <Chronologie evenements={chrono} />
                </div>
              </details>
            </div>

            <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
              <Carte>
                <Proprietes>
                  <Propriete label="Type">{TYPE_RECLAMATION_LABELS[reclamation.type]}</Propriete>
                  <Propriete label="Reçue le">{reclamation.dateReception.toLocaleDateString("fr-FR")}</Propriete>
                  <Propriete label="Émetteur">{reclamation.emetteur}</Propriete>
                  <Propriete label="Canal">{reclamation.canal || "—"}</Propriete>
                  <Propriete label="Chantier">{reclamation.chantier || "—"}</Propriete>
                  <Propriete label="Activité">
                    {reclamation.typeActivite ? TYPE_ACTIVITE_LABELS[reclamation.typeActivite] : "—"}
                  </Propriete>
                  <Propriete label="Enregistrée par">{reclamation.personneSaisie || "—"}</Propriete>
                </Proprietes>
              </Carte>
              <div data-no-print className="flex flex-wrap gap-2 pt-1">
                <BoutonExportPDF className="" />
                <BoutonArchiver
                  action={reclamation.archiveLe ? desarchiver : archiver}
                  entite="reclamation"
                  id={reclamation.id}
                  archive={!!reclamation.archiveLe}
                  className=""
                />
                <BoutonSupprimer
                  action={supprimerReclamation}
                  hiddenFields={{ id: reclamation.id }}
                  message={`Supprimer cette réclamation supprimera aussi ${impact.fiches} évènement(s) SSE et ${impact.actions} action(s) lié(s). Cette action est irréversible. Continuer ?`}
                  className=""
                />
              </div>
              <p className="px-1 text-xs text-muted-foreground">
                Créée le {dateParis(reclamation.createdAt)}
                {reclamation.modifieLe &&
                  ` · modifiée le ${dateHeureParis(reclamation.modifieLe)}${
                    reclamation.modifiePar ? ` par ${reclamation.modifiePar}` : ""
                  }`}
              </p>
            </aside>
          </div>
        </ZoneLecture>
      </div>
    </EditionEnPlace>
  );
}
