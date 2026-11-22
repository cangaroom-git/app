import { prisma } from "@/lib/prisma";
import type { AppRole, PinCommentDto } from "@/types/cangaroom";

export async function togglePinLike(
  userId: string,
  pinId: string,
  desiredLiked?: boolean
) {
  // Fast 1-round-trip atomic idempotent CTE when explicit desiredLiked is provided (zero interactive transaction RTTs!)
  if (typeof desiredLiked === "boolean") {
    if (desiredLiked) {
      const rows = await prisma.$queryRaw<Array<{ likesCount: number }>>`
        WITH ins AS (
          INSERT INTO "PinLike" ("userId", "pinId", "createdAt")
          VALUES (${userId}, ${pinId}, NOW())
          ON CONFLICT ("userId", "pinId") DO NOTHING
          RETURNING 1
        ),
        upd AS (
          UPDATE "Pin"
          SET "likesCount" = "likesCount" + (SELECT COUNT(*)::int FROM ins)
          WHERE "id" = ${pinId}
          RETURNING "likesCount"
        )
        SELECT "likesCount" FROM upd
      `;
      return {
        isLiked: true,
        likesCount: Math.max(0, Number(rows[0]?.likesCount ?? 0)),
      };
    }

    const rows = await prisma.$queryRaw<Array<{ likesCount: number }>>`
      WITH del AS (
        DELETE FROM "PinLike"
        WHERE "userId" = ${userId} AND "pinId" = ${pinId}
        RETURNING 1
      ),
      upd AS (
        UPDATE "Pin"
        SET "likesCount" = GREATEST(0, "likesCount" - (SELECT COUNT(*)::int FROM del))
        WHERE "id" = ${pinId}
        RETURNING "likesCount"
      )
      SELECT "likesCount" FROM upd
    `;
    return {
      isLiked: false,
      likesCount: Math.max(0, Number(rows[0]?.likesCount ?? 0)),
    };
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.pinLike.findUnique({
      where: { userId_pinId: { userId, pinId } },
    });

    if (existing) {
      await tx.pinLike.delete({
        where: { userId_pinId: { userId, pinId } },
      });
      const updated = await tx.pin.update({
        where: { id: pinId },
        data: { likesCount: { decrement: 1 } },
        select: { likesCount: true },
      });
      return {
        isLiked: false,
        likesCount: Math.max(0, updated.likesCount),
      };
    }

    await tx.pinLike.create({
      data: { userId, pinId },
    });
    const updated = await tx.pin.update({
      where: { id: pinId },
      data: { likesCount: { increment: 1 } },
      select: { likesCount: true },
    });
    return {
      isLiked: true,
      likesCount: updated.likesCount,
    };
  });
}

export async function addPinComment(params: {
  userId: string;
  pinId: string;
  body: string;
  parentId?: string | null;
}): Promise<PinCommentDto> {
  const { userId, pinId, body, parentId = null } = params;
  const trimmed = body.trim();
  if (!trimmed) {
    throw new Error("กรุณาพิมพ์ข้อความความคิดเห็น");
  }

  return prisma.$transaction(async (tx) => {
    const pin = await tx.pin.findUnique({
      where: { id: pinId },
      select: {
        id: true,
        hotel: { select: { ownerId: true } },
      },
    });
    if (!pin) {
      throw new Error("ไม่พบ Pin ที่ต้องการแสดงความคิดเห็น");
    }

    if (parentId) {
      const parentExists = await tx.pinComment.findFirst({
        where: { id: parentId, pinId, status: "VISIBLE" },
        select: { id: true },
      });
      if (!parentExists) {
        throw new Error("ไม่พบความคิดเห็นหลักที่ต้องการตอบกลับ");
      }
    }

    const isHotelOwnerReply = pin.hotel.ownerId === userId;

    const created = await tx.pinComment.create({
      data: {
        pinId,
        userId,
        parentId,
        isHotelOwnerReply,
        body: trimmed,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, avatarUrl: true },
        },
      },
    });

    await tx.pin.update({
      where: { id: pinId },
      data: { commentsCount: { increment: 1 } },
    });

    return {
      id: created.id,
      pinId: created.pinId,
      userId: created.userId,
      authorName: created.user.name || created.user.email.split("@")[0],
      authorAvatar: created.user.avatarUrl,
      parentId: created.parentId,
      isHotelOwnerReply: created.isHotelOwnerReply,
      body: created.body,
      likesCount: created.likesCount,
      createdAt: created.createdAt.toISOString(),
      replies: [],
    };
  });
}

export async function deletePinComment(params: {
  userId: string;
  userRole: AppRole;
  commentId: string;
}) {
  const { userId, userRole, commentId } = params;

  return prisma.$transaction(async (tx) => {
    const comment = await tx.pinComment.findUnique({
      where: { id: commentId },
      select: {
        id: true,
        pinId: true,
        userId: true,
        status: true,
        pin: { select: { hotel: { select: { ownerId: true } } } },
      },
    });

    if (!comment || comment.status === "DELETED") {
      throw new Error("ไม่พบความคิดเห็นนี้");
    }

    const canDelete =
      userRole === "SUPER_ADMIN" ||
      comment.userId === userId ||
      comment.pin.hotel.ownerId === userId;

    if (!canDelete) {
      throw new Error("คุณไม่มีสิทธิ์ลบความคิดเห็นนี้");
    }

    await tx.pinComment.update({
      where: { id: commentId },
      data: { status: "DELETED" },
    });

    await tx.pin.update({
      where: { id: comment.pinId },
      data: { commentsCount: { decrement: 1 } },
    });

    return { deletedId: commentId };
  });
}

export async function recordPinShare(params: {
  pinId: string;
  userId?: string | null;
  channel?: "LINE" | "FACEBOOK" | "COPY_LINK" | "WEB_SHARE" | "OTHER";
}) {
  const { pinId, userId = null, channel = "COPY_LINK" } = params;
  return prisma.$transaction(async (tx) => {
    await tx.pinShare.create({
      data: { pinId, userId, channel },
    });
    const updated = await tx.pin.update({
      where: { id: pinId },
      data: { sharesCount: { increment: 1 } },
      select: { sharesCount: true },
    });
    return { sharesCount: updated.sharesCount };
  });
}

export async function toggleSavePinToBoard(params: {
  userId: string;
  pinId: string;
  boardId?: string | null;
  action?: "toggle" | "save" | "unsave" | "move";
  fromBoardId?: string | null;
}) {
  const {
    userId,
    pinId,
    boardId,
    action = "toggle",
    fromBoardId = null,
  } = params;

  return prisma.$transaction(async (tx) => {
    const pin = await tx.pin.findUnique({
      where: { id: pinId },
      include: {
        room: { select: { weekdayPriceThb: true } },
        coupon: {
          select: { id: true, isActive: true, expiresAt: true, totalQuota: true, claimedCount: true },
        },
        hotel: {
          select: {
            rooms: { where: { isActive: true }, select: { weekdayPriceThb: true } },
            coupons: {
              where: { isActive: true, expiresAt: { gt: new Date() } },
              orderBy: [{ isFeaturedDeal: "desc" }, { discountValue: "desc" }],
              take: 1,
              select: { id: true, isActive: true, expiresAt: true, totalQuota: true, claimedCount: true },
            },
          },
        },
      },
    });
    if (!pin) {
      throw new Error("ไม่พบ Pin ที่ต้องการบันทึก");
    }

    const priceSnapshot =
      pin.room?.weekdayPriceThb ??
      (pin.hotel.rooms.length > 0
        ? Math.min(...pin.hotel.rooms.map((r) => r.weekdayPriceThb))
        : null);

    // Explicit UNSAVE (from specific board if provided, otherwise from all of user's boards)
    if (action === "unsave") {
      const hadAnyBefore = await tx.savedBoardPin.count({
        where: { userId, pinId },
      });
      await tx.savedBoardPin.deleteMany({
        where: boardId
          ? { userId, pinId, boardId }
          : { userId, pinId },
      });
      const remainingCount = await tx.savedBoardPin.count({
        where: { userId, pinId },
      });
      if (hadAnyBefore > 0 && remainingCount === 0) {
        await tx.pin.update({
          where: { id: pinId },
          data: { savesCount: { decrement: 1 } },
        });
      }
      return {
        isSaved: remainingCount > 0,
        boardId: null as string | null,
        boardName: null as string | null,
      };
    }

    // Explicit MOVE from one board to another (e.g. clicking "Change" on the Saved toast)
    if (action === "move" && boardId) {
      const targetBoard = await tx.savedBoard.findFirst({
        where: { id: boardId, userId },
        select: { id: true, name: true },
      });
      if (!targetBoard) {
        throw new Error("ไม่พบบอร์ดปลายทาง");
      }

      if (fromBoardId && fromBoardId !== targetBoard.id) {
        await tx.savedBoardPin.deleteMany({
          where: { userId, pinId, boardId: fromBoardId },
        });
      }

      const existingInTarget = await tx.savedBoardPin.findUnique({
        where: {
          boardId_pinId: { boardId: targetBoard.id, pinId },
        },
      });
      if (!existingInTarget) {
        const hadAny = await tx.savedBoardPin.count({
          where: { userId, pinId },
        });
        await tx.savedBoardPin.create({
          data: {
            boardId: targetBoard.id,
            pinId,
            userId,
            savedPriceSnapshotThb: priceSnapshot,
          },
        });
        if (hadAny === 0) {
          await tx.pin.update({
            where: { id: pinId },
            data: { savesCount: { increment: 1 } },
          });
        }
      }

      return {
        isSaved: true,
        boardId: targetBoard.id,
        boardName: targetBoard.name,
      };
    }

    // Default TOGGLE with no boardId: if already saved in ANY board, remove cleanly!
    if (action === "toggle" && !boardId) {
      const existingAny = await tx.savedBoardPin.findMany({
        where: { userId, pinId },
        select: { id: true },
      });
      if (existingAny.length > 0) {
        await tx.savedBoardPin.deleteMany({
          where: { userId, pinId },
        });
        await tx.pin.update({
          where: { id: pinId },
          data: { savesCount: { decrement: 1 } },
        });
        return {
          isSaved: false,
          boardId: null as string | null,
          boardName: null as string | null,
        };
      }
    }

    let targetBoard: { id: string; name: string } | null = null;
    if (boardId) {
      targetBoard = await tx.savedBoard.findFirst({
        where: { id: boardId, userId },
        select: { id: true, name: true },
      });
    }
    if (!targetBoard) {
      targetBoard = await tx.savedBoard.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true },
      });
      if (!targetBoard) {
        targetBoard = await tx.savedBoard.create({
          data: { userId, name: "ที่พักที่บันทึกไว้" },
          select: { id: true, name: true },
        });
      }
    }

    const existingInTarget = await tx.savedBoardPin.findUnique({
      where: {
        boardId_pinId: { boardId: targetBoard.id, pinId },
      },
    });

    if (existingInTarget && action === "toggle") {
      await tx.savedBoardPin.delete({
        where: { id: existingInTarget.id },
      });
      const remainingCount = await tx.savedBoardPin.count({
        where: { userId, pinId },
      });
      if (remainingCount === 0) {
        await tx.pin.update({
          where: { id: pinId },
          data: { savesCount: { decrement: 1 } },
        });
      }
      return {
        isSaved: remainingCount > 0,
        boardId: targetBoard.id,
        boardName: targetBoard.name,
      };
    }

    if (!existingInTarget) {
      const existingAnyForUser = await tx.savedBoardPin.count({
        where: { userId, pinId },
      });

      await tx.savedBoardPin.create({
        data: {
          boardId: targetBoard.id,
          pinId,
          userId,
          savedPriceSnapshotThb: priceSnapshot,
        },
      });

      if (existingAnyForUser === 0) {
        await tx.pin.update({
          where: { id: pinId },
          data: { savesCount: { increment: 1 } },
        });
      }
    }

    // Saving an Internal Coupon Pin also silently syncs its active coupon to UserCouponWallet
    // so the traveller's saved deal auto-applies cleanly on /{hotelSlug}/book without a separate wallet UI!
    const nowMs = Date.now();
    const candidateCoupon =
      pin.coupon &&
      pin.coupon.isActive &&
      pin.coupon.expiresAt.getTime() > nowMs &&
      (pin.coupon.totalQuota === null ||
        pin.coupon.claimedCount < pin.coupon.totalQuota)
        ? pin.coupon
        : pin.hotel.coupons[0] ?? null;

    if (pin.dealSourceType === "INTERNAL" && candidateCoupon) {
      const alreadyClaimed = await tx.userCouponWallet.findUnique({
        where: {
          userId_couponId: { userId, couponId: candidateCoupon.id },
        },
        select: { id: true },
      });
      if (!alreadyClaimed) {
        await tx.userCouponWallet.create({
          data: { userId, couponId: candidateCoupon.id },
        });
        await tx.coupon.update({
          where: { id: candidateCoupon.id },
          data: { claimedCount: { increment: 1 } },
        });
      }
    }

    return {
      isSaved: true,
      boardId: targetBoard.id,
      boardName: targetBoard.name,
    };
  });
}

