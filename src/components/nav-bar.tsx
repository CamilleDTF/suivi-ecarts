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
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex flex-1 items-center gap-2 text-2xl font-bold text-slate-900">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white">
            <IconShieldCheck className="h-5 w-5" />
          </span>
          Suivi des écarts
        </Link>
        <NavLinks />
        <div className="ml-10 flex items-center gap-3 border-l border-slate-200 pl-6">
          <span className="flex items-center gap-1.5 text-sm text-slate-500">
            <IconUser className="h-4 w-4" />
            {session.user.name}
          </span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/connexion" });
            }}
          >
            <button
              type="submit"
              className="flex items-center gap-1.5 rounded-md border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
            >
              <IconLogOut className="h-4 w-4" />
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
