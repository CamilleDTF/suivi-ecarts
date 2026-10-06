"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Libellés courts : dix entrées doivent tenir sur la barre du haut.
const LIENS = [
  { href: "/dossiers", label: "Dossiers" },
  { href: "/ecarts", label: "Écarts" },
  { href: "/fiches-sse", label: "SSE", titre: "Évènements SSE" },
  { href: "/ecart-amiante", label: "Amiante", titre: "Écart amiante" },
  { href: "/remontees", label: "Remontées" },
  { href: "/rex", label: "REX" },
  { href: "/plan-action", label: "Actions", titre: "Plan d'action" },
  { href: "/plan-action-du", label: "Actions DU", titre: "Plan d'action DU" },
  { href: "/synthese", label: "Synthèse" },
  { href: "/reunion", label: "Réunion", titre: "Réunion QHSE" },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex items-center gap-0.5 overflow-x-auto">
      {LIENS.map((lien) => {
        const actif = pathname === lien.href || pathname.startsWith(`${lien.href}/`);
        return (
          <Link
            key={lien.href}
            href={lien.href}
            title={lien.titre ?? lien.label}
            aria-current={actif ? "page" : undefined}
            className={`relative whitespace-nowrap rounded-md px-3 py-2 text-sm transition-colors ${
              actif
                ? "font-medium text-sidebar-accent-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            }`}
          >
            {lien.label}
            {actif && <span className="absolute inset-x-3 -bottom-[9px] h-[3px] rounded-full bg-sidebar-primary" aria-hidden />}
          </Link>
        );
      })}
    </nav>
  );
}
