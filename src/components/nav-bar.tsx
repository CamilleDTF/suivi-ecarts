import Link from "next/link";
import { LogOutIcon, ShieldCheckIcon } from "lucide-react";
import { auth, signOut } from "@/auth";
import { NavLinks } from "@/components/nav-links";

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
    <header className="sticky top-0 z-20 bg-sidebar text-sidebar-foreground shadow-sm">
      <div className="mx-auto flex h-14 max-w-[100rem] items-center gap-3 px-4 lg:gap-6 lg:px-8">
        <Link href="/" className="flex shrink-0 items-center gap-2.5" title="Suivi des écarts">
          <span className="flex size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <ShieldCheckIcon className="size-[18px]" />
          </span>
          <span className="hidden font-display text-lg font-semibold tracking-tight text-sidebar-accent-foreground xl:inline">
            Suivi des écarts
          </span>
        </Link>

        <div className="min-w-0 flex-1">
          <NavLinks />
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span
            title={nom}
            className="flex size-8 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground"
          >
            {initiales(nom)}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/connexion" });
            }}
          >
            <button
              type="submit"
              aria-label="Se déconnecter"
              title="Se déconnecter"
              className="flex size-8 items-center justify-center rounded-md text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            >
              <LogOutIcon className="size-4" />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
