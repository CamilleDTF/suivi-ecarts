"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { auth } from "@/auth";
import { Origine, TypeActivite } from "@/generated/prisma/enums";
import { nomAuteur } from "@/lib/audit";
import { lireStatutDossierEcart } from "@/lib/validation";
import { calculerCriticite } from "@/lib/labels";
import { supprimerEcartCascade } from "@/lib/suppression";
import { texte } from "@/lib/formulaire";

const ecartSchema = z.object({
  dossierId: z.string().min(1, "Dossier requis"),
  dateDetection: z.string().min(1, "Date requise"),
  origine: z.enum(Object.values(Origine) as [string, ...string[]]),
  declarant: z.string().min(1, "Déclarant requis"),
  typeActivite: z.string().optional(),
  description: z.string().optional(),
  mesureImmediate: z.string().optional(),
  gravite: z.string().optional(),
  frequence: z.string().optional(),
});

export async function creerEcart(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const parsed = ecartSchema.parse({
    dossierId: formData.get("dossierId"),
    dateDetection: formData.get("dateDetection"),
    origine: formData.get("origine"),
    declarant: formData.get("declarant"),
    typeActivite: formData.get("typeActivite") || undefined,
    description: formData.get("description") || undefined,
    mesureImmediate: formData.get("mesureImmediate") || undefined,
    gravite: formData.get("gravite") || undefined,
    frequence: formData.get("frequence") || undefined,
  });

  const natures = formData.getAll("natures").map(String);
  const domaines = formData.getAll("domaines").map(String);

  const reference = await generateReference("Ecart", "EC");

  const ecart = await prisma.ecart.create({
    data: {
      reference,
      dossierId: parsed.dossierId,
      dateDetection: new Date(parsed.dateDetection),
      origine: parsed.origine as Origine,
      declarant: parsed.declarant,
      typeActivite: parsed.typeActivite ? (parsed.typeActivite as TypeActivite) : undefined,
      natures,
      domaines,
      description: parsed.description,
      mesureImmediate: parsed.mesureImmediate,
      gravite: parsed.gravite,
      frequence: parsed.frequence,
      criticite: calculerCriticite(parsed.gravite ?? "", parsed.frequence ?? "") || undefined,
    },
  });

  // Écart né d'une remontée d'information : on relie les deux et on bascule la
  // remontée en "Transformée en écart", pour garder la trace de son origine.
  const remonteeId = formData.get("remonteeId");
  if (remonteeId) {
    await prisma.remonteeInfo.update({
      where: { id: String(remonteeId) },
      data: { ecartId: ecart.id, statut: "TRANSFORMEE_EN_ECART" },
    });
    revalidatePath(`/remontees/${remonteeId}`);
    revalidatePath("/remontees");
  }

  revalidatePath(`/dossiers/${parsed.dossierId}`);
  redirect(`/ecarts/${ecart.id}`);
}

const ecartEditSchema = z.object({
  dateDetection: z.string().min(1, "Date requise"),
  origine: z.enum(Object.values(Origine) as [string, ...string[]]),
  declarant: z.string().min(1, "Déclarant requis"),
  typeActivite: z.string().optional(),
  gravite: z.string().optional(),
  frequence: z.string().optional(),
  description: z.string().optional(),
  mesureImmediate: z.string().optional(),
  cause: z.string().optional(),
});

export async function mettreAJourEcart(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const parsed = ecartEditSchema.parse({
    dateDetection: formData.get("dateDetection"),
    origine: formData.get("origine"),
    declarant: formData.get("declarant"),
    typeActivite: formData.get("typeActivite") || undefined,
    gravite: formData.get("gravite") || undefined,
    frequence: formData.get("frequence") || undefined,
    description: formData.get("description") || undefined,
    mesureImmediate: formData.get("mesureImmediate") || undefined,
    cause: formData.get("cause") || undefined,
  });

  const natures = formData.getAll("natures").map(String);
  const domaines = formData.getAll("domaines").map(String);
  const theme = formData.getAll("theme").map(String);

  const ecart = await prisma.ecart.update({
    where: { id },
    data: {
      dateDetection: new Date(parsed.dateDetection),
      origine: parsed.origine as Origine,
      declarant: parsed.declarant,
      typeActivite: parsed.typeActivite ? (parsed.typeActivite as TypeActivite) : null,
      natures,
      domaines,
      theme,
      gravite: parsed.gravite ?? null,
      frequence: parsed.frequence ?? null,
      // Recalculée côté serveur plutôt que reprise du champ caché du
      // formulaire : elle reste ainsi toujours cohérente avec gravité ×
      // fréquence, quoi qu'envoie le client.
      criticite: calculerCriticite(parsed.gravite ?? "", parsed.frequence ?? "") || null,
      // ?? null : sans ça, vider le champ dans le formulaire ne l'effaçait pas,
      // Prisma ignorant les champs à undefined.
      description: parsed.description ?? null,
      mesureImmediate: parsed.mesureImmediate ?? null,
      cause: parsed.cause ?? null,
      modifiePar: nomAuteur(session),
      modifieLe: new Date(),
    },
  });

  revalidatePath(`/ecarts/${id}`);
  revalidatePath("/ecarts");
  if (ecart.dossierId) revalidatePath(`/dossiers/${ecart.dossierId}`);
}

export async function mettreAJourStatutEcart(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const statut = lireStatutDossierEcart(formData.get("statut"));

  const ecart = await prisma.ecart.update({ where: { id }, data: { statut } });
  revalidatePath(`/ecarts/${id}`);
  revalidatePath("/ecarts");
  if (ecart.dossierId) revalidatePath(`/dossiers/${ecart.dossierId}`);
}

// Correction d'un rattachement erroné, ou détachement : un écart peut ne plus
// appartenir à aucun dossier, comme une action ou un évènement.
export async function changerRattachementEcart(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const type = String(formData.get("typeRattachement") ?? "aucun");
  const dossierId = type === "dossier" ? texte(formData.get("dossierId")) : null;

  // Type choisi sans cible : on ne détache pas l'écart par inadvertance.
  if (type === "dossier" && !dossierId) return;

  const avant = await prisma.ecart.findUniqueOrThrow({ where: { id }, select: { dossierId: true } });

  await prisma.ecart.update({
    where: { id },
    data: { dossierId, modifiePar: nomAuteur(session), modifieLe: new Date() },
  });

  // L'ancien dossier perd un écart, le nouveau en gagne un.
  for (const chemin of [avant.dossierId, dossierId]) {
    if (chemin) revalidatePath(`/dossiers/${chemin}`);
  }
  revalidatePath(`/ecarts/${id}`);
  revalidatePath("/ecarts");
}

export async function marquerFicheSSECreee(ecartId: string) {
  await prisma.ecart.update({ where: { id: ecartId }, data: { ficheSSECreee: true } });
}

export async function supprimerEcart(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const ecart = await prisma.ecart.findUniqueOrThrow({ where: { id }, select: { dossierId: true } });

  await supprimerEcartCascade(id);

  revalidatePath("/ecarts");
  if (ecart.dossierId) revalidatePath(`/dossiers/${ecart.dossierId}`);
  redirect(ecart.dossierId ? `/dossiers/${ecart.dossierId}` : "/ecarts");
}
