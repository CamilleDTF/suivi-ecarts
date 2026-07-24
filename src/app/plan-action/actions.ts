"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { auth } from "@/auth";
import { TypeAction, StatutAction } from "@/generated/prisma/enums";
import { recalculerStatutsParents } from "@/lib/statut-auto";
import { nomAuteur } from "@/lib/audit";

const actionSchema = z
  .object({
    ecartId: z.string().optional(),
    ficheSSEId: z.string().optional(),
    ecartAmianteId: z.string().optional(),
    type: z.enum(Object.values(TypeAction) as [string, ...string[]]),
    action: z.string().min(1, "Description de l'action requise"),
    responsable: z.string().min(1, "Responsable requis"),
    echeance: z.string().optional(),
    obligatoire: z.string().optional(),
  })
  .refine((v) => v.ecartId || v.ficheSSEId || v.ecartAmianteId, {
    message: "Écart, évènement ou écart amiante requis",
  });

export async function creerAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const parsed = actionSchema.parse({
    ecartId: formData.get("ecartId") || undefined,
    ficheSSEId: formData.get("ficheSSEId") || undefined,
    ecartAmianteId: formData.get("ecartAmianteId") || undefined,
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
      ficheSSEId: parsed.ficheSSEId,
      ecartAmianteId: parsed.ecartAmianteId,
      type: parsed.type as TypeAction,
      action: parsed.action,
      responsable: parsed.responsable,
      echeance: parsed.echeance ? new Date(parsed.echeance) : undefined,
      obligatoire: parsed.obligatoire === "on",
    },
  });

  if (parsed.ecartId) revalidatePath(`/ecarts/${parsed.ecartId}`);
  if (parsed.ficheSSEId) revalidatePath(`/fiches-sse/${parsed.ficheSSEId}`);
  if (parsed.ecartAmianteId) revalidatePath(`/ecart-amiante/${parsed.ecartAmianteId}`);
  await recalculerStatutsParents(action);
  redirect(`/plan-action/${action.id}`);
}

const actionEditSchema = z.object({
  type: z.enum(Object.values(TypeAction) as [string, ...string[]]),
  action: z.string().min(1, "Description de l'action requise"),
  responsable: z.string().min(1, "Responsable requis"),
  echeance: z.string().optional(),
  obligatoire: z.string().optional(),
  preuve: z.string().optional(),
  verifEfficacite: z.string().optional(),
});

export async function mettreAJourAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const parsed = actionEditSchema.parse({
    type: formData.get("type"),
    action: formData.get("action"),
    responsable: formData.get("responsable"),
    echeance: formData.get("echeance") || undefined,
    obligatoire: formData.get("obligatoire") || undefined,
    preuve: formData.get("preuve") || undefined,
    verifEfficacite: formData.get("verifEfficacite") || undefined,
  });

  const action = await prisma.action.update({
    where: { id },
    data: {
      type: parsed.type as TypeAction,
      action: parsed.action,
      responsable: parsed.responsable,
      echeance: parsed.echeance ? new Date(parsed.echeance) : undefined,
      obligatoire: parsed.obligatoire === "on",
      preuve: parsed.preuve,
      verifEfficacite: parsed.verifEfficacite,
      modifiePar: nomAuteur(session),
      modifieLe: new Date(),
    },
  });

  revalidatePath(`/plan-action/${id}`);
  revalidatePath("/plan-action");
  if (action.ecartId) revalidatePath(`/ecarts/${action.ecartId}`);
  if (action.ficheSSEId) revalidatePath(`/fiches-sse/${action.ficheSSEId}`);
  if (action.ecartAmianteId) revalidatePath(`/ecart-amiante/${action.ecartAmianteId}`);
}

export async function mettreAJourStatutAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const statut = String(formData.get("statut")) as StatutAction;

  const action = await prisma.action.update({ where: { id }, data: { statut } });
  revalidatePath(`/plan-action/${id}`);
  revalidatePath("/plan-action");
  if (action.ecartId) revalidatePath(`/ecarts/${action.ecartId}`);
  if (action.ficheSSEId) revalidatePath(`/fiches-sse/${action.ficheSSEId}`);
  if (action.ecartAmianteId) revalidatePath(`/ecart-amiante/${action.ecartAmianteId}`);
  await recalculerStatutsParents(action);
}

export async function supprimerAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const action = await prisma.action.delete({ where: { id } });

  revalidatePath("/plan-action");
  if (action.ecartId) revalidatePath(`/ecarts/${action.ecartId}`);
  if (action.ficheSSEId) revalidatePath(`/fiches-sse/${action.ficheSSEId}`);
  if (action.ecartAmianteId) revalidatePath(`/ecart-amiante/${action.ecartAmianteId}`);

  if (action.ecartId) redirect(`/ecarts/${action.ecartId}`);
  if (action.ficheSSEId) redirect(`/fiches-sse/${action.ficheSSEId}`);
  if (action.ecartAmianteId) redirect(`/ecart-amiante/${action.ecartAmianteId}`);
  redirect("/plan-action");
}
