import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, PlusIcon } from "lucide-react";
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
import { EcartFields } from "@/components/ecart-fields";
import { EditionPanneau } from "@/components/edition-panneau";
import { Carte, EtatVide, FicheSection, Pastilles, Propriete, Proprietes, TexteLong } from "@/components/fiche";
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
const ETAPES = (["OUVERT", "EN_COURS", "CLOTURE"] as const).map((s) => ({
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
        select: { id: true, reference: true, objet: true },
      },
      remonteesOrigine: { select: { id: true } },
      fichesSSE: { orderBy: { createdAt: "desc" } },
      actions: { orderBy: { createdAt: "desc" } },
      rex: { orderBy: { createdAt: "desc" }, select: { id: true, reference: true, titre: true, statut: true } },
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

  const lienAjout = buttonVariants({ variant: "outline", size: "sm" });

  return (
    <div className="mx-auto max-w-[80rem] px-6 py-8 lg:px-8">
      <nav data-no-print aria-label="Fil d'Ariane" className="mb-4 flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/ecarts" className="hover:text-foreground hover:underline">
          Écarts
        </Link>
        <ChevronRightIcon className="size-3.5" aria-hidden />
        <span className="text-foreground">{ecart.reference}</span>
      </nav>

      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">{ecart.reference}</h1>
            <BadgeStatut label={STATUT_DOSSIER_ECART_LABELS[ecart.statut]} ton={TON_STATUT[ecart.statut]} />
          </div>
          <p className="text-sm text-muted-foreground">
            Détecté le {ecart.dateDetection.toLocaleDateString("fr-FR")}
            {ecart.declarant ? ` par ${ecart.declarant}` : ""}
            {ecart.dossier && (
              <>
                {" · "}
                <Link href={`/dossiers/${ecart.dossier.id}`} className="underline-offset-4 hover:text-foreground hover:underline">
                  Dossier {ecart.dossier.reference} — {ecart.dossier.chantier}
                </Link>
              </>
            )}
          </p>
          <StatutParcours action={mettreAJourStatutEcart} id={ecart.id} etapes={ETAPES} courant={ecart.statut} />
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

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-8">
          <FicheSection titre="Constat">
            <Carte className="space-y-5 p-5">
              <TexteLong label="Description" valeur={ecart.description} />
              <div className="grid gap-5 sm:grid-cols-2">
                <TexteLong label="Mesure immédiate" valeur={ecart.mesureImmediate} />
                <TexteLong label="Cause" valeur={ecart.cause} />
              </div>
              {(ecart.natures.length > 0 || ecart.domaines.length > 0 || ecart.theme.length > 0) && (
                <div className="space-y-4 border-t pt-5">
                  <Pastilles label="Nature" valeurs={ecart.natures} />
                  <Pastilles label="Domaine" valeurs={ecart.domaines} />
                  <Pastilles label="Thème" valeurs={ecart.theme} />
                </div>
              )}
            </Carte>
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

        <aside className="space-y-4 lg:sticky lg:top-6 lg:self-start">
          <Carte className="grid grid-cols-3 divide-x text-center">
            {[
              { label: "Gravité", valeur: ecart.gravite },
              { label: "Fréquence", valeur: ecart.frequence },
            ].map((m) => (
              <div key={m.label} className="px-2 py-4">
                <p className="text-2xl font-semibold tabular-nums">{m.valeur || "—"}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{m.label}</p>
              </div>
            ))}
            <div className="flex flex-col items-center justify-center gap-1.5 px-2 py-4">
              {ecart.criticite ? (
                <BadgeStatut label={ecart.criticite} ton={TON_CRITICITE[ecart.criticite] ?? "neutre"} />
              ) : (
                <span className="text-2xl font-semibold">—</span>
              )}
              <p className="text-xs text-muted-foreground">Criticité</p>
            </div>
          </Carte>

          <Carte>
            <Proprietes>
              <Propriete label="Origine">{ORIGINE_LABELS[ecart.origine]}</Propriete>
              <Propriete label="Type d’activité">
                {ecart.typeActivite ? TYPE_ACTIVITE_LABELS[ecart.typeActivite] : "—"}
              </Propriete>
              <Propriete label="Déclarant">{ecart.declarant || "—"}</Propriete>
              <Propriete label="Détecté le">{ecart.dateDetection.toLocaleDateString("fr-FR")}</Propriete>
              <Propriete label="Dossier">
                {ecart.dossier ? (
                  <Link href={`/dossiers/${ecart.dossier.id}`} className="underline-offset-4 hover:underline">
                    {ecart.dossier.reference}
                  </Link>
                ) : (
                  "Aucun"
                )}
              </Propriete>
              {ecart.remontees.length > 0 && (
                <Propriete label="Remontées">
                  <span className="flex flex-col items-end gap-0.5">
                    {ecart.remontees.map((r) => (
                      <Link
                        key={r.id}
                        href={`/remontees/${r.id}`}
                        title={`${idsRemonteesOrigine.has(r.id) ? "Origine" : "Rattachée"} — ${r.objet}`}
                        className="underline-offset-4 hover:underline"
                      >
                        {r.reference}
                        {idsRemonteesOrigine.has(r.id) && <span className="ml-1 text-xs font-normal text-muted-foreground">origine</span>}
                      </Link>
                    ))}
                  </span>
                </Propriete>
              )}
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

          <p className="px-1 text-xs text-muted-foreground">
            Créé le {ecart.createdAt.toLocaleDateString("fr-FR")}
            {ecart.modifieLe &&
              ` · modifié le ${ecart.modifieLe.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}${
                ecart.modifiePar ? ` par ${ecart.modifiePar}` : ""
              }`}
          </p>

          <div data-no-print className="flex flex-col gap-2 pt-2">
            <BoutonExportPDF />
            <BoutonArchiver
              action={ecart.archiveLe ? desarchiver : archiver}
              entite="ecart"
              id={ecart.id}
              archive={!!ecart.archiveLe}
            />
            <BoutonSupprimer
              action={supprimerEcart}
              hiddenFields={{ id: ecart.id }}
              message={`Supprimer cet écart supprimera aussi ${impact.fiches} évènement(s) SSE et ${impact.actions} action(s) lié(s). Cette action est irréversible. Continuer ?`}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
