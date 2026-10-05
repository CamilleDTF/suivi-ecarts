import Link from "next/link";
import { LogOutIcon, ShieldCheckIcon } from "lucide-react";
import { auth, signOut } from "@/auth";
import { NavLinks } from "@/components/nav-links";
import { Button } from "@/components/ui/button";

function initiales(nom: string) {
  return nom
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((m) => m[0].toUpperCase())
    .join("");
}

export async function NavBar() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }
  const nom = session.user.name ?? "";

  return (
    // Barre latérale à partir de lg : sept onglets plus le compte ne tiennent
    // pas sur une seule ligne en haut. En dessous de lg, bandeau horizontal.
    <header className="border-b bg-sidebar lg:fixed lg:inset-y-0 lg:left-0 lg:z-10 lg:flex lg:w-60 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex items-center px-4 py-3 lg:px-4 lg:py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <ShieldCheckIcon className="size-4" />
          </span>
          <span className="whitespace-nowrap text-sm font-semibold tracking-tight">Suivi des écarts</span>
        </Link>
      </div>

      <div className="px-2 pb-3 lg:flex-1 lg:overflow-y-auto lg:px-3 lg:pb-0">
        <NavLinks />
      </div>

      <div className="flex items-center gap-2.5 border-t px-3 py-2 lg:py-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
          {initiales(nom)}
        </span>
        <span className="min-w-0 flex-1 truncate text-sm">{nom}</span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/connexion" });
          }}
        >
          <Button type="submit" variant="ghost" size="icon" aria-label="Se déconnecter" title="Se déconnecter">
            <LogOutIcon />
          </Button>
        </form>
      </div>
    </header>
  );
}
