import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { SelectAutoSubmit } from "@/components/select-auto-submit";
import { Pagination } from "@/components/pagination";
import { StatutFiche } from "@/generated/prisma/enums";
import { STATUT_FICHE_COLORS, STATUT_FICHE_LABELS, THEME_OPTIONS, DOMAINES_OPTIONS } from "@/lib/labels";
import { lireTaillePage } from "@/lib/pagination";

export default async function FichesSSEPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; statut?: string; page?: string; taille?: string }>;
}) {
  const { q, statut, page: pageParam, taille } = await searchParams;
  const page = Math.max(1, Number(pageParam) || 1);
  const taillePage = lireTaillePage(taille);

  const optionsCorrespondantes = (options: string[]) =>
    q ? options.filter((o) => o.toLowerCase().includes(q.toLowerCase())) : [];
  const themesTrouves = optionsCorrespondantes(THEME_OPTIONS);
  const domainesTrouves = optionsCorrespondantes(DOMAINES_OPTIONS);

  const contient = { contains: q, mode: "insensitive" as const };
  const where = {
    statutFiche: statut ? (statut as StatutFiche) : undefined,
    OR: q
      ? [
          { reference: contient },
          { nomChantier: contient },
          { emetteur: contient },
          { numeroInterne: contient },
          { typeEvenement: contient },
          { lieuZone: contient },
          { personnesImpliquees: contient },
          { temoins: contient },
          { descriptionFactuelle: contient },
          { mesuresImmediatesPrises: contient },
          { typeAnalyse: contient },
          { criticite: contient },
          { declarationExterneA: contient },
          { referencePreuve: contient },
          { procedureLaquelle: contient },
          { referenceDUERP: contient },
          { miseAJourAutrePrecision: contient },
          { referenceNouveauRisque: contient },
          { typeCommunication: contient },
          { validationNom: contient },
          { validationFonction: contient },
          { causes: { some: { libelle: contient } } },
          ...(themesTrouves.length ? [{ theme: { hasSome: themesTrouves } }] : []),
          ...(domainesTrouves.length ? [{ domaine: { hasSome: domainesTrouves } }] : []),
        ]
      : undefined,
  };

  const [total, fiches] = await Promise.all([
    prisma.ficheSSE.count({ where }),
    prisma.ficheSSE.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { ecart: { include: { dossier: true } } },
      skip: (page - 1) * taillePage,
      take: taillePage,
    }),
  ]);

  const filtreActif = !!q || !!statut;

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Évènements SSE</h1>
        <Link
          href="/fiches-sse/nouveau"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          + Nouvel évènement SSE
        </Link>
      </div>

      <form method="get" className="mb-4 flex flex-wrap items-center gap-3">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Rechercher un évènement…"
          className="min-w-[220px] flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        />
        <SelectAutoSubmit
          name="statut"
          defaultValue={statut ?? ""}
          options={[
            { value: "", label: "Statut : Tous" },
            ...Object.values(StatutFiche).map((s) => ({ value: s, label: STATUT_FICHE_LABELS[s] })),
          ]}
        />
        {filtreActif && (
          <Link href="/fiches-sse" className="text-sm text-slate-500 hover:underline">
            Réinitialiser
          </Link>
        )}
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Référence</th>
              <th className="px-4 py-3 font-medium">Écart lié</th>
              <th className="px-4 py-3 font-medium">Chantier</th>
              <th className="px-4 py-3 font-medium">Émetteur</th>
              <th className="px-4 py-3 font-medium">Statut</th>
            </tr>
          </thead>
          <tbody>
            {fiches.map((f) => (
              <tr key={f.id} className="border-b border-slate-100 last:border-0 hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/fiches-sse/${f.id}`} className="font-medium text-blue-700 hover:underline">
                    {f.reference}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  {f.ecart ? (
                    <Link href={`/ecarts/${f.ecart.id}`} className="text-slate-600 hover:underline">
                      {f.ecart.reference}
                    </Link>
                  ) : (
                    <span className="text-slate-400">Aucun</span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-700">{f.nomChantier || "—"}</td>
                <td className="px-4 py-3 text-slate-700">{f.emetteur || "—"}</td>
                <td className="px-4 py-3">
                  <Badge label={STATUT_FICHE_LABELS[f.statutFiche]} colorClass={STATUT_FICHE_COLORS[f.statutFiche]} />
                </td>
              </tr>
            ))}
            {fiches.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  {filtreActif ? "Aucun évènement ne correspond à ce filtre." : "Aucun évènement SSE pour l'instant."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {total > 0 && <Pagination total={total} page={page} pageSize={taillePage} baseParams={{ q, statut, taille }} />}
      </div>
    </div>
  );
}
