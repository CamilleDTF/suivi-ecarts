"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { auth } from "@/auth";
import { marquerFicheSSECreee } from "@/app/ecarts/actions";
import { aUneActionOuverte } from "@/lib/statut-auto";
import { nomAuteur } from "@/lib/audit";
import { supprimerFicheSSECascade } from "@/lib/suppression";

const str = (v: FormDataEntryValue | null) => (v ? String(v) : undefined);
const bool = (v: FormDataEntryValue | null) => v === "on";
const datetime = (v: FormDataEntryValue | null) => (v ? new Date(String(v)) : undefined);
const date = (v: FormDataEntryValue | null) => (v ? new Date(String(v)) : undefined);
const liste = (formData: FormData, name: string) => formData.getAll(name).map(String);

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
    domaine: liste(formData, "domaine"),
    theme: liste(formData, "theme"),
    referencePreuve: str(formData.get("referencePreuve")),
    miseAJourNecessaire: liste(formData, "miseAJourNecessaire"),
    procedureLaquelle: str(formData.get("procedureLaquelle")),
    referenceDUERP: str(formData.get("referenceDUERP")),
    miseAJourAutrePrecision: str(formData.get("miseAJourAutrePrecision")),
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
    data: { reference, ecartId, ...data, numeroInterne: reference },
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

  const fiche = await prisma.ficheSSE.update({
    where: { id },
    data: { ...parsed, modifiePar: nomAuteur(session), modifieLe: new Date() },
  });

  revalidatePath(`/fiches-sse/${id}`);
  if (fiche.ecartId) revalidatePath(`/ecarts/${fiche.ecartId}`);
}

export async function ajouterCause(ficheSSEId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const libelle = String(formData.get("libelle") ?? "").trim();
  const parentId = String(formData.get("parentId") ?? "") || undefined;
  const estCauseRacine = formData.get("estCauseRacine") === "on";

  if (!libelle) return;

  await prisma.causeArbre.create({
    data: { ficheSSEId, libelle, parentId, estCauseRacine },
  });

  revalidatePath(`/fiches-sse/${ficheSSEId}`);
}

export async function supprimerCause(causeId: string, ficheSSEId: string) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  // Détache d'abord les enfants éventuels (sinon la contrainte de clé
  // étrangère parentId empêcherait la suppression), puis supprime la cause.
  await prisma.causeArbre.updateMany({ where: { parentId: causeId }, data: { parentId: null } });
  await prisma.causeArbre.delete({ where: { id: causeId } });

  revalidatePath(`/fiches-sse/${ficheSSEId}`);
}

export async function finaliserFicheSSE(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const actions = await prisma.action.findMany({ where: { ficheSSEId: id }, select: { statut: true } });
  const statutFiche = aUneActionOuverte(actions) ? "EN_COURS" : "FINALISEE";

  const fiche = await prisma.ficheSSE.update({
    where: { id },
    data: { statutFiche },
  });

  revalidatePath(`/fiches-sse/${id}`);
  if (fiche.ecartId) revalidatePath(`/ecarts/${fiche.ecartId}`);
}

export async function supprimerFicheSSE(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const fiche = await prisma.ficheSSE.findUniqueOrThrow({
    where: { id },
    select: { ecartId: true, ecartAmianteId: true },
  });

  await supprimerFicheSSECascade(id);

  revalidatePath("/fiches-sse");
  if (fiche.ecartId) revalidatePath(`/ecarts/${fiche.ecartId}`);
  if (fiche.ecartAmianteId) revalidatePath(`/ecart-amiante/${fiche.ecartAmianteId}`);

  if (fiche.ecartId) redirect(`/ecarts/${fiche.ecartId}`);
  if (fiche.ecartAmianteId) redirect(`/ecart-amiante/${fiche.ecartAmianteId}`);
  redirect("/fiches-sse");
}
