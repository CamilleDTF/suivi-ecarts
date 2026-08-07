"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/dossiers", label: "Dossiers" },
  { href: "/ecarts", label: "Écarts" },
  { href: "/fiches-sse", label: "Évènements SSE" },
  { href: "/ecart-amiante", label: "Écart amiante" },
  { href: "/remontees", label: "Remontées" },
  { href: "/plan-action", label: "Plan d'action" },
  { href: "/synthese", label: "Synthèse" },
  { href: "/reunion", label: "Réunion QHSE" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    // Horizontal sous la barre du haut en petit écran, vertical dans la barre
    // latérale à partir de lg. La pastille d'onglet actif fonctionne dans les
    // deux sens, contrairement à un soulignement.
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {LIENS.map((lien) => {
        const actif = pathname === lien.href || pathname.startsWith(`${lien.href}/`);
        return (
          <Link
            key={lien.href}
            href={lien.href}
            className={
              actif
                ? "whitespace-nowrap rounded-md bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
                : "whitespace-nowrap rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            }
          >
            {lien.label}
          </Link>
        );
      })}
    </nav>
  );
}
