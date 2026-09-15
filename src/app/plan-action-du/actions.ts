"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { prochainNumeroActionDU } from "@/lib/reference";
import { auth } from "@/auth";
import { nomAuteur } from "@/lib/audit";
import { texte } from "@/lib/formulaire";

// Le plan d'action du Document Unique n'a presque rien en commun avec une
// action corrective : pas d'échéance, pas de statut, pas de rattachement à un
// écart. C'est une mesure de prévention permanente, décrite par les six
// colonnes du DU — d'où une table et un écran à part.
const actionDUSchema = z.object({
  action: z.string().min(1, "Description de l'action requise"),
  risquesConcernes: z.string().optional(),
  typeAction: z.string().optional(),
  responsable: z.string().optional(),
  preuveRealisation: z.string().optional(),
});

function lireFormulaire(formData: FormData) {
  return actionDUSchema.parse({
    action: formData.get("action"),
    risquesConcernes: texte(formData.get("risquesConcernes")) ?? undefined,
    typeAction: texte(formData.get("typeAction")) ?? undefined,
    responsable: texte(formData.get("responsable")) ?? undefined,
    preuveRealisation: texte(formData.get("preuveRealisation")) ?? undefined,
  });
}

export async function creerActionDU(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const parsed = lireFormulaire(formData);
  const numero = await prochainNumeroActionDU();

  const action = await prisma.actionDU.create({
    data: {
      numero,
      action: parsed.action,
      risquesConcernes: parsed.risquesConcernes,
      typeAction: parsed.typeAction,
      responsable: parsed.responsable,
      preuveRealisation: parsed.preuveRealisation,
    },
  });

  revalidatePath("/plan-action-du");
  redirect(`/plan-action-du/${action.id}`);
}

export async function mettreAJourActionDU(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const parsed = lireFormulaire(formData);

  await prisma.actionDU.update({
    where: { id },
    data: {
      action: parsed.action,
      // ?? null et non undefined : Prisma ignore un champ undefined, si bien
      // qu'un champ vidé ne s'effacerait pas.
      risquesConcernes: parsed.risquesConcernes ?? null,
      typeAction: parsed.typeAction ?? null,
      responsable: parsed.responsable ?? null,
      preuveRealisation: parsed.preuveRealisation ?? null,
      modifiePar: nomAuteur(session),
      modifieLe: new Date(),
    },
  });

  revalidatePath(`/plan-action-du/${id}`);
  revalidatePath("/plan-action-du");
}

export async function supprimerActionDU(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  // Le numéro n'est pas réattribué : les fiches de risques du DU renvoient à
  // PA7, et un PA7 qui désignerait plus tard une autre mesure ferait mentir le
  // document. D'où l'archivage, à préférer à la suppression.
  await prisma.actionDU.delete({ where: { id } });

  revalidatePath("/plan-action-du");
  redirect("/plan-action-du");
}
