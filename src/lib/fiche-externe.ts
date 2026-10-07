// Fiche de diffusion apportée par l'utilisateur : quels fichiers on accepte et comment on les lit.
// Les types sont ceux de documents de bureautique et d'images matricielles. Jamais de HTML ni de
// SVG : le fichier est resservi tel quel par l'application, il ne doit pas pouvoir y exécuter de script.

export const TYPES_FICHE_EXTERNE: Record<string, { extensions: string[]; ouvrableDansLeNavigateur: boolean }> = {
  "application/pdf": { extensions: ["pdf"], ouvrableDansLeNavigateur: true },
  "application/msword": { extensions: ["doc"], ouvrableDansLeNavigateur: false },
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { extensions: ["docx"], ouvrableDansLeNavigateur: false },
  "application/vnd.ms-powerpoint": { extensions: ["ppt"], ouvrableDansLeNavigateur: false },
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": { extensions: ["pptx"], ouvrableDansLeNavigateur: false },
  "application/vnd.ms-excel": { extensions: ["xls"], ouvrableDansLeNavigateur: false },
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { extensions: ["xlsx"], ouvrableDansLeNavigateur: false },
  "application/vnd.oasis.opendocument.text": { extensions: ["odt"], ouvrableDansLeNavigateur: false },
  "application/vnd.oasis.opendocument.presentation": { extensions: ["odp"], ouvrableDansLeNavigateur: false },
  "image/png": { extensions: ["png"], ouvrableDansLeNavigateur: true },
  "image/jpeg": { extensions: ["jpg", "jpeg"], ouvrableDansLeNavigateur: true },
  "image/webp": { extensions: ["webp"], ouvrableDansLeNavigateur: true },
};

/** Valeur de l'attribut `accept` du champ fichier. */
export const ACCEPT_FICHE_EXTERNE = [
  ...new Set(Object.values(TYPES_FICHE_EXTERNE).flatMap((t) => t.extensions.map((e) => `.${e}`))),
  "image/*",
].join(",");

/** Taille maximale du fichier d'origine : au-delà, le formulaire dépasse la limite des Server Actions. */
export const TAILLE_MAX_FICHE_EXTERNE = 4 * 1024 * 1024;

export const FORMATS_FICHE_EXTERNE = "PDF, Word, PowerPoint, Excel ou image";

/** Le type MIME que le navigateur n'a pas toujours su donner (« .docx » arrive parfois sans type). */
export function typeParExtension(nom: string): string | null {
  const extension = nom.split(".").pop()?.toLowerCase() ?? "";
  const trouve = Object.entries(TYPES_FICHE_EXTERNE).find(([, t]) => t.extensions.includes(extension));
  return trouve ? trouve[0] : null;
}

/** Lit une data URL « data:<type>;base64,<données> » et vérifie que le type est accepté. */
export function lireDataUrl(dataUrl: string): { type: string; octets: Uint8Array<ArrayBuffer> } | null {
  const m = /^data:([^;,]+);base64,([A-Za-z0-9+/=\s]*)$/.exec(dataUrl);
  if (!m) return null;
  const type = m[1].toLowerCase();
  if (!(type in TYPES_FICHE_EXTERNE)) return null;
  const tampon = Buffer.from(m[2], "base64");
  // Une copie : le Buffer de Node partage un bloc mémoire plus grand que son contenu.
  return { type, octets: new Uint8Array(tampon) };
}

export function formaterTaille(octets: number): string {
  if (octets < 1024 * 1024) return `${Math.max(1, Math.round(octets / 1024))} Ko`;
  return `${(octets / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
