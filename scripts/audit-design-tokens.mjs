#!/usr/bin/env node
/**
 * Nondii Design System Automated Guardrail (`npm run audit:design`)
 * Scans `/admin/*`, `/studio/*`, and `/account` components for typography,
 * weight, surface, and interaction drift against Nondii Constitution v3.0.
 *
 * Exit code 0 = 100% compliant; Exit code 1 = drift detected.
 */
import fs from "node:fs";
import path from "node:path";

const TARGET_DIRS = [
  "src/components/admin",
  "src/components/studio",
  "src/components/account",
  "src/components/workspace",
  "src/components/super-admin/SuperAdminLocationsManager.tsx",
  "src/app/admin",
  "src/app/studio",
  "src/app/account",
];

const RULES = [
  {
    id: "no-hover-scale",
    message: "Forbidden hover scale (Constitution v3.0 Rule 1)",
    regex: /\b(?:group-)?hover:scale-/g,
  },
  {
    id: "no-native-select",
    message: "Forbidden native <select> — use <ResponsiveSelect />",
    regex: /<select\b/g,
  },
  {
    id: "no-font-bold-700",
    message:
      "Forbidden font-bold (700) in workspace — max weight is font-semibold (600) for Anuphan Thai legibility",
    regex: /\bfont-bold\b/g,
  },
  {
    id: "no-offscale-font-px",
    message:
      "Off-scale arbitrary font size — use Locked 6-Step Workspace Scale (.ws-* or 12/13/14/15/16/20/24/26/28/32px)",
    regex:
      /\btext-\[(?:8|9|10|10\.5|11|11\.5|12\.5|13\.5|14\.5|15\.5|16\.5|17|17\.5|18|19|21|22|23|25|27)px\]/g,
  },
  {
    id: "no-legacy-gray-wrapper",
    message:
      "Legacy bg-gray-100 rounded-2xl card box — use pure-white canvas + hairline divide-y or var(--color-background-muted)",
    regex: /bg-gray-100[^\n"]*rounded-2xl|rounded-2xl[^\n"]*bg-gray-100/g,
  },
  {
    id: "no-legacy-wg-input",
    message:
      "Legacy wg-input class — use Airbnb Inset-Label <StandardInput />, <StandardTextarea />, <StandardSelectField />, <StandardFieldGroup /> from src/components/ui/standards.tsx",
    regex: /\bwg-input\b/g,
  },
];

function walk(dir) {
  const results = [];
  if (!fs.existsSync(dir)) return results;
  const stat = fs.statSync(dir);
  if (stat.isFile()) return [dir];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...walk(full));
    } else if (full.endsWith(".tsx") || full.endsWith(".ts")) {
      results.push(full);
    }
  }
  return results;
}

const files = TARGET_DIRS.flatMap(walk);
const violations = [];

for (const filePath of files) {
  const lines = fs.readFileSync(filePath, "utf8").split("\n");
  lines.forEach((line, idx) => {
    for (const rule of RULES) {
      rule.regex.lastIndex = 0;
      const match = rule.regex.exec(line);
      if (match) {
        violations.push({
          file: filePath,
          line: idx + 1,
          rule: rule.id,
          token: match[0],
          message: rule.message,
        });
      }
    }
  });
}

if (violations.length === 0) {
  console.log(
    `[audit:design] PASS — ${files.length} workspace files checked, 0 design-token violations.`,
  );
  process.exit(0);
}

console.error(
  `[audit:design] FAIL — Found ${violations.length} design-token violation(s):`,
);
for (const v of violations) {
  console.error(`  - ${v.file}:${v.line} [${v.rule}] "${v.token}" — ${v.message}`);
}
process.exit(1);
