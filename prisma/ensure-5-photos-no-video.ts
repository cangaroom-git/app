import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { prisma } from "../src/lib/prisma";

// Curated, verified-working high-resolution Unsplash photo pools by PlaceCategory
// (Zero broken IDs — every URL has been visually confirmed in Nondii!)
const PHOTO_POOLS: Record<string, string[]> = {
  STAY: [
    "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1200&q=85",
  ],
  CAFE: [
    "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?auto=format&fit=crop&w=1200&q=85",
  ],
  RESTAURANT: [
    "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1559339352-11d035aa65de?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=1200&q=85",
  ],
  ATTRACTION: [
    "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1433086966358-54859d0ed716?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85",
  ],
  WELLNESS: [
    "https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1544161515-4ab6ce6db874?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1519823551278-64ac92734fb1?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1600334089648-b0d9d3028eb2?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1515377905703-c4788e51af15?auto=format&fit=crop&w=1200&q=85",
    "https://images.unsplash.com/photo-1552693673-1bf958298935?auto=format&fit=crop&w=1200&q=85",
  ],
};

function photoKey(raw: string): string {
  const clean = raw.trim();
  try {
    const u = new URL(clean);
    if (u.hostname === "images.unsplash.com") {
      return `${u.origin}${u.pathname}`;
    }
  } catch {
    // ignore
  }
  return clean;
}

async function main() {
  // 1. Airbnb Photo-Only Standard: Remove ALL videos across every Pin
  const videoCleared = await prisma.pin.updateMany({
    where: { OR: [{ videoUrl: { not: null } }, { mediaType: "VIDEO" }] },
    data: { videoUrl: null, mediaType: "PHOTO" },
  });
  console.log(`Cleared videoUrl on ${videoCleared.count} pin(s).`);

  // 2. Ensure EVERY published place's canonical pin has >= 5 strictly unique photos
  const hotels = await prisma.hotel.findMany({
    where: { isPublished: true },
    include: {
      rooms: { where: { isActive: true }, select: { galleryUrls: true } },
      pins: {
        where: { publishStatus: "PUBLISHED" },
        orderBy: [{ isCanonicalCard: "desc" }, { createdAt: "desc" }],
      },
    },
    orderBy: { slug: "asc" },
  });

  let updatedCount = 0;

  for (let hIdx = 0; hIdx < hotels.length; hIdx++) {
    const hotel = hotels[hIdx];
    const canonicalPin =
      hotel.pins.find((p) => p.id === hotel.canonicalPinId) ??
      hotel.pins.find((p) => p.isCanonicalCard) ??
      hotel.pins[0];

    if (!canonicalPin) continue;

    const seenKeys = new Set<string>();
    const uniqueUrls: string[] = [];
    const pushIfUnique = (raw?: string | null) => {
      const url = (raw || "").trim();
      if (!url || url.includes("res.cloudinary.com/dxxb2gvyw/")) return;
      const key = photoKey(url);
      if (seenKeys.has(key)) return;
      seenKeys.add(key);
      uniqueUrls.push(url);
    };

    // Preserve cover image as Slide 0, then existing pin & room photos
    pushIfUnique(canonicalPin.coverImageUrl || hotel.coverImageUrl);
    for (const u of canonicalPin.mediaUrls || []) pushIfUnique(u);
    pushIfUnique(hotel.coverImageUrl);
    for (const r of hotel.rooms) {
      for (const u of r.galleryUrls || []) pushIfUnique(u);
    }

    // Pad from curated category pool (rotated by hotel index for visual variety) until >= 5 unique photos
    const pool = PHOTO_POOLS[hotel.placeCategory] ?? PHOTO_POOLS.STAY;
    for (let i = 0; i < pool.length && uniqueUrls.length < 5; i++) {
      const candidate = pool[(hIdx + i) % pool.length];
      pushIfUnique(candidate);
    }

    // Only write if mediaUrls had fewer than 5 unique images or duplicates
    const prevUniqueCount = new Set(
      (canonicalPin.mediaUrls || []).map(photoKey)
    ).size;
    if (prevUniqueCount < 5 || canonicalPin.mediaUrls.length < 5) {
      await prisma.pin.update({
        where: { id: canonicalPin.id },
        data: {
          coverImageUrl: uniqueUrls[0],
          mediaUrls: uniqueUrls,
          videoUrl: null,
          mediaType: "PHOTO",
        },
      });
      updatedCount++;
    }
  }

  console.log(
    `Enriched ${updatedCount}/${hotels.length} published places to >= 5 unique photos.`
  );
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
