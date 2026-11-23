import { NextResponse } from "next/server";
import { getServerSessionUser } from "@/lib/auth/session";
import { revalidateLocationConfigs } from "@/lib/cache/revalidateNondii";
import { prisma } from "@/lib/prisma";
import { PatchLocationsSchema } from "@/lib/schemas/location.schema";
import { getAdminLocationCatalog } from "@/lib/services/locationConfigService";

async function requireSuperAdmin() {
  const user = await getServerSessionUser();
  if (!user) {
    return {
      error: NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 }),
    };
  }
  if (user.role !== "SUPER_ADMIN") {
    return {
      error: NextResponse.json(
        { error: "เฉพาะผู้ดูแลระบบสูงสุด (Super Admin) เท่านั้น" },
        { status: 403 }
      ),
    };
  }
  return { user };
}

export async function GET() {
  try {
    const guard = await requireSuperAdmin();
    if ("error" in guard) return guard.error;

    const catalog = await getAdminLocationCatalog();
    return NextResponse.json(catalog);
  } catch (err) {
    console.error("[GET /api/super-admin/locations]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดข้อมูลภาคและจังหวัดได้" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = await requireSuperAdmin();
    if ("error" in guard) return guard.error;

    const raw = await request.json();
    const parsed = PatchLocationsSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message || "ข้อมูลภาค/จังหวัดไม่ถูกต้อง",
        },
        { status: 422 }
      );
    }

    const payload = parsed.data;

    if (payload.action === "reorder_regions") {
      const uniqueIds = Array.from(new Set(payload.orderedRegionIds));
      await prisma.$transaction(
        uniqueIds.map((id, idx) =>
          prisma.regionConfig.update({
            where: { id },
            data: { sortOrder: idx },
          })
        )
      );
      revalidateLocationConfigs();
      return NextResponse.json({ success: true, orderedRegionIds: uniqueIds });
    }

    if (payload.action === "reorder_provinces") {
      const uniqueIds = Array.from(new Set(payload.orderedProvinceIds));
      if (payload.scope === "national") {
        await prisma.$transaction(
          uniqueIds.map((id, idx) =>
            prisma.provinceConfig.update({
              where: { id },
              data: { nationalSortOrder: idx },
            })
          )
        );
      } else {
        await prisma.$transaction(
          uniqueIds.map((id, idx) =>
            prisma.provinceConfig.update({
              where: { id },
              data: { regionSortOrder: idx },
            })
          )
        );
      }
      revalidateLocationConfigs();
      return NextResponse.json({
        success: true,
        scope: payload.scope,
        orderedProvinceIds: uniqueIds,
      });
    }

    const { action: _action, id, ...updates } = payload;
    void _action;

    const updated = await prisma.provinceConfig.update({
      where: { id },
      data: updates,
    });

    revalidateLocationConfigs();
    return NextResponse.json({ success: true, province: updated });
  } catch (err) {
    console.error("[PATCH /api/super-admin/locations]", err);
    return NextResponse.json(
      { error: "บันทึกการจัดลำดับจังหวัดไม่สำเร็จ" },
      { status: 400 }
    );
  }
}
