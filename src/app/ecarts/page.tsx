import { EcartsListePane, type EcartsListeSearchParams } from "@/components/ecarts-liste-pane";

export default async function EcartsPage({
  searchParams,
}: {
  searchParams: Promise<EcartsListeSearchParams>;
}) {
  const resolved = await searchParams;

  return (
    <div className="flex items-start">
      <EcartsListePane searchParams={resolved} />
      <div className="flex flex-1 items-center justify-center px-6 py-24 text-center text-slate-400">
        <p className="text-sm">Sélectionnez un écart dans la liste pour afficher sa fiche.</p>
      </div>
    </div>
  );
}
