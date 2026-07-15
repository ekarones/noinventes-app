// The seller's `/categories` comes back as a flat list with `parentId`; the admin's
// tree arrives pre-ordered with a depth. This turns the flat list into the same
// shape: parents before their children (DFS), each tagged with its nesting depth,
// so a picker can indent the hierarchy.
type FlatNode = { id: number; parentId: number | null; name: string };

export function flattenCategoryTree<T extends FlatNode>(cats: T[]): (T & { depth: number })[] {
  const childrenOf = new Map<number | null, T[]>();
  for (const c of cats) {
    const siblings = childrenOf.get(c.parentId) ?? [];
    siblings.push(c);
    childrenOf.set(c.parentId, siblings);
  }
  // Alphabetical within each level — a stable, readable order the API doesn't grant.
  for (const siblings of childrenOf.values()) {
    siblings.sort((a, b) => a.name.localeCompare(b.name, 'es'));
  }

  const out: (T & { depth: number })[] = [];
  const walk = (parentId: number | null, depth: number) => {
    for (const c of childrenOf.get(parentId) ?? []) {
      out.push({ ...c, depth });
      walk(c.id, depth + 1);
    }
  };
  walk(null, 0);

  // A category whose parent isn't in the list (filtered out, or a stale id) would
  // never be reached from the root — append it flat so nothing silently vanishes.
  if (out.length < cats.length) {
    const seen = new Set(out.map((c) => c.id));
    for (const c of cats) if (!seen.has(c.id)) out.push({ ...c, depth: 0 });
  }
  return out;
}
