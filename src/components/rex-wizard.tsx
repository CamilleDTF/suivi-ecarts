"use client";

import { useMemo, useState, useTransition } from "react";
import type { ReactNode, ComponentType } from "react";
import { useRouter } from "next/navigation";
import { creerRex } from "@/app/rex/actions";
import type { NatureREX } from "@/generated/prisma/enums";
import { AvertissementNonEnregistre } from "@/components/avertissement-non-enregistre";
import { BoutonRetour } from "@/components/bouton-retour";
import {
  IconAlertTriangle,
  IconFileText,
  IconThumbsUp,
  IconBan,
  IconSettings,
  IconClipboard,
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
  POINTS_COMMUNS_REX_OPTIONS,
  SOUS_TYPE_SSE_REX_OPTIONS,
  RESPONSABLES,
  NATURES_REX_REQUERANT_ACTION,
} from "@/lib/labels";

type Mode = "unique" | "recurrents" | "spontane";
type TypeUnique = "ecart" | "evenement" | "amiante" | "remontee";
type ModaliteDiffusion = "immediate" | "planifiee" | "action";

export type SourceOption = {
  id: string;
  reference: string;
  libelle: string;
  date: string | null;
  chantier: string | null;
};

export type ParentImpose = {
  type: TypeUnique;
  id: string;
  libelle: string;
};

const NATURE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  BONNE_PRATIQUE: IconThumbsUp,
  PRATIQUE_A_EVITER: IconBan,
  EVOLUTION_METHODE: IconSettings,
  ACTION_A_METTRE_EN_OEUVRE: IconClipboard,
};

const NATURE_ICON_BG: Record<string, string> = {
  BONNE_PRATIQUE: "bg-green-100 text-green-700",
  PRATIQUE_A_EVITER: "bg-red-100 text-red-700",
  EVOLUTION_METHODE: "bg-amber-100 text-amber-700",
  ACTION_A_METTRE_EN_OEUVRE: "bg-purple-100 text-purple-700",
};

const inputCls = "w-full rounded-md border border-slate-300 px-3 py-2 text-sm";
const labelCls = "mb-1 block text-sm font-medium text-slate-700";

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
    <label className="flex items-center gap-2 text-sm text-slate-700">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
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
}: {
  ecarts: SourceOption[];
  evenements: SourceOption[];
  amiantes: SourceOption[];
  remontees: SourceOption[];
  parentImpose?: ParentImpose | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<Mode>("unique");

  // Étape 1 — sélection des sources.
  const [typeUnique, setTypeUnique] = useState<TypeUnique>(parentImpose?.type ?? "ecart");
  const [ecartUniqueId, setEcartUniqueId] = useState(parentImpose?.type === "ecart" ? parentImpose.id : "");
  const [evenementId, setEvenementId] = useState(parentImpose?.type === "evenement" ? parentImpose.id : "");
  const [amianteId, setAmianteId] = useState(parentImpose?.type === "amiante" ? parentImpose.id : "");
  const [remonteeId, setRemonteeId] = useState(parentImpose?.type === "remontee" ? parentImpose.id : "");
  const [ecartsRecurrents, setEcartsRecurrents] = useState<string[]>([]);
  const [filtreEcarts, setFiltreEcarts] = useState("");

  // Étape 2 — synthèse.
  const [titre, setTitre] = useState("");
  const [sousTypeSSE, setSousTypeSSE] = useState("");
  const [enseignementPrincipal, setEnseignementPrincipal] = useState("");
  const [raisonDiffusion, setRaisonDiffusion] = useState("");
  const [pointsCommuns, setPointsCommuns] = useState<string[]>([]);
  const [causeRacine, setCauseRacine] = useState("");

  // Étape 3 — type et diffusion.
  const [nature, setNature] = useState<NatureREX | "">("");
  const [themes, setThemes] = useState<string[]>([]);
  const [destinatairesRoles, setDestinatairesRoles] = useState<string[]>([]);
  const [canaux, setCanaux] = useState<string[]>([]);
  const [modalite, setModalite] = useState<ModaliteDiffusion>("immediate");
  const [dateDiffusionPlanifiee, setDateDiffusionPlanifiee] = useState("");
  const [actionResponsable, setActionResponsable] = useState("");
  const [actionEcheance, setActionEcheance] = useState("");

  // Actions préventives exigées par la nature du REX (pratique à éviter,
  // évolution méthode/doc, action à mettre en œuvre) — distinctes de
  // actionResponsable/actionEcheance ci-dessus, qui ne concernent que la
  // modalité "créer une action associée" pour la diffusion elle-même.
  type ActionPreventiveDraft = { action: string; responsable: string; echeance: string };
  const [actionsPreventives, setActionsPreventives] = useState<ActionPreventiveDraft[]>([]);
  const [nouvelleAction, setNouvelleAction] = useState("");
  const [nouvelleActionResponsable, setNouvelleActionResponsable] = useState("");
  const [nouvelleActionEcheance, setNouvelleActionEcheance] = useState("");

  // Étape 4 — validation.
  const [noteInterne, setNoteInterne] = useState("");

  const ecartIdsFinal = mode === "recurrents" ? ecartsRecurrents : mode === "unique" && typeUnique === "ecart" ? (ecartUniqueId ? [ecartUniqueId] : []) : [];
  const ficheSSEIdFinal = mode === "unique" && typeUnique === "evenement" ? evenementId : "";
  const ecartAmianteIdFinal = mode === "unique" && typeUnique === "amiante" ? amianteId : "";
  const remonteeIdFinal = mode === "unique" && typeUnique === "remontee" ? remonteeId : "";

  const ecartsParId = useMemo(() => new Map(ecarts.map((e) => [e.id, e])), [ecarts]);

  const sourcesOk =
    mode === "spontane" ||
    (mode === "recurrents" && ecartsRecurrents.length > 0) ||
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

  const step3Ok =
    !!nature &&
    themes.length > 0 &&
    destinatairesRoles.length > 0 &&
    canaux.length > 0 &&
    (modalite !== "planifiee" || !!dateDiffusionPlanifiee) &&
    (modalite !== "action" || !!actionResponsable) &&
    (!natureRequiertAction || actionsPreventives.length > 0);

  function ajouterActionPreventive() {
    if (!nouvelleAction.trim() || !nouvelleActionResponsable) return;
    setActionsPreventives([
      ...actionsPreventives,
      { action: nouvelleAction.trim(), responsable: nouvelleActionResponsable, echeance: nouvelleActionEcheance },
    ]);
    setNouvelleAction("");
    setNouvelleActionResponsable("");
    setNouvelleActionEcheance("");
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
          ficheSSEId: ficheSSEIdFinal || undefined,
          ecartAmianteId: ecartAmianteIdFinal || undefined,
          remonteeId: remonteeIdFinal || undefined,
          titre,
          sousTypeSSE: sousTypeSSE || undefined,
          enseignementsTires: enseignementPrincipal,
          raisonDiffusion: raisonDiffusion || undefined,
          pointsCommuns,
          causeRacine: causeRacine || undefined,
          nature: nature as NatureREX,
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

  const ecartsFiltres = ecarts.filter((e) => {
    if (!filtreEcarts.trim()) return true;
    const q = filtreEcarts.toLowerCase();
    return (
      e.reference.toLowerCase().includes(q) ||
      e.libelle.toLowerCase().includes(q) ||
      (e.chantier ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <form
      onSubmit={(e) => e.preventDefault()}
      className="mx-auto max-w-5xl px-6 py-8"
    >
      <AvertissementNonEnregistre />

      <BoutonRetour href="/rex" label="Retour aux REX" />
      <h1 className="mb-1 text-2xl font-bold text-slate-900">Nouveau REX</h1>
      <p className="mb-6 text-sm text-slate-500">
        Créez un retour d&apos;expérience pour capitaliser et partager un enseignement.
      </p>

      {erreur && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{erreur}</div>
      )}

      {/* Sélecteur de mode — carte complète à l'étape 0, résumé condensé ensuite. */}
      {!parentImpose && step === 0 && (
        <div className="mb-6 rounded-xl border border-slate-200 bg-white p-6">
          <h2 className="text-base font-semibold text-slate-900">Comment voulez-vous créer ce REX ?</h2>
          <p className="mb-4 text-sm text-slate-500">Sélectionnez la situation qui correspond à votre besoin.</p>
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
        <div className="mb-6 flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm">
          <span className="text-slate-500">Mode :</span>
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
                mode === m ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
              }`}
            >
              {libelle}
            </span>
          ))}
          <button
            type="button"
            onClick={() => allerA(0)}
            className="ml-auto text-xs font-medium text-blue-700 hover:underline"
          >
            Modifier
          </button>
        </div>
      )}

      {/* Stepper */}
      <div className="mb-6 flex items-center overflow-x-auto rounded-lg border border-slate-200 bg-white px-5 py-4">
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
                    ? "bg-blue-600 text-white"
                    : i === step
                      ? "bg-blue-600 text-white"
                      : "bg-slate-200 text-slate-500"
                }`}
              >
                {i < step ? <IconCheck className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span className="hidden sm:block">
                <span className={`block text-sm font-medium ${i <= step ? "text-blue-700" : "text-slate-400"}`}>
                  {e.titre}
                </span>
                <span className="block text-xs text-slate-400">{e.detail}</span>
              </span>
            </button>
            {i < ETAPES.length - 1 && <span className="mx-3 h-px w-8 shrink-0 bg-slate-200 sm:w-12" />}
          </div>
        ))}
      </div>

      {/* Étape 1 : sources */}
      {step === 0 && (
        <div className="space-y-4">
          {parentImpose ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-3 text-base font-semibold text-slate-900">Élément source</h2>
              <p className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                {parentImpose.libelle}
              </p>
            </div>
          ) : mode === "spontane" ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
              <h2 className="mb-2 text-base font-semibold text-slate-900">Aucun élément source nécessaire</h2>
              Un REX spontané ou une bonne pratique se rédige directement, sans écart, évènement ou remontée
              d&apos;origine.
            </div>
          ) : mode === "unique" ? (
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-3 text-base font-semibold text-slate-900">Sélection de l&apos;élément source</h2>
              <div className="mb-3 flex flex-wrap gap-4 text-sm text-slate-700">
                {(
                  [
                    ["ecart", "Écart"],
                    ["evenement", "Évènement SSE"],
                    ["amiante", "Écart amiante"],
                    ["remontee", "Remontée"],
                  ] as [TypeUnique, string][]
                ).map(([t, libelle]) => (
                  <label key={t} className="flex items-center gap-1.5">
                    <input type="radio" checked={typeUnique === t} onChange={() => setTypeUnique(t)} />
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
            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <div className="mb-3 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-semibold text-slate-900">Sélection des éléments sources</h2>
                  <p className="text-sm text-slate-500">
                    Cochez les écarts qui sont à l&apos;origine de ce REX. Au moins un élément est requis.
                  </p>
                </div>
                <span className="whitespace-nowrap rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                  {ecartsRecurrents.length} élément(s) sélectionné(s)
                </span>
              </div>
              <input
                value={filtreEcarts}
                onChange={(e) => setFiltreEcarts(e.target.value)}
                placeholder="Filtrer par référence, intitulé, chantier…"
                className={`${inputCls} mb-3`}
              />
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
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
                    {ecartsFiltres.map((e) => (
                      <tr
                        key={e.id}
                        onClick={() => setEcartsRecurrents(toggleValeur(ecartsRecurrents, e.id))}
                        className="cursor-pointer border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-3 py-2">
                          <input type="checkbox" checked={ecartsRecurrents.includes(e.id)} readOnly />
                        </td>
                        <td className="px-3 py-2 font-medium text-slate-700">{e.reference}</td>
                        <td className="px-3 py-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                            <IconAlertTriangle className="h-3 w-3" /> Écart
                          </span>
                        </td>
                        <td className="max-w-xs truncate px-3 py-2 text-slate-700">{e.libelle}</td>
                        <td className="whitespace-nowrap px-3 py-2 text-slate-500">
                          {e.date ? new Date(e.date).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td className="px-3 py-2 text-slate-700">{e.chantier ?? "—"}</td>
                      </tr>
                    ))}
                    {ecartsFiltres.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-3 py-6 text-center text-slate-400">
                          Aucun écart ne correspond à ce filtre.
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
                  <p className="text-sm text-slate-500">Aucun — REX spontané / bonne pratique.</p>
                ) : mode === "recurrents" ? (
                  <ul className="space-y-1 text-sm text-slate-700">
                    {ecartsRecurrents.map((id) => (
                      <li key={id}>{ecartsParId.get(id)?.reference} — {ecartsParId.get(id)?.libelle}</li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-slate-700">
                    {typeUnique === "ecart" && ecarts.find((e) => e.id === ecartUniqueId)?.libelle}
                    {typeUnique === "evenement" && evenements.find((e) => e.id === evenementId)?.libelle}
                    {typeUnique === "amiante" && amiantes.find((e) => e.id === amianteId)?.libelle}
                    {typeUnique === "remontee" && remontees.find((e) => e.id === remonteeId)?.libelle}
                  </p>
                )}
              </RecapCard>
            )}

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h2 className="mb-4 text-base font-semibold text-slate-900">Synthèse / enseignement</h2>

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
                <p className="mt-1 text-right text-xs text-slate-400">{enseignementPrincipal.length}/500</p>
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
                    <p className="mt-1 text-right text-xs text-slate-400">{raisonDiffusion.length}/500</p>
                  </div>

                  <fieldset className="mb-4">
                    <legend className={labelCls}>
                      Points communs observés *
                      <span className="ml-2 font-normal text-slate-400">
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

          <div className="h-fit rounded-xl border border-blue-100 bg-blue-50/60 p-5">
            <div className="mb-3 flex items-center gap-2 text-blue-900">
              <IconLightbulb className="h-5 w-5" />
              <h3 className="text-sm font-semibold">Aide à la rédaction</h3>
            </div>
            <p className="mb-3 text-xs text-blue-800/80">Quelques conseils pour une synthèse efficace.</p>
            <ol className="space-y-3 text-sm text-blue-950">
              <li><span className="font-semibold">1. Soyez synthétique</span><br /><span className="text-xs text-blue-800/80">Allez à l&apos;essentiel : quel est l&apos;enseignement clé ?</span></li>
              <li><span className="font-semibold">2. Appuyez-vous sur les faits</span><br /><span className="text-xs text-blue-800/80">Basez votre analyse sur les éléments observés dans les cas sélectionnés.</span></li>
              <li><span className="font-semibold">3. Expliquez la valeur ajoutée</span><br /><span className="text-xs text-blue-800/80">Précisez pourquoi ce REX est utile et doit être diffusé à d&apos;autres équipes.</span></li>
              <li><span className="font-semibold">4. Identifiez les facteurs récurrents</span><br /><span className="text-xs text-blue-800/80">Ciblez les causes profondes ou les conditions qui se répètent.</span></li>
              <li><span className="font-semibold">5. Restez factuel et opérationnel</span><br /><span className="text-xs text-blue-800/80">Formulez des enseignements concrets et applicables sur le terrain.</span></li>
            </ol>
          </div>
        </div>
      )}

      {/* Étape 3 : type et diffusion */}
      {step === 2 && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <RecapCard titre="Éléments sources" onModifier={() => allerA(0)} compact>
              <p className="text-sm text-slate-600">
                {mode === "spontane" && "Aucun — REX spontané"}
                {mode === "recurrents" && `${ecartsRecurrents.length} écart(s) sélectionné(s)`}
                {mode === "unique" && "1 élément sélectionné"}
              </p>
            </RecapCard>
            <RecapCard titre="Synthèse renseignée" onModifier={() => allerA(1)} compact>
              <p className="line-clamp-2 text-sm text-slate-600">{enseignementPrincipal || "—"}</p>
            </RecapCard>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h2 className="mb-3 text-base font-semibold text-slate-900">Type de REX et diffusion</h2>

            <fieldset className="mb-5">
              <legend className="mb-2 text-sm font-medium text-slate-700">Nature du REX *</legend>
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
                      className={`rounded-lg border p-4 text-left transition ${
                        nature === valeur ? "border-blue-500 ring-1 ring-blue-500" : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <span className={`mb-2 flex h-9 w-9 items-center justify-center rounded-full ${NATURE_ICON_BG[valeur]}`}>
                        <Icone className="h-4.5 w-4.5" />
                      </span>
                      <p className="text-sm font-semibold text-slate-900">{libelle}</p>
                      <p className="mt-1 text-xs text-slate-500">{NATURE_REX_DESCRIPTIONS[valeur]}</p>
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {natureRequiertAction && (
              <fieldset className="mb-5 rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                <legend className="mb-1 px-1 text-sm font-medium text-amber-900">Actions préventives *</legend>
                <p className="mb-3 text-xs text-amber-800/80">
                  Cette nature de REX décrit quelque chose à corriger ou à mettre en place : au moins une action
                  préventive est requise avant de pouvoir valider.
                </p>

                {actionsPreventives.length > 0 && (
                  <ul className="mb-3 space-y-2">
                    {actionsPreventives.map((a, i) => (
                      <li
                        key={i}
                        className="flex items-start justify-between gap-3 rounded-md border border-amber-200 bg-white px-3 py-2 text-sm"
                      >
                        <div className="min-w-0">
                          <p className="text-slate-700">{a.action}</p>
                          <p className="text-xs text-slate-500">
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

                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[2fr_1fr_1fr_auto]">
                  <input
                    value={nouvelleAction}
                    onChange={(e) => setNouvelleAction(e.target.value)}
                    placeholder="Action préventive à mener"
                    className={inputCls}
                  />
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
                    disabled={!nouvelleAction.trim() || !nouvelleActionResponsable}
                    className="whitespace-nowrap rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Ajouter
                  </button>
                </div>
              </fieldset>
            )}

            <fieldset className="mb-5">
              <legend className="mb-2 text-sm font-medium text-slate-700">Thèmes concernés *</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {THEMES_REX_OPTIONS.map((t) => (
                  <CaseACocher key={t} label={t} checked={themes.includes(t)} onChange={() => setThemes(toggleValeur(themes, t))} />
                ))}
              </div>
            </fieldset>

            <div className="mb-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-slate-700">Qui doit recevoir ce REX ? *</legend>
                <div className="flex flex-col gap-2">
                  {DESTINATAIRES_ROLES_REX_OPTIONS.map((d) => (
                    <CaseACocher
                      key={d}
                      label={d}
                      checked={destinatairesRoles.includes(d)}
                      onChange={() => setDestinatairesRoles(toggleValeur(destinatairesRoles, d))}
                    />
                  ))}
                </div>
              </fieldset>
              <fieldset>
                <legend className="mb-2 text-sm font-medium text-slate-700">Canaux de diffusion *</legend>
                <div className="flex flex-col gap-2">
                  {CANAUX_DIFFUSION_REX_OPTIONS.map((c) => (
                    <CaseACocher
                      key={c}
                      label={c}
                      checked={canaux.includes(c)}
                      onChange={() => setCanaux(toggleValeur(canaux, c))}
                    />
                  ))}
                </div>
              </fieldset>
            </div>

            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-700">Modalités de diffusion</legend>
              <div className={`grid grid-cols-1 gap-3 ${natureRequiertAction ? "sm:grid-cols-2" : "sm:grid-cols-3"}`}>
                <ModaliteCard
                  actif={modalite === "immediate"}
                  icone={<IconSend className="h-4 w-4" />}
                  titre="Diffusion immédiate"
                  description="Le REX sera diffusé dès validation."
                  onClick={() => setModalite("immediate")}
                />
                <ModaliteCard
                  actif={modalite === "planifiee"}
                  icone={<IconClock className="h-4 w-4" />}
                  titre="Planifier plus tard"
                  description="Choisissez une date de diffusion."
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
                <p className="text-sm text-slate-500">Aucun — REX spontané / bonne pratique.</p>
              ) : mode === "recurrents" ? (
                <ul className="space-y-1 text-sm text-slate-700">
                  {ecartsRecurrents.map((id) => (
                    <li key={id}>{ecartsParId.get(id)?.reference} — {ecartsParId.get(id)?.libelle}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-700">
                  {typeUnique === "ecart" && ecarts.find((e) => e.id === ecartUniqueId)?.libelle}
                  {typeUnique === "evenement" && evenements.find((e) => e.id === evenementId)?.libelle}
                  {typeUnique === "amiante" && amiantes.find((e) => e.id === amianteId)?.libelle}
                  {typeUnique === "remontee" && remontees.find((e) => e.id === remonteeId)?.libelle}
                </p>
              )}
            </RecapCard>

            <RecapCard titre="Synthèse / enseignement" onModifier={() => allerA(1)}>
              <p className="mb-2 text-sm font-medium text-slate-900">{titre}</p>
              <p className="text-sm text-slate-600">{enseignementPrincipal}</p>
            </RecapCard>

            <RecapCard titre="Type de REX et diffusion" onModifier={() => allerA(2)}>
              <div className="flex flex-wrap gap-2">
                {nature && (
                  <span className={`rounded-full px-3 py-1 text-xs font-medium ${NATURE_REX_COLORS[nature]}`}>
                    {NATURE_REX_LABELS[nature]}
                  </span>
                )}
                {themes.map((t) => (
                  <span key={t} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">{t}</span>
                ))}
              </div>
            </RecapCard>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <label className={labelCls}>Commentaire interne / note QHSE (optionnel)</label>
              <textarea
                value={noteInterne}
                onChange={(e) => setNoteInterne(e.target.value)}
                rows={2}
                maxLength={500}
                placeholder="Ajoutez une note ou un commentaire destiné uniquement à l'équipe QHSE…"
                className={inputCls}
              />
              <p className="mt-1 text-right text-xs text-slate-400">{noteInterne.length}/500</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Aperçu du REX</h3>
              {nature && (
                <span className={`mb-2 inline-block rounded-full px-3 py-1 text-xs font-medium ${NATURE_REX_COLORS[nature]}`}>
                  {NATURE_REX_LABELS[nature]}
                </span>
              )}
              <p className="mb-1 font-semibold text-slate-900">{titre || "—"}</p>
              <p className="mb-3 line-clamp-3 text-sm text-slate-600">{enseignementPrincipal || "—"}</p>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {themes.map((t) => (
                  <span key={t} className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600">{t}</span>
                ))}
              </div>
              <p className="mb-3 text-xs text-slate-500">
                {mode === "recurrents"
                  ? `${ecartsRecurrents.length} écart(s) sources`
                  : mode === "unique"
                    ? "1 élément source"
                    : "REX spontané"}
              </p>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Diffusion prévue</p>
              <div className="flex flex-wrap gap-1.5">
                {destinatairesRoles.map((d) => (
                  <span key={d} className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs text-blue-700">{d}</span>
                ))}
                {canaux.map((c) => (
                  <span key={c} className="rounded-full bg-slate-50 px-2.5 py-0.5 text-xs text-slate-600">{c}</span>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <h3 className="mb-3 text-sm font-semibold text-slate-900">Checklist de validation</h3>
              <ul className="space-y-2">
                {checklist.map((c) => (
                  <li key={c.label} className="flex items-center gap-2 text-sm">
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                        c.ok ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <IconCheck className="h-3 w-3" />
                    </span>
                    <span className={c.ok ? "text-slate-700" : "text-slate-400"}>{c.label}</span>
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
          className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          {step === 0 ? "Annuler" : "Retour"}
        </button>

        {step < 3 ? (
          <button
            type="button"
            onClick={() => allerA(step + 1)}
            disabled={(step === 0 && !sourcesOk) || (step === 1 && !step2Ok) || (step === 2 && !step3Ok)}
            className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {step === 2 ? "Continuer vers la validation" : "Suivant →"}
          </button>
        ) : (
          <div className="flex gap-3">
            <button
              type="submit"
              disabled={isPending || !sourcesOk || !step2Ok}
              onClick={() => soumettre(false)}
              className="rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Enregistrer en brouillon
            </button>
            <button
              type="submit"
              disabled={isPending || !toutOk}
              onClick={() => soumettre(true)}
              className="rounded-md bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"
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
      className={`flex items-start gap-3 rounded-lg border p-4 text-left transition ${
        actif ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${iconeBg}`}>{icone}</span>
      <span>
        <span className="block text-sm font-semibold text-slate-900">{titre}</span>
        <span className="block text-xs text-slate-500">{description}</span>
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
      className={`flex items-start gap-2.5 rounded-lg border p-3.5 text-left transition ${
        actif ? "border-blue-500 bg-blue-50/60 ring-1 ring-blue-500" : "border-slate-200 hover:border-slate-300"
      }`}
    >
      <span className="mt-0.5 text-slate-500">{icone}</span>
      <span>
        <span className="block text-sm font-medium text-slate-900">{titre}</span>
        <span className="block text-xs text-slate-500">{description}</span>
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
    <div className={`rounded-xl border border-slate-200 bg-white ${compact ? "p-4" : "p-5"}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">{titre}</h3>
        <button type="button" onClick={onModifier} className="text-xs font-medium text-blue-700 hover:underline">
          Modifier
        </button>
      </div>
      {children}
    </div>
  );
}
