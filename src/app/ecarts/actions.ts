"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { auth } from "@/auth";
import { Origine, StatutDossierEcart, TypeActivite } from "@/generated/prisma/enums";

const ecartSchema = z.object({
  dossierId: z.string().min(1, "Dossier requis"),
  dateDetection: z.string().min(1, "Date requise"),
  origine: z.enum(Object.values(Origine) as [string, ...string[]]),
  declarant: z.string().min(1, "Déclarant requis"),
  typeActivite: z.string().optional(),
  description: z.string().optional(),
  mesureImmediate: z.string().optional(),
  gravitePotentielle: z.string().optional(),
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
    gravitePotentielle: formData.get("gravitePotentielle") || undefined,
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
      gravitePotentielle: parsed.gravitePotentielle,
      frequence: parsed.frequence,
    },
  });

  revalidatePath(`/dossiers/${parsed.dossierId}`);
  redirect(`/ecarts/${ecart.id}`);
}

const ecartEditSchema = z.object({
  dateDetection: z.string().min(1, "Date requise"),
  origine: z.enum(Object.values(Origine) as [string, ...string[]]),
  declarant: z.string().min(1, "Déclarant requis"),
  typeActivite: z.string().optional(),
  pointsSensibles: z.string().optional(),
  graviteReelle: z.string().optional(),
  gravitePotentielle: z.string().optional(),
  frequence: z.string().optional(),
  description: z.string().optional(),
  mesureImmediate: z.string().optional(),
  cause: z.string().optional(),
  critereEfficacite: z.string().optional(),
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
    pointsSensibles: formData.get("pointsSensibles") || undefined,
    graviteReelle: formData.get("graviteReelle") || undefined,
    gravitePotentielle: formData.get("gravitePotentielle") || undefined,
    frequence: formData.get("frequence") || undefined,
    description: formData.get("description") || undefined,
    mesureImmediate: formData.get("mesureImmediate") || undefined,
    cause: formData.get("cause") || undefined,
    critereEfficacite: formData.get("critereEfficacite") || undefined,
  });

  const natures = formData.getAll("natures").map(String);
  const domaines = formData.getAll("domaines").map(String);

  const ecart = await prisma.ecart.update({
    where: { id },
    data: {
      dateDetection: new Date(parsed.dateDetection),
      origine: parsed.origine as Origine,
      declarant: parsed.declarant,
      typeActivite: parsed.typeActivite ? (parsed.typeActivite as TypeActivite) : null,
      natures,
      domaines,
      pointsSensibles: parsed.pointsSensibles,
      graviteReelle: parsed.graviteReelle,
      gravitePotentielle: parsed.gravitePotentielle,
      frequence: parsed.frequence,
      description: parsed.description,
      mesureImmediate: parsed.mesureImmediate,
      cause: parsed.cause,
      critereEfficacite: parsed.critereEfficacite,
    },
  });

  revalidatePath(`/ecarts/${id}`);
  revalidatePath("/ecarts");
  revalidatePath(`/dossiers/${ecart.dossierId}`);
}

export async function mettreAJourStatutEcart(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const statut = String(formData.get("statut")) as StatutDossierEcart;

  const ecart = await prisma.ecart.update({ where: { id }, data: { statut } });
  revalidatePath(`/ecarts/${id}`);
  revalidatePath("/ecarts");
  revalidatePath(`/dossiers/${ecart.dossierId}`);
}

export async function marquerFicheSSECreee(ecartId: string) {
  await prisma.ecart.update({ where: { id: ecartId }, data: { ficheSSECreee: true } });
}
