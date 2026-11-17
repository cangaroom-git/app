"use client";

import React, { useState } from "react";
import { BedDouble, Plus, Trash2, Upload, Utensils } from "lucide-react";
import { uploadMediaFile } from "@/lib/slipScanner";
import { StandardButton, StandardInput } from "@/components/ui/standards";
import type { StudioPayload } from "@/components/studio/studioTypes";

export function StudioRoomsAndAddonsTab({
  data,
  onReload,
  onNotify,
}: {
  data: StudioPayload;
  onReload: () => Promise<void>;
  onNotify: (msg: string) => void;
}) {
  const [roomCode, setRoomCode] = useState("");
  const [roomName, setRoomName] = useState("");
  const [roomDesc, setRoomDesc] = useState("");
  const [totalUnits, setTotalUnits] = useState(1);
  const [weekdayPrice, setWeekdayPrice] = useState(2900);
  const [weekendPrice, setWeekendPrice] = useState(3500);
  const [maxGuests, setMaxGuests] = useState(2);
  const [roomPhotoUrl, setRoomPhotoUrl] = useState("");
  const [isUploading, setIsUploading] = useState(false);

  const [addonName, setAddonName] = useState("");
  const [addonPrice, setAddonPrice] = useState(590);
  const [addonUnit, setAddonUnit] = useState("ชุด");

  const handleRoomPhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await uploadMediaFile(file, "rooms");
      setRoomPhotoUrl(url);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/studio/rooms", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelSlug: data.hotel.slug,
        code: roomCode,
        nameTh: roomName,
        shortDescTh: roomDesc,
        totalUnits: Number(totalUnits),
        weekdayPriceThb: Number(weekdayPrice),
        weekendPriceThb: Number(weekendPrice),
        maxGuests: Number(maxGuests),
        galleryUrls: roomPhotoUrl ? [roomPhotoUrl] : [],
      }),
    });
    if (res.ok) {
      setRoomCode("");
      setRoomName("");
      setRoomDesc("");
      setRoomPhotoUrl("");
      onNotify("เพิ่มประเภทห้องพักใหม่ลงฐานข้อมูลแล้ว");
      await onReload();
    }
  };

  const handleDeleteRoom = async (id: string) => {
    await fetch(
      `/api/studio/rooms?id=${encodeURIComponent(id)}&hotel=${encodeURIComponent(
        data.hotel.slug
      )}`,
      { method: "DELETE" }
    );
    await onReload();
  };

  const handleAddAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/studio/addons", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        hotelSlug: data.hotel.slug,
        nameTh: addonName,
        priceThb: Number(addonPrice),
        unitLabelTh: addonUnit,
      }),
    });
    if (res.ok) {
      setAddonName("");
      onNotify("เพิ่มบริการเสริมในหน้าชำระเงินแล้ว");
      await onReload();
    }
  };

  const handleDeleteAddon = async (id: string) => {
    await fetch(
      `/api/studio/addons?id=${encodeURIComponent(
        id
      )}&hotel=${encodeURIComponent(data.hotel.slug)}`,
      { method: "DELETE" }
    );
    await onReload();
  };

  return (
    <div className="space-y-8">
      {/* Rooms List + Create */}
      <section className="space-y-4">
        <h2 className="ty-title flex items-center gap-2">
          <BedDouble className="w-5 h-5 text-[var(--color-accent)]" />
          <span>ประเภทห้องพัก ({data.rooms.length})</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {data.rooms.map((r) => (
            <div
              key={r.id}
              className="rounded-[18px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-4 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                {r.galleryUrls[0] && (
                  <img
                    src={r.galleryUrls[0]}
                    alt={r.nameTh}
                    className="h-14 w-16 rounded-[10px] object-cover shrink-0"
                  />
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="badge-accent">{r.code}</span>
                    <p className="ty-body font-bold truncate">{r.nameTh}</p>
                  </div>
                  <p className="ty-caption mt-0.5">
                    ฿{r.weekdayPriceThb.toLocaleString()} (จ.-พฤ.) / ฿
                    {r.weekendPriceThb.toLocaleString()} (ศ.-ส.) ·{" "}
                    {r.totalUnits} ยูนิต · สูงสุด {r.maxGuests} ท่าน
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleDeleteRoom(r.id)}
                className="h-8 w-8 rounded-full hover:bg-[var(--color-error-muted)] text-[var(--color-error)] inline-flex items-center justify-center cursor-pointer shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleAddRoom}
          className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 space-y-4"
        >
          <h3 className="ty-subtitle font-bold">เพิ่มประเภทห้องพักใหม่</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <StandardInput
              label="รหัสห้อง (เช่น V1) *"
              required
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
            />
            <StandardInput
              label="ชื่อห้องพัก *"
              required
              value={roomName}
              onChange={(e) => setRoomName(e.target.value)}
            />
            <StandardInput
              label="จำนวนห้อง (ยูนิต) *"
              type="number"
              min={1}
              value={totalUnits}
              onChange={(e) => setTotalUnits(Number(e.target.value))}
            />
            <StandardInput
              label="ราคาวันธรรมดา (฿) *"
              type="number"
              min={100}
              value={weekdayPrice}
              onChange={(e) => setWeekdayPrice(Number(e.target.value))}
            />
            <StandardInput
              label="ราคาศุกร์-เสาร์ (฿) *"
              type="number"
              min={100}
              value={weekendPrice}
              onChange={(e) => setWeekendPrice(Number(e.target.value))}
            />
            <StandardInput
              label="รองรับผู้เข้าพักสูงสุด *"
              type="number"
              min={1}
              value={maxGuests}
              onChange={(e) => setMaxGuests(Number(e.target.value))}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
            <StandardInput
              label="รายละเอียดห้องพัก"
              value={roomDesc}
              onChange={(e) => setRoomDesc(e.target.value)}
            />
            <div className="flex items-center gap-2">
              <label className="btn-fw-secondary cursor-pointer">
                <Upload className="w-4 h-4" />
                <span>
                  {isUploading
                    ? "กำลังอัปโหลด..."
                    : roomPhotoUrl
                    ? "อัปโหลดรูปแล้ว ✓"
                    : "อัปโหลดรูปห้องพัก"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleRoomPhotoUpload}
                  className="hidden"
                />
              </label>
              <StandardButton type="submit" variant="primary">
                <Plus className="w-4 h-4" />
                <span>บันทึกห้องพัก</span>
              </StandardButton>
            </div>
          </div>
        </form>
      </section>

      {/* Hotel Add-ons (Shown ONLY inside this hotel's booking drawer!) */}
      <section className="rounded-[20px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-5 space-y-4">
        <h2 className="ty-subtitle font-bold flex items-center gap-2">
          <Utensils className="w-4 h-4 text-[var(--color-accent)]" />
          <span>
            บริการเสริมในหน้าจองห้อง (เช่น หมูกระทะ, Floating Breakfast,
            เตียงเสริม)
          </span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {data.addons.map((a) => (
            <div
              key={a.id}
              className="rounded-[12px] bg-[var(--color-background-muted)] px-3.5 py-2.5 flex items-center justify-between gap-2"
            >
              <div>
                <p className="ty-body font-semibold">{a.nameTh}</p>
                <p className="ty-caption">
                  +฿{a.priceThb.toLocaleString()} / {a.unitLabelTh}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleDeleteAddon(a.id)}
                className="text-[var(--color-error)] cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        <form
          onSubmit={handleAddAddon}
          className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 items-end"
        >
          <StandardInput
            label="ชื่อบริการเสริม *"
            required
            placeholder="เช่น ชุดหมูกระทะริมระเบียง"
            value={addonName}
            onChange={(e) => setAddonName(e.target.value)}
          />
          <StandardInput
            label="ราคา (฿) *"
            type="number"
            min={0}
            value={addonPrice}
            onChange={(e) => setAddonPrice(Number(e.target.value))}
          />
          <StandardInput
            label="หน่วย"
            value={addonUnit}
            onChange={(e) => setAddonUnit(e.target.value)}
          />
          <StandardButton type="submit" variant="secondary">
            <Plus className="w-4 h-4" />
            <span>เพิ่มบริการเสริม</span>
          </StandardButton>
        </form>
      </section>
    </div>
  );
}

