import { prisma } from "@/lib/prisma";
import { getServerSessionUser, type ServerAuthUser } from "@/lib/auth/session";

export interface AuthorizedHotelContext {
  user: ServerAuthUser;
  hotel: {
    id: string;
    slug: string;
    ownerId: string;
    nameTh: string;
    nameEn: string;
    provinceId: string;
    stayStyles: string[];
    verificationStatus: "PENDING_REVIEW" | "VERIFIED" | "SUSPENDED";
  };
}

export async function requireHotelStudioAccess(
  requestedHotelSlug?: string | null
): Promise<AuthorizedHotelContext> {
  const user = await getServerSessionUser();
  if (!user) {
    throw new StudioAuthError("กรุณาเข้าสู่ระบบก่อนจัดการที่พัก", 401);
  }

  const normalizedSlug = requestedHotelSlug?.trim().toLowerCase();

  const hotel = normalizedSlug
    ? await prisma.hotel.findUnique({
        where: { slug: normalizedSlug },
        select: {
          id: true,
          slug: true,
          ownerId: true,
          nameTh: true,
          nameEn: true,
          provinceId: true,
          stayStyles: true,
          verificationStatus: true,
        },
      })
    : await prisma.hotel.findFirst({
        where: user.role === "SUPER_ADMIN" ? {} : { ownerId: user.id },
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          slug: true,
          ownerId: true,
          nameTh: true,
          nameEn: true,
          provinceId: true,
          stayStyles: true,
          verificationStatus: true,
        },
      });

  if (!hotel) {
    throw new StudioAuthError("ยังไม่มีโปรไฟล์ที่พักในบัญชีนี้", 404);
  }

  if (user.role !== "SUPER_ADMIN" && hotel.ownerId !== user.id) {
    throw new StudioAuthError("คุณไม่มีสิทธิ์จัดการข้อมูลของที่พักแห่งนี้", 403);
  }

  return { user, hotel };
}

export class StudioAuthError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 403) {
    super(message);
    this.statusCode = statusCode;
  }
}

