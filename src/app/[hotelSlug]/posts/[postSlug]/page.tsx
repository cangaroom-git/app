import React from "react";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  BadgeCheck,
  BedDouble,
  CalendarCheck,
  ChevronRight,
  Eye,
  MapPin,
  Tag,
} from "lucide-react";
import {
  getPublishedHotelPostDetail,
  incrementHotelPostViews,
} from "@/lib/services/hotelPostService";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ hotelSlug: string; postSlug: string }>;
}): Promise<Metadata> {
  const { hotelSlug, postSlug } = await params;
  const detail = await getPublishedHotelPostDetail(hotelSlug, postSlug);
  if (!detail) {
    return { title: "ไม่พบบทความ | Nondii" };
  }

  return {
    title: `${detail.post.titleTh} | ${detail.hotel.nameTh}`,
    description: detail.post.excerptTh,
    keywords: detail.post.tags,
    alternates: {
      canonical: `/${detail.hotel.slug}/posts/${detail.post.slug}`,
    },
    openGraph: {
      type: "article",
      title: detail.post.titleTh,
      description: detail.post.excerptTh,
      publishedTime: detail.post.publishedAt,
      images: [detail.post.coverImageUrl],
    },
  };
}

function renderInlineMarkdownSegments(line: string) {
  const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={idx} className="font-bold text-[var(--color-text-primary)]">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={idx}
          className="px-1.5 py-0.5 rounded-[6px] bg-[var(--color-promo-muted)] text-[var(--color-promo-text)] font-mono text-[13px] font-bold"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <React.Fragment key={idx}>{part}</React.Fragment>;
  });
}

function ArticleMarkdownBody({ content }: { content: string }) {
  const blocks = content
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return (
    <div className="space-y-4 text-[16px] leading-[1.75] text-[var(--color-text-primary)]">
      {blocks.map((block, bIdx) => {
        if (block.startsWith("### ")) {
          return (
            <h3 key={bIdx} className="ty-subtitle font-bold pt-2">
              {block.slice(4)}
            </h3>
          );
        }
        if (block.startsWith("## ")) {
          return (
            <h2 key={bIdx} className="ty-title font-bold pt-3">
              {block.slice(3)}
            </h2>
          );
        }
        const lines = block.split("\n").map((l) => l.trim());
        const isListBlock = lines.every(
          (l) => l.startsWith("- ") || /^\d+\.\s/.test(l)
        );
        if (isListBlock) {
          return (
            <ul key={bIdx} className="space-y-2 pl-5 list-disc">
              {lines.map((item, iIdx) => {
                const cleaned = item.replace(/^-\s+|^\d+\.\s+/, "");
                return (
                  <li key={iIdx} className="leading-relaxed">
                    {renderInlineMarkdownSegments(cleaned)}
                  </li>
                );
              })}
            </ul>
          );
        }

        return (
          <div key={bIdx} className="space-y-2">
            {lines.map((line, lIdx) => {
              if (line.startsWith("### ")) {
                return (
                  <h3 key={lIdx} className="ty-subtitle font-bold pt-2">
                    {line.slice(4)}
                  </h3>
                );
              }
              if (line.startsWith("## ")) {
                return (
                  <h2 key={lIdx} className="ty-title font-bold pt-3">
                    {line.slice(3)}
                  </h2>
                );
              }
              return <p key={lIdx}>{renderInlineMarkdownSegments(line)}</p>;
            })}
          </div>
        );
      })}
    </div>
  );
}

export default async function HotelPostDetailPage({
  params,
}: {
  params: Promise<{ hotelSlug: string; postSlug: string }>;
}) {
  const { hotelSlug, postSlug } = await params;
  const detail = await getPublishedHotelPostDetail(hotelSlug, postSlug);
  if (!detail) {
    notFound();
  }

  const { hotel, post, linkedRoom, relatedPosts } = detail;
  // Non-blocking view increment strictly on page render (not inside generateMetadata!)
  incrementHotelPostViews(post.id);

  const blogPostingJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.titleTh,
    description: post.excerptTh,
    image: [post.coverImageUrl, ...post.galleryUrls],
    datePublished: post.publishedAt,
    author: {
      "@type": "LodgingBusiness",
      name: hotel.nameTh,
    },
    publisher: {
      "@type": "Organization",
      name: "Nondii",
    },
    keywords: post.tags.join(", "),
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "หน้าแรก", item: "/" },
      {
        "@type": "ListItem",
        position: 2,
        name: hotel.nameTh,
        item: `/${hotel.slug}`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "บทความ",
        item: `/${hotel.slug}/posts`,
      },
      {
        "@type": "ListItem",
        position: 4,
        name: post.titleTh,
        item: `/${hotel.slug}/posts/${post.slug}`,
      },
    ],
  };

  return (
    <article className="cgr-page-reading space-y-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(blogPostingJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Breadcrumb */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 ty-caption">
        <Link href="/" className="hover:underline">
          หน้าแรก
        </Link>
        <span>/</span>
        <Link
          href={`/${hotel.slug}`}
          className="hover:underline font-semibold text-[var(--color-accent)]"
        >
          {hotel.nameTh}
        </Link>
        <span>/</span>
        <Link href={`/${hotel.slug}/posts`} className="hover:underline">
          บทความ
        </Link>
      </nav>

      {/* Article Header */}
      <header className="space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[var(--color-accent-muted)] text-[var(--color-accent)] text-[12px] font-bold">
            {post.categoryTh}
          </span>
          <span className="ty-caption">
            เผยแพร่{" "}
            {new Date(post.publishedAt).toLocaleDateString("th-TH", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <span className="ty-caption inline-flex items-center gap-1 ml-auto">
            <Eye className="w-3.5 h-3.5" />
            {post.viewsCount} ครั้ง
          </span>
        </div>

        <h1 className="text-[26px] sm:text-[32px] font-extrabold leading-tight tracking-tight text-[var(--color-text-primary)]">
          {post.titleTh}
        </h1>

        {post.excerptTh && (
          <p className="text-[17px] leading-relaxed text-[var(--color-text-secondary)]">
            {post.excerptTh}
          </p>
        )}

        {/* Author / Hotel Identity Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <Link
            href={`/${hotel.slug}`}
            className="flex items-center gap-3 group"
          >
            {hotel.logoUrl && (
              <img
                src={hotel.logoUrl}
                alt={hotel.nameTh}
                className="h-11 w-11 rounded-[12px] object-cover bg-[var(--color-background-muted)]"
              />
            )}
            <div>
              <p className="ty-body font-bold flex items-center gap-1.5 group-hover:underline">
                <span>{hotel.nameTh}</span>
                {hotel.verificationStatus === "VERIFIED" && (
                  <BadgeCheck className="w-4 h-4 text-[var(--color-accent)]" />
                )}
              </p>
              <p className="ty-caption flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>
                  {hotel.districtTh} จ.{hotel.provinceNameTh}
                </span>
              </p>
            </div>
          </Link>

          <Link
            href={`/${hotel.slug}/posts`}
            className="btn-fw-secondary !h-9 !px-3.5 ty-caption font-semibold inline-flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>บทความทั้งหมด</span>
          </Link>
        </div>
      </header>

      {/* Hero Cover Image */}
      <div className="rounded-[24px] overflow-hidden bg-[var(--color-background-muted)] aspect-square max-h-[540px] mx-auto w-full">
        <img
          src={post.coverImageUrl}
          alt={post.titleTh}
          className="h-full w-full object-cover"
        />
      </div>

      {/* Article Body */}
      <div className="rounded-[24px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-6 sm:p-8 space-y-6">
        <ArticleMarkdownBody content={post.contentTh} />

        {post.galleryUrls.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
            {post.galleryUrls.map((url, idx) => (
              <div
                key={idx}
                className="rounded-[20px] overflow-hidden aspect-square bg-[var(--color-background-muted)]"
              >
                <img
                  src={url}
                  alt={`${post.titleTh} ${idx + 1}`}
                  className="h-full w-full object-cover"
                />
              </div>
            ))}
          </div>
        )}

        {post.tags.length > 0 && (
          <div className="pt-4 border-t border-[var(--color-border)] flex flex-wrap items-center gap-2">
            <Tag className="w-4 h-4 text-[var(--color-text-secondary)]" />
            {post.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-3 py-1 rounded-full bg-[var(--color-background-muted)] ty-caption font-semibold"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Embedded 0% GP Direct Booking CTA Card */}
      <section className="rounded-[22px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          {(linkedRoom?.coverImageUrl || hotel.coverImageUrl) && (
            <img
              src={linkedRoom?.coverImageUrl || hotel.coverImageUrl || ""}
              alt={linkedRoom?.nameTh || hotel.nameTh}
              className="h-20 w-20 rounded-[18px] object-cover shrink-0 bg-[var(--color-background-muted)]"
            />
          )}
          <div className="min-w-0 space-y-1">
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-background-muted)] text-[var(--color-text-primary)] px-2.5 py-0.5 text-[11px] font-bold">
              <CalendarCheck className="w-3 h-3" />
              <span>จองตรง 0% GP กับที่พัก</span>
            </span>
            <h2 className="ty-subtitle font-bold truncate">
              {linkedRoom
                ? `${linkedRoom.nameTh} (${linkedRoom.code})`
                : hotel.nameTh}
            </h2>
            <p className="ty-caption">
              {linkedRoom
                ? `เริ่มต้น ฿${linkedRoom.weekdayPriceThb.toLocaleString()}/คืน · สูงสุด ${
                    linkedRoom.maxGuests
                  } ท่าน`
                : `เช็กห้องว่างและโอนจองตรงเข้าบัญชี ${hotel.nameTh}`}
            </p>
          </div>
        </div>

        <Link
          href={
            linkedRoom
              ? `/${hotel.slug}?room=${encodeURIComponent(linkedRoom.id)}`
              : `/${hotel.slug}#rooms-section`
          }
          className="btn-round-solid shrink-0 inline-flex items-center gap-2"
        >
          <BedDouble className="w-4 h-4" />
          <span>เช็กวันว่าง & จองห้องนี้</span>
          <ChevronRight className="w-4 h-4" />
        </Link>
      </section>

      {/* Related Stories */}
      {relatedPosts.length > 0 && (
        <section className="space-y-4">
          <h2 className="ty-title">บทความอื่นจาก {hotel.nameTh}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {relatedPosts.map((rp) => (
              <Link
                key={rp.id}
                href={`/${hotel.slug}/posts/${rp.slug}`}
                className="rounded-[22px] bg-[var(--color-background-card)] border border-[var(--color-border)] overflow-hidden flex flex-col hover:opacity-95 transition-opacity"
              >
                <img
                  src={rp.coverImageUrl}
                  alt={rp.titleTh}
                  className="aspect-square w-full object-cover bg-[var(--color-background-muted)]"
                />
                <div className="p-4 space-y-1.5">
                  <span className="ty-caption text-[var(--color-accent)] font-semibold">
                    {rp.categoryTh}
                  </span>
                  <h3 className="ty-body font-bold line-clamp-2">{rp.titleTh}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </article>
  );
}

