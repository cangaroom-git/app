import { NextResponse } from "next/server";
import { z } from "zod";
import {
  requireHotelStudioAccess,
  StudioAuthError,
} from "@/lib/auth/studioAccess";
import { prisma } from "@/lib/prisma";
import {
  runFacebookPageSyncBatch,
  type RawFacebookPostInput,
} from "@/lib/services/facebookSyncService";

const ConnectAndSyncSchema = z.object({
  hotelSlug: z.string().optional(),
  externalPageId: z.string().trim().min(1).max(120),
  externalPageName: z.string().trim().min(1).max(160),
  pageUrl: z.string().trim().max(300).optional(),
  graphAccessToken: z.string().trim().optional(),
  posts: z
    .array(
      z.object({
        externalPostId: z.string().trim().min(1),
        message: z.string().trim(),
        imageUrl: z.string().trim().optional().nullable(),
        videoUrl: z.string().trim().optional().nullable(),
        permalinkUrl: z.string().trim().optional().nullable(),
      })
    )
    .optional(),
});

async function fetchPostsFromMetaGraph(
  pageId: string,
  accessToken: string
): Promise<RawFacebookPostInput[]> {
  const endpoint = `https://graph.facebook.com/v21.0/${encodeURIComponent(
    pageId
  )}/posts?fields=id,message,full_picture,permalink_url,attachments{media_type,media}&limit=12&access_token=${encodeURIComponent(
    accessToken
  )}`;

  const res = await fetch(endpoint, { cache: "no-store" });
  if (!res.ok) {
    throw new Error("ไม่สามารถดึงโพสต์จาก Facebook Graph API ได้ (กรุณาเช็ก Token/Page ID)");
  }
  const payload = (await res.json()) as {
    data?: Array<{
      id: string;
      message?: string;
      full_picture?: string;
      permalink_url?: string;
    }>;
  };

  return (payload.data || []).map((item) => ({
    externalPostId: item.id,
    message: item.message || "",
    imageUrl: item.full_picture || null,
    permalinkUrl: item.permalink_url || null,
  }));
}

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const parsed = ConnectAndSyncSchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "กรุณาระบุชื่อและรหัสเพจ Facebook ให้ครบถ้วน" },
        { status: 422 }
      );
    }

    const { hotel } = await requireHotelStudioAccess(parsed.data.hotelSlug);

    const connection = await prisma.socialConnection.upsert({
      where: {
        hotelId_platform_externalPageId: {
          hotelId: hotel.id,
          platform: "FACEBOOK",
          externalPageId: parsed.data.externalPageId,
        },
      },
      update: {
        externalPageName: parsed.data.externalPageName,
        pageUrl: parsed.data.pageUrl || null,
      },
      create: {
        hotelId: hotel.id,
        platform: "FACEBOOK",
        externalPageId: parsed.data.externalPageId,
        externalPageName: parsed.data.externalPageName,
        pageUrl: parsed.data.pageUrl || null,
        publishMode: "ONE_CLICK_APPROVE",
      },
    });

    let postsToProcess: RawFacebookPostInput[] = parsed.data.posts || [];

    if (postsToProcess.length === 0 && parsed.data.graphAccessToken) {
      postsToProcess = await fetchPostsFromMetaGraph(
        parsed.data.externalPageId,
        parsed.data.graphAccessToken
      );
    }

    // If Studio user clicks "ซิงก์ทดสอบตัวอย่างเพจ" without a live Meta token, process realistic Thai Facebook page posts through the real 3-Tier Triage engine & write to DB
    if (postsToProcess.length === 0) {
      const ts = Date.now();
      postsToProcess = [
        {
          externalPostId: `fb-sync-photo-${ts}`,
          message: `บรรยากาศมุมสระน้ำและหมอกยามเช้าที่ ${hotel.nameTh} อากาศดีมากพร้อมต้อนรับลูกค้าทุกท่านครับ`,
          imageUrl:
            "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=85",
          permalinkUrl: parsed.data.pageUrl || "https://facebook.com",
        },
        {
          externalPostId: `fb-sync-meme-${ts}`,
          message: "สวัสดีวันจันทร์ แชร์ข่าวสภาพจราจรและมุกตลกคลายเครียดช่วงบ่ายครับ ฮาๆ",
          imageUrl:
            "https://images.unsplash.com/photo-1504711434969-e33886168f5c?auto=format&fit=crop&w=800&q=60",
          permalinkUrl: parsed.data.pageUrl || "https://facebook.com",
        },
      ];
    }

    const syncedPins = await runFacebookPageSyncBatch({
      hotelId: hotel.id,
      posts: postsToProcess,
    });

    return NextResponse.json({
      connection,
      syncedCount: syncedPins.length,
      pins: syncedPins,
    });
  } catch (err) {
    if (err instanceof StudioAuthError) {
      return NextResponse.json({ error: err.message }, { status: err.statusCode });
    }
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "ซิงก์โพสต์จาก Facebook Page ไม่สำเร็จ",
      },
      { status: 400 }
    );
  }
}

