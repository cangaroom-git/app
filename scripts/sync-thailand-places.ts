import "dotenv/config";
import { config as loadEnv } from "dotenv";
loadEnv({ path: ".env.local", override: true });

import { prisma } from "../src/lib/prisma";
import { syncFreeOpenDataPlacesAround } from "../src/lib/geo/thailandPlacesDb";

/**
 * One-Command Free Open-Data Sync:
 * Discovers every hotel coordinate in Neon PostgreSQL, clusters nearby properties (~5.5km grid),
 * and harvests 100% free OpenStreetMap + Wikipedia/Wikimedia + Photon POIs into `ThailandPlace` ($0 cost).
 *
 * Usage: npm run places:sync
 */
async function main() {
  console.log("[places:sync] Loading hotel coordinates from Neon PostgreSQL...");
  const hotels = await prisma.hotel.findMany({
    where: {
      latitude: { not: null },
      longitude: { not: null },
    },
    select: {
      slug: true,
      nameTh: true,
      provinceId: true,
      latitude: true,
      longitude: true,
    },
    orderBy: { createdAt: "asc" },
  });

  if (hotels.length === 0) {
    console.log("[places:sync] No hotels with coordinates found.");
    return;
  }

  // Deduplicate into ~5.5km clusters so neighboring hotels share one polite Open Data harvest
  const clusters = new Map<
    string,
    { lat: number; lng: number; provinceId: string; labels: string[] }
  >();
  for (const h of hotels) {
    if (typeof h.latitude !== "number" || typeof h.longitude !== "number") continue;
    const key = `${(Math.round(h.latitude * 20) / 20).toFixed(2)},${(
      Math.round(h.longitude * 20) / 20
    ).toFixed(2)}`;
    const existing = clusters.get(key);
    if (existing) {
      existing.labels.push(h.nameTh);
    } else {
      clusters.set(key, {
        lat: h.latitude,
        lng: h.longitude,
        provinceId: h.provinceId,
        labels: [h.nameTh],
      });
    }
  }

  console.log(
    `[places:sync] Found ${hotels.length} hotels across ${clusters.size} geographic cluster(s). Syncing free Open Data...`
  );

  let totalUpserted = 0;
  let idx = 0;
  for (const [cellKey, cluster] of clusters.entries()) {
    idx += 1;
    const res = await syncFreeOpenDataPlacesAround(
      cluster.lat,
      cluster.lng,
      cluster.provinceId,
      12000
    );
    totalUpserted += res.upserted;
    console.log(
      `  [${idx}/${clusters.size}] cell=${cellKey} (${cluster.provinceId}: ${cluster.labels.join(
        ", "
      )}) -> fetched=${res.fetched}, upserted=${res.upserted}`
    );
    // Be polite to public Overpass & Wikipedia endpoints
    if (idx < clusters.size) {
      await new Promise((r) => setTimeout(r, 900));
    }
  }

  const dbTotal = await prisma.thailandPlace.count();
  console.log(
    `[places:sync] Done! Upserted ${totalUpserted} places this run. Total rows in ThailandPlace: ${dbTotal}.`
  );
}

main()
  .catch((err) => {
    console.error("[places:sync] Error:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
