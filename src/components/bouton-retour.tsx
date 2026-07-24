import Link from "next/link";

export function BoutonRetour({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700 hover:underline"
    >
      ← {label}
    </Link>
  );
}
