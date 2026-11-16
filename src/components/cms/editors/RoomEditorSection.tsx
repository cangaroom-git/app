"use client";

import React, { useRef, useState } from "react";
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
  Loader2,
  Star,
  Trash2,
} from "lucide-react";
import { RoomLodge } from "@/data/rooms";
import { uploadOptimizedImage } from "@/lib/mediaUtils";
import { StandardButton } from "@/components/ui/standards";
import {
  CMS_INPUT_CLASS,
  ThaiFirstInput,
  ThaiFirstTextarea,
} from "@/components/cms/CmsFormPrimitives";
import { EditorCommonProps } from "@/components/cms/editors/HomeAndBookingEditors";

export function RoomEditorSection({
  store,
  saveStore,
  roomId,
  onSaved,
}: EditorCommonProps & { roomId?: string }) {
  const existingRoom = store.rooms.find((r) => r.id === roomId);
  const nextDefaultCode = `A${store.rooms.length + 1}`;

  const [room, setRoom] = useState<RoomLodge>(() => {
    if (existingRoom) {
      return existingRoom;
    }
    return {
      id: `room-${Date.now()}`,
      slug: `room-${Date.now()}`,
      code: nextDefaultCode,
      nameTh: "",
      nameEn: "",
      categoryTh: "บ้านพักส่วนตัว",
      categoryEn: "Private Villa",
      roomCategory: "VILLA",
      inventoryMode: "SINGLE_UNIT",
      totalUnits: 1,
      shortDescTh: "",
      shortDescEn: "",
      longDescTh: [""],
      longDescEn: [""],
      basePriceThb: 2990,
      weekendPriceThb: 3590,
      discountPercent: 10,
      extraBedPriceThb: 850,
      sizeSqm: 45,
      minGuests: 1,
      baseGuests: 2,
      maxGuests: 4,
      bedrooms: 1,
      beds: 1,
      bathrooms: 1,
      petsAllowed: false,
      statusMode: "ACTIVE",
      mapX: 50,
      mapY: 50,
      highlightTh: "วิวขุนเขาส่วนตัว · ฟรีอาหารเช้าเสิร์ฟถึงห้อง",
      highlightEn: "Private Mountain View · Free Terrace Breakfast",
      images: [],
      amenities: {
        common: [
          "เครื่องปรับอากาศและเครื่องทำน้ำอุ่น",
          "ฟรี Wi-Fi ความเร็วสูง",
          "ไดร์เป่าผม และชุดผ้าเช็ดตัว",
        ],
        dining: [
          "ฟรีอาหารเช้าเสิร์ฟถึงห้องพัก",
          "ชุดดริปกาแฟและกาน้ำร้อน",
        ],
        outdoor: ["ระเบียงชมวิวส่วนตัว", "อ่างแช่น้ำกลางแจ้ง"],
      },
    };
  });

  const [longDescTextTh, setLongDescTextTh] = useState(
    room.longDescTh.join("\n\n")
  );
  const [longDescTextEn, setLongDescTextEn] = useState(
    room.longDescEn.join("\n\n")
  );
  const [commonAmenitiesText, setCommonAmenitiesText] = useState(
    room.amenities.common.join("\n")
  );
  const [diningAmenitiesText, setDiningAmenitiesText] = useState(
    room.amenities.dining.join("\n")
  );
  const [outdoorAmenitiesText, setOutdoorAmenitiesText] = useState(
    room.amenities.outdoor.join("\n")
  );

  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleUploadRoomPhotos = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (files.length === 0) return;

    setIsUploadingPhotos(true);
    setUploadError(null);
    try {
      const addedImages: RoomLodge["images"] = [];
      for (const file of files) {
        const uploaded = await uploadOptimizedImage(file, "rooms", 1440);
        addedImages.push({
          url: uploaded.url,
          captionTh: room.nameTh || "ภาพบรรยากาศห้องพัก",
          captionEn: room.nameEn || "",
        });
      }
      setRoom((prev) => ({
        ...prev,
        images: [...prev.images, ...addedImages],
      }));
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "อัปโหลดรูปไม่สำเร็จ"
      );
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  const movePhoto = (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= room.images.length) return;
    const nextImages = [...room.images];
    const [picked] = nextImages.splice(index, 1);
    nextImages.splice(targetIndex, 0, picked);
    setRoom({ ...room, images: nextImages });
  };

  const setAsCoverPhoto = (index: number) => {
    if (index <= 0) return;
    const nextImages = [...room.images];
    const [picked] = nextImages.splice(index, 1);
    nextImages.unshift(picked);
    setRoom({ ...room, images: nextImages });
  };

  const handleSave = (event: React.FormEvent) => {
    event.preventDefault();
    if (!room.nameTh.trim()) return;

    const normalizedCode = (room.code.trim() || nextDefaultCode).toUpperCase();
    const fallbackImages: RoomLodge["images"] =
      room.images.length > 0
        ? room.images
        : [
            {
              url: "https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1400&q=85",
              captionTh: room.nameTh.trim(),
              captionEn: room.nameEn.trim(),
            },
          ];

    const finalRoom: RoomLodge = {
      ...room,
      code: normalizedCode,
      slug:
        existingRoom?.slug ||
        `room-${normalizedCode.toLowerCase()}-${Date.now()}`,
      nameTh: room.nameTh.trim(),
      nameEn: room.nameEn.trim() || room.nameTh.trim(),
      totalUnits: Math.max(1, Number(room.totalUnits) || 1),
      inventoryMode:
        (Number(room.totalUnits) || 1) > 1 ? "ROOM_TYPE" : "SINGLE_UNIT",
      images: fallbackImages,
      longDescTh: longDescTextTh
        .split(/\n{2,}|\n/)
        .map((s) => s.trim())
        .filter(Boolean),
      longDescEn: longDescTextEn
        .split(/\n{2,}|\n/)
        .map((s) => s.trim())
        .filter(Boolean),
      amenities: {
        common: commonAmenitiesText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        dining: diningAmenitiesText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
        outdoor: outdoorAmenitiesText
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean),
      },
    };

    saveStore((prev) => {
      const exists = prev.rooms.some((r) => r.id === finalRoom.id);
      return {
        ...prev,
        rooms: exists
          ? prev.rooms.map((r) => (r.id === finalRoom.id ? finalRoom : r))
          : [...prev.rooms, finalRoom],
      };
    });

    onSaved(
      existingRoom
        ? `บันทึกห้องพัก ${finalRoom.code} เรียบร้อยแล้ว`
        : `เพิ่มห้องพัก ${finalRoom.code} เรียบร้อยแล้ว`
    );
  };

  const handleDeleteRoom = () => {
    if (!existingRoom || store.rooms.length <= 1) return;
    saveStore((prev) => ({
      ...prev,
      rooms: prev.rooms.filter((r) => r.id !== existingRoom.id),
    }));
    onSaved(`ลบห้องพัก ${existingRoom.code} เรียบร้อยแล้ว`);
  };

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* 1. Multi-Photo Gallery Upload & Reordering */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="ty-subtitle">
            รูปภาพห้องพัก ({room.images.length} รูป)
          </span>
          <StandardButton
            type="button"
            variant="secondary"
            size="sm"
            disabled={isUploadingPhotos}
            onClick={() => fileInputRef.current?.click()}
          >
            {isUploadingPhotos ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>กำลังอัปโหลด...</span>
              </>
            ) : (
              <>
                <ImagePlus className="w-3.5 h-3.5" />
                <span>เพิ่มรูปห้องพัก</span>
              </>
            )}
          </StandardButton>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleUploadRoomPhotos}
            className="hidden"
          />
        </div>

        {uploadError && (
          <p className="ty-caption font-semibold text-[var(--color-error)]">
            {uploadError}
          </p>
        )}

        {room.images.length === 0 ? (
          <div
            onClick={() => fileInputRef.current?.click()}
            className="rounded-[16px] bg-[var(--color-background-muted)] py-8 flex flex-col items-center justify-center gap-1.5 cursor-pointer"
          >
            <ImagePlus className="w-6 h-6 text-[var(--color-accent)]" />
            <span className="ty-body font-semibold">
              แตะเพื่ออัปโหลดรูปห้องพัก (เลือกหลายรูปพร้อมกันได้)
            </span>
            <span className="ty-caption">
              ระบบย่อเป็น WebP ประหยัดพื้นที่ให้อัตโนมัติ
            </span>
          </div>
        ) : (
          <div className="space-y-2.5">
            {room.images.map((imgItem, idx) => (
              <div
                key={`${imgItem.url}-${idx}`}
                className="flex items-center gap-2.5 pt-2.5 border-t border-[var(--color-border)] first:border-t-0 first:pt-0"
              >
                <div className="relative w-20 h-16 rounded-[8px] overflow-hidden shrink-0 bg-[var(--color-background-muted)]">
                  <img
                    src={imgItem.url}
                    alt={imgItem.captionTh}
                    className="w-full h-full object-cover"
                  />
                  {idx === 0 && (
                    <span className="absolute bottom-1 left-1 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-1.5 py-0.5 ty-caption font-bold leading-none">
                      ปกหลัก
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={imgItem.captionTh}
                    onChange={(e) => {
                      const next = [...room.images];
                      next[idx] = { ...imgItem, captionTh: e.target.value };
                      setRoom({ ...room, images: next });
                    }}
                    placeholder="คำบรรยายใต้รูป"
                    className={CMS_INPUT_CLASS}
                  />
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {idx > 0 && (
                    <button
                      type="button"
                      onClick={() => setAsCoverPhoto(idx)}
                      title="ตั้งเป็นรูปปกหลัก"
                      className="btn-icon"
                    >
                      <Star className="w-4 h-4 text-[var(--color-warning)]" />
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => movePhoto(idx, -1)}
                    title="เลื่อนขึ้น"
                    className="btn-icon disabled:opacity-35"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === room.images.length - 1}
                    onClick={() => movePhoto(idx, 1)}
                    title="เลื่อนลง"
                    className="btn-icon disabled:opacity-35"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRoom({
                        ...room,
                        images: room.images.filter((_, i) => i !== idx),
                      })
                    }
                    title="ลบรูปนี้"
                    className="btn-icon !bg-[var(--color-error-muted)] !text-[var(--color-error)]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Identity & Status */}
      <div className="pt-3 border-t border-[var(--color-border)] grid grid-cols-3 gap-2.5">
        <div className="space-y-1.5">
          <label className="ty-body font-semibold block">รหัสห้อง</label>
          <input
            type="text"
            required
            value={room.code}
            onChange={(e) =>
              setRoom({ ...room, code: e.target.value.toUpperCase() })
            }
            placeholder="A1"
            className={`${CMS_INPUT_CLASS} uppercase font-bold`}
          />
        </div>

        <div className="col-span-2 space-y-1.5">
          <label className="ty-body font-semibold block">สถานะห้องพัก</label>
          <select
            value={room.statusMode}
            onChange={(e) =>
              setRoom({
                ...room,
                statusMode: e.target.value as "ACTIVE" | "MAINTENANCE",
              })
            }
            className={CMS_INPUT_CLASS}
          >
            <option value="ACTIVE">เปิดรับจองปกติ (Active)</option>
            <option value="MAINTENANCE">ปิดปรับปรุงชั่วคราว (Maintenance)</option>
          </select>
        </div>
      </div>

      <ThaiFirstInput
        label="ชื่อห้องพัก / วิลล่า"
        required
        valueTh={room.nameTh}
        valueEn={room.nameEn}
        onChangeTh={(v) => setRoom({ ...room, nameTh: v })}
        onChangeEn={(v) => setRoom({ ...room, nameEn: v })}
        placeholderTh="เช่น บ้านพัก A1 — A-Frame Panorama Villa"
      />

      <ThaiFirstInput
        label="จุดเด่นไฮไลท์สั้นๆ 1 บรรทัด"
        valueTh={room.highlightTh}
        valueEn={room.highlightEn}
        onChangeTh={(v) => setRoom({ ...room, highlightTh: v })}
        onChangeEn={(v) => setRoom({ ...room, highlightEn: v })}
      />

      <ThaiFirstTextarea
        label="คำบรรยายย่อ (แสดงบนการ์ดหน้าจอง)"
        valueTh={room.shortDescTh}
        valueEn={room.shortDescEn}
        onChangeTh={(v) => setRoom({ ...room, shortDescTh: v })}
        onChangeEn={(v) => setRoom({ ...room, shortDescEn: v })}
        rows={2}
      />

      <ThaiFirstTextarea
        label="รายละเอียดเต็ม (แสดงเมื่อคลิกดูรายละเอียดห้อง)"
        valueTh={longDescTextTh}
        valueEn={longDescTextEn}
        onChangeTh={setLongDescTextTh}
        onChangeEn={setLongDescTextEn}
        rows={4}
      />

      {/* 3. Separate Weekday / Weekend Pricing & Discount */}
      <div className="pt-3 border-t border-[var(--color-border)] space-y-3">
        <span className="ty-subtitle block">เรทราคาและส่วนลดหน้าเว็บ</span>
        <div className="grid grid-cols-2 gap-2.5">
          <div className="space-y-1.5">
            <label className="ty-body font-semibold block">
              วันธรรมดา อา.–พฤ. (฿)
            </label>
            <input
              type="number"
              min={100}
              step={50}
              value={room.basePriceThb}
              onChange={(e) =>
                setRoom({
                  ...room,
                  basePriceThb: Number(e.target.value) || 0,
                })
              }
              className={CMS_INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <label className="ty-body font-semibold block">
              ศุกร์–เสาร์ Weekend (฿)
            </label>
            <input
              type="number"
              min={100}
              step={50}
              value={room.weekendPriceThb}
              onChange={(e) =>
                setRoom({
                  ...room,
                  weekendPriceThb: Number(e.target.value) || 0,
                })
              }
              className={CMS_INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <label className="ty-body font-semibold text-[var(--color-promo-text)] block">
              ส่วนลดหน้าเว็บ (%)
            </label>
            <input
              type="number"
              min={0}
              max={80}
              value={room.discountPercent}
              onChange={(e) =>
                setRoom({
                  ...room,
                  discountPercent: Math.min(
                    80,
                    Math.max(0, Number(e.target.value) || 0)
                  ),
                })
              }
              className={CMS_INPUT_CLASS}
            />
          </div>

          <div className="space-y-1.5">
            <label className="ty-body font-semibold block">
              เสริมเตียง/ท่าน (฿)
            </label>
            <input
              type="number"
              min={0}
              step={50}
              value={room.extraBedPriceThb}
              onChange={(e) =>
                setRoom({
                  ...room,
                  extraBedPriceThb: Number(e.target.value) || 0,
                })
              }
              className={CMS_INPUT_CLASS}
            />
          </div>
        </div>
      </div>

      {/* 4. Capacity & Size */}
      <div className="pt-3 border-t border-[var(--color-border)] grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="space-y-1.5">
          <label className="ty-caption font-semibold block">ขนาด (ตร.ม.)</label>
          <input
            type="number"
            min={10}
            value={room.sizeSqm}
            onChange={(e) =>
              setRoom({ ...room, sizeSqm: Number(e.target.value) || 30 })
            }
            className={CMS_INPUT_CLASS}
          />
        </div>

        <div className="space-y-1.5">
          <label className="ty-caption font-semibold block">พักมาตรฐาน</label>
          <input
            type="number"
            min={1}
            value={room.baseGuests}
            onChange={(e) =>
              setRoom({ ...room, baseGuests: Number(e.target.value) || 2 })
            }
            className={CMS_INPUT_CLASS}
          />
        </div>

        <div className="space-y-1.5">
          <label className="ty-caption font-semibold block">สูงสุด (ท่าน)</label>
          <input
            type="number"
            min={1}
            value={room.maxGuests}
            onChange={(e) =>
              setRoom({ ...room, maxGuests: Number(e.target.value) || 2 })
            }
            className={CMS_INPUT_CLASS}
          />
        </div>

        <div className="space-y-1.5">
          <label className="ty-caption font-semibold block">จำนวนหลัง</label>
          <input
            type="number"
            min={1}
            value={room.totalUnits ?? 1}
            onChange={(e) =>
              setRoom({ ...room, totalUnits: Number(e.target.value) || 1 })
            }
            className={CMS_INPUT_CLASS}
          />
        </div>
      </div>

      {/* 5. Amenities */}
      <div className="pt-3 border-t border-[var(--color-border)] space-y-3">
        <span className="ty-subtitle block">
          สิ่งอำนวยความสะดวก (บรรทัดละ 1 รายการ)
        </span>
        <div className="space-y-1.5">
          <label className="ty-caption font-semibold block">
            ภายในห้องพัก (Common)
          </label>
          <textarea
            rows={3}
            value={commonAmenitiesText}
            onChange={(e) => setCommonAmenitiesText(e.target.value)}
            className="w-full rounded-[12px] bg-[var(--color-background-muted)] p-3 ty-body focus:outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="ty-caption font-semibold block">
            อาหารและเครื่องดื่ม (Dining)
          </label>
          <textarea
            rows={2}
            value={diningAmenitiesText}
            onChange={(e) => setDiningAmenitiesText(e.target.value)}
            className="w-full rounded-[12px] bg-[var(--color-background-muted)] p-3 ty-body focus:outline-none"
          />
        </div>
        <div className="space-y-1.5">
          <label className="ty-caption font-semibold block">
            โซนระเบียง/กลางแจ้ง (Outdoor)
          </label>
          <textarea
            rows={2}
            value={outdoorAmenitiesText}
            onChange={(e) => setOutdoorAmenitiesText(e.target.value)}
            className="w-full rounded-[12px] bg-[var(--color-background-muted)] p-3 ty-body focus:outline-none"
          />
        </div>
      </div>

      <div className="pt-2 flex items-center gap-2.5">
        {existingRoom && store.rooms.length > 1 && (
          <StandardButton
            type="button"
            variant="secondary"
            size="lg"
            onClick={handleDeleteRoom}
            className="!bg-[var(--color-error-muted)] !text-[var(--color-error)] shrink-0"
          >
            <Trash2 className="w-4 h-4" />
            <span>ลบห้อง</span>
          </StandardButton>
        )}
        <StandardButton type="submit" variant="primary" size="lg" fullWidth>
          {existingRoom ? "บันทึกข้อมูลห้องพัก" : "เพิ่มห้องพักขึ้นหน้าเว็บ"}
        </StandardButton>
      </div>
    </form>
  );
}

