import { revalidatePath, revalidateTag } from "next/cache";

export const NONDII_CACHE_TAGS = {
  places: "places",
  placeList: "place-list",
  homeFeed: "home-feed",
  exploreFeed: "explore-feed",
  pinDetail: "pin-detail",
  categories: "place-categories",
  locations: "locations",
  appearance: "appearance",
  place: (slug: string) => `place-${slug.trim().toLowerCase()}`,
  pin: (pinId: string) => `pin-${pinId.trim()}`,
} as const;

/**
 * Centralized cache invalidation helper (WeGlobal revalidateProductCatalog pattern).
 * Call after any Host Studio or Super-Admin mutation affecting places, rooms,
 * coupons, pins, posts, reviews, or sponsored status.
 */
export function revalidatePlaceCatalog(options?: {
  slug?: string | null;
  previousSlug?: string | null;
  pinId?: string | null;
  includeCategories?: boolean;
}) {
  try {
    revalidateTag(NONDII_CACHE_TAGS.places, "max");
    revalidateTag(NONDII_CACHE_TAGS.placeList, "max");
    revalidateTag(NONDII_CACHE_TAGS.homeFeed, "max");
    revalidateTag(NONDII_CACHE_TAGS.exploreFeed, "max");
    revalidateTag(NONDII_CACHE_TAGS.pinDetail, "max");

    if (options?.includeCategories) {
      revalidateTag(NONDII_CACHE_TAGS.categories, "max");
    }

    const cleanSlug = options?.slug?.trim().toLowerCase();
    if (cleanSlug) {
      revalidateTag(NONDII_CACHE_TAGS.place(cleanSlug), "max");
      revalidatePath(`/${cleanSlug}`);
      revalidatePath(`/${cleanSlug}/book`);
      revalidatePath(`/${cleanSlug}/posts`);
    }

    const cleanPrevSlug = options?.previousSlug?.trim().toLowerCase();
    if (cleanPrevSlug && cleanPrevSlug !== cleanSlug) {
      revalidateTag(NONDII_CACHE_TAGS.place(cleanPrevSlug), "max");
      revalidatePath(`/${cleanPrevSlug}`);
    }

    const cleanPinId = options?.pinId?.trim();
    if (cleanPinId) {
      revalidateTag(NONDII_CACHE_TAGS.pin(cleanPinId), "max");
    }

    revalidatePath("/");
    revalidatePath("/explore");
  } catch (err) {
    console.error("[revalidatePlaceCatalog] cache revalidation warning:", err);
  }
}

export function revalidateLocationConfigs() {
  try {
    revalidateTag(NONDII_CACHE_TAGS.locations, "max");
    revalidatePath("/explore");
    revalidatePath("/");
    revalidatePath("/admin");
  } catch (err) {
    console.error("[revalidateLocationConfigs] cache revalidation warning:", err);
  }
}

export function revalidatePinDetail(
  pinId: string,
  hotelSlug?: string | null
) {
  try {
    const cleanPinId = pinId.trim();
    if (cleanPinId) {
      revalidateTag(NONDII_CACHE_TAGS.pin(cleanPinId), "max");
    }
    revalidateTag(NONDII_CACHE_TAGS.pinDetail, "max");
    const cleanSlug = hotelSlug?.trim().toLowerCase();
    if (cleanSlug) {
      revalidateTag(NONDII_CACHE_TAGS.place(cleanSlug), "max");
    }
  } catch (err) {
    console.error("[revalidatePinDetail] cache revalidation warning:", err);
  }
}
