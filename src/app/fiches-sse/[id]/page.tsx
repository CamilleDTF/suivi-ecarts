import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon, ChevronRightIcon, PlusIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  STATUT_FICHE_LABELS,
  TYPE_ACTION_LABELS,
  STATUT_ACTION_LABELS,
  STATUT_REX_LABELS,
  libelleRattachement,
} from "@/lib/labels";
import {
  mettreAJourFicheSSE,
  finaliserFicheSSE,
  supprimerFicheSSE,
  changerRattachementFicheSSE,
} from "@/app/fiches-sse/actions";
import { archiver, desarchiver } from "@/app/archivage/actions";
import { ArbreCauses } from "@/components/arbre-causes";
import { ArbreCausesLecture } from "@/components/arbre-causes-lecture";
import { BadgeStatut, type TonStatut } from "@/components/badge-statut";
import { BoutonArchiver } from "@/components/bouton-archiver";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { ChangerRattachement } from "@/components/changer-rattachement";
import { Chronologie, type EvenementChrono } from "@/components/chronologie";
import { EditionPanneau } from "@/components/edition-panneau";
import { Carte, EtatVide, FicheSection, Pastilles, Propriete, Proprietes, TexteLong } from "@/components/fiche";
import { FicheSSEFields } from "@/components/fiche-sse-fields";
import { MatriceRisque } from "@/components/matrice-risque";
import { ParcoursTraitement, type EtapeParcours } from "@/components/parcours-traitement";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

const TON_FICHE: Record<string, TonStatut> = { BROUILLON: "neutre", EN_COURS: "bleu", FINALISEE: "vert" };
const TON_CRITICITE: Record<string, TonStatut> = { Faible: "vert", Moyenne: "ambre", Élevée: "rouge" };
const TON_ACTION: Record<string, TonStatut> = {
  A_FAIRE: "neutre",
  EN_COURS: "bleu",
  EN_RETARD: "rouge",
  REALISEE: "vert",
  ANNULEE: "neutre",
};

// Les types d'analyse qui ouvrent l'arbre des causes dans le formulaire (à
// garder alignés avec fiche-sse-fields.tsx, composant client dont une
// constante ne peut pas être lue ici).
const TYPES_ANALYSE_AVEC_ARBRE_CAUSES = ["Analyse des causes", "Arbre des causes + analyse collective"];

// Les dates saisies sont lues et réécrites en UTC par le formulaire : la
// lecture les affiche dans le même fuseau, pour que fiche et formulaire
// montrent la même heure.
const dateHeure = (d: Date) => d.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" });
const jour = (d: Date) => d.toLocaleDateString("fr-FR", { timeZone: "UTC" });
const ouiNon = (v?: boolean | null) => (v ? "Oui" : "Non");

// Le navigateur nomme le PDF d’après le titre du document : sans titre
// propre à la fiche, tous les exports s’enregistreraient sous le même nom.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fiche = await prisma.ficheSSE.findUnique({ where: { id }, select: { reference: true } });
  return { title: fiche ? `Évènement SSE ${fiche.reference}` : "Évènement SSE" };
}

export default async function FicheSSEDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const fiche = await prisma.ficheSSE.findUnique({
    where: { id },
    include: {
      // Références et chantier seulement : jamais `enregistrement` (photo/PDF
      // en data URL) du dossier de l'écart.
      ecart: { select: { id: true, reference: true, dossier: { select: { chantier: true } } } },
      ecartAmiante: { select: { id: true, reference: true, nomChantier: true } },
      causes: { orderBy: { createdAt: "asc" } },
      remontees: { orderBy: { reference: "asc" }, select: { id: true, reference: true, objet: true, dateRemontee: true } },
      rex: { orderBy: { createdAt: "desc" }, select: { id: true, reference: true, titre: true, statut: true, createdAt: true } },
    },
  });

  if (!fiche) notFound();
  const estBrouillon = fiche.statutFiche === "BROUILLON";

  const rattachements: {
    ficheSSEId?: string;
    ecarts?: { some: { id: string } };
    ecartAmianteId?: string;
  }[] = [{ ficheSSEId: fiche.id }];
  if (fiche.ecartId) rattachements.push({ ecarts: { some: { id: fiche.ecartId } } });
  if (fiche.ecartAmianteId) rattachements.push({ ecartAmianteId: fiche.ecartAmianteId });

  const actions = await prisma.action.findMany({
    where: { OR: rattachements },
    orderBy: { createdAt: "desc" },
    // `select` : jamais la preuve (photo/PDF en data URL) d'une action, qui
    // serait téléchargée en entier pour une simple ligne de tableau.
    select: {
      id: true,
      reference: true,
      type: true,
      action: true,
      responsable: true,
      echeance: true,
      statut: true,
      createdAt: true,
      realiseeLe: true,
      ficheSSEId: true,
      ecartAmianteId: true,
      ecarts: { select: { id: true } },
    },
  });

  const ficheId = fiche.id;
  const actionsDirectes = actions.filter((a) => a.ficheSSEId === ficheId).length;
  function origineAction(a: (typeof actions)[number]) {
    if (a.ficheSSEId === ficheId) return "Évènement";
    if (a.ecarts.length > 0) return "Écart";
    if (a.ecartAmianteId) return "Écart amiante";
    return "—";
  }

  // Listes proposées pour corriger un rattachement erroné.
  const [ecartsChoix, amianteChoix] = await Promise.all([
    prisma.ecart.findMany({
      orderBy: { reference: "asc" },
      select: { id: true, reference: true, description: true, dossier: { select: { chantier: true } } },
    }),
    prisma.ecartAmiante.findMany({
      orderBy: { reference: "asc" },
      select: { id: true, reference: true, nomChantier: true, numeroChantier: true, description: true },
    }),
  ]);

  const titre = fiche.typeEvenement?.trim() || "Évènement SSE sans type";
  const sousTitre = [fiche.nomChantier?.trim(), fiche.dateHeure && dateHeure(fiche.dateHeure)].filter(Boolean).join(" · ");

  const aMesure = !!fiche.mesuresImmediatesPrises?.trim();
  const aTypeAnalyse = !!fiche.typeAnalyse?.trim();
  const actionsSoldees = actions.filter((a) => a.statut === "REALISEE" || a.statut === "ANNULEE").length;
  const parcours: EtapeParcours[] = [
    {
      label: "Déclaration",
      legende: `${fiche.dateHeure ? jour(fiche.dateHeure) : "Date non saisie"}${fiche.emetteur ? ` · ${fiche.emetteur}` : ""}`,
      fait: true,
    },
    { label: "Mesures immédiates", legende: aMesure ? "Renseignées" : "À renseigner", fait: aMesure },
    {
      label: "Analyse des causes",
      legende: fiche.causes.length > 0 ? `${fiche.causes.length} cause${fiche.causes.length > 1 ? "s" : ""}` : (fiche.typeAnalyse?.trim() || "À analyser"),
      fait: aTypeAnalyse,
    },
    {
      label: "Actions",
      legende: actions.length === 0 ? "Aucune action" : `${actionsSoldees}/${actions.length} soldée${actionsSoldees > 1 ? "s" : ""}`,
      fait: actions.length > 0 && actionsSoldees === actions.length,
    },
    {
      label: "Clôture",
      legende: fiche.statutFiche === "FINALISEE" ? "Finalisé" : fiche.statutFiche === "EN_COURS" ? "Actions en cours" : "Brouillon",
      fait: fiche.statutFiche === "FINALISEE",
    },
  ];

  const chrono: EvenementChrono[] = [
    ...(fiche.dateHeure
      ? [
          {
            date: fiche.dateHeure,
            titre: "Évènement survenu",
            detail: fiche.emetteur ? `Déclaré par ${fiche.emetteur}` : undefined,
            rang: 0,
            ton: "ambre" as const,
          },
        ]
      : []),
    { date: fiche.createdAt, titre: "Fiche ouverte", rang: 1, ton: "bleu" },
    ...fiche.remontees.map<EvenementChrono>((r) => ({
      date: r.dateRemontee,
      titre: `Remontée rattachée ${r.reference}`,
      detail: r.objet,
      href: `/remontees/${r.id}`,
      rang: 1,
      ton: "violet",
    })),
    ...actions.flatMap<EvenementChrono>((a) => [
      {
        date: a.createdAt,
        titre: `Action ${a.reference} créée`,
        detail: `${a.action} — ${a.responsable}`,
        href: `/plan-action/${a.id}`,
        rang: 3,
        ton: "bleu",
      },
      ...(a.realiseeLe
        ? [{ date: a.realiseeLe, titre: `Action ${a.reference} réalisée`, href: `/plan-action/${a.id}`, rang: 4, ton: "vert" as const }]
        : []),
    ]),
    ...fiche.rex.map<EvenementChrono>((r) => ({
      date: r.createdAt,
      titre: `REX ${r.reference} créé`,
      detail: r.titre,
      href: `/rex/${r.id}`,
      rang: 5,
      ton: "violet",
    })),
    ...(fiche.modifieLe
      ? [
          {
            date: fiche.modifieLe,
            titre: "Fiche modifiée",
            detail: fiche.modifiePar ? `Par ${fiche.modifiePar}` : undefined,
            rang: 6,
            ton: "neutre" as const,
          },
        ]
      : []),
  ];

  const afficherArbre = TYPES_ANALYSE_AVEC_ARBRE_CAUSES.includes(fiche.typeAnalyse ?? "") || fiche.causes.length > 0;
  const autresRenseigne = fiche.miseAJourNecessaire.includes("Autres") || !!fiche.miseAJourAutrePrecision?.trim();
  const lienAjout = buttonVariants({ variant: "outline", size: "sm" });

  return (
    <div className="mx-auto max-w-[80rem] px-4 py-8 lg:px-8">
      <nav data-no-print aria-label="Fil d'Ariane" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/fiches-sse" className="hover:text-foreground hover:underline">
          Évènements SSE
        </Link>
        {fiche.ecart && (
          <>
            <ChevronRightIcon className="size-3.5" aria-hidden />
            <Link href={`/ecarts/${fiche.ecart.id}`} className="hover:text-foreground hover:underline">
              Écart {fiche.ecart.reference}
            </Link>
          </>
        )}
        {fiche.ecartAmiante && (
          <>
            <ChevronRightIcon className="size-3.5" aria-hidden />
            <Link href={`/ecart-amiante/${fiche.ecartAmiante.id}`} className="hover:text-foreground hover:underline">
              Écart amiante {fiche.ecartAmiante.reference}
            </Link>
          </>
        )}
        <ChevronRightIcon className="size-3.5" aria-hidden />
        <span className="text-foreground">{fiche.reference}</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold tracking-wide text-primary-foreground">
              {fiche.reference}
            </span>
            <BadgeStatut label={STATUT_FICHE_LABELS[fiche.statutFiche]} ton={TON_FICHE[fiche.statutFiche]} />
            {fiche.criticite && (
              <BadgeStatut label={`Criticité ${fiche.criticite.toLowerCase()}`} ton={TON_CRITICITE[fiche.criticite] ?? "neutre"} />
            )}
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">{titre}</h1>
          {sousTitre && <p className="text-sm text-muted-foreground">{sousTitre}</p>}
        </div>
        <div data-no-print className="flex flex-wrap items-center gap-2">
          <EditionPanneau
            titre={`Modifier ${fiche.reference}`}
            description={
              estBrouillon
                ? "L'évènement reste en brouillon tant qu'il n'est pas finalisé."
                : "Les changements sont enregistrés pour tous."
            }
            action={mettreAJourFicheSSE}
            hiddenFields={{ id: fiche.id }}
          >
            <FicheSSEFields v={fiche} apresTypeAnalyse={<ArbreCauses ficheSSEId={fiche.id} causes={fiche.causes} />} />
          </EditionPanneau>
          <Link
            href={`/plan-action/nouveau?ficheSSEId=${fiche.id}`}
            className={buttonVariants({ variant: estBrouillon ? "outline" : "default", size: "lg" })}
          >
            <PlusIcon /> Action
          </Link>
          {estBrouillon && (
            <form action={finaliserFicheSSE}>
              <input type="hidden" name="id" value={fiche.id} />
              <button type="submit" className={buttonVariants({ size: "lg" })}>
                <CheckIcon /> Finaliser l&apos;évènement
              </button>
            </form>
          )}
        </div>
      </header>

      <div className="mb-8">
        <ParcoursTraitement etapes={parcours} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-8">
          <FicheSection titre="1. Déclaration">
            <Carte className="divide-y">
              <div className="grid sm:grid-cols-2">
                <Proprietes>
                  <Propriete label="Numéro interne">{fiche.numeroInterne || "—"}</Propriete>
                  <Propriete label="Émetteur">{fiche.emetteur || "—"}</Propriete>
                  <Propriete label="Date et heure">{fiche.dateHeure ? dateHeure(fiche.dateHeure) : "—"}</Propriete>
                  <Propriete label="Nom du chantier">{fiche.nomChantier || "—"}</Propriete>
                </Proprietes>
                <div className="border-t sm:border-l sm:border-t-0">
                  <Proprietes>
                    <Propriete label="Lieu / zone">{fiche.lieuZone || "—"}</Propriete>
                    <Propriete label="Personnes impliquées">{fiche.personnesImpliquees || "—"}</Propriete>
                    <Propriete label="Témoins">{fiche.temoins || "—"}</Propriete>
                  </Proprietes>
                </div>
              </div>
              {(fiche.domaine.length > 0 || fiche.theme.length > 0) && (
                <div className="grid gap-4 p-5 sm:grid-cols-2">
                  <Pastilles label="Domaine" valeurs={fiche.domaine} />
                  <Pastilles label="Thème" valeurs={fiche.theme} />
                </div>
              )}
              <div className="p-5">
                <TexteLong label="Description factuelle" valeur={fiche.descriptionFactuelle} />
              </div>
            </Carte>
          </FicheSection>

          <FicheSection titre="2. Mesures immédiates">
            <Carte className="p-5">
              <TexteLong label="Mesures prises" valeur={fiche.mesuresImmediatesPrises} />
            </Carte>
          </FicheSection>

          <FicheSection titre="3. Évaluation du risque">
            <Carte className="grid sm:grid-cols-[minmax(0,1fr)_16rem]">
              <Proprietes>
                <Propriete label="Type d'évènement">{fiche.typeEvenement || "—"}</Propriete>
                <Propriete label="Gravité">{fiche.gravite || "—"}</Propriete>
                <Propriete label="Fréquence">{fiche.frequence || "—"}</Propriete>
                <Propriete label="Criticité">
                  {fiche.criticite ? <BadgeStatut label={fiche.criticite} ton={TON_CRITICITE[fiche.criticite] ?? "neutre"} /> : "—"}
                </Propriete>
              </Proprietes>
              <div className="border-t p-5 sm:border-l sm:border-t-0">
                <MatriceRisque gravite={fiche.gravite} frequence={fiche.frequence} />
              </div>
            </Carte>
          </FicheSection>

          <FicheSection titre="4. Communication (déclaration externe)">
            <Carte>
              <Proprietes>
                <Propriete label="Déclaration externe nécessaire">{ouiNon(fiche.declarationExterneNecessaire)}</Propriete>
                <Propriete label="Déclaration externe à">{fiche.declarationExterneA || "—"}</Propriete>
                <Propriete label="Référence preuve">{fiche.referencePreuve || "—"}</Propriete>
              </Proprietes>
            </Carte>
          </FicheSection>

          <FicheSection titre="5. Type d'analyse des causes">
            <Carte className="divide-y">
              <Proprietes>
                <Propriete label="Type d'analyse">{fiche.typeAnalyse || "—"}</Propriete>
              </Proprietes>
              {afficherArbre && (
                <div className="p-5">
                  <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">Arbre des causes</p>
                  {fiche.causes.length === 0 ? (
                    <p className="text-sm italic text-muted-foreground">Aucune cause renseignée.</p>
                  ) : (
                    <ArbreCausesLecture causes={fiche.causes} />
                  )}
                </div>
              )}
            </Carte>
          </FicheSection>

          <FicheSection titre="Documentation et communication">
            <Carte className="divide-y">
              <div className="p-5">
                {fiche.miseAJourNecessaire.length > 0 ? (
                  <Pastilles label="Mise à jour nécessaire" valeurs={fiche.miseAJourNecessaire} />
                ) : (
                  <TexteLong label="Mise à jour nécessaire" valeur={null} />
                )}
              </div>
              <Proprietes>
                <Propriete label="Procédure — laquelle">{fiche.procedureLaquelle || "—"}</Propriete>
                <Propriete label="Référence DUERP">{fiche.referenceDUERP || "—"}</Propriete>
              </Proprietes>
              {autresRenseigne && (
                <div className="p-5">
                  <TexteLong label="Autres — précisez" valeur={fiche.miseAJourAutrePrecision} />
                </div>
              )}
              <Proprietes>
                <Propriete label="Communication interne réalisée">{ouiNon(fiche.communicationInterne)}</Propriete>
                <Propriete label="Type de communication">{fiche.typeCommunication || "—"}</Propriete>
                <Propriete label="Nouveau risque à ajouter">{ouiNon(fiche.nouveauRisqueNecessaire)}</Propriete>
                <Propriete label="Référence nouveau risque">{fiche.referenceNouveauRisque || "—"}</Propriete>
              </Proprietes>
            </Carte>
          </FicheSection>

          <FicheSection titre="8. Validation & clôture">
            <Carte>
              <Proprietes>
                <Propriete label="Nom (validation)">{fiche.validationNom || "—"}</Propriete>
                <Propriete label="Fonction (validation)">{fiche.validationFonction || "—"}</Propriete>
                <Propriete label="Toutes les actions sont clôturées">{ouiNon(fiche.toutesActionsCloturees)}</Propriete>
                <Propriete label="Date de validation">{fiche.validationDate ? jour(fiche.validationDate) : "—"}</Propriete>
              </Proprietes>
            </Carte>
          </FicheSection>

          <FicheSection
            titre="Plan d’action"
            compteur={actions.length}
            action={
              <Link href={`/plan-action/nouveau?ficheSSEId=${fiche.id}`} className={lienAjout} data-no-print>
                <PlusIcon /> Action
              </Link>
            }
          >
            {actions.length === 0 ? (
              <EtatVide>Aucune action n’est rattachée à cet évènement ni à son écart.</EtatVide>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  Actions rattachées à l’évènement, ainsi qu’à l’écart ou l’écart amiante lié.
                </p>
                <Carte className="overflow-hidden">
                  <Table>
                    <TableBody>
                      {actions.map((a) => (
                        <TableRow key={a.id}>
                          <TableCell className="whitespace-nowrap">
                            <Link href={`/plan-action/${a.id}`} className="font-medium underline-offset-4 hover:underline">
                              {a.reference}
                            </Link>
                            <span className="mt-0.5 block text-xs text-muted-foreground">{TYPE_ACTION_LABELS[a.type]}</span>
                          </TableCell>
                          <TableCell className="max-w-sm whitespace-normal">
                            {a.action}
                            <span className="mt-0.5 block text-xs text-muted-foreground">Rattachée à : {origineAction(a)}</span>
                          </TableCell>
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
              </>
            )}
          </FicheSection>

          <FicheSection
            titre="Retour d’expérience"
            compteur={fiche.rex.length}
            action={
              fiche.rex.length === 0 ? (
                <Link href={`/rex/nouveau?ficheSSEId=${fiche.id}`} className={lienAjout} data-no-print>
                  <PlusIcon /> REX
                </Link>
              ) : undefined
            }
          >
            {fiche.rex.length === 0 ? (
              <EtatVide>Aucun REX pour cet évènement.</EtatVide>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {fiche.rex.map((r) => (
                  <Link key={r.id} href={`/rex/${r.id}`} className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{r.reference}</span>
                      <BadgeStatut label={STATUT_REX_LABELS[r.statut]} ton="violet" />
                    </div>
                    <p className="text-sm text-muted-foreground">{r.titre}</p>
                  </Link>
                ))}
              </div>
            )}
          </FicheSection>

          <details className="group rounded-xl border bg-card">
            <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-base font-semibold [&::-webkit-details-marker]:hidden">
              <ChevronRightIcon className="size-4 text-muted-foreground transition-transform group-open:rotate-90" aria-hidden />
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
              <Propriete label="Rattaché à">
                {fiche.ecart ? (
                  <>
                    <Link href={`/ecarts/${fiche.ecart.id}`} className="underline-offset-4 hover:underline">
                      Écart {fiche.ecart.reference}
                    </Link>
                    {fiche.ecart.dossier && (
                      <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{fiche.ecart.dossier.chantier}</span>
                    )}
                  </>
                ) : fiche.ecartAmiante ? (
                  <>
                    <Link href={`/ecart-amiante/${fiche.ecartAmiante.id}`} className="underline-offset-4 hover:underline">
                      Écart amiante {fiche.ecartAmiante.reference}
                    </Link>
                    <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{fiche.ecartAmiante.nomChantier}</span>
                  </>
                ) : (
                  "Aucun écart"
                )}
              </Propriete>
              {/* Les remontées rattachées à cet évènement : elles sont souvent ce
                  qui l'a fait connaître, et se perdraient sans ce rappel. */}
              {fiche.remontees.map((r) => (
                <Propriete key={r.id} label="Remontée rattachée">
                  <Link href={`/remontees/${r.id}`} className="underline-offset-4 hover:underline">
                    {r.reference}
                  </Link>
                  <span className="mt-0.5 block text-xs font-normal text-muted-foreground">{r.objet}</span>
                </Propriete>
              ))}
            </Proprietes>
            <div data-no-print className="border-t px-4 py-2.5">
              <ChangerRattachement
                action={changerRattachementFicheSSE}
                hiddenFields={{ id: fiche.id }}
                types={[
                  {
                    cle: "ecart",
                    libelle: "Écart",
                    champ: "ecartId",
                    valeurActuelle: fiche.ecartId,
                    options: ecartsChoix.map((e) => ({
                      id: e.id,
                      libelle: libelleRattachement(e.reference, e.dossier?.chantier ?? null, e.description),
                    })),
                  },
                  {
                    cle: "amiante",
                    libelle: "Écart amiante",
                    champ: "ecartAmianteId",
                    valeurActuelle: fiche.ecartAmianteId,
                    options: amianteChoix.map((e) => ({
                      id: e.id,
                      libelle: libelleRattachement(e.reference, `${e.nomChantier} (${e.numeroChantier})`, e.description),
                    })),
                  },
                ]}
              />
            </div>
          </Carte>
          <div data-no-print className="flex flex-wrap gap-2 pt-1">
            <BoutonExportPDF className="" />
            <BoutonArchiver
              action={fiche.archiveLe ? desarchiver : archiver}
              entite="ficheSSE"
              id={fiche.id}
              archive={!!fiche.archiveLe}
              className=""
            />
            <BoutonSupprimer
              action={supprimerFicheSSE}
              hiddenFields={{ id: fiche.id }}
              message={`Supprimer cet évènement supprimera aussi ${fiche.causes.length} cause(s) et ${actionsDirectes} action(s) rattachée(s) directement à l'évènement. Cette action est irréversible. Continuer ?`}
              className=""
            />
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            Créé le {fiche.createdAt.toLocaleDateString("fr-FR")}
            {fiche.modifieLe &&
              ` · modifié le ${fiche.modifieLe.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}${
                fiche.modifiePar ? ` par ${fiche.modifiePar}` : ""
              }`}
          </p>
        </aside>
      </div>
    </div>
  );
}
