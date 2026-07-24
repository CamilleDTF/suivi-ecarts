"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LIENS = [
  { href: "/dossiers", label: "Dossiers" },
  { href: "/ecarts", label: "Écarts" },
  { href: "/fiches-sse", label: "Évènements SSE" },
  { href: "/ecart-amiante", label: "Écart amiante" },
  { href: "/plan-action", label: "Plan d'action" },
  { href: "/synthese", label: "Synthèse" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-5">
      {LIENS.map((lien) => {
        const actif = pathname === lien.href || pathname.startsWith(`${lien.href}/`);
        return (
          <Link
            key={lien.href}
            href={lien.href}
            className={
              actif
                ? "border-b-2 border-blue-600 pb-1 text-sm font-semibold text-blue-700"
                : "border-b-2 border-transparent pb-1 text-sm text-slate-600 hover:text-slate-900"
            }
          >
            {lien.label}
          </Link>
        );
      })}
    </nav>
  );
}
