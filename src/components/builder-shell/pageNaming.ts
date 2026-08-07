/** Lowercases, strips diacritics/punctuation, and hyphenates a name into a URL-safe slug base. */
export function slugify(name: string): string {
  const slug = name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "page";
}

/** Appends `-2`, `-3`, ... to `base` until it no longer collides with `existingSlugs`. */
export function uniqueSlug(base: string, existingSlugs: Iterable<string>): string {
  const taken = new Set(existingSlugs);
  if (!taken.has(base)) return base;
  let counter = 2;
  while (taken.has(`${base}-${counter}`)) counter += 1;
  return `${base}-${counter}`;
}
