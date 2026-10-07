import { ORDRE_ACTIONS } from "@/lib/ordre-actions";
import { dateHeureParis, dateParis } from "@/lib/date-paris";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, CircleDashedIcon, DownloadIcon, ExternalLinkIcon, FileTextIcon, PlusIcon, SendIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  ORIGINE_REX_LABELS,
  STATUT_REX_LABELS,
  NATURE_REX_LABELS,
  NATURES_REX_REQUERANT_DESCRIPTION,
  TYPE_ACTION_LABELS,
  STATUT_ACTION_LABELS,
} from "@/lib/labels";
import { mettreAJourRex, changerStatutRex, publierRex, supprimerRex } from "@/app/rex/actions";
import { StatutREX } from "@/generated/prisma/enums";
import { archiver, desarchiver } from "@/app/archivage/actions";
import { BadgeStatut, type TonStatut } from "@/components/badge-statut";
import { BadgeBrouillon, BadgeNatureRex, BadgeStatutRex, TON_STATUT_REX } from "@/components/badges-rex";
import { BoutonModifier, EditionEnPlace, ZoneEdition, ZoneLecture } from "@/components/edition-en-place";
import { Carte, EtatVide, FicheSection, Pastilles, Propriete, Proprietes, TexteLong } from "@/components/fiche";
import { RexFields } from "@/components/rex-fields";
import { StatutParcours } from "@/components/statut-parcours";
import { BoutonArchiver } from "@/components/bouton-archiver";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

const TON_ACTION: Record<string, TonStatut> = {
  A_FAIRE: "neutre",
  EN_COURS: "bleu",
  EN_RETARD: "rouge",
  REALISEE: "vert",
  ANNULEE: "neutre",
};
const ETAPES_STATUT = Object.values(StatutREX).map((s) => ({
  value: s,
  label: STATUT_REX_LABELS[s],
  ton: TON_STATUT_REX[s],
}));
// Le libellé suit ce que la nature décrit, comme dans l'assistant de création.
const LIBELLE_PRATIQUE: Record<string, string> = {
  BONNE_PRATIQUE: "Bonne pratique",
  PRATIQUE_A_EVITER: "Pratique observée",
};
const LIEN_ORIGINE = "font-medium underline-offset-4 hover:underline";

// Le navigateur nomme le PDF d’après le titre du document : sans titre
// propre à la fiche, tous les exports s’enregistreraient sous le même nom.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rex = await prisma.rex.findUnique({ where: { id }, select: { reference: true } });
  return { title: rex ? rex.reference : "REX" };
}

export default async function RexDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rex = await prisma.rex.findUnique({
    where: { id },
    include: {
      // Chantier seulement, jamais `enregistrement` (photo/PDF en data URL).
      ecarts: { orderBy: { reference: "asc" }, include: { dossier: { select: { chantier: true } } } },
      fichesSSE: { orderBy: { reference: "asc" }, select: { id: true, reference: true, nomChantier: true } },
      ecartsAmiante: { orderBy: { reference: "asc" }, select: { id: true, reference: true, nomChantier: true } },
      remontees: { orderBy: { reference: "asc" }, select: { id: true, reference: true, objet: true } },
      // Le nom et la taille seulement : le contenu du fichier est servi par /rex/[id]/fiche-externe.
      ficheExterne: { select: { nom: true, taille: true } },
      // `select` : jamais `preuve` (photo/PDF en data URL), inutile ici.
      actions: {
        orderBy: ORDRE_ACTIONS,
        select: { id: true, reference: true, type: true, action: true, responsable: true, echeance: true, statut: true },
      },
    },
  });

  if (!rex) notFound();

  const nbSources = rex.ecarts.length + rex.fichesSSE.length + rex.ecartsAmiante.length + rex.remontees.length;
  const lienAjout = buttonVariants({ variant: "outline", size: "sm" });
  const aDiffusion = rex.themes.length > 0 || rex.destinatairesRoles.length > 0 || rex.canaux.length > 0;
  const affichePratique =
    !!rex.pratiqueDescription?.trim() || NATURES_REX_REQUERANT_DESCRIPTION.includes(rex.nature);

  return (
    <EditionEnPlace>
    <div className="mx-auto max-w-[100rem] px-4 py-8 lg:px-8">
      <nav data-no-print aria-label="Fil d'Ariane" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/rex" className="hover:text-foreground hover:underline">
          Retours d&apos;expérience
        </Link>
        <ChevronRightIcon className="size-3.5" aria-hidden />
        <span className="text-foreground">{rex.reference}</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold tracking-wide text-primary-foreground">
              {rex.reference}
            </span>
            {rex.brouillon && <BadgeBrouillon />}
            <BadgeStatutRex statut={rex.statut} />
            <BadgeNatureRex nature={rex.nature} />
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">{rex.titre}</h1>
        </div>
        <div data-no-print className="flex flex-wrap items-center gap-2">
          <BoutonModifier />
          <Link href={`/rex/${rex.id}/diffusion`} className={buttonVariants({ variant: "outline", size: "lg" })}>
            <FileTextIcon /> Fiche de diffusion
          </Link>
          {rex.brouillon && (
            <form action={publierRex}>
              <input type="hidden" name="id" value={rex.id} />
              <button type="submit" className={buttonVariants({ size: "lg" })}>
                <SendIcon /> Publier le REX
              </button>
            </form>
          )}
          <Link
            href={`/plan-action/nouveau?rexId=${rex.id}`}
            className={buttonVariants({ variant: rex.brouillon ? "outline" : "default", size: "lg" })}
          >
            <PlusIcon /> Action
          </Link>
        </div>
      </header>

      <div className="mb-8">
        {rex.brouillon ? (
          <Carte className="flex items-start gap-3 border-dashed bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
            <CircleDashedIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>
              Ce REX est encore en brouillon : il n&apos;a pas été diffusé et n&apos;est pas compté dans les
              indicateurs du tableau de bord. Cliquez sur « Publier le REX » quand il est prêt.
            </p>
          </Carte>
        ) : (
          <StatutParcours action={changerStatutRex} id={rex.id} etapes={ETAPES_STATUT} courant={rex.statut} />
        )}
      </div>

      <ZoneEdition
        titre={`Modifier ${rex.reference}`}
        description="Les changements sont enregistrés pour tous."
        action={mettreAJourRex}
        hiddenFields={{ id: rex.id }}
      >
        <RexFields v={rex} />
      </ZoneEdition>

      <ZoneLecture>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-8">
          <Carte className="p-5">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Origine — {ORIGINE_REX_LABELS[rex.origine]}
            </p>
            {nbSources > 0 ? (
              <ul className="space-y-1 text-sm">
                {rex.ecarts.map((e) => (
                  <li key={e.id}>
                    <Link href={`/ecarts/${e.id}`} className={LIEN_ORIGINE}>
                      Écart {e.reference}
                      {e.dossier ? ` — ${e.dossier.chantier}` : ""}
                    </Link>
                  </li>
                ))}
                {rex.fichesSSE.map((f) => (
                  <li key={f.id}>
                    <Link href={`/fiches-sse/${f.id}`} className={LIEN_ORIGINE}>
                      Évènement SSE {f.reference}
                      {f.nomChantier ? ` — ${f.nomChantier}` : ""}
                    </Link>
                  </li>
                ))}
                {rex.ecartsAmiante.map((a) => (
                  <li key={a.id}>
                    <Link href={`/ecart-amiante/${a.id}`} className={LIEN_ORIGINE}>
                      Écart amiante {a.reference} — {a.nomChantier}
                    </Link>
                  </li>
                ))}
                {rex.remontees.map((r) => (
                  <li key={r.id}>
                    <Link href={`/remontees/${r.id}`} className={LIEN_ORIGINE}>
                      Remontée {r.reference} — {r.objet}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm italic text-muted-foreground">Aucun rattachement — REX spontané / bonne pratique</p>
            )}
          </Carte>

          <Carte className="space-y-5 p-5">
            <TexteLong label="Enseignements tirés" valeur={rex.enseignementsTires} />
            {affichePratique && (
              <TexteLong
                label={LIBELLE_PRATIQUE[rex.nature] ?? "Bonne pratique / pratique observée"}
                valeur={rex.pratiqueDescription}
              />
            )}
            <TexteLong label="Cause racine / facteurs communs" valeur={rex.causeRacine} />
            <Pastilles label="Points communs observés" valeurs={rex.pointsCommuns} />
            <TexteLong label="Pourquoi ce REX mérite diffusion" valeur={rex.raisonDiffusion} />
          </Carte>

          {aDiffusion ? (
            <Carte className="grid gap-4 p-5 sm:grid-cols-3">
              <Pastilles label="Thèmes concernés" valeurs={rex.themes} />
              <Pastilles label="Qui doit recevoir ce REX" valeurs={rex.destinatairesRoles} />
              <Pastilles label="Canaux de diffusion" valeurs={rex.canaux} />
            </Carte>
          ) : (
            <EtatVide>Thèmes, destinataires et canaux de diffusion non renseignés.</EtatVide>
          )}

          {rex.ficheExterne && (
            <Carte className="flex flex-wrap items-center gap-3 p-4">
              <FileTextIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Fiche de diffusion jointe</p>
                <p className="truncate text-sm font-medium">{rex.ficheExterne.nom}</p>
              </div>
              <span data-no-print className="flex flex-wrap gap-2">
                <a href={`/rex/${rex.id}/fiche-externe`} target="_blank" rel="noopener" className={lienAjout}>
                  <ExternalLinkIcon /> Ouvrir
                </a>
                <a href={`/rex/${rex.id}/fiche-externe?telecharger=1`} className={lienAjout}>
                  <DownloadIcon /> Télécharger
                </a>
              </span>
            </Carte>
          )}

          <Carte className="p-5">
            <TexteLong label="Note interne / QHSE" valeur={rex.noteInterne} />
          </Carte>

          <FicheSection
            titre="Plan d’action"
            compteur={rex.actions.length}
            action={
              <Link href={`/plan-action/nouveau?rexId=${rex.id}`} className={lienAjout} data-no-print>
                <PlusIcon /> Action
              </Link>
            }
          >
            {rex.actions.length === 0 ? (
              <EtatVide>Aucune action n’est rattachée à ce REX.</EtatVide>
            ) : (
              <Carte className="overflow-hidden">
                <Table>
                  <TableBody>
                    {rex.actions.map((a) => (
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
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Carte>
            <Proprietes>
              <Propriete label="Nature">{NATURE_REX_LABELS[rex.nature]}</Propriete>
              {(rex.sousTypeSSE || rex.origine === "EVENEMENT_SSE") && (
                <Propriete label="Sous-type SSE">{rex.sousTypeSSE || "—"}</Propriete>
              )}
              {!rex.dateDiffusion && rex.dateDiffusionPlanifiee && (
                <Propriete label="Diffusion planifiée">{rex.dateDiffusionPlanifiee.toLocaleDateString("fr-FR")}</Propriete>
              )}
              {rex.dateDiffusion && (
                <Propriete label="Diffusé le">{rex.dateDiffusion.toLocaleDateString("fr-FR")}</Propriete>
              )}
              {rex.dateVerificationEfficacite && (
                <Propriete label="Efficacité vérifiée le">
                  {rex.dateVerificationEfficacite.toLocaleDateString("fr-FR")}
                </Propriete>
              )}
            </Proprietes>
          </Carte>
          <div data-no-print className="flex flex-wrap gap-2 pt-1">
            <BoutonExportPDF className="" />
            <BoutonArchiver
              action={rex.archiveLe ? desarchiver : archiver}
              entite="rex"
              id={rex.id}
              archive={!!rex.archiveLe}
              className=""
            />
            <BoutonSupprimer
              action={supprimerRex}
              hiddenFields={{ id: rex.id }}
              message={`Supprimer ce REX supprimera aussi ${rex.actions.length} action(s) du plan d'action. Les écarts, évènements ou remontées rattachés ne sont pas touchés. Cette action est irréversible. Continuer ?`}
              className=""
            />
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            Créé le {dateParis(rex.createdAt)}
            {rex.modifieLe
              ? ` · modifié le ${dateHeureParis(rex.modifieLe)}${
                  rex.modifiePar ? ` par ${rex.modifiePar}` : ""
                }`
              : " · aucune modification enregistrée"}
          </p>
        </aside>
      </div>
      </ZoneLecture>
    </div>
    </EditionEnPlace>
  );
}
