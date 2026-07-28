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
import { lireStatutAction } from "@/lib/validation";
import { texte } from "@/lib/formulaire";

const actionSchema = z
  .object({
    ecartId: z.string().optional(),
    ficheSSEId: z.string().optional(),
    ecartAmianteId: z.string().optional(),
    type: z.enum(Object.values(TypeAction) as [string, ...string[]]),
    action: z.string().min(1, "Description de l'action requise"),
    responsable: z.string().min(1, "Responsable requis"),
    echeance: z.string().optional(),
    realiseeLe: z.string().optional(),
  })
  // Exactement un parent, et pas "au moins un" : une action rattachée
  // simultanément à un écart, un évènement et un écart amiante rendrait le
  // calcul des statuts et les suppressions en cascade ambigus.
  .refine((v) => [v.ecartId, v.ficheSSEId, v.ecartAmianteId].filter(Boolean).length === 1, {
    message: "Une action doit être rattachée à un et un seul écart, évènement SSE ou écart amiante",
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
    realiseeLe: formData.get("realiseeLe") || undefined,
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
      realiseeLe: parsed.realiseeLe ? new Date(parsed.realiseeLe) : null,
      // Une date de réalisation vaut déclaration : l'action est réalisée.
      statut: parsed.realiseeLe ? StatutAction.REALISEE : undefined,
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
  realiseeLe: z.string().optional(),
  preuve: z.string().optional(),
  verifiePar: z.string().optional(),
  verifieLe: z.string().optional(),
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
    realiseeLe: formData.get("realiseeLe") || undefined,
    preuve: formData.get("preuve") || undefined,
    verifiePar: formData.get("verifiePar") || undefined,
    verifieLe: formData.get("verifieLe") || undefined,
  });

  // Une date de réalisation vaut déclaration : l'action passe à "Réalisée".
  // On ne redescend pas une action déjà vérifiée efficace ou annulée, et on ne
  // rouvre pas une action dont on efface la date — ce choix-là reste manuel.
  const actuelle = await prisma.action.findUniqueOrThrow({ where: { id }, select: { statut: true } });
  const statutAuto =
    parsed.realiseeLe && ["A_FAIRE", "EN_COURS", "EN_RETARD"].includes(actuelle.statut)
      ? StatutAction.REALISEE
      : undefined;

  const action = await prisma.action.update({
    where: { id },
    data: {
      type: parsed.type as TypeAction,
      action: parsed.action,
      responsable: parsed.responsable,
      echeance: parsed.echeance ? new Date(parsed.echeance) : undefined,
      realiseeLe: parsed.realiseeLe ? new Date(parsed.realiseeLe) : null,
      statut: statutAuto,
      // ?? null et non undefined : Prisma ignore un champ undefined, si bien
      // que « Retirer la preuve » n'effaçait rien.
      preuve: parsed.preuve ?? null,
      verifiePar: parsed.verifiePar ?? null,
      verifieLe: parsed.verifieLe ? new Date(parsed.verifieLe) : null,
      modifiePar: nomAuteur(session),
      modifieLe: new Date(),
    },
  });

  revalidatePath(`/plan-action/${id}`);
  revalidatePath("/plan-action");
  if (action.ecartId) revalidatePath(`/ecarts/${action.ecartId}`);
  if (action.ficheSSEId) revalidatePath(`/fiches-sse/${action.ficheSSEId}`);
  if (action.ecartAmianteId) revalidatePath(`/ecart-amiante/${action.ecartAmianteId}`);
  // Le formulaire peut désormais faire passer l'action à "Réalisée" via la date
  // de réalisation : le statut de l'écart ou de l'évènement parent doit suivre.
  await recalculerStatutsParents(action);
}

export async function mettreAJourStatutAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const statut = lireStatutAction(formData.get("statut"));

  const action = await prisma.action.update({ where: { id }, data: { statut } });
  revalidatePath(`/plan-action/${id}`);
  revalidatePath("/plan-action");
  if (action.ecartId) revalidatePath(`/ecarts/${action.ecartId}`);
  if (action.ficheSSEId) revalidatePath(`/fiches-sse/${action.ficheSSEId}`);
  if (action.ecartAmianteId) revalidatePath(`/ecart-amiante/${action.ecartAmianteId}`);
  await recalculerStatutsParents(action);
}

// Correction d'un rattachement erroné. Exactement un parent, comme à la
// création : deux rattachements rendraient le calcul des statuts et les
// suppressions en cascade ambigus.
export async function changerRattachementAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const type = String(formData.get("typeRattachement") ?? "");
  const cible = texte(formData.get(type === "ecart" ? "ecartId" : type === "evenement" ? "ficheSSEId" : "ecartAmianteId"));

  // Une action doit rester rattachée : pas de "Aucun", et pas de type choisi
  // sans cible.
  if (!["ecart", "evenement", "amiante"].includes(type) || !cible) return;

  const avant = await prisma.action.findUniqueOrThrow({
    where: { id },
    select: { ecartId: true, ficheSSEId: true, ecartAmianteId: true },
  });

  const action = await prisma.action.update({
    where: { id },
    data: {
      ecartId: type === "ecart" ? cible : null,
      ficheSSEId: type === "evenement" ? cible : null,
      ecartAmianteId: type === "amiante" ? cible : null,
      modifiePar: nomAuteur(session),
      modifieLe: new Date(),
    },
  });

  // L'ancien parent perd une action, le nouveau en gagne une : leurs statuts
  // sont recalculés tous les deux.
  await recalculerStatutsParents(avant);
  await recalculerStatutsParents(action);

  for (const chemin of [
    avant.ecartId && `/ecarts/${avant.ecartId}`,
    avant.ficheSSEId && `/fiches-sse/${avant.ficheSSEId}`,
    avant.ecartAmianteId && `/ecart-amiante/${avant.ecartAmianteId}`,
    action.ecartId && `/ecarts/${action.ecartId}`,
    action.ficheSSEId && `/fiches-sse/${action.ficheSSEId}`,
    action.ecartAmianteId && `/ecart-amiante/${action.ecartAmianteId}`,
  ]) {
    if (chemin) revalidatePath(chemin);
  }
  revalidatePath(`/plan-action/${id}`);
  revalidatePath("/plan-action");
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
  await recalculerStatutsParents(action);

  if (action.ecartId) redirect(`/ecarts/${action.ecartId}`);
  if (action.ficheSSEId) redirect(`/fiches-sse/${action.ficheSSEId}`);
  if (action.ecartAmianteId) redirect(`/ecart-amiante/${action.ecartAmianteId}`);
  redirect("/plan-action");
}
