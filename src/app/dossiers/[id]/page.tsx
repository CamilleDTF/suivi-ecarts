import { dateHeureParis, dateParis } from "@/lib/date-paris";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRightIcon, FileTextIcon, PlusIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ORIGINE_LABELS, STATUT_DOSSIER_ECART_LABELS } from "@/lib/labels";
import { mettreAJourStatutDossier, mettreAJourDossier, supprimerDossier } from "@/app/dossiers/actions";
import { archiver, desarchiver } from "@/app/archivage/actions";
import { compterImpactSuppressionDossier } from "@/lib/suppression";
import { BadgeStatut, type TonStatut } from "@/components/badge-statut";
import { DossierEnregistrement } from "@/components/dossier-enregistrement";
import { DossierFields } from "@/components/dossier-fields";
import { BoutonModifier, EditionEnPlace, ZoneEdition, ZoneLecture } from "@/components/edition-en-place";
import { Carte, EtatVide, FicheSection, Propriete, Proprietes } from "@/components/fiche";
import { StatutParcours } from "@/components/statut-parcours";
import { BoutonArchiver } from "@/components/bouton-archiver";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const TON_STATUT: Record<string, TonStatut> = {
  A_QUALIFIER: "neutre",
  OUVERT: "ambre",
  EN_COURS: "bleu",
  CLOTURE: "vert",
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
  const fiche = await prisma.dossier.findUnique({ where: { id }, select: { reference: true } });
  return { title: fiche ? `Dossier ${fiche.reference}` : "Dossier" };
}

export default async function DossierDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const dossier = await prisma.dossier.findUnique({
    where: { id },
    include: {
      ecarts: {
        orderBy: { createdAt: "desc" },
        // `select` : la liste n'affiche que ces colonnes, inutile de charger
        // tout le reste de chaque écart.
        select: {
          id: true,
          reference: true,
          description: true,
          statut: true,
          dateDetection: true,
          _count: { select: { fichesSSE: true } },
        },
      },
    },
  });

  if (!dossier) notFound();

  const impact = await compterImpactSuppressionDossier(dossier.id);
  // « Ouvert » au sens du suivi = pas encore clôturé, comme dans la liste.
  const ouverts = dossier.ecarts.filter((e) => e.statut !== "CLOTURE").length;

  const lienAjout = buttonVariants({ variant: "outline", size: "sm" });
  const lienNouvelEcart = `/ecarts/nouveau?dossierId=${dossier.id}`;

  return (
    <EditionEnPlace>
    <div className="mx-auto max-w-[100rem] px-4 py-8 lg:px-8">
      <nav data-no-print aria-label="Fil d'Ariane" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/dossiers" className="hover:text-foreground hover:underline">
          Dossiers
        </Link>
        <ChevronRightIcon className="size-3.5" aria-hidden />
        <span className="text-foreground">{dossier.reference}</span>
      </nav>

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold tracking-wide text-primary-foreground">
              {dossier.reference}
            </span>
            <BadgeStatut label={STATUT_DOSSIER_ECART_LABELS[dossier.statut]} ton={TON_STATUT[dossier.statut]} />
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">{dossier.chantier}</h1>
        </div>
        <div data-no-print className="flex items-center gap-2">
          <BoutonModifier />
          <Link href={lienNouvelEcart} className={buttonVariants({ size: "lg" })}>
            <PlusIcon /> Nouvel écart
          </Link>
        </div>
      </header>

      <div className="mb-8">
        <StatutParcours action={mettreAJourStatutDossier} id={dossier.id} etapes={ETAPES_STATUT} courant={dossier.statut} />
      </div>

      <ZoneEdition
        titre={`Modifier ${dossier.reference}`}
        description="Les changements sont enregistrés pour tous."
        action={mettreAJourDossier}
        hiddenFields={{ id: dossier.id }}
      >
        <DossierFields v={dossier} />
      </ZoneEdition>

      <ZoneLecture>
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-8">
          <FicheSection
            titre="Écarts"
            compteur={dossier.ecarts.length}
            action={
              <Link href={lienNouvelEcart} className={lienAjout} data-no-print>
                <PlusIcon /> Écart
              </Link>
            }
          >
            {dossier.ecarts.length === 0 ? (
              <EtatVide>Aucun écart pour ce dossier.</EtatVide>
            ) : (
              <Carte className="overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Référence</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Évènement</TableHead>
                      <TableHead>Statut</TableHead>
                      <TableHead>Détecté le</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dossier.ecarts.map((e) => (
                      <TableRow key={e.id}>
                        <TableCell>
                          <Link href={`/ecarts/${e.id}`} className="font-medium underline-offset-4 hover:underline">
                            {e.reference}
                          </Link>
                        </TableCell>
                        <TableCell className="max-w-md truncate">{e.description}</TableCell>
                        <TableCell>
                          {e._count.fichesSSE > 0 ? (
                            <span className="font-medium">Oui</span>
                          ) : (
                            <span className="text-muted-foreground">Non</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <BadgeStatut label={STATUT_DOSSIER_ECART_LABELS[e.statut]} ton={TON_STATUT[e.statut]} />
                        </TableCell>
                        <TableCell className="tabular-nums text-muted-foreground">
                          {e.dateDetection.toLocaleDateString("fr-FR")}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Carte>
            )}
          </FicheSection>

          <FicheSection titre="Enregistrement">
            {dossier.enregistrement ? (
              <Carte className="p-4">
                <DossierEnregistrement valeur={dossier.enregistrement} nom={dossier.enregistrementNom} />
              </Carte>
            ) : (
              <EtatVide>Aucun enregistrement n’est joint à ce dossier.</EtatVide>
            )}
          </FicheSection>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Carte>
            <Proprietes>
              <Propriete label="Déclarant">{dossier.declarant}</Propriete>
              <Propriete label="Détecté le">{dossier.dateDetection.toLocaleDateString("fr-FR")}</Propriete>
              <Propriete label="Origine">{ORIGINE_LABELS[dossier.origine]}</Propriete>
              <Propriete label="Écarts">{dossier.ecarts.length}</Propriete>
              <Propriete label="Ouverts">{ouverts}</Propriete>
            </Proprietes>
          </Carte>
          <div data-no-print className="flex flex-wrap gap-2 pt-1">
            {/* Mène au rapport complet — écarts, évènements, actions et
                logigrammes — dont l'impression part toute seule. Imprimer cette
                page-ci ne donnerait que l'entête et la liste des écarts. */}
            <Link
              href={`/dossiers/${dossier.id}/rapport?impression=1`}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              <FileTextIcon /> Exporter en PDF
            </Link>
            <BoutonArchiver
              action={dossier.archiveLe ? desarchiver : archiver}
              entite="dossier"
              id={dossier.id}
              archive={!!dossier.archiveLe}
              className=""
            />
            <BoutonSupprimer
              action={supprimerDossier}
              hiddenFields={{ id: dossier.id }}
              message={`Supprimer ce dossier supprimera aussi ses ${impact.ecarts} écart(s), ${impact.fiches} évènement(s) SSE et ${impact.actions} action(s) lié(s). Cette action est irréversible. Continuer ?`}
              className=""
            />
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            Créé le {dateParis(dossier.createdAt)}
            {dossier.modifieLe &&
              ` · modifié le ${dateHeureParis(dossier.modifieLe)}${
                dossier.modifiePar ? ` par ${dossier.modifiePar}` : ""
              }`}
          </p>
        </aside>
      </div>
      </ZoneLecture>
    </div>
    </EditionEnPlace>
  );
}
