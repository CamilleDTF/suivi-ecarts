import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";

export function BoutonRetour({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      data-no-print
      className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
    >
      <ArrowLeftIcon className="size-4" aria-hidden /> {label}
    </Link>
  );
}
