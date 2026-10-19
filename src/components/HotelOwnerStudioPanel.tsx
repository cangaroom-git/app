"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  BedDouble,
  Tag,
  Utensils,
  Settings,
  Plus,
  Check,
  ExternalLink,
  Sparkles,
  Trash2,
  Building2,
} from "lucide-react";
import {
  RoomLodge,
  PromoCoupon,
  ExtraAddon,
  WhiteLabelPropertyConfig,
} from "@/data/rooms";
import { SapanStoreState } from "@/lib/store";

interface HotelOwnerStudioPanelProps {
  propertyConfig: WhiteLabelPropertyConfig;
  rooms: RoomLodge[];
  coupons: PromoCoupon[];
  addons: ExtraAddon[];
  pendingAdminCount: number;
  saveStore: (updater: (prev: SapanStoreState) => SapanStoreState) => void;
}

export function HotelOwnerStudioPanel({
  propertyConfig,
  rooms,
  coupons,
  addons,
  pendingAdminCount,
  saveStore,
}: HotelOwnerStudioPanelProps) {
  const [studioTab, setStudioTab] = useState<
    "rooms" | "coupons" | "addons" | "brand"
  >("rooms");

  // Quick Add Room Form State
  const [newRoomCode, setNewRoomCode] = useState("");
  const [newRoomNameTh, setNewRoomNameTh] = useState("");
  const [newRoomPrice, setNewRoomPrice] = useState(3500);
  const [newRoomUnits, setNewRoomUnits] = useState(1);
  const [newRoomDiscount, setNewRoomDiscount] = useState(10);

  // Quick Add Coupon Form State
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponTitle, setNewCouponTitle] = useState("");
  const [newCouponValue, setNewCouponValue] = useState(15);
  const [newCouponType, setNewCouponType] = useState<"PERCENT" | "FIXED">(
    "PERCENT"
  );

  // Quick Add Addon Form State
  const [newAddonName, setNewAddonName] = useState("");
  const [newAddonPrice, setNewAddonPrice] = useState(690);
  const [newAddonUnit, setNewAddonUnit] = useState("ต่อชุด");

  const handleQuickCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomCode.trim() || !newRoomNameTh.trim()) return;
    const code = newRoomCode.trim().toUpperCase();
    const createdRoom: RoomLodge = {
      id: `room-${Date.now()}`,
      slug: `room-${code.toLowerCase()}`,
      code,
      nameTh: newRoomNameTh.trim(),
      nameEn: newRoomNameTh.trim(),
      categoryTh: newRoomUnits > 1 ? "ห้องพักมาตรฐาน" : "วิลล่าส่วนตัว",
      categoryEn: newRoomUnits > 1 ? "Deluxe Suite" : "Private Villa",
      roomCategory: newRoomUnits > 1 ? "SUITE" : "VILLA",
      inventoryMode: newRoomUnits > 1 ? "ROOM_TYPE" : "SINGLE_UNIT",
      totalUnits: Math.max(1, newRoomUnits),
      shortDescTh:
        "ห้องพักดีไซน์โมเดิร์นพร้อมระเบียงชมวิวธรรมชาติและสิ่งอำนวยความสะดวกครบครัน",
      shortDescEn: "Modern sanctuary room with private mountain view terrace.",
      longDescTh: [
        "ออกแบบเพื่อการพักผ่อนอย่างแท้จริง พร้อมเตียงคิงไซส์ อ่างอาบน้ำ และบริการอาหารเช้าเสิร์ฟถึงห้องพัก",
      ],
      longDescEn: [
        "Designed for restful stays with king bed, bathtub, and breakfast included.",
      ],
      basePriceThb: Math.max(500, newRoomPrice),
      weekendPriceThb: Math.round(Math.max(500, newRoomPrice) * 1.15),
      discountPercent: Math.max(0, Math.min(70, newRoomDiscount)),
      extraBedPriceThb: 800,
      sizeSqm: 48,
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
      highlightTh: "สร้างใหม่จากระบบ my-hotel Studio",
      highlightEn: "Created via my-hotel Studio",
      images: [
        {
          url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1000&q=80",
          captionTh: newRoomNameTh.trim(),
          captionEn: newRoomNameTh.trim(),
        },
        {
          url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=80",
          captionTh: "บรรยากาศภายในห้องพัก",
          captionEn: "Interior view",
        },
      ],
      amenities: {
        common: ["เตียง King Size", "ฟรี Wi-Fi ความเร็วสูง", "เครื่องปรับอากาศ"],
        dining: ["ฟรีอาหารเช้าสำหรับ 2 ท่าน", "ชุดดริปกาแฟสด & มินิบาร์"],
        outdoor: ["ระเบียงชมวิวส่วนตัว", "อ่างอาบน้ำชมวิว"],
      },
    };

    saveStore((prev) => ({
      ...prev,
      rooms: [createdRoom, ...prev.rooms],
    }));
    setNewRoomCode("");
    setNewRoomNameTh("");
  };

  const handleQuickCreateCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCouponCode.trim() || !newCouponTitle.trim()) return;
    const code = newCouponCode.trim().toUpperCase();
    const created: PromoCoupon = {
      id: `cp-${Date.now()}`,
      code,
      titleTh: newCouponTitle.trim(),
      descTh: "โปรโมชั่นพิเศษสำหรับการจองตรงผ่านหน้าเว็บไซต์ my-hotel",
      badgeTh:
        newCouponType === "PERCENT"
          ? `SAVE ${newCouponValue}%`
          : `SAVE ฿${newCouponValue}`,
      imageUrl:
        "https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=900&q=80",
      discountType: newCouponType,
      discountValue: Math.max(1, newCouponValue),
      minSpendThb: 1500,
      isActive: true,
    };

    saveStore((prev) => ({
      ...prev,
      coupons: [created, ...prev.coupons],
    }));
    setNewCouponCode("");
    setNewCouponTitle("");
  };

  const handleQuickCreateAddon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAddonName.trim()) return;
    const created: ExtraAddon = {
      id: `ad-${Date.now()}`,
      nameTh: newAddonName.trim(),
      nameEn: newAddonName.trim(),
      descTh: "บริการเสริมสุดพิเศษเสิร์ฟตรงถึงห้องพักของคุณ",
      descEn: "Curated in-room service.",
      priceThb: Math.max(50, newAddonPrice),
      unitTh: newAddonUnit.trim() || "ต่อชุด",
      unitEn: "per set",
      imageUrl:
        "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=900&q=80",
      category: "DINING",
      isActive: true,
    };

    saveStore((prev) => ({
      ...prev,
      addons: [created, ...prev.addons],
    }));
    setNewAddonName("");
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200/90 shadow-moder-card overflow-hidden">
      {/* Studio Header Banner */}
      <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0063F5] text-white p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold text-sky-200">
            <Sparkles className="w-3.5 h-3.5" />
            <span>my-hotel SaaS Platform · ระบบกลางสำหรับผู้ประกอบการโรงแรม</span>
          </div>
          <h2 className="text-lg sm:text-2xl font-extrabold tracking-tight">
            จัดการหน้าเว็บไซต์ ห้องพัก โปรโมชั่น และราคาได้ด้วยตัวเอง
          </h2>
          <p className="text-xs sm:text-sm text-slate-200 max-w-2xl">
            แก้ไขข้อมูลด้านล่างแล้วหน้าเว็บจองห้องพัก (แท็บ Book, Deals, AI Chat) จะอัปเดตทันทีแบบเรียลไทม์
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link
            href="/admin"
            className="inline-flex items-center gap-2 rounded-xl bg-white text-[#0063F5] hover:bg-sky-50 px-4 py-2.5 text-xs sm:text-sm font-extrabold shadow-sm transition"
          >
            <span>เปิดระบบหลังบ้านเต็มรูปแบบ (/admin)</span>
            {pendingAdminCount > 0 && (
              <span className="rounded-full bg-amber-400 text-slate-950 px-2 py-0.5 text-[10px] font-black">
                รอตรวจสลิป {pendingAdminCount}
              </span>
            )}
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {/* Studio Sub-Navigation */}
      <div className="border-b border-slate-200 bg-[#F8FAFC] px-4 sm:px-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {[
          {
            id: "rooms" as const,
            label: `จัดการห้องพัก & ราคา (${rooms.length})`,
            Icon: BedDouble,
          },
          {
            id: "coupons" as const,
            label: `โปรโมชั่น & คูปอง (${coupons.length})`,
            Icon: Tag,
          },
          {
            id: "addons" as const,
            label: `บริการเสริม Upsell (${addons.length})`,
            Icon: Utensils,
          },
          {
            id: "brand" as const,
            label: "ตั้งค่าชื่อโรงแรม & การรับชำระเงิน",
            Icon: Building2,
          },
        ].map((t) => {
          const active = studioTab === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setStudioTab(t.id)}
              className={`py-3.5 px-3.5 text-xs sm:text-sm font-bold border-b-2 flex items-center gap-2 whitespace-nowrap transition cursor-pointer ${
                active
                  ? "border-[#0063F5] text-[#0063F5] bg-white"
                  : "border-transparent text-slate-600 hover:text-slate-900"
              }`}
            >
              <t.Icon className="w-4 h-4" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Studio Body */}
      <div className="p-5 sm:p-6">
        {studioTab === "rooms" && (
          <div className="space-y-6">
            {/* Quick Add Room Form */}
            <form
              onSubmit={handleQuickCreateRoom}
              className="rounded-2xl bg-[#F6F8FB] border border-slate-200/90 p-4 sm:p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold text-[#121317] flex items-center gap-2">
                  <Plus className="w-4 h-4 text-[#0063F5]" />
                  <span>สร้างห้องพัก / วิลล่าใหม่เข้าสู่หน้าเว็บทันที</span>
                </h3>
                <span className="text-[11px] font-semibold text-[#0063F5]">
                  แสดงในแท็บ Book & AI Chat อัตโนมัติ
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    รหัสห้อง (เช่น V5, S3) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoomCode}
                    onChange={(e) => setNewRoomCode(e.target.value)}
                    placeholder="เช่น V5"
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold uppercase focus:border-[#0063F5] focus:outline-none"
                  />
                </div>
                <div className="lg:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    ชื่อห้องพัก / วิลล่า *
                  </label>
                  <input
                    type="text"
                    required
                    value={newRoomNameTh}
                    onChange={(e) => setNewRoomNameTh(e.target.value)}
                    placeholder="เช่น Sky Jacuzzi Pool Villa"
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs focus:border-[#0063F5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    ราคาต่อคืน (บาท)
                  </label>
                  <input
                    type="number"
                    min={500}
                    value={newRoomPrice}
                    onChange={(e) =>
                      setNewRoomPrice(parseInt(e.target.value, 10) || 0)
                    }
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold focus:border-[#0063F5] focus:outline-none"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      ส่วนลด (%)
                    </label>
                    <input
                      type="number"
                      min={0}
                      max={70}
                      value={newRoomDiscount}
                      onChange={(e) =>
                        setNewRoomDiscount(parseInt(e.target.value, 10) || 0)
                      }
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold focus:border-[#0063F5] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-10 px-4 rounded-xl bg-[#0063F5] hover:bg-[#0052CC] text-white text-xs font-bold shrink-0 cursor-pointer transition shadow-xs"
                  >
                    + เพิ่มห้อง
                  </button>
                </div>
              </div>
            </form>

            {/* Existing Rooms Quick Price & Discount Editor */}
            <div className="divide-y divide-slate-200 border border-slate-200 rounded-2xl overflow-hidden">
              {rooms.map((rm) => (
                <div
                  key={rm.id}
                  className="p-3.5 sm:p-4 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={rm.images[0]?.url}
                      alt={rm.nameTh}
                      className="w-16 h-12 rounded-xl object-cover shrink-0 bg-slate-100"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-[#EFF6FF] text-[#0063F5] px-2 py-0.5 text-[11px] font-extrabold">
                          {rm.code}
                        </span>
                        <h4 className="text-xs sm:text-sm font-bold text-[#121317] truncate">
                          {rm.nameTh}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        จำนวน {rm.totalUnits ?? 1} ยูนิต · ขนาด {rm.sizeSqm}{" "}
                        ตร.ม. · พัก {rm.baseGuests}–{rm.maxGuests} ท่าน
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">
                        ราคาฐาน:
                      </span>
                      <input
                        type="number"
                        value={rm.basePriceThb}
                        onChange={(e) => {
                          const val = Math.max(
                            300,
                            parseInt(e.target.value, 10) || 0
                          );
                          saveStore((prev) => ({
                            ...prev,
                            rooms: prev.rooms.map((item) =>
                              item.id === rm.id
                                ? { ...item, basePriceThb: val }
                                : item
                            ),
                          }));
                        }}
                        className="h-8 w-24 rounded-lg border border-slate-200 px-2 text-xs font-bold text-[#121317] focus:border-[#0063F5] focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-slate-500">ลด %:</span>
                      <input
                        type="number"
                        min={0}
                        max={75}
                        value={rm.discountPercent}
                        onChange={(e) => {
                          const val = Math.max(
                            0,
                            Math.min(75, parseInt(e.target.value, 10) || 0)
                          );
                          saveStore((prev) => ({
                            ...prev,
                            rooms: prev.rooms.map((item) =>
                              item.id === rm.id
                                ? { ...item, discountPercent: val }
                                : item
                            ),
                          }));
                        }}
                        className="h-8 w-16 rounded-lg border border-slate-200 px-2 text-xs font-bold text-[#0063F5] focus:border-[#0063F5] focus:outline-none"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        saveStore((prev) => ({
                          ...prev,
                          rooms: prev.rooms.map((item) =>
                            item.id === rm.id
                              ? {
                                  ...item,
                                  statusMode:
                                    item.statusMode === "ACTIVE"
                                      ? "MAINTENANCE"
                                      : "ACTIVE",
                                }
                              : item
                          ),
                        }))
                      }
                      className={`h-8 px-3 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        rm.statusMode === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-500 border border-slate-200"
                      }`}
                    >
                      {rm.statusMode === "ACTIVE" ? "● เปิดรับจอง" : "ปิดปรับปรุง"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {studioTab === "coupons" && (
          <div className="space-y-6">
            <form
              onSubmit={handleQuickCreateCoupon}
              className="rounded-2xl bg-[#F6F8FB] border border-slate-200/90 p-4 sm:p-5 space-y-4"
            >
              <h3 className="text-sm font-extrabold text-[#121317] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#0063F5]" />
                <span>สร้างคูปองส่วนลด / โปรโมชั่นใหม่</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    รหัสคูปอง (Code) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCouponCode}
                    onChange={(e) => setNewCouponCode(e.target.value)}
                    placeholder="เช่น WINTER20"
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-mono font-bold uppercase focus:border-[#0063F5] focus:outline-none"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    ชื่อแคมเปญโปรโมชั่น *
                  </label>
                  <input
                    type="text"
                    required
                    value={newCouponTitle}
                    onChange={(e) => setNewCouponTitle(e.target.value)}
                    placeholder="เช่น โปรรับลมหนาว ลดทันที 20%"
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs focus:border-[#0063F5] focus:outline-none"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      มูลค่าส่วนลด
                    </label>
                    <div className="flex">
                      <input
                        type="number"
                        min={1}
                        value={newCouponValue}
                        onChange={(e) =>
                          setNewCouponValue(parseInt(e.target.value, 10) || 1)
                        }
                        className="h-10 w-full rounded-l-xl border border-slate-300 bg-white px-2.5 text-xs font-bold focus:border-[#0063F5] focus:outline-none"
                      />
                      <select
                        value={newCouponType}
                        onChange={(e) =>
                          setNewCouponType(
                            e.target.value as "PERCENT" | "FIXED"
                          )
                        }
                        className="h-10 rounded-r-xl border border-l-0 border-slate-300 bg-slate-100 px-2 text-xs font-bold"
                      >
                        <option value="PERCENT">%</option>
                        <option value="FIXED">฿</option>
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="h-10 px-4 rounded-xl bg-[#0063F5] hover:bg-[#0052CC] text-white text-xs font-bold shrink-0 cursor-pointer transition"
                  >
                    + สร้าง
                  </button>
                </div>
              </div>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {coupons.map((cp) => (
                <div
                  key={cp.id}
                  className="rounded-xl border border-slate-200 p-4 flex items-center justify-between gap-3 bg-white"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-[#EFF6FF] text-[#0063F5] font-mono text-xs font-extrabold px-2.5 py-0.5">
                        {cp.code}
                      </span>
                      <span className="text-xs font-extrabold text-emerald-700">
                        {cp.discountType === "PERCENT"
                          ? `ลด ${cp.discountValue}%`
                          : `ลด ฿${cp.discountValue.toLocaleString()}`}
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#121317] mt-1">
                      {cp.titleTh}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      saveStore((prev) => ({
                        ...prev,
                        coupons: prev.coupons.map((c) =>
                          c.id === cp.id ? { ...c, isActive: !c.isActive } : c
                        ),
                      }))
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer ${
                      cp.isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {cp.isActive ? "✓ เปิดใช้งาน" : "ปิดอยู่"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {studioTab === "addons" && (
          <div className="space-y-6">
            <form
              onSubmit={handleQuickCreateAddon}
              className="rounded-2xl bg-[#F6F8FB] border border-slate-200/90 p-4 sm:p-5 space-y-4"
            >
              <h3 className="text-sm font-extrabold text-[#121317] flex items-center gap-2">
                <Plus className="w-4 h-4 text-[#0063F5]" />
                <span>เพิ่มบริการเสริม Upsell (เช่น ชุดหมูกระทะ, สปา, รถรับส่ง)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    ชื่อบริการเสริม *
                  </label>
                  <input
                    type="text"
                    required
                    value={newAddonName}
                    onChange={(e) => setNewAddonName(e.target.value)}
                    placeholder="เช่น ชุดปิ้งย่างพรีเมียมริมระเบียง"
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs focus:border-[#0063F5] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    ราคา (บาท)
                  </label>
                  <input
                    type="number"
                    min={50}
                    value={newAddonPrice}
                    onChange={(e) =>
                      setNewAddonPrice(parseInt(e.target.value, 10) || 0)
                    }
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-bold focus:border-[#0063F5] focus:outline-none"
                  />
                </div>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <label className="text-[11px] font-bold text-slate-600 block mb-1">
                      หน่วย
                    </label>
                    <input
                      type="text"
                      value={newAddonUnit}
                      onChange={(e) => setNewAddonUnit(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs focus:border-[#0063F5] focus:outline-none"
                    />
                  </div>
                  <button
                    type="submit"
                    className="h-10 px-4 rounded-xl bg-[#0063F5] hover:bg-[#0052CC] text-white text-xs font-bold shrink-0 cursor-pointer"
                  >
                    + เพิ่ม
                  </button>
                </div>
              </div>
            </form>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {addons.map((ad) => (
                <div
                  key={ad.id}
                  className="rounded-xl border border-slate-200 p-3.5 flex items-center justify-between gap-3 bg-white"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={ad.imageUrl}
                      alt={ad.nameTh}
                      className="w-12 h-12 rounded-lg object-cover shrink-0"
                    />
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-[#121317] truncate">
                        {ad.nameTh}
                      </p>
                      <p className="text-xs font-extrabold text-[#0063F5]">
                        +฿{ad.priceThb.toLocaleString()} ({ad.unitTh})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      saveStore((prev) => ({
                        ...prev,
                        addons: prev.addons.map((a) =>
                          a.id === ad.id ? { ...a, isActive: !a.isActive } : a
                        ),
                      }))
                    }
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 cursor-pointer ${
                      ad.isActive
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-500"
                    }`}
                  >
                    {ad.isActive ? "✓ แสดงหน้าจอง" : "ซ่อน"}
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {studioTab === "brand" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                ชื่อโรงแรม / ที่พัก (ภาษาไทย)
              </label>
              <input
                type="text"
                value={propertyConfig.nameTh}
                onChange={(e) =>
                  saveStore((prev) => ({
                    ...prev,
                    propertyConfig: {
                      ...prev.propertyConfig,
                      nameTh: e.target.value,
                    },
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm font-bold text-[#121317] focus:border-[#0063F5] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                ชื่อโรงแรม / ที่พัก (English)
              </label>
              <input
                type="text"
                value={propertyConfig.nameEn}
                onChange={(e) =>
                  saveStore((prev) => ({
                    ...prev,
                    propertyConfig: {
                      ...prev.propertyConfig,
                      nameEn: e.target.value,
                    },
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm font-bold text-[#121317] focus:border-[#0063F5] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                หมายเลขพร้อมเพย์รับเงินจอง (PromptPay ID)
              </label>
              <input
                type="text"
                value={propertyConfig.promptPayId}
                onChange={(e) =>
                  saveStore((prev) => ({
                    ...prev,
                    propertyConfig: {
                      ...prev.propertyConfig,
                      promptPayId: e.target.value,
                    },
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm font-mono font-bold text-[#0063F5] focus:border-[#0063F5] focus:outline-none"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">
                ชื่อบัญชีพร้อมเพย์โรงแรม
              </label>
              <input
                type="text"
                value={propertyConfig.promptPayAccountName}
                onChange={(e) =>
                  saveStore((prev) => ({
                    ...prev,
                    propertyConfig: {
                      ...prev.propertyConfig,
                      promptPayAccountName: e.target.value,
                    },
                  }))
                }
                className="h-11 w-full rounded-xl border border-slate-300 px-3.5 text-sm font-bold text-[#121317] focus:border-[#0063F5] focus:outline-none"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
