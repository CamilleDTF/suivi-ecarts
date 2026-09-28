"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { auth } from "@/auth";
import { OrigineREX, NatureREX, StatutREX, StatutAction } from "@/generated/prisma/enums";
import { nomAuteur } from "@/lib/audit";
import { dateFacultative } from "@/lib/validation";

// Parcours de création du REX : trois façons d'y arriver, qui ne demandent
// pas les mêmes champs. "unique" reprend le rattachement polymorphe classique
// (comme Action) ; "recurrents" ne rattache que des écarts, plusieurs à la
// fois ; "spontane" ne rattache rien du tout (origine SPONTANE).
const rexWizardSchema = z
  .object({
    mode: z.enum(["unique", "recurrents", "spontane"]),
    ecartIds: z.array(z.string()).default([]),
    ficheSSEId: z.string().optional(),
    ecartAmianteId: z.string().optional(),
    remonteeId: z.string().optional(),

    titre: z.string().min(1, "Titre requis"),
    sousTypeSSE: z.string().optional(),
    enseignementsTires: z.string().min(1, "Enseignement principal requis"),
    raisonDiffusion: z.string().optional(),
    pointsCommuns: z.array(z.string()).default([]),
    causeRacine: z.string().optional(),

    nature: z.enum(Object.values(NatureREX) as [string, ...string[]]),
    themes: z.array(z.string()).min(1, "Au moins un thème requis"),
    destinatairesRoles: z.array(z.string()).min(1, "Au moins un destinataire requis"),
    canaux: z.array(z.string()).min(1, "Au moins un canal de diffusion requis"),
    modaliteDiffusion: z.enum(["immediate", "planifiee", "action"]),
    dateDiffusionPlanifiee: dateFacultative,
    actionResponsable: z.string().optional(),
    actionEcheance: dateFacultative,

    noteInterne: z.string().optional(),
    publier: z.boolean(),
  })
  .refine(
    (v) => {
      if (v.mode === "spontane") {
        return v.ecartIds.length === 0 && !v.ficheSSEId && !v.ecartAmianteId && !v.remonteeId;
      }
      if (v.mode === "recurrents") {
        return v.ecartIds.length > 0 && !v.ficheSSEId && !v.ecartAmianteId && !v.remonteeId;
      }
      // mode "unique" : exactement un des quatre rattachements, un seul écart
      // s'il s'agit d'un écart.
      return (
        [v.ecartIds.length > 0, !!v.ficheSSEId, !!v.ecartAmianteId, !!v.remonteeId].filter(Boolean)
          .length === 1 && v.ecartIds.length <= 1
      );
    },
    { message: "Sélection des éléments source incohérente avec le mode choisi" },
  )
  // "Pourquoi ce REX mérite diffusion" et "Points communs observés" n'ont de
  // sens que pour comparer plusieurs éléments source entre eux.
  .refine((v) => v.mode !== "recurrents" || !!v.raisonDiffusion, {
    message: "Justification de la diffusion requise",
    path: ["raisonDiffusion"],
  })
  .refine((v) => v.mode !== "recurrents" || v.pointsCommuns.length > 0, {
    message: "Au moins un point commun observé requis",
    path: ["pointsCommuns"],
  })
  .refine((v) => v.modaliteDiffusion !== "planifiee" || !!v.dateDiffusionPlanifiee, {
    message: "Date de diffusion planifiée requise",
    path: ["dateDiffusionPlanifiee"],
  })
  .refine((v) => v.modaliteDiffusion !== "action" || !!v.actionResponsable, {
    message: "Responsable de l'action de diffusion requis",
    path: ["actionResponsable"],
  });

export type RexWizardInput = z.infer<typeof rexWizardSchema>;

function deduireOrigine(v: { mode: string; ecartIds: string[]; ficheSSEId?: string; ecartAmianteId?: string }): OrigineREX {
  if (v.mode === "spontane") return "SPONTANE";
  if (v.ecartIds.length > 0) return "ECART_TERRAIN";
  if (v.ficheSSEId) return "EVENEMENT_SSE";
  if (v.ecartAmianteId) return "ECART_AMIANTE";
  return "REMONTEE";
}

function cheminsParents(p: { ecartIds: string[]; ficheSSEId?: string | null; ecartAmianteId?: string | null; remonteeId?: string | null }) {
  return [
    ...p.ecartIds.map((id) => `/ecarts/${id}`),
    p.ficheSSEId && `/fiches-sse/${p.ficheSSEId}`,
    p.ecartAmianteId && `/ecart-amiante/${p.ecartAmianteId}`,
    p.remonteeId && `/remontees/${p.remonteeId}`,
  ].filter((c): c is string => !!c);
}

export async function creerRex(input: RexWizardInput) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const parsed = rexWizardSchema.parse(input);
  const origine = deduireOrigine(parsed);
  const reference = await generateReference("Rex", "REX");

  // Brouillon : on enregistre l'intention (date planifiée éventuelle) mais on
  // n'applique aucun effet de diffusion tant que le REX n'est pas publié.
  const maintenant = new Date();
  const diffusionImmediate = parsed.publier && parsed.modaliteDiffusion === "immediate";

  const rex = await prisma.rex.create({
    data: {
      reference,
      titre: parsed.titre,
      origine,
      sousTypeSSE: origine === "EVENEMENT_SSE" ? parsed.sousTypeSSE : undefined,
      nature: parsed.nature as NatureREX,
      causeRacine: parsed.causeRacine,
      pointsCommuns: parsed.mode === "recurrents" ? parsed.pointsCommuns : [],
      enseignementsTires: parsed.enseignementsTires,
      raisonDiffusion: parsed.raisonDiffusion,
      themes: parsed.themes,
      destinatairesRoles: parsed.destinatairesRoles,
      canaux: parsed.canaux,
      noteInterne: parsed.noteInterne,
      brouillon: !parsed.publier,
      statut: diffusionImmediate ? "DIFFUSE" : "REDIGE",
      dateDiffusion: diffusionImmediate ? maintenant : undefined,
      dateDiffusionPlanifiee:
        parsed.publier && parsed.modaliteDiffusion === "planifiee" && parsed.dateDiffusionPlanifiee
          ? new Date(parsed.dateDiffusionPlanifiee)
          : undefined,
      ecarts: { connect: parsed.ecartIds.map((id) => ({ id })) },
      ficheSSEId: parsed.ficheSSEId,
      ecartAmianteId: parsed.ecartAmianteId,
      remonteeId: parsed.remonteeId,
    },
  });

  // "Créer une action associée" : la diffusion elle-même devient une action
  // préventive du REX, suivie comme les autres actions préventives.
  if (parsed.publier && parsed.modaliteDiffusion === "action" && parsed.actionResponsable) {
    await prisma.actionRex.create({
      data: {
        rexId: rex.id,
        action: `Diffuser le REX ${reference} — ${parsed.titre}`,
        responsable: parsed.actionResponsable,
        echeance: parsed.actionEcheance ? new Date(parsed.actionEcheance) : undefined,
      },
    });
  }

  for (const chemin of cheminsParents(parsed)) revalidatePath(chemin);
  revalidatePath("/rex");
  revalidatePath("/synthese");
  redirect(`/rex/${rex.id}`);
}

const rexEditSchema = z.object({
  titre: z.string().min(1, "Titre requis"),
  sousTypeSSE: z.string().optional(),
  nature: z.enum(Object.values(NatureREX) as [string, ...string[]]),
  causeRacine: z.string().optional(),
  enseignementsTires: z.string().optional(),
  raisonDiffusion: z.string().optional(),
  pointsCommuns: z.array(z.string()).default([]),
  themes: z.array(z.string()).default([]),
  destinatairesRoles: z.array(z.string()).default([]),
  canaux: z.array(z.string()).default([]),
  noteInterne: z.string().optional(),
});

export async function mettreAJourRex(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const parsed = rexEditSchema.parse({
    titre: formData.get("titre"),
    sousTypeSSE: formData.get("sousTypeSSE") || undefined,
    nature: formData.get("nature"),
    causeRacine: formData.get("causeRacine") || undefined,
    enseignementsTires: formData.get("enseignementsTires") || undefined,
    raisonDiffusion: formData.get("raisonDiffusion") || undefined,
    pointsCommuns: formData.getAll("pointsCommuns").map(String),
    themes: formData.getAll("themes").map(String),
    destinatairesRoles: formData.getAll("destinatairesRoles").map(String),
    canaux: formData.getAll("canaux").map(String),
    noteInterne: formData.get("noteInterne") || undefined,
  });

  await prisma.rex.update({
    where: { id },
    data: {
      titre: parsed.titre,
      sousTypeSSE: parsed.sousTypeSSE ?? null,
      nature: parsed.nature as NatureREX,
      causeRacine: parsed.causeRacine ?? null,
      enseignementsTires: parsed.enseignementsTires ?? null,
      raisonDiffusion: parsed.raisonDiffusion ?? null,
      pointsCommuns: parsed.pointsCommuns,
      themes: parsed.themes,
      destinatairesRoles: parsed.destinatairesRoles,
      canaux: parsed.canaux,
      noteInterne: parsed.noteInterne ?? null,
      modifiePar: nomAuteur(session),
      modifieLe: new Date(),
    },
  });

  revalidatePath(`/rex/${id}`);
  revalidatePath("/rex");
}

export async function changerStatutRex(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const statut = z.enum(Object.values(StatutREX) as [string, ...string[]]).parse(formData.get("statut")) as StatutREX;

  const actuel = await prisma.rex.findUniqueOrThrow({
    where: { id },
    select: { dateDiffusion: true, dateVerificationEfficacite: true },
  });

  await prisma.rex.update({
    where: { id },
    data: {
      statut,
      // La date se pose la première fois qu'on atteint l'étape, jamais
      // écrasée par un aller-retour du stepper.
      dateDiffusion: statut !== "REDIGE" && !actuel.dateDiffusion ? new Date() : undefined,
      dateVerificationEfficacite:
        statut === "EFFICACITE_VERIFIEE" && !actuel.dateVerificationEfficacite ? new Date() : undefined,
      modifiePar: nomAuteur(session),
      modifieLe: new Date(),
    },
  });

  revalidatePath(`/rex/${id}`);
  revalidatePath("/rex");
}

// Publication d'un brouillon : diffusion immédiate par défaut, comme le
// bouton "Enregistrer et publier" du parcours de création.
export async function publierRex(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const actuel = await prisma.rex.findUniqueOrThrow({ where: { id }, select: { dateDiffusion: true } });

  await prisma.rex.update({
    where: { id },
    data: {
      brouillon: false,
      statut: "DIFFUSE",
      dateDiffusion: actuel.dateDiffusion ?? new Date(),
      modifiePar: nomAuteur(session),
      modifieLe: new Date(),
    },
  });

  revalidatePath(`/rex/${id}`);
  revalidatePath("/rex");
  revalidatePath("/synthese");
}

export async function supprimerRex(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const avant = await prisma.rex.findUniqueOrThrow({
    where: { id },
    select: {
      ecarts: { select: { id: true } },
      ficheSSEId: true,
      ecartAmianteId: true,
      remonteeId: true,
    },
  });

  await prisma.$transaction([
    prisma.actionRex.deleteMany({ where: { rexId: id } }),
    prisma.rex.delete({ where: { id } }),
  ]);

  for (const chemin of cheminsParents({ ecartIds: avant.ecarts.map((e) => e.id), ...avant })) {
    revalidatePath(chemin);
  }
  revalidatePath("/rex");
  revalidatePath("/synthese");
  redirect("/rex");
}

// Actions préventives du REX.

const actionRexSchema = z.object({
  action: z.string().min(1, "Description requise"),
  responsable: z.string().min(1, "Responsable requis"),
  echeance: z.string().optional(),
});

export async function creerActionRex(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const rexId = String(formData.get("rexId"));
  const parsed = actionRexSchema.parse({
    action: formData.get("action"),
    responsable: formData.get("responsable"),
    echeance: formData.get("echeance") || undefined,
  });

  await prisma.actionRex.create({
    data: {
      rexId,
      action: parsed.action,
      responsable: parsed.responsable,
      echeance: parsed.echeance ? new Date(parsed.echeance) : undefined,
    },
  });

  revalidatePath(`/rex/${rexId}`);
}

export async function mettreAJourStatutActionRex(formData: FormData) {
  const session = await auth();
  if (!session?.user) redirect("/connexion");

  const id = String(formData.get("id"));
  const rexId = String(formData.get("rexId"));
  const statut = z.enum(Object.values(StatutAction) as [string, ...string[]]).parse(formData.get("statut")) as StatutAction;

  await prisma.actionRex.update({
    where: { id },
    data: {
      statut,
      // Une action marquée réalisée sans date déjà posée se voit attribuer
      // celle du jour : la date de réalisation vaut déclaration, comme sur le
      // plan d'action.
      realiseeLe: statut === "REALISEE" ? new Date() : undefined,
    },
  });

  revalidatePath(`/rex/${rexId}`);
}
