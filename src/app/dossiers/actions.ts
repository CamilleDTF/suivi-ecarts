"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { auth } from "@/auth";
import { Origine, StatutDossierEcart } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { nomAuteur } from "@/lib/audit";
import { supprimerDossierCascade } from "@/lib/suppression";

const dossierSchema = z.object({
  dateDetection: z.string().min(1, "Date requise"),
  origine: z.enum(Object.values(Origine) as [string, ...string[]]),
  declarant: z.string().min(1, "Déclarant requis"),
  chantier: z.string().min(1, "Chantier requis"),
});

export async function creerDossier(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const parsed = dossierSchema.parse({
    dateDetection: formData.get("dateDetection"),
    origine: formData.get("origine"),
    declarant: formData.get("declarant"),
    chantier: formData.get("chantier"),
  });

  const reference = await generateReference("Dossier", "D");

  const dossier = await prisma.dossier.create({
    data: {
      reference,
      dateDetection: new Date(parsed.dateDetection),
      origine: parsed.origine as Origine,
      declarant: parsed.declarant,
      chantier: parsed.chantier,
    },
  });

  redirect(`/dossiers/${dossier.id}`);
}

export async function mettreAJourDossier(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const parsed = dossierSchema.parse({
    dateDetection: formData.get("dateDetection"),
    origine: formData.get("origine"),
    declarant: formData.get("declarant"),
    chantier: formData.get("chantier"),
  });

  await prisma.dossier.update({
    where: { id },
    data: {
      dateDetection: new Date(parsed.dateDetection),
      origine: parsed.origine as Origine,
      declarant: parsed.declarant,
      chantier: parsed.chantier,
      modifiePar: nomAuteur(session),
      modifieLe: new Date(),
    },
  });

  revalidatePath(`/dossiers/${id}`);
  revalidatePath("/dossiers");
}

export async function mettreAJourStatutDossier(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const statut = String(formData.get("statut")) as StatutDossierEcart;

  await prisma.dossier.update({ where: { id }, data: { statut } });
  revalidatePath(`/dossiers/${id}`);
  revalidatePath("/dossiers");
}

export async function supprimerDossier(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  await supprimerDossierCascade(id);

  revalidatePath("/dossiers");
  redirect("/dossiers");
}
