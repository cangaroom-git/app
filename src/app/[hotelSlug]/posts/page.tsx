import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, BadgeCheck, ChevronRight, Eye, MapPin } from "lucide-react";
import { listPublishedHotelPostsBySlug } from "@/lib/services/hotelPostService";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hotelSlug: string }>;
}): Promise<Metadata> {
  const { hotelSlug } = await params;
  const data = await listPublishedHotelPostsBySlug(hotelSlug);
  if (!data) {
    return { title: "ไม่พบบทความที่พัก | Nondii" };
  }

  return {
    title: `บทความและคู่มือท่องเที่ยว ${data.hotel.nameTh} (${data.hotel.provinceNameTh}) | Nondii`,
    description:
      data.hotel.taglineTh ||
      `รวมรีวิว คู่มือเที่ยว และเรื่องราวจาก ${data.hotel.nameTh} จ.${data.hotel.provinceNameTh} จองตรง 0% GP`,
    alternates: {
      canonical: `/${data.hotel.slug}/posts`,
    },
    openGraph: {
      title: `บทความจาก ${data.hotel.nameTh} | Nondii`,
      description: data.hotel.taglineTh,
      images: data.hotel.coverImageUrl ? [data.hotel.coverImageUrl] : undefined,
    },
  };
}

export default async function HotelBlogIndexPage({
  params,
}: {
  params: Promise<{ hotelSlug: string }>;
}) {
  const { hotelSlug } = await params;
  const data = await listPublishedHotelPostsBySlug(hotelSlug);
  if (!data) {
    notFound();
  }

  const { hotel, posts } = data;

  return (
    <div className="cgr-page-standard space-y-6">
      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 ty-caption">
        <Link href="/" className="hover:underline">
          หน้าแรก
        </Link>
        <span>/</span>
        <Link href={`/${hotel.slug}`} className="hover:underline font-semibold text-[var(--color-text-primary)]">
          {hotel.nameTh}
        </Link>
        <span>/</span>
        <span className="font-semibold text-[var(--color-text-primary)]">
          บทความและคู่มือท่องเที่ยว
        </span>
      </nav>

      {/* Resort Blog Header */}
      <header className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4 min-w-0">
          {hotel.logoUrl && (
            <img
              src={hotel.logoUrl}
              alt={hotel.nameTh}
              className="h-14 w-14 rounded-full object-cover shrink-0 border border-[var(--color-border)] bg-[var(--color-background-muted)]"
            />
          )}
          <div className="min-w-0 space-y-1">
            <h1 className="ty-display flex items-center gap-2">
              <span className="truncate">บทความจาก {hotel.nameTh}</span>
              {hotel.verificationStatus === "VERIFIED" && (
                <BadgeCheck className="w-5 h-5 text-[var(--color-text-primary)] shrink-0" />
              )}
            </h1>
            <p className="ty-caption flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span>
                {hotel.districtTh} จ.{hotel.provinceNameTh} · {posts.length} บทความ
              </span>
            </p>
          </div>
        </div>

        <Link
          href={`/${hotel.slug}`}
          className="btn-fw-secondary shrink-0 inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>กลับหน้าโปรไฟล์ที่พัก</span>
        </Link>
      </header>

      {/* Posts Grid */}
      {posts.length === 0 ? (
        <div className="rounded-[20px] bg-[var(--color-background-muted)] p-12 text-center space-y-3">
          <h2 className="ty-title">ยังไม่มีบทความเผยแพร่ในขณะนี้</h2>
          <p className="ty-body text-[var(--color-text-secondary)]">
            ชมภาพบรรยากาศและเช็กห้องว่างของ {hotel.nameTh} ได้ที่หน้าหลักของที่พัก
          </p>
          <Link href={`/${hotel.slug}`} className="btn-round-solid inline-flex">
            ดูห้องพักว่าง
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {posts.map((post, idx) => (
            <article
              key={post.id}
              className="h-full rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] overflow-hidden flex flex-col justify-between"
            >
              <div>
                <Link
                  href={`/${hotel.slug}/posts/${post.slug}`}
                  prefetch={false}
                  className="block relative h-48 bg-[var(--color-background-muted)] overflow-hidden"
                >
                  <img
                    src={post.coverImageUrl}
                    alt={post.titleTh}
                    loading={idx < 3 ? "eager" : "lazy"}
                    decoding="async"
                    className="h-full w-full object-cover"
                  />
                  <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/65 backdrop-blur-md text-white text-[11px] font-semibold">
                    {post.categoryTh}
                  </span>
                </Link>

                <div className="p-4 sm:p-5 space-y-2.5">
                  <div className="flex items-center justify-between gap-2 text-[12px] text-[var(--color-text-secondary)]">
                    <span>
                      {new Date(post.publishedAt).toLocaleDateString("th-TH", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5" />
                      {post.viewsCount}
                    </span>
                  </div>

                  <Link href={`/${hotel.slug}/posts/${post.slug}`} className="block group">
                    <h2 className="ty-subtitle font-bold leading-snug group-hover:underline line-clamp-2">
                      {post.titleTh}
                    </h2>
                  </Link>

                  <p className="ty-caption line-clamp-3">{post.excerptTh}</p>
                </div>
              </div>

              <div className="px-4 sm:px-5 pb-4 pt-3 border-t border-[var(--color-border)]/70 flex items-center justify-between gap-2">
                {post.roomCode ? (
                  <span className="badge-accent">
                    ห้อง {post.roomCode} · ฿{post.roomPriceThb?.toLocaleString()}
                  </span>
                ) : (
                  <span className="ty-caption">{hotel.provinceNameTh}</span>
                )}

                <Link
                  href={`/${hotel.slug}/posts/${post.slug}`}
                  className="ty-caption font-bold text-[var(--color-accent)] inline-flex items-center gap-1 hover:underline"
                >
                  <span>อ่านบทความ</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

