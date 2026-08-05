"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { auth } from "@/auth";
import { Origine } from "@/generated/prisma/enums";
import { revalidatePath } from "next/cache";
import { nomAuteur } from "@/lib/audit";
import { lireStatutDossierEcart, dateObligatoire } from "@/lib/validation";
import { supprimerDossierCascade } from "@/lib/suppression";
import { texte } from "@/lib/formulaire";

const dossierSchema = z.object({
  dateDetection: dateObligatoire,
  origine: z.enum(Object.values(Origine) as [string, ...string[]]),
  declarant: z.string().min(1, "Déclarant requis"),
  chantier: z.string().min(1, "Chantier requis"),
  enregistrement: z.string().nullable(),
  enregistrementNom: z.string().nullable(),
});

export async function creerDossier(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const parsed = dossierSchema.parse({
    dateDetection: formData.get("dateDetection"),
    origine: formData.get("origine"),
    declarant: formData.get("declarant"),
    chantier: formData.get("chantier"),
    enregistrement: texte(formData.get("enregistrement")),
    enregistrementNom: texte(formData.get("enregistrementNom")),
  });

  const reference = await generateReference("Dossier", "D");

  const dossier = await prisma.dossier.create({
    data: {
      reference,
      dateDetection: new Date(parsed.dateDetection),
      origine: parsed.origine as Origine,
      declarant: parsed.declarant,
      chantier: parsed.chantier,
      enregistrement: parsed.enregistrement,
      enregistrementNom: parsed.enregistrementNom,
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
    enregistrement: texte(formData.get("enregistrement")),
    enregistrementNom: texte(formData.get("enregistrementNom")),
  });

  await prisma.dossier.update({
    where: { id },
    data: {
      dateDetection: new Date(parsed.dateDetection),
      origine: parsed.origine as Origine,
      declarant: parsed.declarant,
      chantier: parsed.chantier,
      // null et non undefined : Prisma ignore un champ undefined, si bien que
      // « Retirer l'enregistrement » n'effacerait rien.
      enregistrement: parsed.enregistrement,
      enregistrementNom: parsed.enregistrementNom,
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
  const statut = lireStatutDossierEcart(formData.get("statut"));

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
