// Lecture des champs de formulaire.
//
// Le point important est la distinction undefined / null. Prisma ignore un
// champ à undefined : renvoyer undefined pour un champ vidé revient à dire
// "ne touche pas à cette colonne", si bien qu'une valeur effacée dans le
// formulaire restait en base. Un champ vide doit donc devenir null, pour que
// l'effacement soit enregistré comme tel.

export function texte(v: FormDataEntryValue | null): string | null {
  const s = v ? String(v).trim() : "";
  return s === "" ? null : s;
}

export function dateOuNull(v: FormDataEntryValue | null): Date | null {
  const s = texte(v);
  return s ? new Date(s) : null;
}
