"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Send,
  Calendar,
  Tag,
  BedDouble,
  ArrowRight,
  Bot,
  X,
  Maximize2,
  MessageSquareText,
  RotateCcw,
  Smile,
  Mic,
  Image as ImageIcon,
  Sticker,
  Phone,
  Info,
  CheckCheck,
  Heart,
  MapPin,
  Users,
  Plus,
  Minus,
  ChevronLeft,
} from "lucide-react";
import { RoomLodge, PromoCoupon, ExtraAddon } from "@/data/rooms";
import { LiveWeatherData } from "@/components/ResortWeatherWidget";
import { StandardCard } from "@/components/ui/standards";
import { AnimatedAiBotAvatar } from "@/components/AnimatedAiBot";

export interface RoomStatusSummary {
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

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
  timestamp: string;
  imageUrl?: string;
  reaction?: string;
  recommendedRoomIds?: string[];
  showCoupons?: boolean;
  showAddons?: boolean;
}

export interface AiBookingChatViewProps {
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
  onExitChat?: () => void;
  compact?: boolean;
  onExpandToFullPage?: () => void;
  onCloseCompact?: () => void;
  initialPrompt?: string | null;
  onConsumeInitialPrompt?: () => void;
}

const EMOJI_PALETTE = ["😊", "❤️", "🔥", "🌲", "🌫️", "🛁", "🥓", "✨", "👍", "🙏"];

const STICKER_PROMPTS = [
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

export function AiBookingChatView({
  propertyNameTh,
  propertyNameEn,
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
  onExitChat,
  compact = false,
  onExpandToFullPage,
  onCloseCompact,
  initialPrompt,
  onConsumeInitialPrompt,
}: AiBookingChatViewProps) {
  const availableRooms = rooms.filter((r) => {
    const st = roomStatusMap[r.id];
    return st?.state === "AVAILABLE" && (st?.availableUnits ?? 0) > 0;
  });

  const buildWelcomeMessage = (): ChatMessage => ({
    id: "welcome-msg",
    role: "assistant",
    text:
      lang === "th"
        ? `สวัสดีครับ! ผมคือ AI Concierge ผู้ช่วยจองห้องพักของ ${propertyNameTh} 🌲\n\nวันเข้าพักที่เลือก: ${formatShortDate(
            checkIn
          )} – ${formatShortDate(checkOut)} (${nights} คืน · ${guests} ท่าน) มีห้องว่างพร้อมจอง ${
            availableRooms.length
          } แบบครับ\n\nสามารถพิมพ์ข้อความ แนบรูปสลิป หรือกดเลือกหัวข้อด้านล่างเพื่อเช็คห้องว่างและรับคูปองส่วนลดได้เลยครับ`
        : `Hello! I'm your AI Concierge at ${propertyNameEn} 🌲\n\nSelected dates: ${formatShortDate(
            checkIn
          )} – ${formatShortDate(checkOut)} (${nights} nights · ${guests} guests) — ${
            availableRooms.length
          } villa types available.\n\nAsk me anything, upload a payment slip, or tap a quick topic below to check availability and claim direct booking promo codes!`,
    timestamp: lang === "th" ? "เมื่อสักครู่" : "Just now",
    recommendedRoomIds: availableRooms.slice(0, 2).map((r) => r.id),
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    buildWelcomeMessage(),
  ]);

  useEffect(() => {
    setMessages((prev) =>
      prev.map((m) => (m.id === "welcome-msg" ? buildWelcomeMessage() : m))
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lang]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerTray, setShowStickerTray] = useState(false);
  const [showInfoDrawer, setShowInfoDrawer] = useState(false);
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);

  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const textInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (messages.length > 1 || isTyping) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping]);

  const toggleReaction = (msgId: string, emoji = "❤️") => {
    setMessages((prev) =>
      prev.map((m) =>
        m.id === msgId
          ? { ...m, reaction: m.reaction === emoji ? undefined : emoji }
          : m
      )
    );
  };

  const generateBotReply = (trimmed: string, hasImage = false) => {
    setIsTyping(true);
    setTimeout(() => {
      const lower = trimmed.toLowerCase();
      let replyText = "";
      let recRoomIds: string[] = [];
      let showCoupons = false;
      let showAddons = false;

      if (hasImage) {
        replyText =
          lang === "th"
            ? `ได้รับรูปภาพเรียบร้อยครับ 📸 หากเป็นสลิปโอนเงินมัดจำ คุณสามารถกดเลือกห้องพักที่ต้องการด้านล่างแล้วแนบสลิปในหน้ายืนยันการจองเพื่อรับรหัส Booking Confirmation ทันทีครับ หรือหากต้องการสอบถามรายละเอียดเกี่ยวกับภาพนี้ พิมพ์บอกผมได้เลยครับ`
            : `Photo received! 📸 If this is a payment transfer slip, please select your villa below and upload the slip in the Confirm Booking step for instant QR verification.`;
        recRoomIds = availableRooms.slice(0, 2).map((r) => r.id);
      } else if (
        lower.includes("คูปอง") ||
        lower.includes("โปร") ||
        lower.includes("ส่วนลด") ||
        lower.includes("discount") ||
        lower.includes("promo") ||
        lower.includes("code") ||
        lower.includes("sapan10") ||
        lower.includes("direct15")
      ) {
        const activeCoupons = coupons.filter((c) => c.isActive);
        if (lower.includes("sapan10")) {
          onApplyCoupon("SAPAN10");
        } else if (lower.includes("direct15")) {
          onApplyCoupon("DIRECT15");
        }
        replyText =
          lang === "th"
            ? `สำหรับช่วงวันที่ ${formatShortDate(
                checkIn
              )} – ${formatShortDate(
                checkOut
              )} คุณสามารถใช้คูปองส่วนลดสำหรับการจองตรงได้ ${
                activeCoupons.length
              } รายการครับ กดปุ่ม "ใช้โค้ดนี้" ด้านล่างเพื่อนำไปลดราคาห้องพักอัตโนมัติได้เลยครับ`
            : `For your stay (${formatShortDate(checkIn)} – ${formatShortDate(
                checkOut
              )}), we have ${
                activeCoupons.length
              } exclusive direct-booking promo codes available. Tap "Apply Code" below to automatically apply the discount:`;
        showCoupons = true;
      } else if (
        lower.includes("อากาศ") ||
        lower.includes("หนาว") ||
        lower.includes("องศา") ||
        lower.includes("หมอก") ||
        lower.includes("weather") ||
        lower.includes("mist")
      ) {
        const coldest = weather?.daily?.length
          ? [...weather.daily].sort((a, b) => a.tempMin - b.tempMin)[0]
          : null;
        replyText =
          lang === "th"
            ? `อุณหภูมิปัจจุบันที่ ${propertyNameTh} อยู่ที่ประมาณ ${
                weather?.currentTemp ?? 21
              }°C ครับ ${
                coldest
                  ? `และในรอบ 14 วันข้างหน้า วันที่อากาศเย็นที่สุดจะลดลงถึง ${
                      coldest.tempMin
                    }°C (${formatShortDate(coldest.dateStr)})`
                  : ""
              }\n\nผมคัดห้องพักที่มีระเบียงชมทะเลหมอกแบบพาโนรามาที่ยังว่างในวันที่คุณเลือกมาให้ด้านล่างครับ:`
            : `Current temperature at ${propertyNameEn} is around ${
                weather?.currentTemp ?? 21
              }°C. ${
                coldest
                  ? `Over the next 14 days, the coolest morning will dip to ${
                      coldest.tempMin
                    }°C (${formatShortDate(coldest.dateStr)}).`
                  : ""
              }\n\nHere are our panoramic sea-of-mist villas available for your dates:`;
        recRoomIds = availableRooms.slice(0, 2).map((r) => r.id);
      } else if (
        lower.includes("หมูกระทะ") ||
        lower.includes("อาหาร") ||
        lower.includes("เสริม") ||
        lower.includes("สปา") ||
        lower.includes("tea") ||
        lower.includes("bbq") ||
        lower.includes("dining") ||
        lower.includes("ดินเนอร์")
      ) {
        replyText =
          lang === "th"
            ? `ทางที่พักมีบริการเสริมเสิร์ฟถึงระเบียงห้องพัก (In-Villa Dining & Spa) ทั้งหมด ${
                addons.filter((a) => a.isActive).length
              } รายการครับ กดเลือกเพิ่มลงในรายการจองจากด้านล่างนี้ได้เลยครับ:`
            : `We offer ${
                addons.filter((a) => a.isActive).length
              } private in-villa dining & wellness add-ons served right to your terrace. Tap to add them to your stay:`;
        showAddons = true;
      } else if (
        lower.includes("พิกัด") ||
        lower.includes("แผนที่") ||
        lower.includes("เดินทาง") ||
        lower.includes("ที่ตั้ง") ||
        lower.includes("location") ||
        lower.includes("direction") ||
        lower.includes("map")
      ) {
        replyText =
          lang === "th"
            ? `📍 ${propertyNameTh} ตั้งอยู่ที่หมู่บ้านสะปัน อ.บ่อเกลือ จ.น่าน (ห่างจากจุดชมวิววัดสะปันเพียง 3 นาที และน้ำตกสะปัน 2 นาที)\n\n• มีที่จอดรถส่วนตัวหน้าวิลล่าทุกหลัง\n• รถเก๋งเล็กสามารถเดินทางขึ้นได้สะดวกครับ\n• โทรสอบถามเส้นทาง: 089-999-0000`
            : `📍 ${propertyNameEn} is located in Ban Sapan, Bo Kluea District, Nan (just 3 mins from Wat Sapan Viewpoint and 2 mins from Sapan Waterfall).\n\n• Private parking beside your villa\n• Accessible for all standard passenger cars\n• Call for directions: 089-999-0000`;
      } else if (
        lower.includes("คน") ||
        lower.includes("ท่าน") ||
        lower.includes("ครอบครัว") ||
        lower.includes("คู่รัก") ||
        lower.includes("guest") ||
        lower.includes("couple") ||
        lower.includes("family")
      ) {
        const numMatch = trimmed.match(/([1-6])/);
        const targetGuests = numMatch
          ? parseInt(numMatch[1], 10)
          : lower.includes("ครอบครัว") || lower.includes("family")
          ? 4
          : 2;
        setGuests(targetGuests);

        const matchingRooms = availableRooms.filter(
          (r) => r.maxGuests >= targetGuests
        );
        recRoomIds = (
          matchingRooms.length > 0 ? matchingRooms : availableRooms
        ).map((r) => r.id);
        replyText =
          lang === "th"
            ? `ผมปรับจำนวนผู้เข้าพักเป็น ${targetGuests} ท่านให้เรียบร้อยแล้วครับ สำหรับเข้าพัก ${formatShortDate(
                checkIn
              )} – ${formatShortDate(
                checkOut
              )} (${nights} คืน) มีห้องพักที่รองรับ ${targetGuests} ท่านดังนี้ครับ:`
            : `I've updated your party size to ${targetGuests} guests. For ${formatShortDate(
                checkIn
              )} – ${formatShortDate(
                checkOut
              )} (${nights} nights), here are our villas accommodating ${targetGuests} guests:`;
      } else {
        if (availableRooms.length === 0) {
          replyText =
            lang === "th"
              ? `ขออภัยครับ ในช่วงวันที่ ${formatShortDate(
                  checkIn
                )} – ${formatShortDate(
                  checkOut
                )} ห้องพักถูกจองเต็มทุกยูนิตแล้วครับ แนะนำให้กดเปลี่ยนวันเข้าพักในหน้า Room เพื่อดูวันที่ยังมีห้องว่างครับ`
              : `Sorry, all villas are fully booked for ${formatShortDate(
                  checkIn
                )} – ${formatShortDate(
                  checkOut
                )}. Please try selecting different dates on the booking calendar.`;
        } else {
          recRoomIds = availableRooms.map((r) => r.id);
          replyText =
            lang === "th"
              ? `ตรวจสอบสถานะห้องว่างเรียลไทม์สำหรับ ${formatShortDate(
                  checkIn
                )} – ${formatShortDate(
                  checkOut
                )} (${nights} คืน · ${guests} ท่าน) พบห้องว่างพร้อมจอง ${
                  availableRooms.length
                } รายการครับ กดปุ่มจองห้องพักเพื่อดูรายละเอียด เลือกบริการเสริม และรับ QR ล็อคห้อง 15 นาทีได้เลยครับ:`
              : `Real-time availability for ${formatShortDate(
                  checkIn
                )} – ${formatShortDate(
                  checkOut
                )} (${nights} nights · ${guests} guests): ${
                  availableRooms.length
                } villas available! Tap "Book This Room" to customize add-ons and lock your villa for 15 minutes via PromptPay QR:`;
        }
      }

      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        text: replyText,
        timestamp: new Date().toLocaleTimeString(
          lang === "th" ? "th-TH" : "en-US",
          {
            hour: "2-digit",
            minute: "2-digit",
          }
        ),
        recommendedRoomIds: recRoomIds.length > 0 ? recRoomIds : undefined,
        showCoupons,
        showAddons,
      };

      setMessages((prev) => [...prev, botMsg]);
      setIsTyping(false);
    }, 360);
  };

  const handleSendPrompt = (promptText: string, imageUrl?: string) => {
    const trimmed = promptText.trim();
    if (!trimmed && !imageUrl) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      text: trimmed || (lang === "th" ? "ส่งรูปภาพ" : "Sent a photo"),
      imageUrl,
      timestamp: new Date().toLocaleTimeString(
        lang === "th" ? "th-TH" : "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      ),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setShowEmojiPicker(false);
    setShowStickerTray(false);
    generateBotReply(trimmed, Boolean(imageUrl));
  };

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      const promptToSend = initialPrompt.trim();
      onConsumeInitialPrompt?.();
      handleSendPrompt(promptToSend);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialPrompt]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        handleSendPrompt(
          input ||
            (lang === "th"
              ? "แนบรูปภาพสอบถามข้อมูล"
              : "Uploaded a photo for inquiry"),
          reader.result
        );
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const voiceTranscriptRef = useRef<string>("");

  const handleVoiceClick = () => {
    const fallbackVoiceText =
      lang === "th"
        ? "เช็คห้องว่างสำหรับ 2 ท่าน พร้อมคูปองส่วนลดครับ 🎙️"
        : "Check available villas for 2 guests and promo codes 🎙️";

    if (isRecordingVoice) {
      setIsRecordingVoice(false);
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore
        }
      }
      const captured = voiceTranscriptRef.current.trim() || input.trim();
      if (captured) {
        voiceTranscriptRef.current = "";
        setInput("");
        handleSendPrompt(captured);
      }
      return;
    }

    const SpeechRecognitionAPI =
      typeof window !== "undefined"
        ? // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).SpeechRecognition ||
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (window as any).webkitSpeechRecognition
        : null;

    if (SpeechRecognitionAPI) {
      try {
        const recognition = new SpeechRecognitionAPI();
        recognition.lang = lang === "th" ? "th-TH" : "en-US";
        recognition.interimResults = true;
        recognition.continuous = false;
        recognitionRef.current = recognition;
        voiceTranscriptRef.current = "";
        setIsRecordingVoice(true);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        recognition.onresult = (event: any) => {
          let transcript = "";
          for (let i = 0; i < event.results.length; i++) {
            transcript += event.results[i][0].transcript;
          }
          voiceTranscriptRef.current = transcript;
          setInput(transcript);
        };

        recognition.onend = () => {
          setIsRecordingVoice(false);
          const finalSpeech = voiceTranscriptRef.current.trim();
          if (finalSpeech) {
            voiceTranscriptRef.current = "";
            setInput("");
            handleSendPrompt(finalSpeech);
          }
        };

        recognition.onerror = () => {
          setIsRecordingVoice(false);
        };

        recognition.start();
        return;
      } catch {
        // Fall through to simulated fallback
      }
    }

    setIsRecordingVoice(true);
    setTimeout(() => {
      setIsRecordingVoice((prev) => {
        if (prev) {
          handleSendPrompt(fallbackVoiceText);
        }
        return false;
      });
    }, 1800);
  };

  const quickPrompts =
    lang === "th"
      ? [
          "เช็คห้องว่างทั้งหมด",
          "มีคูปองส่วนลดอะไรบ้าง?",
          "แนะนำวิลล่าสำหรับ 2 ท่าน",
          "ดูเมนูหมูกระทะ & บริการเสริม",
          "พยากรณ์อากาศช่วงนี้กี่องศา?",
        ]
      : [
          "Check all available villas",
          "What promo codes are available?",
          "Recommend a villa for 2 guests",
          "Show Thai BBQ & add-ons",
          "Weather & mist forecast",
        ];

  const coverAvatar =
    rooms[0]?.images[0]?.url ||
    "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80";

  const chatBody = (
    <div
      className={`relative flex flex-col w-full overflow-hidden ${
        compact
          ? "h-full"
          : "h-[100dvh] lg:h-[calc(100dvh-3rem)]"
      }`}
    >
      {/* 1. MESSENGER TOP HEADER BAR */}
      <div className="px-3.5 sm:px-5 py-3 border-b border-[var(--color-border)] bg-[var(--color-background-card)] flex items-center justify-between gap-2.5 shrink-0 z-20">
        <div className="flex items-center gap-2.5 min-w-0">
          {!compact && onExitChat && (
            <button
              type="button"
              onClick={onExitChat}
              aria-label="ออกจากโหมดแชท"
              title="ย้อนกลับ"
              className="lg:hidden -ml-1 h-9 w-9 rounded-full hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)] flex items-center justify-center shrink-0 transition cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}
          <AnimatedAiBotAvatar
            size="md"
            isActive={isTyping}
            isSpeaking={isTyping}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h2 className="ty-subtitle truncate">
                {lang === "th" ? propertyNameTh : propertyNameEn}
              </h2>
              <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-success-muted)] text-[var(--color-success)] px-2 py-0.5 text-[11px] font-semibold shrink-0">
                <Sparkles className="w-3 h-3" />
                AI
              </span>
            </div>
            <p className="ty-caption truncate flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>
                {lang === "th" ? "ออนไลน์" : "Active now"} ·{" "}
                {formatShortDate(checkIn)} – {formatShortDate(checkOut)} (
                {nights} {lang === "th" ? "คืน" : "nights"} · {guests}{" "}
                {lang === "th" ? "ท่าน" : "guests"})
              </span>
            </p>
          </div>
        </div>

        {/* Right Header Actions (Instagram DM / Messenger style) */}
        <div className="flex items-center gap-1 shrink-0">
          {!compact && (
            <button
              type="button"
              onClick={onSwitchToBookTab}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[var(--color-background-body)] hover:bg-[var(--color-overlay-hover)] px-3 py-1.5 text-[12px] font-semibold text-[var(--color-text-primary)] transition cursor-pointer"
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>{lang === "th" ? "เปลี่ยนวันพัก" : "Change Dates"}</span>
            </button>
          )}
          <a
            href="tel:0899990000"
            title={lang === "th" ? "โทรติดต่อรีสอร์ท" : "Call Resort"}
            className="h-9 w-9 rounded-full hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)] flex items-center justify-center transition"
          >
            <Phone className="w-4 h-4" />
          </a>
          <button
            type="button"
            onClick={() => setMessages([buildWelcomeMessage()])}
            title={lang === "th" ? "เริ่มบทสนทนาใหม่" : "Reset conversation"}
            className="h-9 w-9 rounded-full hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)] flex items-center justify-center transition cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          {!compact && (
            <button
              type="button"
              onClick={() => setShowInfoDrawer((prev) => !prev)}
              title={
                lang === "th"
                  ? "ข้อมูลการจองและรายละเอียดแชท"
                  : "Booking summary & info"
              }
              className={`h-9 w-9 rounded-full flex items-center justify-center transition cursor-pointer ${
                showInfoDrawer
                  ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                  : "hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)]"
              }`}
            >
              <Info className="w-4 h-4" />
            </button>
          )}
          {compact && onExpandToFullPage && (
            <button
              type="button"
              onClick={onExpandToFullPage}
              title={lang === "th" ? "เปิดหน้าแชทเต็มจอ (/chat)" : "Expand chat"}
              className="h-9 w-9 rounded-full hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)] flex items-center justify-center transition cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
          )}
          {compact && onCloseCompact && (
            <button
              type="button"
              onClick={onCloseCompact}
              title={lang === "th" ? "ย่อหน้าต่างแชท" : "Minimize chat"}
              className="h-9 w-9 rounded-full hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)] flex items-center justify-center transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* 2. MAIN CHAT AREA + OPTIONAL SLIDE-IN INFO DRAWER */}
      <div className="relative flex-1 flex min-h-0 overflow-hidden">
        {/* Scrollable Message Thread */}
        <div className="flex-1 overflow-y-auto px-3.5 sm:px-5 py-4 space-y-4 bg-[var(--color-background-card)]">

          {/* Date Separator Pill */}
          <div className="flex justify-center">
            <span className="rounded-full bg-[var(--color-background-muted)] px-3 py-1 text-[11px] font-medium text-[var(--color-text-secondary)]">
              {lang === "th" ? "วันนี้" : "Today"} · {formatShortDate(checkIn)}
            </span>
          </div>

          {/* Messages List */}
          {messages.map((msg, idx) => {
            const isBot = msg.role === "assistant";
            const isLastUserMsg =
              !isBot && idx === messages.length - 1 && !isTyping;
            const recRooms =
              msg.recommendedRoomIds
                ?.map((id) => rooms.find((r) => r.id === id))
                .filter((r): r is RoomLodge => Boolean(r)) ?? [];

            return (
              <div
                key={msg.id}
                className={`group flex items-end gap-2.5 ${
                  isBot ? "justify-start" : "justify-end"
                }`}
              >
                {isBot && (
                  <div className="shrink-0 mb-5">
                    <AnimatedAiBotAvatar
                      size="sm"
                      isActive={false}
                      isSpeaking={false}
                    />
                  </div>
                )}

                <div
                  className={`space-y-2 ${
                    isBot ? "w-full max-w-[90%]" : "max-w-[80%]"
                  }`}
                >
                  {/* Bubble + Quick Heart Reaction Trigger */}
                  <div
                    className={`flex items-center gap-1.5 ${
                      isBot ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      onDoubleClick={() => toggleReaction(msg.id, "❤️")}
                      className={`relative rounded-[20px] px-4 py-3 ty-body whitespace-pre-line ${
                        isBot
                          ? "rounded-bl-[6px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                          : "rounded-br-[6px] bg-[var(--color-background-muted)] text-[var(--color-text-primary)] font-medium"
                      }`}
                    >
                      {msg.imageUrl && (
                        <div className="mb-2 overflow-hidden rounded-[12px]">
                          <img
                            src={msg.imageUrl}
                            alt="Uploaded attachment"
                            className="max-h-56 w-auto object-cover rounded-[12px]"
                          />
                        </div>
                      )}
                      {msg.text}

                      {/* Reaction Pill Badge */}
                      {msg.reaction && (
                        <button
                          type="button"
                          onClick={() => toggleReaction(msg.id, msg.reaction)}
                          className="absolute -bottom-2.5 right-3 h-6 px-1.5 rounded-full bg-[var(--color-background-card)] shadow-md border border-[var(--color-border)] text-[12px] flex items-center justify-center cursor-pointer"
                        >
                          {msg.reaction}
                        </button>
                      )}
                    </div>

                    {isBot && (
                      <button
                        type="button"
                        onClick={() => toggleReaction(msg.id, "❤️")}
                        title="กดถูกใจข้อความ"
                        className="opacity-0 group-hover:opacity-100 h-7 w-7 rounded-full hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-secondary)] hover:text-rose-500 flex items-center justify-center transition cursor-pointer shrink-0"
                      >
                        <Heart
                          className={`w-3.5 h-3.5 ${
                            msg.reaction === "❤️"
                              ? "fill-rose-500 text-rose-500"
                              : ""
                          }`}
                        />
                      </button>
                    )}
                  </div>

                  {/* Room Recommendation Cards inside AI Response */}
                  {isBot && recRooms.length > 0 && (
                    <div
                      className={`grid gap-2.5 pt-1 ${
                        compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"
                      }`}
                    >
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
                            className="group/card rounded-[16px] bg-[var(--color-background-muted)] border border-[var(--color-border)] overflow-hidden flex flex-col justify-between transition"
                          >
                            <div>
                              <div className="relative h-32 w-full overflow-hidden bg-[var(--color-background-muted)]">
                                <img
                                  src={room.images[0]?.url}
                                  alt={room.nameTh}
                                  className="h-full w-full object-cover"
                                />
                              </div>

                              <div className="p-3.5 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="rounded-full bg-[var(--color-background-card)] border border-[var(--color-border)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-text-primary)]">
                                    {room.code}
                                  </span>
                                  <span className="rounded-full bg-[var(--color-success-muted)] text-[var(--color-success)] px-2.5 py-0.5 text-[11px] font-semibold">
                                    {lang === "th"
                                      ? `ว่าง ${st?.availableUnits ?? 1} หลัง`
                                      : `${st?.availableUnits ?? 1} Available`}
                                  </span>
                                </div>
                                <h4 className="ty-body font-semibold line-clamp-1 pt-0.5">
                                  {lang === "th" ? room.nameTh : room.nameEn}
                                </h4>
                                <p className="ty-caption flex items-center gap-2">
                                  <span className="inline-flex items-center gap-1">
                                    <BedDouble className="w-3.5 h-3.5" />
                                    {room.sizeSqm}{" "}
                                    {lang === "th" ? "ตร.ม." : "m²"}
                                  </span>
                                  <span>·</span>
                                  <span>
                                    {room.baseGuests}–{room.maxGuests}{" "}
                                    {lang === "th" ? "ท่าน" : "guests"}
                                  </span>
                                </p>
                                <div className="pt-1 flex items-baseline justify-between">
                                  <div>
                                    <span className="ty-subtitle">
                                      ฿{nightly.toLocaleString()}
                                    </span>
                                    <span className="ty-caption">
                                      {lang === "th" ? " / คืน" : " / night"}
                                    </span>
                                  </div>
                                  <span className="ty-caption font-medium">
                                    {lang === "th" ? "รวม " : "Total "}฿
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
                                className="btn-round-solid w-full !py-2"
                              >
                                <span>
                                  {lang === "th"
                                    ? "จองห้องพักนี้"
                                    : "Book This Room"}
                                </span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Coupons inside AI Response */}
                  {isBot && msg.showCoupons && (
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {coupons
                        .filter((c) => c.isActive)
                        .map((c) => {
                          const isApplied = appliedCouponCode === c.code;
                          return (
                            <div
                              key={c.id}
                              className="rounded-[14px] bg-[var(--color-background-muted)] border border-[var(--color-border)] p-3 flex items-center justify-between gap-3"
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <Tag className="w-3.5 h-3.5" />
                                  <span className="font-mono ty-body font-bold">
                                    {c.code}
                                  </span>
                                </div>
                                <p className="ty-caption truncate mt-0.5">
                                  {lang === "th" ? c.titleTh : c.titleEn} (
                                  {lang === "th" ? "ขั้นต่ำ" : "Min."} ฿
                                  {c.minSpendThb.toLocaleString()})
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => onApplyCoupon(c.code)}
                                className={`shrink-0 rounded-full px-3 py-1.5 text-[12px] font-semibold transition cursor-pointer ${
                                  isApplied
                                    ? "bg-[var(--color-success-muted)] text-[var(--color-success)]"
                                    : "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                                }`}
                              >
                                {isApplied
                                  ? lang === "th"
                                    ? "✓ ใช้แล้ว"
                                    : "✓ Applied"
                                  : lang === "th"
                                  ? "ใช้โค้ดนี้"
                                  : "Apply Code"}
                              </button>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Add-ons inside AI Response */}
                  {isBot && msg.showAddons && (
                    <div className="grid grid-cols-1 gap-2 pt-1">
                      {addons
                        .filter((a) => a.isActive)
                        .map((addon) => {
                          const selected = selectedAddons.includes(addon.id);
                          return (
                            <div
                              key={addon.id}
                              onClick={() => onToggleAddon(addon.id)}
                              className="rounded-[14px] bg-[var(--color-background-muted)] border border-[var(--color-border)] p-2.5 flex items-center gap-3 cursor-pointer hover:opacity-90 transition"
                            >
                              <img
                                src={addon.imageUrl}
                                alt={
                                  lang === "th" ? addon.nameTh : addon.nameEn
                                }
                                className="w-12 h-12 rounded-[10px] object-cover shrink-0"
                              />
                              <div className="flex-1 min-w-0">
                                <p className="ty-body font-semibold truncate">
                                  {lang === "th" ? addon.nameTh : addon.nameEn}
                                </p>
                                <p className="ty-caption">
                                  +฿{addon.priceThb.toLocaleString()} (
                                  {lang === "th" ? addon.unitTh : addon.unitEn})
                                </p>
                              </div>
                              <span
                                className={`h-7 px-3 rounded-full text-[12px] font-semibold flex items-center justify-center shrink-0 ${
                                  selected
                                    ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                                    : "bg-[var(--color-background-card)] border border-[var(--color-border)] text-[var(--color-text-primary)]"
                                }`}
                              >
                                {selected
                                  ? lang === "th"
                                    ? "✓ เลือกแล้ว"
                                    : "✓ Added"
                                  : lang === "th"
                                  ? "+ เพิ่ม"
                                  : "+ Add"}
                              </span>
                            </div>
                          );
                        })}
                    </div>
                  )}

                  {/* Timestamp + Seen Status */}
                  <div
                    className={`ty-caption flex items-center gap-1 ${
                      isBot ? "justify-start" : "justify-end"
                    }`}
                  >
                    <span>{msg.timestamp}</span>
                    {!isBot && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] font-medium">
                        <CheckCheck className="w-3.5 h-3.5 text-emerald-500" />
                        {isLastUserMsg && (
                          <span>{lang === "th" ? "อ่านแล้ว" : "Seen"}</span>
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isTyping && (
            <div className="flex items-center gap-2.5 ty-caption">
              <AnimatedAiBotAvatar size="sm" isActive={true} isSpeaking={true} />
              <div className="rounded-full bg-[var(--color-background-muted)] px-3.5 py-2 text-[12px] font-medium">
                {lang === "th"
                  ? "AI Concierge กำลังพิมพ์ข้อความ..."
                  : "AI Concierge is typing..."}
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Collapsible Chat Info Drawer (Right Side inside Chat Card) */}
        {showInfoDrawer && !compact && (
          <div className="w-64 sm:w-72 border-l border-[var(--color-border)] bg-[var(--color-background-muted)] p-4 overflow-y-auto space-y-4 shrink-0">
            <div className="flex items-center justify-between">
              <h4 className="ty-subtitle">
                {lang === "th" ? "ข้อมูลการจองของคุณ" : "Your Stay Summary"}
              </h4>
              <button
                type="button"
                onClick={() => setShowInfoDrawer(false)}
                className="h-7 w-7 rounded-full hover:bg-[var(--color-overlay-hover)] flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="rounded-[16px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-3.5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="ty-caption">
                  {lang === "th" ? "วันเช็คอิน – เช็คเอาท์" : "Check-in – Check-out"}
                </span>
                <button
                  type="button"
                  onClick={onSwitchToBookTab}
                  className="text-[12px] font-semibold underline cursor-pointer"
                >
                  {lang === "th" ? "แก้ไข" : "Edit"}
                </button>
              </div>
              <p className="ty-body font-semibold">
                {formatShortDate(checkIn)} – {formatShortDate(checkOut)} (
                {nights} {lang === "th" ? "คืน" : "nights"})
              </p>

              <div className="pt-2 border-t border-[var(--color-border)] flex items-center justify-between">
                <span className="ty-caption flex items-center gap-1">
                  <Users className="w-3.5 h-3.5" />
                  {lang === "th" ? "ผู้เข้าพัก" : "Guests"}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setGuests(Math.max(1, guests - 1))}
                    className="h-6 w-6 rounded-full bg-[var(--color-background-muted)] flex items-center justify-center cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="ty-body font-semibold">
                    {guests} {lang === "th" ? "ท่าน" : "guests"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setGuests(Math.min(8, guests + 1))}
                    className="h-6 w-6 rounded-full bg-[var(--color-background-muted)] flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>

            <div className="rounded-[16px] bg-[var(--color-background-card)] border border-[var(--color-border)] p-3.5 space-y-2">
              <p className="ty-caption font-semibold">
                {lang === "th" ? "คูปองที่ใช้งานอยู่" : "Active Promo Code"}
              </p>
              {appliedCouponCode ? (
                <div className="flex items-center justify-between rounded-full bg-[var(--color-success-muted)] text-[var(--color-success)] px-3 py-1 text-[12px] font-semibold">
                  <span>{appliedCouponCode}</span>
                  <span>{lang === "th" ? "✓ ใช้แล้ว" : "✓ Applied"}</span>
                </div>
              ) : (
                <p className="ty-caption">
                  {lang === "th"
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
                {lang === "th" ? "ไปหน้าจองห้องพัก (/)" : "Browse Rooms (/)"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* 3. POPOVER TRAYS (EMOJI PICKER OR STICKER / QUICK PROMPTS) */}
      {showEmojiPicker && (
        <div className="px-4 py-2.5 bg-[var(--color-background-card)] border-t border-[var(--color-border)] flex items-center justify-between gap-2 overflow-x-auto no-scrollbar shrink-0">
          <div className="flex items-center gap-1.5">
            {EMOJI_PALETTE.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setInput((prev) => prev + emoji);
                  textInputRef.current?.focus();
                }}
                className="h-9 w-9 rounded-full hover:bg-[var(--color-background-muted)] text-[18px] flex items-center justify-center transition cursor-pointer"
              >
                {emoji}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowEmojiPicker(false)}
            className="ty-caption px-2 py-1 rounded-full hover:bg-[var(--color-background-muted)] cursor-pointer"
          >
            {lang === "th" ? "ปิด" : "Close"}
          </button>
        </div>
      )}

      {showStickerTray && (
        <div className="p-3 bg-[var(--color-background-card)] border-t border-[var(--color-border)] grid grid-cols-2 sm:grid-cols-3 gap-2 shrink-0">
          {STICKER_PROMPTS.map((item) => (
            <button
              key={item.labelTh}
              type="button"
              onClick={() =>
                handleSendPrompt(
                  lang === "th" ? item.promptTh : item.promptEn
                )
              }
              className="rounded-[14px] bg-[var(--color-background-muted)] hover:bg-[var(--color-accent)] hover:text-[var(--color-on-accent)] p-2.5 text-left flex items-center gap-2 transition cursor-pointer"
            >
              <span className="text-[18px]">{item.emoji}</span>
              <span className="text-[12px] font-semibold line-clamp-1">
                {lang === "th" ? item.labelTh : item.labelEn}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Horizontal Quick Prompt Chips */}
      <div className="px-3.5 sm:px-4 py-2 bg-[var(--color-background-card)] border-t border-[var(--color-border)] flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
        {quickPrompts.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => handleSendPrompt(q)}
            className="shrink-0 rounded-full bg-[var(--color-background-muted)] hover:bg-[var(--color-accent)] hover:text-[var(--color-on-accent)] px-3 py-1.5 text-[12px] font-medium text-[var(--color-text-primary)] transition cursor-pointer"
          >
            {q}
          </button>
        ))}
      </div>

      {/* 4. INSTAGRAM DM / MESSENGER PILL INPUT BAR (Matches Screenshot 2) */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSendPrompt(input);
        }}
        className="px-3.5 sm:px-4 py-3 bg-[var(--color-background-card)] shrink-0"
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="hidden"
        />

        <div className="flex items-center gap-2.5 rounded-full border border-[var(--color-border-emphasized)] bg-[var(--color-background-muted)] px-3.5 py-2 focus-within:border-[var(--color-text-primary)] transition">
          {/* Left: Smile / Emoji Button */}
          <button
            type="button"
            onClick={() => {
              setShowEmojiPicker((prev) => !prev);
              setShowStickerTray(false);
            }}
            title="อิโมจิ (Emoji)"
            className="h-8 w-8 rounded-full hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)] flex items-center justify-center shrink-0 transition cursor-pointer"
          >
            <Smile className="w-5 h-5" />
          </button>

          {/* Center: Message... Input */}
          <input
            ref={textInputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isRecordingVoice
                ? lang === "th"
                  ? "กำลังฟังเสียงพูดของคุณ..."
                  : "Listening..."
                : lang === "th"
                ? "พิมพ์ข้อความถึง AI Concierge..."
                : "Message..."
            }
            className="flex-1 min-w-0 bg-transparent text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
          />

          {/* Right Action Icons (Mic, Image, Sticker) + Send Button */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleVoiceClick}
              title={
                lang === "th" ? "พิมพ์ด้วยเสียง" : "Voice Message"
              }
              className={`h-8 w-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                isRecordingVoice
                  ? "bg-rose-500 text-white animate-pulse"
                  : "hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)]"
              }`}
            >
              <Mic className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title={
                lang === "th"
                  ? "แนบรูปภาพหรือสลิปโอนเงิน"
                  : "Attach photo or payment slip"
              }
              className="h-8 w-8 rounded-full hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)] flex items-center justify-center transition cursor-pointer"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            <button
              type="button"
              onClick={() => {
                setShowStickerTray((prev) => !prev);
                setShowEmojiPicker(false);
              }}
              title={
                lang === "th"
                  ? "สติกเกอร์และคำถามด่วน"
                  : "Stickers & quick prompts"
              }
              className={`h-8 w-8 rounded-full flex items-center justify-center transition cursor-pointer ${
                showStickerTray
                  ? "bg-[var(--color-accent)] text-[var(--color-on-accent)]"
                  : "hover:bg-[var(--color-overlay-hover)] text-[var(--color-text-primary)]"
              }`}
            >
              <Sticker className="w-5 h-5" />
            </button>

            {input.trim().length > 0 && (
              <button
                type="submit"
                className="ml-1 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] px-3.5 py-1.5 text-[12px] font-semibold flex items-center gap-1 transition cursor-pointer"
              >
                <span>{lang === "th" ? "ส่ง" : "Send"}</span>
                <Send className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );

  if (compact) {
    return chatBody;
  }

  return (
    <StandardCard noPadding className="overflow-hidden">
      {chatBody}
    </StandardCard>
  );
}

/**
 * Desktop Floating AI Chat Bubble & Popover Messenger (Bottom-Right Corner)
 * Ensures desktop visitors immediately notice the modern AI Concierge on any page.
 */
export function AiChatDesktopBubble(
  props: Omit<
    AiBookingChatViewProps,
    "compact" | "onExpandToFullPage" | "onCloseCompact"
  > & {
    onNavigateToChatPage: () => void;
    isOnChatPage: boolean;
    isOpen?: boolean;
    onOpenChange?: (open: boolean) => void;
  }
) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = props.isOpen ?? internalOpen;
  const setIsOpen = (next: boolean) => {
    setInternalOpen(next);
    props.onOpenChange?.(next);
  };

  if (props.isOnChatPage) {
    return null;
  }

  const availCount = props.rooms.filter((r) => {
    const st = props.roomStatusMap[r.id];
    return st?.state === "AVAILABLE" && (st?.availableUnits ?? 0) > 0;
  }).length;

  return (
    <div
      className={`hidden lg:flex fixed right-5 z-40 flex-col items-end gap-3 ${
        isOpen ? "top-5 bottom-5" : "bottom-5"
      }`}
    >
      {/* Expanded Modern AI Chat Popover Window */}
      {isOpen && (
        <div className="w-[410px] h-full rounded-[24px] bg-[var(--color-background-card)] border border-[var(--color-border)] shadow-[0_24px_60px_rgba(0,0,0,0.22)] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-200">
          <AiBookingChatView
            {...props}
            compact
            onExpandToFullPage={props.onNavigateToChatPage}
            onCloseCompact={() => setIsOpen(false)}
          />
        </div>
      )}

      {/* Floating Launcher Button — Minimalist Icon-First Live Animated Bot */}
      {!isOpen && (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          title={props.lang === "th" ? "แชทกับ AI" : "Chat with AI"}
          aria-label={props.lang === "th" ? "แชทกับ AI" : "Chat with AI"}
          className="group relative h-14 w-14 rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)] shadow-[0_12px_32px_rgba(0,0,0,0.22)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center cursor-pointer"
        >
          <AnimatedAiBotAvatar size="lg" isActive={false} isSpeaking={false} />
        </button>
      )}
    </div>
  );
}
