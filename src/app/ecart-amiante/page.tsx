import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { BadgeStatut, type TonStatut } from "@/components/badge-statut";
import { EnteteTriable } from "@/components/entete-triable";
import { FiltresListe } from "@/components/filtres-liste";
import { BoutonArchives, BoutonNouveau, CadreTableau, ConteneurPage, EntetePage } from "@/components/page-liste";
import { Pagination } from "@/components/pagination";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { STATUT_DOSSIER_ECART_LABELS } from "@/lib/labels";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";
import { construireTri } from "@/lib/tri";
import { cn } from "@/lib/utils";

const ONGLETS = [
  { valeur: "tous", label: "Tous" },
  { valeur: "ouverts", label: "Ouverts" },
  { valeur: "en_cours", label: "En cours" },
  { valeur: "clotures", label: "Clôturés" },
] as const;

const POINT_ONGLET: Record<string, string> = {
  ouverts: "bg-amber-500",
  en_cours: "bg-blue-500",
  clotures: "bg-emerald-500",
};

const TON_STATUT: Record<string, TonStatut> = {
  A_QUALIFIER: "neutre",
  OUVERT: "ambre",
  EN_COURS: "bleu",
  CLOTURE: "vert",
};

const COLONNES_TRI = {
  reference: "reference",
  chantier: "nomChantier",
  conducteur: "conducteur",
  chef: "chef",
  statut: "statut",
  date: "date",
};

const PERIODE_OPTIONS = [
  { value: "", label: "Toutes les périodes" },
  { value: "7j", label: "7 derniers jours" },
  { value: "30j", label: "30 derniers jours" },
  { value: "annee", label: "Cette année" },
];

function dateDebutPeriode(periode: string | undefined): Date | undefined {
  const maintenant = new Date();
  if (periode === "7j") return new Date(maintenant.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (periode === "30j") return new Date(maintenant.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (periode === "annee") return new Date(maintenant.getFullYear(), 0, 1);
  return undefined;
}

export default async function EcartAmiantePage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    onglet?: string;
    periode?: string;
    page?: string;
    taille?: string;
    tri?: string;
    sens?: string;
    archives?: string;
  }>;
}) {
  const { q, onglet, periode, page: pageParam, taille, tri, sens, archives } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);
  const debutPeriode = dateDebutPeriode(periode);

  const contient = { contains: q, mode: "insensitive" as const };
  // Les compteurs des onglets partagent ce socle (archives comprises) : ils
  // doivent compter ce que la liste afficherait en cliquant sur l'onglet.
  const whereBase = {
    ...filtreArchive(archives),
    date: debutPeriode ? { gte: debutPeriode } : undefined,
    OR: q
      ? [
          { reference: contient },
          { nomChantier: contient },
          { numeroChantier: contient },
          { conducteur: contient },
          { chef: contient },
          { zone: contient },
          { processus: contient },
          { typeAnalyse: contient },
          { referenceAnalyse: contient },
          { typeEcart: contient },
          { resultatAttendu: contient },
          { resultatObtenu: contient },
          { description: contient },
          { personneConcernee: contient },
          { pasNouvelleAnalyse: contient },
          { laboratoireNouvelleAnalyse: contient },
          { chantierNouvelleAnalyse: contient },
          { resultatAttenduNouvelleAnalyse: contient },
          { resultatObtenuNouvelleAnalyse: contient },
          { cause: contient },
        ]
      : undefined,
  };

  const whereOnglet =
    onglet === "ouverts"
      ? { statut: "OUVERT" as const }
      : onglet === "en_cours"
        ? { statut: "EN_COURS" as const }
        : onglet === "clotures"
          ? { statut: "CLOTURE" as const }
          : {};

  const where = { ...whereBase, ...whereOnglet };

  const [total, ecarts, totalTous, totalOuverts, totalEnCours, totalClotures] = await Promise.all([
    prisma.ecartAmiante.count({ where }),
    prisma.ecartAmiante.findMany({
      where,
      orderBy: construireTri(tri, sens, COLONNES_TRI, { createdAt: "desc" as const }),
      select: {
        id: true,
        reference: true,
        nomChantier: true,
        numeroChantier: true,
        conducteur: true,
        chef: true,
        statut: true,
        date: true,
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
    prisma.ecartAmiante.count({ where: whereBase }),
    prisma.ecartAmiante.count({ where: { ...whereBase, statut: "OUVERT" } }),
    prisma.ecartAmiante.count({ where: { ...whereBase, statut: "EN_COURS" } }),
    prisma.ecartAmiante.count({ where: { ...whereBase, statut: "CLOTURE" } }),
  ]);

  const compteurs: Record<string, number> = {
    tous: totalTous,
    ouverts: totalOuverts,
    en_cours: totalEnCours,
    clotures: totalClotures,
  };
  const ongletActif = onglet ?? "tous";
  const filtreActif = !!q || !!periode;
  const paramsEntete = { q, onglet, periode, taille, archives };

  // Changer d'onglet conserve recherche, période, tri et archives ; la page repart à 1.
  function hrefOnglet(valeur: string) {
    const query: Record<string, string> = {};
    for (const [cle, v] of Object.entries({ q, periode, taille, tri, sens, archives })) {
      if (v) query[cle] = v;
    }
    if (valeur !== "tous") query.onglet = valeur;
    return { pathname: "/ecart-amiante", query };
  }

  return (
    <ConteneurPage>
      <EntetePage
        titre={archives === "1" ? "Écarts amiante archivés" : "Écarts amiante"}
        sousTitre={`${total} écart${total > 1 ? "s" : ""} amiante${filtreActif || onglet ? " correspondant aux filtres" : ""}`}
      >
        <BoutonArchives basePath="/ecart-amiante" archives={archives} params={{ q, onglet, periode, taille, tri, sens }} />
        <BoutonNouveau href="/ecart-amiante/nouveau">Nouvel écart amiante</BoutonNouveau>
      </EntetePage>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {ONGLETS.map((o) => {
          const actif = ongletActif === o.valeur;
          return (
            <Link
              key={o.valeur}
              href={hrefOnglet(o.valeur)}
              aria-current={actif ? "true" : undefined}
              className={cn(
                "rounded-xl border bg-card px-4 py-3 transition-all hover:border-primary/40",
                actif && "border-primary ring-2 ring-primary/15",
              )}
            >
              <p className="text-3xl font-semibold tabular-nums">{compteurs[o.valeur]}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                {POINT_ONGLET[o.valeur] && <span className={cn("size-2 rounded-full", POINT_ONGLET[o.valeur])} aria-hidden />}
                {o.label}
              </p>
            </Link>
          );
        })}
      </div>

      <div className="mb-4">
        <FiltresListe
          basePath="/ecart-amiante"
          placeholder="Rechercher un écart amiante, un chantier, un conducteur…"
          recherche={q ?? ""}
          conserves={{ onglet, tri, sens, taille, archives }}
          filtres={[{ name: "periode", valeur: periode ?? "", options: PERIODE_OPTIONS }]}
        />
      </div>

      <CadreTableau>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <EnteteTriable colonne="reference" libelle="Référence" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="chantier" libelle="Chantier" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="conducteur" libelle="Conducteur" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="chef" libelle="Chef" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="statut" libelle="Statut" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <EnteteTriable colonne="date" libelle="Date" triActuel={tri} sensActuel={sens} params={paramsEntete} />
            </TableRow>
          </TableHeader>
          <TableBody>
            {ecarts.map((e) => (
              <TableRow key={e.id}>
                <TableCell>
                  <Link href={`/ecart-amiante/${e.id}`} className="font-medium underline-offset-4 hover:underline">
                    {e.reference}
                  </Link>
                </TableCell>
                <TableCell className="max-w-xs truncate">
                  {e.nomChantier} <span className="text-muted-foreground">({e.numeroChantier})</span>
                </TableCell>
                <TableCell className="text-muted-foreground">{e.conducteur}</TableCell>
                <TableCell className="text-muted-foreground">{e.chef}</TableCell>
                <TableCell>
                  <BadgeStatut label={STATUT_DOSSIER_ECART_LABELS[e.statut]} ton={TON_STATUT[e.statut]} />
                </TableCell>
                <TableCell className="tabular-nums text-muted-foreground">{e.date.toLocaleDateString("fr-FR")}</TableCell>
              </TableRow>
            ))}
            {ecarts.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                  {filtreActif || onglet ? "Aucun écart amiante ne correspond à ce filtre." : "Aucun écart amiante pour l'instant."}
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
            baseParams={{ q, onglet, periode, taille, tri, sens, archives }}
          />
        )}
      </CadreTableau>
    </ConteneurPage>
  );
}
