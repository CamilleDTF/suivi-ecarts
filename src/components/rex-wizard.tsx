"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode, ComponentType } from "react";
import { useRouter } from "next/navigation";
import { creerRex } from "@/app/rex/actions";
import type { NatureREX } from "@/generated/prisma/enums";
import { AvertissementNonEnregistre } from "@/components/avertissement-non-enregistre";
import { BoutonRetour } from "@/components/bouton-retour";
import { buttonVariants } from "@/components/ui/button";
import {
  IconAlertTriangle,
  IconFileText,
  IconThumbsUp,
  IconBan,
  IconSettings,
  IconSend,
  IconClock,
  IconLink,
  IconCheck,
  IconLightbulb,
} from "@/components/icons";
import {
  NATURE_REX_LABELS,
  NATURE_REX_DESCRIPTIONS,
  NATURE_REX_COLORS,
  THEMES_REX_OPTIONS,
  DESTINATAIRES_ROLES_REX_OPTIONS,
  CANAUX_DIFFUSION_REX_OPTIONS,
  avecValeursExistantes,
  POINTS_COMMUNS_REX_OPTIONS,
  SOUS_TYPE_SSE_REX_OPTIONS,
  RESPONSABLES,
  ACTION_A_DEFINIR,
  RESPONSABLE_A_DEFINIR,
  NATURES_REX_REQUERANT_ACTION,
  NATURES_REX_REQUERANT_DESCRIPTION,
} from "@/lib/labels";

type Mode = "unique" | "recurrents" | "spontane";
type TypeUnique = "ecart" | "evenement" | "amiante" | "remontee";
type ModaliteDiffusion = "immediate" | "planifiee" | "action";

export type SourceOption = {
  id: string;
  reference: string;
  /** Libellé complet, pour les listes déroulantes du mode « un seul élément ». */
  libelle: string;
  /** Description seule, pour le tableau des éléments récurrents (la référence et le chantier ont leur colonne). */
  intitule: string;
  date: string | null;
  chantier: string | null;
};

/** Un élément récurrent, repéré par son type et son identifiant : « ecart:ID », « evenement:ID »… */
type Source = SourceOption & { type: TypeUnique; cle: string };

const TYPES_SOURCE: Record<TypeUnique, { label: string; classe: string }> = {
  ecart: { label: "Écart", classe: "bg-orange-100 text-orange-800" },
  evenement: { label: "Évènement SSE", classe: "bg-blue-100 text-blue-800" },
  amiante: { label: "Écart amiante", classe: "bg-teal-100 text-teal-800" },
  remontee: { label: "Remontée", classe: "bg-violet-100 text-violet-800" },
};

export type ParentImpose = {
  type: TypeUnique;
  id: string;
  libelle: string;
};

/** Valeurs de départ, quand le REX naît d'une proposition de l'outil de propositions. */
export type DepartRex = {
  mode?: "unique" | "recurrents";
  /** Éléments pré-sélectionnés, de tous types : « type:id ». */
  elements?: string[];
  titre?: string;
  raisonDiffusion?: string;
  pointsCommuns?: string[];
  themes?: string[];
  noteInterne?: string;
};

const NATURE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  BONNE_PRATIQUE: IconThumbsUp,
  PRATIQUE_A_EVITER: IconBan,
  EVOLUTION_METHODE: IconSettings,
};

const NATURE_ICON_BG: Record<string, string> = {
  BONNE_PRATIQUE: "bg-green-100 text-green-700",
  PRATIQUE_A_EVITER: "bg-red-100 text-red-700",
  EVOLUTION_METHODE: "bg-amber-100 text-amber-700",
};

const inputCls =
  "w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
const labelCls = "mb-1.5 block text-sm font-medium";

const ETAPES = [
  { titre: "Sélection des éléments sources", detail: "Choisissez les écarts / évènements" },
  { titre: "Synthèse / enseignement", detail: "Renseignez l'analyse" },
  { titre: "Type de REX et diffusion", detail: "Définissez le type et les destinataires" },
  { titre: "Validation", detail: "Vérifiez et enregistrez" },
];

function CaseACocher({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-foreground">
      <input type="checkbox" className="accent-primary" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function toggleValeur(liste: string[], valeur: string): string[] {
  return liste.includes(valeur) ? liste.filter((v) => v !== valeur) : [...liste, valeur];
}

export function RexWizard({
  ecarts,
  evenements,
  amiantes,
  remontees,
  parentImpose,
  depart,
}: {
  ecarts: SourceOption[];
  evenements: SourceOption[];
  amiantes: SourceOption[];
  remontees: SourceOption[];
  parentImpose?: ParentImpose | null;
  depart?: DepartRex | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<Mode>(depart?.mode ?? "unique");

  // Étape 1 — sélection des sources.
  const [typeUnique, setTypeUnique] = useState<TypeUnique>(parentImpose?.type ?? "ecart");
  const [ecartUniqueId, setEcartUniqueId] = useState(parentImpose?.type === "ecart" ? parentImpose.id : "");
  const [evenementId, setEvenementId] = useState(parentImpose?.type === "evenement" ? parentImpose.id : "");
  const [amianteId, setAmianteId] = useState(parentImpose?.type === "amiante" ? parentImpose.id : "");
  const [remonteeId, setRemonteeId] = useState(parentImpose?.type === "remontee" ? parentImpose.id : "");
  const [elementsRecurrents, setElementsRecurrents] = useState<string[]>(depart?.elements ?? []);
  const [filtreSources, setFiltreSources] = useState("");
  const [filtreType, setFiltreType] = useState<TypeUnique | "tous">("tous");

  // Étape 2 — synthèse.
  const [titre, setTitre] = useState(depart?.titre ?? "");
  const [sousTypeSSE, setSousTypeSSE] = useState("");
  const [enseignementPrincipal, setEnseignementPrincipal] = useState("");
  const [raisonDiffusion, setRaisonDiffusion] = useState(depart?.raisonDiffusion ?? "");
  const [pointsCommuns, setPointsCommuns] = useState<string[]>(depart?.pointsCommuns ?? []);
  const [causeRacine, setCauseRacine] = useState("");

  // Étape 3 — type et diffusion.
  const [nature, setNature] = useState<NatureREX | "">("");
  // La bonne pratique elle-même (BONNE_PRATIQUE) ou la pratique observée
  // (PRATIQUE_A_EVITER) — indépendant de l'action éventuellement requise.
  const [pratiqueDescription, setPratiqueDescription] = useState("");
  const [themes, setThemes] = useState<string[]>(depart?.themes ?? []);
  const [destinatairesRoles, setDestinatairesRoles] = useState<string[]>([]);
  const [canaux, setCanaux] = useState<string[]>([]);
  // Un destinataire ou un canal absent des listes : saisi à la main, il rejoint la sélection.
  const [autreDestinataire, setAutreDestinataire] = useState("");
  const [autreCanal, setAutreCanal] = useState("");
  const [modalite, setModalite] = useState<ModaliteDiffusion>("immediate");
  const [dateDiffusionPlanifiee, setDateDiffusionPlanifiee] = useState("");
  const [actionResponsable, setActionResponsable] = useState("");
  const [actionEcheance, setActionEcheance] = useState("");

  // Actions préventives exigées par la nature du REX (pratique à éviter,
  // évolution méthode/doc) — distinctes de actionResponsable/actionEcheance
  // ci-dessus, qui ne concernent que la modalité "créer une action associée"
  // pour la diffusion elle-même.
  type ActionPreventiveDraft = { action: string; responsable: string; echeance: string };
  const [actionsPreventives, setActionsPreventives] = useState<ActionPreventiveDraft[]>([]);
  const [nouvelleAction, setNouvelleAction] = useState("");
  const [nouvelleActionResponsable, setNouvelleActionResponsable] = useState("");
  const [nouvelleActionEcheance, setNouvelleActionEcheance] = useState("");
  // Seulement pour la nature "Évolution méthode / doc" : le document ou la
  // méthode concernée par l'évolution décrite.
  const [nouvelleActionRefDoc, setNouvelleActionRefDoc] = useState("");

  // Étape 4 — validation.
  const [noteInterne, setNoteInterne] = useState(depart?.noteInterne ?? "");

  // Éléments récurrents, du plus récent au plus ancien : tous les types sont mêlés dans une seule liste.
  const toutesSources = useMemo<Source[]>(() => {
    const avecType = (liste: SourceOption[], type: TypeUnique): Source[] =>
      liste.map((o) => ({ ...o, type, cle: `${type}:${o.id}` }));
    return [
      ...avecType(ecarts, "ecart"),
      ...avecType(evenements, "evenement"),
      ...avecType(amiantes, "amiante"),
      ...avecType(remontees, "remontee"),
    ].sort((a, b) => (b.date ?? "").localeCompare(a.date ?? ""));
  }, [ecarts, evenements, amiantes, remontees]);
  const sourcesParCle = useMemo(() => new Map(toutesSources.map((o) => [o.cle, o])), [toutesSources]);
  const recurrentsDuType = (type: TypeUnique) =>
    elementsRecurrents.filter((cle) => cle.startsWith(`${type}:`)).map((cle) => cle.slice(type.length + 1));

  const unique = (type: TypeUnique, id: string) => (mode === "unique" && typeUnique === type && id ? [id] : []);
  const ecartIdsFinal = mode === "recurrents" ? recurrentsDuType("ecart") : unique("ecart", ecartUniqueId);
  const ficheSSEIdsFinal = mode === "recurrents" ? recurrentsDuType("evenement") : unique("evenement", evenementId);
  const ecartAmianteIdsFinal = mode === "recurrents" ? recurrentsDuType("amiante") : unique("amiante", amianteId);
  const remonteeIdsFinal = mode === "recurrents" ? recurrentsDuType("remontee") : unique("remontee", remonteeId);

  const sourcesOk =
    mode === "spontane" ||
    (mode === "recurrents" && elementsRecurrents.length > 0) ||
    (mode === "unique" &&
      ((typeUnique === "ecart" && !!ecartUniqueId) ||
        (typeUnique === "evenement" && !!evenementId) ||
        (typeUnique === "amiante" && !!amianteId) ||
        (typeUnique === "remontee" && !!remonteeId)));

  const step2Ok =
    titre.trim().length > 0 &&
    enseignementPrincipal.trim().length > 0 &&
    (mode !== "recurrents" || (raisonDiffusion.trim().length > 0 && pointsCommuns.length > 0));

  const natureRequiertAction = !!nature && NATURES_REX_REQUERANT_ACTION.includes(nature);
  const natureRequiertDescription = !!nature && NATURES_REX_REQUERANT_DESCRIPTION.includes(nature);

  // La bonne pratique elle-même, ou la pratique observée : indépendant de
  // l'action ci-dessous, qui pour "pratique à éviter" porte la mesure pour
  // l'éviter, pas la pratique elle-même.
  const configPratique =
    nature === "BONNE_PRATIQUE"
      ? {
          label: "Bonne pratique",
          aide: "Décrivez la bonne pratique à généraliser, pour qu'elle soit reproductible ailleurs.",
          placeholder: "Ex : Réception contradictoire de chaque niveau d'échafaudage avant utilisation",
        }
      : {
          label: "Pratique observée",
          aide: "Le geste ou la situation tels qu'ils ont été constatés, pour qu'on les reconnaisse et qu'on ne les reproduise pas. L'enseignement à en tirer est celui de l'étape précédente.",
          placeholder: "Ex : Manipulation des plaques amiante par une seule personne",
        };

  // Le vocabulaire et les champs demandés dépendent de ce que la nature
  // décrit réellement : une évolution méthode/doc cite le document concerné,
  // "pratique à éviter" ne demande ici que la mesure pour l'éviter (la
  // pratique elle-même est traitée séparément ci-dessus).
  const configActionPreventive =
    nature === "PRATIQUE_A_EVITER"
      ? {
          titre: "Comment l'éviter",
          aide: "Décrivez la mesure à mettre en place pour éviter que cette pratique se reproduise.",
          labelPrincipal: "Mesure préventive",
          placeholderPrincipal: "Ex : Former les chefs de chantier au contrôle du nombre d'opérateurs autorisés",
          avecRefDoc: false,
        }
      : {
          titre: "Évolution méthode / documentaire",
          aide: "Décrivez l'évolution à apporter et précisez le document ou la méthode concernée.",
          labelPrincipal: "Évolution proposée",
          placeholderPrincipal: "Ex : Ajouter un contrôle de réception par niveau avant utilisation",
          avecRefDoc: true,
        };

  const step3Ok =
    !!nature &&
    themes.length > 0 &&
    destinatairesRoles.length > 0 &&
    canaux.length > 0 &&
    (modalite !== "planifiee" || !!dateDiffusionPlanifiee) &&
    (modalite !== "action" || !!actionResponsable) &&
    (!natureRequiertAction || actionsPreventives.length > 0) &&
    (!natureRequiertDescription || pratiqueDescription.trim().length > 0);

  function ajouterActionPreventive() {
    if (!nouvelleAction.trim() || !nouvelleActionResponsable) return;
    if (configActionPreventive.avecRefDoc && !nouvelleActionRefDoc.trim()) return;
    const texte = configActionPreventive.avecRefDoc
      ? `${nouvelleAction.trim()} — Réf. document / méthode : ${nouvelleActionRefDoc.trim()}`
      : nouvelleAction.trim();
    setActionsPreventives([
      ...actionsPreventives,
      { action: texte, responsable: nouvelleActionResponsable, echeance: nouvelleActionEcheance },
    ]);
    setNouvelleAction("");
    setNouvelleActionResponsable("");
    setNouvelleActionEcheance("");
    setNouvelleActionRefDoc("");
  }
  // Une action exigée mais pas encore décidée : créée sans responsable, à compléter au plan d'action.
  function ajouterActionADefinir() {
    setActionsPreventives([
      ...actionsPreventives,
      { action: ACTION_A_DEFINIR, responsable: nouvelleActionResponsable || RESPONSABLE_A_DEFINIR, echeance: nouvelleActionEcheance },
    ]);
    setNouvelleAction("");
    setNouvelleActionResponsable("");
    setNouvelleActionEcheance("");
    setNouvelleActionRefDoc("");
  }
  function ajouterPersonnalise(
    valeur: string,
    liste: string[],
    changerListe: (l: string[]) => void,
    vider: () => void,
  ) {
    const propre = valeur.trim();
    if (propre && !liste.includes(propre)) changerListe([...liste, propre]);
    vider();
  }
  function retirerActionPreventive(index: number) {
    setActionsPreventives(actionsPreventives.filter((_, i) => i !== index));
  }

  const checklist = [
    {
      label:
        mode === "spontane"
          ? "REX spontané — aucun élément source requis"
          : "Au moins un élément source sélectionné",
      ok: sourcesOk,
    },
    { label: "Enseignement principal renseigné", ok: enseignementPrincipal.trim().length > 0 },
    { label: "Nature du REX choisie", ok: !!nature },
    { label: "Destinataires définis", ok: destinatairesRoles.length > 0 },
    { label: "Canaux de diffusion définis", ok: canaux.length > 0 },
    ...(natureRequiertAction
      ? [{ label: "Au moins une action préventive requise pour cette nature", ok: actionsPreventives.length > 0 }]
      : []),
    ...(natureRequiertDescription
      ? [{ label: configPratique.label + " renseignée", ok: pratiqueDescription.trim().length > 0 }]
      : []),
  ];
  const toutOk = checklist.every((c) => c.ok) && sourcesOk && step2Ok && step3Ok;

  function allerA(n: number) {
    setStep(n);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function soumettre(publier: boolean) {
    setErreur(null);
    startTransition(async () => {
      try {
        await creerRex({
          mode,
          ecartIds: ecartIdsFinal,
          ficheSSEIds: ficheSSEIdsFinal,
          ecartAmianteIds: ecartAmianteIdsFinal,
          remonteeIds: remonteeIdsFinal,
          titre,
          sousTypeSSE: sousTypeSSE || undefined,
          enseignementsTires: enseignementPrincipal,
          raisonDiffusion: raisonDiffusion || undefined,
          pointsCommuns,
          causeRacine: causeRacine || undefined,
          nature: nature as NatureREX,
          pratiqueDescription: pratiqueDescription || undefined,
          themes,
          destinatairesRoles,
          canaux,
          modaliteDiffusion: modalite,
          dateDiffusionPlanifiee: dateDiffusionPlanifiee || undefined,
          actionResponsable: actionResponsable || undefined,
          actionEcheance: actionEcheance || undefined,
          actionsPreventives,
          noteInterne: noteInterne || undefined,
          publier,
        });
      } catch (e) {
        // redirect() lève une erreur spéciale gérée par Next : on ne l'affiche pas.
        if (e && typeof e === "object" && "digest" in e && String((e as { digest?: unknown }).digest).startsWith("NEXT_REDIRECT")) {
          throw e;
        }
        setErreur("Impossible d'enregistrer ce REX. Vérifiez les champs requis (*) de chaque étape.");
      }
    });
  }

  // Les éléments pré-sélectionnés par une proposition passent en tête, une fois pour toutes :
  // l'ordre ne bouge pas quand on coche ou décoche ensuite.
  const departCles = useMemo(() => new Set(depart?.elements ?? []), [depart]);
  const sourcesFiltrees = toutesSources
    .filter((o) => {
      if (filtreType !== "tous" && o.type !== filtreType) return false;
      if (!filtreSources.trim()) return true;
      const q = filtreSources.toLowerCase();
      return (
        o.reference.toLowerCase().includes(q) ||
        o.intitule.toLowerCase().includes(q) ||
        (o.chantier ?? "").toLowerCase().includes(q)
      );
    })
    .sort((a, b) => Number(departCles.has(b.cle)) - Number(departCles.has(a.cle)));
  const resumeSource = (cle: string) => {
    const o = sourcesParCle.get(cle);
    return o ? `${o.reference} — ${o.intitule}` : cle;
  };

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="mx-auto max-w-5xl px-4 py-10 lg:px-8"
    >
      <AvertissementNonEnregistre />

      <BoutonRetour href="/rex" label="Retour aux REX" />
      <h1 className="font-display text-4xl font-semibold tracking-tight">Nouveau REX</h1>
      <p className="mb-8 mt-2 max-w-2xl text-sm text-muted-foreground">
        Créez un retour d&apos;expérience pour capitaliser et partager un enseignement.
      </p>

      {erreur && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</div>
      )}

      {/* Sélecteur de mode — carte complète à l'étape 0, résumé condensé ensuite. */}
      {!parentImpose && step === 0 && (
        <div className="mb-6 rounded-xl border bg-card p-6">
          <h2 className="text-base font-semibold text-foreground">Comment voulez-vous créer ce REX ?</h2>
          <p className="mb-4 text-sm text-muted-foreground">Sélectionnez la situation qui correspond à votre besoin.</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <ModeCard
              actif={mode === "unique"}
              icone={<IconAlertTriangle className="h-5 w-5" />}
              iconeBg="bg-amber-100 text-amber-700"
              titre="À partir d'un écart / événement"
              description="Je veux capitaliser un enseignement à partir d'un cas précis."
              onClick={() => setMode("unique")}
            />
            <ModeCard
              actif={mode === "recurrents"}
              icone={<IconFileText className="h-5 w-5" />}
              iconeBg="bg-blue-100 text-blue-700"
              titre="À partir de plusieurs éléments récurrents"
              description="Je constate une répétition sur plusieurs cas similaires."
              onClick={() => setMode("recurrents")}
            />
            <ModeCard
              actif={mode === "spontane"}
              icone={<IconLightbulb className="h-5 w-5" />}
              iconeBg="bg-purple-100 text-purple-700"
              titre="REX spontané / bonne pratique"
              description="Je veux partager une bonne pratique ou un enseignement hors évènement."
              onClick={() => setMode("spontane")}
            />
          </div>
        </div>
      )}
      {!parentImpose && step > 0 && step < 3 && (
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-xl border bg-card px-4 py-2.5 text-sm">
          <span className="text-muted-foreground">Mode :</span>
          {(
            [
              ["unique", "À partir d'un écart / événement"],
              ["recurrents", "Éléments récurrents"],
              ["spontane", "REX spontané"],
            ] as [Mode, string][]
          ).map(([m, libelle]) => (
            <span
              key={m}
              className={`rounded-full px-3 py-1 text-xs font-medium ${
                mode === m ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
              }`}
            >
              {libelle}
            </span>
          ))}
          <button
            type="button"
            onClick={() => allerA(0)}
            className="ml-auto text-xs font-medium text-primary hover:underline"
          >
            Modifier
          </button>
        </div>
      )}

      {/* Stepper */}
      <div className="mb-6 flex items-center overflow-x-auto rounded-xl border bg-card px-5 py-4">
        {ETAPES.map((e, i) => (
          <div key={e.titre} className="flex items-center">
            <button
              type="button"
              onClick={() => i < step && allerA(i)}
              disabled={i >= step}
              className="flex items-center gap-2 text-left disabled:cursor-default"
            >
              <span
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                  i < step
                    ? "bg-primary text-primary-foreground"
                    : i === step
                      ? "bg-primary text-primary-foreground ring-4 ring-primary/15"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {i < step ? <IconCheck className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="hidden sm:block">
                <span className={`block text-sm font-medium ${i <= step ? "text-foreground" : "text-muted-foreground"}`}>
                  {e.titre}
                </span>
                <span className="block text-xs text-muted-foreground">{e.detail}</span>
              </span>
            </button>
            {i < ETAPES.length - 1 && <span className="mx-3 h-px w-8 shrink-0 bg-border sm:w-12" />}
          </div>
        ))}
      </div>

      {/* Étape 1 : sources */}
      {step === 0 && (
        <div className="space-y-4">
          {parentImpose ? (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-3 text-base font-semibold text-foreground">Élément source</h2>
              <p className="rounded-lg border bg-muted/50 px-3 py-2 text-sm text-foreground">
                {parentImpose.libelle}
              </p>
            </div>
          ) : mode === "spontane" ? (
            <div className="rounded-xl border bg-card p-6 text-sm text-muted-foreground">
              <h2 className="mb-2 text-base font-semibold text-foreground">Aucun élément source nécessaire</h2>
              Un REX spontané ou une bonne pratique se rédige directement, sans écart, évènement ou remontée
              d&apos;origine.
            </div>
          ) : mode === "unique" ? (
            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-3 text-base font-semibold text-foreground">Sélection de l&apos;élément source</h2>
              <div className="mb-3 flex flex-wrap gap-4 text-sm text-foreground">
                {(
                  [
                    ["ecart", "Écart"],
                    ["evenement", "Évènement SSE"],
                    ["amiante", "Écart amiante"],
                    ["remontee", "Remontée"],
                  ] as [TypeUnique, string][]
                ).map(([t, libelle]) => (
                  <label key={t} className="flex items-center gap-1.5">
                    <input type="radio" className="accent-primary" checked={typeUnique === t} onChange={() => setTypeUnique(t)} />
                    {libelle}
                  </label>
                ))}
              </div>
              {typeUnique === "ecart" && (
                <select value={ecartUniqueId} onChange={(e) => setEcartUniqueId(e.target.value)} className={inputCls}>
                  <option value="">Sélectionner un écart</option>
                  {ecarts.map((o) => (
                    <option key={o.id} value={o.id}>{o.libelle}</option>
                  ))}
                </select>
              )}
              {typeUnique === "evenement" && (
                <select value={evenementId} onChange={(e) => setEvenementId(e.target.value)} className={inputCls}>
                  <option value="">Sélectionner un évènement SSE</option>
                  {evenements.map((o) => (
                    <option key={o.id} value={o.id}>{o.libelle}</option>
                  ))}
                </select>
              )}
              {typeUnique === "amiante" && (
                <select value={amianteId} onChange={(e) => setAmianteId(e.target.value)} className={inputCls}>
                  <option value="">Sélectionner un écart amiante</option>
                  {amiantes.map((o) => (
                    <option key={o.id} value={o.id}>{o.libelle}</option>
                  ))}
                </select>
              )}
              {typeUnique === "remontee" && (
                <select value={remonteeId} onChange={(e) => setRemonteeId(e.target.value)} className={inputCls}>
                  <option value="">Sélectionner une remontée</option>
                  {remontees.map((o) => (
                    <option key={o.id} value={o.id}>{o.libelle}</option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="rounded-xl border bg-card p-6">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-foreground">Sélection des éléments sources</h2>
                  <p className="text-sm text-muted-foreground">
                    Cochez les écarts, évènements, écarts amiante ou remontées qui sont à l&apos;origine de ce REX, tous types
                    confondus. Au moins un élément est requis.
                  </p>
                </div>
                <span className="whitespace-nowrap rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                  {elementsRecurrents.length} élément(s) sélectionné(s)
                </span>
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                <input
                  value={filtreSources}
                  onChange={(e) => setFiltreSources(e.target.value)}
                  placeholder="Filtrer par référence, intitulé, chantier…"
                  className={`${inputCls} min-w-0 flex-1 basis-64`}
                />
                <select
                  value={filtreType}
                  onChange={(e) => setFiltreType(e.target.value as TypeUnique | "tous")}
                  aria-label="Type d'élément"
                  className={`${inputCls} w-auto`}
                >
                  <option value="tous">Tous les types</option>
                  {(Object.keys(TYPES_SOURCE) as TypeUnique[]).map((t) => (
                    <option key={t} value={t}>
                      {TYPES_SOURCE[t].label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto rounded-lg border">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-muted/50 text-muted-foreground">
                    <tr>
                      <th className="w-10 px-3 py-2" />
                      <th className="px-3 py-2 font-medium">Référence</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Intitulé</th>
                      <th className="px-3 py-2 font-medium">Date</th>
                      <th className="px-3 py-2 font-medium">Chantier / Site</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourcesFiltrees.map((o) => (
                      <tr
                        key={o.cle}
                        onClick={() => setElementsRecurrents(toggleValeur(elementsRecurrents, o.cle))}
                        className="cursor-pointer border-b last:border-0 hover:bg-muted/50"
                      >
                        <td className="px-3 py-2">
                          <input type="checkbox" className="accent-primary" checked={elementsRecurrents.includes(o.cle)} readOnly />
                        </td>
                        <td className="whitespace-nowrap px-3 py-2 font-medium text-foreground">{o.reference}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${TYPES_SOURCE[o.type].classe}`}>
                            {o.type === "ecart" && <IconAlertTriangle className="h-3 w-3" />} {TYPES_SOURCE[o.type].label}
                          </span>
                        </td>
                        <td className="max-w-xs truncate px-3 py-2 text-foreground">{o.intitule}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                          {o.date ? new Date(o.date).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td className="px-3 py-2 text-foreground">{o.chantier ?? "—"}</td>
                      </tr>
                    ))}
                    {sourcesFiltrees.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                          Aucun élément ne correspond à ce filtre.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Étape 2 : synthèse */}
      {step === 1 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4">
            {!parentImpose && (
              <RecapCard titre="Éléments sources sélectionnés" onModifier={() => allerA(0)}>
                {mode === "spontane" ? (
                  <p className="text-sm text-muted-foreground">Aucun — REX spontané / bonne pratique.</p>
                ) : mode === "recurrents" ? (
                  <ul className="space-y-1 text-sm text-foreground">
                    {elementsRecurrents.map((cle) => (
                      <li key={cle}>{resumeSource(cle)}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-foreground">
                    {typeUnique === "ecart" && ecarts.find((e) => e.id === ecartUniqueId)?.libelle}
                    {typeUnique === "evenement" && evenements.find((e) => e.id === evenementId)?.libelle}
                    {typeUnique === "amiante" && amiantes.find((e) => e.id === amianteId)?.libelle}
                    {typeUnique === "remontee" && remontees.find((e) => e.id === remonteeId)?.libelle}
                  </p>
                )}
              </RecapCard>
            )}

            <div className="rounded-xl border bg-card p-6">
              <h2 className="mb-4 text-base font-semibold text-foreground">Synthèse / enseignement</h2>

              <div className="mb-4">
                <label className={labelCls}>Titre du REX *</label>
                <input value={titre} onChange={(e) => setTitre(e.target.value)} required className={inputCls} />
              </div>

              {mode === "unique" && typeUnique === "evenement" && (
                <div className="mb-4">
                  <label className={labelCls}>Sous-type évènement SSE</label>
                  <select value={sousTypeSSE} onChange={(e) => setSousTypeSSE(e.target.value)} className={inputCls}>
                    <option value="">—</option>
                    {SOUS_TYPE_SSE_REX_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="mb-4">
                <label className={labelCls}>Enseignement principal *</label>
                <textarea
                  value={enseignementPrincipal}
                  onChange={(e) => setEnseignementPrincipal(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Ex : Le contrôle du balisage doit être réalisé avant démarrage, y compris sur les chantiers courts."
                  className={inputCls}
                />
                <p className="mt-1 text-right text-xs text-muted-foreground">{enseignementPrincipal.length}/500</p>
              </div>

              {mode === "recurrents" && (
                <>
                  <div className="mb-4">
                    <label className={labelCls}>Pourquoi ce REX mérite diffusion ? *</label>
                    <textarea
                      value={raisonDiffusion}
                      onChange={(e) => setRaisonDiffusion(e.target.value)}
                      rows={3}
                      maxLength={500}
                      placeholder="Ex : Ce type d'écart se répète sur plusieurs chantiers et expose à des risques importants pour les intervenants et le public."
                      className={inputCls}
                    />
                    <p className="mt-1 text-right text-xs text-muted-foreground">{raisonDiffusion.length}/500</p>
                  </div>

                  <fieldset className="mb-4">
                    <legend className={labelCls}>
                      Points communs observés *
                      <span className="ml-2 font-normal text-muted-foreground">
                        Sélectionnez les facteurs récurrents identifiés dans les éléments sources.
                      </span>
                    </legend>
                    <div className="flex flex-wrap gap-x-4 gap-y-2">
                      {POINTS_COMMUNS_REX_OPTIONS.map((p) => (
                        <CaseACocher
                          key={p}
                          label={p}
                          checked={pointsCommuns.includes(p)}
                          onChange={() => setPointsCommuns(toggleValeur(pointsCommuns, p))}
                        />
                      ))}
                    </div>
                  </fieldset>

                  <div>
                    <label className={labelCls}>Facteurs communs identifiés (optionnel)</label>
                    <textarea
                      value={causeRacine}
                      onChange={(e) => setCauseRacine(e.target.value)}
                      rows={2}
                      placeholder="Précisez d'autres facteurs récurrents observés dans les différents cas (organisation, matériel, environnement, méthode…)."
                      className={inputCls}
                    />
                  </div>
                </>
              )}

              {mode === "unique" && (
                <div>
                  <label className={labelCls}>Cause racine (optionnel)</label>
                  <textarea value={causeRacine} onChange={(e) => setCauseRacine(e.target.value)} rows={2} className={inputCls} />
                </div>
              )}
            </div>
          </div>

          <div className="h-fit rounded-xl border border-primary/20 bg-primary/5 p-5">
            <div className="mb-3 flex items-center gap-2 text-foreground">
              <IconLightbulb className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Aide à la rédaction</h3>
            </div>
            <p className="mb-3 text-xs text-muted-foreground">Quelques conseils pour une synthèse efficace.</p>
            <ol className="space-y-3 text-sm text-foreground">
              <li><span className="font-semibold">1. Soyez synthétique</span><br /><span className="text-xs text-muted-foreground">Allez à l&apos;essentiel : quel est l&apos;enseignement clé ?</span></li>
              <li><span className="font-semibold">2. Appuyez-vous sur les faits</span><br /><span className="text-xs text-muted-foreground">Basez votre analyse sur les éléments observés dans les cas sélectionnés.</span></li>
              <li><span className="font-semibold">3. Expliquez la valeur ajoutée</span><br /><span className="text-xs text-muted-foreground">Précisez pourquoi ce REX est utile et doit être diffusé à d&apos;autres équipes.</span></li>
              <li><span className="font-semibold">4. Identifiez les facteurs récurrents</span><br /><span className="text-xs text-muted-foreground">Ciblez les causes profondes ou les conditions qui se répètent.</span></li>
              <li><span className="font-semibold">5. Restez factuel et opérationnel</span><br /><span className="text-xs text-muted-foreground">Formulez des enseignements concrets et applicables sur le terrain.</span></li>
            </ol>
          </div>
        </div>
      )}

      {/* Étape 3 : type et diffusion */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RecapCard titre="Éléments sources" onModifier={() => allerA(0)} compact>
              <p className="text-sm text-muted-foreground">
                {mode === "spontane" && "Aucun — REX spontané"}
                {mode === "recurrents" && `${elementsRecurrents.length} élément(s) sélectionné(s)`}
                {mode === "unique" && "1 élément sélectionné"}
              </p>
            </RecapCard>
            <RecapCard titre="Enseignement principal" onModifier={() => allerA(1)} compact>
              <p className="line-clamp-2 text-sm text-muted-foreground">{enseignementPrincipal || "—"}</p>
            </RecapCard>
          </div>

          <div className="rounded-xl border bg-card p-6">
            <h2 className="mb-3 text-base font-semibold text-foreground">Type de REX et diffusion</h2>

            <fieldset className="mb-5">
              <legend className="mb-2 text-sm font-medium text-foreground">Nature du REX *</legend>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {Object.entries(NATURE_REX_LABELS).map(([valeur, libelle]) => {
                  const Icone = NATURE_ICONS[valeur];
                  return (
                    <button
                      type="button"
                      key={valeur}
                      onClick={() => {
                        const val = valeur as NatureREX;
                        setNature(val);
                        // "Créer une action associée" ne se distingue plus de
                        // l'action préventive désormais exigée par cette
                        // nature : on retombe sur une modalité valide plutôt
                        // que de laisser une carte masquée mais sélectionnée.
                        if (NATURES_REX_REQUERANT_ACTION.includes(val) && modalite === "action") {
                          setModalite("immediate");
                        }
                      }}
                      className={`rounded-xl border p-4 text-left transition ${
                        nature === valeur ? "border-primary ring-2 ring-primary/15" : "hover:border-primary/40"
                      }`}
                    >
                      <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-full ${NATURE_ICON_BG[valeur]}`}>
                        <Icone className="h-4.5 w-4.5" />
                      </span>
                      <p className="text-sm font-semibold text-foreground">{libelle}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{NATURE_REX_DESCRIPTIONS[valeur]}</p>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {natureRequiertDescription && (
              <fieldset className="mb-5 rounded-lg border bg-muted/50 p-4">
                <legend className="mb-1 px-1 text-sm font-medium text-foreground">{configPratique.label} *</legend>
                <p className="mb-3 text-xs text-muted-foreground">{configPratique.aide}</p>
                <textarea
                  value={pratiqueDescription}
                  onChange={(e) => setPratiqueDescription(e.target.value)}
                  rows={2}
                  placeholder={configPratique.placeholder}
                  className={inputCls}
                />
              </fieldset>
            )}

            {natureRequiertAction && (
              <fieldset className="mb-5 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                <legend className="mb-1 px-1 text-sm font-medium text-amber-900">{configActionPreventive.titre} *</legend>
                <p className="mb-3 text-xs text-amber-800/80">{configActionPreventive.aide}</p>

                {actionsPreventives.length > 0 && (
                  <ul className="mb-3 space-y-2">
                    {actionsPreventives.map((a, i) => (
                      <li
                        key={i}
                        className="flex items-start justify-between gap-3 rounded-lg border border-amber-200 bg-card px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="text-foreground">{a.action}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.responsable}
                            {a.echeance && ` · échéance ${new Date(a.echeance).toLocaleDateString("fr-FR")}`}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => retirerActionPreventive(i)}
                          className="shrink-0 text-xs font-medium text-red-600 hover:underline"
                        >
                          Retirer
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="space-y-2">
                  <input
                    value={nouvelleAction}
                    onChange={(e) => setNouvelleAction(e.target.value)}
                    placeholder={configActionPreventive.placeholderPrincipal}
                    className={inputCls}
                  />
                  {configActionPreventive.avecRefDoc && (
                    <input
                      value={nouvelleActionRefDoc}
                      onChange={(e) => setNouvelleActionRefDoc(e.target.value)}
                      placeholder="Document ou méthode concerné (ex : PRA chantier amiante v3)"
                      className={inputCls}
                    />
                  )}
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]">
                    <select
                      value={nouvelleActionResponsable}
                      onChange={(e) => setNouvelleActionResponsable(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Responsable</option>
                      {RESPONSABLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                    <input
                      type="date"
                      value={nouvelleActionEcheance}
                      onChange={(e) => setNouvelleActionEcheance(e.target.value)}
                      className={inputCls}
                    />
                    <button
                      type="button"
                      onClick={ajouterActionPreventive}
                      disabled={
                        !nouvelleAction.trim() ||
                        !nouvelleActionResponsable ||
                        (configActionPreventive.avecRefDoc && !nouvelleActionRefDoc.trim())
                      }
                      className={buttonVariants({ size: "lg" })}
                    >
                      Ajouter
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={ajouterActionADefinir}
                      disabled={nouvelleAction.trim().length > 0}
                      className={buttonVariants({ variant: "outline", size: "lg" })}
                    >
                      {ACTION_A_DEFINIR}
                    </button>
                    <p className="text-xs text-muted-foreground">
                      Pas encore décidé ? L&apos;action est créée sans responsable et reste à compléter au plan d&apos;action.
                    </p>
                  </div>
                </div>
              </fieldset>
            )}

            <fieldset className="mb-5">
              <legend className="mb-2 text-sm font-medium text-foreground">Thèmes concernés *</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {THEMES_REX_OPTIONS.map((t) => (
                  <CaseACocher key={t} label={t} checked={themes.includes(t)} onChange={() => setThemes(toggleValeur(themes, t))} />
                ))}
              </div>
            </fieldset>

            <div className="mb-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-foreground">Qui doit recevoir ce REX ? *</legend>
                <div className="flex flex-col gap-2">
                  {avecValeursExistantes(DESTINATAIRES_ROLES_REX_OPTIONS, destinatairesRoles).map((d) => (
                    <CaseACocher
                      key={d}
                      label={d}
                      checked={destinatairesRoles.includes(d)}
                      onChange={() => setDestinatairesRoles(toggleValeur(destinatairesRoles, d))}
                    />
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={autreDestinataire}
                    onChange={(e) => setAutreDestinataire(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      ajouterPersonnalise(autreDestinataire, destinatairesRoles, setDestinatairesRoles, () => setAutreDestinataire(""));
                    }}
                    placeholder="Autre destinataire…"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    disabled={!autreDestinataire.trim()}
                    onClick={() => ajouterPersonnalise(autreDestinataire, destinatairesRoles, setDestinatairesRoles, () => setAutreDestinataire(""))}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Ajouter
                  </button>
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-foreground">Canaux de diffusion *</legend>
                <div className="flex flex-col gap-2">
                  {avecValeursExistantes(CANAUX_DIFFUSION_REX_OPTIONS, canaux).map((c) => (
                    <CaseACocher
                      key={c}
                      label={c}
                      checked={canaux.includes(c)}
                      onChange={() => setCanaux(toggleValeur(canaux, c))}
                    />
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    value={autreCanal}
                    onChange={(e) => setAutreCanal(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key !== "Enter") return;
                      e.preventDefault();
                      ajouterPersonnalise(autreCanal, canaux, setCanaux, () => setAutreCanal(""));
                    }}
                    placeholder="Autre canal…"
                    className={inputCls}
                  />
                  <button
                    type="button"
                    disabled={!autreCanal.trim()}
                    onClick={() => ajouterPersonnalise(autreCanal, canaux, setCanaux, () => setAutreCanal(""))}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Ajouter
                  </button>
                </div>
              </fieldset>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-foreground">Quand diffuser ?</legend>
              <div className={`grid grid-cols-1 gap-3 ${natureRequiertAction ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                <ModaliteCard
                  actif={modalite === "immediate"}
                  icone={<IconSend className="h-4 w-4" />}
                  titre="À diffuser dès validation"
                  description="Le REX est publié, prêt à être diffusé. Vous le marquerez « Diffusé » une fois la diffusion faite."
                  onClick={() => setModalite("immediate")}
                />
                <ModaliteCard
                  actif={modalite === "planifiee"}
                  icone={<IconClock className="h-4 w-4" />}
                  titre="Planifier la diffusion"
                  description="Choisissez la date prévue."
                  onClick={() => setModalite("planifiee")}
                />
                {/* Redondant quand la nature exige déjà une action préventive
                    (ci-dessus) : pas besoin d'une seconde action distincte
                    pour la seule diffusion. */}
                {!natureRequiertAction && (
                  <ModaliteCard
                    actif={modalite === "action"}
                    icone={<IconLink className="h-4 w-4" />}
                    titre="Créer une action associée"
                    description="Ce REX sera lié à une action dans le plan d'actions."
                    onClick={() => setModalite("action")}
                  />
                )}
              </div>

              {modalite === "planifiee" && (
                <div className="mt-3 max-w-xs">
                  <label className={labelCls}>Date de diffusion planifiée *</label>
                  <input
                    type="date"
                    value={dateDiffusionPlanifiee}
                    onChange={(e) => setDateDiffusionPlanifiee(e.target.value)}
                    className={inputCls}
                  />
                </div>
              )}
              {modalite === "action" && (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 sm:max-w-md">
                  <div>
                    <label className={labelCls}>Responsable *</label>
                    <select
                      value={actionResponsable}
                      onChange={(e) => setActionResponsable(e.target.value)}
                      className={inputCls}
                    >
                      <option value="">Sélectionner</option>
                      {RESPONSABLES.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Échéance</label>
                    <input
                      type="date"
                      value={actionEcheance}
                      onChange={(e) => setActionEcheance(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </div>
              )}
            </fieldset>
          </div>
        </div>
      )}

      {/* Étape 4 : validation */}
      {step === 3 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.6fr_1fr]">
          <div className="space-y-4">
            <RecapCard titre="Éléments sources" onModifier={() => allerA(0)}>
              {mode === "spontane" ? (
                <p className="text-sm text-muted-foreground">Aucun — REX spontané / bonne pratique.</p>
              ) : mode === "recurrents" ? (
                <ul className="space-y-1 text-sm text-foreground">
                  {elementsRecurrents.map((cle) => (
                    <li key={cle}>{resumeSource(cle)}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-foreground">
                  {typeUnique === "ecart" && ecarts.find((e) => e.id === ecartUniqueId)?.libelle}
                  {typeUnique === "evenement" && evenements.find((e) => e.id === evenementId)?.libelle}
                  {typeUnique === "amiante" && amiantes.find((e) => e.id === amianteId)?.libelle}
                  {typeUnique === "remontee" && remontees.find((e) => e.id === remonteeId)?.libelle}
                </p>
              )}
            </RecapCard>

            <RecapCard titre="Synthèse / enseignement" onModifier={() => allerA(1)}>
              <p className="mb-2 text-sm font-medium text-foreground">{titre}</p>
              <p className="text-sm text-muted-foreground">{enseignementPrincipal}</p>
            </RecapCard>

            <RecapCard titre="Type de REX et diffusion" onModifier={() => allerA(2)}>
              <div className="mb-2 flex flex-wrap gap-2">
                {nature && (
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${NATURE_REX_COLORS[nature]}`}>
                    {NATURE_REX_LABELS[nature]}
                  </span>
                )}
                {themes.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">{t}</span>
                ))}
              </div>
              {natureRequiertDescription && pratiqueDescription && (
                <p className="mb-2 text-sm text-muted-foreground">{pratiqueDescription}</p>
              )}
              {natureRequiertAction && actionsPreventives.length > 0 && (
                <ul className="mb-2 space-y-1">
                  {actionsPreventives.map((a, i) => (
                    <li key={i} className="text-sm text-muted-foreground">
                      • {a.action} — {a.responsable}
                      {a.echeance && ` (éch. ${new Date(a.echeance).toLocaleDateString("fr-FR")})`}
                    </li>
                  ))}
                </ul>
              )}
              <div className="mb-2 flex flex-wrap gap-1.5">
                {destinatairesRoles.map((d) => (
                  <span key={d} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">{d}</span>
                ))}
                {canaux.map((c) => (
                  <span key={c} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{c}</span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                {modalite === "immediate" && "À diffuser dès validation."}
                {modalite === "planifiee" &&
                  (dateDiffusionPlanifiee
                    ? `Diffusion prévue le ${new Date(dateDiffusionPlanifiee).toLocaleDateString("fr-FR")}.`
                    : "Diffusion planifiée.")}
                {modalite === "action" && `Diffusion liée à une action associée${actionResponsable ? ` (${actionResponsable})` : ""}.`}
              </p>
            </RecapCard>

            <div className="rounded-xl border bg-card p-6">
              <label className={labelCls}>Commentaire interne / note QHSE (optionnel)</label>
              <textarea
                value={noteInterne}
                onChange={(e) => setNoteInterne(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Ajoutez une note ou un commentaire destiné uniquement à l'équipe QHSE…"
                className={inputCls}
              />
              <p className="mt-1 text-right text-xs text-muted-foreground">{noteInterne.length}/500</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Aperçu du REX</h3>
              {nature && (
                <span className={`mb-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${NATURE_REX_COLORS[nature]}`}>
                  {NATURE_REX_LABELS[nature]}
                </span>
              )}
              <p className="mb-1 font-semibold text-foreground">{titre || "—"}</p>
              <p className="mb-3 line-clamp-3 text-sm text-muted-foreground">{enseignementPrincipal || "—"}</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {themes.map((t) => (
                  <span key={t} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{t}</span>
                ))}
              </div>
              <p className="mb-3 text-xs text-muted-foreground">
                {mode === "recurrents"
                  ? `${elementsRecurrents.length} élément(s) sources`
                  : mode === "unique"
                    ? "1 élément source"
                    : "REX spontané"}
              </p>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Diffusion prévue</p>
              <div className="flex flex-wrap gap-1.5">
                {destinatairesRoles.map((d) => (
                  <span key={d} className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs text-primary">{d}</span>
                ))}
                {canaux.map((c) => (
                  <span key={c} className="rounded-full bg-muted px-2.5 py-0.5 text-xs text-muted-foreground">{c}</span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border bg-card p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">Checklist de validation</h3>
              <ul className="space-y-2">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-sm">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        c.ok ? "bg-green-100 text-green-700" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      <IconCheck className="h-3 w-3" />
                    </span>
                    <span className={c.ok ? "text-foreground" : "text-muted-foreground"}>{c.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="mt-6 flex items-center justify-between">
        <button
          type="button"
          onClick={() => (step === 0 ? router.push("/rex") : allerA(step - 1))}
          className={buttonVariants({ variant: "outline", size: "lg" })}
        >
          {step === 0 ? "Annuler" : "Retour"}
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={() => allerA(step + 1)}
            disabled={(step === 0 && !sourcesOk) || (step === 1 && !step2Ok) || (step === 2 && !step3Ok)}
            className={buttonVariants({ size: "lg" })}
          >
            {step === 2 ? "Continuer vers la validation" : "Suivant →"}
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending || !sourcesOk || !step2Ok}
              onClick={() => soumettre(false)}
              className={buttonVariants({ variant: "outline", size: "lg" })}
            >
              Enregistrer en brouillon
            </button>
            <button
              type="submit"
              disabled={isPending || !toutOk}
              onClick={() => soumettre(true)}
              className={buttonVariants({ size: "lg" })}
            >
              {isPending ? "Enregistrement…" : "Enregistrer et publier le REX"}
            </button>
          </div>
        )}
      </div>
    </form>
  );
}

function ModeCard({
  actif,
  icone,
  iconeBg,
  titre,
  description,
  onClick,
}: {
  actif: boolean;
  icone: ReactNode;
  iconeBg: string;
  titre: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-3 rounded-xl border p-4 text-left transition ${
        actif ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "hover:border-primary/40"
      }`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconeBg}`}>{icone}</span>
      <span>
        <span className="block text-sm font-semibold text-foreground">{titre}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

function ModaliteCard({
  actif,
  icone,
  titre,
  description,
  onClick,
}: {
  actif: boolean;
  icone: ReactNode;
  titre: string;
  description: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-start gap-2.5 rounded-xl border p-3.5 text-left transition ${
        actif ? "border-primary bg-primary/5 ring-2 ring-primary/15" : "hover:border-primary/40"
      }`}
    >
      <span className="mt-0.5 text-muted-foreground">{icone}</span>
      <span>
        <span className="block text-sm font-medium text-foreground">{titre}</span>
        <span className="block text-xs text-muted-foreground">{description}</span>
      </span>
    </button>
  );
}

function RecapCard({
  titre,
  onModifier,
  compact,
  children,
}: {
  titre: string;
  onModifier: () => void;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={`rounded-xl border bg-card ${compact ? "p-4" : "p-5"}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{titre}</h3>
        <button type="button" onClick={onModifier} className="text-xs font-medium text-primary hover:underline">
          Modifier
        </button>
      </div>
      {children}
    </div>
  );
}
