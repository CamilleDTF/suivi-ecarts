"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { auth } from "@/auth";
import { OrigineRemontee } from "@/generated/prisma/enums";
import { nomAuteur } from "@/lib/audit";
import { lireStatutRemontee, dateObligatoire } from "@/lib/validation";

const remonteeSchema = z.object({
  dateRemontee: dateObligatoire,
  origine: z.enum(Object.values(OrigineRemontee) as [string, ...string[]]),
  chantierService: z.string().min(1, "Chantier ou service requis"),
  personneRemontant: z.string().optional(),
  objet: z.string().min(1, "Objet requis"),
  categorie: z.string().optional(),
  description: z.string().optional(),
  suiteDonnee: z.string().optional(),
});

function lireFormulaire(formData: FormData) {
  // Les cases à cocher arrivent en plusieurs entrées du même nom : getAll, et
  // non get, sinon seule la première serait retenue.
  const natures = formData.getAll("natures").map(String);
  return {
    natures,
    ...remonteeSchema.parse({
    dateRemontee: formData.get("dateRemontee"),
    origine: formData.get("origine"),
    chantierService: formData.get("chantierService"),
    personneRemontant: formData.get("personneRemontant") || undefined,
    objet: formData.get("objet"),
    categorie: formData.get("categorie") || undefined,
    description: formData.get("description") || undefined,
    suiteDonnee: formData.get("suiteDonnee") || undefined,
    }),
  };
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
      // Donnée d'audit : qui a enregistré l'information dans l'application.
      // Elle vient de la session, pas du formulaire, sinon n'importe qui peut
      // déclarer que quelqu'un d'autre a fait la saisie.
      personneSaisie: nomAuteur(session),
      objet: parsed.objet,
      natures: parsed.natures,
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
      objet: parsed.objet,
      natures: parsed.natures,
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
  // Une fois l'écart créé, le statut décrit un fait acquis : le ramener à
  // "Traitée" ferait mentir la fiche, qui affiche l'écart juste à côté.
  if (remontee.ecartId && statut !== "TRANSFORMEE_EN_ECART") {
    throw new Error("Le statut d'une remontée transformée en écart ne peut plus être modifié.");
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

  // Même règle que le sélecteur de statut : ce raccourci ne doit pas être une
  // porte dérobée pour redescendre une remontée transformée.
  const remontee = await prisma.remonteeInfo.findUniqueOrThrow({ where: { id }, select: { ecartId: true } });
  if (remontee.ecartId) {
    throw new Error("Cette remontée a été transformée en écart : son statut ne change plus.");
  }

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

  // Supprimer une remontée transformée effacerait l'origine d'un écart qui,
  // lui, reste au registre.
  const remontee = await prisma.remonteeInfo.findUniqueOrThrow({ where: { id }, select: { ecartId: true } });
  if (remontee.ecartId) {
    throw new Error("Une remontée transformée en écart ne peut pas être supprimée. Archivez-la.");
  }

  // Les actions nées de cette remontée disparaissent avec elle : la contrainte
  // les détacherait sinon, et elles se retrouveraient sans rattachement.
  await prisma.$transaction(async (tx) => {
    await tx.action.deleteMany({ where: { remonteeId: id } });
    await tx.remonteeInfo.delete({ where: { id } });
  });

  revalidatePath("/remontees");
  redirect("/remontees");
}
