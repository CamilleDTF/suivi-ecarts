"use server";

import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { generateReference } from "@/lib/reference";
import { auth } from "@/auth";
import { OrigineREX, NatureREX, StatutREX } from "@/generated/prisma/enums";
import { nomAuteur } from "@/lib/audit";
import { dateFacultative } from "@/lib/validation";
import { NATURES_REX_REQUERANT_ACTION, NATURES_REX_REQUERANT_DESCRIPTION } from "@/lib/labels";

// Parcours de création du REX : trois façons d'y arriver, qui ne demandent
// pas les mêmes champs. "unique" rattache un seul élément, de l'un des quatre
// types ; "recurrents" en rattache plusieurs, de types mêlés (écarts, évènements
// SSE, écarts amiante, remontées) ; "spontane" ne rattache rien du tout
// (origine SPONTANE).
type Sources = { ecartIds: string[]; ficheSSEIds: string[]; ecartAmianteIds: string[]; remonteeIds: string[] };
const nbSources = (v: Sources) => v.ecartIds.length + v.ficheSSEIds.length + v.ecartAmianteIds.length + v.remonteeIds.length;

const rexWizardSchema = z
  .object({
    mode: z.enum(["unique", "recurrents", "spontane"]),
    ecartIds: z.array(z.string()).default([]),
    ficheSSEIds: z.array(z.string()).default([]),
    ecartAmianteIds: z.array(z.string()).default([]),
    remonteeIds: z.array(z.string()).default([]),

    titre: z.string().min(1, "Titre requis"),
    sousTypeSSE: z.string().optional(),
    enseignementsTires: z.string().min(1, "Enseignement principal requis"),
    raisonDiffusion: z.string().optional(),
    pointsCommuns: z.array(z.string()).default([]),
    causeRacine: z.string().optional(),

    nature: z.enum(Object.values(NatureREX) as [string, ...string[]]),
    // La bonne pratique elle-même (BONNE_PRATIQUE) ou la pratique observée
    // (PRATIQUE_A_EVITER) : indépendant de actionsPreventives ci-dessous, qui
    // pour PRATIQUE_A_EVITER porte la mesure pour l'éviter, pas la pratique.
    pratiqueDescription: z.string().optional(),
    themes: z.array(z.string()).min(1, "Au moins un thème requis"),
    destinatairesRoles: z.array(z.string()).min(1, "Au moins un destinataire requis"),
    canaux: z.array(z.string()).min(1, "Au moins un canal de diffusion requis"),
    modaliteDiffusion: z.enum(["immediate", "planifiee", "action"]),
    dateDiffusionPlanifiee: dateFacultative,
    actionResponsable: z.string().optional(),
    actionEcheance: dateFacultative,

    // Actions préventives exigées par la nature du REX (cf.
    // NATURES_REX_REQUERANT_ACTION) : distinctes de actionResponsable /
    // actionEcheance ci-dessus, qui ne concernent que la modalité "créer une
    // action associée" (diffuser le REX lui-même).
    actionsPreventives: z
      .array(
        z.object({
          action: z.string().min(1),
          responsable: z.string().min(1),
          echeance: z.string().optional(),
        }),
      )
      .default([]),

    noteInterne: z.string().optional(),
    publier: z.boolean(),
  })
  .refine(
    (v) => {
      const nb = nbSources(v);
      if (v.mode === "spontane") return nb === 0;
      if (v.mode === "recurrents") return nb >= 1;
      // mode "unique" : exactement un élément, quel que soit son type.
      return nb === 1;
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
  })
  // Une nature "à corriger" (pratique à éviter, évolution méthode/doc, action
  // à mettre en œuvre) sans aucune action préventive ne serait qu'une
  // étiquette décorative : on exige donc au moins une action pour ces trois
  // natures. "Bonne pratique à généraliser" reste de la pure capitalisation,
  // sans action requise.
  .refine((v) => !NATURES_REX_REQUERANT_ACTION.includes(v.nature) || v.actionsPreventives.length > 0, {
    message: "Au moins une action préventive requise pour cette nature de REX",
    path: ["actionsPreventives"],
  })
  // "Bonne pratique à généraliser" et "Pratique à éviter" se décrivent
  // elles-mêmes : sans ce texte, la nature resterait une étiquette vide.
  .refine((v) => !NATURES_REX_REQUERANT_DESCRIPTION.includes(v.nature) || !!v.pratiqueDescription?.trim(), {
    message: "Description de la pratique requise pour cette nature de REX",
    path: ["pratiqueDescription"],
  });

export type RexWizardInput = z.infer<typeof rexWizardSchema>;

function deduireOrigine(v: Sources & { mode: string }): OrigineREX {
  if (v.mode === "spontane") return "SPONTANE";
  const types: OrigineREX[] = [
    ...(v.ecartIds.length > 0 ? (["ECART_TERRAIN"] as const) : []),
    ...(v.ficheSSEIds.length > 0 ? (["EVENEMENT_SSE"] as const) : []),
    ...(v.ecartAmianteIds.length > 0 ? (["ECART_AMIANTE"] as const) : []),
    ...(v.remonteeIds.length > 0 ? (["REMONTEE"] as const) : []),
  ];
  return types.length === 1 ? types[0] : "PLUSIEURS_SOURCES";
}

function cheminsParents(p: Sources) {
  return [
    ...p.ecartIds.map((id) => `/ecarts/${id}`),
    ...p.ficheSSEIds.map((id) => `/fiches-sse/${id}`),
    ...p.ecartAmianteIds.map((id) => `/ecart-amiante/${id}`),
    ...p.remonteeIds.map((id) => `/remontees/${id}`),
  ];
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
      pratiqueDescription: parsed.pratiqueDescription,
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
      fichesSSE: { connect: parsed.ficheSSEIds.map((id) => ({ id })) },
      ecartsAmiante: { connect: parsed.ecartAmianteIds.map((id) => ({ id })) },
      remontees: { connect: parsed.remonteeIds.map((id) => ({ id })) },
    },
  });

  // Actions préventives exigées par la nature du REX (cf. le refine plus
  // haut) : indépendantes du statut brouillon/publié, puisqu'elles décrivent
  // ce qu'il y a à corriger, pas la diffusion elle-même. Ce sont des actions
  // du plan d'action, rattachées au REX.
  const actionsACreer = [
    ...parsed.actionsPreventives,
    // "Créer une action associée" : la diffusion elle-même devient une action
    // du plan d'action, suivie comme les autres.
    ...(parsed.publier && parsed.modaliteDiffusion === "action" && parsed.actionResponsable
      ? [
          {
            action: `Diffuser ${reference} — ${parsed.titre}`,
            responsable: parsed.actionResponsable,
            echeance: parsed.actionEcheance,
          },
        ]
      : []),
  ];
  // Une par une : chaque référence ACT-… vient du compteur atomique.
  for (const a of actionsACreer) {
    await prisma.action.create({
      data: {
        reference: await generateReference("Action", "ACT"),
        rexId: rex.id,
        type: "PREVENTIVE",
        action: a.action,
        responsable: a.responsable,
        echeance: a.echeance ? new Date(a.echeance) : undefined,
      },
    });
  }

  for (const chemin of cheminsParents(parsed)) revalidatePath(chemin);
  revalidatePath("/rex");
  revalidatePath("/plan-action");
  revalidatePath("/synthese");
  redirect(`/rex/${rex.id}`);
}

const rexEditSchema = z.object({
  titre: z.string().min(1, "Titre requis"),
  sousTypeSSE: z.string().optional(),
  nature: z.enum(Object.values(NatureREX) as [string, ...string[]]),
  pratiqueDescription: z.string().optional(),
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
    pratiqueDescription: formData.get("pratiqueDescription") || undefined,
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
      pratiqueDescription: parsed.pratiqueDescription ?? null,
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
      fichesSSE: { select: { id: true } },
      ecartsAmiante: { select: { id: true } },
      remontees: { select: { id: true } },
    },
  });

  // Les actions du REX disparaissent avec lui, comme celles d'un évènement
  // avec l'évènement : sans quoi elles resteraient au plan d'action sans parent.
  await prisma.$transaction([
    prisma.action.deleteMany({ where: { rexId: id } }),
    prisma.rex.delete({ where: { id } }),
  ]);

  const chemins = cheminsParents({
    ecartIds: avant.ecarts.map((e) => e.id),
    ficheSSEIds: avant.fichesSSE.map((e) => e.id),
    ecartAmianteIds: avant.ecartsAmiante.map((e) => e.id),
    remonteeIds: avant.remontees.map((e) => e.id),
  });
  for (const chemin of chemins) revalidatePath(chemin);
  revalidatePath("/rex");
  revalidatePath("/plan-action");
  revalidatePath("/synthese");
  redirect("/rex");
}
