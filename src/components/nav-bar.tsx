import Link from "next/link";
import { auth, signOut } from "@/auth";
import { NavLinks } from "@/components/nav-links";
import { IconShieldCheck, IconLogOut } from "@/components/icons";

export async function NavBar() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  return (
    <header data-no-print className="sticky top-0 z-10 h-16 border-b border-slate-200 bg-white">
      <div className="flex h-16 items-center gap-4 px-4 md:gap-6 md:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white">
            <IconShieldCheck className="h-5 w-5" />
          </span>
          <span className="hidden whitespace-nowrap text-lg font-bold text-slate-900 sm:inline">
            Suivi des écarts
          </span>
        </Link>

        <div className="min-w-0 flex-1">
          <NavLinks />
        </div>

        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden truncate text-sm text-slate-500 md:inline">{session.user.name}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/connexion" });
            }}
          >
            <button
              type="submit"
              aria-label="Déconnexion"
              title="Déconnexion"
              className="flex items-center gap-1.5 rounded-md border border-red-200 px-2.5 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <IconLogOut className="h-4 w-4" />
              <span className="hidden md:inline">Déconnexion</span>
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
