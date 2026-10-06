import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2Icon, ChevronRightIcon, CircleDashedIcon, PlusIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  ORIGINE_LABELS,
  STATUT_DOSSIER_ECART_LABELS,
  STATUT_FICHE_LABELS,
  TYPE_ACTIVITE_LABELS,
  TYPE_ACTION_LABELS,
  STATUT_ACTION_LABELS,
  STATUT_REX_LABELS,
} from "@/lib/labels";
import {
  mettreAJourStatutEcart,
  mettreAJourEcart,
  supprimerEcart,
  changerRattachementEcart,
} from "@/app/ecarts/actions";
import { archiver, desarchiver } from "@/app/archivage/actions";
import { compterImpactSuppressionEcart } from "@/lib/suppression";
import { BadgeStatut, type TonStatut } from "@/components/badge-statut";
import { ChangerRattachement } from "@/components/changer-rattachement";
import { Chronologie, type EvenementChrono } from "@/components/chronologie";
import { EcartFields } from "@/components/ecart-fields";
import { EditionPanneau } from "@/components/edition-panneau";
import { Carte, EtatVide, FicheSection, Pastilles, Propriete, Proprietes } from "@/components/fiche";
import { MatriceRisque } from "@/components/matrice-risque";
import { ParcoursTraitement, type EtapeParcours } from "@/components/parcours-traitement";
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
const TON_CRITICITE: Record<string, TonStatut> = { Faible: "vert", Moyenne: "ambre", Élevée: "rouge" };
const TON_FICHE: Record<string, TonStatut> = { BROUILLON: "neutre", EN_COURS: "bleu", FINALISEE: "vert" };
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

// Le navigateur nomme le PDF d’après le titre du document : sans titre
// propre à la fiche, tous les exports s’enregistreraient sous le même nom.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fiche = await prisma.ecart.findUnique({ where: { id }, select: { reference: true } });
  return { title: fiche ? `Écart ${fiche.reference}` : "Écart" };
}

export default async function EcartDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const ecart = await prisma.ecart.findUnique({
    where: { id },
    include: {
      dossier: true,
      remontees: {
        orderBy: { reference: "asc" },
        select: { id: true, reference: true, objet: true, dateRemontee: true },
      },
      remonteesOrigine: { select: { id: true } },
      // `select` : jamais la preuve (photo/PDF en data URL) d'une action, qui
      // serait téléchargée en entier pour une simple ligne de tableau.
      fichesSSE: {
        orderBy: { createdAt: "desc" },
        select: { id: true, reference: true, emetteur: true, statutFiche: true, createdAt: true },
      },
      actions: {
        orderBy: { createdAt: "desc" },
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
        },
      },
      rex: {
        orderBy: { createdAt: "desc" },
        select: { id: true, reference: true, titre: true, statut: true, createdAt: true },
      },
    },
  });

  if (!ecart) notFound();

  const impact = await compterImpactSuppressionEcart(ecart.id);
  // Une remontée peut être rattachée à cet écart sans en être l'origine : le
  // libellé distingue les deux, et le statut ne suffit plus à les départager.
  const idsRemonteesOrigine = new Set(ecart.remonteesOrigine.map((r) => r.id));

  // Dossiers proposés pour corriger un rattachement erroné.
  const dossiersChoix = await prisma.dossier.findMany({
    orderBy: { reference: "asc" },
    select: { id: true, reference: true, chantier: true },
  });

  const aMesure = !!ecart.mesureImmediate?.trim();
  const aCause = !!ecart.cause?.trim();
  const actionsSoldees = ecart.actions.filter((a) => a.statut === "REALISEE" || a.statut === "ANNULEE").length;
  const parcours: EtapeParcours[] = [
    {
      label: "Détection",
      legende: `${ecart.dateDetection.toLocaleDateString("fr-FR")}${ecart.declarant ? ` · ${ecart.declarant}` : ""}`,
      fait: true,
    },
    { label: "Mesure immédiate", legende: aMesure ? "Renseignée" : "À renseigner", fait: aMesure },
    { label: "Analyse des causes", legende: aCause ? "Renseignée" : "À analyser", fait: aCause },
    {
      label: "Actions",
      legende: ecart.actions.length === 0 ? "Aucune action" : `${actionsSoldees}/${ecart.actions.length} soldée${actionsSoldees > 1 ? "s" : ""}`,
      fait: ecart.actions.length > 0 && actionsSoldees === ecart.actions.length,
    },
    { label: "Clôture", legende: ecart.statut === "CLOTURE" ? "Clôturé" : "En attente", fait: ecart.statut === "CLOTURE" },
  ];

  const chrono: EvenementChrono[] = [
    {
      date: ecart.dateDetection,
      titre: "Écart détecté",
      detail: ecart.declarant ? `Déclaré par ${ecart.declarant}` : undefined,
      rang: 0,
      ton: "ambre",
    },
    ...ecart.remontees.map<EvenementChrono>((r) => ({
      date: r.dateRemontee,
      titre: `${idsRemonteesOrigine.has(r.id) ? "Remontée à l’origine" : "Remontée rattachée"} ${r.reference}`,
      detail: r.objet,
      href: `/remontees/${r.id}`,
      rang: 1,
      ton: "violet",
    })),
    ...ecart.fichesSSE.map<EvenementChrono>((f) => ({
      date: f.createdAt,
      titre: `Évènement SSE ${f.reference} ouvert`,
      detail: STATUT_FICHE_LABELS[f.statutFiche],
      href: `/fiches-sse/${f.id}`,
      rang: 2,
      ton: "bleu",
    })),
    ...ecart.actions.flatMap<EvenementChrono>((a) => [
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
    ...ecart.rex.map<EvenementChrono>((r) => ({
      date: r.createdAt,
      titre: `REX ${r.reference} créé`,
      detail: r.titre,
      href: `/rex/${r.id}`,
      rang: 5,
      ton: "violet",
    })),
    ...(ecart.modifieLe
      ? [
          {
            date: ecart.modifieLe,
            titre: "Fiche modifiée",
            detail: ecart.modifiePar ? `Par ${ecart.modifiePar}` : undefined,
            rang: 6,
            ton: "neutre" as const,
          },
        ]
      : []),
  ];

  const lienAjout = buttonVariants({ variant: "outline", size: "sm" });

  return (
    <div className="mx-auto max-w-[80rem] px-4 py-8 lg:px-8">
      <nav data-no-print aria-label="Fil d'Ariane" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/ecarts" className="hover:text-foreground hover:underline">
          Écarts
        </Link>
        {ecart.dossier && (
          <>
            <ChevronRightIcon className="size-3.5" aria-hidden />
            <Link href={`/dossiers/${ecart.dossier.id}`} className="hover:text-foreground hover:underline">
              {ecart.dossier.chantier}
            </Link>
          </>
        )}
        <ChevronRightIcon className="size-3.5" aria-hidden />
        <span className="text-foreground">{ecart.reference}</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold tracking-wide text-primary-foreground">
              {ecart.reference}
            </span>
            <BadgeStatut label={STATUT_DOSSIER_ECART_LABELS[ecart.statut]} ton={TON_STATUT[ecart.statut]} />
            {ecart.criticite && (
              <BadgeStatut label={`Criticité ${ecart.criticite.toLowerCase()}`} ton={TON_CRITICITE[ecart.criticite] ?? "neutre"} />
            )}
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">
            {ecart.description?.trim() || "Écart sans description"}
          </h1>
        </div>
        <div data-no-print className="flex items-center gap-2">
          <EditionPanneau
            titre={`Modifier ${ecart.reference}`}
            description="Les changements sont enregistrés pour tous."
            action={mettreAJourEcart}
            hiddenFields={{ id: ecart.id }}
          >
            <EcartFields v={ecart} />
          </EditionPanneau>
          <Link href={`/plan-action/nouveau?ecartId=${ecart.id}`} className={buttonVariants({ size: "lg" })}>
            <PlusIcon /> Action
          </Link>
        </div>
      </header>

      <div className="mb-8 space-y-3">
        <ParcoursTraitement etapes={parcours} />
        <StatutParcours action={mettreAJourStatutEcart} id={ecart.id} etapes={ETAPES_STATUT} courant={ecart.statut} />
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { titre: "Mesure immédiate", valeur: ecart.mesureImmediate, vide: "Aucune mesure immédiate n’est enregistrée." },
              { titre: "Cause", valeur: ecart.cause, vide: "La cause n’a pas encore été analysée." },
            ].map((b) => (
              <Carte key={b.titre} className="p-5">
                <p className="mb-2 flex items-center gap-2 text-sm font-semibold">
                  {b.valeur?.trim() ? (
                    <CheckCircle2Icon className="size-4 text-emerald-600" aria-hidden />
                  ) : (
                    <CircleDashedIcon className="size-4 text-muted-foreground" aria-hidden />
                  )}
                  {b.titre}
                </p>
                {b.valeur?.trim() ? (
                  <p className="whitespace-pre-line text-sm leading-relaxed">{b.valeur}</p>
                ) : (
                  <p className="text-sm italic text-muted-foreground">{b.vide}</p>
                )}
              </Carte>
            ))}
          </div>

          {(ecart.natures.length > 0 || ecart.domaines.length > 0 || ecart.theme.length > 0) && (
            <Carte className="grid gap-4 p-5 sm:grid-cols-3">
              <Pastilles label="Nature" valeurs={ecart.natures} />
              <Pastilles label="Domaine" valeurs={ecart.domaines} />
              <Pastilles label="Thème" valeurs={ecart.theme} />
            </Carte>
          )}

          <FicheSection
            titre="Plan d’action"
            compteur={ecart.actions.length}
            action={
              <Link href={`/plan-action/nouveau?ecartId=${ecart.id}`} className={lienAjout} data-no-print>
                <PlusIcon /> Action
              </Link>
            }
          >
            {ecart.actions.length === 0 ? (
              <EtatVide>Aucune action n’a encore été définie pour cet écart.</EtatVide>
            ) : (
              <Carte className="overflow-hidden">
                <Table>
                  <TableBody>
                    {ecart.actions.map((a) => (
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
            compteur={ecart.fichesSSE.length}
            action={
              <Link href={`/fiches-sse/nouveau?ecartId=${ecart.id}`} className={lienAjout} data-no-print>
                <PlusIcon /> Évènement
              </Link>
            }
          >
            {ecart.fichesSSE.length === 0 ? (
              <EtatVide>Aucun évènement SSE n’est lié à cet écart.</EtatVide>
            ) : (
              <Carte className="overflow-hidden">
                <Table>
                  <TableBody>
                    {ecart.fichesSSE.map((f) => (
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

          <FicheSection
            titre="Retour d’expérience"
            compteur={ecart.rex.length}
            action={
              ecart.rex.length === 0 ? (
                <Link href={`/rex/nouveau?ecartId=${ecart.id}`} className={lienAjout} data-no-print>
                  <PlusIcon /> REX
                </Link>
              ) : undefined
            }
          >
            {ecart.rex.length === 0 ? (
              <EtatVide>Aucun REX pour cet écart.</EtatVide>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {ecart.rex.map((r) => (
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
          <Carte className="p-5">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-lg font-semibold">Risque</h2>
              {ecart.criticite ? (
                <BadgeStatut label={ecart.criticite} ton={TON_CRITICITE[ecart.criticite] ?? "neutre"} />
              ) : (
                <span className="text-sm text-muted-foreground">non évalué</span>
              )}
            </div>
            <MatriceRisque gravite={ecart.gravite} frequence={ecart.frequence} />
          </Carte>
          <Carte>
            <Proprietes>
              <Propriete label="Origine">{ORIGINE_LABELS[ecart.origine]}</Propriete>
              <Propriete label="Activité">{ecart.typeActivite ? TYPE_ACTIVITE_LABELS[ecart.typeActivite] : "—"}</Propriete>
              <Propriete label="Déclarant">{ecart.declarant || "—"}</Propriete>
              <Propriete label="Dossier">
                {ecart.dossier ? (
                  <Link href={`/dossiers/${ecart.dossier.id}`} className="underline-offset-4 hover:underline">
                    {ecart.dossier.reference}
                  </Link>
                ) : (
                  "Aucun"
                )}
              </Propriete>
            </Proprietes>
            <div data-no-print className="border-t px-4 py-2.5">
              <ChangerRattachement
                action={changerRattachementEcart}
                hiddenFields={{ id: ecart.id }}
                types={[
                  {
                    cle: "dossier",
                    libelle: "Dossier",
                    champ: "dossierId",
                    valeurActuelle: ecart.dossierId,
                    options: dossiersChoix.map((d) => ({
                      id: d.id,
                      libelle: `${d.reference} — ${d.chantier}`,
                    })),
                  },
                ]}
              />
            </div>
          </Carte>
          <div data-no-print className="flex flex-wrap gap-2 pt-1">
            <BoutonExportPDF className="" />
            <BoutonArchiver
              action={ecart.archiveLe ? desarchiver : archiver}
              entite="ecart"
              id={ecart.id}
              archive={!!ecart.archiveLe}
              className=""
            />
            <BoutonSupprimer
              action={supprimerEcart}
              hiddenFields={{ id: ecart.id }}
              message={`Supprimer cet écart supprimera aussi ${impact.fiches} évènement(s) SSE et ${impact.actions} action(s) lié(s). Cette action est irréversible. Continuer ?`}
              className=""
            />
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            Créé le {ecart.createdAt.toLocaleDateString("fr-FR")}
            {ecart.modifieLe &&
              ` · modifié le ${ecart.modifieLe.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}${
                ecart.modifiePar ? ` par ${ecart.modifiePar}` : ""
              }`}
          </p>
        </aside>
      </div>
    </div>
  );
}
