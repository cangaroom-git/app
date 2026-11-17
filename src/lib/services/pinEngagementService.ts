import { prisma } from "@/lib/prisma";
import type { AppRole, PinCommentDto } from "@/types/cangaroom";

export async function togglePinLike(userId: string, pinId: string) {
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
}) {
  const { userId, pinId, boardId } = params;

  return prisma.$transaction(async (tx) => {
    const pin = await tx.pin.findUnique({
      where: { id: pinId },
      include: {
        room: { select: { weekdayPriceThb: true } },
        hotel: {
          select: {
            rooms: { where: { isActive: true }, select: { weekdayPriceThb: true } },
          },
        },
      },
    });
    if (!pin) {
      throw new Error("ไม่พบ Pin ที่ต้องการบันทึก");
    }

    let targetBoardId = boardId || null;
    if (!targetBoardId) {
      let defaultBoard = await tx.savedBoard.findFirst({
        where: { userId },
        orderBy: { createdAt: "asc" },
      });
      if (!defaultBoard) {
        defaultBoard = await tx.savedBoard.create({
          data: { userId, name: "ที่พักที่บันทึกไว้" },
        });
      }
      targetBoardId = defaultBoard.id;
    }

    const existingInTarget = await tx.savedBoardPin.findUnique({
      where: {
        boardId_pinId: { boardId: targetBoardId, pinId },
      },
    });

    if (existingInTarget) {
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
        boardId: targetBoardId,
      };
    }

    const existingAnyForUser = await tx.savedBoardPin.count({
      where: { userId, pinId },
    });

    const priceSnapshot =
      pin.room?.weekdayPriceThb ??
      (pin.hotel.rooms.length > 0
        ? Math.min(...pin.hotel.rooms.map((r) => r.weekdayPriceThb))
        : null);

    await tx.savedBoardPin.create({
      data: {
        boardId: targetBoardId,
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

    return {
      isSaved: true,
      boardId: targetBoardId,
    };
  });
}

