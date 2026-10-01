import { cookies } from "next/headers";
import { adminRequest, hasAdminCredentials, type AdminApiConfig } from "./admin";

/**
 * Shopping lists (data mapping: Company → Shopping lists).
 *
 * Each list is a `shopping_list` metaobject (name, products, created_by, last_ordered_at). The
 * owner keeps the ordered list of references in `custom.shopping_lists`: the company for Club
 * Connect and Partner Connect (shared by every contact), the customer for Drinks Cart.
 *
 * The Customer Account API can't write company metafields or metaobjects, so reads and writes go
 * through the Admin API on the server. Every call takes the owner ID from the signed-in session,
 * and list-level calls check the list belongs to that owner before touching it.
 */
export const SHOPPING_LISTS_METAFIELD = { namespace: "custom", key: "shopping_lists", type: "list.metaobject_reference" } as const;
export const SHOPPING_LIST_TYPE = "shopping_list";
/** Shopify's limit for a list.product_reference field. */
export const SHOPPING_LIST_MAX_PRODUCTS = 128;

export interface ShoppingList {
  id: string;
  name: string;
  productIds: string[];
  createdBy: string | null;
  lastOrderedAt: string | null;
  updatedAt: string;
}

export class ShoppingListError extends Error {}

export interface ShoppingListStore {
  getLists(ownerId: string): Promise<ShoppingList[]>;
  /** Null when the list doesn't exist or isn't this owner's. */
  getList(ownerId: string, listId: string): Promise<ShoppingList | null>;
  createList(ownerId: string, input: { name: string; createdById: string; productIds?: string[] }): Promise<ShoppingList>;
  renameList(ownerId: string, listId: string, name: string): Promise<void>;
  deleteList(ownerId: string, listId: string): Promise<void>;
  /** Adds products to the end of the list, skipping ones already on it. */
  addProducts(ownerId: string, listId: string, productIds: string[]): Promise<ShoppingList>;
  removeProduct(ownerId: string, listId: string, productId: string): Promise<void>;
  markOrdered(ownerId: string, listId: string): Promise<void>;
}

/* --------------------------------------------------------------------- admin */

const LIST_FIELDS = /* GraphQL */ `
  fragment ShoppingListFields on Metaobject {
    id
    updatedAt
    name: field(key: "name") {
      value
    }
    products: field(key: "products") {
      value
    }
    lastOrderedAt: field(key: "last_ordered_at") {
      value
    }
    createdBy: field(key: "created_by") {
      reference {
        ... on Customer {
          firstName
          lastName
        }
      }
    }
  }
`;

const LISTS_QUERY = /* GraphQL */ `
  query ShoppingLists($ownerId: ID!) {
    node(id: $ownerId) {
      ... on Company {
        lists: metafield(namespace: "custom", key: "shopping_lists") {
          references(first: 50) {
            nodes {
              ...ShoppingListFields
            }
          }
        }
      }
      ... on Customer {
        lists: metafield(namespace: "custom", key: "shopping_lists") {
          references(first: 50) {
            nodes {
              ...ShoppingListFields
            }
          }
        }
      }
    }
  }
  ${LIST_FIELDS}
`;

const CREATE_MUTATION = /* GraphQL */ `
  mutation ShoppingListCreate($metaobject: MetaobjectCreateInput!) {
    metaobjectCreate(metaobject: $metaobject) {
      metaobject {
        ...ShoppingListFields
      }
      userErrors {
        field
        message
        code
      }
    }
  }
  ${LIST_FIELDS}
`;

const UPDATE_MUTATION = /* GraphQL */ `
  mutation ShoppingListUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
      metaobject {
        ...ShoppingListFields
      }
      userErrors {
        field
        message
        code
      }
    }
  }
  ${LIST_FIELDS}
`;

const DELETE_MUTATION = /* GraphQL */ `
  mutation ShoppingListDelete($id: ID!) {
    metaobjectDelete(id: $id) {
      deletedId
      userErrors {
        field
        message
        code
      }
    }
  }
`;

const SET_OWNER_LISTS_MUTATION = /* GraphQL */ `
  mutation ShoppingListsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const SHOPPING_LIST_OPERATIONS = { LISTS_QUERY, CREATE_MUTATION, UPDATE_MUTATION, DELETE_MUTATION, SET_OWNER_LISTS_MUTATION };

type RawList = {
  id: string;
  updatedAt: string;
  name: { value: string } | null;
  products: { value: string } | null;
  lastOrderedAt: { value: string } | null;
  createdBy: { reference: { firstName: string | null; lastName: string | null } | null } | null;
};
type UserErrors = { field: string[] | null; message: string }[];

function parseIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const v = JSON.parse(raw) as unknown;
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

function mapList(raw: RawList): ShoppingList {
  const by = raw.createdBy?.reference;
  return {
    id: raw.id,
    name: raw.name?.value ?? "Untitled list",
    productIds: parseIds(raw.products?.value),
    createdBy: [by?.firstName, by?.lastName].filter(Boolean).join(" ") || null,
    lastOrderedAt: raw.lastOrderedAt?.value ?? null,
    updatedAt: raw.updatedAt,
  };
}

function assertOk(errors: UserErrors) {
  if (errors.length) throw new ShoppingListError(errors.map((e) => e.message).join(", "));
}

const cleanName = (name: string) => {
  const n = name.trim().slice(0, 80);
  if (!n) throw new ShoppingListError("Give the list a name.");
  return n;
};

const capProducts = (ids: string[]) => {
  if (ids.length > SHOPPING_LIST_MAX_PRODUCTS) throw new ShoppingListError(`A list can hold up to ${SHOPPING_LIST_MAX_PRODUCTS} products.`);
  return ids;
};

export function createAdminShoppingListStore(config: AdminApiConfig): ShoppingListStore {
  async function getLists(ownerId: string) {
    const data = await adminRequest<{ node: { lists: { references: { nodes: RawList[] } } | null } | null }>(config, LISTS_QUERY, { ownerId });
    return (data.node?.lists?.references.nodes ?? []).map(mapList);
  }

  async function setOwnerLists(ownerId: string, ids: string[]) {
    const data = await adminRequest<{ metafieldsSet: { userErrors: UserErrors } }>(config, SET_OWNER_LISTS_MUTATION, {
      metafields: [{ ownerId, ...SHOPPING_LISTS_METAFIELD, value: JSON.stringify(ids) }],
    });
    assertOk(data.metafieldsSet.userErrors);
  }

  async function update(id: string, fields: { key: string; value: string }[]) {
    const data = await adminRequest<{ metaobjectUpdate: { metaobject: RawList | null; userErrors: UserErrors } }>(config, UPDATE_MUTATION, { id, metaobject: { fields } });
    assertOk(data.metaobjectUpdate.userErrors);
    return mapList(data.metaobjectUpdate.metaobject!);
  }

  async function owned(ownerId: string, listId: string) {
    const list = (await getLists(ownerId)).find((l) => l.id === listId);
    if (!list) throw new ShoppingListError("That list couldn't be found.");
    return list;
  }

  return {
    getLists,
    async getList(ownerId, listId) {
      return (await getLists(ownerId)).find((l) => l.id === listId) ?? null;
    },
    async createList(ownerId, { name, createdById, productIds = [] }) {
      const data = await adminRequest<{ metaobjectCreate: { metaobject: RawList | null; userErrors: UserErrors } }>(config, CREATE_MUTATION, {
        metaobject: {
          type: SHOPPING_LIST_TYPE,
          fields: [
            { key: "name", value: cleanName(name) },
            { key: "products", value: JSON.stringify(capProducts([...new Set(productIds)])) },
            { key: "created_by", value: createdById },
          ],
        },
      });
      assertOk(data.metaobjectCreate.userErrors);
      const list = mapList(data.metaobjectCreate.metaobject!);
      const existing = await getLists(ownerId);
      await setOwnerLists(ownerId, [...existing.map((l) => l.id), list.id]);
      return list;
    },
    async renameList(ownerId, listId, name) {
      await owned(ownerId, listId);
      await update(listId, [{ key: "name", value: cleanName(name) }]);
    },
    async deleteList(ownerId, listId) {
      const lists = await getLists(ownerId);
      if (!lists.some((l) => l.id === listId)) throw new ShoppingListError("That list couldn't be found.");
      await setOwnerLists(ownerId, lists.filter((l) => l.id !== listId).map((l) => l.id));
      const data = await adminRequest<{ metaobjectDelete: { userErrors: UserErrors } }>(config, DELETE_MUTATION, { id: listId });
      assertOk(data.metaobjectDelete.userErrors);
    },
    async addProducts(ownerId, listId, productIds) {
      const list = await owned(ownerId, listId);
      const next = capProducts([...new Set([...list.productIds, ...productIds])]);
      return update(listId, [{ key: "products", value: JSON.stringify(next) }]);
    },
    async removeProduct(ownerId, listId, productId) {
      const list = await owned(ownerId, listId);
      await update(listId, [{ key: "products", value: JSON.stringify(list.productIds.filter((p) => p !== productId)) }]);
    },
    async markOrdered(ownerId, listId) {
      await owned(ownerId, listId);
      await update(listId, [{ key: "last_ordered_at", value: new Date().toISOString() }]);
    },
  };
}

/* ---------------------------------------------------------------------- mock */

const MOCK_COOKIE = "shuto_mock_shopping_lists";

/**
 * Cookie-backed stand-in used when no Admin credentials are configured, so the pages work end to
 * end in development. Lists live in this browser only.
 */
export function createMockShoppingListStore(): ShoppingListStore {
  async function read(ownerId: string): Promise<ShoppingList[]> {
    try {
      const all = JSON.parse((await cookies()).get(MOCK_COOKIE)?.value ?? "{}") as Record<string, ShoppingList[]>;
      return all[ownerId] ?? [];
    } catch {
      return [];
    }
  }
  async function write(ownerId: string, lists: ShoppingList[]) {
    const store = await cookies();
    let all: Record<string, ShoppingList[]> = {};
    try {
      all = JSON.parse(store.get(MOCK_COOKIE)?.value ?? "{}");
    } catch {
      /* reset */
    }
    all[ownerId] = lists;
    store.set(MOCK_COOKIE, JSON.stringify(all), { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 365, secure: process.env.NODE_ENV === "production" });
  }
  async function change(ownerId: string, listId: string, fn: (l: ShoppingList) => ShoppingList) {
    const lists = await read(ownerId);
    const i = lists.findIndex((l) => l.id === listId);
    if (i < 0) throw new ShoppingListError("That list couldn't be found.");
    lists[i] = { ...fn(lists[i]!), updatedAt: new Date().toISOString() };
    await write(ownerId, lists);
    return lists[i]!;
  }
  return {
    getLists: read,
    async getList(ownerId, listId) {
      return (await read(ownerId)).find((l) => l.id === listId) ?? null;
    },
    async createList(ownerId, { name, productIds = [] }) {
      const list: ShoppingList = {
        id: `gid://shopify/Metaobject/mock-${Date.now()}`,
        name: cleanName(name),
        productIds: capProducts([...new Set(productIds)]),
        createdBy: null,
        lastOrderedAt: null,
        updatedAt: new Date().toISOString(),
      };
      await write(ownerId, [...(await read(ownerId)), list]);
      return list;
    },
    async renameList(ownerId, listId, name) {
      await change(ownerId, listId, (l) => ({ ...l, name: cleanName(name) }));
    },
    async deleteList(ownerId, listId) {
      await write(ownerId, (await read(ownerId)).filter((l) => l.id !== listId));
    },
    async addProducts(ownerId, listId, productIds) {
      return change(ownerId, listId, (l) => ({ ...l, productIds: capProducts([...new Set([...l.productIds, ...productIds])]) }));
    },
    async removeProduct(ownerId, listId, productId) {
      await change(ownerId, listId, (l) => ({ ...l, productIds: l.productIds.filter((p) => p !== productId) }));
    },
    async markOrdered(ownerId, listId) {
      await change(ownerId, listId, (l) => ({ ...l, lastOrderedAt: new Date().toISOString() }));
    },
  };
}

export function createShoppingListStore(config: AdminApiConfig): ShoppingListStore {
  return hasAdminCredentials(config) ? createAdminShoppingListStore(config) : createMockShoppingListStore();
}
