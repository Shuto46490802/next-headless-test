import { redirect } from "next/navigation";
import { getListOwner, listSlug } from "../../../../lib/lists";
import { findFavouritesList } from "../../../../lib/favorites";

/** Header "Favourites" link: opens the club's Favourites list, or Shopping lists if nothing is hearted yet. */
export default async function FavoritesPage() {
  const { ownerId } = await getListOwner();
  const list = await findFavouritesList(ownerId).catch(() => null);
  redirect(list ? `/account/lists/${listSlug(list.id)}` : "/account/lists");
}
