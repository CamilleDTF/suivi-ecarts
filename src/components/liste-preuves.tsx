/**
 * Les moyens de preuve sont saisis un par ligne. Les afficher tels quels dans
 * une cellule de tableau les collerait sur une seule ligne : on les rend en
 * liste, comme dans le Document Unique.
 */
export function ListePreuves({ valeur }: { valeur: string | null | undefined }) {
  const lignes = (valeur ?? "")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  if (lignes.length === 0) return <span className="text-slate-400">—</span>;
  if (lignes.length === 1) return <>{lignes[0]}</>;

  return (
    <ul className="list-disc space-y-0.5 pl-4">
      {lignes.map((l, i) => (
        <li key={i}>{l}</li>
      ))}
    </ul>
  );
}
