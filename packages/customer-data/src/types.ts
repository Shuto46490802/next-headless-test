export interface CustomerDataDriver {
  /** Reads the customer's assigned brand slug (`custom.brand`), or null if unset. */
  getBrand(customerId: string): Promise<string | null>;
  /** Assigns a brand slug to a customer. Should only ever be called once (on first login). */
  setBrand(customerId: string, brand: string): Promise<void>;
  /** Product GIDs the customer has favourited (`custom.favourites`). */
  getFavourites(customerId: string): Promise<string[]>;
  setFavourites(customerId: string, productIds: string[]): Promise<void>;
}
