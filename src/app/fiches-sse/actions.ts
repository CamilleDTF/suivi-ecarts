"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { auth } from "@/auth";
import { marquerFicheSSECreee } from "@/app/ecarts/actions";

const str = (v: FormDataEntryValue | null) => (v ? String(v) : undefined);
const bool = (v: FormDataEntryValue | null) => v === "on";
const datetime = (v: FormDataEntryValue | null) => (v ? new Date(String(v)) : undefined);
const date = (v: FormDataEntryValue | null) => (v ? new Date(String(v)) : undefined);

function parseFiche(formData: FormData) {
  return {
    ecartId: str(formData.get("ecartId")),
    typeEvenement: str(formData.get("typeEvenement")),
    numeroInterne: str(formData.get("numeroInterne")),
    emetteur: str(formData.get("emetteur")),
    nomChantier: str(formData.get("nomChantier")),
    dateHeure: datetime(formData.get("dateHeure")),
    lieuZone: str(formData.get("lieuZone")),
    personnesImpliquees: str(formData.get("personnesImpliquees")),
    temoins: str(formData.get("temoins")),
    descriptionFactuelle: str(formData.get("descriptionFactuelle")),
    mesuresImmediatesPrises: str(formData.get("mesuresImmediatesPrises")),
    gravite: str(formData.get("gravite")),
    frequence: str(formData.get("frequence")),
    criticite: str(formData.get("criticite")),
    declarationExterneNecessaire: bool(formData.get("declarationExterneNecessaire")),
    declarationExterneA: str(formData.get("declarationExterneA")),
    typeAnalyse: str(formData.get("typeAnalyse")),
    domaine: str(formData.get("domaine")),
    theme: str(formData.get("theme")),
    referencePreuve: str(formData.get("referencePreuve")),
    miseAJourNecessaire: str(formData.get("miseAJourNecessaire")),
    procedureLaquelle: str(formData.get("procedureLaquelle")),
    referenceDUERP: str(formData.get("referenceDUERP")),
    nouveauRisqueNecessaire: bool(formData.get("nouveauRisqueNecessaire")),
    referenceNouveauRisque: str(formData.get("referenceNouveauRisque")),
    communicationInterne: bool(formData.get("communicationInterne")),
    typeCommunication: str(formData.get("typeCommunication")),
    toutesActionsCloturees: bool(formData.get("toutesActionsCloturees")),
    validationNom: str(formData.get("validationNom")),
    validationFonction: str(formData.get("validationFonction")),
    validationDate: date(formData.get("validationDate")),
  };
}

type CauseLocale = {
  id: string;
  libelle: string;
  parentId: string | null;
  estCauseRacine: boolean;
};

async function creerCausesDepuisJson(ficheSSEId: string, causesJson: string | undefined) {
  if (!causesJson) return;
  const causes: CauseLocale[] = JSON.parse(causesJson);
  if (causes.length === 0) return;

  const restantes = [...causes];
  const creees = new Set<string>();
  while (restantes.length > 0) {
    const pretes = restantes.filter((c) => !c.parentId || creees.has(c.parentId));
    if (pretes.length === 0) break;
    await prisma.causeArbre.createMany({
      data: pretes.map((c) => ({
        id: c.id,
        ficheSSEId,
        libelle: c.libelle,
        parentId: c.parentId,
        estCauseRacine: c.estCauseRacine,
      })),
    });
    for (const c of pretes) {
      creees.add(c.id);
      restantes.splice(restantes.indexOf(c), 1);
    }
  }
}

export async function creerFicheSSE(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const { ecartId, ...data } = parseFiche(formData);
  const reference = await generateReference("FicheSSE", "EV");

  const fiche = await prisma.ficheSSE.create({
    data: { reference, ecartId, ...data },
  });

  await creerCausesDepuisJson(fiche.id, str(formData.get("causesJson")));

  if (ecartId) {
    await marquerFicheSSECreee(ecartId);
    revalidatePath(`/ecarts/${ecartId}`);
  }

  redirect(`/fiches-sse/${fiche.id}`);
}

export async function mettreAJourFicheSSE(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const parsed = parseFiche(formData);
  delete parsed.ecartId;

  const fiche = await prisma.ficheSSE.update({ where: { id }, data: parsed });

  revalidatePath(`/fiches-sse/${id}`);
  if (fiche.ecartId) revalidatePath(`/ecarts/${fiche.ecartId}`);
}

export async function ajouterCause(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const ficheSSEId = String(formData.get("ficheSSEId"));
  const libelle = String(formData.get("libelle") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "") || undefined;
  const estCauseRacine = formData.get("estCauseRacine") === "on";

  if (!libelle) return;

  await prisma.causeArbre.create({
    data: { ficheSSEId, libelle, parentId, estCauseRacine },
  });

  revalidatePath(`/fiches-sse/${ficheSSEId}`);
}

export async function supprimerCause(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const ficheSSEId = String(formData.get("ficheSSEId"));

  // Détache d'abord les enfants éventuels (sinon la contrainte de clé
  // étrangère parentId empêcherait la suppression), puis supprime la cause.
  await prisma.causeArbre.updateMany({ where: { parentId: id }, data: { parentId: null } });
  await prisma.causeArbre.delete({ where: { id } });

  revalidatePath(`/fiches-sse/${ficheSSEId}`);
}

export async function finaliserFicheSSE(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const fiche = await prisma.ficheSSE.update({
    where: { id },
    data: { statutFiche: "FINALISEE" },
  });

  revalidatePath(`/fiches-sse/${id}`);
  if (fiche.ecartId) revalidatePath(`/ecarts/${fiche.ecartId}`);
}
