export type PageItem = number | "…";

/** 1 2 3 … 15: the first, the last and the neighbours of the current page. */
export function pageItems(page: number, totalPages: number): PageItem[] {
  if (totalPages <= 5) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const items: PageItem[] = [1];
  const start = Math.min(totalPages - 1, Math.max(2, page - 1));
  const end = Math.min(totalPages - 1, page + 1);
  if (start > 2) items.push("…");
  for (let current = start; current <= end; current++) items.push(current);
  if (end < totalPages - 1) items.push("…");
  items.push(totalPages);
  return items;
}
