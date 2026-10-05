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
    // Rail d'icônes à partir de lg ; bandeau horizontal en dessous.
    <header className="flex items-center gap-2 bg-sidebar px-2 py-2 text-sidebar-foreground lg:fixed lg:inset-y-0 lg:left-0 lg:z-10 lg:w-[88px] lg:flex-col lg:items-stretch lg:gap-0 lg:px-2 lg:py-4">
      <Link
        href="/"
        title="Suivi des écarts"
        className="mx-1 flex size-10 shrink-0 items-center justify-center rounded-md bg-sidebar-primary text-sidebar-primary-foreground lg:mx-auto lg:mb-5"
      >
        <ShieldCheckIcon className="size-5" />
        <span className="sr-only">Suivi des écarts</span>
      </Link>

      <div className="min-w-0 flex-1 lg:overflow-y-auto">
        <NavLinks />
      </div>

      <div className="flex shrink-0 items-center gap-2 lg:mt-4 lg:flex-col">
        <span
          title={nom}
          className="flex size-9 items-center justify-center rounded-full bg-sidebar-accent text-xs font-semibold text-sidebar-accent-foreground"
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
            className="flex size-9 items-center justify-center rounded-md text-sidebar-foreground/60 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOutIcon className="size-4" />
          </button>
        </form>
      </div>
    </header>
  );
}
