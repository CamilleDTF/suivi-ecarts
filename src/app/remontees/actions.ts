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
import { texte } from "@/lib/formulaire";

const remonteeSchema = z.object({
  dateRemontee: dateObligatoire,
  origine: z.enum(Object.values(OrigineRemontee) as [string, ...string[]]),
  chantierService: z.string().min(1, "Chantier ou service requis"),
  personneRemontant: z.string().optional(),
  objet: z.string().min(1, "Objet requis"),
  description: z.string().optional(),
  suiteDonnee: z.string().optional(),
});

function lireFormulaire(formData: FormData) {
  // Les cases à cocher arrivent en plusieurs entrées du même nom : getAll, et
  // non get, sinon seule la première serait retenue.
  const natures = formData.getAll("natures").map(String);
  const categories = formData.getAll("categories").map(String);
  return {
    natures,
    categories,
    ...remonteeSchema.parse({
    dateRemontee: formData.get("dateRemontee"),
    origine: formData.get("origine"),
    chantierService: formData.get("chantierService"),
    personneRemontant: formData.get("personneRemontant") || undefined,
    objet: formData.get("objet"),
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
      categories: parsed.categories,
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
      categories: parsed.categories,
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
  //
  // Le verrou s'appuie sur le statut et non sur la présence d'un écart :
  // depuis qu'une remontée peut être simplement rattachée à un écart existant,
  // un rattachement ne vaut plus transformation et ne doit rien figer.
  const remontee = await prisma.remonteeInfo.findUniqueOrThrow({ where: { id }, select: { statut: true } });
  if (statut === "TRANSFORMEE_EN_ECART" && remontee.statut !== "TRANSFORMEE_EN_ECART") {
    throw new Error("Utilisez « Transformer en écart » pour ce statut.");
  }
  if (remontee.statut === "TRANSFORMEE_EN_ECART" && statut !== "TRANSFORMEE_EN_ECART") {
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
  const remontee = await prisma.remonteeInfo.findUniqueOrThrow({ where: { id }, select: { statut: true } });
  if (remontee.statut === "TRANSFORMEE_EN_ECART") {
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
  // lui, reste au registre. Une remontée seulement rattachée, elle, reste
  // supprimable : l'écart existait avant elle et lui survit.
  const remontee = await prisma.remonteeInfo.findUniqueOrThrow({ where: { id }, select: { statut: true } });
  if (remontee.statut === "TRANSFORMEE_EN_ECART") {
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

/**
 * Rattache la remontée à un ou plusieurs écarts, ou à un évènement SSE, ou la
 * détache.
 *
 * Plusieurs écarts, car un même signalement en révèle souvent plus d'un ; mais
 * un seul type à la fois, comme pour les actions. Rattacher ne vaut pas
 * transformation — le statut n'est pas touché et la remontée reste modifiable
 * et supprimable.
 */
export async function changerRattachementRemontee(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const type = String(formData.get("typeRattachement") ?? "");
  const ecartIds = formData.getAll("ecartIds").map(String).filter(Boolean);
  const ficheSSEId = texte(formData.get("ficheSSEId"));

  // Type choisi sans cible : on ne détache pas la remontée par inadvertance.
  // "aucun" en revanche est un choix explicite.
  if (type === "ecart" && ecartIds.length === 0) return;
  if (type === "evenement" && !ficheSSEId) return;
  if (!["ecart", "evenement", "aucun"].includes(type)) return;

  const avant = await prisma.remonteeInfo.findUniqueOrThrow({
    where: { id },
    select: { statut: true, ecarts: { select: { id: true } }, ficheSSEId: true },
  });

  // Détacher une remontée transformée laisserait un écart sans origine
  // traçable, et une remontée affichant un statut que plus rien ne justifie.
  if (avant.statut === "TRANSFORMEE_EN_ECART") {
    throw new Error(
      "Le rattachement d'une remontée transformée en écart ne peut pas être modifié.",
    );
  }

  const remontee = await prisma.remonteeInfo.update({
    where: { id },
    include: { ecarts: { select: { id: true } } },
    data: {
      // `set` et non `connect` : il remplace la liste, donc il détache aussi
      // les écarts retirés du choix.
      ecarts: { set: type === "ecart" ? ecartIds.map((e) => ({ id: e })) : [] },
      ficheSSEId: type === "evenement" ? ficheSSEId : null,
      modifiePar: nomAuteur(session),
      modifieLe: new Date(),
    },
  });

  const ecartsTouches = new Set([
    ...avant.ecarts.map((e) => e.id),
    ...remontee.ecarts.map((e) => e.id),
  ]);
  for (const chemin of [
    ...[...ecartsTouches].map((e) => `/ecarts/${e}`),
    avant.ficheSSEId && `/fiches-sse/${avant.ficheSSEId}`,
    remontee.ficheSSEId && `/fiches-sse/${remontee.ficheSSEId}`,
  ]) {
    if (chemin) revalidatePath(chemin);
  }
  revalidatePath(`/remontees/${id}`);
  revalidatePath("/remontees");
}
