import { prisma } from "@/lib/prisma";
import { RexWizard } from "@/components/rex-wizard";
import { libelleRattachement } from "@/lib/labels";
import { lirePeriodeProposition, prefillDepuisProposition } from "@/lib/propositions-rex";

export default async function NouveauRexPage({
  searchParams,
}: {
  searchParams: Promise<{
    ecartId?: string;
    ficheSSEId?: string;
    ecartAmianteId?: string;
    remonteeId?: string;
    reclamationId?: string;
    // Venue de l'outil de propositions : un sujet et la période analysée.
    proposition?: string;
    periode?: string;
  }>;
}) {
  const params = await searchParams;
  const prefill = params.proposition
    ? await prefillDepuisProposition(params.proposition, lirePeriodeProposition(params.periode))
    : null;
  // Sans assez d'écarts pour un REX « récurrent », la proposition se fixe sur son fait principal.
  const parent = prefill?.parent ?? null;
  const ecartId = parent?.parametre === "ecartId" ? parent.id : params.ecartId;
  const ficheSSEId = parent?.parametre === "ficheSSEId" ? parent.id : params.ficheSSEId;
  const ecartAmianteId = parent?.parametre === "ecartAmianteId" ? parent.id : params.ecartAmianteId;
  const remonteeId = parent?.parametre === "remonteeId" ? parent.id : params.remonteeId;

  const reclamationId = params.reclamationId;

  const [fiche, ecartAmiante, remontee, reclamation] = await Promise.all([
    ficheSSEId ? prisma.ficheSSE.findUnique({ where: { id: ficheSSEId } }) : null,
    ecartAmianteId ? prisma.ecartAmiante.findUnique({ where: { id: ecartAmianteId } }) : null,
    remonteeId ? prisma.remonteeInfo.findUnique({ where: { id: remonteeId } }) : null,
    reclamationId
      ? prisma.reclamation.findUnique({ where: { id: reclamationId }, select: { id: true, reference: true, objet: true } })
      : null,
  ]);
  const ecartImpose = !fiche && !ecartAmiante && !remontee && !reclamation && ecartId
    ? await prisma.ecart.findUnique({
        where: { id: ecartId },
        select: { id: true, reference: true, dossier: { select: { chantier: true } } },
      })
    : null;

  const parentImpose = fiche
    ? { type: "evenement" as const, id: fiche.id, libelle: `Évènement ${fiche.reference}${fiche.nomChantier ? ` — ${fiche.nomChantier}` : ""}` }
    : ecartAmiante
      ? { type: "amiante" as const, id: ecartAmiante.id, libelle: `Écart amiante ${ecartAmiante.reference} — ${ecartAmiante.nomChantier}` }
      : remontee
        ? { type: "remontee" as const, id: remontee.id, libelle: `Remontée ${remontee.reference} — ${remontee.objet}` }
        : reclamation
          ? { type: "reclamation" as const, id: reclamation.id, libelle: `Réclamation ${reclamation.reference} — ${reclamation.objet}` }
          : ecartImpose
          ? {
              type: "ecart" as const,
              id: ecartImpose.id,
              libelle: `Écart ${ecartImpose.reference}${ecartImpose.dossier?.chantier ? ` — ${ecartImpose.dossier.chantier}` : ""}`,
            }
          : null;

  const [ecarts, evenements, amiantes, remontees, reclamations] = parentImpose
    ? [[], [], [], [], []]
    : await Promise.all([
        prisma.ecart.findMany({
          where: { archiveLe: null },
          orderBy: { dateDetection: "desc" },
          select: { id: true, reference: true, description: true, dateDetection: true, dossier: { select: { chantier: true } } },
        }),
        prisma.ficheSSE.findMany({
          where: { archiveLe: null },
          orderBy: { reference: "asc" },
          select: { id: true, reference: true, nomChantier: true, descriptionFactuelle: true, dateHeure: true, createdAt: true },
        }),
        prisma.ecartAmiante.findMany({
          where: { archiveLe: null },
          orderBy: { reference: "asc" },
          select: { id: true, reference: true, nomChantier: true, description: true, date: true },
        }),
        prisma.remonteeInfo.findMany({
          where: { archiveLe: null },
          orderBy: { reference: "asc" },
          select: { id: true, reference: true, chantierService: true, objet: true, dateRemontee: true },
        }),
        prisma.reclamation.findMany({
          where: { archiveLe: null },
          orderBy: { reference: "asc" },
          select: { id: true, reference: true, chantier: true, emetteur: true, objet: true, dateReception: true },
        }),
      ]);
  const court = (texte: string | null | undefined) => texte?.trim().replace(/\s+/g, " ").slice(0, 90) || "—";

  return (
    <RexWizard
      parentImpose={parentImpose}
      depart={
        prefill
          ? {
              mode: prefill.mode,
              elements: prefill.elements,
              titre: prefill.titre,
              raisonDiffusion: prefill.raisonDiffusion,
              pointsCommuns: prefill.pointsCommuns,
              themes: prefill.themes,
              noteInterne: prefill.noteInterne,
            }
          : null
      }
      ecarts={ecarts.map((e) => ({
        id: e.id,
        reference: e.reference,
        libelle: e.description?.trim().replace(/\s+/g, " ")?.slice(0, 90) ?? "—",
        intitule: court(e.description),
        date: e.dateDetection.toISOString(),
        chantier: e.dossier?.chantier ?? null,
      }))}
      evenements={evenements.map((e) => ({
        id: e.id,
        reference: e.reference,
        libelle: libelleRattachement(e.reference, e.nomChantier, e.descriptionFactuelle),
        intitule: court(e.descriptionFactuelle),
        date: (e.dateHeure ?? e.createdAt).toISOString(),
        chantier: e.nomChantier ?? null,
      }))}
      amiantes={amiantes.map((e) => ({
        id: e.id,
        reference: e.reference,
        libelle: libelleRattachement(e.reference, e.nomChantier, e.description),
        intitule: court(e.description),
        date: e.date.toISOString(),
        chantier: e.nomChantier ?? null,
      }))}
      remontees={remontees.map((r) => ({
        id: r.id,
        reference: r.reference,
        libelle: libelleRattachement(r.reference, r.chantierService, r.objet),
        intitule: court(r.objet),
        date: r.dateRemontee.toISOString(),
        chantier: r.chantierService ?? null,
      }))}
      reclamations={reclamations.map((r) => ({
        id: r.id,
        reference: r.reference,
        libelle: libelleRattachement(r.reference, r.chantier ?? r.emetteur, r.objet),
        intitule: court(r.objet),
        date: r.dateReception.toISOString(),
        chantier: r.chantier ?? null,
      }))}
    />
  );
}
