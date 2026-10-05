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

// `court` : libellé sous l'icône, la barre ne faisant que 88 px de large.
const LIENS = [
  { href: "/dossiers", label: "Dossiers", court: "Dossiers", icone: FolderIcon },
  { href: "/ecarts", label: "Écarts", court: "Écarts", icone: TriangleAlertIcon },
  { href: "/fiches-sse", label: "Évènements SSE", court: "SSE", icone: ActivityIcon },
  { href: "/ecart-amiante", label: "Écart amiante", court: "Amiante", icone: ShieldAlertIcon },
  { href: "/remontees", label: "Remontées", court: "Remontées", icone: MessageSquareIcon },
  { href: "/rex", label: "REX", court: "REX", icone: LightbulbIcon },
  { href: "/plan-action", label: "Plan d'action", court: "Actions", icone: ListChecksIcon },
  { href: "/plan-action-du", label: "Plan d'action DU", court: "Actions DU", icone: ClipboardListIcon },
  { href: "/synthese", label: "Synthèse", court: "Synthèse", icone: ChartColumnIcon },
  { href: "/reunion", label: "Réunion QHSE", court: "Réunion", icone: UsersIcon },
];

export function NavLinks() {
  const pathname = usePathname();

  return (
    // Rangée défilante sous la barre du haut en petit écran ; colonne d'icônes
    // dans la barre latérale à partir de lg.
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {LIENS.map((lien) => {
        const actif = pathname === lien.href || pathname.startsWith(`${lien.href}/`);
        const Icone = lien.icone;
        return (
          <Link
            key={lien.href}
            href={lien.href}
            title={lien.label}
            aria-label={lien.label}
            aria-current={actif ? "page" : undefined}
            className={`flex shrink-0 flex-col items-center gap-1 rounded-md px-3 py-2 text-[11px] font-medium leading-none transition-colors lg:w-full ${
              actif
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/60 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            }`}
          >
            <Icone className={`size-5 ${actif ? "text-sidebar-primary" : ""}`} aria-hidden />
            {lien.court}
          </Link>
        );
      })}
    </nav>
  );
}
