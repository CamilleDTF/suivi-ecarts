import Link from "next/link";
import type { ReactNode } from "react";

export type ActiviteItem = {
  label: string;
  reference: string;
  href: string;
  date: Date;
  icon: ReactNode;
  couleurBg: string;
  couleurTexte: string;
};

function formatDateActivite(date: Date) {
  const maintenant = new Date();
  const estAujourdhui = date.toDateString() === maintenant.toDateString();
  const heure = date.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
  return { ligne1: estAujourdhui ? "Aujourd'hui" : date.toLocaleDateString("fr-FR"), ligne2: heure };
}

export function ActiviteRecente({ items }: { items: ActiviteItem[] }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="mb-3 text-sm font-semibold uppercase text-slate-500">Activité récente</h2>
      {items.length === 0 ? (
        <p className="py-6 text-center text-sm text-slate-400">Aucune activité récente.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {items.map((item) => {
            const { ligne1, ligne2 } = formatDateActivite(item.date);
            return (
              <li key={`${item.href}-${item.label}`}>
                <Link href={item.href} className="flex items-center gap-3 py-3 hover:bg-slate-50">
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${item.couleurBg} ${item.couleurTexte}`}
                  >
                    {item.icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-slate-800">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.reference}</p>
                  </div>
                  <div className="shrink-0 text-right text-xs text-slate-400">
                    <div>{ligne1}</div>
                    <div>{ligne2}</div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
