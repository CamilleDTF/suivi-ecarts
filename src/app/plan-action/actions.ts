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
import { lireStatutAction, dateFacultative } from "@/lib/validation";
import { texte } from "@/lib/formulaire";

const actionSchema = z
  .object({
    ecartIds: z.array(z.string()).default([]),
    ficheSSEId: z.string().optional(),
    ecartAmianteId: z.string().optional(),
    remonteeId: z.string().optional(),
    type: z.enum(Object.values(TypeAction) as [string, ...string[]]),
    action: z.string().min(1, "Description de l'action requise"),
    responsable: z.string().min(1, "Responsable requis"),
    echeance: dateFacultative,
    realiseeLe: dateFacultative,
  })
  // Un seul TYPE de rattachement, mais autant d'écarts qu'on veut : une même
  // correction couvre souvent plusieurs constats. Mélanger les types, en
  // revanche, rendrait le calcul des statuts et les suppressions en cascade
  // ambigus.
  .refine(
    (v) =>
      [v.ecartIds.length > 0, !!v.ficheSSEId, !!v.ecartAmianteId, !!v.remonteeId].filter(Boolean)
        .length === 1,
    {
      message:
        "Une action doit être rattachée soit à un ou plusieurs écarts, soit à un évènement SSE, soit à un écart amiante, soit à une remontée",
    },
  );

export async function creerAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const parsed = actionSchema.parse({
    ecartIds: formData.getAll("ecartIds").map(String).filter(Boolean),
    ficheSSEId: formData.get("ficheSSEId") || undefined,
    ecartAmianteId: formData.get("ecartAmianteId") || undefined,
    remonteeId: formData.get("remonteeId") || undefined,
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
      ecarts: { connect: parsed.ecartIds.map((id) => ({ id })) },
      ficheSSEId: parsed.ficheSSEId,
      ecartAmianteId: parsed.ecartAmianteId,
      remonteeId: parsed.remonteeId,
      type: parsed.type as TypeAction,
      action: parsed.action,
      responsable: parsed.responsable,
      echeance: parsed.echeance ? new Date(parsed.echeance) : undefined,
      realiseeLe: parsed.realiseeLe ? new Date(parsed.realiseeLe) : null,
      // Une date de réalisation vaut déclaration : l'action est réalisée.
      statut: parsed.realiseeLe ? StatutAction.REALISEE : undefined,
    },
  });

  for (const id of parsed.ecartIds) revalidatePath(`/ecarts/${id}`);
  if (parsed.ficheSSEId) revalidatePath(`/fiches-sse/${parsed.ficheSSEId}`);
  if (parsed.ecartAmianteId) revalidatePath(`/ecart-amiante/${parsed.ecartAmianteId}`);
  if (parsed.remonteeId) revalidatePath(`/remontees/${parsed.remonteeId}`);
  await recalculerStatutsParents({ ...action, ecartIds: parsed.ecartIds });
  redirect(`/plan-action/${action.id}`);
}

const actionEditSchema = z.object({
  type: z.enum(Object.values(TypeAction) as [string, ...string[]]),
  action: z.string().min(1, "Description de l'action requise"),
  responsable: z.string().min(1, "Responsable requis"),
  echeance: dateFacultative,
  realiseeLe: dateFacultative,
  preuve: z.string().optional(),
  verifiePar: z.string().optional(),
  verifieLe: dateFacultative,
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
  // On ne redescend pas une action annulée, et on ne rouvre pas une action dont
  // on efface la date — ce choix-là reste manuel.
  const actuelle = await prisma.action.findUniqueOrThrow({ where: { id }, select: { statut: true } });
  const statutAuto =
    parsed.realiseeLe && ["A_FAIRE", "EN_COURS", "EN_RETARD"].includes(actuelle.statut)
      ? StatutAction.REALISEE
      : undefined;

  const action = await prisma.action.update({
    where: { id },
    include: { ecarts: { select: { id: true } } },
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
  for (const e of action.ecarts) revalidatePath(`/ecarts/${e.id}`);
  if (action.ficheSSEId) revalidatePath(`/fiches-sse/${action.ficheSSEId}`);
  if (action.ecartAmianteId) revalidatePath(`/ecart-amiante/${action.ecartAmianteId}`);
  if (action.remonteeId) revalidatePath(`/remontees/${action.remonteeId}`);
  // Le formulaire peut désormais faire passer l'action à "Réalisée" via la date
  // de réalisation : le statut de l'écart ou de l'évènement parent doit suivre.
  await recalculerStatutsParents({ ...action, ecartIds: action.ecarts.map((e) => e.id) });
}

export async function mettreAJourStatutAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const statut = lireStatutAction(formData.get("statut"));

  const action = await prisma.action.update({
    where: { id },
    data: { statut },
    include: { ecarts: { select: { id: true } } },
  });
  revalidatePath(`/plan-action/${id}`);
  revalidatePath("/plan-action");
  for (const e of action.ecarts) revalidatePath(`/ecarts/${e.id}`);
  if (action.ficheSSEId) revalidatePath(`/fiches-sse/${action.ficheSSEId}`);
  if (action.ecartAmianteId) revalidatePath(`/ecart-amiante/${action.ecartAmianteId}`);
  if (action.remonteeId) revalidatePath(`/remontees/${action.remonteeId}`);
  await recalculerStatutsParents({ ...action, ecartIds: action.ecarts.map((e) => e.id) });
}

// Correction d'un rattachement erroné. Un seul type à la fois, comme à la
// création — mais plusieurs écarts si c'est le type retenu.
export async function changerRattachementAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const type = String(formData.get("typeRattachement") ?? "");
  const CHAMPS: Record<string, string> = {
    evenement: "ficheSSEId",
    amiante: "ecartAmianteId",
    remontee: "remonteeId",
  };
  const ecartIds = formData.getAll("ecartIds").map(String).filter(Boolean);
  const cible = texte(formData.get(CHAMPS[type] ?? ""));

  // Type choisi sans cible : on ne détache pas l'action par inadvertance.
  // "aucun" en revanche est un choix explicite.
  if (type === "ecart" && ecartIds.length === 0) return;
  if (type !== "aucun" && type !== "ecart" && (!(type in CHAMPS) || !cible)) return;

  const avant = await prisma.action.findUniqueOrThrow({
    where: { id },
    select: {
      ecarts: { select: { id: true } },
      ficheSSEId: true,
      ecartAmianteId: true,
      remonteeId: true,
    },
  });

  const action = await prisma.action.update({
    where: { id },
    include: { ecarts: { select: { id: true } } },
    data: {
      // `set` et non `connect` : il remplace la liste, donc il détache aussi
      // les écarts retirés du choix.
      ecarts: { set: type === "ecart" ? ecartIds.map((e) => ({ id: e })) : [] },
      ficheSSEId: type === "evenement" ? cible : null,
      ecartAmianteId: type === "amiante" ? cible : null,
      remonteeId: type === "remontee" ? cible : null,
      modifiePar: nomAuteur(session),
      modifieLe: new Date(),
    },
  });

  const ecartsAvant = avant.ecarts.map((e) => e.id);
  const ecartsApres = action.ecarts.map((e) => e.id);

  // Les anciens parents perdent une action, les nouveaux en gagnent une : tous
  // voient leur statut recalculé.
  await recalculerStatutsParents({ ...avant, ecartIds: ecartsAvant });
  await recalculerStatutsParents({ ...action, ecartIds: ecartsApres });

  for (const chemin of [
    ...new Set([...ecartsAvant, ...ecartsApres]).values().map((e) => `/ecarts/${e}`),
    avant.ficheSSEId && `/fiches-sse/${avant.ficheSSEId}`,
    avant.ecartAmianteId && `/ecart-amiante/${avant.ecartAmianteId}`,
    avant.remonteeId && `/remontees/${avant.remonteeId}`,
    action.ficheSSEId && `/fiches-sse/${action.ficheSSEId}`,
    action.ecartAmianteId && `/ecart-amiante/${action.ecartAmianteId}`,
    action.remonteeId && `/remontees/${action.remonteeId}`,
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
  // Les écarts sont lus avant la suppression : après, la table de liaison est
  // déjà purgée et on ne saurait plus quels statuts recalculer.
  const avant = await prisma.action.findUniqueOrThrow({
    where: { id },
    select: { ecarts: { select: { id: true } } },
  });
  const ecartIds = avant.ecarts.map((e) => e.id);
  const action = await prisma.action.delete({ where: { id } });

  revalidatePath("/plan-action");
  for (const e of ecartIds) revalidatePath(`/ecarts/${e}`);
  if (action.ficheSSEId) revalidatePath(`/fiches-sse/${action.ficheSSEId}`);
  if (action.ecartAmianteId) revalidatePath(`/ecart-amiante/${action.ecartAmianteId}`);
  if (action.remonteeId) revalidatePath(`/remontees/${action.remonteeId}`);
  await recalculerStatutsParents({ ...action, ecartIds });

  if (ecartIds.length > 0) redirect(`/ecarts/${ecartIds[0]}`);
  if (action.ficheSSEId) redirect(`/fiches-sse/${action.ficheSSEId}`);
  if (action.ecartAmianteId) redirect(`/ecart-amiante/${action.ecartAmianteId}`);
  if (action.remonteeId) redirect(`/remontees/${action.remonteeId}`);
  redirect("/plan-action");
}
