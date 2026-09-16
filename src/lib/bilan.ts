/**
 * Mise en forme du bilan de réunion.
 *
 * Le support de réunion écrit une ligne par point, sur un seul niveau :
 *
 *   2026-EV36 : Equipe ZAMAN : Causerie sur déchet et zone de stockage -> Saïd
 *
 * soit « référence : contexte : ce dont on parle -> qui s'en charge ». Le
 * tableau de l'écran ne se recopie pas tel quel dans une diapositive ; cette
 * forme-là, si.
 */

/**
 * "EV-2026-0036" → "2026-EV36".
 *
 * L'application numérote avec le préfixe en tête et quatre chiffres ; le
 * support de réunion écrit l'année d'abord et sans zéros. C'est la même
 * référence, dans la convention du document — recoller des lignes qu'il
 * faudrait ensuite renuméroter à la main n'aurait pas d'intérêt.
 *
 * Une référence qui ne suit pas ce schéma est laissée intacte : mieux vaut une
 * ligne à la forme inattendue qu'une référence tronquée.
 */
export function referenceBilan(reference: string): string {
  const m = reference.match(/^([A-Z]+)-(\d{4})-0*(\d+)$/);
  return m ? `${m[2]}-${m[1]}${m[3]}` : reference;
}

export function ligneBilan({
  reference,
  contexte,
  texte,
  responsable,
}: {
  reference: string;
  /** Chantier, équipe ou service — ce qui situe le point. */
  contexte?: string | null;
  texte?: string | null;
  /** Absent pour ce qui n'est pas une action : la flèche ne s'écrit pas seule. */
  responsable?: string | null;
}): string {
  const debut = [referenceBilan(reference), contexte?.trim(), texte?.trim().replace(/\s+/g, " ")]
    .filter(Boolean)
    .join(" : ");
  return responsable?.trim() ? `${debut} -> ${responsable.trim()}` : debut;
}
