/** Compte les occurrences d'une liste de valeurs, triées de la plus fréquente à la moins fréquente. */
export function compterOccurrences(valeurs: (string | null | undefined)[]): { label: string; valeur: number }[] {
  const counts: Record<string, number> = {};
  for (const v of valeurs) {
    if (!v) continue;
    counts[v] = (counts[v] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([label, valeur]) => ({ label, valeur }))
    .sort((a, b) => b.valeur - a.valeur);
}
