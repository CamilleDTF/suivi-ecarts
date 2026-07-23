import Link from "next/link";

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
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-500">
      <div>
        {debut}–{fin} sur {total} résultat{total > 1 ? "s" : ""}
      </div>
      <div className="flex items-center gap-2">
        {precedentActif ? (
          <Link
            href={hrefPage(page - 1)}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-slate-600 hover:bg-slate-50"
          >
            ‹
          </Link>
        ) : (
          <span className="rounded-md border border-slate-200 px-2.5 py-1 text-slate-300">‹</span>
        )}
        <span className="rounded-md bg-blue-600 px-2.5 py-1 font-medium text-white">{page}</span>
        <span className="px-1 text-slate-400">/ {totalPages}</span>
        {suivantActif ? (
          <Link
            href={hrefPage(page + 1)}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-slate-600 hover:bg-slate-50"
          >
            ›
          </Link>
        ) : (
          <span className="rounded-md border border-slate-200 px-2.5 py-1 text-slate-300">›</span>
        )}
      </div>
    </div>
  );
}
