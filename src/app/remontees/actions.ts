"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { auth } from "@/auth";
import { OrigineRemontee } from "@/generated/prisma/enums";
import { nomAuteur } from "@/lib/audit";
import { lireStatutRemontee } from "@/lib/validation";

const remonteeSchema = z.object({
  dateRemontee: z.string().min(1, "Date requise"),
  origine: z.enum(Object.values(OrigineRemontee) as [string, ...string[]]),
  chantierService: z.string().min(1, "Chantier ou service requis"),
  personneRemontant: z.string().optional(),
  personneSaisie: z.string().optional(),
  objet: z.string().min(1, "Objet requis"),
  categorie: z.string().optional(),
  description: z.string().optional(),
  suiteDonnee: z.string().optional(),
});

function lireFormulaire(formData: FormData) {
  return remonteeSchema.parse({
    dateRemontee: formData.get("dateRemontee"),
    origine: formData.get("origine"),
    chantierService: formData.get("chantierService"),
    personneRemontant: formData.get("personneRemontant") || undefined,
    personneSaisie: formData.get("personneSaisie") || undefined,
    objet: formData.get("objet"),
    categorie: formData.get("categorie") || undefined,
    description: formData.get("description") || undefined,
    suiteDonnee: formData.get("suiteDonnee") || undefined,
  });
}

export async function creerRemontee(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const parsed = lireFormulaire(formData);
  const reference = await generateReference("RemonteeInfo", "RI");

  const remontee = await prisma.remonteeInfo.create({
    data: {
      reference,
      dateRemontee: new Date(parsed.dateRemontee),
      origine: parsed.origine as OrigineRemontee,
      chantierService: parsed.chantierService,
      personneRemontant: parsed.personneRemontant,
      // À défaut de précision, la personne connectée est celle qui saisit.
      personneSaisie: parsed.personneSaisie ?? nomAuteur(session),
      objet: parsed.objet,
      categorie: parsed.categorie,
      description: parsed.description,
      suiteDonnee: parsed.suiteDonnee,
    },
  });

  revalidatePath("/remontees");
  redirect(`/remontees/${remontee.id}`);
}

export async function mettreAJourRemontee(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const parsed = lireFormulaire(formData);

  await prisma.remonteeInfo.update({
    where: { id },
    data: {
      dateRemontee: new Date(parsed.dateRemontee),
      origine: parsed.origine as OrigineRemontee,
      chantierService: parsed.chantierService,
      personneRemontant: parsed.personneRemontant ?? null,
      personneSaisie: parsed.personneSaisie ?? null,
      objet: parsed.objet,
      categorie: parsed.categorie ?? null,
      description: parsed.description ?? null,
      suiteDonnee: parsed.suiteDonnee ?? null,
      modifiePar: nomAuteur(session),
      modifieLe: new Date(),
    },
  });

  revalidatePath(`/remontees/${id}`);
  revalidatePath("/remontees");
}

export async function mettreAJourStatutRemontee(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const statut = lireStatutRemontee(formData.get("statut"));

  // "Transformée en écart" décrit un fait (un écart a été créé depuis cette
  // remontée), pas un choix : il ne se pose que via la transformation elle-même.
  const remontee = await prisma.remonteeInfo.findUniqueOrThrow({ where: { id }, select: { ecartId: true } });
  if (statut === "TRANSFORMEE_EN_ECART" && !remontee.ecartId) {
    throw new Error("Utilisez « Transformer en écart » pour ce statut.");
  }

  await prisma.remonteeInfo.update({ where: { id }, data: { statut } });
  revalidatePath(`/remontees/${id}`);
  revalidatePath("/remontees");
}

/** Marque la remontée comme traitée sans passer par le formulaire complet. */
export async function marquerRemonteeTraitee(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  await prisma.remonteeInfo.update({
    where: { id },
    data: { statut: "TRAITEE", modifiePar: nomAuteur(session), modifieLe: new Date() },
  });

  revalidatePath(`/remontees/${id}`);
  revalidatePath("/remontees");
}

export async function supprimerRemontee(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  await prisma.remonteeInfo.delete({ where: { id } });

  revalidatePath("/remontees");
  redirect("/remontees");
}
