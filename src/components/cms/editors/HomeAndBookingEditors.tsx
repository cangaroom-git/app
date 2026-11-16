"use client";

import React, { useRef, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import {
  BookingPageCmsConfig,
  CmsStoryTargetTab,
  GalleryCmsConfig,
  HomeCmsConfig,
  HomeEditorialStoryItem,
  ManagedGalleryCategory,
  ManagedGalleryPhoto,
} from "@/data/cmsDefaults";
import { WhiteLabelPropertyConfig } from "@/data/rooms";
import { SapanStoreData } from "@/lib/store";
import { uploadOptimizedImage } from "@/lib/mediaUtils";
import { StandardButton } from "@/components/ui/standards";
import { CmsIconPicker } from "@/components/cms/CmsIconRegistry";
import {
  CMS_INPUT_CLASS,
  SmartImageUploader,
  SmartVideoLinkInput,
  ThaiFirstInput,
  ThaiFirstTextarea,
} from "@/components/cms/CmsFormPrimitives";

export interface EditorCommonProps {
  store: SapanStoreData;
  saveStore: (updater: (prev: SapanStoreData) => SapanStoreData) => void;
  onSaved: (message?: string) => void;
}

export function HomeHeroEditor({
  store,
  saveStore,
  onSaved,
}: EditorCommonProps) {
  const [heroImageUrl, setHeroImageUrl] = useState(
    store.cms.home.heroImageUrl
  );
  const [locationTh, setLocationTh] = useState(store.cms.home.heroLocationTh);
  const [locationEn, setLocationEn] = useState(store.cms.home.heroLocationEn);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveStore((prev) => ({
      ...prev,
      propertyConfig: {
        ...prev.propertyConfig,
        heroImageUrl: heroImageUrl.trim() || prev.propertyConfig.heroImageUrl,
      },
      cms: {
        ...prev.cms,
        home: {
          ...prev.cms.home,
          heroImageUrl: heroImageUrl.trim(),
          heroLocationTh: locationTh.trim(),
          heroLocationEn: locationEn.trim(),
        },
      },
    }));
    onSaved("บันทึกภาพปกหน้าแรกเรียบร้อยแล้ว");
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <SmartImageUploader
        label="ภาพปกหลักหน้าแรก (สัดส่วนแนวนอน 16:9)"
        imageUrl={heroImageUrl}
        onChangeUrl={setHeroImageUrl}
        folder="hero"
        aspectClassName="aspect-[16/9]"
        maxDimension={1920}
      />

      <ThaiFirstInput
        label="ป้ายพิกัดมุมซ้ายล่างของภาพ"
        valueTh={locationTh}
        valueEn={locationEn}
        onChangeTh={setLocationTh}
        onChangeEn={setLocationEn}
        placeholderTh="เช่น บ้านสะปัน จ.น่าน"
      />

      <StandardButton type="submit" variant="primary" size="lg" fullWidth>
        บันทึกการเปลี่ยนแปลง
      </StandardButton>
    </form>
  );
}

export function HomeManifestoEditor({
  store,
  saveStore,
  onSaved,
}: EditorCommonProps) {
  const [draft, setDraft] = useState<HomeCmsConfig>(store.cms.home);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveStore((prev) => ({
      ...prev,
      cms: {
        ...prev.cms,
        home: draft,
      },
    }));
    onSaved("บันทึกคำโปรยและจุดเด่นหน้าแรกเรียบร้อยแล้ว");
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      <ThaiFirstInput
        label="ป้ายคะแนน/คำโปรยเหนือหัวข้อหลัก"
        valueTh={draft.ratingBadgeTh}
        valueEn={draft.ratingBadgeEn}
        onChangeTh={(v) => setDraft({ ...draft, ratingBadgeTh: v })}
        onChangeEn={(v) => setDraft({ ...draft, ratingBadgeEn: v })}
      />

      <ThaiFirstInput
        label="หัวข้อหลักหน้าแรก (H1)"
        valueTh={draft.manifestoTitleTh}
        valueEn={draft.manifestoTitleEn}
        onChangeTh={(v) => setDraft({ ...draft, manifestoTitleTh: v })}
        onChangeEn={(v) => setDraft({ ...draft, manifestoTitleEn: v })}
      />

      <ThaiFirstTextarea
        label="คำบรรยายแนะนำที่พัก"
        valueTh={draft.manifestoDescTh}
        valueEn={draft.manifestoDescEn}
        onChangeTh={(v) => setDraft({ ...draft, manifestoDescTh: v })}
        onChangeEn={(v) => setDraft({ ...draft, manifestoDescEn: v })}
        rows={3}
      />

      <div className="pt-2 border-t border-[var(--color-border)] space-y-4">
        <h3 className="ty-subtitle">4 จุดเด่นไอคอน (Icon Pillars)</h3>
        {draft.pillars.map((pillar, idx) => (
          <div
            key={pillar.id}
            className="pt-3 border-t border-[var(--color-border)] first:border-t-0 first:pt-0 space-y-2.5"
          >
            <span className="ty-caption font-bold text-[var(--color-accent)] block">
              จุดเด่นที่ {idx + 1}
            </span>
            <CmsIconPicker
              value={pillar.iconKey}
              onChange={(nextKey) => {
                const nextPillars = [...draft.pillars];
                nextPillars[idx] = { ...pillar, iconKey: nextKey };
                setDraft({ ...draft, pillars: nextPillars });
              }}
            />
            <ThaiFirstInput
              label="หัวข้อสั้น"
              valueTh={pillar.titleTh}
              valueEn={pillar.titleEn}
              onChangeTh={(v) => {
                const nextPillars = [...draft.pillars];
                nextPillars[idx] = { ...pillar, titleTh: v };
                setDraft({ ...draft, pillars: nextPillars });
              }}
              onChangeEn={(v) => {
                const nextPillars = [...draft.pillars];
                nextPillars[idx] = { ...pillar, titleEn: v };
                setDraft({ ...draft, pillars: nextPillars });
              }}
            />
            <ThaiFirstInput
              label="คำอธิบาย 1 บรรทัด"
              valueTh={pillar.captionTh}
              valueEn={pillar.captionEn}
              onChangeTh={(v) => {
                const nextPillars = [...draft.pillars];
                nextPillars[idx] = { ...pillar, captionTh: v };
                setDraft({ ...draft, pillars: nextPillars });
              }}
              onChangeEn={(v) => {
                const nextPillars = [...draft.pillars];
                nextPillars[idx] = { ...pillar, captionEn: v };
                setDraft({ ...draft, pillars: nextPillars });
              }}
            />
          </div>
        ))}
      </div>

      <StandardButton type="submit" variant="primary" size="lg" fullWidth>
        บันทึกการเปลี่ยนแปลง
      </StandardButton>
    </form>
  );
}

export function HomeVillasHeaderEditor({
  store,
  saveStore,
  onSaved,
}: EditorCommonProps) {
  const [eyebrowTh, setEyebrowTh] = useState(store.cms.home.villasEyebrowTh);
  const [eyebrowEn, setEyebrowEn] = useState(store.cms.home.villasEyebrowEn);
  const [titleTh, setTitleTh] = useState(store.cms.home.villasTitleTh);
  const [titleEn, setTitleEn] = useState(store.cms.home.villasTitleEn);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveStore((prev) => ({
      ...prev,
      cms: {
        ...prev.cms,
        home: {
          ...prev.cms.home,
          villasEyebrowTh: eyebrowTh,
          villasEyebrowEn: eyebrowEn,
          villasTitleTh: titleTh,
          villasTitleEn: titleEn,
        },
      },
    }));
    onSaved("บันทึกหัวข้อหมวดบ้านพักเรียบร้อยแล้ว");
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <ThaiFirstInput
        label="ข้อความกำกับด้านบน (Eyebrow)"
        valueTh={eyebrowTh}
        valueEn={eyebrowEn}
        onChangeTh={setEyebrowTh}
        onChangeEn={setEyebrowEn}
      />
      <ThaiFirstInput
        label="หัวข้อหมวดบ้านพัก"
        valueTh={titleTh}
        valueEn={titleEn}
        onChangeTh={setTitleTh}
        onChangeEn={setTitleEn}
      />
      <StandardButton type="submit" variant="primary" size="lg" fullWidth>
        บันทึกการเปลี่ยนแปลง
      </StandardButton>
    </form>
  );
}

export function HomeStoryEditor({
  store,
  saveStore,
  storyId,
  onSaved,
}: EditorCommonProps & { storyId?: string }) {
  const existing = store.cms.home.stories.find((item) => item.id === storyId);
  const [story, setStory] = useState<HomeEditorialStoryItem>(
    existing || {
      id: `story-${Date.now()}`,
      isVisible: true,
      iconKey: "sparkles",
      eyebrowTh: "HIGHLIGHT STORY",
      eyebrowEn: "HIGHLIGHT STORY",
      titleTh: "",
      titleEn: "",
      descTh: "",
      descEn: "",
      imageUrl:
        "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1400&q=85",
      pins: [],
      ctaLabelTh: "ดูรายละเอียด →",
      ctaLabelEn: "Explore →",
      ctaTargetTab: "book",
    }
  );
  const [pinsRawTh, setPinsRawTh] = useState(
    (existing?.pins || []).map((p) => p.th).join("\n")
  );

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!story.titleTh.trim()) return;
    const parsedPins = pinsRawTh
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => ({ th: line, en: line }));

    const nextStory: HomeEditorialStoryItem = {
      ...story,
      pins: parsedPins,
    };

    saveStore((prev) => {
      const exists = prev.cms.home.stories.some((s) => s.id === nextStory.id);
      const nextStories = exists
        ? prev.cms.home.stories.map((s) =>
            s.id === nextStory.id ? nextStory : s
          )
        : [...prev.cms.home.stories, nextStory];
      return {
        ...prev,
        cms: {
          ...prev.cms,
          home: {
            ...prev.cms.home,
            stories: nextStories,
          },
        },
      };
    });
    onSaved("บันทึกบล็อกเรื่องราวเรียบร้อยแล้ว");
  };

  const handleDelete = () => {
    if (!existing) return;
    saveStore((prev) => ({
      ...prev,
      cms: {
        ...prev.cms,
        home: {
          ...prev.cms.home,
          stories: prev.cms.home.stories.filter((s) => s.id !== existing.id),
        },
      },
    }));
    onSaved("ลบบล็อกเรื่องราวแล้ว");
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <SmartImageUploader
        label="รูปภาพประกอบเรื่องราว (แนวนอน 16:9)"
        imageUrl={story.imageUrl}
        onChangeUrl={(url) => setStory({ ...story, imageUrl: url })}
        folder="stories"
        aspectClassName="aspect-[16/9]"
      />

      <div className="space-y-1.5">
        <span className="ty-body font-semibold block">ไอคอนกำกับหมวด</span>
        <CmsIconPicker
          value={story.iconKey}
          onChange={(iconKey) => setStory({ ...story, iconKey })}
        />
      </div>

      <ThaiFirstInput
        label="หัวข้อกำกับเล็ก (Eyebrow)"
        valueTh={story.eyebrowTh}
        valueEn={story.eyebrowEn}
        onChangeTh={(v) => setStory({ ...story, eyebrowTh: v })}
        onChangeEn={(v) => setStory({ ...story, eyebrowEn: v })}
      />

      <ThaiFirstInput
        label="หัวข้อหลักเรื่องราว (H2)"
        required
        valueTh={story.titleTh}
        valueEn={story.titleEn}
        onChangeTh={(v) => setStory({ ...story, titleTh: v })}
        onChangeEn={(v) => setStory({ ...story, titleEn: v })}
      />

      <ThaiFirstTextarea
        label="เนื้อหาบรรยาย"
        valueTh={story.descTh}
        valueEn={story.descEn}
        onChangeTh={(v) => setStory({ ...story, descTh: v })}
        onChangeEn={(v) => setStory({ ...story, descEn: v })}
        rows={3}
      />

      <div className="space-y-1.5">
        <label className="ty-body font-semibold block">
          หมุดสถานที่ใกล้เคียง (บรรทัดละ 1 รายการ — เว้นว่างได้)
        </label>
        <textarea
          rows={3}
          value={pinsRawTh}
          onChange={(e) => setPinsRawTh(e.target.value)}
          placeholder={"น้ำตกสะปัน 5 นาที\nหยุดเวลาคาเฟ่ 5 นาที"}
          className="w-full rounded-[12px] bg-[var(--color-background-muted)] p-3.5 ty-body focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ThaiFirstInput
          label="ข้อความบนปุ่มกด"
          valueTh={story.ctaLabelTh}
          valueEn={story.ctaLabelEn}
          onChangeTh={(v) => setStory({ ...story, ctaLabelTh: v })}
          onChangeEn={(v) => setStory({ ...story, ctaLabelEn: v })}
        />

        <div className="space-y-1.5">
          <label className="ty-body font-semibold block">ลิงก์ไปหน้า</label>
          <select
            value={story.ctaTargetTab}
            onChange={(e) =>
              setStory({
                ...story,
                ctaTargetTab: e.target.value as CmsStoryTargetTab,
              })
            }
            className={CMS_INPUT_CLASS}
          >
            <option value="book">หน้าจองห้องพัก (/booking)</option>
            <option value="deal">หน้าโปรโมชั่น (/deal)</option>
            <option value="guide">หน้าแผนที่ & คู่มือ (/guide)</option>
            <option value="shorts">หน้าวิดีโอสั้น (/shorts)</option>
            <option value="review">หน้ารีวิวลูกค้า (/review)</option>
          </select>
        </div>
      </div>

      <div className="pt-2 flex items-center gap-2.5">
        {existing && (
          <StandardButton
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleDelete}
            className="!bg-[var(--color-error-muted)] !text-[var(--color-error)] shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>ลบ</span>
          </StandardButton>
        )}
        <StandardButton type="submit" variant="primary" size="lg" fullWidth>
          บันทึกเรื่องราว
        </StandardButton>
      </div>
    </form>
  );
}

export function HomeLivingAndQuotesEditor({
  store,
  saveStore,
  mode,
  onSaved,
}: EditorCommonProps & { mode: "header" | "quotes" | "invite" }) {
  const [draft, setDraft] = useState<HomeCmsConfig>(store.cms.home);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveStore((prev) => ({
      ...prev,
      cms: { ...prev.cms, home: draft },
    }));
    onSaved("บันทึกข้อมูลหน้าแรกเรียบร้อยแล้ว");
  };

  if (mode === "header") {
    return (
      <form onSubmit={handleSave} className="space-y-4">
        <ThaiFirstInput
          label="ข้อความกำกับด้านบน (Eyebrow)"
          valueTh={draft.livingEyebrowTh}
          valueEn={draft.livingEyebrowEn}
          onChangeTh={(v) => setDraft({ ...draft, livingEyebrowTh: v })}
          onChangeEn={(v) => setDraft({ ...draft, livingEyebrowEn: v })}
        />
        <ThaiFirstInput
          label="หัวข้อหมวดวิดีโอสั้นบนหน้าแรก"
          valueTh={draft.livingTitleTh}
          valueEn={draft.livingTitleEn}
          onChangeTh={(v) => setDraft({ ...draft, livingTitleTh: v })}
          onChangeEn={(v) => setDraft({ ...draft, livingTitleEn: v })}
        />
        <StandardButton type="submit" variant="primary" size="lg" fullWidth>
          บันทึกการเปลี่ยนแปลง
        </StandardButton>
      </form>
    );
  }

  if (mode === "quotes") {
    return (
      <form onSubmit={handleSave} className="space-y-5">
        {draft.guestQuotes.map((quote, idx) => (
          <div
            key={quote.id}
            className="pt-4 border-t border-[var(--color-border)] first:border-t-0 first:pt-0 space-y-3"
          >
            <div className="flex items-center justify-between">
              <span className="ty-caption font-bold text-[var(--color-accent)]">
                คำรีวิวไฮไลท์ที่ {idx + 1}
              </span>
              {draft.guestQuotes.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    setDraft({
                      ...draft,
                      guestQuotes: draft.guestQuotes.filter(
                        (_, i) => i !== idx
                      ),
                    })
                  }
                  className="ty-caption text-[var(--color-error)] font-semibold cursor-pointer"
                >
                  ลบรายการนี้
                </button>
              )}
            </div>

            <ThaiFirstTextarea
              label="ข้อความประทับใจจากลูกค้า"
              valueTh={quote.quoteTh}
              valueEn={quote.quoteEn}
              onChangeTh={(v) => {
                const next = [...draft.guestQuotes];
                next[idx] = { ...quote, quoteTh: v };
                setDraft({ ...draft, guestQuotes: next });
              }}
              onChangeEn={(v) => {
                const next = [...draft.guestQuotes];
                next[idx] = { ...quote, quoteEn: v };
                setDraft({ ...draft, guestQuotes: next });
              }}
              rows={2}
            />

            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2">
                <ThaiFirstInput
                  label="ชื่อลูกค้า & ห้องพัก"
                  valueTh={quote.authorTh}
                  valueEn={quote.authorEn}
                  onChangeTh={(v) => {
                    const next = [...draft.guestQuotes];
                    next[idx] = { ...quote, authorTh: v };
                    setDraft({ ...draft, guestQuotes: next });
                  }}
                  onChangeEn={(v) => {
                    const next = [...draft.guestQuotes];
                    next[idx] = { ...quote, authorEn: v };
                    setDraft({ ...draft, guestQuotes: next });
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="ty-body font-semibold block">คะแนน</label>
                <input
                  type="text"
                  value={quote.score}
                  onChange={(e) => {
                    const next = [...draft.guestQuotes];
                    next[idx] = { ...quote, score: e.target.value };
                    setDraft({ ...draft, guestQuotes: next });
                  }}
                  className={CMS_INPUT_CLASS}
                />
              </div>
            </div>
          </div>
        ))}

        <StandardButton
          type="button"
          variant="secondary"
          size="md"
          fullWidth
          onClick={() =>
            setDraft({
              ...draft,
              guestQuotes: [
                ...draft.guestQuotes,
                {
                  id: `quote-${Date.now()}`,
                  quoteTh: "",
                  quoteEn: "",
                  authorTh: "คุณลูกค้า · Villa A1",
                  authorEn: "",
                  score: "10/10",
                },
              ],
            })
          }
        >
          <Plus className="w-4 h-4" />
          <span>เพิ่มคำรีวิวไฮไลท์</span>
        </StandardButton>

        <StandardButton type="submit" variant="primary" size="lg" fullWidth>
          บันทึกคำรีวิว
        </StandardButton>
      </form>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <ThaiFirstInput
        label="ป้ายการันตีด้านบน"
        valueTh={draft.inviteGuaranteeTh}
        valueEn={draft.inviteGuaranteeEn}
        onChangeTh={(v) => setDraft({ ...draft, inviteGuaranteeTh: v })}
        onChangeEn={(v) => setDraft({ ...draft, inviteGuaranteeEn: v })}
      />

      <ThaiFirstInput
        label="หัวข้อชวนจองท้ายหน้า (H2)"
        valueTh={draft.inviteTitleTh}
        valueEn={draft.inviteTitleEn}
        onChangeTh={(v) => setDraft({ ...draft, inviteTitleTh: v })}
        onChangeEn={(v) => setDraft({ ...draft, inviteTitleEn: v })}
      />

      <ThaiFirstInput
        label="ข้อความบนปุ่มกดจอง"
        valueTh={draft.inviteCtaTh}
        valueEn={draft.inviteCtaEn}
        onChangeTh={(v) => setDraft({ ...draft, inviteCtaTh: v })}
        onChangeEn={(v) => setDraft({ ...draft, inviteCtaEn: v })}
      />

      <div className="pt-3 border-t border-[var(--color-border)] space-y-3">
        <span className="ty-subtitle block">จุดขายย่อย 3 ข้อ</span>
        {draft.invitePerks.map((perk, idx) => (
          <div key={perk.id} className="space-y-2">
            <CmsIconPicker
              value={perk.iconKey}
              onChange={(iconKey) => {
                const next = [...draft.invitePerks];
                next[idx] = { ...perk, iconKey };
                setDraft({ ...draft, invitePerks: next });
              }}
            />
            <ThaiFirstInput
              label={`จุดขายข้อที่ ${idx + 1}`}
              valueTh={perk.labelTh}
              valueEn={perk.labelEn}
              onChangeTh={(v) => {
                const next = [...draft.invitePerks];
                next[idx] = { ...perk, labelTh: v };
                setDraft({ ...draft, invitePerks: next });
              }}
              onChangeEn={(v) => {
                const next = [...draft.invitePerks];
                next[idx] = { ...perk, labelEn: v };
                setDraft({ ...draft, invitePerks: next });
              }}
            />
          </div>
        ))}
      </div>

      <StandardButton type="submit" variant="primary" size="lg" fullWidth>
        บันทึกแบนเนอร์ท้ายหน้า
      </StandardButton>
    </form>
  );
}

export function BookingHeroEditor({
  store,
  saveStore,
  onSaved,
}: EditorCommonProps) {
  const [propDraft, setPropDraft] = useState<WhiteLabelPropertyConfig>(
    store.propertyConfig
  );
  const [bookingDraft, setBookingDraft] = useState<BookingPageCmsConfig>(
    store.cms.bookingPage
  );

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveStore((prev) => ({
      ...prev,
      propertyConfig: propDraft,
      cms: {
        ...prev.cms,
        bookingPage: bookingDraft,
      },
    }));
    onSaved("บันทึกส่วนหัวหน้าจองห้องพักเรียบร้อยแล้ว");
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <SmartImageUploader
        label="ภาพปกหน้าจองห้องพัก (สัดส่วนแนวนอน 16:9)"
        imageUrl={bookingDraft.heroBannerUrl}
        onChangeUrl={(url) =>
          setBookingDraft({ ...bookingDraft, heroBannerUrl: url })
        }
        folder="hero"
        aspectClassName="aspect-[16/9]"
        maxDimension={1920}
      />

      <ThaiFirstInput
        label="ชื่อที่พักหลัก (H1)"
        required
        valueTh={propDraft.nameTh}
        valueEn={propDraft.nameEn}
        onChangeTh={(v) => setPropDraft({ ...propDraft, nameTh: v })}
        onChangeEn={(v) => setPropDraft({ ...propDraft, nameEn: v })}
      />

      <ThaiFirstTextarea
        label="คำโปรยใต้ชื่อที่พัก (Tagline)"
        valueTh={propDraft.taglineTh}
        valueEn={propDraft.taglineEn}
        onChangeTh={(v) => setPropDraft({ ...propDraft, taglineTh: v })}
        onChangeEn={(v) => setPropDraft({ ...propDraft, taglineEn: v })}
        rows={2}
      />

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1.5">
          <label className="ty-body font-semibold block">คะแนนเฉลี่ย</label>
          <input
            type="text"
            value={bookingDraft.ratingScore}
            onChange={(e) =>
              setBookingDraft({ ...bookingDraft, ratingScore: e.target.value })
            }
            className={CMS_INPUT_CLASS}
          />
        </div>
        <ThaiFirstInput
          label="จำนวนรีวิว"
          valueTh={bookingDraft.reviewCountTh}
          valueEn={bookingDraft.reviewCountEn}
          onChangeTh={(v) =>
            setBookingDraft({ ...bookingDraft, reviewCountTh: v })
          }
          onChangeEn={(v) =>
            setBookingDraft({ ...bookingDraft, reviewCountEn: v })
          }
        />
      </div>

      <ThaiFirstInput
        label="ป้ายที่ตั้งที่พัก"
        valueTh={bookingDraft.locationLabelTh}
        valueEn={bookingDraft.locationLabelEn}
        onChangeTh={(v) =>
          setBookingDraft({ ...bookingDraft, locationLabelTh: v })
        }
        onChangeEn={(v) =>
          setBookingDraft({ ...bookingDraft, locationLabelEn: v })
        }
      />

      <div className="pt-2 border-t border-[var(--color-border)] space-y-3">
        <div className="flex items-center justify-between">
          <span className="ty-subtitle">ปุ่มกรองหมวดห้องพัก</span>
          <button
            type="button"
            onClick={() =>
              setBookingDraft({
                ...bookingDraft,
                categoryChips: [
                  ...bookingDraft.categoryChips,
                  {
                    id: `cat-${Date.now()}`,
                    labelTh: "โซนใหม่",
                    labelEn: "New Zone",
                    codePrefix: "C",
                  },
                ],
              })
            }
            className="ty-caption font-semibold text-[var(--color-accent)] cursor-pointer"
          >
            + เพิ่มปุ่มกรอง
          </button>
        </div>

        {bookingDraft.categoryChips.map((chip, idx) => (
          <div key={chip.id} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-7">
              <ThaiFirstInput
                label={`ชื่อปุ่มที่ ${idx + 1}`}
                valueTh={chip.labelTh}
                valueEn={chip.labelEn}
                onChangeTh={(v) => {
                  const next = [...bookingDraft.categoryChips];
                  next[idx] = { ...chip, labelTh: v };
                  setBookingDraft({ ...bookingDraft, categoryChips: next });
                }}
                onChangeEn={(v) => {
                  const next = [...bookingDraft.categoryChips];
                  next[idx] = { ...chip, labelEn: v };
                  setBookingDraft({ ...bookingDraft, categoryChips: next });
                }}
              />
            </div>
            <div className="col-span-3 space-y-1.5">
              <label className="ty-caption font-semibold block">
                รหัสนำหน้า
              </label>
              <input
                type="text"
                value={chip.codePrefix || ""}
                onChange={(e) => {
                  const next = [...bookingDraft.categoryChips];
                  next[idx] = {
                    ...chip,
                    codePrefix: e.target.value.toUpperCase(),
                  };
                  setBookingDraft({ ...bookingDraft, categoryChips: next });
                }}
                placeholder="A"
                className={CMS_INPUT_CLASS}
              />
            </div>
            <div className="col-span-2 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setBookingDraft({
                    ...bookingDraft,
                    categoryChips: bookingDraft.categoryChips.filter(
                      (_, i) => i !== idx
                    ),
                  })
                }
                aria-label="ลบปุ่มกรอง"
                className="btn-icon !bg-[var(--color-error-muted)] !text-[var(--color-error)]"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <StandardButton type="submit" variant="primary" size="lg" fullWidth>
        บันทึกข้อมูลส่วนหัวหน้าจอง
      </StandardButton>
    </form>
  );
}

export function GalleryVideoEditor({
  store,
  saveStore,
  onSaved,
}: EditorCommonProps) {
  const [draft, setDraft] = useState<GalleryCmsConfig>(store.cms.gallery);

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveStore((prev) => ({
      ...prev,
      cms: {
        ...prev.cms,
        gallery: draft,
      },
    }));
    onSaved("บันทึกวิดีโอทัวร์ที่พักเรียบร้อยแล้ว");
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <SmartVideoLinkInput
        label="ลิงก์วิดีโอทัวร์ที่พัก 16:9 (YouTube / Facebook / MP4)"
        videoUrl={draft.tourVideoUrl}
        posterUrl={draft.tourVideoPosterUrl}
        onChangeVideoUrl={(url) => setDraft({ ...draft, tourVideoUrl: url })}
        onChangePosterUrl={(poster) =>
          setDraft({ ...draft, tourVideoPosterUrl: poster })
        }
        posterFolder="gallery"
        aspectRatio="16/9"
      />

      <ThaiFirstInput
        label="ชื่อวิดีโอทัวร์"
        valueTh={draft.tourVideoTitleTh}
        valueEn={draft.tourVideoTitleEn}
        onChangeTh={(v) => setDraft({ ...draft, tourVideoTitleTh: v })}
        onChangeEn={(v) => setDraft({ ...draft, tourVideoTitleEn: v })}
      />

      <ThaiFirstInput
        label="คำบรรยายใต้วิดีโอ"
        valueTh={draft.tourVideoSubtitleTh}
        valueEn={draft.tourVideoSubtitleEn}
        onChangeTh={(v) => setDraft({ ...draft, tourVideoSubtitleTh: v })}
        onChangeEn={(v) => setDraft({ ...draft, tourVideoSubtitleEn: v })}
      />

      <StandardButton type="submit" variant="primary" size="lg" fullWidth>
        บันทึกวิดีโอทัวร์
      </StandardButton>
    </form>
  );
}

const GALLERY_CATEGORY_LABELS: {
  id: ManagedGalleryCategory;
  label: string;
}[] = [
  { id: "property", label: "บรรยากาศที่พัก" },
  { id: "facilities", label: "สิ่งอำนวยความสะดวก" },
  { id: "dining", label: "อาหาร & เครื่องดื่ม" },
  { id: "attractions", label: "ที่เที่ยวรอบที่พัก" },
  { id: "guest", label: "ภาพจากผู้เข้าพัก" },
];

export function GalleryPhotosEditor({
  store,
  saveStore,
  initialCategory = "property",
  onSaved,
}: EditorCommonProps & { initialCategory?: ManagedGalleryCategory }) {
  const [selectedCategory, setSelectedCategory] =
    useState<ManagedGalleryCategory>(initialCategory);
  const [photos, setPhotos] = useState<ManagedGalleryPhoto[]>(
    store.cms.gallery.photos
  );
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const multiInputRef = useRef<HTMLInputElement | null>(null);

  const visiblePhotos = photos.filter((p) => p.category === selectedCategory);

  const handleBatchUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    setIsUploadingBatch(true);
    try {
      const uploadedItems: ManagedGalleryPhoto[] = [];
      for (const file of files) {
        const res = await uploadOptimizedImage(file, "gallery", 1440);
        uploadedItems.push({
          id: `gal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          url: res.url,
          captionTh: "",
          captionEn: "",
          category: selectedCategory,
        });
      }
      setPhotos((prev) => [...uploadedItems, ...prev]);
    } finally {
      setIsUploadingBatch(false);
    }
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    saveStore((prev) => ({
      ...prev,
      cms: {
        ...prev.cms,
        gallery: {
          ...prev.cms.gallery,
          photos,
        },
      },
    }));
    onSaved("บันทึกรูปแกลเลอรีเรียบร้อยแล้ว");
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div className="flex flex-wrap gap-1.5">
        {GALLERY_CATEGORY_LABELS.map((cat) => {
          const active = cat.id === selectedCategory;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => setSelectedCategory(cat.id)}
              className={`h-8 px-3 rounded-full ty-caption font-semibold transition cursor-pointer ${
                active
                  ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                  : "bg-[var(--color-background-muted)] text-[var(--color-text-secondary)]"
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      <div>
        <StandardButton
          type="button"
          variant="secondary"
          size="md"
          fullWidth
          disabled={isUploadingBatch}
          onClick={() => multiInputRef.current?.click()}
        >
          {isUploadingBatch ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>กำลังบีบอัด WebP & อัปโหลด...</span>
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              <span>เพิ่มรูปเข้าหมวดนี้ (เลือกหลายรูปได้)</span>
            </>
          )}
        </StandardButton>
        <input
          ref={multiInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleBatchUpload}
          className="hidden"
        />
      </div>

      <div className="space-y-3">
        {visiblePhotos.map((photo) => (
          <div
            key={photo.id}
            className="flex items-start gap-3 pt-3 border-t border-[var(--color-border)] first:border-t-0 first:pt-0"
          >
            <img
              src={photo.url}
              alt={photo.captionTh}
              className="w-20 h-14 rounded-[8px] object-cover shrink-0 bg-[var(--color-background-muted)]"
            />
            <div className="flex-1 min-w-0">
              <input
                type="text"
                value={photo.captionTh}
                onChange={(e) =>
                  setPhotos((prev) =>
                    prev.map((item) =>
                      item.id === photo.id
                        ? { ...item, captionTh: e.target.value }
                        : item
                    )
                  )
                }
                placeholder="คำบรรยายใต้ภาพ (ภาษาไทย)"
                className={CMS_INPUT_CLASS}
              />
            </div>
            <button
              type="button"
              onClick={() =>
                setPhotos((prev) => prev.filter((item) => item.id !== photo.id))
              }
              aria-label="ลบรูปภาพ"
              className="btn-icon !bg-[var(--color-error-muted)] !text-[var(--color-error)]"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <StandardButton type="submit" variant="primary" size="lg" fullWidth>
        บันทึกแกลเลอรี ({photos.length} รูป)
      </StandardButton>
    </form>
  );
}

