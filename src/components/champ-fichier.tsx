"use client";

import { useState } from "react";
import { useTraitementEnCours } from "@/components/formulaire-editable";

/**
 * Une photo de téléphone pèse plusieurs mégaoctets ; encodée en base64 dans le
 * formulaire, elle dépasserait la limite de taille des Server Actions et
 * l'enregistrement échouerait. On la réduit donc avant de l'envoyer.
 */
async function imageVersDataUrl(file: File): Promise<string> {
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

function documentVersDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onload = () => resolve(String(lecteur.result));
    lecteur.onerror = () => reject(lecteur.error);
    lecteur.readAsDataURL(file);
  });
}

/**
 * Un PDF ne se redimensionne pas : il part tel quel, et le base64 l'alourdit
 * encore d'un tiers. Au-delà de cette taille la Server Action refuse le
 * formulaire — mieux vaut le dire clairement que laisser l'enregistrement
 * échouer sans explication.
 */
const TAILLE_MAX_DOCUMENT = 4 * 1024 * 1024;

const enMo = (octets: number) => (octets / (1024 * 1024)).toFixed(1).replace(".", ",");

/**
 * Champ fichier d'un formulaire : aperçu, ajout, remplacement, retrait.
 *
 * Le fichier voyage dans un champ caché sous forme de data URL, comme la preuve
 * des actions dont ce champ est repris — pas de stockage de fichiers à
 * administrer à côté de la base.
 */
export function ChampFichier({
  name,
  nomFichierName,
  label,
  valeurInitiale,
  nomFichierInitial,
  disabled = false,
  accepteDocuments = false,
  libelleAjouter = "Ajouter une photo",
  libelleRemplacer = "Remplacer la photo",
  libelleRetirer = "Retirer la photo",
  libelleVide = "Aucune photo",
  texteExistantNote,
}: {
  name: string;
  /** Champ où va le nom d'origine du fichier, quand le formulaire le conserve. */
  nomFichierName?: string;
  label: string;
  valeurInitiale?: string | null;
  nomFichierInitial?: string | null;
  disabled?: boolean;
  /** Accepte aussi les PDF, en plus des images. */
  accepteDocuments?: boolean;
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
   * Note affichée quand la valeur enregistrée n'est pas un fichier mais du
   * texte (valeurs reprises de l'Excel d'origine). Sans elle, la valeur ne
   * s'afficherait pas du tout et disparaîtrait au prochain enregistrement sans
   * que personne ne l'ait vue.
   */
  texteExistantNote?: string;
}) {
  const signalerTraitement = useTraitementEnCours();
  const [valeur, setValeur] = useState(valeurInitiale ?? "");
  const [nomFichier, setNomFichier] = useState(nomFichierInitial ?? "");
  const [conversion, setConversion] = useState(false);
  const [erreur, setErreur] = useState("");

  const estImage = valeur.startsWith("data:image/");
  const estPdf = valeur.startsWith("data:application/pdf");

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setErreur("");
    const estUneImage = file.type.startsWith("image/");

    if (!estUneImage && file.size > TAILLE_MAX_DOCUMENT) {
      setErreur(
        `Fichier trop lourd (${enMo(file.size)} Mo). Maximum ${enMo(TAILLE_MAX_DOCUMENT)} Mo : ` +
          "réduis-le, ou scanne-le dans une qualité plus basse.",
      );
      // Sans ça, resélectionner le même fichier après l'erreur ne déclenche
      // aucun évènement et le champ semble ne rien faire.
      e.target.value = "";
      return;
    }

    // La conversion est asynchrone : sans ce verrou, enregistrer juste après
    // avoir choisi le fichier soumet le formulaire avant qu'il soit prêt —
    // rien n'est enregistré, alors que l'aperçu est déjà à l'écran.
    setConversion(true);
    signalerTraitement(true);
    try {
      setValeur(estUneImage ? await imageVersDataUrl(file) : await documentVersDataUrl(file));
      setNomFichier(file.name);
    } catch {
      setErreur(
        estUneImage
          ? "Photo illisible par le navigateur. Réessaie avec un JPEG ou un PNG."
          : "Fichier illisible par le navigateur. Réessaie avec un autre PDF.",
      );
    } finally {
      setConversion(false);
      signalerTraitement(false);
      e.target.value = "";
    }
  }

  // Les navigateurs bloquent l'ouverture directe d'une URL `data:` dans un
  // onglet : on repasse par un blob, que rien n'interdit.
  function ouvrirDocument() {
    const [entete, base64] = valeur.split(",");
    const type = entete.slice(5).split(";")[0];
    const binaire = atob(base64);
    const octets = new Uint8Array(binaire.length);
    for (let i = 0; i < binaire.length; i++) octets[i] = binaire.charCodeAt(i);
    const url = URL.createObjectURL(new Blob([octets], { type }));
    window.open(url, "_blank", "noopener");
    // Libérer tout de suite fermerait le document dans l'onglet qui vient de
    // s'ouvrir : on laisse le temps au navigateur de le charger.
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700">{label}</label>

      {estImage && (
        // eslint-disable-next-line @next/next/no-img-element -- data URL : next/image n'a rien à optimiser
        <img
          src={valeur}
          alt={label}
          className="mb-2 max-h-64 rounded-md border border-slate-200 object-contain"
        />
      )}

      {estPdf && (
        <div className="mb-2 flex items-center gap-3 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
          <span aria-hidden className="text-lg">
            📄
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
            {nomFichier || "Document PDF"}
          </span>
          <button
            type="button"
            onClick={ouvrirDocument}
            data-no-print
            className="shrink-0 text-sm font-medium text-blue-700 hover:underline"
          >
            Ouvrir
          </button>
        </div>
      )}

      {valeur && !estImage && !estPdf && texteExistantNote && (
        <p className="mb-2 text-sm text-slate-700">
          {valeur}
          <span className="ml-2 text-xs text-slate-400">({texteExistantNote})</span>
        </p>
      )}

      {!valeur && disabled && <p className="text-sm text-slate-400">{libelleVide}</p>}

      {!disabled && (
        <div className="flex flex-wrap items-center gap-3">
          <label className="cursor-pointer rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50">
            {estImage || estPdf ? libelleRemplacer : libelleAjouter}
            <input
              type="file"
              accept={accepteDocuments ? "image/*,application/pdf" : "image/*"}
              onChange={onFileChange}
              className="hidden"
            />
          </label>
          {valeur && (
            <button
              type="button"
              onClick={() => {
                setValeur("");
                setNomFichier("");
                setErreur("");
              }}
              className="text-sm font-medium text-red-600 hover:underline"
            >
              {libelleRetirer}
            </button>
          )}
        </div>
      )}

      {accepteDocuments && !disabled && (
        <p className="mt-1 text-xs text-slate-400">
          Photo ou PDF, {enMo(TAILLE_MAX_DOCUMENT)} Mo maximum pour un PDF.
        </p>
      )}
      {conversion && <p className="mt-1 text-sm text-slate-500">Préparation du fichier…</p>}
      {erreur && <p className="mt-1 text-sm text-red-600">{erreur}</p>}

      <input type="hidden" name={name} value={valeur} />
      {nomFichierName && <input type="hidden" name={nomFichierName} value={nomFichier} />}
    </div>
  );
}
