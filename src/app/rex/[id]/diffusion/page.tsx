import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { BoutonRetour } from "@/components/bouton-retour";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";
import { ImpressionAutomatique } from "@/components/impression-automatique";
import {
  ORIGINE_REX_LABELS,
  NATURE_REX_LABELS,
  NATURE_REX_COLORS,
} from "@/lib/labels";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const rex = await prisma.rex.findUnique({ where: { id }, select: { reference: true } });
  return { title: rex ? `Fiche de diffusion — REX ${rex.reference}` : "Fiche de diffusion" };
}

export default async function DiffusionRexPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ impression?: string }>;
}) {
  const { id } = await params;
  const { impression } = await searchParams;

  const rex = await prisma.rex.findUnique({
    where: { id },
    include: {
      ecarts: { orderBy: { reference: "asc" }, include: { dossier: { select: { chantier: true } } } },
      ficheSSE: { select: { id: true, reference: true, nomChantier: true } },
      ecartAmiante: { select: { id: true, reference: true, nomChantier: true } },
      remontee: { select: { id: true, reference: true, objet: true } },
      actionsPreventives: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!rex) notFound();

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      {impression === "1" && <ImpressionAutomatique />}
      <div data-no-print className="mb-4 flex items-center justify-between">
        <BoutonRetour href={`/rex/${rex.id}`} label="Retour au REX" />
        <BoutonExportPDF />
      </div>

      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-semibold text-slate-900">Fiche de diffusion — {rex.reference}</h1>
        <Badge label={NATURE_REX_LABELS[rex.nature]} colorClass={NATURE_REX_COLORS[rex.nature]} />
      </div>
      <h2 className="mb-6 text-lg text-slate-700">{rex.titre}</h2>

      <p className="mb-6 text-sm text-slate-500">
        Origine — {ORIGINE_REX_LABELS[rex.origine]}
        {rex.ecarts.length > 0 && (
          <>
            {" — "}
            {rex.ecarts.map((e, i) => (
              <span key={e.id}>
                {i > 0 && ", "}
                Écart {e.reference}
                {e.dossier ? ` (${e.dossier.chantier})` : ""}
              </span>
            ))}
          </>
        )}
        {rex.ficheSSE && ` — Évènement SSE ${rex.ficheSSE.reference}${rex.ficheSSE.nomChantier ? ` (${rex.ficheSSE.nomChantier})` : ""}`}
        {rex.ecartAmiante && ` — Écart amiante ${rex.ecartAmiante.reference} (${rex.ecartAmiante.nomChantier})`}
        {rex.remontee && ` — Remontée ${rex.remontee.reference}`}
      </p>

      {rex.pratiqueDescription && (
        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            {rex.nature === "BONNE_PRATIQUE" ? "Bonne pratique" : "Pratique observée"}
          </h3>
          <p className="whitespace-pre-line text-sm text-slate-800">{rex.pratiqueDescription}</p>
        </section>
      )}

      <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Enseignement</h3>
        <p className="whitespace-pre-line text-sm text-slate-800">{rex.enseignementsTires || "—"}</p>
      </section>

      {rex.actionsPreventives.length > 0 && (
        <section className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Actions préventives
          </h3>
          <ul className="list-disc space-y-1 pl-5 text-sm text-slate-800">
            {rex.actionsPreventives.map((a) => (
              <li key={a.id}>
                {a.action} — {a.responsable}
                {a.echeance && ` (échéance ${a.echeance.toLocaleDateString("fr-FR")})`}
              </li>
            ))}
          </ul>
        </section>
      )}

      {rex.themes.length > 0 && (
        <section className="mb-6">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Thèmes</h3>
          <div className="flex flex-wrap gap-1.5">
            {rex.themes.map((t) => (
              <span key={t} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{t}</span>
            ))}
          </div>
        </section>
      )}

      <section className="mb-8 grid grid-cols-1 gap-4 rounded-lg border border-slate-300 bg-slate-50 p-5 sm:grid-cols-2">
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            À diffuser auprès de
          </h3>
          {rex.destinatairesRoles.length > 0 ? (
            <ul className="space-y-1 text-sm text-slate-800">
              {rex.destinatairesRoles.map((d) => (
                <li key={d}>☐ {d}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">—</p>
          )}
        </div>
        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Par</h3>
          {rex.canaux.length > 0 ? (
            <ul className="space-y-1 text-sm text-slate-800">
              {rex.canaux.map((c) => (
                <li key={c}>☐ {c}</li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400">—</p>
          )}
        </div>
      </section>

      <p className="text-xs text-slate-400">
        Document édité le {new Date().toLocaleDateString("fr-FR")} pour diffusion — {rex.reference}
      </p>

      <p data-no-print className="mt-6 text-sm text-slate-400">
        <Link href={`/rex/${rex.id}`} className="hover:underline">
          Retour au REX {rex.reference}
        </Link>
      </p>
    </div>
  );
}
