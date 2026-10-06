import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckIcon, ChevronRightIcon, LockIcon, PlusIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import {
  ORIGINE_REMONTEE_LABELS,
  STATUT_REMONTEE_LABELS,
  STATUT_DOSSIER_ECART_LABELS,
  TYPE_ACTION_LABELS,
  STATUT_ACTION_LABELS,
  STATUT_REX_LABELS,
  libelleRattachement,
} from "@/lib/labels";
import {
  mettreAJourRemontee,
  mettreAJourStatutRemontee,
  marquerRemonteeTraitee,
  supprimerRemontee,
  changerRattachementRemontee,
} from "@/app/remontees/actions";
import { archiver, desarchiver } from "@/app/archivage/actions";
import { BadgeStatut, type TonStatut } from "@/components/badge-statut";
import { ChangerRattachement } from "@/components/changer-rattachement";
import { Chronologie, type EvenementChrono } from "@/components/chronologie";
import { EditionPanneau } from "@/components/edition-panneau";
import { Carte, EtatVide, FicheSection, Pastilles, Propriete, Proprietes, TexteLong } from "@/components/fiche";
import { RemonteeFields } from "@/components/remontee-fields";
import { StatutParcours } from "@/components/statut-parcours";
import { BoutonArchiver } from "@/components/bouton-archiver";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";
import { buttonVariants } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";

const TON_STATUT: Record<string, TonStatut> = {
  A_TRAITER: "ambre",
  EN_COURS: "bleu",
  TRAITEE: "vert",
  TRANSFORMEE_EN_ECART: "violet",
};
const TON_ECART: Record<string, TonStatut> = {
  A_QUALIFIER: "neutre",
  OUVERT: "ambre",
  EN_COURS: "bleu",
  CLOTURE: "vert",
};
const TON_ACTION: Record<string, TonStatut> = {
  A_FAIRE: "neutre",
  EN_COURS: "bleu",
  EN_RETARD: "rouge",
  REALISEE: "vert",
  ANNULEE: "neutre",
};
const TON_REX: Record<string, TonStatut> = {
  REDIGE: "neutre",
  DIFFUSE: "bleu",
  EFFICACITE_VERIFIEE: "vert",
};
// « Transformée en écart » n'est pas une étape qu'on choisit : elle découle de
// la transformation elle-même.
const ETAPES_STATUT = (["A_TRAITER", "EN_COURS", "TRAITEE"] as const).map((s) => ({
  value: s,
  label: STATUT_REMONTEE_LABELS[s],
  ton: TON_STATUT[s],
}));

// Le navigateur nomme le PDF d’après le titre du document : sans titre
// propre à la fiche, tous les exports s’enregistreraient sous le même nom.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fiche = await prisma.remonteeInfo.findUnique({ where: { id }, select: { reference: true } });
  return { title: fiche ? `Remontée ${fiche.reference}` : "Remontée" };
}

export default async function RemonteeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const remontee = await prisma.remonteeInfo.findUnique({
    where: { id },
    include: {
      // Jamais `enregistrement` (photo/PDF en data URL) du dossier : seul le
      // nom du chantier est affiché ici.
      ecarts: {
        orderBy: { reference: "asc" },
        select: {
          id: true,
          reference: true,
          description: true,
          statut: true,
          createdAt: true,
          dossier: { select: { chantier: true } },
        },
      },
      // `ecartOrigine` lui-même n'est jamais affiché : seul `ecartOrigineId`
      // (déjà un scalaire de RemonteeInfo) sert à repérer l'écart d'origine
      // dans la liste `ecarts` ci-dessus.
      ficheSSE: { select: { id: true, reference: true, nomChantier: true, ecartId: true, ecartAmianteId: true } },
      rex: { orderBy: { createdAt: "desc" }, select: { id: true, reference: true, titre: true, statut: true, createdAt: true } },
    },
  });

  if (!remontee) notFound();

  // Le plan d'action d'une remontée reprend celui de ce à quoi elle est
  // rattachée, comme un évènement reprend celui de son écart : le constat
  // préexiste au signalement qu'on y raccroche, et ses actions valent pour lui.
  // L'inverse n'est pas vrai — une action propre à la remontée ne devient pas
  // celle de l'écart.
  //
  // La chaîne est suivie jusqu'au bout : une remontée rattachée à un évènement
  // voit aussi les actions de l'écart de cet évènement, puisque l'évènement
  // lui-même les affiche.
  const idsEcartsHerites = [
    ...remontee.ecarts.map((e) => e.id),
    ...(remontee.ficheSSE?.ecartId ? [remontee.ficheSSE.ecartId] : []),
  ];
  const idsAmianteHerites = remontee.ficheSSE?.ecartAmianteId
    ? [remontee.ficheSSE.ecartAmianteId]
    : [];

  const actions = await prisma.action.findMany({
    where: {
      OR: [
        { remonteeId: remontee.id },
        ...(remontee.ficheSSE ? [{ ficheSSEId: remontee.ficheSSE.id }] : []),
        ...(idsEcartsHerites.length ? [{ ecarts: { some: { id: { in: idsEcartsHerites } } } }] : []),
        ...(idsAmianteHerites.length ? [{ ecartAmianteId: { in: idsAmianteHerites } }] : []),
      ],
    },
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
      remonteeId: true,
      ficheSSEId: true,
      ecartAmianteId: true,
      ecarts: { select: { id: true } },
    },
  });

  // Seules les actions propres à la remontée disparaissent avec elle : celles
  // héritées appartiennent à l'écart ou à l'évènement, qui restent.
  const actionsPropresListe = actions.filter((a) => a.remonteeId === remontee.id);
  const actionsPropres = actionsPropresListe.length;

  const origineAction = (a: (typeof actions)[number]) => {
    if (a.remonteeId === remontee.id) return "Remontée";
    if (a.ficheSSEId) return "Évènement";
    if (a.ecarts.length > 0) return "Écart";
    if (a.ecartAmianteId) return "Écart amiante";
    return "—";
  };

  const [dossiers, autresRemontees, ecartsChoix, evenementsChoix] = await Promise.all([
    prisma.dossier.findMany({ distinct: ["chantier"], select: { chantier: true } }),
    prisma.remonteeInfo.findMany({ distinct: ["chantierService"], select: { chantierService: true } }),
    prisma.ecart.findMany({
      orderBy: { reference: "asc" },
      select: { id: true, reference: true, description: true, dossier: { select: { chantier: true } } },
    }),
    prisma.ficheSSE.findMany({
      orderBy: { reference: "asc" },
      select: { id: true, reference: true, nomChantier: true, descriptionFactuelle: true },
    }),
  ]);
  const chantiersConnus = [
    ...new Set([...dossiers.map((d) => d.chantier), ...autresRemontees.map((r) => r.chantierService)]),
  ].sort();

  // Transformée = un écart est né de cette remontée. Un simple rattachement à
  // un écart existant ne fige rien : c'est le statut qui fait foi.
  const dejaTransformee = remontee.statut === "TRANSFORMEE_EN_ECART";
  const ecartOrigine = remontee.ecarts.find((e) => e.id === remontee.ecartOrigineId);
  const nbRattachements = remontee.ecarts.length || (remontee.ficheSSE ? 1 : 0);

  const chrono: EvenementChrono[] = [
    {
      date: remontee.dateRemontee,
      titre: "Information remontée",
      detail: [remontee.personneRemontant && `Par ${remontee.personneRemontant}`, remontee.chantierService]
        .filter(Boolean)
        .join(" · "),
      ton: "ambre",
    },
    ...(ecartOrigine
      ? [
          {
            date: ecartOrigine.createdAt,
            titre: `Écart ${ecartOrigine.reference} créé à partir de cette remontée`,
            href: `/ecarts/${ecartOrigine.id}`,
            ton: "violet" as const,
          },
        ]
      : []),
    ...actionsPropresListe.flatMap<EvenementChrono>((a) => [
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
    ...remontee.rex.map<EvenementChrono>((r) => ({
      date: r.createdAt,
      titre: `REX ${r.reference} créé`,
      detail: r.titre,
      href: `/rex/${r.id}`,
      ton: "violet",
    })),
    ...(remontee.modifieLe
      ? [
          {
            date: remontee.modifieLe,
            titre: "Fiche modifiée",
            detail: remontee.modifiePar ? `Par ${remontee.modifiePar}` : undefined,
            ton: "neutre" as const,
          },
        ]
      : []),
  ];

  const lienAjout = buttonVariants({ variant: "outline", size: "sm" });

  return (
    <div className="mx-auto max-w-[80rem] px-4 py-8 lg:px-8">
      <nav data-no-print aria-label="Fil d'Ariane" className="mb-5 flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/remontees" className="hover:text-foreground hover:underline">
          Remontées
        </Link>
        <ChevronRightIcon className="size-3.5" aria-hidden />
        <span className="text-foreground">{remontee.reference}</span>
      </nav>

      {/* Un <div> et non un <header> : la feuille d'impression masque tous les
          <header> (c'est ainsi qu'elle retire la barre du haut), le titre
          disparaîtrait du PDF. */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 max-w-3xl space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold tracking-wide text-primary-foreground">
              {remontee.reference}
            </span>
            <BadgeStatut label={STATUT_REMONTEE_LABELS[remontee.statut]} ton={TON_STATUT[remontee.statut]} />
          </div>
          <h1 className="font-display text-3xl font-semibold leading-tight tracking-tight">{remontee.objet}</h1>
        </div>
        <div data-no-print className="flex flex-wrap items-center gap-2">
          <EditionPanneau
            titre={`Modifier ${remontee.reference}`}
            description="Les changements sont enregistrés pour tous."
            action={mettreAJourRemontee}
            hiddenFields={{ id: remontee.id }}
          >
            <RemonteeFields v={remontee} chantiersConnus={chantiersConnus} />
          </EditionPanneau>
          {remontee.statut !== "TRAITEE" && !dejaTransformee && (
            <form action={marquerRemonteeTraitee}>
              <input type="hidden" name="id" value={remontee.id} />
              <button type="submit" className={buttonVariants({ variant: "outline", size: "lg" })}>
                <CheckIcon /> Marquer comme traitée
              </button>
            </form>
          )}
          {!dejaTransformee && (
            <Link href={`/ecarts/nouveau?remonteeId=${remontee.id}`} className={buttonVariants({ size: "lg" })}>
              <PlusIcon /> Transformer en écart
            </Link>
          )}
        </div>
      </div>

      <div className="mb-8">
        {/* Une fois l'écart créé, le statut décrit un fait acquis : on retire le
            sélecteur plutôt que de laisser proposer un choix qui sera refusé. */}
        {dejaTransformee ? (
          <div
            data-no-print
            className="inline-flex items-center gap-2 rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground"
          >
            <LockIcon className="size-4 shrink-0" aria-hidden />
            Statut figé : cette remontée a été transformée en écart.
          </div>
        ) : (
          <StatutParcours
            action={mettreAJourStatutRemontee}
            id={remontee.id}
            etapes={ETAPES_STATUT}
            courant={remontee.statut}
          />
        )}
      </div>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_21rem]">
        <div className="space-y-8">
          <div className="grid gap-4 sm:grid-cols-2">
            <Carte className="p-5">
              <TexteLong label="Description" valeur={remontee.description} />
            </Carte>
            <Carte className="p-5">
              <TexteLong label="Suite donnée" valeur={remontee.suiteDonnee} />
            </Carte>
          </div>

          {(remontee.natures.length > 0 || remontee.categories.length > 0) && (
            <Carte className="grid gap-4 p-5 sm:grid-cols-2">
              <Pastilles label="Nature" valeurs={remontee.natures} />
              <Pastilles label="Catégorie" valeurs={remontee.categories} />
            </Carte>
          )}

          <FicheSection titre={dejaTransformee ? "Transformée en écart" : "Rattachement"} compteur={nbRattachements}>
            {!dejaTransformee && (
              <p className="text-sm text-muted-foreground">
                Une remontée d’information peut rester une simple information, ou être transformée en écart si
                nécessaire.
              </p>
            )}
            {remontee.ecarts.length > 0 ? (
              <Carte>
                <ul className="divide-y">
                  {remontee.ecarts.map((e) => (
                    <li key={e.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm">
                      <div className="min-w-0">
                        <p>
                          <Link href={`/ecarts/${e.id}`} className="font-medium underline-offset-4 hover:underline">
                            Écart {e.reference}
                          </Link>
                          {e.dossier && <span className="text-muted-foreground"> — {e.dossier.chantier}</span>}
                          {/* Parmi plusieurs écarts rattachés, celui qui est né de cette
                              remontée doit rester identifiable. */}
                          {e.id === remontee.ecartOrigineId && (
                            <span className="ml-2 rounded-md bg-violet-500/10 px-1.5 py-0.5 text-xs font-medium text-violet-700">
                              issu de cette remontée
                            </span>
                          )}
                        </p>
                        {e.description?.trim() && (
                          <p className="mt-0.5 line-clamp-1 text-muted-foreground">{e.description}</p>
                        )}
                      </div>
                      <BadgeStatut label={STATUT_DOSSIER_ECART_LABELS[e.statut]} ton={TON_ECART[e.statut]} />
                    </li>
                  ))}
                </ul>
              </Carte>
            ) : remontee.ficheSSE ? (
              <Carte className="px-4 py-3 text-sm">
                <Link href={`/fiches-sse/${remontee.ficheSSE.id}`} className="font-medium underline-offset-4 hover:underline">
                  Évènement SSE {remontee.ficheSSE.reference}
                </Link>
                {remontee.ficheSSE.nomChantier && (
                  <span className="text-muted-foreground"> — {remontee.ficheSSE.nomChantier}</span>
                )}
              </Carte>
            ) : (
              <EtatVide>Cette remontée n’est rattachée à aucun écart ni évènement.</EtatVide>
            )}

            {/* Une remontée transformée garde son rattachement : le détacher
                laisserait un écart sans origine traçable. */}
            {!dejaTransformee && (
              <div data-no-print>
                <ChangerRattachement
                  action={changerRattachementRemontee}
                  hiddenFields={{ id: remontee.id }}
                  types={[
                    {
                      cle: "ecart",
                      libelle: "Écart",
                      champ: "ecartIds",
                      multiple: true,
                      valeurActuelle: remontee.ecarts[0]?.id ?? null,
                      valeursActuelles: remontee.ecarts.map((e) => e.id),
                      options: ecartsChoix.map((e) => ({
                        id: e.id,
                        libelle: libelleRattachement(e.reference, e.dossier?.chantier ?? null, e.description),
                      })),
                    },
                    {
                      cle: "evenement",
                      libelle: "Évènement SSE",
                      champ: "ficheSSEId",
                      valeurActuelle: remontee.ficheSSEId,
                      options: evenementsChoix.map((e) => ({
                        id: e.id,
                        libelle: libelleRattachement(e.reference, e.nomChantier, e.descriptionFactuelle),
                      })),
                    },
                  ]}
                />
              </div>
            )}
          </FicheSection>

          <FicheSection
            titre="Plan d’action"
            compteur={actions.length}
            action={
              <Link href={`/plan-action/nouveau?remonteeId=${remontee.id}`} className={lienAjout} data-no-print>
                <PlusIcon /> Action
              </Link>
            }
          >
            {actions.length === 0 ? (
              <EtatVide>Aucune action n’a encore été définie pour cette remontée.</EtatVide>
            ) : (
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
                        <TableCell className="max-w-sm whitespace-normal">{a.action}</TableCell>
                        <TableCell className="text-muted-foreground">{origineAction(a)}</TableCell>
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
            compteur={remontee.rex.length}
            action={
              remontee.rex.length === 0 ? (
                <Link href={`/rex/nouveau?remonteeId=${remontee.id}`} className={lienAjout} data-no-print>
                  <PlusIcon /> REX
                </Link>
              ) : undefined
            }
          >
            {remontee.rex.length === 0 ? (
              <EtatVide>Aucun REX pour cette remontée.</EtatVide>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {remontee.rex.map((r) => (
                  <Link key={r.id} href={`/rex/${r.id}`} className="rounded-xl border bg-card p-4 transition-colors hover:bg-muted/50">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="text-sm font-medium">{r.reference}</span>
                      <BadgeStatut label={STATUT_REX_LABELS[r.statut]} ton={TON_REX[r.statut]} />
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
              <Propriete label="Date de remontée">{remontee.dateRemontee.toLocaleDateString("fr-FR")}</Propriete>
              <Propriete label="Origine">{ORIGINE_REMONTEE_LABELS[remontee.origine]}</Propriete>
              <Propriete label="Chantier / Service">{remontee.chantierService}</Propriete>
              <Propriete label="Remontée par">{remontee.personneRemontant || "—"}</Propriete>
              <Propriete label="Enregistrée par">{remontee.personneSaisie || "—"}</Propriete>
            </Proprietes>
          </Carte>
          <div data-no-print className="flex flex-wrap gap-2 pt-1">
            <BoutonExportPDF className="" />
            <BoutonArchiver
              action={remontee.archiveLe ? desarchiver : archiver}
              entite="remontee"
              id={remontee.id}
              archive={!!remontee.archiveLe}
              className=""
            />
            {/* Supprimer une remontée transformée effacerait l'origine d'un écart
                qui, lui, reste au registre : seul l'archivage est proposé. */}
            {!dejaTransformee && (
              <BoutonSupprimer
                action={supprimerRemontee}
                hiddenFields={{ id: remontee.id }}
                message={
                  actionsPropres > 0
                    ? `Supprimer cette remontée supprimera aussi ses ${actionsPropres} action(s) propre(s). Les actions héritées de l'écart ou de l'évènement rattaché ne sont pas touchées. Cette action est irréversible. Continuer ?`
                    : "Supprimer cette remontée d'information ? Cette action est irréversible."
                }
                className=""
              />
            )}
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            Créée le {remontee.createdAt.toLocaleDateString("fr-FR")}
            {remontee.modifieLe &&
              ` · modifiée le ${remontee.modifieLe.toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}${
                remontee.modifiePar ? ` par ${remontee.modifiePar}` : ""
              }`}
          </p>
        </aside>
      </div>
    </div>
  );
}
