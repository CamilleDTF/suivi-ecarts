import { creerEcartAmiante } from "@/app/ecart-amiante/actions";
import { EcartAmianteFields } from "@/components/ecart-amiante-fields";

export default function NouvelEcartAmiantePage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">Nouvel écart amiante</h1>

      <form action={creerEcartAmiante} className="space-y-6 rounded-lg border border-slate-200 bg-white p-6">
        <EcartAmianteFields />

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Créer l&apos;écart amiante
          </button>
        </div>
      </form>
    </div>
  );
}
