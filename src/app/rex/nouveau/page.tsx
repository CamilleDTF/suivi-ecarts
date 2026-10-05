import { prisma } from "@/lib/prisma";
import { RexWizard } from "@/components/rex-wizard";
import { RexListePane, type RexListeSearchParams } from "@/components/rex-liste-pane";
import { SplitView } from "@/components/split-view";
import { libelleRattachement } from "@/lib/labels";

export default async function NouveauRexPage({
  searchParams,
}: {
  searchParams: Promise<
    RexListeSearchParams & {
      ecartId?: string;
      ficheSSEId?: string;
      ecartAmianteId?: string;
      remonteeId?: string;
    }
  >;
}) {
  const resolvedSearchParams = await searchParams;
  const { ecartId, ficheSSEId, ecartAmianteId, remonteeId } = resolvedSearchParams;

  const [fiche, ecartAmiante, remontee] = await Promise.all([
    ficheSSEId ? prisma.ficheSSE.findUnique({ where: { id: ficheSSEId } }) : null,
    ecartAmianteId ? prisma.ecartAmiante.findUnique({ where: { id: ecartAmianteId } }) : null,
    remonteeId ? prisma.remonteeInfo.findUnique({ where: { id: remonteeId } }) : null,
  ]);
  const ecartImpose = !fiche && !ecartAmiante && !remontee && ecartId
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
        : ecartImpose
          ? {
              type: "ecart" as const,
              id: ecartImpose.id,
              libelle: `Écart ${ecartImpose.reference}${ecartImpose.dossier?.chantier ? ` — ${ecartImpose.dossier.chantier}` : ""}`,
            }
          : null;

  const [ecarts, evenements, amiantes, remontees] = parentImpose
    ? [[], [], [], []]
    : await Promise.all([
        prisma.ecart.findMany({
          orderBy: { dateDetection: "desc" },
          select: { id: true, reference: true, description: true, dateDetection: true, dossier: { select: { chantier: true } } },
        }),
        prisma.ficheSSE.findMany({
          orderBy: { reference: "asc" },
          select: { id: true, reference: true, nomChantier: true, descriptionFactuelle: true },
        }),
        prisma.ecartAmiante.findMany({
          orderBy: { reference: "asc" },
          select: { id: true, reference: true, nomChantier: true, description: true },
        }),
        prisma.remonteeInfo.findMany({
          orderBy: { reference: "asc" },
          select: { id: true, reference: true, chantierService: true, objet: true },
        }),
      ]);

  return (
    <SplitView liste={<RexListePane searchParams={resolvedSearchParams} />} detailOuvert>
      <RexWizard
        parentImpose={parentImpose}
        ecarts={ecarts.map((e) => ({
          id: e.id,
          reference: e.reference,
          libelle: e.description?.trim().replace(/\s+/g, " ")?.slice(0, 90) ?? "—",
          date: e.dateDetection.toISOString(),
          chantier: e.dossier?.chantier ?? null,
        }))}
        evenements={evenements.map((e) => ({
          id: e.id,
          reference: e.reference,
          libelle: libelleRattachement(e.reference, e.nomChantier, e.descriptionFactuelle),
          date: null,
          chantier: e.nomChantier ?? null,
        }))}
        amiantes={amiantes.map((e) => ({
          id: e.id,
          reference: e.reference,
          libelle: libelleRattachement(e.reference, e.nomChantier, e.description),
          date: null,
          chantier: e.nomChantier ?? null,
        }))}
        remontees={remontees.map((r) => ({
          id: r.id,
          reference: r.reference,
          libelle: libelleRattachement(r.reference, r.chantierService, r.objet),
          date: null,
          chantier: r.chantierService ?? null,
        }))}
      />
    </SplitView>
  );
}
