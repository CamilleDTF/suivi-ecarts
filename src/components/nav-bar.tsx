import Link from "next/link";
import { auth, signOut } from "@/auth";

const LIENS = [
  { href: "/dossiers", label: "Dossiers" },
  { href: "/ecarts", label: "Écarts" },
  { href: "/fiches-sse", label: "Fiches SSE" },
  { href: "/plan-action", label: "Plan d'action" },
  { href: "/ecart-amiante", label: "Écart amiante" },
];

export async function NavBar() {
  const session = await auth();
  if (!session?.user) {
    return null;
  }

  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
        <div className="flex items-center gap-8">
          <Link href="/" className="text-sm font-semibold text-slate-900">
            Suivi des écarts
          </Link>
          <nav className="flex gap-5">
            {LIENS.map((lien) => (
              <Link
                key={lien.href}
                href={lien.href}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                {lien.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
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
