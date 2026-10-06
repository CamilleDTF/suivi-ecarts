import { dateParis } from "@/lib/date-paris";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BadgeBrouillon, BadgeNatureRex, BadgeStatutRex } from "@/components/badges-rex";
import { EnteteTriable } from "@/components/entete-triable";
import { FiltresListe } from "@/components/filtres-liste";
import { BoutonArchives, BoutonNouveau, CadreTableau, ConteneurPage, EntetePage } from "@/components/page-liste";
import { Pagination } from "@/components/pagination";
import { StatTile } from "@/components/stat-tile";
import { IconFileText, IconSend } from "@/components/icons";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrigineREX, StatutREX, NatureREX } from "@/generated/prisma/enums";
import { ORIGINE_REX_LABELS, STATUT_REX_LABELS, NATURE_REX_LABELS } from "@/lib/labels";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";
import { construireTri } from "@/lib/tri";

const COLONNES_TRI = {
  date: "createdAt",
};

const LIEN_RATTACHEMENT = "text-muted-foreground underline-offset-4 hover:text-foreground hover:underline";

export default async function RexPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    statut?: string;
    origine?: string;
    nature?: string;
    page?: string;
    taille?: string;
    archives?: string;
    tri?: string;
    sens?: string;
  }>;
}) {
  const { q, statut, origine, nature, page: pageParam, taille, archives, tri, sens } = await searchParams;
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

  const [total, rex, parStatut, brouillonsCount] = await Promise.all([
    prisma.rex.count({ where }),
    prisma.rex.findMany({
      where,
      orderBy: construireTri(tri, sens, COLONNES_TRI, { createdAt: "desc" as const }),
      include: {
        ecarts: { select: { id: true, reference: true } },
        ficheSSE: { select: { id: true, reference: true } },
        ecartAmiante: { select: { id: true, reference: true } },
        remontee: { select: { id: true, reference: true } },
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
    prisma.rex.groupBy({ by: ["statut"], _count: { _all: true }, where: { brouillon: false } }),
    prisma.rex.count({ where: { brouillon: true } }),
  ]);

  const compte = Object.fromEntries(parStatut.map((s) => [s.statut, s._count._all]));
  const totalPublies = Object.values(compte).reduce((s: number, v) => s + (v as number), 0);
  const totalDiffuses = (compte.DIFFUSE ?? 0) + (compte.EFFICACITE_VERIFIEE ?? 0);
  const tauxDiffusion = totalPublies > 0 ? Math.round((totalDiffuses / totalPublies) * 100) : 0;
  const filtreActif = !!q || !!statut || !!origine || !!nature;
  const paramsEntete = { q, statut, origine, nature, taille, archives };

  return (
    <ConteneurPage>
      <EntetePage
        titre={archives === "1" ? "REX archivés" : "Retours d'expérience"}
        sousTitre="Enseignements capitalisés à partir des écarts, évènements SSE, écarts amiante et remontées."
      >
        <BoutonArchives basePath="/rex" archives={archives} params={{ q, statut, origine, nature, taille, tri, sens }} />
        <BoutonNouveau href="/rex/nouveau">Nouveau REX</BoutonNouveau>
      </EntetePage>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Rédigés" value={compte.REDIGE ?? 0} icon={<IconFileText className="h-5 w-5" />} couleur="bleu" />
        <StatTile label="Diffusés" value={compte.DIFFUSE ?? 0} icon={<IconSend className="h-5 w-5" />} couleur="violet" />
        <StatTile
          label="Efficacité vérifiée"
          value={compte.EFFICACITE_VERIFIEE ?? 0}
          icon={<IconFileText className="h-5 w-5" />}
          couleur="vert"
        />
        <StatTile
          label="Taux de diffusion"
          value={totalPublies > 0 ? `${tauxDiffusion}%` : "—"}
          icon={<IconSend className="h-5 w-5" />}
          couleur="orange"
        />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1 basis-[36rem]">
          <FiltresListe
            basePath="/rex"
            placeholder="Rechercher un REX…"
            recherche={q ?? ""}
            conserves={{ tri, sens, taille, archives }}
            filtres={[
              {
                name: "nature",
                valeur: nature ?? "",
                options: [
                  { value: "", label: "Toutes les natures" },
                  ...Object.values(NatureREX).map((n) => ({ value: n, label: NATURE_REX_LABELS[n] })),
                ],
              },
              {
                name: "statut",
                valeur: statut ?? "",
                options: [
                  { value: "", label: "Tous les statuts" },
                  ...Object.values(StatutREX).map((s) => ({ value: s, label: STATUT_REX_LABELS[s] })),
                ],
              },
              {
                name: "origine",
                valeur: origine ?? "",
                options: [
                  { value: "", label: "Toutes les origines" },
                  ...Object.values(OrigineREX).map((o) => ({ value: o, label: ORIGINE_REX_LABELS[o] })),
                ],
              },
            ]}
          />
        </div>
        {brouillonsCount > 0 && (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            {brouillonsCount} brouillon{brouillonsCount > 1 ? "s" : ""}
          </span>
        )}
      </div>

      <CadreTableau>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Référence</TableHead>
              <EnteteTriable colonne="date" libelle="Date" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <TableHead>Titre</TableHead>
              <TableHead>Nature</TableHead>
              <TableHead>Rattaché à</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rex.map((r) => (
              <TableRow key={r.id}>
                <TableCell>
                  <Link href={`/rex/${r.id}`} className="font-medium underline-offset-4 hover:underline">
                    {r.reference}
                  </Link>
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">
                  {dateParis(r.createdAt)}
                </TableCell>
                <TableCell className="max-w-sm truncate">{r.titre}</TableCell>
                <TableCell>
                  <BadgeNatureRex nature={r.nature} />
                </TableCell>
                <TableCell>
                  {r.ecarts.length > 0 ? (
                    <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {r.ecarts.map((e) => (
                        <Link key={e.id} href={`/ecarts/${e.id}`} className={LIEN_RATTACHEMENT}>
                          {e.reference}
                        </Link>
                      ))}
                    </span>
                  ) : r.ficheSSE ? (
                    <Link href={`/fiches-sse/${r.ficheSSE.id}`} className={LIEN_RATTACHEMENT}>
                      {r.ficheSSE.reference}
                    </Link>
                  ) : r.ecartAmiante ? (
                    <Link href={`/ecart-amiante/${r.ecartAmiante.id}`} className={LIEN_RATTACHEMENT}>
                      {r.ecartAmiante.reference}
                    </Link>
                  ) : r.remontee ? (
                    <Link href={`/remontees/${r.remontee.id}`} className={LIEN_RATTACHEMENT}>
                      {r.remontee.reference}
                    </Link>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    {r.brouillon && <BadgeBrouillon />}
                    <BadgeStatutRex statut={r.statut} />
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {rex.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  {filtreActif ? "Aucun REX ne correspond à ce filtre." : "Aucun REX pour l'instant."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {total > 0 && (
          <Pagination
            total={total}
            page={page}
            pageSize={taillePage}
            baseParams={{ q, statut, origine, nature, taille, tri, sens, archives }}
          />
        )}
      </CadreTableau>
    </ConteneurPage>
  );
}
