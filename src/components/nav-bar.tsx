import Link from "next/link";
import { auth, signOut } from "@/auth";
import { NavLinks } from "@/components/nav-links";
import { IconShieldCheck, IconUser, IconLogOut } from "@/components/icons";

export async function NavBar() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  return (
    // Barre latérale à partir de lg : sept onglets plus le compte ne tiennent
    // pas sur une seule ligne en haut, ce qui forçait le titre à passer à la
    // ligne. En dessous de lg, on retombe sur un bandeau horizontal classique.
    <header className="border-b border-slate-200 bg-white lg:fixed lg:inset-y-0 lg:left-0 lg:z-10 lg:flex lg:w-56 lg:flex-col lg:border-b-0 lg:border-r">
      <div className="flex items-center px-4 py-3 lg:px-4 lg:py-5">
        <Link href="/" className="flex items-center gap-2 lg:flex-col lg:items-start lg:gap-2">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <IconShieldCheck className="h-5 w-5" />
          </span>
          <span className="whitespace-nowrap text-lg font-bold text-slate-900 lg:text-xl">
            Suivi des écarts
          </span>
        </Link>
      </div>

      <div className="px-2 pb-3 lg:flex-1 lg:overflow-y-auto lg:pb-0">
        <NavLinks />
      </div>

      <div className="flex items-center gap-3 border-t border-slate-200 px-4 py-2 lg:flex-col lg:items-stretch lg:gap-2 lg:py-4">
        <span className="flex min-w-0 items-center gap-1.5 text-sm text-slate-500">
          <IconUser className="h-4 w-4 shrink-0" />
          <span className="truncate">{session.user.name}</span>
        </span>
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/connexion" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            <IconLogOut className="h-4 w-4" />
            Déconnexion
          </button>
        </form>
      </div>
    </header>
  );
}
