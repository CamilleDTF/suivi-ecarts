import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, PlusIcon } from "lucide-react";
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
import { Carte, EtatVide, FicheSection, Pastilles, Propriete, Proprietes, TexteLong } from "@/components/fiche";
import { MatriceRisque } from "@/components/matrice-risque";
import { StatutParcours } from "@/components/statut-parcours";
import { BoutonArchiver } from "@/components/bouton-archiver";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

const TON_STATUT: Record<string, TonStatut> = {
  A_QUALIFIER: "neutre",
  OUVERT: "ambre",
  EN_COURS: "bleu",
  CLOTURE: "vert",
};
const FOND_STATUT: Record<string, string> = {
  A_QUALIFIER: "bg-muted",
  OUVERT: "bg-amber-500/10",
  EN_COURS: "bg-blue-500/10",
  CLOTURE: "bg-emerald-500/10",
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
const ETAPES = (["OUVERT", "EN_COURS", "CLOTURE"] as const).map((s) => ({
  value: s,
  label: STATUT_DOSSIER_ECART_LABELS[s],
  ton: TON_STATUT[s],
}));

const ONGLETS = [
  { cle: "resume", label: "Résumé" },
  { cle: "chronologie", label: "Chronologie" },
  { cle: "liens", label: "Liens" },
] as const;

// Le navigateur nomme le PDF d’après le titre du document : sans titre
// propre à la fiche, tous les exports s’enregistreraient sous le même nom.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fiche = await prisma.ecart.findUnique({ where: { id }, select: { reference: true } });
  return { title: fiche ? `Écart ${fiche.reference}` : "Écart" };
}

export default async function EcartDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet: ongletDemande } = await searchParams;
  const onglet = ONGLETS.some((o) => o.cle === ongletDemande) ? ongletDemande! : "resume";

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

  const chrono: EvenementChrono[] = [
    {
      date: ecart.dateDetection,
      titre: "Écart détecté",
      detail: ecart.declarant ? `Déclaré par ${ecart.declarant}` : undefined,
      ton: "ambre",
    },
    ...ecart.remontees.map<EvenementChrono>((r) => ({
      date: r.dateRemontee,
      titre: `${idsRemonteesOrigine.has(r.id) ? "Remontée à l’origine" : "Remontée rattachée"} ${r.reference}`,
      detail: r.objet,
      href: `/remontees/${r.id}`,
      ton: "violet",
    })),
    ...ecart.fichesSSE.map<EvenementChrono>((f) => ({
      date: f.createdAt,
      titre: `Évènement SSE ${f.reference} ouvert`,
      detail: STATUT_FICHE_LABELS[f.statutFiche],
      href: `/fiches-sse/${f.id}`,
      ton: "bleu",
    })),
    ...ecart.actions.flatMap<EvenementChrono>((a) => [
      {
        date: a.createdAt,
        titre: `Action ${a.reference} créée`,
        detail: `${a.action} — ${a.responsable}`,
        href: `/plan-action/${a.id}`,
        ton: "bleu",
      },
      ...(a.realiseeLe
        ? [{ date: a.realiseeLe, titre: `Action ${a.reference} réalisée`, href: `/plan-action/${a.id}`, ton: "vert" as const }]
        : []),
    ]),
    ...ecart.rex.map<EvenementChrono>((r) => ({
      date: r.createdAt,
      titre: `REX ${r.reference} créé`,
      detail: r.titre,
      href: `/rex/${r.id}`,
      ton: "violet",
    })),
    ...(ecart.modifieLe
      ? [
          {
            date: ecart.modifieLe,
            titre: "Fiche modifiée",
            detail: ecart.modifiePar ? `Par ${ecart.modifiePar}` : undefined,
            ton: "neutre" as const,
          },
        ]
      : []),
  ];

  const compteurs: Record<string, number | undefined> = {
    chronologie: chrono.length,
    liens: ecart.fichesSSE.length + ecart.actions.length + ecart.rex.length,
  };
  const lienAjout = buttonVariants({ variant: "outline", size: "sm" });

  return (
    <div className="mx-auto max-w-[72rem] px-6 py-10 lg:px-10">
      <Link
        href="/ecarts"
        data-no-print
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeftIcon className="size-4" /> Tableau des écarts
      </Link>

      <header className={cn("mb-8 rounded-lg border p-6 sm:p-8", FOND_STATUT[ecart.statut])}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">{ecart.reference}</p>
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
        </div>

        <h1 className="mt-3 max-w-3xl font-display text-3xl font-semibold leading-tight tracking-tight sm:text-4xl">
          {ecart.description?.trim() || "Écart sans description"}
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
          <StatutParcours action={mettreAJourStatutEcart} id={ecart.id} etapes={ETAPES} courant={ecart.statut} />
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {ecart.criticite && (
              <BadgeStatut label={`Criticité ${ecart.criticite.toLowerCase()}`} ton={TON_CRITICITE[ecart.criticite] ?? "neutre"} />
            )}
            <span>Détecté le {ecart.dateDetection.toLocaleDateString("fr-FR")}</span>
            {ecart.dossier && (
              <>
                <span aria-hidden>·</span>
                <Link href={`/dossiers/${ecart.dossier.id}`} className="underline-offset-4 hover:text-foreground hover:underline">
                  {ecart.dossier.chantier}
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      <nav data-no-print aria-label="Sections de la fiche" className="mb-8 flex gap-6 border-b">
        {ONGLETS.map((o) => {
          const actif = o.cle === onglet;
          return (
            <Link
              key={o.cle}
              href={{ pathname: `/ecarts/${ecart.id}`, query: o.cle === "resume" ? {} : { onglet: o.cle } }}
              aria-current={actif ? "page" : undefined}
              className={cn(
                "-mb-px border-b-2 pb-3 text-sm font-medium transition-colors",
                actif ? "border-primary text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
              {compteurs[o.cle] !== undefined && (
                <span className="ml-1.5 rounded bg-muted px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                  {compteurs[o.cle]}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {onglet === "resume" && (
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_21rem]">
          <div className="space-y-8">
            <TexteLong label="Mesure immédiate" valeur={ecart.mesureImmediate} />
            <TexteLong label="Cause" valeur={ecart.cause} />
            {(ecart.natures.length > 0 || ecart.domaines.length > 0 || ecart.theme.length > 0) && (
              <div className="space-y-4 border-t pt-8">
                <Pastilles label="Nature" valeurs={ecart.natures} />
                <Pastilles label="Domaine" valeurs={ecart.domaines} />
                <Pastilles label="Thème" valeurs={ecart.theme} />
              </div>
            )}
          </div>

          <aside className="space-y-4">
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
          </aside>
        </div>
      )}

      {onglet === "chronologie" && (
        <div className="max-w-2xl">
          <Chronologie evenements={chrono} />
        </div>
      )}

      {onglet === "liens" && (
        <div className="space-y-10">
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
                  <Link key={r.id} href={`/rex/${r.id}`} className="rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50">
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
      )}

      <footer data-no-print className="mt-14 flex flex-wrap items-center gap-2 border-t pt-6">
        <BoutonExportPDF className="" />
        <BoutonArchiver
          action={ecart.archiveLe ? desarchiver : archiver}
          entite="ecart"
          id={ecart.id}
          archive={!!ecart.archiveLe}
          className=""
        />
        <div className="ml-auto flex items-center gap-4">
          <p className="text-xs text-muted-foreground">
            Créé le {ecart.createdAt.toLocaleDateString("fr-FR")}
            {ecart.modifieLe &&
              ` · modifié le ${ecart.modifieLe.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}${
                ecart.modifiePar ? ` par ${ecart.modifiePar}` : ""
              }`}
          </p>
          <BoutonSupprimer
            action={supprimerEcart}
            hiddenFields={{ id: ecart.id }}
            message={`Supprimer cet écart supprimera aussi ${impact.fiches} évènement(s) SSE et ${impact.actions} action(s) lié(s). Cette action est irréversible. Continuer ?`}
            className=""
          />
        </div>
      </footer>
    </div>
  );
}
