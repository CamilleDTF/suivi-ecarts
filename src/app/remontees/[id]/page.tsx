import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/badge";
import { STATUT_REMONTEE_COLORS, STATUT_REMONTEE_LABELS } from "@/lib/labels";
import {
  mettreAJourRemontee,
  mettreAJourStatutRemontee,
  marquerRemonteeTraitee,
  supprimerRemontee,
} from "@/app/remontees/actions";
import { StatutRemontee } from "@/generated/prisma/enums";
import { StatutSelectForm } from "@/components/statut-select-form";
import { FormulaireEditable } from "@/components/formulaire-editable";
import { RemonteeFields } from "@/components/remontee-fields";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { BoutonRetour } from "@/components/bouton-retour";

export default async function RemonteeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const remontee = await prisma.remonteeInfo.findUnique({
    where: { id },
    include: { ecart: { include: { dossier: true } } },
  });

  if (!remontee) notFound();

  const [dossiers, autresRemontees] = await Promise.all([
    prisma.dossier.findMany({ distinct: ["chantier"], select: { chantier: true } }),
    prisma.remonteeInfo.findMany({ distinct: ["chantierService"], select: { chantierService: true } }),
  ]);
  const chantiersConnus = [
    ...new Set([...dossiers.map((d) => d.chantier), ...autresRemontees.map((r) => r.chantierService)]),
  ].sort();

  const dejaTransformee = !!remontee.ecart;

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <BoutonRetour href="/remontees" label="Retour aux remontées" />

      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <h1 className="text-2xl font-semibold text-slate-900">{remontee.reference}</h1>
            <Badge
              label={STATUT_REMONTEE_LABELS[remontee.statut]}
              colorClass={STATUT_REMONTEE_COLORS[remontee.statut]}
            />
          </div>
          <p className="text-sm text-slate-500">{remontee.objet}</p>
        </div>
        <BoutonSupprimer
          action={supprimerRemontee}
          hiddenFields={{ id: remontee.id }}
          message="Supprimer cette remontée d'information ? Cette action est irréversible."
        />
      </div>

      <p className="mb-6 rounded-md bg-blue-50 px-3 py-2 text-sm text-blue-800">
        Une remontée d&apos;information peut rester une simple information, ou être transformée en écart
        si nécessaire.
      </p>

      {dejaTransformee && (
        <div className="mb-6 rounded-lg border border-purple-200 bg-purple-50 p-4 text-sm">
          <p className="font-medium text-purple-900">Transformée en écart</p>
          <Link href={`/ecarts/${remontee.ecart!.id}`} className="text-purple-800 hover:underline">
            {remontee.ecart!.reference} — {remontee.ecart!.dossier.chantier}
          </Link>
        </div>
      )}

      <div className="mb-6 rounded-lg border border-slate-200 bg-white p-4">
        <StatutSelectForm
          action={mettreAJourStatutRemontee}
          hiddenName="id"
          hiddenValue={remontee.id}
          selectName="statut"
          defaultValue={remontee.statut}
          options={Object.values(StatutRemontee)
            // Ce statut découle de la transformation, il ne se choisit pas à la
            // main — sauf pour une remontée déjà transformée, où il faut pouvoir
            // le réafficher.
            .filter((s) => s !== "TRANSFORMEE_EN_ECART" || dejaTransformee)
            .map((s) => ({ value: s, label: STATUT_REMONTEE_LABELS[s] }))}
        />
      </div>

      <FormulaireEditable
        action={mettreAJourRemontee}
        hiddenFields={{ id: remontee.id }}
        modifiePar={remontee.modifiePar}
        modifieLe={remontee.modifieLe}
      >
        <RemonteeFields v={remontee} chantiersConnus={chantiersConnus} />
      </FormulaireEditable>

      <div className="mt-4 flex flex-wrap justify-end gap-3">
        {remontee.statut !== "TRAITEE" && !dejaTransformee && (
          <form action={marquerRemonteeTraitee}>
            <input type="hidden" name="id" value={remontee.id} />
            <button
              type="submit"
              className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              Marquer comme traitée
            </button>
          </form>
        )}
        {!dejaTransformee && (
          <Link
            href={`/ecarts/nouveau?remonteeId=${remontee.id}`}
            className="rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
          >
            Transformer en écart
          </Link>
        )}
      </div>
    </div>
  );
}
