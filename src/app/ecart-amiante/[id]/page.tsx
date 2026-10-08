import { ORDRE_ACTIONS } from "@/lib/ordre-actions";
import { dateHeureParis, dateParis } from "@/lib/date-paris";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  STATUT_DOSSIER_ECART_LABELS,
  STATUT_FICHE_LABELS,
  TYPE_ACTION_LABELS,
  STATUT_ACTION_LABELS,
  STATUT_REX_LABELS,
} from "@/lib/labels";
import { EcartAmianteFields } from "@/components/ecart-amiante-fields";
import {
  mettreAJourEcartAmiante,
  mettreAJourStatutEcartAmiante,
  creerFicheSSEDepuisAmiante,
  supprimerEcartAmiante,
} from "@/app/ecart-amiante/actions";
import { archiver, desarchiver } from "@/app/archivage/actions";
import { compterImpactSuppressionEcartAmiante } from "@/lib/suppression";
import { BadgeStatut, type TonStatut } from "@/components/badge-statut";
import { BoutonModifier, EditionEnPlace, ZoneEdition, ZoneLecture } from "@/components/edition-en-place";
import { Carte, EtatVide, FicheSection, Propriete, Proprietes, TexteLong } from "@/components/fiche";
import { StatutParcours } from "@/components/statut-parcours";
import { BoutonArchiver } from "@/components/bouton-archiver";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

const TON_STATUT: Record<string, TonStatut> = {
  A_QUALIFIER: "neutre",
  OUVERT: "ambre",
  EN_COURS: "bleu",
  CLOTURE: "vert",
};
const TON_FICHE: Record<string, TonStatut> = { EN_COURS: "bleu", FINALISEE: "vert" };
const TON_ACTION: Record<string, TonStatut> = {
  A_FAIRE: "neutre",
  EN_COURS: "bleu",
  EN_RETARD: "rouge",
  REALISEE: "vert",
  ANNULEE: "neutre",
};
const ETAPES_STATUT = (["OUVERT", "EN_COURS", "CLOTURE"] as const).map((s) => ({
  value: s,
  label: STATUT_DOSSIER_ECART_LABELS[s],
  ton: TON_STATUT[s],
}));

// Oui / Non / pas encore tranché : une fiche d'exposition distingue « non »
// de « non renseigné », comme le formulaire (voir OuiNon dans les champs).
function ValeurOuiNon({ valeur, alerte = false }: { valeur?: boolean | null; alerte?: boolean }) {
  if (valeur === true) return alerte ? <BadgeStatut label="Oui" ton="rouge" /> : "Oui";
  if (valeur === false) return "Non";
  return <span className="font-normal italic text-muted-foreground">Non renseigné</span>;
}

const dateFr = (d?: Date | null) => (d ? d.toLocaleDateString("fr-FR") : "—");

// Le navigateur nomme le PDF d’après le titre du document : sans titre
// propre à la fiche, tous les exports s’enregistreraient sous le même nom.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fiche = await prisma.ecartAmiante.findUnique({ where: { id }, select: { reference: true } });
  return { title: fiche ? `Écart amiante ${fiche.reference}` : "Écart amiante" };
}

export default async function EcartAmianteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ecartAmiante = await prisma.ecartAmiante.findUnique({
    where: { id },
    include: {
      fichesSSE: {
        orderBy: { createdAt: "desc" },
        select: { id: true, reference: true, emetteur: true, statutFiche: true },
      },
      // `select` : jamais la preuve (photo/PDF en data URL) d'une action, qui
      // serait téléchargée en entier pour une simple ligne de tableau.
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
        },
      },
      rex: {
        orderBy: { createdAt: "desc" },
        select: { id: true, reference: true, titre: true, statut: true },
      },
    },
  });

  if (!ecartAmiante) notFound();

  const impact = await compterImpactSuppressionEcartAmiante(ecartAmiante.id);

  const lienAjout = buttonVariants({ variant: "outline", size: "sm" });

  return (
    <EditionEnPlace>
    <div className="mx-auto max-w-[100rem] px-4 py-8 lg:px-8">
      <nav data-no-print aria-label="Fil d'Ariane" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/ecart-amiante" className="hover:text-foreground hover:underline">
          Écarts amiante
        </Link>
        <ChevronRightIcon className="size-3.5" aria-hidden />
        <span className="text-foreground">{ecartAmiante.reference}</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold tracking-wide text-primary-foreground">
              {ecartAmiante.reference}
            </span>
            <BadgeStatut
              label={STATUT_DOSSIER_ECART_LABELS[ecartAmiante.statut]}
              ton={TON_STATUT[ecartAmiante.statut]}
            />
            {ecartAmiante.expositionAccidentelle === true && (
              <BadgeStatut label="Exposition accidentelle" ton="rouge" />
            )}
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">
            {ecartAmiante.nomChantier}
          </h1>
          <p className="text-sm text-muted-foreground">
            Chantier {ecartAmiante.numeroChantier} · {dateFr(ecartAmiante.date)}
          </p>
        </div>
        <div data-no-print className="flex items-center gap-2">
          <BoutonModifier />
          <Link href={`/plan-action/nouveau?ecartAmianteId=${ecartAmiante.id}`} className={buttonVariants({ size: "lg" })}>
            <PlusIcon /> Action
          </Link>
        </div>
      </header>

      <div className="mb-8">
        <StatutParcours
          action={mettreAJourStatutEcartAmiante}
          id={ecartAmiante.id}
          etapes={ETAPES_STATUT}
          courant={ecartAmiante.statut}
        />
      </div>

      <ZoneEdition
        titre={`Modifier ${ecartAmiante.reference}`}
        description="Les changements sont enregistrés pour tous."
        action={mettreAJourEcartAmiante}
        hiddenFields={{ id: ecartAmiante.id }}
      >
        <EcartAmianteFields v={ecartAmiante} />
      </ZoneEdition>

      <ZoneLecture>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-8">
          <FicheSection titre="Analyse">
            <Carte>
              <Proprietes>
                <Propriete label="Type d’analyse">{ecartAmiante.typeAnalyse || "—"}</Propriete>
                <Propriete label="Référence analyse">{ecartAmiante.referenceAnalyse || "—"}</Propriete>
                <Propriete label="Type d’écart">{ecartAmiante.typeEcart || "—"}</Propriete>
              </Proprietes>
              <div className="space-y-5 border-t p-5">
                <TexteLong label="Description" valeur={ecartAmiante.description} />
                {/* Valeurs courtes (un seuil, un nombre de fibres) : côte à côte,
                    la comparaison attendu / obtenu se fait d'un coup d'œil. */}
                <div className="grid gap-5 sm:grid-cols-2">
                  <TexteLong label="Résultat attendu" valeur={ecartAmiante.resultatAttendu} />
                  <TexteLong label="Résultat obtenu" valeur={ecartAmiante.resultatObtenu} />
                </div>
                <TexteLong label="Cause" valeur={ecartAmiante.cause} />
              </div>
            </Carte>
          </FicheSection>

          <FicheSection titre="Exposition">
            <Carte>
              <Proprietes>
                <Propriete label="Exposition accidentelle">
                  <ValeurOuiNon valeur={ecartAmiante.expositionAccidentelle} alerte />
                </Propriete>
                <Propriete label="Besoin de créer une FIE ?">
                  <ValeurOuiNon valeur={ecartAmiante.fie} />
                </Propriete>
                <Propriete label="Personne concernée">{ecartAmiante.personneConcernee || "—"}</Propriete>
              </Proprietes>
            </Carte>
          </FicheSection>

          <FicheSection titre="Nouvelle analyse">
            <Carte>
              <Proprietes>
                <Propriete label="Besoin d’une nouvelle analyse">
                  <ValeurOuiNon valeur={ecartAmiante.besoinNouvelleAnalyse} />
                </Propriete>
                <Propriete label="Si non, pourquoi">{ecartAmiante.pasNouvelleAnalyse || "—"}</Propriete>
                <Propriete label="Date">{dateFr(ecartAmiante.dateNouvelleAnalyse)}</Propriete>
                <Propriete label="Laboratoire">{ecartAmiante.laboratoireNouvelleAnalyse || "—"}</Propriete>
                <Propriete label="Chantier">{ecartAmiante.chantierNouvelleAnalyse || "—"}</Propriete>
              </Proprietes>
              <div className="grid gap-5 border-t p-5 sm:grid-cols-2">
                <TexteLong label="Résultat attendu" valeur={ecartAmiante.resultatAttenduNouvelleAnalyse} />
                <TexteLong label="Résultat obtenu" valeur={ecartAmiante.resultatObtenuNouvelleAnalyse} />
              </div>
            </Carte>
          </FicheSection>

          <FicheSection
            titre="Plan d’action"
            compteur={ecartAmiante.actions.length}
            action={
              <Link href={`/plan-action/nouveau?ecartAmianteId=${ecartAmiante.id}`} className={lienAjout} data-no-print>
                <PlusIcon /> Action
              </Link>
            }
          >
            {ecartAmiante.actions.length === 0 ? (
              <EtatVide>Aucune action n’a encore été définie pour cet écart amiante.</EtatVide>
            ) : (
              <Carte className="overflow-hidden">
                <Table>
                  <TableBody>
                    {ecartAmiante.actions.map((a) => (
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

          {(ecartAmiante.evenementSSE || ecartAmiante.fichesSSE.length > 0) && (
            <FicheSection
              titre="Évènements SSE"
              compteur={ecartAmiante.fichesSSE.length}
              action={
                // La fiche SSE reprend chantier, zone et description de l'écart
                // amiante : elle se crée par cette action serveur, pas par un lien.
                ecartAmiante.evenementSSE ? (
                  <form action={creerFicheSSEDepuisAmiante} data-no-print>
                    <input type="hidden" name="ecartAmianteId" value={ecartAmiante.id} />
                    <button type="submit" className={lienAjout}>
                      <PlusIcon /> Évènement SSE
                    </button>
                  </form>
                ) : undefined
              }
            >
              {ecartAmiante.fichesSSE.length === 0 ? (
                <EtatVide>Aucun évènement SSE n’a encore été ouvert pour cet écart amiante.</EtatVide>
              ) : (
                <Carte className="overflow-hidden">
                  <Table>
                    <TableBody>
                      {ecartAmiante.fichesSSE.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell>
                            <Link href={`/fiches-sse/${f.id}`} className="font-medium underline-offset-4 hover:underline">
                              {f.reference}
                            </Link>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{f.emetteur || "—"}</TableCell>
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
          )}

          <FicheSection
            titre="Retour d’expérience"
            compteur={ecartAmiante.rex.length}
            action={
              ecartAmiante.rex.length === 0 ? (
                <Link href={`/rex/nouveau?ecartAmianteId=${ecartAmiante.id}`} className={lienAjout} data-no-print>
                  <PlusIcon /> REX
                </Link>
              ) : undefined
            }
          >
            {ecartAmiante.rex.length === 0 ? (
              <EtatVide>Aucun REX pour cet écart amiante.</EtatVide>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {ecartAmiante.rex.map((r) => (
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
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Carte>
            <h2 className="border-b px-4 py-3 font-display text-lg font-semibold">Chantier</h2>
            <Proprietes>
              <Propriete label="Date">{dateFr(ecartAmiante.date)}</Propriete>
              <Propriete label="Nom du chantier">{ecartAmiante.nomChantier}</Propriete>
              <Propriete label="Numéro">{ecartAmiante.numeroChantier}</Propriete>
              <Propriete label="Conducteur">{ecartAmiante.conducteur}</Propriete>
              <Propriete label="Chef">{ecartAmiante.chef}</Propriete>
              <Propriete label="Zone">{ecartAmiante.zone || "—"}</Propriete>
              <Propriete label="Processus">{ecartAmiante.processus || "—"}</Propriete>
            </Proprietes>
          </Carte>
          <Carte>
            <h2 className="border-b px-4 py-3 font-display text-lg font-semibold">Clôture</h2>
            <Proprietes>
              <Propriete label="Date de clôture">{dateFr(ecartAmiante.dateCloture)}</Propriete>
              <Propriete label="Évènement SSE associé">
                <ValeurOuiNon valeur={ecartAmiante.evenementSSE} />
              </Propriete>
            </Proprietes>
          </Carte>
          <div data-no-print className="flex flex-wrap gap-2 pt-1">
            <BoutonExportPDF className="" />
            <BoutonArchiver
              action={ecartAmiante.archiveLe ? desarchiver : archiver}
              entite="ecartAmiante"
              id={ecartAmiante.id}
              archive={!!ecartAmiante.archiveLe}
              className=""
            />
            <BoutonSupprimer
              action={supprimerEcartAmiante}
              hiddenFields={{ id: ecartAmiante.id }}
              message={`Supprimer cet écart amiante supprimera aussi ${impact.fiches} évènement(s) SSE et ${impact.actions} action(s) lié(s). Cette action est irréversible. Continuer ?`}
              className=""
            />
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            Créé le {dateParis(ecartAmiante.createdAt)}
            {ecartAmiante.modifieLe &&
              ` · modifié le ${dateHeureParis(ecartAmiante.modifieLe)}${
                ecartAmiante.modifiePar ? ` par ${ecartAmiante.modifiePar}` : ""
              }`}
          </p>
        </aside>
      </div>
      </ZoneLecture>
    </div>
    </EditionEnPlace>
  );
}
