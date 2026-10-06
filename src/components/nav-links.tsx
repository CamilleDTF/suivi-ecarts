"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// Libellés courts : dix entrées doivent tenir sur une seule ligne dans la barre du haut.
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

// Le soulignement du lien actif reste dans la hauteur de la barre : s'il dépassait,
// le défilement horizontal ferait apparaître une barre verticale (les petites flèches).
// Sur écran très étroit la barre défile sans afficher d'ascenseur.
export function NavLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex h-14 items-stretch overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {LIENS.map((lien) => {
        const actif = pathname === lien.href || pathname.startsWith(`${lien.href}/`);
        return (
          <Link
            key={lien.href}
            href={lien.href}
            title={lien.titre ?? lien.label}
            aria-current={actif ? "page" : undefined}
            className="group relative flex shrink-0 items-center whitespace-nowrap"
          >
            <span
              className={`rounded-md px-1.5 py-2 text-sm transition-colors lg:px-2 xl:px-3 ${
                actif
                  ? "font-medium text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 group-hover:bg-sidebar-accent/60 group-hover:text-sidebar-accent-foreground"
              }`}
            >
              {lien.label}
            </span>
            {actif && (
              <span className="absolute inset-x-1.5 bottom-0 h-[3px] rounded-t-full bg-sidebar-primary lg:inset-x-2 xl:inset-x-3" aria-hidden />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
