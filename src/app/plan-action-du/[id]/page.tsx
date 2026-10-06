import { dateHeureParis, dateParis } from "@/lib/date-paris";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { referenceActionDU } from "@/lib/labels";
import { mettreAJourActionDU, supprimerActionDU } from "@/app/plan-action-du/actions";
import { archiver, desarchiver } from "@/app/archivage/actions";
import { ActionDUFields } from "@/components/action-du-fields";
import { BadgeStatut } from "@/components/badge-statut";
import { BoutonArchiver } from "@/components/bouton-archiver";
import { BoutonExportPDF } from "@/components/bouton-export-pdf";
import { BoutonRetour } from "@/components/bouton-retour";
import { BoutonSupprimer } from "@/components/bouton-supprimer";
import { EditionPanneau } from "@/components/edition-panneau";
import { Carte, Propriete, Proprietes, TexteLong } from "@/components/fiche";
import { ConteneurPage } from "@/components/page-liste";

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

  const reference = referenceActionDU(action.numero);

  return (
    <ConteneurPage largeur="formulaire">
      <BoutonRetour href="/plan-action-du" label="Plan d'action DU" />

      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-[16rem] flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-md bg-primary px-2 py-0.5 text-xs font-semibold tracking-wide text-primary-foreground">
              {reference}
            </span>
            {action.archiveLe && <BadgeStatut label="Archivée" />}
          </div>
          <h1 className="font-display whitespace-pre-line text-2xl font-semibold leading-tight tracking-tight sm:text-3xl">
            {action.action}
          </h1>
        </div>
        <div data-no-print className="flex items-center gap-2">
          <EditionPanneau
            titre={`Modifier ${reference}`}
            description="Les changements sont enregistrés pour tous."
            action={mettreAJourActionDU}
            hiddenFields={{ id: action.id }}
          >
            <ActionDUFields v={action} responsablesConnus={responsables.map((r) => r.responsable!)} />
          </EditionPanneau>
        </div>
      </header>

      <div className="space-y-4">
        <Carte>
          <Proprietes>
            <Propriete label="Type d'action">{action.typeAction || "—"}</Propriete>
            <Propriete label="Responsable">{action.responsable || "—"}</Propriete>
          </Proprietes>
        </Carte>

        <Carte className="space-y-5 p-5">
          <TexteLong label="Risques concernés" valeur={action.risquesConcernes} />
          <TexteLong label="Preuve de réalisation" valeur={action.preuveRealisation} />
        </Carte>
      </div>

      <div data-no-print className="mt-6 flex flex-wrap gap-2">
        <BoutonExportPDF className="" />
        <BoutonArchiver
          action={action.archiveLe ? desarchiver : archiver}
          entite="actionDU"
          id={action.id}
          archive={!!action.archiveLe}
          className=""
        />
        <BoutonSupprimer
          action={supprimerActionDU}
          hiddenFields={{ id: action.id }}
          message={`Supprimer ${reference} ? Le numéro ne sera pas réattribué, et les fiches de risques qui y renvoient pointeront dans le vide. Cette action est irréversible.`}
          className=""
        />
      </div>

      <p className="mt-4 px-1 text-xs text-muted-foreground">
        Créée le {dateParis(action.createdAt)}
        {action.modifieLe &&
          ` · modifiée le ${dateHeureParis(action.modifieLe)}${
            action.modifiePar ? ` par ${action.modifiePar}` : ""
          }`}
      </p>
    </ConteneurPage>
  );
}
