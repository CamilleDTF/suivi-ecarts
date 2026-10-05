"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ActivityIcon,
  ChartColumnIcon,
  ClipboardListIcon,
  FolderIcon,
  LightbulbIcon,
  ListChecksIcon,
  MessageSquareIcon,
  ShieldAlertIcon,
  TriangleAlertIcon,
  UsersIcon,
} from "lucide-react";

const GROUPES = [
  {
    titre: "Suivi",
    liens: [
      { href: "/dossiers", label: "Dossiers", icone: FolderIcon },
      { href: "/ecarts", label: "Écarts", icone: TriangleAlertIcon },
      { href: "/fiches-sse", label: "Évènements SSE", icone: ActivityIcon },
      { href: "/ecart-amiante", label: "Écart amiante", icone: ShieldAlertIcon },
    ],
  },
  {
    titre: "Amélioration continue",
    liens: [
      { href: "/remontees", label: "Remontées", icone: MessageSquareIcon },
      { href: "/rex", label: "REX", icone: LightbulbIcon },
    ],
  },
  {
    titre: "Pilotage",
    liens: [
      { href: "/plan-action", label: "Plan d'action", icone: ListChecksIcon },
      { href: "/plan-action-du", label: "Plan d'action DU", icone: ClipboardListIcon },
      { href: "/synthese", label: "Synthèse", icone: ChartColumnIcon },
      { href: "/reunion", label: "Réunion QHSE", icone: UsersIcon },
    ],
  },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    // Horizontal sous la barre du haut en petit écran, vertical dans la barre
    // latérale à partir de lg ; les titres de groupe n'existent que là.
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:gap-0 lg:overflow-visible">
      {GROUPES.map((groupe) => (
        <div key={groupe.titre} className="flex gap-1 lg:mb-4 lg:flex-col">
          <p className="hidden px-2.5 pb-1 text-xs font-medium text-muted-foreground lg:block">{groupe.titre}</p>
          {groupe.liens.map((lien) => {
            const actif = pathname === lien.href || pathname.startsWith(`${lien.href}/`);
            const Icone = lien.icone;
            return (
              <Link
                key={lien.href}
                href={lien.href}
                aria-current={actif ? "page" : undefined}
                className={`flex items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                  actif
                    ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                    : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
                }`}
              >
                <Icone className="size-4 shrink-0" aria-hidden />
                {lien.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
