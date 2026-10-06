import Link from "next/link";
import { RepeatIcon } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { BadgeStatut, type TonStatut } from "@/components/badge-statut";
import { EnteteTriable } from "@/components/entete-triable";
import { FiltresListe } from "@/components/filtres-liste";
import { BoutonArchives, BoutonNouveau, CadreTableau, ConteneurPage, EntetePage } from "@/components/page-liste";
import { Pagination } from "@/components/pagination";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { OrigineRemontee, StatutRemontee } from "@/generated/prisma/enums";
import {
  ORIGINE_REMONTEE_LABELS,
  STATUT_REMONTEE_LABELS,
  CATEGORIES_REMONTEE,
  NATURES_REMONTEE,
  avecValeursExistantes,
} from "@/lib/labels";
import { filtreStatutRemontee } from "@/lib/validation";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";
import { construireTri } from "@/lib/tri";
import { compterOccurrences } from "@/lib/statistiques";
import { cn } from "@/lib/utils";

const COLONNES_TRI = {
  date: "dateRemontee",
};

const TON_STATUT: Record<string, TonStatut> = {
  A_TRAITER: "ambre",
  EN_COURS: "bleu",
  TRAITEE: "vert",
  TRANSFORMEE_EN_ECART: "violet",
};

const TUILES = [
  { statut: "A_TRAITER", label: "À traiter", point: "bg-amber-500" },
  { statut: "EN_COURS", label: "En cours", point: "bg-blue-500" },
  { statut: "TRAITEE", label: "Traitées", point: "bg-emerald-500" },
  { statut: "TRANSFORMEE_EN_ECART", label: "Transformées en écart", point: "bg-violet-500" },
] as const;

export default async function RemonteesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    statut?: string;
    origine?: string;
    categorie?: string;
    chantier?: string;
    page?: string;
    taille?: string;
    archives?: string;
    tri?: string;
    sens?: string;
  }>;
}) {
  const { q, statut, origine, categorie, chantier, page: pageParam, taille, archives, tri, sens } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

  const naturesTrouvees = q
    ? NATURES_REMONTEE.filter((n) => n.toLowerCase().includes(q.toLowerCase()))
    : [];
  const categoriesTrouvees = q
    ? CATEGORIES_REMONTEE.filter((c) => c.toLowerCase().includes(q.toLowerCase()))
    : [];

  // Tout sauf le statut : les tuiles comptent par statut sur ce périmètre, et
  // leur clic y ajoute le statut, de sorte que le nombre affiché est celui de
  // la liste obtenue.
  const base = {
    ...filtreArchive(archives),
    origine: origine && origine in OrigineRemontee ? (origine as OrigineRemontee) : undefined,
    categories: categorie ? { has: categorie } : undefined,
    chantierService: chantier || undefined,
    OR: q
      ? [
          { reference: { contains: q, mode: "insensitive" as const } },
          { objet: { contains: q, mode: "insensitive" as const } },
          { description: { contains: q, mode: "insensitive" as const } },
          { suiteDonnee: { contains: q, mode: "insensitive" as const } },
          { chantierService: { contains: q, mode: "insensitive" as const } },
          { personneRemontant: { contains: q, mode: "insensitive" as const } },
          { personneSaisie: { contains: q, mode: "insensitive" as const } },
          // Chercher la référence du rattachement ramène la remontée : c'est
          // souvent par l'écart qu'on revient à ce qui l'a signalé.
          { ecarts: { some: { reference: { contains: q, mode: "insensitive" as const } } } },
          { ficheSSE: { reference: { contains: q, mode: "insensitive" as const } } },
          // Les natures et catégories sont stockées en tableau : on cherche
          // d'abord les options correspondant au texte saisi, puis on filtre
          // dessus.
          ...(naturesTrouvees.length ? [{ natures: { hasSome: naturesTrouvees } }] : []),
          ...(categoriesTrouvees.length ? [{ categories: { hasSome: categoriesTrouvees } }] : []),
        ]
      : undefined,
  };
  const where = { ...base, statut: filtreStatutRemontee(statut) };

  const [total, remontees, parStatut, chantiers, toutesCategories] = await Promise.all([
    prisma.remonteeInfo.count({ where }),
    prisma.remonteeInfo.findMany({
      where,
      orderBy: construireTri(tri, sens, COLONNES_TRI, { dateRemontee: "desc" as const }),
      select: {
        id: true,
        reference: true,
        dateRemontee: true,
        origine: true,
        chantierService: true,
        objet: true,
        categories: true,
        statut: true,
        ecarts: { orderBy: { reference: "asc" }, select: { id: true, reference: true } },
        ficheSSE: { select: { id: true, reference: true } },
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
    prisma.remonteeInfo.groupBy({ by: ["statut"], where: base, _count: { _all: true } }),
    prisma.remonteeInfo.findMany({ distinct: ["chantierService"], select: { chantierService: true }, orderBy: { chantierService: "asc" } }),
    prisma.remonteeInfo.findMany({ select: { categories: true } }),
  ]);

  const compte = Object.fromEntries(parStatut.map((s) => [s.statut, s._count._all]));
  const filtreActif = !!q || !!statut || !!origine || !!categorie || !!chantier;
  const baseParams = { q, statut, origine, categorie, chantier, taille, tri, sens, archives };
  const paramsEntete = { q, statut, origine, categorie, chantier, taille, archives };

  // Un second clic sur la tuile active retire le filtre de statut.
  const lienTuile = (s: string | undefined) => ({
    pathname: "/remontees",
    query: Object.fromEntries(
      Object.entries({ q, statut: s, origine, categorie, chantier, taille, tri, sens, archives }).filter(([, v]) => v),
    ),
  });

  // Catégories apparaissant sur au moins deux remontées : un signal qu'un
  // même sujet revient, à examiner pour un éventuel REX. Une seule occurrence
  // ne dit rien — ce n'est pas une répétition.
  const repetitions = compterOccurrences(toutesCategories.flatMap((r) => r.categories)).filter((c) => c.valeur >= 2);
  // D'anciennes remontées portent des catégories antérieures au référentiel
  // actuel (ex. "Sécurité") : sans elles dans les options, le menu ne peut pas
  // s'afficher sélectionné sur ce filtre alors même que la liste, elle, est
  // bien filtrée. Dédupliquées : plusieurs remontées peuvent partager la même
  // ancienne valeur, et `avecValeursExistantes` ne le fait pas elle-même (elle
  // reçoit d'ordinaire les catégories d'une seule fiche, jamais en double).
  const categoriesFiltre = avecValeursExistantes(
    CATEGORIES_REMONTEE,
    [...new Set(toutesCategories.flatMap((r) => r.categories))],
  );

  return (
    <ConteneurPage>
      <EntetePage
        titre={archives === "1" ? "Remontées archivées" : "Remontées d’informations"}
        sousTitre={`Informations remontées par les chantiers et le bureau · ${total} remontée${total > 1 ? "s" : ""}${filtreActif ? " correspondant aux filtres" : ""}`}
      >
        <BoutonArchives
          basePath="/remontees"
          archives={archives}
          params={{ q, statut, origine, categorie, chantier, taille, tri, sens }}
        />
        <BoutonNouveau href="/remontees/nouveau">Nouvelle remontée</BoutonNouveau>
      </EntetePage>

      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TUILES.map((t) => {
          const actif = statut === t.statut;
          return (
            <Link
              key={t.statut}
              href={lienTuile(actif ? undefined : t.statut)}
              aria-current={actif ? "true" : undefined}
              className={cn(
                "rounded-xl border bg-card px-4 py-3 transition-all hover:border-primary/40",
                actif && "border-primary ring-2 ring-primary/15",
              )}
            >
              <p className="text-3xl font-semibold tabular-nums">{compte[t.statut] ?? 0}</p>
              <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                <span className={cn("size-2 shrink-0 rounded-full", t.point)} aria-hidden />
                {t.label}
              </p>
            </Link>
          );
        })}
      </div>

      {repetitions.length > 0 && (
        <div data-no-print className="mb-6 rounded-xl border border-primary/20 bg-primary/5 p-4">
          <p className="mb-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
            <RepeatIcon className="size-4 shrink-0 text-primary" aria-hidden />
            <span className="font-medium">Répétitions à surveiller</span>
            <span className="text-muted-foreground">— un sujet qui revient est un candidat au REX.</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {repetitions.map((r) => (
              <Link
                key={r.label}
                href={{ pathname: "/remontees", query: { categorie: r.label } }}
                className="rounded-full border border-primary/25 bg-card px-3 py-1 text-sm transition-colors hover:border-primary/50 hover:bg-primary/10"
              >
                {r.label} <span className="ml-1 tabular-nums text-muted-foreground">{r.valeur}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Forcé au changement de catégorie : la pastille d'une répétition mène à
          une URL qui retire la recherche, mais FiltresListe garde le texte saisi
          dans son propre état. Remonter le bloc le resynchronise sur l'URL. La
          clé ne porte pas sur `q` : remonter pendant la frappe ferait perdre le
          focus. */}
      <div key={categorie ?? ""} className="mb-4">
        <FiltresListe
          basePath="/remontees"
          placeholder="Rechercher une remontée, un chantier, une personne…"
          recherche={q ?? ""}
          conserves={{ tri, sens, taille, archives }}
          filtres={[
            {
              name: "origine",
              valeur: origine ?? "",
              options: [
                { value: "", label: "Toutes les origines" },
                ...Object.values(OrigineRemontee).map((o) => ({ value: o, label: ORIGINE_REMONTEE_LABELS[o] })),
              ],
            },
            {
              name: "statut",
              valeur: statut ?? "",
              options: [
                { value: "", label: "Tous les statuts" },
                ...Object.values(StatutRemontee).map((s) => ({ value: s, label: STATUT_REMONTEE_LABELS[s] })),
              ],
            },
            {
              name: "categorie",
              valeur: categorie ?? "",
              options: [
                { value: "", label: "Toutes les catégories" },
                ...categoriesFiltre.map((c) => ({ value: c, label: c })),
              ],
            },
            {
              name: "chantier",
              valeur: chantier ?? "",
              options: [
                { value: "", label: "Tous les chantiers / services" },
                ...chantiers.map((c) => ({ value: c.chantierService, label: c.chantierService })),
              ],
            },
          ]}
        />
      </div>

      <CadreTableau>
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Référence</TableHead>
              <EnteteTriable colonne="date" libelle="Date" triActuel={tri} sensActuel={sens} params={paramsEntete} />
              <TableHead>Origine</TableHead>
              <TableHead>Chantier / Service</TableHead>
              <TableHead className="w-full">Objet</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Rattachée à</TableHead>
              <TableHead>Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {remontees.map((r) => {
              const categories = r.categories.join(", ");
              return (
                <TableRow key={r.id}>
                  <TableCell>
                    <Link href={`/remontees/${r.id}`} className="font-medium underline-offset-4 hover:underline">
                      {r.reference}
                    </Link>
                  </TableCell>
                  <TableCell className="tabular-nums text-muted-foreground">
                    {r.dateRemontee.toLocaleDateString("fr-FR")}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{ORIGINE_REMONTEE_LABELS[r.origine]}</TableCell>
                  <TableCell className="max-w-[9rem] truncate" title={r.chantierService}>{r.chantierService}</TableCell>
                  {/* w-full + max-w-0 : l'objet prend toute la largeur laissée par les autres
                      colonnes, et se coupe par « … » au-delà ; min-w garde un minimum lisible. */}
                  <TableCell className="w-full min-w-[12rem] max-w-0 truncate" title={r.objet}>
                    {r.objet}
                  </TableCell>
                  <TableCell className="max-w-[10rem] truncate text-muted-foreground" title={categories || undefined}>
                    {categories || "—"}
                  </TableCell>
                  <TableCell>
                    {r.ecarts.length > 0 ? (
                      // Tous les écarts rattachés, chacun cliquable : n'en montrer
                      // qu'un laisserait croire à un rattachement unique.
                      <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                        {r.ecarts.map((e) => (
                          <Link key={e.id} href={`/ecarts/${e.id}`} className="underline-offset-4 hover:underline">
                            {e.reference}
                          </Link>
                        ))}
                      </span>
                    ) : r.ficheSSE ? (
                      <Link href={`/fiches-sse/${r.ficheSSE.id}`} className="underline-offset-4 hover:underline">
                        {r.ficheSSE.reference}
                      </Link>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {/* Libellé court dans la liste, pour garder la colonne étroite. */}
                    <BadgeStatut
                      label={r.statut === "TRANSFORMEE_EN_ECART" ? "Transformée" : STATUT_REMONTEE_LABELS[r.statut]}
                      ton={TON_STATUT[r.statut]}
                    />
                  </TableCell>
                </TableRow>
              );
            })}
            {remontees.length === 0 && (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                  {filtreActif
                    ? "Aucune remontée ne correspond à ces filtres."
                    : "Aucune remontée d’information pour l’instant."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {total > 0 && <Pagination total={total} page={page} pageSize={taillePage} baseParams={baseParams} />}
      </CadreTableau>
    </ConteneurPage>
  );
}
