"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Calendar,
  Users,
  Check,
  Tag,
  ThermometerSnowflake,
  BedDouble,
  ArrowRight,
  Bot,
  User,
  ShieldCheck,
} from "lucide-react";
import { RoomLodge, PromoCoupon, ExtraAddon } from "@/data/rooms";
import { LiveWeatherData } from "@/components/ResortWeatherWidget";

interface RoomStatusSummary {
  state: "AVAILABLE" | "HELD" | "BOOKED" | "MAINTENANCE";
  totalUnits: number;
  availableUnits: number;
  conflictDates: string[];
  capacityOk: boolean;
  effectiveNightlyPrice: number;
  totalStayRoomPrice: number;
  activeRateBadgeTh: string;
  hasSpecialOrSeasonalRate: boolean;
}

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  timestamp: string;
  recommendedRoomIds?: string[];
  showCoupons?: boolean;
  showAddons?: boolean;
}

interface AiBookingChatViewProps {
  propertyNameTh: string;
  propertyNameEn: string;
  lang: "th" | "en";
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  setGuests: (g: number) => void;
  rooms: RoomLodge[];
  roomStatusMap: Record<string, RoomStatusSummary>;
  coupons: PromoCoupon[];
  appliedCouponCode: string | null;
  onApplyCoupon: (code: string) => void;
  addons: ExtraAddon[];
  selectedAddons: string[];
  onToggleAddon: (addonId: string) => void;
  weather: LiveWeatherData | null;
  formatShortDate: (dateStr: string) => string;
  onOpenRoomDetails: (room: RoomLodge) => void;
  onSwitchToBookTab: () => void;
}

export function AiBookingChatView({
  propertyNameTh,
  lang,
  checkIn,
  checkOut,
  nights,
  guests,
  setGuests,
  rooms,
  roomStatusMap,
  coupons,
  appliedCouponCode,
  onApplyCoupon,
  addons,
  selectedAddons,
  onToggleAddon,
  weather,
  formatShortDate,
  onOpenRoomDetails,
  onSwitchToBookTab,
}: AiBookingChatViewProps) {
  const availableRooms = rooms.filter((r) => {
    const st = roomStatusMap[r.id];
    return st?.state === "AVAILABLE" && (st?.availableUnits ?? 0) > 0;
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: "welcome-msg",
      role: "assistant",
      text: `สวัสดีครับ! ผมคือ my-hotel AI Concierge ผู้ช่วยจองห้องพักอัจฉริยะของ ${propertyNameTh} ✨\n\nตอนนี้คุณกำลังดูวันเข้าพัก ${formatShortDate(
        checkIn
      )} – ${formatShortDate(
        checkOut
      )} (${nights} คืน · ผู้เข้าพัก ${guests} ท่าน) ซึ่งมีห้องว่างพร้อมจองทั้งหมด ${
        availableRooms.length
      } แบบครับ\n\nคุณสามารถพิมพ์ถามหรือกดปุ่มด้านล่างเพื่อให้ผมแนะนำห้องพัก คำนวณราคา ใช้คูปองส่วนลด หรือเปิดหน้าจองให้ได้ทันทีครับ!`,
      timestamp: "เมื่อสักครู่",
      recommendedRoomIds: availableRooms.slice(0, 2).map((r) => r.id),
    },
  ]);

  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSendPrompt = (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed,
      timestamp: new Date().toLocaleTimeString("th-TH", {
        hour: "2-digit",
        minute: "2-digit",
      }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsTyping(true);

    setTimeout(() => {
      const lower = trimmed.toLowerCase();
      let replyText = "";
      let recRoomIds: string[] = [];
      let showCoupons = false;
      let showAddons = false;

      // 1. Check if user mentions a coupon or promotion
      if (
        lower.includes("คูปอง") ||
        lower.includes("โปร") ||
        lower.includes("ส่วนลด") ||
        lower.includes("discount") ||
        lower.includes("sapan10") ||
        lower.includes("direct15")
      ) {
        const activeCoupons = coupons.filter((c) => c.isActive);
        if (lower.includes("sapan10")) {
          onApplyCoupon("SAPAN10");
        } else if (lower.includes("direct15")) {
          onApplyCoupon("DIRECT15");
        }
        replyText = `สำหรับช่วงวันที่ ${formatShortDate(
          checkIn
        )} – ${formatShortDate(
          checkOut
        )} คุณสามารถใช้คูปองส่วนลดสำหรับการจองตรงได้ ${
          activeCoupons.length
        } รายการครับ กดปุ่ม "ใช้โค้ดลดทันที" บนการ์ดคูปองด้านล่างเพื่อนำไปหักลดราคาห้องพักอัตโนมัติได้เลยครับ!`;
        showCoupons = true;
      }
      // 2. Check if user asks about weather / temperature
      else if (
        lower.includes("อากาศ") ||
        lower.includes("หนาว") ||
        lower.includes("องศา") ||
        lower.includes("หมอก") ||
        lower.includes("weather")
      ) {
        const coldest = weather?.daily?.length
          ? [...weather.daily].sort((a, b) => a.tempMin - b.tempMin)[0]
          : null;
        replyText = `อุณหภูมิปัจจุบันที่ ${propertyNameTh} อยู่ที่ประมาณ ${
          weather?.currentTemp ?? 22
        }°C ครับ 🌤️ ${
          coldest
            ? `และในรอบ 14 วันข้างหน้า วันที่อากาศเย็นที่สุดจะลดลงถึง ${
                coldest.tempMin
              }°C (${formatShortDate(coldest.dateStr)})`
            : ""
        }\n\nผมคัดห้องพักที่มีระเบียงชมทะเลหมอกแบบพาโนรามาที่ยังว่างในวันที่คุณเลือกมาให้ด้านล่างครับ:`;
        recRoomIds = availableRooms.slice(0, 2).map((r) => r.id);
      }
      // 3. Check if user asks about add-ons / dining / หมูกระทะ / สปา
      else if (
        lower.includes("หมูกระทะ") ||
        lower.includes("อาหาร") ||
        lower.includes("เสริม") ||
        lower.includes("สปา") ||
        lower.includes("tea") ||
        lower.includes("ดินเนอร์")
      ) {
        replyText = `ทางที่พักมีบริการเสริมเสิร์ฟถึงระเบียงห้องพัก (In-Villa Dining & Spa) ทั้งหมด ${
          addons.filter((a) => a.isActive).length
        } รายการครับ คุณสามารถกดเลือกเพิ่มลงในตะกร้าจองจากด้านล่างนี้ได้เลย และระบบจะนำไปรวมในสรุปราคาก่อนชำระเงินให้อัตโนมัติครับ:`;
        showAddons = true;
      }
      // 4. Check if user specifies number of guests (e.g. 3 คน, 4 ท่าน)
      else if (
        lower.includes("คน") ||
        lower.includes("ท่าน") ||
        lower.includes("ครอบครัว") ||
        lower.includes("คู่รัก")
      ) {
        const numMatch = trimmed.match(/([1-6])/);
        const targetGuests = numMatch
          ? parseInt(numMatch[1], 10)
          : lower.includes("ครอบครัว")
          ? 4
          : 2;
        setGuests(targetGuests);

        const matchingRooms = availableRooms.filter(
          (r) => r.maxGuests >= targetGuests
        );
        recRoomIds = (matchingRooms.length > 0 ? matchingRooms : availableRooms).map(
          (r) => r.id
        );
        replyText = `ผมปรับจำนวนผู้เข้าพักเป็น ${targetGuests} ท่านให้เรียบร้อยแล้วครับ! สำหรับเข้าพัก ${formatShortDate(
          checkIn
        )} – ${formatShortDate(checkOut)} (${nights} คืน) มีห้องพักที่รองรับ ${targetGuests} ท่านและพร้อมจองทันทีดังนี้ครับ:`;
      }
      // 5. Default: Show all available rooms & prices for selected dates
      else {
        if (availableRooms.length === 0) {
          replyText = `ขออภัยครับ ในช่วงวันที่ ${formatShortDate(
            checkIn
          )} – ${formatShortDate(
            checkOut
          )} ห้องพักถูกจองเต็มทุกยูนิตแล้วครับ แนะนำให้กดเปลี่ยนวันเข้าพักในหน้า Book เพื่อดูวันที่ยังมีห้องว่างครับ`;
        } else {
          recRoomIds = availableRooms.map((r) => r.id);
          replyText = `จากการตรวจสอบสถานะห้องว่างแบบเรียลไทม์สำหรับวันที่ ${formatShortDate(
            checkIn
          )} – ${formatShortDate(
            checkOut
          )} (${nights} คืน · ผู้เข้าพัก ${guests} ท่าน) พบห้องว่างพร้อมจองทั้งหมด ${
            availableRooms.length
          } รายการครับ:\n\nคุณสามารถกดปุ่ม "ดูรายละเอียด & จองห้องนี้" เพื่อดูราคารายคืน เลือกบริการเสริม และรับ QR PromptPay ล็อคห้อง 15 นาทีได้เลยครับ`;
        }
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        text: replyText,
        timestamp: new Date().toLocaleTimeString("th-TH", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        recommendedRoomIds: recRoomIds.length > 0 ? recRoomIds : undefined,
        showCoupons,
        showAddons,
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 450);
  };

  const quickPrompts = [
    "เช็คห้องว่างทั้งหมดสำหรับวันที่เลือก",
    "แนะนำวิลล่าส่วนตัวสำหรับ 2 ท่าน",
    "มีคูปองส่วนลดอะไรใช้ได้บ้าง?",
    "ดูเมนูหมูกระทะ & บริการเสริม",
    "มาพัก 4 ท่าน แนะนำห้องไหนดี?",
    "พยากรณ์อากาศสะปันช่วงนี้กี่องศา?",
  ];

  return (
    <section className="py-6 sm:py-10 bg-[#F6F8FB] min-h-[calc(100vh-3.5rem)] pb-28 md:pb-12">
      <div className="max-w-5xl mx-auto px-4 sm:px-6">
        {/* Top Context Header Card (Fastwork Modern Style) */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-moder-card p-4 sm:p-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-[#0063F5] to-[#2563EB] text-white flex items-center justify-center shadow-[0_6px_16px_rgba(0,99,245,0.28)] shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-extrabold text-[#121317]">
                  AI Booking Concierge · จองห้องพักผ่าน AI อัจฉริยะ
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Online 24/7
                </span>
              </div>
              <p className="text-xs text-[#475467] mt-0.5">
                เช็คห้องว่างแบบเรียลไทม์ คำนวณราคาตามฤดูกาล ใช้คูปองส่วนลด และเปิดหน้าจองได้ทันทีในแชทเดียว
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onSwitchToBookTab}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#EFF6FF] hover:bg-[#DBEAFE] border border-[#BFDBFE] px-3.5 py-2 text-xs font-bold text-[#0063F5] transition cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {formatShortDate(checkIn)} – {formatShortDate(checkOut)} ({nights}{" "}
                คืน)
              </span>
            </button>
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-[#121317]">
              <Users className="w-3.5 h-3.5 text-[#0063F5]" />
              <span>{guests} ท่าน</span>
            </div>
          </div>
        </div>

        {/* Main Chat Container */}
        <div className="rounded-2xl bg-white border border-slate-200/90 shadow-moder-card overflow-hidden flex flex-col min-h-[540px] max-h-[72vh]">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5 bg-gradient-to-b from-[#F8FAFC] to-white">
            {messages.map((msg) => {
              const isBot = msg.role === "assistant";
              const recRooms =
                msg.recommendedRoomIds
                  ?.map((id) => rooms.find((r) => r.id === id))
                  .filter((r): r is RoomLodge => Boolean(r)) ?? [];

              return (
                <div
                  key={msg.id}
                  className={`flex items-start gap-3 ${
                    isBot ? "justify-start" : "justify-end"
                  }`}
                >
                  {isBot && (
                    <div className="h-9 w-9 rounded-xl bg-[#0063F5] text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                      <Bot className="w-5 h-5" />
                    </div>
                  )}

                  <div
                    className={`max-w-2xl space-y-3 ${
                      isBot ? "w-full" : "w-auto"
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3.5 text-xs sm:text-sm leading-relaxed whitespace-pre-line ${
                        isBot
                          ? "bg-white border border-slate-200/90 text-[#121317] shadow-2xs"
                          : "bg-[#0063F5] text-white font-medium shadow-[0_4px_14px_rgba(0,99,245,0.25)]"
                      }`}
                    >
                      {msg.text}
                    </div>

                    {/* Interactive Room Recommendation Cards inside AI Response */}
                    {isBot && recRooms.length > 0 && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                        {recRooms.map((room) => {
                          const st = roomStatusMap[room.id];
                          const nightly =
                            st?.effectiveNightlyPrice ?? room.basePriceThb;
                          const totalStay =
                            st?.totalStayRoomPrice ?? nightly * nights;
                          const isAvail =
                            st?.state === "AVAILABLE" &&
                            (st?.availableUnits ?? 0) > 0;

                          return (
                            <div
                              key={room.id}
                              className="group rounded-2xl bg-white border border-slate-200 hover:border-[#0063F5] shadow-xs hover:shadow-md transition overflow-hidden flex flex-col justify-between"
                            >
                              <div>
                                <div className="relative h-36 w-full overflow-hidden bg-slate-100">
                                  <img
                                    src={room.images[0]?.url}
                                    alt={room.nameTh}
                                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                                  />
                                  <span className="absolute top-2.5 left-2.5 rounded-full bg-[#0063F5] text-white px-2.5 py-0.5 text-[10px] font-bold shadow-xs">
                                    {room.code} · ว่าง {st?.availableUnits ?? 1}{" "}
                                    ยูนิต
                                  </span>
                                  {room.discountPercent > 0 && (
                                    <span className="absolute top-2.5 right-2.5 rounded-full bg-rose-600 text-white px-2 py-0.5 text-[10px] font-bold">
                                      -{room.discountPercent}%
                                    </span>
                                  )}
                                </div>

                                <div className="p-3.5 space-y-1.5">
                                  <h4 className="font-bold text-sm text-[#121317] line-clamp-1">
                                    {lang === "th" ? room.nameTh : room.nameEn}
                                  </h4>
                                  <p className="text-[11px] text-[#475467] flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1">
                                      <BedDouble className="w-3.5 h-3.5 text-[#0063F5]" />
                                      {room.sizeSqm} ตร.ม.
                                    </span>
                                    <span>·</span>
                                    <span>
                                      พัก {room.baseGuests}–{room.maxGuests} ท่าน
                                    </span>
                                  </p>
                                  <div className="pt-1 flex items-baseline justify-between">
                                    <div>
                                      <span className="text-base font-extrabold text-[#0063F5]">
                                        ฿{nightly.toLocaleString()}
                                      </span>
                                      <span className="text-[11px] text-[#64748B]">
                                        {" "}
                                        / คืน
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-semibold text-[#121317]">
                                      รวม {nights} คืน ฿
                                      {totalStay.toLocaleString()}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              <div className="px-3.5 pb-3.5">
                                <button
                                  type="button"
                                  disabled={!isAvail}
                                  onClick={() => onOpenRoomDetails(room)}
                                  className="w-full rounded-xl bg-[#0063F5] hover:bg-[#0052CC] disabled:bg-slate-200 text-white py-2 px-3 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
                                >
                                  <span>ดูรายละเอียด & จองห้องนี้</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Interactive Coupons inside AI Response */}
                    {isBot && msg.showCoupons && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {coupons
                          .filter((c) => c.isActive)
                          .map((c) => {
                            const isApplied = appliedCouponCode === c.code;
                            return (
                              <div
                                key={c.id}
                                className={`rounded-xl border p-3.5 flex items-center justify-between gap-3 ${
                                  isApplied
                                    ? "bg-[#EFF6FF] border-[#0063F5]"
                                    : "bg-white border-slate-200"
                                }`}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5 text-[#0063F5]" />
                                    <span className="font-mono text-xs font-extrabold text-[#0063F5]">
                                      {c.code}
                                    </span>
                                  </div>
                                  <p className="text-xs font-bold text-[#121317] truncate mt-0.5">
                                    {c.titleTh}
                                  </p>
                                  <p className="text-[11px] text-[#64748B]">
                                    ขั้นต่ำ ฿{c.minSpendThb.toLocaleString()}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => onApplyCoupon(c.code)}
                                  className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition cursor-pointer ${
                                    isApplied
                                      ? "bg-emerald-600 text-white"
                                      : "bg-[#0063F5] hover:bg-[#0052CC] text-white"
                                  }`}
                                >
                                  {isApplied ? "✓ ใช้แล้ว" : "ใช้โค้ดนี้"}
                                </button>
                              </div>
                            );
                          })}
                      </div>
                    )}

                    {/* Interactive Add-ons inside AI Response */}
                    {isBot && msg.showAddons && (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                        {addons
                          .filter((a) => a.isActive)
                          .map((addon) => {
                            const selected = selectedAddons.includes(addon.id);
                            return (
                              <div
                                key={addon.id}
                                onClick={() => onToggleAddon(addon.id)}
                                className={`rounded-xl border p-3 flex items-center gap-3 cursor-pointer transition ${
                                  selected
                                    ? "bg-[#EFF6FF] border-[#0063F5]"
                                    : "bg-white border-slate-200 hover:border-[#0063F5]"
                                }`}
                              >
                                <img
                                  src={addon.imageUrl}
                                  alt={addon.nameTh}
                                  className="w-14 h-14 rounded-lg object-cover shrink-0"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-[#121317] truncate">
                                    {addon.nameTh}
                                  </p>
                                  <p className="text-xs font-extrabold text-[#0063F5] mt-0.5">
                                    +฿{addon.priceThb.toLocaleString()}{" "}
                                    <span className="text-[10px] font-normal text-[#64748B]">
                                      ({addon.unitTh})
                                    </span>
                                  </p>
                                </div>
                                <span
                                  className={`h-7 px-2.5 rounded-lg text-[11px] font-bold flex items-center justify-center shrink-0 ${
                                    selected
                                      ? "bg-[#0063F5] text-white"
                                      : "bg-slate-100 text-[#121317]"
                                  }`}
                                >
                                  {selected ? "✓ เลือกแล้ว" : "+ เพิ่ม"}
                                </span>
                              </div>
                            );
                          })}
                      </div>
                    )}

                    <div
                      className={`text-[10px] text-[#94A3B8] ${
                        isBot ? "text-left" : "text-right"
                      }`}
                    >
                      {msg.timestamp}
                    </div>
                  </div>

                  {!isBot && (
                    <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shrink-0 mt-0.5">
                      <User className="w-4 h-4" />
                    </div>
                  )}
                </div>
              );
            })}

            {isTyping && (
              <div className="flex items-center gap-2.5 text-xs text-[#64748B]">
                <div className="h-8 w-8 rounded-xl bg-[#EFF6FF] text-[#0063F5] flex items-center justify-center">
                  <Sparkles className="w-4 h-4 animate-spin" />
                </div>
                <span>AI Concierge กำลังตรวจสอบห้องว่างและคำนวณราคา...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick Prompt Pills */}
          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200/80 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {quickPrompts.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSendPrompt(q)}
                className="shrink-0 rounded-full bg-white hover:bg-[#EFF6FF] border border-slate-200 hover:border-[#0063F5] px-3 py-1.5 text-xs font-semibold text-[#334155] hover:text-[#0063F5] transition cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Bar */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendPrompt(input);
            }}
            className="p-3 sm:p-4 bg-white border-t border-slate-200 flex items-center gap-2.5"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="พิมพ์ถาม AI เช่น 'พัก 2 คน มีวิลล่าไหนว่างบ้าง' หรือ 'ใช้โค้ด SAPAN10'..."
              className="flex-1 h-11 rounded-xl border border-slate-200 bg-[#F8FAFC] px-4 text-xs sm:text-sm text-[#121317] placeholder:text-slate-400 focus:bg-white focus:border-[#0063F5] focus:outline-none focus:ring-3 focus:ring-[#0063F5]/15 transition"
            />
            <button
              type="submit"
              className="h-11 px-5 rounded-xl bg-[#0063F5] hover:bg-[#0052CC] text-white text-xs sm:text-sm font-bold inline-flex items-center gap-2 shadow-[0_4px_12px_rgba(0,99,245,0.25)] transition cursor-pointer shrink-0"
            >
              <span>ส่งข้อความ</span>
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </section>
  );
}
