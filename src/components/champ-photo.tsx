"use client";

import { useState } from "react";
import { useTraitementEnCours } from "@/components/formulaire-editable";

/**
 * Réduit la photo avant de l'envoyer. Une photo de téléphone pèse plusieurs
 * mégaoctets ; encodée en base64 dans le formulaire, elle dépasserait la
 * limite de taille des Server Actions et l'enregistrement échouerait.
 */
async function fichierVersDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const maxDim = 1600;
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.8);
}

/**
 * Champ photo d'un formulaire : aperçu, ajout, remplacement, retrait.
 *
 * La photo voyage dans un champ caché sous forme de data URL, comme la preuve
 * des actions dont ce champ est repris — pas de stockage de fichiers à
 * administrer à côté de la base.
 */
export function ChampPhoto({
  name,
  label,
  valeurInitiale,
  disabled = false,
  libelleAjouter = "Ajouter une photo",
  libelleRemplacer = "Remplacer la photo",
  libelleRetirer = "Retirer la photo",
  libelleVide = "Aucune photo",
  texteExistantNote,
}: {
  name: string;
  label: string;
  valeurInitiale?: string | null;
  disabled?: boolean;
  /**
   * Libellés fournis en entier plutôt que dérivés d'un nom : « enregistrement »
   * et « photo » n'ont ni le même genre ni la même élision, et une règle
   * automatique produirait « Retirer la enregistrement ».
   */
  libelleAjouter?: string;
  libelleRemplacer?: string;
  libelleRetirer?: string;
  libelleVide?: string;
  /**
   * Note affichée quand la valeur enregistrée n'est pas une image mais du
   * texte (valeurs reprises de l'Excel d'origine). Sans elle, la valeur ne
   * s'afficherait pas du tout et disparaîtrait au prochain enregistrement sans
   * que personne ne l'ait vue.
   */
  texteExistantNote?: string;
}) {
  const signalerTraitement = useTraitementEnCours();
  const [valeur, setValeur] = useState(valeurInitiale ?? "");
  const [conversion, setConversion] = useState(false);
  const [erreur, setErreur] = useState("");

  const estPhoto = valeur.startsWith("data:image/");

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErreur("");
    // La conversion est asynchrone : sans ce verrou, enregistrer juste après
    // avoir choisi la photo soumet le formulaire avant qu'elle soit prête —
    // rien n'est enregistré, alors que l'aperçu est déjà à l'écran.
    setConversion(true);
    signalerTraitement(true);
    try {
      setValeur(await fichierVersDataUrl(file));
    } catch {
      setErreur("Photo illisible par le navigateur. Réessaie avec un JPEG ou un PNG.");
    } finally {
      setConversion(false);
      signalerTraitement(false);
    }
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>
      {estPhoto && (
        // eslint-disable-next-line @next/next/no-img-element -- data URL : next/image n'a rien à optimiser
        <img
          src={valeur}
          alt={label}
          className="mb-2 max-h-64 rounded-md border border-slate-200 object-contain"
        />
      )}
      {valeur && !estPhoto && texteExistantNote && (
        <p className="mb-2 text-sm text-slate-700">
          {valeur}
          <span className="ml-2 text-xs text-slate-400">({texteExistantNote})</span>
        </p>
      )}
      {!valeur && disabled && <p className="text-sm text-slate-400">{libelleVide}</p>}
      {!disabled && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {estPhoto ? libelleRemplacer : libelleAjouter}
            <input type="file" accept="image/*" onChange={onFileChange} className="hidden" />
          </label>
          {valeur && (
            <button
              type="button"
              onClick={() => {
                setValeur("");
                setErreur("");
              }}
              className="text-sm font-medium text-red-600 hover:underline"
            >
              {libelleRetirer}
            </button>
          )}
        </div>
      )}
      {conversion && <p className="mt-1 text-sm text-slate-500">Préparation de la photo…</p>}
      {erreur && <p className="mt-1 text-sm text-red-600">{erreur}</p>}
      <input type="hidden" name={name} value={valeur} />
    </div>
  );
}
