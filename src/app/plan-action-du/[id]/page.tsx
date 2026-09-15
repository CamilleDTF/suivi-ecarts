import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { referenceActionDU } from "@/lib/labels";
import { mettreAJourActionDU, supprimerActionDU } from "@/app/plan-action-du/actions";
import { FormulaireEditable } from "@/components/formulaire-editable";
import { ActionDUFields } from "@/components/action-du-fields";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { BoutonArchiver } from "@/components/bouton-archiver";
import { archiver, desarchiver } from "@/app/archivage/actions";
import { BoutonRetour } from "@/components/bouton-retour";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";

// Le navigateur nomme le PDF d'après le titre du document.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const fiche = await prisma.actionDU.findUnique({ where: { id }, select: { numero: true } });
  return { title: fiche ? `Action DU ${referenceActionDU(fiche.numero)}` : "Action DU" };
}

export default async function ActionDUDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [action, responsables] = await Promise.all([
    prisma.actionDU.findUnique({ where: { id } }),
    prisma.actionDU.findMany({
      where: { responsable: { not: null } },
      distinct: ["responsable"],
      select: { responsable: true },
      orderBy: { responsable: "asc" },
    }),
  ]);

  if (!action) notFound();

  return (
    <div className="mx-auto max-w-[100rem] px-6 py-8">
      <BoutonRetour href="/plan-action-du" label="Retour au plan d'action DU" />
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{referenceActionDU(action.numero)}</h1>
          <p className="mt-1 text-sm text-slate-500">Plan d&apos;action du Document Unique</p>
        </div>
        <div data-no-print className="flex shrink-0 flex-wrap justify-end gap-2">
          <BoutonExportPDF />
          <BoutonArchiver
            action={action.archiveLe ? desarchiver : archiver}
            entite="actionDU"
            id={action.id}
            archive={!!action.archiveLe}
          />
          <BoutonSupprimer
            action={supprimerActionDU}
            hiddenFields={{ id: action.id }}
            message={`Supprimer ${referenceActionDU(action.numero)} ? Le numéro ne sera pas réattribué, et les fiches de risques qui y renvoient pointeront dans le vide. Cette action est irréversible.`}
          />
        </div>
      </div>

      <FormulaireEditable
        action={mettreAJourActionDU}
        hiddenFields={{ id: action.id }}
        modifiePar={action.modifiePar}
        modifieLe={action.modifieLe}
      >
        <ActionDUFields v={action} responsablesConnus={responsables.map((r) => r.responsable!)} />
      </FormulaireEditable>
    </div>
  );
}
