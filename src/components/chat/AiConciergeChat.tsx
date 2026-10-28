"use client";

import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  BedDouble,
  Calendar,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  Heart,
  Image as ImageIcon,
  Info,
  Mic,
  Minus,
  Phone,
  Plus,
  RotateCcw,
  Send,
  ShoppingBag,
  Smile,
  Sparkles,
  Sticker,
  Tag,
  Users,
  X,
} from "lucide-react";
import { ExtraAddon, PromoCoupon, RoomLodge } from "@/data/rooms";
import { RoomInventoryStatus } from "@/lib/store";
import { LanguageCode } from "@/lib/dateFormatters";
import { useBodyScrollLock } from "@/lib/useBodyScrollLock";
import { LiveWeatherData } from "@/lib/weather";
import { AnimatedAiBotAvatar } from "@/components/chat/AnimatedAiBotAvatar";

export type RoomStatusSummary = RoomInventoryStatus;

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  timestamp: string;
  imageUrl?: string;
  reaction?: string;
  recommendedRoomIds?: string[];
  shouldShowCoupons?: boolean;
  shouldShowAddons?: boolean;
  suggestedPrompts?: string[];
}

export interface AiConciergeChatProps {
  propertyNameTh: string;
  propertyNameEn: string;
  language: LanguageCode;
  checkInDate: string;
  checkOutDate: string;
  stayNights: number;
  guestCount: number;
  onChangeGuestCount: (nextGuests: number) => void;
  rooms: RoomLodge[];
  roomStatusMap: Record<string, RoomInventoryStatus>;
  coupons: PromoCoupon[];
  savedCouponCodes?: string[];
  appliedCouponCode: string | null;
  onApplyCoupon: (code: string) => void;
  onClaimAndApplyCoupon?: (code: string) => void;
  onOpenCouponWallet?: () => void;
  addons: ExtraAddon[];
  selectedAddonIds: string[];
  onToggleAddon: (addonId: string) => void;
  weather: LiveWeatherData | null;
  formatShortDate: (dateStr: string) => string;
  onOpenRoomDetails: (room: RoomLodge) => void;
  onSwitchToBookTab: () => void;
  onExitChat?: () => void;
  isCompact?: boolean;
  onExpandToFullPage?: () => void;
  onCloseCompact?: () => void;
  initialPrompt?: string | null;
  onConsumeInitialPrompt?: () => void;
}

const EMOJI_PALETTE = ["😊", "❤️", "🔥", "🌲", "🌫️", "🛁", "🥓", "✨", "👍", "🙏"];

const STICKER_QUICK_PROMPTS = [
  {
    emoji: "🏡",
    labelTh: "เช็คห้องว่างทั้งหมด",
    labelEn: "Check All Available Villas",
    promptTh: "เช็คห้องว่างทั้งหมด",
    promptEn: "Check all available villas",
  },
  {
    emoji: "🎟️",
    labelTh: "ขอคูปองส่วนลด",
    labelEn: "Get Promo Codes",
    promptTh: "มีคูปองส่วนลดอะไรบ้าง?",
    promptEn: "What promo codes are available?",
  },
  {
    emoji: "💑",
    labelTh: "วิลล่าสำหรับ 2 ท่าน",
    labelEn: "Villa for 2 Guests",
    promptTh: "แนะนำวิลล่าสำหรับ 2 ท่าน",
    promptEn: "Recommend a villa for 2 guests",
  },
  {
    emoji: "🥓",
    labelTh: "เซ็ตหมูกระทะ & ดินเนอร์",
    labelEn: "Thai BBQ & Add-ons",
    promptTh: "ดูเมนูหมูกระทะ & บริการเสริม",
    promptEn: "Show Thai BBQ & in-villa dining sets",
  },
  {
    emoji: "🌫️",
    labelTh: "เช็คอุณหภูมิ & ทะเลหมอก",
    labelEn: "Weather & Mist Forecast",
    promptTh: "พยากรณ์อากาศช่วงนี้กี่องศา?",
    promptEn: "What is the current weather and mist forecast?",
  },
  {
    emoji: "📍",
    labelTh: "พิกัด & การเดินทาง",
    labelEn: "Location & Directions",
    promptTh: "ขอพิกัดแผนที่และการเดินทางไปที่พัก",
    promptEn: "Location map and directions to the resort",
  },
];

const DEFAULT_WELCOME_PROMPTS = [
  { th: "🏡 เช็คห้องว่างทั้งหมด", en: "🏡 Check all available villas" },
  { th: "🎟️ มีคูปองส่วนลดอะไรบ้าง?", en: "🎟️ What promo codes are available?" },
  { th: "🥓 ดูเมนูหมูกระทะ & บริการเสริม", en: "🥓 Show Thai BBQ & add-ons" },
  { th: "🌫️ พยากรณ์อากาศช่วงนี้กี่องศา?", en: "🌫️ Weather & mist forecast" },
];

interface ChatRoomRecommendationSliderProps {
  rooms: RoomLodge[];
  roomStatusMap: Record<string, RoomInventoryStatus>;
  stayNights: number;
  language: LanguageCode;
  onOpenRoomDetails: (room: RoomLodge) => void;
}

function ChatRoomRecommendationSlider({
  rooms,
  roomStatusMap,
  stayNights,
  language,
  onOpenRoomDetails,
}: ChatRoomRecommendationSliderProps) {
  const sliderContainerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(rooms.length > 1);

  const syncSliderScrollBounds = () => {
    const containerElement = sliderContainerRef.current;
    if (!containerElement) return;
    setCanScrollLeft(containerElement.scrollLeft > 6);
    setCanScrollRight(
      containerElement.scrollLeft + containerElement.clientWidth <
        containerElement.scrollWidth - 6
    );
  };

  useEffect(() => {
    syncSliderScrollBounds();
  }, [rooms]);

  const handleScrollSlider = (direction: "left" | "right") => {
    const containerElement = sliderContainerRef.current;
    if (!containerElement) return;
    const scrollStepPx = 260;
    containerElement.scrollBy({
      left: direction === "left" ? -scrollStepPx : scrollStepPx,
      behavior: "smooth",
    });
    setTimeout(syncSliderScrollBounds, 350);
  };

  return (
    <div className="relative group/slider max-w-[82vw] sm:max-w-[340px] pt-1 pb-1">
      {rooms.length > 1 && canScrollLeft && (
        <button
          type="button"
          onClick={() => handleScrollSlider("left")}
          aria-label={language === "th" ? "ห้องก่อนหน้า" : "Previous room"}
          title={language === "th" ? "ก่อนหน้า" : "Previous"}
          className="hidden sm:flex absolute -left-2 top-1/2 -translate-y-1/2 z-20 h-7 w-7 rounded-full bg-[var(--color-background-card)] hover:bg-[var(--color-accent)] hover:text-[var(--color-on-accent)] text-[var(--color-text-primary)] shadow-[var(--shadow-popover)] items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {rooms.length > 1 && canScrollRight && (
        <button
          type="button"
          onClick={() => handleScrollSlider("right")}
          aria-label={language === "th" ? "ห้องถัดไป" : "Next room"}
          title={language === "th" ? "ถัดไป" : "Next"}
          className="hidden sm:flex absolute -right-2 top-1/2 -translate-y-1/2 z-20 h-7 w-7 rounded-full bg-[var(--color-background-card)] hover:bg-[var(--color-accent)] hover:text-[var(--color-on-accent)] text-[var(--color-text-primary)] shadow-[var(--shadow-popover)] items-center justify-center transition-all cursor-pointer hover:scale-105 active:scale-95"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      <div
        ref={sliderContainerRef}
        onScroll={syncSliderScrollBounds}
        className="flex gap-2.5 overflow-x-auto no-scrollbar scroll-smooth"
      >
        {rooms.map((room) => {
          const roomStatus = roomStatusMap[room.id];
          const nightlyRateThb =
            roomStatus?.effectiveNightlyPrice ?? room.basePriceThb;
          const totalStayRateThb =
            roomStatus?.totalStayRoomPrice ?? nightlyRateThb * stayNights;
          const isRoomAvailable =
            roomStatus?.state === "AVAILABLE" &&
            (roomStatus?.availableUnits ?? 0) > 0;

          return (
            <div
              key={room.id}
              className="w-[240px] sm:w-[260px] shrink-0 rounded-[16px] bg-[var(--color-background-muted)] overflow-hidden flex flex-col justify-between transition"
            >
              <div>
                <div className="relative h-28 w-full overflow-hidden bg-[var(--color-background-muted)]">
                  <img
                    src={room.images[0]?.url}
                    alt={room.nameTh}
                    className="h-full w-full object-cover"
                  />
                  {room.discountPercent > 0 && (
                    <span className="badge-promo absolute top-2 left-2">
                      <Tag className="w-3 h-3" />
                      <span>-{room.discountPercent}%</span>
                    </span>
                  )}
                </div>

                <div className="p-3 space-y-1">
                  <div className="flex items-center justify-between gap-1.5">
                    <span className="inline-flex items-center h-5 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-2 ty-caption font-bold">
                      {room.code}
                    </span>
                    <span className="inline-flex items-center h-5 rounded-full bg-[var(--color-success-muted)] text-[var(--color-success)] px-2 ty-caption font-semibold">
                      {language === "th"
                        ? `ว่าง ${roomStatus?.availableUnits ?? 1} หลัง`
                        : `${roomStatus?.availableUnits ?? 1} Left`}
                    </span>
                  </div>
                  <h4 className="ty-body font-semibold line-clamp-1 pt-0.5">
                    {language === "th" ? room.nameTh : room.nameEn}
                  </h4>
                  <p className="ty-caption flex items-center gap-1.5">
                    <span className="inline-flex items-center gap-1">
                      <BedDouble className="w-3.5 h-3.5" />
                      {room.sizeSqm} {language === "th" ? "ตร.ม." : "m²"}
                    </span>
                    <span>·</span>
                    <span>
                      {room.baseGuests}–{room.maxGuests}{" "}
                      {language === "th" ? "ท่าน" : "guests"}
                    </span>
                  </p>
                  <div className="pt-0.5 flex items-baseline justify-between">
                    <div>
                      <span className="ty-body font-bold">
                        ฿{nightlyRateThb.toLocaleString()}
                      </span>
                      <span className="ty-caption">
                        {language === "th" ? " / คืน" : " / night"}
                      </span>
                    </div>
                    <span className="ty-caption font-medium">
                      {language === "th" ? "รวม " : "Total "}฿
                      {totalStayRateThb.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="px-3 pb-3">
                <button
                  type="button"
                  disabled={!isRoomAvailable}
                  onClick={() => onOpenRoomDetails(room)}
                  className="btn-round-solid w-full !h-9"
                >
                  <span>
                    {language === "th" ? "จองห้องนี้" : "Book Room"}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AiConciergeChat({
  propertyNameTh,
  propertyNameEn,
  language,
  checkInDate,
  checkOutDate,
  stayNights,
  guestCount,
  onChangeGuestCount,
  rooms,
  roomStatusMap,
  coupons,
  savedCouponCodes = [],
  appliedCouponCode,
  onApplyCoupon,
  onClaimAndApplyCoupon,
  onOpenCouponWallet,
  addons,
  selectedAddonIds,
  onToggleAddon,
  weather,
  formatShortDate,
  onOpenRoomDetails,
  onSwitchToBookTab,
  onExitChat,
  isCompact = false,
  onExpandToFullPage,
  onCloseCompact,
  initialPrompt,
  onConsumeInitialPrompt,
}: AiConciergeChatProps) {
  const availableRooms = rooms.filter((room) => {
    const roomStatus = roomStatusMap[room.id];
    return (
      roomStatus?.state === "AVAILABLE" &&
      (roomStatus?.availableUnits ?? 0) > 0
    );
  });

  const savedCodeUpperSet = new Set(
    savedCouponCodes.map((code) => code.toUpperCase())
  );

  const createWelcomeMessage = (): ChatMessage => ({
    id: "welcome-msg",
    role: "assistant",
    text:
      language === "th"
        ? `สวัสดีครับ! ผมคือ AI Concierge ผู้ช่วยดูแลการจองของ ${propertyNameTh} 🌲\n\nยินดีต้อนรับครับ คุณสามารถสอบถามข้อมูลห้องพัก เช็คโปรโมชั่น หรือเลือกหัวข้อยอดนิยมด้านล่างเพื่อเริ่มต้นได้เลยครับ`
        : `Hello! I'm your AI Concierge at ${propertyNameEn} 🌲\n\nWelcome! How may I assist you today? Feel free to ask about rooms, promo codes, or pick a popular topic below to get started:`,
    timestamp: language === "th" ? "เมื่อสักครู่" : "Just now",
    suggestedPrompts: DEFAULT_WELCOME_PROMPTS.map((promptItem) =>
      language === "th" ? promptItem.th : promptItem.en
    ),
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createWelcomeMessage(),
  ]);

  useEffect(() => {
    setMessages((previousMessages) =>
      previousMessages.map((message) =>
        message.id === "welcome-msg" ? createWelcomeMessage() : message
      )
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language]);

  const [draftInput, setDraftInput] = useState("");
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [shouldShowEmojiPicker, setShouldShowEmojiPicker] = useState(false);
  const [shouldShowStickerTray, setShouldShowStickerTray] = useState(false);
  const [shouldShowInfoPanel, setShouldShowInfoPanel] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  const threadBottomRef = useRef<HTMLDivElement | null>(null);
  const fileAttachmentInputRef = useRef<HTMLInputElement | null>(null);
  const messageInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (messages.length > 1 || isAssistantTyping) {
      threadBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isAssistantTyping]);

  const handleToggleMessageReaction = (messageId: string, emoji = "❤️") => {
    setMessages((previousMessages) =>
      previousMessages.map((message) =>
        message.id === messageId
          ? {
              ...message,
              reaction: message.reaction === emoji ? undefined : emoji,
            }
          : message
      )
    );
  };

  const applyAndSaveCoupon = (couponCode: string) => {
    if (onClaimAndApplyCoupon) {
      onClaimAndApplyCoupon(couponCode);
      return;
    }
    onApplyCoupon(couponCode);
  };

  const generateAssistantReply = (
    trimmedPrompt: string,
    hasAttachedImage = false
  ) => {
    setIsAssistantTyping(true);
    setTimeout(() => {
      const normalizedPrompt = trimmedPrompt.toLowerCase();
      let replyText = "";
      let recommendedRoomIds: string[] = [];
      let shouldShowCoupons = false;
      let shouldShowAddons = false;

      if (hasAttachedImage) {
        replyText =
          language === "th"
            ? `ได้รับรูปภาพเรียบร้อยครับ 📸 หากเป็นสลิปโอนเงินมัดจำ คุณสามารถกดเลือกห้องพักที่ต้องการด้านล่างแล้วแนบสลิปในหน้ายืนยันการจองเพื่อรับรหัส Booking Confirmation ทันทีครับ หรือหากต้องการสอบถามรายละเอียดเกี่ยวกับภาพนี้ พิมพ์บอกผมได้เลยครับ`
            : `Photo received! 📸 If this is a payment transfer slip, please select your villa below and upload the slip in the Confirm Booking step for instant QR verification.`;
        recommendedRoomIds = availableRooms.slice(0, 2).map((room) => room.id);
      } else if (
        normalizedPrompt.includes("คูปอง") ||
        normalizedPrompt.includes("โปร") ||
        normalizedPrompt.includes("ส่วนลด") ||
        normalizedPrompt.includes("กระเป๋า") ||
        normalizedPrompt.includes("discount") ||
        normalizedPrompt.includes("promo") ||
        normalizedPrompt.includes("code") ||
        normalizedPrompt.includes("sapan10") ||
        normalizedPrompt.includes("direct15")
      ) {
        const activeCoupons = coupons.filter((coupon) => coupon.isActive);
        if (normalizedPrompt.includes("sapan10")) {
          applyAndSaveCoupon("SAPAN10");
        } else if (normalizedPrompt.includes("direct15")) {
          applyAndSaveCoupon("DIRECT15");
        }
        replyText =
          language === "th"
            ? `สำหรับช่วงวันที่ ${formatShortDate(
                checkInDate
              )} – ${formatShortDate(
                checkOutDate
              )} คุณสามารถเก็บและใช้คูปองส่วนลดสำหรับการจองตรงได้ ${
                activeCoupons.length
              } รายการครับ กดปุ่มด้านล่างเพื่อเก็บเข้ากระเป๋าคูปองและลดราคาห้องพักอัตโนมัติได้เลยครับ`
            : `For your stay (${formatShortDate(
                checkInDate
              )} – ${formatShortDate(checkOutDate)}), we have ${
                activeCoupons.length
              } exclusive direct-booking promo codes. Tap below to save to your Coupon Bag and apply automatically:`;
        shouldShowCoupons = true;
      } else if (
        normalizedPrompt.includes("อากาศ") ||
        normalizedPrompt.includes("หนาว") ||
        normalizedPrompt.includes("องศา") ||
        normalizedPrompt.includes("หมอก") ||
        normalizedPrompt.includes("weather") ||
        normalizedPrompt.includes("mist")
      ) {
        const coolestForecastDay = weather?.daily?.length
          ? [...weather.daily].sort((dayA, dayB) => dayA.tempMin - dayB.tempMin)[0]
          : null;
        replyText =
          language === "th"
            ? `อุณหภูมิปัจจุบันที่ ${propertyNameTh} อยู่ที่ประมาณ ${
                weather?.currentTemp ?? 21
              }°C ครับ ${
                coolestForecastDay
                  ? `และในรอบ 14 วันข้างหน้า วันที่อากาศเย็นที่สุดจะลดลงถึง ${
                      coolestForecastDay.tempMin
                    }°C (${formatShortDate(coolestForecastDay.dateStr)})`
                  : ""
              }\n\nผมคัดห้องพักที่มีระเบียงชมทะเลหมอกแบบพาโนรามาที่ยังว่างในวันที่คุณเลือกมาให้ด้านล่างครับ:`
            : `Current temperature at ${propertyNameEn} is around ${
                weather?.currentTemp ?? 21
              }°C. ${
                coolestForecastDay
                  ? `Over the next 14 days, the coolest morning will dip to ${
                      coolestForecastDay.tempMin
                    }°C (${formatShortDate(coolestForecastDay.dateStr)}).`
                  : ""
              }\n\nHere are our panoramic sea-of-mist villas available for your dates:`;
        recommendedRoomIds = availableRooms.slice(0, 2).map((room) => room.id);
      } else if (
        normalizedPrompt.includes("หมูกระทะ") ||
        normalizedPrompt.includes("อาหาร") ||
        normalizedPrompt.includes("เสริม") ||
        normalizedPrompt.includes("สปา") ||
        normalizedPrompt.includes("tea") ||
        normalizedPrompt.includes("bbq") ||
        normalizedPrompt.includes("dining") ||
        normalizedPrompt.includes("ดินเนอร์")
      ) {
        const activeAddonsCount = addons.filter((addon) => addon.isActive).length;
        replyText =
          language === "th"
            ? `ทางที่พักมีบริการเสริมเสิร์ฟถึงระเบียงห้องพัก (In-Villa Dining & Spa) ทั้งหมด ${activeAddonsCount} รายการครับ กดเลือกเพิ่มลงในรายการจองจากด้านล่างนี้ได้เลยครับ:`
            : `We offer ${activeAddonsCount} private in-villa dining & wellness add-ons served right to your terrace. Tap to add them to your stay:`;
        shouldShowAddons = true;
      } else if (
        normalizedPrompt.includes("พิกัด") ||
        normalizedPrompt.includes("แผนที่") ||
        normalizedPrompt.includes("เดินทาง") ||
        normalizedPrompt.includes("ที่ตั้ง") ||
        normalizedPrompt.includes("location") ||
        normalizedPrompt.includes("direction") ||
        normalizedPrompt.includes("map")
      ) {
        replyText =
          language === "th"
            ? `📍 ${propertyNameTh} ตั้งอยู่ที่หมู่บ้านสะปัน อ.บ่อเกลือ จ.น่าน (ห่างจากจุดชมวิววัดสะปันเพียง 3 นาที และน้ำตกสะปัน 2 นาที)\n\n• มีที่จอดรถส่วนตัวหน้าวิลล่าทุกหลัง\n• รถเก๋งเล็กสามารถเดินทางขึ้นได้สะดวกครับ\n• โทรสอบถามเส้นทาง: 089-999-0000`
            : `📍 ${propertyNameEn} is located in Ban Sapan, Bo Kluea District, Nan (just 3 mins from Wat Sapan Viewpoint and 2 mins from Sapan Waterfall).\n\n• Private parking beside your villa\n• Accessible for all standard passenger cars\n• Call for directions: 089-999-0000`;
      } else if (
        normalizedPrompt.includes("คน") ||
        normalizedPrompt.includes("ท่าน") ||
        normalizedPrompt.includes("ครอบครัว") ||
        normalizedPrompt.includes("คู่รัก") ||
        normalizedPrompt.includes("guest") ||
        normalizedPrompt.includes("couple") ||
        normalizedPrompt.includes("family")
      ) {
        const numericMatch = trimmedPrompt.match(/([1-6])/);
        const targetGuestCount = numericMatch
          ? parseInt(numericMatch[1], 10)
          : normalizedPrompt.includes("ครอบครัว") ||
            normalizedPrompt.includes("family")
          ? 4
          : 2;
        onChangeGuestCount(targetGuestCount);

        const matchingRooms = availableRooms.filter(
          (room) => room.maxGuests >= targetGuestCount
        );
        recommendedRoomIds = (
          matchingRooms.length > 0 ? matchingRooms : availableRooms
        ).map((room) => room.id);
        replyText =
          language === "th"
            ? `ผมปรับจำนวนผู้เข้าพักเป็น ${targetGuestCount} ท่านให้เรียบร้อยแล้วครับ สำหรับเข้าพัก ${formatShortDate(
                checkInDate
              )} – ${formatShortDate(
                checkOutDate
              )} (${stayNights} คืน) มีห้องพักที่รองรับ ${targetGuestCount} ท่านดังนี้ครับ:`
            : `I've updated your party size to ${targetGuestCount} guests. For ${formatShortDate(
                checkInDate
              )} – ${formatShortDate(
                checkOutDate
              )} (${stayNights} nights), here are our villas accommodating ${targetGuestCount} guests:`;
      } else if (availableRooms.length === 0) {
        replyText =
          language === "th"
            ? `ขออภัยครับ ในช่วงวันที่ ${formatShortDate(
                checkInDate
              )} – ${formatShortDate(
                checkOutDate
              )} ห้องพักถูกจองเต็มทุกยูนิตแล้วครับ แนะนำให้กดเปลี่ยนวันเข้าพักด้านบนเพื่อดูวันที่ยังมีห้องว่างครับ`
            : `Sorry, all villas are fully booked for ${formatShortDate(
                checkInDate
              )} – ${formatShortDate(
                checkOutDate
              )}. Please try selecting different dates on the booking calendar.`;
      } else {
        recommendedRoomIds = availableRooms.map((room) => room.id);
        replyText =
          language === "th"
            ? `ตรวจสอบสถานะห้องว่างเรียลไทม์สำหรับ ${formatShortDate(
                checkInDate
              )} – ${formatShortDate(
                checkOutDate
              )} (${stayNights} คืน · ${guestCount} ท่าน) พบห้องว่างพร้อมจอง ${
                availableRooms.length
              } รายการครับ กดปุ่มจองห้องพักเพื่อดูรายละเอียด เลือกบริการเสริม และรับ QR ล็อคห้อง 15 นาทีได้เลยครับ:`
            : `Real-time availability for ${formatShortDate(
                checkInDate
              )} – ${formatShortDate(
                checkOutDate
              )} (${stayNights} nights · ${guestCount} guests): ${
                availableRooms.length
              } villas available! Tap "Book Room" to customize add-ons and lock your villa for 15 minutes via PromptPay QR:`;
      }

      const assistantReplyMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        text: replyText,
        timestamp: new Date().toLocaleTimeString(
          language === "th" ? "th-TH" : "en-US",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        ),
        recommendedRoomIds:
          recommendedRoomIds.length > 0 ? recommendedRoomIds : undefined,
        shouldShowCoupons,
        shouldShowAddons,
      };

      setMessages((previousMessages) => [
        ...previousMessages,
        assistantReplyMessage,
      ]);
      setIsAssistantTyping(false);
    }, 360);
  };

  const handleSendChatMessage = (promptText: string, imageUrl?: string) => {
    const trimmedPrompt = promptText.trim();
    if (!trimmedPrompt && !imageUrl) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text:
        trimmedPrompt ||
        (language === "th" ? "ส่งรูปภาพ" : "Sent a photo"),
      imageUrl,
      timestamp: new Date().toLocaleTimeString(
        language === "th" ? "th-TH" : "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      ),
    };

    setMessages((previousMessages) => [...previousMessages, userMessage]);
    setDraftInput("");
    setShouldShowEmojiPicker(false);
    setShouldShowStickerTray(false);
    generateAssistantReply(trimmedPrompt, Boolean(imageUrl));
  };

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      const promptToDispatch = initialPrompt.trim();
      onConsumeInitialPrompt?.();
      handleSendChatMessage(promptToDispatch);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const handleAttachmentUpload = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;
    const fileReader = new FileReader();
    fileReader.onload = () => {
      if (typeof fileReader.result === "string") {
        handleSendChatMessage(
          draftInput ||
            (language === "th"
              ? "แนบรูปภาพสอบถามข้อมูล"
              : "Uploaded a photo for inquiry"),
          fileReader.result
        );
      }
    };
    fileReader.readAsDataURL(selectedFile);
    event.target.value = "";
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const speechRecognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef<string>("");

  const handleToggleVoiceInput = () => {
    const fallbackVoicePrompt =
      language === "th"
        ? "เช็คห้องว่างสำหรับ 2 ท่าน พร้อมคูปองส่วนลดครับ 🎙️"
        : "Check available villas for 2 guests and promo codes 🎙️";

    if (isRecordingVoice) {
      setIsRecordingVoice(false);
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      const capturedSpeech =
        voiceTranscriptRef.current.trim() || draftInput.trim();
      if (capturedSpeech) {
        voiceTranscriptRef.current = "";
        setDraftInput("");
        handleSendChatMessage(capturedSpeech);
      }
      return;
    }

    const SpeechRecognitionConstructor =
      typeof window !== "undefined"
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).SpeechRecognition ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognitionConstructor) {
      try {
        const recognitionInstance = new SpeechRecognitionConstructor();
        recognitionInstance.lang = language === "th" ? "th-TH" : "en-US";
        recognitionInstance.interimResults = true;
        recognitionInstance.continuous = false;
        speechRecognitionRef.current = recognitionInstance;
        voiceTranscriptRef.current = "";
        setIsRecordingVoice(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognitionInstance.onresult = (speechEvent: any) => {
          let combinedTranscript = "";
          for (let i = 0; i < speechEvent.results.length; i++) {
            combinedTranscript += speechEvent.results[i][0].transcript;
          }
          voiceTranscriptRef.current = combinedTranscript;
          setDraftInput(combinedTranscript);
        };

        recognitionInstance.onend = () => {
          setIsRecordingVoice(false);
          const finalSpeech = voiceTranscriptRef.current.trim();
          if (finalSpeech) {
            voiceTranscriptRef.current = "";
            setDraftInput("");
            handleSendChatMessage(finalSpeech);
          }
        };

        recognitionInstance.onerror = () => {
          setIsRecordingVoice(false);
        };

        recognitionInstance.start();
        return;
      } catch {
        // Fall through to simulated fallback
      }
    }

    setIsRecordingVoice(true);
    setTimeout(() => {
      setIsRecordingVoice((wasRecording) => {
        if (wasRecording) {
          handleSendChatMessage(fallbackVoicePrompt);
        }
        return false;
      });
    }, 1800);
  };

  const hasDraftText = draftInput.trim().length > 0;
  const handleCloseAction = onCloseCompact ?? onExitChat;

  const chatWorkspaceContent = (
    <div
      className={`relative flex flex-col w-full overflow-hidden bg-[var(--color-background-card)] ${
        isCompact
          ? "h-full"
          : "h-[calc(100dvh-3rem)] lg:h-[calc(100dvh-4.5rem)] rounded-[20px]"
      }`}
    >
      {/* 1. Messenger Top Header Bar (Safe-area aware on full-screen mobile) */}
      <div className="px-3.5 sm:px-5 pt-[max(0.75rem,env(safe-area-inset-top))] pb-2.5 bg-[var(--color-background-card)] shadow-[0_2px_14px_rgba(15,23,42,0.04)] flex items-center justify-between gap-2 shrink-0 z-20">
        <div className="flex items-center gap-2 min-w-0">
          {handleCloseAction && (
            <button
              type="button"
              onClick={handleCloseAction}
              aria-label={language === "th" ? "ย้อนกลับ" : "Back"}
              title={language === "th" ? "ย้อนกลับ" : "Back"}
              className="sm:hidden -ml-1 btn-icon shrink-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          <AnimatedAiBotAvatar
            size="md"
            isActive={isAssistantTyping}
            isSpeaking={isAssistantTyping}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="ty-subtitle truncate">
                {language === "th" ? propertyNameTh : propertyNameEn}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-muted)] text-[var(--color-success)] px-2 h-5 ty-caption font-semibold shrink-0">
                <Sparkles className="w-3 h-3" />
                AI
              </span>
            </div>
            <button
              type="button"
              onClick={onSwitchToBookTab}
              title={language === "th" ? "เปลี่ยนวันเข้าพัก" : "Change stay dates"}
              className="ty-caption truncate flex items-center gap-1.5 hover:text-[var(--color-accent)] transition cursor-pointer text-left max-w-full"
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-success)] shrink-0" />
              <span className="truncate">
                {formatShortDate(checkInDate)} – {formatShortDate(checkOutDate)} (
                {stayNights} {language === "th" ? "คืน" : "N"} · {guestCount}{" "}
                {language === "th" ? "ท่าน" : "guests"})
              </span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={onSwitchToBookTab}
            title={language === "th" ? "เปลี่ยนวันเข้าพัก" : "Change Dates"}
            aria-label={language === "th" ? "เปลี่ยนวันเข้าพัก" : "Change Dates"}
            className="hidden sm:inline-flex h-9 w-9 rounded-full hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)] items-center justify-center transition cursor-pointer"
          >
            <Calendar className="w-4 h-4" />
          </button>

          {onOpenCouponWallet && (
            <button
              type="button"
              onClick={onOpenCouponWallet}
              title={language === "th" ? "กระเป๋าคูปอง" : "Coupon Bag"}
              aria-label={language === "th" ? "กระเป๋าคูปอง" : "Coupon Bag"}
              className="relative h-9 w-9 rounded-full hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)] flex items-center justify-center transition cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4" />
              {savedCouponCodes.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-[var(--color-promo)] text-[var(--color-on-promo)] ty-caption font-bold flex items-center justify-center leading-none">
                  {savedCouponCodes.length}
                </span>
              )}
            </button>
          )}

          <a
            href="tel:0899990000"
            title={language === "th" ? "โทรติดต่อรีสอร์ท" : "Call Resort"}
            className="hidden sm:flex h-9 w-9 rounded-full hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)] items-center justify-center transition"
          >
            <Phone className="w-4 h-4" />
          </a>

          <button
            type="button"
            onClick={() => setShouldShowInfoPanel((prev) => !prev)}
            title={
              language === "th"
                ? "ข้อมูลการจองและรายละเอียดแชท"
                : "Booking summary & info"
            }
            className={`h-9 w-9 rounded-full flex items-center justify-center transition cursor-pointer ${
              shouldShowInfoPanel
                ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                : "hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)]"
            }`}
          >
            <Info className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => setMessages([createWelcomeMessage()])}
            title={language === "th" ? "เริ่มบทสนทนาใหม่" : "Reset conversation"}
            className="hidden sm:flex h-9 w-9 rounded-full hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)] items-center justify-center transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {handleCloseAction && (
            <button
              type="button"
              onClick={handleCloseAction}
              aria-label={language === "th" ? "ปิดหน้าต่างแชท" : "Close chat"}
              title={language === "th" ? "ปิดหน้าต่างแชท" : "Close chat"}
              className="btn-icon"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Chat Thread + Optional Stay Summary Side Panel */}
      <div className="relative flex-1 flex min-h-0 overflow-hidden">
        <div className="flex-1 overflow-y-auto overscroll-contain px-3.5 sm:px-5 py-4 space-y-4 bg-[var(--color-background-card)]">
          <div className="flex justify-center">
            <span className="rounded-full bg-[var(--color-background-muted)] px-3 py-1 ty-caption font-medium text-[var(--color-text-secondary)]">
              {language === "th" ? "วันนี้" : "Today"} ·{" "}
              {formatShortDate(checkInDate)}
            </span>
          </div>

          {messages.map((message, messageIndex) => {
            const isAssistantMessage = message.role === "assistant";
            const isLatestUserMessage =
              !isAssistantMessage &&
              messageIndex === messages.length - 1 &&
              !isAssistantTyping;
            const recommendedRooms =
              message.recommendedRoomIds
                ?.map((roomId) => rooms.find((room) => room.id === roomId))
                .filter((room): room is RoomLodge => Boolean(room)) ?? [];

            return (
              <div
                key={message.id}
                className={`group flex items-end gap-2.5 ${
                  isAssistantMessage ? "justify-start" : "justify-end"
                }`}
              >
                {isAssistantMessage && (
                  <div className="shrink-0 mb-5">
                    <AnimatedAiBotAvatar
                      size="sm"
                      isActive={false}
                      isSpeaking={false}
                    />
                  </div>
                )}

                <div
                  className={`space-y-1.5 flex flex-col ${
                    isAssistantMessage
                      ? "items-start max-w-[85%] sm:max-w-[80%]"
                      : "items-end max-w-[78%] sm:max-w-[72%]"
                  }`}
                >
                  <div
                    className={`flex items-center gap-1.5 ${
                      isAssistantMessage ? "justify-start" : "flex-row-reverse"
                    }`}
                  >
                    <div
                      onDoubleClick={() =>
                        handleToggleMessageReaction(message.id, "❤️")
                      }
                      className={`relative rounded-[18px] px-3.5 py-2.5 ty-body whitespace-pre-line leading-relaxed ${
                        isAssistantMessage
                          ? "rounded-bl-[4px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                          : "rounded-br-[4px] bg-[var(--color-accent)] text-[var(--color-on-accent)] font-medium shadow-xs"
                      }`}
                    >
                      {message.imageUrl && (
                        <div className="mb-2 overflow-hidden rounded-[12px]">
                          <img
                            src={message.imageUrl}
                            alt="Uploaded attachment"
                            className="max-h-56 w-auto object-cover rounded-[12px]"
                          />
                        </div>
                      )}
                      {message.text}

                      {message.reaction && (
                        <button
                          type="button"
                          onClick={() =>
                            handleToggleMessageReaction(
                              message.id,
                              message.reaction
                            )
                          }
                          className="absolute -bottom-2.5 right-3 h-6 px-1.5 rounded-full bg-[var(--color-background-card)] shadow-[var(--shadow-popover)] ty-caption flex items-center justify-center cursor-pointer text-[var(--color-text-primary)]"
                        >
                          {message.reaction}
                        </button>
                      )}
                    </div>

                    {isAssistantMessage && (
                      <button
                        type="button"
                        onClick={() =>
                          handleToggleMessageReaction(message.id, "❤️")
                        }
                        title={
                          language === "th"
                            ? "กดถูกใจข้อความ"
                            : "Like message"
                        }
                        className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-full hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-secondary)] hover:text-[var(--color-promo-text)] flex items-center justify-center transition cursor-pointer shrink-0"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            message.reaction === "❤️"
                              ? "fill-[var(--color-promo)] text-[var(--color-promo)]"
                              : ""
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {isAssistantMessage &&
                    message.suggestedPrompts &&
                    message.suggestedPrompts.length > 0 && (
                      <div className="flex flex-col gap-1.5 pt-1 w-full max-w-[290px] sm:max-w-[320px]">
                        {message.suggestedPrompts.map((promptText) => (
                          <button
                            key={promptText}
                            type="button"
                            onClick={() => handleSendChatMessage(promptText)}
                            className="group w-full rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-background-subtle)] px-3.5 py-2 ty-caption font-medium text-[var(--color-text-primary)] transition flex items-center justify-between gap-2 text-left cursor-pointer active:scale-[0.99]"
                          >
                            <span className="line-clamp-1">{promptText}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-[var(--color-text-secondary)] group-hover:text-[var(--color-accent)] group-hover:translate-x-0.5 transition-all shrink-0" />
                          </button>
                        ))}
                      </div>
                    )}

                  {isAssistantMessage && recommendedRooms.length > 0 && (
                    <ChatRoomRecommendationSlider
                      rooms={recommendedRooms}
                      roomStatusMap={roomStatusMap}
                      stayNights={stayNights}
                      language={language}
                      onOpenRoomDetails={onOpenRoomDetails}
                    />
                  )}

                  {isAssistantMessage && message.shouldShowCoupons && (
                    <div className="grid grid-cols-1 gap-2 pt-1 w-full max-w-[290px] sm:max-w-[320px]">
                      {coupons
                        .filter((coupon) => coupon.isActive)
                        .map((coupon) => {
                          const isApplied = appliedCouponCode === coupon.code;
                          const isSavedInBag = savedCodeUpperSet.has(
                            coupon.code.toUpperCase()
                          );
                          return (
                            <div
                              key={coupon.id}
                              className="rounded-[16px] bg-[var(--color-promo-muted)] p-3 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 text-[var(--color-promo-text)]">
                                  <Tag className="w-3.5 h-3.5 shrink-0" />
                                  <span className="font-mono ty-body font-bold !text-[var(--color-promo-text)]">
                                    {coupon.code}
                                  </span>
                                  {isSavedInBag && (
                                    <span className="inline-flex items-center gap-0.5 ty-caption font-semibold text-[var(--color-promo-text)]">
                                      <ShoppingBag className="w-3 h-3" />
                                    </span>
                                  )}
                                </div>
                                <p className="ty-caption truncate mt-0.5">
                                  {language === "th"
                                    ? coupon.titleTh
                                    : coupon.titleEn || coupon.titleTh}{" "}
                                  ({language === "th" ? "ขั้นต่ำ" : "Min."} ฿
                                  {coupon.minSpendThb.toLocaleString()})
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => applyAndSaveCoupon(coupon.code)}
                                className={`shrink-0 h-8 rounded-full px-3 ty-caption font-bold inline-flex items-center gap-1 transition cursor-pointer ${
                                  isApplied
                                    ? "bg-[var(--color-background-card)] text-[var(--color-promo-text)]"
                                    : "bg-[var(--color-promo)] text-[var(--color-on-promo)] hover:bg-[var(--color-promo-hover)]"
                                }`}
                              >
                                {isApplied
                                  ? language === "th"
                                    ? "✓ ใช้แล้ว"
                                    : "✓ Applied"
                                  : isSavedInBag
                                  ? language === "th"
                                    ? "ใช้โค้ด"
                                    : "Apply"
                                  : language === "th"
                                  ? "เก็บ & ใช้"
                                  : "Save & Use"}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {isAssistantMessage && message.shouldShowAddons && (
                    <div className="grid grid-cols-1 gap-2 pt-1 w-full max-w-[280px] sm:max-w-[320px]">
                      {addons
                        .filter((addon) => addon.isActive)
                        .map((addon) => {
                          const isSelected = selectedAddonIds.includes(
                            addon.id
                          );
                          return (
                            <div
                              key={addon.id}
                              onClick={() => onToggleAddon(addon.id)}
                              className="rounded-[16px] bg-[var(--color-background-muted)] p-2.5 flex items-center gap-3 cursor-pointer hover:opacity-90 transition"
                            >
                              <img
                                src={addon.imageUrl}
                                alt={
                                  language === "th"
                                    ? addon.nameTh
                                    : addon.nameEn || addon.nameTh
                                }
                                className="w-12 h-12 rounded-[12px] object-cover shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="ty-body font-semibold truncate">
                                  {language === "th"
                                    ? addon.nameTh
                                    : addon.nameEn || addon.nameTh}
                                </p>
                                <p className="ty-caption text-[var(--color-text-secondary)]">
                                  +฿{addon.priceThb.toLocaleString()} (
                                  {language === "th"
                                    ? addon.unitTh
                                    : addon.unitEn || addon.unitTh}
                                  )
                                </p>
                              </div>
                              <span
                                className={`h-8 px-3 rounded-full ty-caption font-semibold flex items-center justify-center shrink-0 ${
                                  isSelected
                                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                                    : "bg-[var(--color-background-card)] text-[var(--color-text-primary)]"
                                }`}
                              >
                                {isSelected
                                  ? language === "th"
                                    ? "✓ เลือกแล้ว"
                                    : "✓ Added"
                                  : language === "th"
                                  ? "+ เพิ่ม"
                                  : "+ Add"}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  <div
                    className={`ty-caption flex items-center gap-1 text-[var(--color-text-secondary)] ${
                      isAssistantMessage
                        ? "justify-start pl-1"
                        : "justify-end pr-1"
                    }`}
                  >
                    <span>{message.timestamp}</span>
                    {!isAssistantMessage && (
                      <span className="inline-flex items-center gap-0.5 font-medium text-[var(--color-success)]">
                        <CheckCheck className="w-3.5 h-3.5" />
                        {isLatestUserMessage && (
                          <span>
                            {language === "th" ? "อ่านแล้ว" : "Seen"}
                          </span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isAssistantTyping && (
            <div className="flex items-center gap-2.5 ty-caption">
              <AnimatedAiBotAvatar size="sm" isActive={true} isSpeaking={true} />
              <div className="rounded-full bg-[var(--color-background-muted)] px-3.5 py-2 ty-caption font-medium">
                {language === "th"
                  ? "AI Concierge กำลังพิมพ์ข้อความ..."
                  : "AI Concierge is typing..."}
              </div>
            </div>
          )}
          <div ref={threadBottomRef} />
        </div>

        {shouldShowInfoPanel && !isCompact && (
          <aside className="w-64 sm:w-72 bg-[var(--color-background-muted)] p-4 overflow-y-auto space-y-5 shrink-0">
            <div className="flex items-center justify-between">
              <h4 className="ty-subtitle">
                {language === "th" ? "สรุปการเข้าพัก" : "Stay Summary"}
              </h4>
              <button
                type="button"
                onClick={() => setShouldShowInfoPanel(false)}
                className="h-8 w-8 rounded-full hover:bg-[var(--color-background-subtle)] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="ty-caption">
                  {language === "th"
                    ? "วันเช็คอิน – เช็คเอาท์"
                    : "Check-in – Check-out"}
                </span>
                <button
                  type="button"
                  onClick={onSwitchToBookTab}
                  className="ty-caption font-semibold text-[var(--color-accent)] cursor-pointer"
                >
                  {language === "th" ? "แก้ไข" : "Edit"}
                </button>
              </div>
              <p className="ty-body font-semibold">
                {formatShortDate(checkInDate)} – {formatShortDate(checkOutDate)}{" "}
                ({stayNights} {language === "th" ? "คืน" : "nights"})
              </p>

              <div className="flex items-center justify-between pt-1">
                <span className="ty-caption flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {language === "th" ? "ผู้เข้าพัก" : "Guests"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      onChangeGuestCount(Math.max(1, guestCount - 1))
                    }
                    className="h-7 w-7 rounded-full bg-[var(--color-background-subtle)] flex items-center justify-center cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="ty-body font-semibold tabular-nums">
                    {guestCount}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      onChangeGuestCount(Math.min(8, guestCount + 1))
                    }
                    className="h-7 w-7 rounded-full bg-[var(--color-background-subtle)] flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="ty-caption font-semibold flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[var(--color-promo-text)]" />
                <span>
                  {language === "th"
                    ? "คูปองที่ใช้งานอยู่"
                    : "Active Promo Code"}
                </span>
              </p>
              {appliedCouponCode ? (
                <div className="flex items-center justify-between rounded-full bg-[var(--color-promo)] text-[var(--color-on-promo)] px-3 h-7 ty-caption font-bold">
                  <span className="font-mono">{appliedCouponCode}</span>
                  <span>{language === "th" ? "✓ ใช้แล้ว" : "✓ Applied"}</span>
                </div>
              ) : (
                <p className="ty-caption">
                  {language === "th"
                    ? "ยังไม่ได้เลือกคูปองส่วนลด"
                    : "No promo code applied"}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onSwitchToBookTab}
              className="btn-round-solid w-full"
            >
              <span>
                {language === "th" ? "ไปหน้าจองห้องพัก" : "Browse Rooms"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </aside>
        )}
      </div>

      {/* 3. Emoji & Quick Prompt Trays */}
      {shouldShowEmojiPicker && (
        <div className="mx-3.5 sm:mx-4 px-3 py-2 rounded-[16px] bg-[var(--color-background-muted)] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1.5">
            {EMOJI_PALETTE.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setDraftInput((previous) => previous + emoji);
                  messageInputRef.current?.focus();
                }}
                className="h-9 w-9 rounded-full hover:bg-[var(--color-background-subtle)] ty-title flex items-center justify-center transition cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShouldShowEmojiPicker(false)}
            className="ty-caption px-2.5 py-1 rounded-full hover:bg-[var(--color-background-subtle)] cursor-pointer"
          >
            {language === "th" ? "ปิด" : "Close"}
          </button>
        </div>
      )}

      {shouldShowStickerTray && (
        <div className="mx-3.5 sm:mx-4 py-2 grid grid-cols-2 sm:grid-cols-3 gap-2 shrink-0">
          {STICKER_QUICK_PROMPTS.map((quickItem) => (
            <button
              key={quickItem.labelTh}
              type="button"
              onClick={() =>
                handleSendChatMessage(
                  language === "th" ? quickItem.promptTh : quickItem.promptEn
                )
              }
              className="rounded-[12px] bg-[var(--color-background-muted)] hover:bg-[var(--color-accent)] hover:text-[var(--color-on-accent)] p-2.5 text-left flex items-center gap-2 transition cursor-pointer"
            >
              <span className="ty-title">{quickItem.emoji}</span>
              <span className="ty-caption font-semibold line-clamp-1">
                {language === "th" ? quickItem.labelTh : quickItem.labelEn}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* 4. Adaptive Mobile-Safe Pill Input Bar (16px on mobile prevents iOS Safari auto-zoom) */}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          handleSendChatMessage(draftInput);
        }}
        className="px-3.5 sm:px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] bg-[var(--color-background-card)] shrink-0"
      >
        <input
          ref={fileAttachmentInputRef}
          type="file"
          accept="image/*"
          onChange={handleAttachmentUpload}
          className="hidden"
        />

        <div className="flex items-center gap-2 rounded-full bg-[var(--color-background-muted)] px-3 py-1.5 focus-within:ring-2 focus-within:ring-[var(--color-accent)]/30 transition">
          <button
            type="button"
            onClick={() => {
              setShouldShowEmojiPicker((previous) => !previous);
              setShouldShowStickerTray(false);
            }}
            title="Emoji"
            className="h-8 w-8 rounded-full hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)] flex items-center justify-center shrink-0 transition cursor-pointer"
          >
            <Smile className="w-5 h-5" />
          </button>

          <input
            ref={messageInputRef}
            type="text"
            value={draftInput}
            onChange={(event) => setDraftInput(event.target.value)}
            placeholder={
              isRecordingVoice
                ? language === "th"
                  ? "กำลังฟังเสียงพูดของคุณ..."
                  : "Listening..."
                : language === "th"
                ? "พิมพ์ข้อความถึง AI Concierge..."
                : "Message..."
            }
            className="flex-1 min-w-0 bg-transparent text-[16px] sm:text-[14px] leading-normal text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
          />

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={handleToggleVoiceInput}
              title={language === "th" ? "พิมพ์ด้วยเสียง" : "Voice Message"}
              className={`${
                hasDraftText ? "hidden sm:flex" : "flex"
              } h-8 w-8 rounded-full items-center justify-center transition cursor-pointer ${
                isRecordingVoice
                  ? "bg-[var(--color-promo)] text-[var(--color-on-promo)] animate-pulse"
                  : "hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)]"
              }`}
            >
              <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              type="button"
              onClick={() => fileAttachmentInputRef.current?.click()}
              title={
                language === "th"
                  ? "แนบรูปภาพหรือสลิปโอนเงิน"
                  : "Attach photo or payment slip"
              }
              className="h-8 w-8 rounded-full hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)] flex items-center justify-center transition cursor-pointer"
            >
              <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setShouldShowStickerTray((previous) => !previous);
                setShouldShowEmojiPicker(false);
              }}
              title={
                language === "th"
                  ? "สติกเกอร์และคำถามด่วน"
                  : "Stickers & quick prompts"
              }
              className={`${
                hasDraftText ? "hidden sm:flex" : "flex"
              } h-8 w-8 rounded-full items-center justify-center transition cursor-pointer ${
                shouldShowStickerTray
                  ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                  : "hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)]"
              }`}
            >
              <Sticker className="w-4 h-4 sm:w-5 sm:h-5" />
            </button>

            {hasDraftText && (
              <button
                type="submit"
                className="ml-1 h-8 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-3.5 ty-caption font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <span>{language === "th" ? "ส่ง" : "Send"}</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );

  return chatWorkspaceContent;
}

export interface AiChatDesktopDrawerProps
  extends Omit<
    AiConciergeChatProps,
    "isCompact" | "onExpandToFullPage" | "onCloseCompact"
  > {
  onNavigateToChatPage?: () => void;
  isOnChatPage?: boolean;
  isOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

/**
 * Unified AI Concierge Drawer across ALL devices (`.app-right-drawer`):
 * - Mobile (< 640px): 100% × 100dvh Full-Screen Native Sheet
 * - Tablet (640px – 1023px): 460px Right Sidebar Drawer
 * - Desktop (>= 1024px): 520px Right Sidebar Drawer + Floating Bottom-Right Launcher
 */
export function AiChatDesktopDrawer(props: AiChatDesktopDrawerProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isOpen = props.isOpen ?? internalIsOpen;

  const { onOpenChange } = props;
  const handleOpenChange = React.useCallback(
    (nextOpenState: boolean) => {
      setInternalIsOpen(nextOpenState);
      onOpenChange?.(nextOpenState);
    },
    [onOpenChange]
  );

  useBodyScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        handleOpenChange(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, handleOpenChange]);

  return (
    <>
      <div
        onClick={() => handleOpenChange(false)}
        aria-hidden="true"
        className={`app-right-drawer-backdrop z-[68] transition-opacity duration-250 ease-out ${
          isOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
      />

      <aside
        aria-label="AI Concierge Chat Drawer"
        aria-hidden={!isOpen}
        className={`app-right-drawer z-[69] transition-transform duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] ${
          isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"
        }`}
      >
        <AiConciergeChat
          {...props}
          isCompact
          onSwitchToBookTab={() => {
            handleOpenChange(false);
            props.onSwitchToBookTab();
          }}
          onOpenCouponWallet={
            props.onOpenCouponWallet
              ? () => {
                  handleOpenChange(false);
                  props.onOpenCouponWallet?.();
                }
              : undefined
          }
          onOpenRoomDetails={(room) => {
            handleOpenChange(false);
            props.onOpenRoomDetails(room);
          }}
          onCloseCompact={() => handleOpenChange(false)}
        />
      </aside>

      <div
        style={{ right: "calc(1.5rem + var(--scrollbar-compensation, 0px))" }}
        className={`hidden lg:flex fixed bottom-6 z-40 transition-all duration-300 ease-in-out ${
          isOpen
            ? "opacity-0 scale-75 pointer-events-none translate-x-4"
            : "opacity-100 scale-100 translate-x-0"
        }`}
      >
        <button
          type="button"
          onClick={() => handleOpenChange(true)}
          title={
            props.language === "th"
              ? "แชทกับ AI Concierge"
              : "Chat with AI Concierge"
          }
          aria-label={
            props.language === "th"
              ? "แชทกับ AI Concierge"
              : "Chat with AI Concierge"
          }
          className="group relative h-14 w-14 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] shadow-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
        >
          <AnimatedAiBotAvatar size="lg" isActive={false} isSpeaking={false} />
          <span className="absolute -top-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-[var(--color-success)] ring-2 ring-[var(--color-background-body)]" />
        </button>
      </div>
    </>
  );
}

export const AiChatDrawer = AiChatDesktopDrawer;
