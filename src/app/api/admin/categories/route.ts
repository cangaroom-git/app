import { NextResponse } from "next/server";
import { z } from "zod";
import { requireSuperAdminApi } from "@/lib/admin/requireAdmin";
import { revalidatePlaceCatalog } from "@/lib/cache/revalidateNondii";
import { prisma } from "@/lib/prisma";

const DEFAULT_CATEGORIES = [
  {
    code: "STAY",
    slug: "stay",
    labelTh: "ที่พัก & โรงแรม",
    labelEn: "Stays & Hotels",
    shortLabelTh: "ที่พัก",
    shortLabelEn: "Stays",
    descriptionTh: "โรงแรม รีสอร์ต พูลวิลล่า และที่พักจองตรง 0% GP ทั่วไทย",
    crestBgHex: "#5369A6",
    iconKey: "BedDouble",
    schemaOrgType: "LodgingBusiness",
    defaultCtaTh: "จองตรง 0% GP",
    defaultCtaEn: "Book Direct",
    defaultMerchantMode: "DIRECT_BOOKING" as const,
    level: 1,
    position: 0,
    isActive: true,
    isSystem: true,
    children: [
      { code: "POOL_VILLA", slug: "pool-villa", labelTh: "พูลวิลล่า", labelEn: "Pool Villas", position: 0 },
      { code: "RESORT", slug: "resort", labelTh: "รีสอร์ต & บูติก", labelEn: "Resorts", position: 1 },
      { code: "GLAMPING", slug: "glamping", labelTh: "แกลมปิ้ง & เคบิน", labelEn: "Glamping", position: 2 },
    ],
  },
  {
    code: "CAFE",
    slug: "cafe",
    labelTh: "คาเฟ่",
    labelEn: "Cafes",
    shortLabelTh: "คาเฟ่",
    shortLabelEn: "Cafes",
    descriptionTh: "คาเฟ่กาแฟสเปเชียลตี้ เบเกอรี และคาเฟ่วิวสวยน่าแวะ",
    crestBgHex: "#D47E35",
    iconKey: "Coffee",
    schemaOrgType: "CafeOrCoffeeShop",
    defaultCtaTh: "ดูโปรคาเฟ่",
    defaultCtaEn: "View Cafe Deal",
    defaultMerchantMode: "PROFILE_ONLY" as const,
    level: 1,
    position: 1,
    isActive: true,
    isSystem: true,
    children: [
      { code: "SPECIALTY_COFFEE", slug: "specialty-coffee", labelTh: "กาแฟสเปเชียลตี้", labelEn: "Specialty Coffee", position: 0 },
      { code: "SCENIC_CAFE", slug: "scenic-cafe", labelTh: "คาเฟ่วิวธรรมชาติ", labelEn: "Scenic Cafes", position: 1 },
    ],
  },
  {
    code: "RESTAURANT",
    slug: "dining-bar",
    labelTh: "ร้านอาหาร & บาร์",
    labelEn: "Dining & Bars",
    shortLabelTh: "อาหาร & บาร์",
    shortLabelEn: "Dining & Bars",
    descriptionTh: "บุฟเฟ่ต์โรงแรม ร้านอาหารดัง รูฟท็อปบาร์ และบีชคลับ",
    crestBgHex: "#C6566E",
    iconKey: "UtensilsCrossed",
    schemaOrgType: "Restaurant",
    defaultCtaTh: "ดูโปร & เมนู",
    defaultCtaEn: "View Dining Deal",
    defaultMerchantMode: "PROFILE_ONLY" as const,
    level: 1,
    position: 2,
    isActive: true,
    isSystem: true,
    children: [
      { code: "HOTEL_BUFFET", slug: "hotel-buffet", labelTh: "บุฟเฟ่ต์โรงแรม", labelEn: "Hotel Buffets", position: 0 },
      { code: "ROOFTOP_BAR", slug: "rooftop-bar", labelTh: "รูฟท็อป & บีชคลับ", labelEn: "Rooftop & Beach Clubs", position: 1 },
      { code: "LOCAL_DINING", slug: "local-dining", labelTh: "ร้านเด็ดท้องถิ่น", labelEn: "Local Gems", position: 2 },
    ],
  },
  {
    code: "WELLNESS",
    slug: "wellness",
    labelTh: "สปา & เวลเนส",
    labelEn: "Spa & Wellness",
    shortLabelTh: "สปา",
    shortLabelEn: "Wellness",
    descriptionTh: "สปาโรงแรม นวดไทย ออนเซ็น และแพ็กเกจผ่อนคลาย",
    crestBgHex: "#3A8D9A",
    iconKey: "Sparkles",
    schemaOrgType: "HealthAndBeautyBusiness",
    defaultCtaTh: "ดูแพ็กเกจสปา",
    defaultCtaEn: "View Spa Deal",
    defaultMerchantMode: "PROFILE_ONLY" as const,
    level: 1,
    position: 3,
    isActive: false,
    isSystem: true,
    children: [
      { code: "ONSEN_SPA", slug: "onsen-spa", labelTh: "ออนเซ็น & สปาโรงแรม", labelEn: "Onsen & Hotel Spa", position: 0 },
    ],
  },
  {
    code: "ATTRACTION",
    slug: "attraction",
    labelTh: "กิจกรรม & ที่เที่ยว",
    labelEn: "Activities & Attractions",
    shortLabelTh: "กิจกรรม",
    shortLabelEn: "Activities",
    descriptionTh: "สวนน้ำ ล่องเรือดินเนอร์ ทัวร์เกาะ และบัตรเข้าชม",
    crestBgHex: "#529D48",
    iconKey: "Compass",
    schemaOrgType: "TouristAttraction",
    defaultCtaTh: "ดูบัตร & กิจกรรม",
    defaultCtaEn: "View Activity",
    defaultMerchantMode: "PROFILE_ONLY" as const,
    level: 1,
    position: 4,
    isActive: false,
    isSystem: true,
    children: [
      { code: "WATERPARK_TOUR", slug: "waterpark-tour", labelTh: "สวนน้ำ & ทัวร์เกาะ", labelEn: "Waterparks & Tours", position: 0 },
    ],
  },
];

async function ensureDefaultCategoriesSeeded() {
  const existingCount = await prisma.placeCategoryConfig.count();
  if (existingCount > 0) return;

  for (const root of DEFAULT_CATEGORIES) {
    const parent = await prisma.placeCategoryConfig.create({
      data: {
        code: root.code,
        slug: root.slug,
        labelTh: root.labelTh,
        labelEn: root.labelEn,
        shortLabelTh: root.shortLabelTh,
        shortLabelEn: root.shortLabelEn,
        descriptionTh: root.descriptionTh,
        crestBgHex: root.crestBgHex,
        iconKey: root.iconKey,
        schemaOrgType: root.schemaOrgType,
        defaultCtaTh: root.defaultCtaTh,
        defaultCtaEn: root.defaultCtaEn,
        defaultMerchantMode: root.defaultMerchantMode,
        level: root.level,
        position: root.position,
        isActive: root.isActive,
        isSystem: root.isSystem,
      },
    });

    for (const child of root.children) {
      await prisma.placeCategoryConfig.create({
        data: {
          code: child.code,
          slug: child.slug,
          labelTh: child.labelTh,
          labelEn: child.labelEn,
          shortLabelTh: child.labelTh,
          shortLabelEn: child.labelEn,
          crestBgHex: root.crestBgHex,
          iconKey: root.iconKey,
          schemaOrgType: root.schemaOrgType,
          defaultCtaTh: root.defaultCtaTh,
          defaultCtaEn: root.defaultCtaEn,
          defaultMerchantMode: root.defaultMerchantMode,
          level: 2,
          position: child.position,
          isActive: true,
          isSystem: false,
          parentId: parent.id,
        },
      });
    }
  }
}

const CreateCategorySchema = z.object({
  code: z.string().trim().min(2).max(40),
  slug: z.string().trim().min(2).max(50),
  labelTh: z.string().trim().min(1).max(80),
  labelEn: z.string().trim().min(1).max(80),
  shortLabelTh: z.string().trim().max(40).optional().default(""),
  descriptionTh: z.string().trim().max(260).optional().default(""),
  crestBgHex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).default("#1e78d6"),
  schemaOrgType: z.string().trim().max(60).default("LocalBusiness"),
  defaultCtaTh: z.string().trim().max(60).default("ดูโปรโมชั่น"),
  parentId: z.string().trim().nullable().optional(),
  isActive: z.boolean().default(true),
});

const PatchCategorySchema = z.union([
  z.object({
    action: z.literal("REORDER"),
    orderedIds: z.array(z.string().trim().min(1)).min(1),
  }),
  z.object({
    id: z.string().trim().min(1),
    labelTh: z.string().trim().min(1).max(80).optional(),
    labelEn: z.string().trim().min(1).max(80).optional(),
    shortLabelTh: z.string().trim().max(40).optional(),
    descriptionTh: z.string().trim().max(260).optional(),
    crestBgHex: z.string().trim().regex(/^#[0-9a-fA-F]{6}$/).optional(),
    defaultCtaTh: z.string().trim().max(60).optional(),
    isActive: z.boolean().optional(),
  }),
]);

export async function GET() {
  const guard = await requireSuperAdminApi();
  if ("error" in guard) return guard.error;

  try {
    await ensureDefaultCategoriesSeeded();

    const [categories, hotelCounts] = await Promise.all([
      prisma.placeCategoryConfig.findMany({
        orderBy: [{ level: "asc" }, { position: "asc" }, { createdAt: "asc" }],
      }),
      prisma.hotel.groupBy({
        by: ["placeCategory"],
        _count: { _all: true },
      }),
    ]);

    const countByCode = new Map<string, number>(
      hotelCounts.map((row) => [row.placeCategory, row._count._all])
    );

    return NextResponse.json({
      categories: categories.map((c) => ({
        ...c,
        placesCount: countByCode.get(c.code) ?? 0,
      })),
    });
  } catch (err) {
    console.error("[GET /api/admin/categories]", err);
    return NextResponse.json(
      { error: "ไม่สามารถโหลดหมวดหมู่ได้" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const guard = await requireSuperAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const raw = await request.json();
    const parsed = CreateCategorySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "กรุณากรอกข้อมูลหมวดหมู่ให้ครบและถูกต้อง" },
        { status: 422 }
      );
    }

    const d = parsed.data;
    let level = 1;
    if (d.parentId) {
      const parent = await prisma.placeCategoryConfig.findUnique({
        where: { id: d.parentId },
        select: { level: true },
      });
      if (!parent) {
        return NextResponse.json({ error: "ไม่พบหมวดหมู่หลัก" }, { status: 404 });
      }
      if (parent.level >= 3) {
        return NextResponse.json(
          { error: "จำกัดความลึกหมวดหมู่สูงสุด 3 ระดับ" },
          { status: 400 }
        );
      }
      level = parent.level + 1;
    }

    const siblingCount = await prisma.placeCategoryConfig.count({
      where: { parentId: d.parentId ?? null },
    });

    const created = await prisma.placeCategoryConfig.create({
      data: {
        code: d.code.toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
        slug: d.slug.toLowerCase().replace(/[^a-z0-9-]/g, "-"),
        labelTh: d.labelTh,
        labelEn: d.labelEn,
        shortLabelTh: d.shortLabelTh || d.labelTh,
        shortLabelEn: d.labelEn,
        descriptionTh: d.descriptionTh,
        crestBgHex: d.crestBgHex,
        schemaOrgType: d.schemaOrgType,
        defaultCtaTh: d.defaultCtaTh,
        level,
        position: siblingCount,
        parentId: d.parentId ?? null,
        isActive: d.isActive,
        isSystem: false,
      },
    });

    revalidatePlaceCatalog({ includeCategories: true });
    return NextResponse.json({ success: true, category: created });
  } catch (err) {
    console.error("[POST /api/admin/categories]", err);
    return NextResponse.json(
      { error: "สร้างหมวดหมู่ไม่สำเร็จ (รหัสหรือ slug อาจซ้ำ)" },
      { status: 400 }
    );
  }
}

export async function PATCH(request: Request) {
  const guard = await requireSuperAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const raw = await request.json();
    const parsed = PatchCategorySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    if ("action" in parsed.data && parsed.data.action === "REORDER") {
      await prisma.$transaction(
        parsed.data.orderedIds.map((id, idx) =>
          prisma.placeCategoryConfig.update({
            where: { id },
            data: { position: idx },
          })
        )
      );
      revalidatePlaceCatalog({ includeCategories: true });
      return NextResponse.json({ success: true });
    }

    if (!("id" in parsed.data)) {
      return NextResponse.json({ error: "ข้อมูลไม่ถูกต้อง" }, { status: 422 });
    }

    const { id, ...fields } = parsed.data;
    const updated = await prisma.placeCategoryConfig.update({
      where: { id },
      data: fields,
    });

    revalidatePlaceCatalog({ includeCategories: true });
    return NextResponse.json({ success: true, category: updated });
  } catch (err) {
    console.error("[PATCH /api/admin/categories]", err);
    return NextResponse.json(
      { error: "อัปเดตหมวดหมู่ไม่สำเร็จ" },
      { status: 400 }
    );
  }
}

export async function DELETE(request: Request) {
  const guard = await requireSuperAdminApi();
  if ("error" in guard) return guard.error;

  try {
    const { searchParams } = new URL(request.url);
    const id = (searchParams.get("id") || "").trim();
    if (!id) {
      return NextResponse.json({ error: "Missing id" }, { status: 400 });
    }

    const target = await prisma.placeCategoryConfig.findUnique({
      where: { id },
      include: { _count: { select: { children: true } } },
    });
    if (!target) {
      return NextResponse.json({ error: "ไม่พบหมวดหมู่" }, { status: 404 });
    }
    if (target.isSystem) {
      return NextResponse.json(
        { error: "ไม่สามารถลบหมวดหมู่หลักของระบบได้ (ใช้ปุ่มปิดการแสดงผลแทน)" },
        { status: 400 }
      );
    }
    if (target._count.children > 0) {
      return NextResponse.json(
        { error: "กรุณาลบหมวดหมู่ย่อยภายใต้หมวดนี้ก่อน" },
        { status: 400 }
      );
    }

    await prisma.placeCategoryConfig.delete({ where: { id } });
    revalidatePlaceCatalog({ includeCategories: true });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/categories]", err);
    return NextResponse.json({ error: "ลบหมวดหมู่ไม่สำเร็จ" }, { status: 400 });
  }
}
