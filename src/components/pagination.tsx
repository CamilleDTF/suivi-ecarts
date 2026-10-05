import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { SelectTaillePage } from "@/components/select-taille-page";

export function Pagination({
  total,
  page,
  pageSize,
  baseParams,
}: {
  total: number;
  page: number;
  pageSize: number;
  baseParams: Record<string, string | undefined>;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const debut = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const fin = Math.min(page * pageSize, total);

  function hrefPage(p: number) {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(baseParams)) {
      if (v) params.set(k, v);
    }
    if (p > 1) params.set("page", String(p));
    const qs = params.toString();
    return qs ? `?${qs}` : "?";
  }

  const precedentActif = page > 1;
  const suivantActif = page < totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm text-muted-foreground">
      <div className="flex flex-wrap items-center gap-4">
        <span>
          {debut}–{fin} sur {total} résultat{total > 1 ? "s" : ""}
        </span>
        <SelectTaillePage taille={pageSize} />
      </div>
      <div className="flex items-center gap-2">
        <span className="mr-1 tabular-nums">
          Page {page} / {totalPages}
        </span>
        {precedentActif ? (
          <Link href={hrefPage(page - 1)} aria-label="Page précédente" className={buttonVariants({ variant: "outline", size: "icon-sm" })}>
            <ChevronLeftIcon />
          </Link>
        ) : (
          <Button variant="outline" size="icon-sm" disabled aria-label="Page précédente">
            <ChevronLeftIcon />
          </Button>
        )}
        {suivantActif ? (
          <Link href={hrefPage(page + 1)} aria-label="Page suivante" className={buttonVariants({ variant: "outline", size: "icon-sm" })}>
            <ChevronRightIcon />
          </Link>
        ) : (
          <Button variant="outline" size="icon-sm" disabled aria-label="Page suivante">
            <ChevronRightIcon />
          </Button>
        )}
      </div>
    </div>
  );
}
