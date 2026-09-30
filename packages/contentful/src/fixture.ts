import type { CdaAsset, CdaCollection, CdaEntry, CdaLink } from "./client";
import type { ContentfulConfig } from "./client";

export interface SpaceFixture {
  exportedAt: string;
  space: string;
  environment: string;
  entries: CdaEntry[];
  assets: CdaAsset[];
}

/**
 * An in-memory stand-in for the Delivery API: the same `getEntries(params)` surface, answered
 * from an exported snapshot of the space. Supports the query parameters this package uses
 * (content_type, fields.<x>, fields.<x>[in], limit, skip, order) and builds `includes` by
 * walking links, exactly like the real API does. Used by Storybook and tests.
 */
export function createFixtureClient(fixture: SpaceFixture, config: Pick<ContentfulConfig, "site">) {
  const byId = new Map(fixture.entries.map((e) => [e.sys.id, e]));
  const assetsById = new Map(fixture.assets.map((a) => [a.sys.id, a]));

  function matches(e: CdaEntry, params: Record<string, string | number | boolean | undefined>): boolean {
    for (const [k, raw] of Object.entries(params)) {
      if (raw === undefined) continue;
      const v = String(raw);
      if (k === "content_type") { if (e.sys.contentType.sys.id !== v) return false; continue; }
      if (k === "links_to_entry") { if (!JSON.stringify(e.fields).includes(`"id":"${v}"`)) return false; continue; }
      if (k === "limit" || k === "skip" || k === "include" || k === "locale" || k === "order") continue;
      const m = /^fields\.(\w+)(\[in\])?$/.exec(k);
      if (!m) continue;
      const [, name = "", isIn] = m;
      const field = e.fields[name];
      if (isIn) {
        const wanted = v.split(",");
        const have = Array.isArray(field) ? field.map(String) : field == null ? [] : [String(field)];
        if (!have.some((h) => wanted.includes(h))) return false;
      } else if (String(field) !== v) return false;
    }
    return true;
  }

  function collectIncludes(roots: CdaEntry[], depth: number) {
    const entries = new Map<string, CdaEntry>();
    const assets = new Map<string, CdaAsset>();
    const visit = (value: unknown, d: number) => {
      if (d > depth) return;
      if (Array.isArray(value)) return value.forEach((v) => visit(v, d));
      const link = value as CdaLink;
      if (link && typeof link === "object" && link.sys?.type === "Link") {
        if (link.sys.linkType === "Asset") { const a = assetsById.get(link.sys.id); if (a) assets.set(a.sys.id, a); }
        else { const e = byId.get(link.sys.id); if (e && !entries.has(e.sys.id)) { entries.set(e.sys.id, e); Object.values(e.fields).forEach((f) => visit(f, d + 1)); } }
      }
    };
    roots.forEach((r) => Object.values(r.fields).forEach((f) => visit(f, 1)));
    roots.forEach((r) => entries.delete(r.sys.id));
    return { Entry: [...entries.values()], Asset: [...assets.values()] };
  }

  async function getEntries(params: Record<string, string | number | boolean | undefined>): Promise<CdaCollection> {
    const p = { ...params, "fields.sites[in]": config.site };
    let items = fixture.entries.filter((e) => matches(e, p));
    if (String(params.order ?? "").startsWith("-sys.createdAt")) items = [...items].reverse();
    const skip = Number(params.skip ?? 0); const limit = Number(params.limit ?? 100);
    const pageItems = items.slice(skip, skip + limit);
    return { total: items.length, skip, limit, items: pageItems, includes: collectIncludes(pageItems, Number(params.include ?? 6)) };
  }

  return { getEntries, site: config.site };
}
