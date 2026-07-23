import Link from "next/link";
import { auth, signOut } from "@/auth";
import { NavLinks } from "@/components/nav-links";

export async function NavBar() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <Link href="/" className="flex-1 text-2xl font-bold text-slate-900">
          Suivi des écarts
        </Link>
        <NavLinks />
        <div className="ml-10 flex items-center gap-3 border-l border-slate-200 pl-6">
          <span className="text-sm text-slate-500">{session.user.name}</span>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/connexion" });
            }}
          >
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50"
            >
              Déconnexion
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
