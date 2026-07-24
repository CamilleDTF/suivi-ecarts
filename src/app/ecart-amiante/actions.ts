"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { auth } from "@/auth";
import { StatutDossierEcart } from "@/generated/prisma/enums";
import { nomAuteur } from "@/lib/audit";
import { supprimerEcartAmianteCascade } from "@/lib/suppression";

const bool = (v: FormDataEntryValue | null) => v === "on" || v === "true";
const str = (v: FormDataEntryValue | null) => (v ? String(v) : undefined);
const date = (v: FormDataEntryValue | null) => (v ? new Date(String(v)) : undefined);

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
    resultatAttendu: str(formData.get("resultatAttendu")),
    resultatObtenu: str(formData.get("resultatObtenu")),
    description: str(formData.get("description")),
    expositionAccidentelle: bool(formData.get("expositionAccidentelle")),
    personneConcernee: str(formData.get("personneConcernee")),
    fie: bool(formData.get("fie")),
    medecinTravail: str(formData.get("medecinTravail")),
    besoinNouvelleAnalyse: bool(formData.get("besoinNouvelleAnalyse")),
    pasNouvelleAnalyse: str(formData.get("pasNouvelleAnalyse")),
    dateNouvelleAnalyse: date(formData.get("dateNouvelleAnalyse")),
    laboratoireNouvelleAnalyse: str(formData.get("laboratoireNouvelleAnalyse")),
    chantierNouvelleAnalyse: str(formData.get("chantierNouvelleAnalyse")),
    resultatAttenduNouvelleAnalyse: str(formData.get("resultatAttenduNouvelleAnalyse")),
    resultatObtenuNouvelleAnalyse: str(formData.get("resultatObtenuNouvelleAnalyse")),
    actionCloture: str(formData.get("actionCloture")),
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
  const statut = String(formData.get("statut")) as StatutDossierEcart;

  await prisma.ecartAmiante.update({
    where: { id },
    data: { statut, dateCloture: statut === "CLOTURE" ? new Date() : null },
  });
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
