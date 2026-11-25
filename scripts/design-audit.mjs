#!/usr/bin/env node
/**
 * Nondii Automated Design Constitution Audit (`scripts/design-audit.mjs`)
 * Scans all `.ts`/`.tsx` files under `src/` to catch regressions across every page & modal:
 * 1. hover-scale         -> NEVER allow hover:scale-* or group-hover:scale-*
 * 2. legacy-bookmark     -> NEVER allow <Bookmark ... /> JSX (use <Heart /> Wishlist)
 * 3. legacy-dark-button  -> NEVER allow hardcoded bg-[#222222]/#111111/#181818/#000000 CTAs (use var(--color-accent))
 * 4. non-square-media    -> NEVER allow 4:3, 3:4, 4:5, 16:10, 3:2, 5:4, 2:3 or rectangular w-X h-Y image boxes
 * 5. non-pill-accent-cta -> Primary Travel-Blue CTAs (`bg-[var(--color-accent)]`) should use `rounded-full`
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const SRC_DIR = path.join(ROOT, "src");

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
      out.push(full);
    }
  }
  return out;
}

const files = walk(SRC_DIR).sort();
const violations = [];

const NON_SQUARE_ASPECT_RE =
  /\baspect-\[(?:4\/3|3\/4|4\/5|16\/10|3\/2|5\/4|2\/3)\]/;
const RECT_SIZE_PAIR_RE =
  /\b(?:h|w)-(10|12|14|16|20|24|28|32|36|40|44|48|56|64)\s+(?:h|w)-(10|12|14|16|20|24|28|32|36|40|44|48|56|64)\b/;

for (const absPath of files) {
  const rel = path.relative(ROOT, absPath).replace(/\\/g, "/");
  const lines = fs.readFileSync(absPath, "utf8").split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    // 1. hover:scale-*
    if (/(?:^|\s|["'`])(?:hover|group-hover):scale-/.test(line)) {
      violations.push({
        rule: "hover-scale",
        file: rel,
        line: lineNo,
        snippet: line.trim().slice(0, 120),
      });
    }

    // 2. Legacy <Bookmark JSX icon
    if (/<Bookmark\b/.test(line)) {
      violations.push({
        rule: "legacy-bookmark",
        file: rel,
        line: lineNo,
        snippet: line.trim().slice(0, 120),
      });
    }

    // 3. Hardcoded monochrome dark buttons/pills (exclude dark: variants, translucent /XX overlays, and video/flip dark stages)
    const isCinemaVideoStage =
      (rel === "src/components/home/DealHeroCouponSlide.tsx" &&
        line.includes("overflow-hidden bg-[#181818]")) ||
      (rel === "src/components/trip/TripCardFlipModal.tsx" &&
        line.includes("overflow-hidden bg-[#181818]"));
    const strippedDarkAndAlpha = line
      .replace(/dark:(?:hover:)?bg-\[#(?:222222|111111|181818|000000)\]/g, "")
      .replace(/bg-\[#(?:222222|111111|181818|000000)\]\/\d+/g, "");
    if (
      !isCinemaVideoStage &&
      /bg-\[#(?:222222|111111|181818|000000)\]/.test(strippedDarkAndAlpha)
    ) {
      violations.push({
        rule: "legacy-dark-button",
        file: rel,
        line: lineNo,
        snippet: line.trim().slice(0, 120),
      });
    }

    // 4. Non-square aspect ratios (exempt Video players, Map containers, and Hero mosaic aspect-[2/1])
    const isMediaHelper = rel === "src/lib/mediaUtils.ts";
    const isMapContainer = rel === "src/components/hotel/HotelLocationMap.tsx";
    const isFacebookAspectPicker =
      rel === "src/components/studio/StudioPinsAndFacebookTab.tsx" &&
      line.includes("label:");
    if (
      !isMediaHelper &&
      !isMapContainer &&
      !isFacebookAspectPicker &&
      NON_SQUARE_ASPECT_RE.test(line)
    ) {
      violations.push({
        rule: "non-square-media",
        file: rel,
        line: lineNo,
        snippet: line.trim().slice(0, 120),
      });
    }

    // Mismatched adjacent h-X w-Y or w-X h-Y on the SAME token pair
    const adjacentRectMatch = line.match(
      /\b(?:h-(10|12|14|16|20|24|28|32|36|40|44|48|56|64)\s+w-(10|12|14|16|20|24|28|32|36|40|44|48|56|64)|w-(10|12|14|16|20|24|28|32|36|40|44|48|56|64)\s+h-(10|12|14|16|20|24|28|32|36|40|44|48|56|64))\b/
    );
    if (adjacentRectMatch) {
      const a = adjacentRectMatch[1] || adjacentRectMatch[3];
      const b = adjacentRectMatch[2] || adjacentRectMatch[4];
      const isIconLine = Number(a) < 12 && Number(b) < 12;
      if (
        a !== b &&
        !isIconLine &&
        /(rounded-|object-cover|img|<img|Image|aspect-)/.test(line)
      ) {
        violations.push({
          rule: "non-square-media",
          file: rel,
          line: lineNo,
          snippet: line.trim().slice(0, 120),
        });
      }
    }

    // 5. Primary Travel-Blue CTAs using non-pill squircle radius (exempt square thumbnails)
    if (
      line.includes("bg-[var(--color-accent)]") &&
      /\brounded-\[(?:8|9|10|11|12|13|14|15|16)px\]/.test(line) &&
      !line.includes("h-7 w-7") &&
      !line.includes("h-8 w-8") &&
      !line.includes("h-[54px] w-[54px]") &&
      !line.includes("aspect-square")
    ) {
      violations.push({
        rule: "non-pill-cta",
        file: rel,
        line: lineNo,
        snippet: line.trim().slice(0, 120),
      });
    }
  }
}

const byRule = {};
for (const v of violations) {
  byRule[v.rule] = (byRule[v.rule] || 0) + 1;
}

if (violations.length === 0) {
  console.log(`Design audit passed: 0 violations across ${files.length} files.`);
  process.exit(0);
}

console.error(`Design audit found ${violations.length} violations across ${files.length} files:`);
for (const [rule, count] of Object.entries(byRule)) {
  console.error(`  - ${rule}: ${count}`);
}
console.error("");
for (const v of violations.slice(0, 120)) {
  console.error(`[${v.rule}] ${v.file}:${v.line} -> ${v.snippet}`);
}
if (violations.length > 120) {
  console.error(`... and ${violations.length - 120} more.`);
}
process.exit(1);
