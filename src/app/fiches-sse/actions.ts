"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { auth } from "@/auth";
import { marquerFicheSSECreee } from "@/app/ecarts/actions";

const ficheSchema = z.object({
  ecartId: z.string().optional(),
  emetteur: z.string().optional(),
  nomChantier: z.string().optional(),
  dateHeure: z.string().optional(),
  lieuZone: z.string().optional(),
  personnesImpliquees: z.string().optional(),
  temoins: z.string().optional(),
  descriptionFactuelle: z.string().optional(),
  mesuresImmediatesPrises: z.string().optional(),
  gravite: z.string().optional(),
  frequence: z.string().optional(),
  criticite: z.string().optional(),
});

function parseFiche(formData: FormData) {
  return ficheSchema.parse({
    ecartId: formData.get("ecartId") || undefined,
    emetteur: formData.get("emetteur") || undefined,
    nomChantier: formData.get("nomChantier") || undefined,
    dateHeure: formData.get("dateHeure") || undefined,
    lieuZone: formData.get("lieuZone") || undefined,
    personnesImpliquees: formData.get("personnesImpliquees") || undefined,
    temoins: formData.get("temoins") || undefined,
    descriptionFactuelle: formData.get("descriptionFactuelle") || undefined,
    mesuresImmediatesPrises: formData.get("mesuresImmediatesPrises") || undefined,
    gravite: formData.get("gravite") || undefined,
    frequence: formData.get("frequence") || undefined,
    criticite: formData.get("criticite") || undefined,
  });
}

export async function creerFicheSSE(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const parsed = parseFiche(formData);
  const reference = await generateReference("FicheSSE", "EV");

  const fiche = await prisma.ficheSSE.create({
    data: {
      reference,
      ecartId: parsed.ecartId || undefined,
      emetteur: parsed.emetteur,
      nomChantier: parsed.nomChantier,
      dateHeure: parsed.dateHeure ? new Date(parsed.dateHeure) : undefined,
      lieuZone: parsed.lieuZone,
      personnesImpliquees: parsed.personnesImpliquees,
      temoins: parsed.temoins,
      descriptionFactuelle: parsed.descriptionFactuelle,
      mesuresImmediatesPrises: parsed.mesuresImmediatesPrises,
      gravite: parsed.gravite,
      frequence: parsed.frequence,
      criticite: parsed.criticite,
    },
  });

  if (parsed.ecartId) {
    await marquerFicheSSECreee(parsed.ecartId);
    revalidatePath(`/ecarts/${parsed.ecartId}`);
  }

  redirect(`/fiches-sse/${fiche.id}`);
}

export async function mettreAJourFicheSSE(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const parsed = parseFiche(formData);

  const fiche = await prisma.ficheSSE.update({
    where: { id },
    data: {
      emetteur: parsed.emetteur,
      nomChantier: parsed.nomChantier,
      dateHeure: parsed.dateHeure ? new Date(parsed.dateHeure) : undefined,
      lieuZone: parsed.lieuZone,
      personnesImpliquees: parsed.personnesImpliquees,
      temoins: parsed.temoins,
      descriptionFactuelle: parsed.descriptionFactuelle,
      mesuresImmediatesPrises: parsed.mesuresImmediatesPrises,
      gravite: parsed.gravite,
      frequence: parsed.frequence,
      criticite: parsed.criticite,
    },
  });

  revalidatePath(`/fiches-sse/${id}`);
  if (fiche.ecartId) revalidatePath(`/ecarts/${fiche.ecartId}`);
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
