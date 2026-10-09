import { dateHeureParis, dateParis } from "@/lib/date-paris";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { ChevronRightIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { STATUT_ACTION_LABELS, TYPE_ACTION_LABELS, libelleRattachement } from "@/lib/labels";
import {
  mettreAJourStatutAction,
  mettreAJourAction,
  supprimerAction,
  changerRattachementAction,
} from "@/app/plan-action/actions";
import { archiver, desarchiver } from "@/app/archivage/actions";
import { StatutAction } from "@/generated/prisma/enums";
import { ActionFields } from "@/components/action-fields";
import { BadgeStatut, type TonStatut } from "@/components/badge-statut";
import { BoutonArchiver } from "@/components/bouton-archiver";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";
import { BoutonRetour } from "@/components/bouton-retour";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { ChangerRattachement } from "@/components/changer-rattachement";
import { BoutonModifier, EditionEnPlace, ZoneEdition, ZoneLecture } from "@/components/edition-en-place";
import { Carte, EtatVide, FicheSection, Propriete, Proprietes } from "@/components/fiche";
import { ConteneurPage } from "@/components/page-liste";
import { PreuveAction } from "@/components/preuve-plan-action";
import { StatutParcours } from "@/components/statut-parcours";
import { cn } from "@/lib/utils";

const TON_ACTION: Record<string, TonStatut> = {
  A_FAIRE: "neutre",
  EN_COURS: "bleu",
  EN_RETARD: "rouge",
  REALISEE: "vert",
  ANNULEE: "neutre",
};
const ETAPES_STATUT = Object.values(StatutAction).map((s) => ({
  value: s,
  label: STATUT_ACTION_LABELS[s],
  ton: TON_ACTION[s],
}));

type Parent = { cle: string; type: string; href: string; reference: string; detail: string };

const joindre = (...parties: (string | null | undefined)[]) =>
  parties
    .map((p) => p?.trim())
    .filter(Boolean)
    .join(" — ");

const dateLongue = (d: Date) => d.toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" });

// Un repère de la fiche : étiquette en petites capitales, valeur dessous.
function Repere({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="text-base font-semibold tracking-tight">{children}</div>
    </div>
  );
}

// Le navigateur nomme le PDF d’après le titre du document : sans titre
// propre à la fiche, tous les exports s’enregistreraient sous le même nom.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fiche = await prisma.action.findUnique({ where: { id }, select: { reference: true } });
  return { title: fiche ? `Action ${fiche.reference}` : "Action" };
}

export default async function ActionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const action = await prisma.action.findUnique({
    where: { id },
    // Les rattachements : seulement ce que la fiche en affiche (chantier,
    // résumé), jamais `enregistrement` (photo/PDF en data URL).
    include: {
      ecarts: { select: { id: true, reference: true, description: true, dossier: { select: { chantier: true } } } },
      ficheSSE: { select: { id: true, reference: true, nomChantier: true, descriptionFactuelle: true } },
      ecartAmiante: {
        select: { id: true, reference: true, nomChantier: true, numeroChantier: true, description: true },
      },
      remontee: { select: { id: true, reference: true, chantierService: true, objet: true } },
      rex: { select: { id: true, reference: true, titre: true } },
      reclamation: { select: { id: true, reference: true, chantier: true, objet: true } },
    },
  });

  if (!action) notFound();

  // Listes proposées pour corriger un rattachement erroné.
  const [ecartsChoix, evenementsChoix, amianteChoix, remonteesChoix, rexChoix, reclamationsChoix] = await Promise.all([
    prisma.ecart.findMany({
      orderBy: { reference: "asc" },
      select: { id: true, reference: true, description: true, dossier: { select: { chantier: true } } },
    }),
    prisma.ficheSSE.findMany({
      orderBy: { reference: "asc" },
      select: { id: true, reference: true, nomChantier: true, descriptionFactuelle: true },
    }),
    prisma.ecartAmiante.findMany({
      orderBy: { reference: "asc" },
      select: { id: true, reference: true, nomChantier: true, numeroChantier: true, description: true },
    }),
    prisma.remonteeInfo.findMany({
      orderBy: { reference: "asc" },
      select: { id: true, reference: true, chantierService: true, objet: true },
    }),
    prisma.rex.findMany({
      orderBy: { reference: "asc" },
      select: { id: true, reference: true, titre: true },
    }),
    prisma.reclamation.findMany({
      orderBy: { reference: "asc" },
      select: { id: true, reference: true, chantier: true, objet: true },
    }),
  ]);

  // Plusieurs écarts possibles : le retour va au premier, faute de mieux — le
  // lien de retour ne peut pointer que vers un seul endroit.
  const premierEcart = action.ecarts[0];
  const retourHref = premierEcart
    ? `/ecarts/${premierEcart.id}`
    : action.ficheSSE
      ? `/fiches-sse/${action.ficheSSE.id}`
      : action.ecartAmiante
        ? `/ecart-amiante/${action.ecartAmiante.id}`
        : action.remontee
          ? `/remontees/${action.remontee.id}`
          : action.rex
            ? `/rex/${action.rex.id}`
            : action.reclamation
              ? `/reclamations/${action.reclamation.id}`
              : "/plan-action";
  const retourLabel = premierEcart
    ? action.ecarts.length > 1
      ? "Retour aux écarts"
      : "Retour à l'écart"
    : action.ficheSSE
      ? "Retour à l'évènement SSE"
      : action.ecartAmiante
        ? "Retour à l'écart amiante"
        : action.remontee
          ? "Retour à la remontée"
          : action.rex
            ? "Retour au REX"
            : action.reclamation
              ? "Retour à la réclamation"
              : "Retour au plan d'action";

  // Tous les écarts couverts sont listés : n'en montrer qu'un laisserait
  // croire à un rattachement unique.
  const parents: Parent[] = [
    ...action.ecarts.map((e) => ({
      cle: `ecart-${e.id}`,
      type: "Écart",
      href: `/ecarts/${e.id}`,
      reference: e.reference,
      detail: joindre(e.dossier?.chantier, e.description),
    })),
    ...(action.ficheSSE
      ? [
          {
            cle: "evenement",
            type: "Évènement SSE",
            href: `/fiches-sse/${action.ficheSSE.id}`,
            reference: action.ficheSSE.reference,
            detail: joindre(action.ficheSSE.nomChantier, action.ficheSSE.descriptionFactuelle),
          },
        ]
      : []),
    ...(action.ecartAmiante
      ? [
          {
            cle: "amiante",
            type: "Écart amiante",
            href: `/ecart-amiante/${action.ecartAmiante.id}`,
            reference: action.ecartAmiante.reference,
            detail: joindre(
              `${action.ecartAmiante.nomChantier} (${action.ecartAmiante.numeroChantier})`,
              action.ecartAmiante.description,
            ),
          },
        ]
      : []),
    ...(action.remontee
      ? [
          {
            cle: "remontee",
            type: "Remontée",
            href: `/remontees/${action.remontee.id}`,
            reference: action.remontee.reference,
            detail: joindre(action.remontee.chantierService, action.remontee.objet),
          },
        ]
      : []),
    ...(action.rex
      ? [
          {
            cle: "rex",
            type: "REX",
            href: `/rex/${action.rex.id}`,
            reference: action.rex.reference,
            detail: action.rex.titre,
          },
        ]
      : []),
    ...(action.reclamation
      ? [
          {
            cle: "reclamation",
            type: "Réclamation",
            href: `/reclamations/${action.reclamation.id}`,
            reference: action.reclamation.reference,
            detail: joindre(action.reclamation.chantier, action.reclamation.objet),
          },
        ]
      : []),
  ];

  const verifiee = !!(action.verifiePar || action.verifieLe);

  return (
    <EditionEnPlace>
    <ConteneurPage largeur="fiche">
      <BoutonRetour href={retourHref} label={retourLabel} />

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold tracking-wide text-primary-foreground">
              {action.reference}
            </span>
            <BadgeStatut label={STATUT_ACTION_LABELS[action.statut]} ton={TON_ACTION[action.statut]} />
          </div>
          <h1
            className={cn(
              "whitespace-pre-line font-display font-semibold leading-tight tracking-tight",
              // Le texte de l'action peut courir sur plusieurs lignes.
              action.action.length > 140 ? "text-2xl" : "text-3xl",
            )}
          >
            {action.action}
          </h1>
        </div>
        <div data-no-print className="flex items-center gap-2">
          <BoutonModifier />
        </div>
      </header>

      <div data-no-print className="mb-8 max-w-full overflow-x-auto">
        <StatutParcours action={mettreAJourStatutAction} id={action.id} etapes={ETAPES_STATUT} courant={action.statut} />
      </div>

      <ZoneEdition
        titre={`Modifier ${action.reference}`}
        description="Les changements sont enregistrés pour tous."
        action={mettreAJourAction}
        hiddenFields={{ id: action.id }}
      >
        <ActionFields v={action} />
      </ZoneEdition>

      <ZoneLecture>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-8">
          <Carte className="grid grid-cols-2 gap-x-4 gap-y-5 p-5 md:grid-cols-4">
            <Repere label="Type">{TYPE_ACTION_LABELS[action.type]}</Repere>
            <Repere label="Responsable">{action.responsable}</Repere>
            <Repere label="Échéance">
              {action.echeance ? (
                <span className="tabular-nums">{dateLongue(action.echeance)}</span>
              ) : (
                <span className="font-normal italic text-muted-foreground">Sans échéance</span>
              )}
            </Repere>
            <Repere label="Réalisée le">
              {action.realiseeLe ? (
                <span className="tabular-nums">{dateLongue(action.realiseeLe)}</span>
              ) : (
                <span className="font-normal italic text-muted-foreground">Pas encore</span>
              )}
            </Repere>
          </Carte>

          <FicheSection titre="Rattachée à">
            <Carte className="overflow-hidden">
              {parents.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  Cette action n’est rattachée à aucun élément.
                </p>
              ) : (
                <ul className="divide-y">
                  {parents.map((p) => (
                    <li key={p.cle}>
                      <Link
                        href={p.href}
                        className="flex items-start gap-3 px-4 py-3 text-sm transition-colors hover:bg-muted/50"
                      >
                        <span className="mt-0.5 shrink-0 rounded-md bg-muted px-2 py-0.5 text-xs font-medium">
                          {p.type}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="font-medium">{p.reference}</span>
                          {p.detail && <span className="line-clamp-2 text-muted-foreground">{p.detail}</span>}
                        </span>
                        <ChevronRightIcon className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              <div data-no-print className="border-t px-4 py-2.5">
                <ChangerRattachement
                  action={changerRattachementAction}
                  hiddenFields={{ id: action.id }}
                  types={[
                    {
                      cle: "ecart",
                      libelle: "Écart",
                      champ: "ecartIds",
                      multiple: true,
                      valeurActuelle: premierEcart?.id ?? null,
                      valeursActuelles: action.ecarts.map((e) => e.id),
                      options: ecartsChoix.map((e) => ({
                        id: e.id,
                        libelle: libelleRattachement(e.reference, e.dossier?.chantier ?? null, e.description),
                      })),
                    },
                    {
                      cle: "evenement",
                      libelle: "Évènement SSE",
                      champ: "ficheSSEId",
                      valeurActuelle: action.ficheSSEId,
                      options: evenementsChoix.map((e) => ({
                        id: e.id,
                        libelle: libelleRattachement(e.reference, e.nomChantier, e.descriptionFactuelle),
                      })),
                    },
                    {
                      cle: "amiante",
                      libelle: "Écart amiante",
                      champ: "ecartAmianteId",
                      valeurActuelle: action.ecartAmianteId,
                      options: amianteChoix.map((e) => ({
                        id: e.id,
                        libelle: libelleRattachement(e.reference, `${e.nomChantier} (${e.numeroChantier})`, e.description),
                      })),
                    },
                    {
                      cle: "remontee",
                      libelle: "Remontée",
                      champ: "remonteeId",
                      valeurActuelle: action.remonteeId,
                      options: remonteesChoix.map((r) => ({
                        id: r.id,
                        libelle: libelleRattachement(r.reference, r.chantierService, r.objet),
                      })),
                    },
                    {
                      cle: "rex",
                      libelle: "REX",
                      champ: "rexId",
                      valeurActuelle: action.rexId,
                      options: rexChoix.map((r) => ({
                        id: r.id,
                        libelle: libelleRattachement(r.reference, null, r.titre),
                      })),
                    },
                    {
                      cle: "reclamation",
                      libelle: "Réclamation",
                      champ: "reclamationId",
                      valeurActuelle: action.reclamationId,
                      options: reclamationsChoix.map((r) => ({
                        id: r.id,
                        libelle: libelleRattachement(r.reference, r.chantier, r.objet),
                      })),
                    },
                  ]}
                />
              </div>
            </Carte>
          </FicheSection>

          <FicheSection titre="Preuve">
            {action.preuve ? (
              <Carte className="p-5">
                <PreuveAction valeur={action.preuve} />
              </Carte>
            ) : (
              <EtatVide>Aucune preuve n’est jointe à cette action.</EtatVide>
            )}
          </FicheSection>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Carte>
            <div className="flex items-baseline justify-between gap-3 px-5 pb-4 pt-5">
              <h2 className="font-display text-lg font-semibold">Validation</h2>
              <BadgeStatut label={verifiee ? "Vérifiée" : "Non vérifiée"} ton={verifiee ? "vert" : "neutre"} />
            </div>
            <div className="border-t">
              <Proprietes>
                <Propriete label="Vérifié par">{action.verifiePar || "—"}</Propriete>
                <Propriete label="Vérifié le">
                  {action.verifieLe ? action.verifieLe.toLocaleDateString("fr-FR") : "—"}
                </Propriete>
              </Proprietes>
            </div>
          </Carte>
          {!!action.origine?.trim() && (
            <Carte>
              <Proprietes>
                <Propriete label="Origine">{action.origine}</Propriete>
              </Proprietes>
            </Carte>
          )}
          <div data-no-print className="flex flex-wrap gap-2 pt-1">
            <BoutonExportPDF className="" />
            <BoutonArchiver
              action={action.archiveLe ? desarchiver : archiver}
              entite="action"
              id={action.id}
              archive={!!action.archiveLe}
              className=""
            />
            <BoutonSupprimer
              action={supprimerAction}
              hiddenFields={{ id: action.id }}
              message="Supprimer cette action ? Cette action est irréversible."
              className=""
            />
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            Créée le {dateParis(action.createdAt)}
            {action.modifieLe &&
              ` · modifiée le ${dateHeureParis(action.modifieLe)}${
                action.modifiePar ? ` par ${action.modifiePar}` : ""
              }`}
          </p>
        </aside>
      </div>
      </ZoneLecture>
    </ConteneurPage>
    </EditionEnPlace>
  );
}
