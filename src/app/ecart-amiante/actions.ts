"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { auth } from "@/auth";
import { nomAuteur } from "@/lib/audit";
import { lireStatutDossierEcart } from "@/lib/validation";
import { supprimerEcartAmianteCascade } from "@/lib/suppression";

const bool = (v: FormDataEntryValue | null) => v === "on" || v === "true";
const str = (v: FormDataEntryValue | null) => (v ? String(v) : undefined);
const date = (v: FormDataEntryValue | null) => (v ? new Date(String(v)) : undefined);
// Boutons Oui / Non : tant qu'aucun n'est coché, la question n'a pas été
// tranchée et le champ reste vide — nuance qu'une case à cocher ne permet pas
// d'exprimer, et qui compte sur une fiche d'exposition.
const ouiNon = (v: FormDataEntryValue | null) => (v === "oui" ? true : v === "non" ? false : null);

const schema = z.object({
  nomChantier: z.string().min(1, "Nom du chantier requis"),
  numeroChantier: z.string().min(1, "Numéro de chantier requis"),
  conducteur: z.string().min(1, "Conducteur requis"),
  chef: z.string().min(1, "Chef requis"),
});

function parse(formData: FormData) {
  const parsed = schema.parse({
    nomChantier: formData.get("nomChantier"),
    numeroChantier: formData.get("numeroChantier"),
    conducteur: formData.get("conducteur"),
    chef: formData.get("chef"),
  });
  return {
    ...parsed,
    zone: str(formData.get("zone")),
    processus: str(formData.get("processus")),
    typeAnalyse: str(formData.get("typeAnalyse")),
    referenceAnalyse: str(formData.get("referenceAnalyse")),
    typeEcart: str(formData.get("typeEcart")),
    cause: str(formData.get("cause")),
    resultatAttendu: str(formData.get("resultatAttendu")),
    resultatObtenu: str(formData.get("resultatObtenu")),
    description: str(formData.get("description")),
    expositionAccidentelle: ouiNon(formData.get("expositionAccidentelle")),
    personneConcernee: str(formData.get("personneConcernee")),
    fie: ouiNon(formData.get("fie")),
    besoinNouvelleAnalyse: bool(formData.get("besoinNouvelleAnalyse")),
    pasNouvelleAnalyse: str(formData.get("pasNouvelleAnalyse")),
    dateNouvelleAnalyse: date(formData.get("dateNouvelleAnalyse")),
    laboratoireNouvelleAnalyse: str(formData.get("laboratoireNouvelleAnalyse")),
    chantierNouvelleAnalyse: str(formData.get("chantierNouvelleAnalyse")),
    resultatAttenduNouvelleAnalyse: str(formData.get("resultatAttenduNouvelleAnalyse")),
    resultatObtenuNouvelleAnalyse: str(formData.get("resultatObtenuNouvelleAnalyse")),
    dateCloture: date(formData.get("dateCloture")) ?? null,
    evenementSSE: bool(formData.get("evenementSSE")),
  };
}

export async function creerEcartAmiante(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const data = parse(formData);
  const reference = await generateReference("EcartAmiante", "EA");

  const ecartAmiante = await prisma.ecartAmiante.create({
    data: { reference, date: new Date(), ...data },
  });

  redirect(`/ecart-amiante/${ecartAmiante.id}`);
}

export async function mettreAJourEcartAmiante(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const data = parse(formData);

  await prisma.ecartAmiante.update({
    where: { id },
    data: { ...data, modifiePar: nomAuteur(session), modifieLe: new Date() },
  });
  revalidatePath(`/ecart-amiante/${id}`);
  revalidatePath("/ecart-amiante");
}

export async function mettreAJourStatutEcartAmiante(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const statut = lireStatutDossierEcart(formData.get("statut"));

  // La date de clôture est aussi saisissable dans la fiche : on la pré-remplit
  // à la clôture seulement si elle est vide, pour ne pas écraser une date
  // corrigée à la main. Rouvrir l'écart la remet à vide.
  const actuel = await prisma.ecartAmiante.findUniqueOrThrow({
    where: { id },
    select: { dateCloture: true },
  });
  const dateCloture =
    statut === "CLOTURE" ? (actuel.dateCloture ?? new Date()) : null;

  await prisma.ecartAmiante.update({ where: { id }, data: { statut, dateCloture } });
  revalidatePath(`/ecart-amiante/${id}`);
  revalidatePath("/ecart-amiante");
}

export async function creerFicheSSEDepuisAmiante(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const ecartAmianteId = String(formData.get("ecartAmianteId"));
  const ecartAmiante = await prisma.ecartAmiante.findUniqueOrThrow({ where: { id: ecartAmianteId } });

  const reference = await generateReference("FicheSSE", "EV");
  const fiche = await prisma.ficheSSE.create({
    data: {
      reference,
      ecartAmianteId,
      statutFiche: "BROUILLON",
      nomChantier: ecartAmiante.nomChantier,
      lieuZone: ecartAmiante.zone,
      personnesImpliquees: ecartAmiante.personneConcernee,
      descriptionFactuelle: ecartAmiante.description,
      dateHeure: new Date(),
    },
  });

  revalidatePath(`/ecart-amiante/${ecartAmianteId}`);
  redirect(`/fiches-sse/${fiche.id}`);
}

export async function supprimerEcartAmiante(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  await supprimerEcartAmianteCascade(id);

  revalidatePath("/ecart-amiante");
  redirect("/ecart-amiante");
}
