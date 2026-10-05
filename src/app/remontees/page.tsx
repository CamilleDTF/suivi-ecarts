import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { Pagination } from "@/components/pagination";
import { StatTile } from "@/components/stat-tile";
import { IconFileText, IconAlertTriangle, IconFolder } from "@/components/icons";
import { OrigineRemontee, StatutRemontee } from "@/generated/prisma/enums";
import {
  ORIGINE_REMONTEE_LABELS,
  STATUT_REMONTEE_COLORS,
  STATUT_REMONTEE_LABELS,
  CATEGORIES_REMONTEE,
  NATURES_REMONTEE,
  avecValeursExistantes,
} from "@/lib/labels";
import { filtreStatutRemontee } from "@/lib/validation";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";
import { LienArchives } from "@/components/lien-archives";
import { construireTri } from "@/lib/tri";
import { EnteteTriable } from "@/components/entete-triable";
import { compterOccurrences } from "@/lib/statistiques";

const COLONNES_TRI = {
  date: "dateRemontee",
};

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

  const where = {
    ...filtreArchive(archives),
    statut: filtreStatutRemontee(statut),
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

  const [total, remontees, parStatut, chantiers, toutesCategories] = await Promise.all([
    prisma.remonteeInfo.count({ where }),
    prisma.remonteeInfo.findMany({
      where,
      orderBy: construireTri(tri, sens, COLONNES_TRI, { dateRemontee: "desc" as const }),
      include: {
        ecarts: { orderBy: { reference: "asc" }, select: { id: true, reference: true } },
        ficheSSE: { select: { id: true, reference: true } },
      },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
    prisma.remonteeInfo.groupBy({ by: ["statut"], _count: { _all: true } }),
    prisma.remonteeInfo.findMany({ distinct: ["chantierService"], select: { chantierService: true }, orderBy: { chantierService: "asc" } }),
    prisma.remonteeInfo.findMany({ select: { categories: true } }),
  ]);

  const compte = Object.fromEntries(parStatut.map((s) => [s.statut, s._count._all]));
  const filtreActif = !!q || !!statut || !!origine || !!categorie || !!chantier;
  const baseParams = { q, statut, origine, categorie, chantier, taille, tri, sens };

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
    <div className="mx-auto max-w-[100rem] px-6 py-8">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Remontées d&apos;informations</h1>
          <p className="mt-1 text-sm text-slate-500">
            Saisie et suivi des informations remontées par les chantiers et le bureau.
          </p>
        </div>
        <Link
          href="/remontees/nouveau"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nouvelle remontée
        </Link>
      </div>

      <div className="mb-6 mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatTile label="À traiter" value={compte.A_TRAITER ?? 0} icon={<IconAlertTriangle className="h-5 w-5" />} couleur="orange" />
        <StatTile label="En cours" value={compte.EN_COURS ?? 0} icon={<IconFileText className="h-5 w-5" />} couleur="bleu" />
        <StatTile label="Traitées" value={compte.TRAITEE ?? 0} icon={<IconFileText className="h-5 w-5" />} couleur="vert" />
        <StatTile
          label="Transformées en écart"
          value={compte.TRANSFORMEE_EN_ECART ?? 0}
          icon={<IconFolder className="h-5 w-5" />}
          couleur="violet"
        />
      </div>

      {repetitions.length > 0 && (
        <div data-no-print className="mb-6 rounded-lg border border-amber-200 bg-amber-50 p-4">
          <p className="mb-2 text-sm font-medium text-amber-900">
            Répétitions à surveiller — un sujet qui revient est un candidat au REX.
          </p>
          <div className="flex flex-wrap gap-2">
            {repetitions.map((r) => (
              <Link
                key={r.label}
                href={{ pathname: "/remontees", query: { categorie: r.label } }}
                className="rounded-full border border-amber-300 bg-white px-3 py-1 text-sm text-amber-900 hover:bg-amber-100"
              >
                {r.label} · {r.valeur}
              </Link>
            ))}
          </div>
        </div>
      )}

      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
        <SelectAutoSubmit
          name="origine"
          defaultValue={origine ?? ""}
          options={[
            { value: "", label: "Origine : Toutes" },
            ...Object.values(OrigineRemontee).map((o) => ({ value: o, label: ORIGINE_REMONTEE_LABELS[o] })),
          ]}
        />
        <SelectAutoSubmit
          name="statut"
          defaultValue={statut ?? ""}
          options={[
            { value: "", label: "Statut : Tous" },
            ...Object.values(StatutRemontee).map((s) => ({ value: s, label: STATUT_REMONTEE_LABELS[s] })),
          ]}
        />
        <SelectAutoSubmit
          // Forcé au changement de valeur : sans clé, une navigation interne (le
          // clic sur une pastille de répétition, par exemple) filtre bien la
          // liste mais laisse le menu affiché sur son ancienne valeur, React ne
          // réappliquant pas `defaultValue` sur un composant déjà monté.
          key={categorie ?? ""}
          name="categorie"
          defaultValue={categorie ?? ""}
          options={[
            { value: "", label: "Catégorie : Toutes" },
            ...categoriesFiltre.map((c) => ({ value: c, label: c })),
          ]}
        />
        <SelectAutoSubmit
          name="chantier"
          defaultValue={chantier ?? ""}
          options={[
            { value: "", label: "Chantier / Service : Tous" },
            ...chantiers.map((c) => ({ value: c.chantierService, label: c.chantierService })),
          ]}
        />
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher une remontée…"
          className="min-w-[200px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        {filtreActif && (
          <Link href="/remontees" className="text-sm text-slate-500 hover:underline">
            Réinitialiser
          </Link>
        )}
        <LienArchives archives={archives} params={{ q, statut, origine, categorie, chantier, taille, tri, sens }} />
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Référence</th>
              <EnteteTriable
                colonne="date"
                libelle="Date"
                triActuel={tri}
                sensActuel={sens}
                params={{ q, statut, origine, categorie, chantier, taille }}
              />
              <th className="px-4 py-3 font-medium">Origine</th>
              <th className="px-4 py-3 font-medium">Chantier / Service</th>
              <th className="px-4 py-3 font-medium">Objet</th>
              <th className="px-4 py-3 font-medium">Catégorie</th>
              <th className="px-4 py-3 font-medium">Rattachée à</th>
              <th className="px-4 py-3 font-medium">Statut</th>
              <th className="px-4 py-3 font-medium">Suite</th>
            </tr>
          </thead>
          <tbody>
            {remontees.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/remontees/${r.id}`} className="font-medium text-blue-700 hover:underline">
                    {r.reference}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">{r.dateRemontee.toLocaleDateString("fr-FR")}</td>
                <td className="px-4 py-3 text-slate-700">{ORIGINE_REMONTEE_LABELS[r.origine]}</td>
                <td className="px-4 py-3 text-slate-700">{r.chantierService}</td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-700">{r.objet}</td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-700">
                  {r.categories.length > 0 ? r.categories.join(", ") : "—"}
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {r.ecarts.length > 0 ? (
                    // Tous les écarts rattachés, chacun cliquable : n'en montrer
                    // qu'un laisserait croire à un rattachement unique.
                    <span className="flex flex-wrap gap-x-2 gap-y-0.5">
                      {r.ecarts.map((e) => (
                        <Link key={e.id} href={`/ecarts/${e.id}`} className="text-slate-600 hover:underline">
                          {e.reference}
                        </Link>
                      ))}
                    </span>
                  ) : r.ficheSSE ? (
                    <Link href={`/fiches-sse/${r.ficheSSE.id}`} className="text-slate-600 hover:underline">
                      {r.ficheSSE.reference}
                    </Link>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <Badge label={STATUT_REMONTEE_LABELS[r.statut]} colorClass={STATUT_REMONTEE_COLORS[r.statut]} />
                </td>
                <td className="max-w-xs truncate px-4 py-3 text-slate-600">
                  {/* L'écart a désormais sa propre colonne : « Suite » redit ce
                      qu'elle annonce, la suite donnée. */}
                  {r.suiteDonnee || "—"}
                </td>
              </tr>
            ))}
            {remontees.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                  {filtreActif
                    ? "Aucune remontée ne correspond à ce filtre."
                    : "Aucune remontée d'information pour l'instant."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {total > 0 && <Pagination total={total} page={page} pageSize={taillePage} baseParams={baseParams} />}
      </div>
    </div>
  );
}
