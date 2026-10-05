import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { RESPONSABLES_DU, TYPES_ACTION_DU, referenceActionDU, avecValeursExistantes } from "@/lib/labels";
import { Pagination } from "@/components/pagination";
import { lireTaillePage } from "@/lib/pagination";
import { filtreArchive } from "@/lib/archivage";
import { LienArchives } from "@/components/lien-archives";
import { construireTri } from "@/lib/tri";
import { EnteteTriable } from "@/components/entete-triable";
import { ListePreuves } from "@/components/liste-preuves";

const COLONNES_TRI = {
  numero: "numero",
  action: "action",
  typeAction: "typeAction",
  responsable: "responsable",
};

/**
 * "PA3", "pa 3" ou "3" désignent le numéro 3.
 *
 * Le numéro est stocké en entier, donc une recherche textuelle ne le trouverait
 * jamais : c'est pourtant ainsi qu'on cherche une ligne du DU.
 */
function numeroRecherche(q: string | undefined): number | undefined {
  const m = q?.trim().match(/^(?:pa\s*)?(\d+)$/i);
  return m ? Number(m[1]) : undefined;
}

export default async function PlanActionDUPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    typeAction?: string;
    responsable?: string;
    page?: string;
    taille?: string;
    tri?: string;
    sens?: string;
    archives?: string;
  }>;
}) {
  const { q, typeAction, responsable, page: pageParam, taille, tri, sens, archives } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

  const contient = { contains: q, mode: "insensitive" as const };
  const numero = numeroRecherche(q);
  const where = {
    ...filtreArchive(archives),
    typeAction: typeAction || undefined,
    responsable: responsable || undefined,
    OR: q
      ? [
          { action: contient },
          { risquesConcernes: contient },
          { responsable: contient },
          { preuveRealisation: contient },
          ...(numero ? [{ numero }] : []),
        ]
      : undefined,
  };

  const [total, actions, responsablesUtilises, typesUtilises] = await Promise.all([
    prisma.actionDU.count({ where }),
    prisma.actionDU.findMany({
      where,
      // Par défaut l'ordre du document lui-même : PA1, PA2, PA3…
      orderBy: construireTri(tri, sens, COLONNES_TRI, { numero: "asc" as const }, [
        "typeAction",
        "responsable",
      ]),
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
    // Les valeurs déjà saisies alimentent les filtres : le responsable est un
    // champ libre, une liste figée n'en proposerait qu'une partie.
    prisma.actionDU.findMany({
      where: { responsable: { not: null } },
      distinct: ["responsable"],
      select: { responsable: true },
      orderBy: { responsable: "asc" },
    }),
    prisma.actionDU.findMany({
      where: { typeAction: { not: null } },
      distinct: ["typeAction"],
      select: { typeAction: true },
      orderBy: { typeAction: "asc" },
    }),
  ]);

  const filtreActif = !!q || !!typeAction || !!responsable;
  const params = { q, typeAction, responsable, taille };

  const paramsExport = new URLSearchParams();
  if (typeAction) paramsExport.set("typeAction", typeAction);
  if (responsable) paramsExport.set("responsable", responsable);
  const hrefExport = `/plan-action-du/export${paramsExport.toString() ? `?${paramsExport.toString()}` : ""}`;

  return (
    <div className="mx-auto max-w-[100rem] px-6 py-8">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Plan d&apos;action DU</h1>
          <p className="mt-1 text-sm text-slate-500">
            Mesures de prévention du Document Unique. Les numéros PA sont ceux auxquels renvoient les
            fiches de risques.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <a
            href={hrefExport}
            className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Exporter
          </a>
          <Link
            href="/plan-action-du/nouveau"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            + Nouvelle action
          </Link>
        </div>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher (PA3, un risque, une preuve…)"
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <SelectAutoSubmit
          name="typeAction"
          defaultValue={typeAction ?? ""}
          options={[
            { value: "", label: "Type : Tous" },
            ...avecValeursExistantes(
              TYPES_ACTION_DU,
              typesUtilises.map((t) => t.typeAction!),
            ).map((t) => ({ value: t, label: t })),
          ]}
        />
        <SelectAutoSubmit
          name="responsable"
          defaultValue={responsable ?? ""}
          options={[
            { value: "", label: "Responsable : Tous" },
            ...avecValeursExistantes(
              RESPONSABLES_DU,
              responsablesUtilises.map((r) => r.responsable!),
            ).map((r) => ({ value: r, label: r })),
          ]}
        />
        {filtreActif && (
          <Link href="/plan-action-du" className="text-sm text-slate-500 hover:underline">
            Réinitialiser
          </Link>
        )}
        <LienArchives archives={archives} params={{ q, typeAction, responsable, taille, tri, sens }} />
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left align-top text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <EnteteTriable colonne="numero" libelle="N°" triActuel={tri} sensActuel={sens} params={params} />
              <EnteteTriable colonne="action" libelle="Action" triActuel={tri} sensActuel={sens} params={params} />
              <th className="px-4 py-3 font-medium">Risques concernés</th>
              <EnteteTriable
                colonne="typeAction"
                libelle="Type d'action"
                triActuel={tri}
                sensActuel={sens}
                params={params}
              />
              <EnteteTriable
                colonne="responsable"
                libelle="Responsable"
                triActuel={tri}
                sensActuel={sens}
                params={params}
              />
              <th className="px-4 py-3 font-medium">Preuve de réalisation</th>
            </tr>
          </thead>
          <tbody>
            {actions.map((a) => (
              <tr key={a.id} className="border-b border-slate-100 align-top last:border-0 hover:bg-slate-50">
                <td className="whitespace-nowrap px-4 py-3">
                  <Link
                    href={`/plan-action-du/${a.id}`}
                    className="font-medium text-blue-700 hover:underline"
                  >
                    {referenceActionDU(a.numero)}
                  </Link>
                </td>
                {/* Pas de troncature sur l'action : les mesures du DU sont des
                    phrases entières, et le tableau sert à les relire. */}
                <td className="min-w-[22rem] px-4 py-3 text-slate-700">{a.action}</td>
                <td className="px-4 py-3 text-slate-600">{a.risquesConcernes ?? "—"}</td>
                <td className="whitespace-nowrap px-4 py-3 text-slate-700">{a.typeAction ?? "—"}</td>
                <td className="px-4 py-3 text-slate-700">{a.responsable ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">
                  <ListePreuves valeur={a.preuveRealisation} />
                </td>
              </tr>
            ))}
            {actions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  {filtreActif
                    ? "Aucune action ne correspond à ce filtre."
                    : "Aucune action pour l'instant."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {total > 0 && <Pagination total={total} page={page} pageSize={taillePage} baseParams={params} />}
      </div>
    </div>
  );
}
