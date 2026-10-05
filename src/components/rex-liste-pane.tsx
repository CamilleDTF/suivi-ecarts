import { prisma } from "@/lib/prisma";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { ListePane, CLASSE_FILTRE_PANE } from "@/components/liste-pane";
import { OrigineREX, StatutREX, NatureREX } from "@/generated/prisma/enums";
import {
  ORIGINE_REX_LABELS,
  STATUT_REX_COLORS,
  STATUT_REX_LABELS,
  NATURE_REX_LABELS,
  NATURE_REX_COLORS,
} from "@/lib/labels";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";

export type RexListeSearchParams = {
  q?: string;
  statut?: string;
  origine?: string;
  nature?: string;
  page?: string;
  taille?: string;
  archives?: string;
};

/** Panneau de liste des REX : voir EcartsListePane pour le principe. */
export async function RexListePane({
  searchParams,
  selectedId,
}: {
  searchParams: RexListeSearchParams;
  selectedId?: string;
}) {
  const { q, statut, origine, nature, page: pageParam, taille, archives } = searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

  const where = {
    ...filtreArchive(archives),
    statut: statut && statut in StatutREX ? (statut as StatutREX) : undefined,
    origine: origine && origine in OrigineREX ? (origine as OrigineREX) : undefined,
    nature: nature && nature in NatureREX ? (nature as NatureREX) : undefined,
    OR: q
      ? [
          { reference: { contains: q, mode: "insensitive" as const } },
          { titre: { contains: q, mode: "insensitive" as const } },
          { causeRacine: { contains: q, mode: "insensitive" as const } },
          { enseignementsTires: { contains: q, mode: "insensitive" as const } },
        ]
      : undefined,
  };

  const [total, rex] = await Promise.all([
    prisma.rex.count({ where }),
    prisma.rex.findMany({
      where,
      orderBy: { createdAt: "desc" as const },
      select: {
        id: true,
        reference: true,
        createdAt: true,
        titre: true,
        nature: true,
        statut: true,
        brouillon: true,
        ecarts: { select: { reference: true } },
        ficheSSE: { select: { reference: true } },
        ecartAmiante: { select: { reference: true } },
        remontee: { select: { reference: true } },
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
  ]);

  return (
    <ListePane
      titre="Retours d'expérience"
      basePath="/rex"
      nouveau={{ href: "/rex/nouveau", label: "+ Nouveau REX" }}
      recherche={{ valeur: q, placeholder: "Rechercher un REX…" }}
      filtres={
        <>
          <SelectAutoSubmit
            name="nature"
            defaultValue={nature ?? ""}
            className={CLASSE_FILTRE_PANE}
            options={[
              { value: "", label: "Nature : Toutes" },
              ...Object.values(NatureREX).map((n) => ({ value: n, label: NATURE_REX_LABELS[n] })),
            ]}
          />
          <SelectAutoSubmit
            name="statut"
            defaultValue={statut ?? ""}
            className={CLASSE_FILTRE_PANE}
            options={[
              { value: "", label: "Statut : Tous" },
              ...Object.values(StatutREX).map((s) => ({ value: s, label: STATUT_REX_LABELS[s] })),
            ]}
          />
          <SelectAutoSubmit
            name="origine"
            defaultValue={origine ?? ""}
            className={CLASSE_FILTRE_PANE}
            options={[
              { value: "", label: "Origine : Toutes" },
              ...Object.values(OrigineREX).map((o) => ({ value: o, label: ORIGINE_REX_LABELS[o] })),
            ]}
          />
        </>
      }
      filtreActif={!!q || !!statut || !!origine || !!nature}
      archives={archives}
      paramsConserves={{ q, statut, origine, nature, taille }}
      lignes={rex.map((r) => {
        const rattache =
          r.ecarts.length > 0
            ? r.ecarts.map((e) => e.reference).join(", ")
            : (r.ficheSSE ?? r.ecartAmiante ?? r.remontee)?.reference;
        return {
          id: r.id,
          reference: r.reference,
          date: r.createdAt.toLocaleDateString("fr-FR"),
          resume: rattache ? `${r.titre} — ${rattache}` : r.titre,
          badges: [
            ...(r.brouillon ? [{ label: "Brouillon", colorClass: "bg-slate-200 text-slate-700" }] : []),
            { label: STATUT_REX_LABELS[r.statut], colorClass: STATUT_REX_COLORS[r.statut] },
            { label: NATURE_REX_LABELS[r.nature], colorClass: NATURE_REX_COLORS[r.nature] },
          ],
        };
      })}
      selectedId={selectedId}
      messageVide="Aucun REX pour l'instant."
      messageVideFiltre="Aucun REX ne correspond à ce filtre."
      pagination={{ total, page, pageSize: taillePage, baseParams: { q, statut, origine, nature, taille, archives } }}
    />
  );
}
