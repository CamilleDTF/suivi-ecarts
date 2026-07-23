"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { auth } from "@/auth";
import { TypeAction, StatutAction } from "@/generated/prisma/enums";

const actionSchema = z.object({
  ecartId: z.string().min(1, "Écart requis"),
  type: z.enum(Object.values(TypeAction) as [string, ...string[]]),
  action: z.string().min(1, "Description de l'action requise"),
  responsable: z.string().min(1, "Responsable requis"),
  echeance: z.string().optional(),
  obligatoire: z.string().optional(),
});

export async function creerAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const parsed = actionSchema.parse({
    ecartId: formData.get("ecartId"),
    type: formData.get("type"),
    action: formData.get("action"),
    responsable: formData.get("responsable"),
    echeance: formData.get("echeance") || undefined,
    obligatoire: formData.get("obligatoire") || undefined,
  });

  const reference = await generateReference("Action", "ACT");

  const action = await prisma.action.create({
    data: {
      reference,
      ecartId: parsed.ecartId,
      type: parsed.type as TypeAction,
      action: parsed.action,
      responsable: parsed.responsable,
      echeance: parsed.echeance ? new Date(parsed.echeance) : undefined,
      obligatoire: parsed.obligatoire === "on",
    },
  });

  revalidatePath(`/ecarts/${parsed.ecartId}`);
  redirect(`/plan-action/${action.id}`);
}

export async function mettreAJourStatutAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const statut = String(formData.get("statut")) as StatutAction;

  const action = await prisma.action.update({ where: { id }, data: { statut } });
  revalidatePath(`/plan-action/${id}`);
  revalidatePath("/plan-action");
  revalidatePath(`/ecarts/${action.ecartId}`);
}
