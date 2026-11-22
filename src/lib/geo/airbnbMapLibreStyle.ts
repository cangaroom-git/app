import { setWorkerUrl, type Map as MapLibreMap, type StyleSpecification } from "maplibre-gl";

const OPENFREEMAP_LIBERTY_URL = "https://tiles.openfreemap.org/styles/liberty";

export const WORLD_MIN_ZOOM = 2;
export const THAILAND_MAX_ZOOM = 18.5;
export const THAILAND_DEFAULT_CENTER: [number, number] = [100.52, 13.4];
export const THAILAND_DEFAULT_ZOOM = 5.4;

/**
 * Enable standard mobile/tablet 1-finger pan and 2-finger pinch-to-zoom while disabling
 * accidental map rotation or 3D pitch.
 */
export function configureThailandMapInteractions(map: MapLibreMap): void {
  try {
    map.dragPan?.enable();
    map.touchZoomRotate?.enable();
    map.touchZoomRotate?.disableRotation();
    map.dragRotate?.disable();
    map.touchPitch?.disable();
  } catch {
    // ignore if map was disposed during async setup
  }
}

let workerConfigured = false;
let rawLibertyPromise: Promise<StyleSpecification> | null = null;
const cachedBuiltStyles: Partial<Record<"light" | "dark", StyleSpecification>> =
  {};

/**
 * Configure MapLibre GL to load our self-contained static worker from /public/maplibre-gl-worker.js
 * so Next.js 16 Turbopack never rewrites or 404s import.meta.url worker chunks.
 */
export function ensureMapLibreWorker(): void {
  if (typeof window === "undefined" || workerConfigured) return;
  setWorkerUrl("/maplibre-gl-worker.js");
  workerConfigured = true;
}

const FALLBACK_VECTOR_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    openmaptiles: {
      type: "vector",
      url: "https://tiles.openfreemap.org/planet",
    },
  },
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#F6F4EF" },
    },
    {
      id: "water",
      type: "fill",
      source: "openmaptiles",
      "source-layer": "water",
      paint: { "fill-color": "#B4DCF0" },
    },
  ],
};

function fetchBaseLibertyStyle(): Promise<StyleSpecification> {
  if (!rawLibertyPromise) {
    rawLibertyPromise = fetch(OPENFREEMAP_LIBERTY_URL)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<StyleSpecification>;
      })
      .catch(() => FALLBACK_VECTOR_STYLE);
  }
  return rawLibertyPromise;
}

/**
 * Build a customized Airbnb Warm Minimal (Light) or Warm Charcoal (Dark) MapLibre vector style.
 * Eliminates harsh yellow/orange highways, 3D building extrusions, and raster low-zoom overlays
 * so zooming and panning across any scale renders seamlessly on a single WebGL <canvas>.
 */
export async function getAirbnbVectorMapStyle(
  isDark: boolean
): Promise<StyleSpecification> {
  const themeKey = isDark ? "dark" : "light";
  const cached = cachedBuiltStyles[themeKey];
  if (cached) return cached;

  const base = await fetchBaseLibertyStyle();
  const style = structuredClone
    ? structuredClone(base)
    : (JSON.parse(JSON.stringify(base)) as StyleSpecification);

  if (style.sources && "ne2_shaded" in style.sources) {
    delete style.sources.ne2_shaded;
  }

  style.layers = (style.layers || [])
    .filter((layer) => layer.id !== "natural_earth" && layer.id !== "building-3d")
    .map((layer) => {
      const id = layer.id;
      const paint = ((layer as { paint?: Record<string, unknown> }).paint ??=
        {});
      const layout = ((layer as { layout?: Record<string, unknown> }).layout ??=
        {});

      if (layer.type === "background") {
        paint["background-color"] = isDark ? "#191919" : "#F6F4EF";
        return layer;
      }

      // Parks, forests, nature reserves -> Airbnb soft sage mint
      if (
        id === "park" ||
        id === "landcover_grass" ||
        id === "landuse_pitch" ||
        id === "landuse_track" ||
        id === "landuse_cemetery"
      ) {
        if (layer.type === "fill") {
          paint["fill-color"] = isDark ? "#1E2C21" : "#DCEFD5";
          paint["fill-opacity"] = isDark ? 0.72 : 0.78;
          paint["fill-outline-color"] = "rgba(0,0,0,0)";
        }
        return layer;
      }

      if (id === "park_outline") {
        layout.visibility = "none";
        return layer;
      }

      if (id === "landcover_wood" || id === "landcover_wetland") {
        if (layer.type === "fill") {
          paint["fill-color"] = isDark ? "#1B281E" : "#DCF0D5";
          paint["fill-opacity"] = isDark ? 0.45 : 0.48;
        }
        return layer;
      }

      if (
        id === "landuse_residential" ||
        id === "landuse_hospital" ||
        id === "landuse_school" ||
        id === "aeroway_fill"
      ) {
        if (layer.type === "fill") {
          paint["fill-color"] = isDark ? "#1E1E1E" : "#F1EFE9";
          paint["fill-opacity"] = 0.7;
        }
        return layer;
      }

      if (id === "landcover_sand") {
        if (layer.type === "fill") {
          paint["fill-color"] = isDark ? "#28251F" : "#F4ECD8";
        }
        return layer;
      }

      // Rivers, lakes, seas -> Airbnb soft sky blue
      if (id === "water" && layer.type === "fill") {
        paint["fill-color"] = isDark ? "#182B3A" : "#B4DCF0";
        return layer;
      }
      if (id.startsWith("waterway") && layer.type === "line") {
        paint["line-color"] = isDark ? "#182B3A" : "#B4DCF0";
        return layer;
      }

      // Clean 2D architectural building footprints at neighborhood/street zoom (keeps overview fast & calm)
      if (id === "building" && layer.type === "fill") {
        delete (layer as { maxzoom?: number }).maxzoom;
        (layer as { minzoom?: number }).minzoom = 14.2;
        paint["fill-color"] = isDark ? "#232323" : "#EAE6DD";
        paint["fill-outline-color"] = isDark ? "#2B2B2B" : "#DFD9CE";
        paint["fill-opacity"] = 0.88;
        return layer;
      }

      // Road casings & fills -> Crisp white streets + warm stone motorways (zero harsh yellow/orange)
      if (layer.type === "line") {
        if (id.includes("casing")) {
          paint["line-color"] = isDark ? "#242424" : "#E3DED4";
          return layer;
        }
        if (id.includes("motorway")) {
          paint["line-color"] = isDark ? "#383838" : "#EAE3D7";
          return layer;
        }
        if (id.includes("trunk_primary") || id.includes("secondary_tertiary")) {
          paint["line-color"] = isDark ? "#323232" : "#FFFFFF";
          return layer;
        }
        if (
          id.includes("minor") ||
          id.includes("street") ||
          id.includes("service") ||
          id.includes("link")
        ) {
          paint["line-color"] = isDark ? "#2B2B2B" : "#FFFFFF";
          return layer;
        }
        if (id.includes("path_pedestrian")) {
          paint["line-color"] = isDark ? "#2F2F2F" : "#DFD9CE";
          return layer;
        }
        if (id.startsWith("boundary_")) {
          paint["line-color"] = isDark ? "#3A3A3A" : "#D6D1C7";
          return layer;
        }
      }

      // Symbols: Native Vector POIs, Street Names & Place Labels (Thai-first, zero stacked bilingual clutter)
      if (layer.type === "symbol") {
        if (id === "road_shield_us" || id === "highway-shield-us-interstate") {
          layout.visibility = "none";
          return layer;
        }

        const existingTextField = layout["text-field"];
        const isShieldOrNumber =
          id.includes("shield") ||
          id.includes("ref") ||
          id.includes("housenumber");
        if (
          existingTextField &&
          !isShieldOrNumber &&
          JSON.stringify(existingTextField).includes("name")
        ) {
          layout["text-field"] = [
            "coalesce",
            ["get", "name:th"],
            ["get", "name"],
            ["get", "name:en"],
          ];
        }

        // Progressive Airbnb-style POI density: calm overview at z13-14, detail reveals cleanly as user zooms in!
        if (id.startsWith("poi_")) {
          if (id === "poi_r20") (layer as { minzoom?: number }).minzoom = 12.2;
          if (id === "poi_r7") (layer as { minzoom?: number }).minzoom = 14.8;
          if (id === "poi_r1") (layer as { minzoom?: number }).minzoom = 16.2;
          if (id === "poi_transit") (layer as { minzoom?: number }).minzoom = 14.5;
          layout["text-font"] = ["Noto Sans Regular"];
          paint["text-color"] = isDark ? "#BDBDBD" : "#5D5953";
          paint["text-halo-color"] = isDark ? "#191919" : "#FFFFFF";
          paint["text-halo-width"] = 1.3;
          return layer;
        }

        if (id.startsWith("water")) {
          paint["text-color"] = isDark ? "#7CA5C2" : "#4A7D9B";
          paint["text-halo-color"] = isDark ? "#182B3A" : "#E5F3FA";
          paint["text-halo-width"] = 1.2;
          return layer;
        }

        paint["text-color"] = isDark ? "#DEDEDE" : "#484848";
        paint["text-halo-color"] = isDark ? "#191919" : "#FFFFFF";
        paint["text-halo-width"] = 1.4;
      }

      return layer;
    });

  cachedBuiltStyles[themeKey] = style;
  return style;
}
