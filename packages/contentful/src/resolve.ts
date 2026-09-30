import type { CdaAsset, CdaCollection, CdaEntry, CdaLink } from "./client";

export interface ContentfulImage {
  url: string;
  title: string | null;
  description: string | null;
  width: number | null;
  height: number | null;
  contentType: string;
}

/** Every resolved entry carries its id and content type id; fields are spread on top. */
export interface Resolved {
  id: string;
  contentType: string;
  updatedAt: string | null;
}

function isLink(v: unknown): v is CdaLink {
  return Boolean(v && typeof v === "object" && (v as CdaLink).sys?.type === "Link");
}

export function mapAsset(a: CdaAsset): ContentfulImage | null {
  const file = a.fields.file;
  if (!file?.url) return null;
  return {
    url: file.url.startsWith("//") ? `https:${file.url}` : file.url,
    title: a.fields.title ?? null,
    description: a.fields.description ?? null,
    width: file.details?.image?.width ?? null,
    height: file.details?.image?.height ?? null,
    contentType: file.contentType,
  };
}

/**
 * Turns a CDA collection into plain objects with links replaced by the linked entry/asset.
 * Unresolvable links (unpublished targets) become null and are dropped from arrays, matching
 * how the GraphQL API behaves. Cycles are cut by depth.
 */
export function resolveCollection<T extends Resolved = Resolved>(col: CdaCollection, maxDepth = 8): T[] {
  const entries = new Map<string, CdaEntry>();
  const assets = new Map<string, CdaAsset>();
  for (const e of col.items) entries.set(e.sys.id, e);
  for (const e of col.includes?.Entry ?? []) entries.set(e.sys.id, e);
  for (const a of col.includes?.Asset ?? []) assets.set(a.sys.id, a);

  const cache = new Map<string, Resolved>();

  function resolveValue(v: unknown, depth: number): unknown {
    if (Array.isArray(v)) return v.map((x) => resolveValue(x, depth)).filter((x) => x !== null && x !== undefined);
    if (isLink(v)) {
      if (v.sys.linkType === "Asset") {
        const a = assets.get(v.sys.id);
        return a ? mapAsset(a) : null;
      }
      const e = entries.get(v.sys.id);
      return e ? resolveEntry(e, depth + 1) : null;
    }
    return v;
  }

  function resolveEntry(e: CdaEntry, depth: number): Resolved | null {
    if (depth > maxDepth) return null;
    const cached = cache.get(e.sys.id);
    if (cached) return cached;
    const out: Record<string, unknown> & Resolved = {
      id: e.sys.id,
      contentType: e.sys.contentType.sys.id,
      updatedAt: e.sys.updatedAt ?? null,
    };
    cache.set(e.sys.id, out); // register before descending so self-references terminate
    for (const [k, v] of Object.entries(e.fields)) out[k] = resolveValue(v, depth);
    return out;
  }

  return col.items.map((e) => resolveEntry(e, 0)).filter((e): e is T => e !== null);
}
