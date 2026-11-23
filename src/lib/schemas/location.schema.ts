import { z } from "zod";

export const ReorderRegionsSchema = z.object({
  action: z.literal("reorder_regions"),
  orderedRegionIds: z.array(z.string().trim().min(1)).min(1).max(20),
});

export const ReorderProvincesSchema = z.object({
  action: z.literal("reorder_provinces"),
  scope: z.enum(["region", "national"]),
  regionId: z.string().trim().min(1).optional(),
  orderedProvinceIds: z.array(z.string().trim().min(1)).min(1).max(100),
});

export const UpdateProvinceConfigSchema = z.object({
  action: z.literal("update_province"),
  id: z.string().trim().min(1),
  shortNameTh: z.string().trim().min(1).max(80).optional(),
  shortNameEn: z.string().trim().min(1).max(80).optional(),
  isTouristHub: z.boolean().optional(),
  isActive: z.boolean().optional(),
  centerLat: z.number().min(5).max(21).optional(),
  centerLng: z.number().min(97).max(106).optional(),
  southLat: z.number().min(5).max(21).optional(),
  westLng: z.number().min(97).max(106).optional(),
  northLat: z.number().min(5).max(21).optional(),
  eastLng: z.number().min(97).max(106).optional(),
  defaultZoom: z.number().min(5).max(16).optional(),
});

export const PatchLocationsSchema = z.discriminatedUnion("action", [
  ReorderRegionsSchema,
  ReorderProvincesSchema,
  UpdateProvinceConfigSchema,
]);

export type PatchLocationsPayload = z.infer<typeof PatchLocationsSchema>;
