"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Calculator,
  Car,
  Dribbble,
  Flag,
  Lightbulb,
  PawPrint,
  Search,
  Smile,
  Utensils,
  X,
} from "lucide-react";
import type { LanguageCode } from "@/lib/dateFormatters";

interface EmojiCategory {
  id: string;
  labelEn: string;
  labelTh: string;
  keywords: string;
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  emojis: Array<{ char: string; kw: string }>;
}

const EMOJI_CATEGORIES: EmojiCategory[] = [
  {
    id: "smileys",
    labelEn: "Smileys & People",
    labelTh: "หน้ายิ้มและผู้คน",
    keywords: "smile face happy love laugh cry heart hand person",
    Icon: Smile,
    emojis: [
      { char: "😀", kw: "grinning happy smile ยิ้ม ดีใจ" },
      { char: "😃", kw: "smiley happy ยิ้ม" },
      { char: "😄", kw: "smile laugh ยิ้ม หัวเราะ" },
      { char: "😁", kw: "grin ยิ้มแฉ่ง" },
      { char: "😆", kw: "laughing ฮ่าๆ" },
      { char: "🥹", kw: "holding back tears ซึ้ง น่ารัก" },
      { char: "😅", kw: "sweat smile แหะๆ" },
      { char: "😂", kw: "joy laugh ขำ ตลก" },
      { char: "🤣", kw: "rofl laugh ขำมาก" },
      { char: "🥲", kw: "smiling tear ยิ้มทั้งน้ำตา" },
      { char: "☺️", kw: "blush เขิน" },
      { char: "😊", kw: "blush smile ยิ้มหวาน" },
      { char: "😇", kw: "innocent angel นางฟ้า" },
      { char: "🙂", kw: "slightly smiling ยิ้มอ่อน" },
      { char: "🙃", kw: "upside down" },
      { char: "😉", kw: "wink ขยิบตา" },
      { char: "😌", kw: "relieved โล่งใจ สบายใจ" },
      { char: "😍", kw: "heart eyes love รัก ชอบมาก" },
      { char: "🥰", kw: "smiling hearts love หลงรัก น่ารัก" },
      { char: "😘", kw: "kiss จุ๊บ" },
      { char: "😗", kw: "kissing" },
      { char: "😙", kw: "kissing smile" },
      { char: "😚", kw: "kissing closed eyes" },
      { char: "😋", kw: "yum delicious อร่อย" },
      { char: "😛", kw: "stuck out tongue แลบลิ้น" },
      { char: "😝", kw: "squinting tongue" },
      { char: "😜", kw: "winking tongue" },
      { char: "🤪", kw: "zany crazy" },
      { char: "🤨", kw: "raised eyebrow สงสัย" },
      { char: "🧐", kw: "monocle ส่อง" },
      { char: "🤓", kw: "nerd" },
      { char: "😎", kw: "sunglasses cool เท่ ชิล" },
      { char: "🥸", kw: "disguised" },
      { char: "🤩", kw: "star struck wow ว้าว" },
      { char: "🥳", kw: "partying celebrate ปาร์ตี้ ฉลอง" },
      { char: "😏", kw: "smirk" },
      { char: "😒", kw: "unamused" },
      { char: "😞", kw: "disappointed เสียใจ" },
      { char: "😔", kw: "pensive" },
      { char: "😟", kw: "worried กังวล" },
      { char: "🥺", kw: "pleading ขอร้อง อ้อน" },
      { char: "😢", kw: "cry ร้องไห้" },
      { char: "😭", kw: "sob ร้องไห้หนัก" },
      { char: "😤", kw: "triumph" },
      { char: "🤯", kw: "mind blown อึ้ง" },
      { char: "😳", kw: "flushed เขิน" },
      { char: "🥵", kw: "hot ร้อน" },
      { char: "🥶", kw: "cold หนาว" },
      { char: "😱", kw: "scream ตกใจ" },
      { char: "🤗", kw: "hugging กอด" },
      { char: "🤔", kw: "thinking คิด สงสัย" },
      { char: "🤭", kw: "hand over mouth อุ๊ย" },
      { char: "🤫", kw: "shushing จุ๊ๆ" },
      { char: "😴", kw: "sleeping ง่วง นอน" },
      { char: "🤤", kw: "drooling น่ากิน" },
      { char: "👏", kw: "clap ปรบมือ" },
      { char: "🙌", kw: "raising hands เย้" },
      { char: "🫶", kw: "heart hands มินิฮาร์ท รัก" },
      { char: "👍", kw: "thumbs up เยี่ยม ดีมาก" },
      { char: "👌", kw: "ok โอเค" },
      { char: "✌️", kw: "peace victory สู้ๆ" },
      { char: "🙏", kw: "pray thank you ขอบคุณ ไหว้" },
      { char: "❤️", kw: "red heart love หัวใจ รัก" },
      { char: "🔥", kw: "fire hot ปัง เด็ด" },
    ],
  },
  {
    id: "nature",
    labelEn: "Animals & Nature",
    labelTh: "สัตว์และธรรมชาติ",
    keywords: "animal pet dog cat nature flower tree mountain sea sun moon",
    Icon: PawPrint,
    emojis: [
      { char: "🐶", kw: "dog pet หมา สัตว์เลี้ยง" },
      { char: "🐱", kw: "cat pet แมว สัตว์เลี้ยง" },
      { char: "🐰", kw: "rabbit กระต่าย" },
      { char: "🦊", kw: "fox" },
      { char: "🐻", kw: "bear หมี" },
      { char: "🐼", kw: "panda แพนด้า" },
      { char: "🐨", kw: "koala" },
      { char: "🦁", kw: "lion" },
      { char: "🐸", kw: "frog" },
      { char: "🦋", kw: "butterfly ผีเสื้อ" },
      { char: "🐢", kw: "turtle เต่า" },
      { char: "🐬", kw: "dolphin โลมา" },
      { char: "🐳", kw: "whale วาฬ" },
      { char: "🦢", kw: "swan หงส์" },
      { char: "🦩", kw: "flamingo ฟลามิงโก้" },
      { char: "🐾", kw: "paw prints pet friendly สัตว์เลี้ยงเข้าได้" },
      { char: "🌵", kw: "cactus กระบองเพชร" },
      { char: "🌲", kw: "evergreen tree ป่า เขา" },
      { char: "🌳", kw: "tree ต้นไม้" },
      { char: "🌴", kw: "palm tree ทะเล เกาะ" },
      { char: "🌱", kw: "seedling ธรรมชาติ" },
      { char: "🌿", kw: "herb leaf ใบไม้" },
      { char: "🍀", kw: "clover โชคดี" },
      { char: "🍁", kw: "maple leaf ใบไม้ร่วง" },
      { char: "💐", kw: "bouquet ดอกไม้" },
      { char: "🌷", kw: "tulip ทิวลิป" },
      { char: "🌹", kw: "rose กุหลาบ" },
      { char: "🌺", kw: "hibiscus" },
      { char: "🌸", kw: "cherry blossom ซากุระ" },
      { char: "🌼", kw: "blossom" },
      { char: "🌻", kw: "sunflower ทานตะวัน" },
      { char: "☀️", kw: "sun แดด" },
      { char: "🌤️", kw: "sun cloud อากาศดี" },
      { char: "⛅", kw: "partly cloudy" },
      { char: "🌧️", kw: "rain ฝน" },
      { char: "🌈", kw: "rainbow สายรุ้ง" },
      { char: "❄️", kw: "snowflake หนาว หิมะ" },
      { char: "🌊", kw: "wave ocean sea ทะเล คลื่น" },
      { char: "🌙", kw: "moon พระจันทร์ กลางคืน" },
      { char: "⭐", kw: "star ดาว" },
    ],
  },
  {
    id: "food",
    labelEn: "Food & Drink",
    labelTh: "อาหารและเครื่องดื่ม",
    keywords: "food drink coffee tea breakfast wine beer bbq fruit",
    Icon: Utensils,
    emojis: [
      { char: "☕", kw: "coffee cafe กาแฟ คาเฟ่" },
      { char: "🍵", kw: "tea matcha ชา มัทฉะ" },
      { char: "🧋", kw: "bubble tea ชานมไข่มุก" },
      { char: "🧃", kw: "juice น้ำผลไม้" },
      { char: "🍷", kw: "wine ไวน์" },
      { char: "🍸", kw: "cocktail ค็อกเทล" },
      { char: "🍹", kw: "tropical drink เครื่องดื่ม" },
      { char: "🍺", kw: "beer เบียร์" },
      { char: "🥂", kw: "champagne cheers ชนแก้ว" },
      { char: "🥐", kw: "croissant ครัวซองต์ อาหารเช้า" },
      { char: "🥞", kw: "pancakes แพนเค้ก" },
      { char: "🍳", kw: "cooking breakfast ไข่ดาว อาหารเช้า" },
      { char: "🥓", kw: "bacon เบคอน" },
      { char: "🥩", kw: "steak bbq หมูกระทะ สเต็ก" },
      { char: "🍲", kw: "pot of food ชาบู หมูกระทะ" },
      { char: "🍜", kw: "ramen noodles ก๋วยเตี๋ยว" },
      { char: "🍣", kw: "sushi ซูชิ" },
      { char: "🍤", kw: "shrimp กุ้ง" },
      { char: "🍕", kw: "pizza พิซซ่า" },
      { char: "🍔", kw: "burger เบอร์เกอร์" },
      { char: "🥗", kw: "salad สลัด" },
      { char: "🍰", kw: "cake เค้ก" },
      { char: "🧁", kw: "cupcake คัพเค้ก" },
      { char: "🍦", kw: "ice cream ไอศกรีม" },
      { char: "🍓", kw: "strawberry สตรอว์เบอร์รี" },
      { char: "🍉", kw: "watermelon แตงโม" },
      { char: "🥭", kw: "mango มะม่วง" },
      { char: "🥥", kw: "coconut มะพร้าว" },
      { char: "🍑", kw: "peach พีช" },
      { char: "🍇", kw: "grapes องุ่น" },
      { char: "🍊", kw: "orange ส้ม" },
      { char: "🍍", kw: "pineapple สับปะรด" },
    ],
  },
  {
    id: "activities",
    labelEn: "Activities",
    labelTh: "กิจกรรม",
    keywords: "sport swim surf hike yoga party music game camera",
    Icon: Dribbble,
    emojis: [
      { char: "🏊", kw: "swimming pool ว่ายน้ำ สระว่ายน้ำ" },
      { char: "🏄", kw: "surfing เซิร์ฟ ทะเล" },
      { char: "🚣", kw: "kayak rowing พายเรือ" },
      { char: "🚴", kw: "cycling ปั่นจักรยาน" },
      { char: "🧘", kw: "yoga spa โยคะ สปา ผ่อนคลาย" },
      { char: "🤿", kw: "diving snorkel ดำน้ำ" },
      { char: "🎣", kw: "fishing ตกปลา" },
      { char: "⛳", kw: "golf กอล์ฟ" },
      { char: "🎾", kw: "tennis เทนนิส" },
      { char: "⚽", kw: "soccer ฟุตบอล" },
      { char: "🏀", kw: "basketball บาส" },
      { char: "🎸", kw: "guitar music กีตาร์ ดนตรี" },
      { char: "🎤", kw: "karaoke mic คาราโอเกะ" },
      { char: "🎧", kw: "headphones เพลง" },
      { char: "🎬", kw: "movie หนัง" },
      { char: "🎨", kw: "art ศิลปะ" },
      { char: "🎯", kw: "target" },
      { char: "🎲", kw: "board game บอร์ดเกม" },
      { char: "🎉", kw: "party popper ฉลอง" },
      { char: "🎊", kw: "confetti ball" },
      { char: "🎈", kw: "balloon ลูกโป่ง" },
      { char: "🎁", kw: "gift ของขวัญ" },
      { char: "🏆", kw: "trophy รางวัล" },
      { char: "🥇", kw: "first place ที่หนึ่ง" },
    ],
  },
  {
    id: "travel",
    labelEn: "Travel & Places",
    labelTh: "การเดินทางและสถานที่",
    keywords: "travel hotel villa resort beach mountain camp airplane car",
    Icon: Car,
    emojis: [
      { char: "🏨", kw: "hotel stay โรงแรม ที่พัก" },
      { char: "🏡", kw: "house garden villa วิลล่า บ้านพัก" },
      { char: "⛺", kw: "tent camping glamping แคมป์ เต็นท์" },
      { char: "🏕️", kw: "camping กางเต็นท์" },
      { char: "🏖️", kw: "beach umbrella ชายหาด ทะเล" },
      { char: "🏝️", kw: "island เกาะ" },
      { char: "⛰️", kw: "mountain ภูเขา ดอย" },
      { char: "🏔️", kw: "snow mountain ภูเขาสูง" },
      { char: "🌅", kw: "sunrise พระอาทิตย์ขึ้น" },
      { char: "🌄", kw: "sunrise mountains ทะเลหมอก" },
      { char: "🌆", kw: "cityscape sunset วิวเมือง" },
      { char: "🌃", kw: "night stars กลางคืน" },
      { char: "🌌", kw: "milky way ดูดาว" },
      { char: "✈️", kw: "airplane flight บิน เที่ยว" },
      { char: "🚗", kw: "car road trip ขับรถ" },
      { char: "🛵", kw: "scooter มอเตอร์ไซค์" },
      { char: "🚂", kw: "train รถไฟ" },
      { char: "⛵", kw: "sailboat เรือใบ" },
      { char: "🚤", kw: "speedboat สปีดโบ๊ท" },
      { char: "🗺️", kw: "map แผนที่" },
      { char: "🧳", kw: "luggage กระเป๋าเดินทาง" },
      { char: "🧭", kw: "compass เข็มทิศ" },
      { char: "⛲", kw: "fountain" },
      { char: "🏯", kw: "castle ปราสาท" },
    ],
  },
  {
    id: "objects",
    labelEn: "Objects",
    labelTh: "สิ่งของ",
    keywords: "camera bed bath tub ticket money phone key book",
    Icon: Lightbulb,
    emojis: [
      { char: "📸", kw: "camera photo ถ่ายรูป มุมถ่ายรูป" },
      { char: "📷", kw: "camera กล้อง" },
      { char: "🛏️", kw: "bed room เตียง ห้องนอน" },
      { char: "🛁", kw: "bathtub onsen อ่างอาบน้ำ ออนเซ็น" },
      { char: "🚿", kw: "shower อาบน้ำ" },
      { char: "🛋️", kw: "couch โซฟา" },
      { char: "🎟️", kw: "ticket coupon คูปอง ส่วนลด" },
      { char: "💳", kw: "credit card บัตร" },
      { char: "💰", kw: "money ราคา คุ้ม" },
      { char: "📱", kw: "phone มือถือ" },
      { char: "💻", kw: "laptop workation ทำงาน" },
      { char: "🔑", kw: "key กุญแจ เช็กอิน" },
      { char: "🕯️", kw: "candle เทียน โรแมนติก" },
      { char: "💡", kw: "lightbulb ไอเดีย" },
      { char: "📚", kw: "books หนังสือ" },
      { char: "🗓️", kw: "calendar ปฏิทิน จองวัน" },
      { char: "⏰", kw: "alarm clock เวลา" },
      { char: "🛍️", kw: "shopping ช้อปปิ้ง" },
      { char: "🧴", kw: "lotion ครีม" },
      { char: "🧸", kw: "teddy bear ตุ๊กตา" },
      { char: "🪞", kw: "mirror กระจก" },
      { char: "🪟", kw: "window วิวหน้าต่าง" },
      { char: "💌", kw: "love letter จดหมาย" },
      { char: "📌", kw: "pin ปักหมุด" },
    ],
  },
  {
    id: "symbols",
    labelEn: "Symbols",
    labelTh: "สัญลักษณ์",
    keywords: "heart star sparkle check hundred music",
    Icon: Calculator,
    emojis: [
      { char: "✨", kw: "sparkles สวย วิบวับ" },
      { char: "💫", kw: "dizzy star" },
      { char: "🌟", kw: "glowing star ดาว" },
      { char: "💯", kw: "100 perfect เต็มร้อย" },
      { char: "💥", kw: "boom ปัง" },
      { char: "💕", kw: "two hearts" },
      { char: "💖", kw: "sparkling heart" },
      { char: "💗", kw: "growing heart" },
      { char: "💓", kw: "beating heart" },
      { char: "💞", kw: "revolving hearts" },
      { char: "🧡", kw: "orange heart" },
      { char: "💛", kw: "yellow heart" },
      { char: "💚", kw: "green heart" },
      { char: "💙", kw: "blue heart" },
      { char: "💜", kw: "purple heart" },
      { char: "🤍", kw: "white heart" },
      { char: "🖤", kw: "black heart" },
      { char: "✅", kw: "check mark ถูก" },
      { char: "✔️", kw: "check" },
      { char: "❗", kw: "exclamation" },
      { char: "❓", kw: "question ถาม" },
      { char: "💬", kw: "speech bubble แชท" },
      { char: "🎵", kw: "music note เพลง" },
      { char: "🎶", kw: "notes" },
    ],
  },
  {
    id: "flags",
    labelEn: "Flags",
    labelTh: "ธงชาติ",
    keywords: "flag thailand japan korea singapore vietnam",
    Icon: Flag,
    emojis: [
      { char: "🇹🇭", kw: "thailand ไทย" },
      { char: "🇯🇵", kw: "japan ญี่ปุ่น" },
      { char: "🇰🇷", kw: "korea เกาหลี" },
      { char: "🇸🇬", kw: "singapore สิงคโปร์" },
      { char: "🇻🇳", kw: "vietnam เวียดนาม" },
      { char: "🇲🇾", kw: "malaysia มาเลเซีย" },
      { char: "🇮🇩", kw: "indonesia บาหลี อินโดนีเซีย" },
      { char: "🇵🇭", kw: "philippines ฟิลิปปินส์" },
      { char: "🇱🇦", kw: "laos ลาว" },
      { char: "🇹🇼", kw: "taiwan ไต้หวัน" },
      { char: "🇭🇰", kw: "hong kong ฮ่องกง" },
      { char: "🇨🇳", kw: "china จีน" },
      { char: "🇺🇸", kw: "usa อเมริกา" },
      { char: "🇬🇧", kw: "uk อังกฤษ" },
      { char: "🇫🇷", kw: "france ฝรั่งเศส" },
      { char: "🇨🇭", kw: "switzerland สวิตเซอร์แลนด์" },
      { char: "🇮🇹", kw: "italy อิตาลี" },
      { char: "🇦🇺", kw: "australia ออสเตรเลีย" },
      { char: "🇳🇿", kw: "new zealand นิวซีแลนด์" },
      { char: "🏁", kw: "checkered flag" },
      { char: "🚩", kw: "red flag" },
      { char: "🏳️‍🌈", kw: "rainbow flag pride" },
    ],
  },
];

export interface InstagramEmojiPickerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (emoji: string) => void;
  language: LanguageCode;
  placement?: "popover-above" | "inline";
}

export function InstagramEmojiPicker({
  isOpen,
  onClose,
  onSelect,
  language,
  placement = "popover-above",
}: InstagramEmojiPickerProps) {
  const isTh = language === "th";
  const [query, setQuery] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string>("smileys");
  const containerRef = useRef<HTMLDivElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;
      if (containerRef.current?.contains(target)) return;
      if (target.closest('[data-emoji-trigger="true"]')) return;
      onClose();
    };

    window.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [isOpen, onClose]);

  const filteredCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return EMOJI_CATEGORIES;
    return EMOJI_CATEGORIES.map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter(
        (item) =>
          item.char.includes(q) ||
          item.kw.toLowerCase().includes(q) ||
          cat.labelEn.toLowerCase().includes(q) ||
          cat.labelTh.toLowerCase().includes(q)
      ),
    })).filter((cat) => cat.emojis.length > 0);
  }, [query]);

  if (!isOpen) return null;

  const handleJumpCategory = (categoryId: string) => {
    setQuery("");
    setActiveCategoryId(categoryId);
    window.requestAnimationFrame(() => {
      const sectionEl = sectionRefs.current[categoryId];
      const scroller = scrollAreaRef.current;
      if (sectionEl && scroller) {
        scroller.scrollTo({
          top: Math.max(0, sectionEl.offsetTop - 4),
          behavior: "smooth",
        });
      }
    });
  };

  const handleScroll = () => {
    const scroller = scrollAreaRef.current;
    if (!scroller || query.trim()) return;
    const scrollTop = scroller.scrollTop + 20;
    let current = EMOJI_CATEGORIES[0].id;
    for (const cat of EMOJI_CATEGORIES) {
      const el = sectionRefs.current[cat.id];
      if (el && el.offsetTop <= scrollTop) {
        current = cat.id;
      }
    }
    setActiveCategoryId(current);
  };

  const isPopover = placement === "popover-above";

  return (
    <div
      ref={containerRef}
      data-swipe-ignore="true"
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      role="dialog"
      aria-label={isTh ? "เลือกอิโมจิ" : "Emoji picker"}
      className={
        isPopover
          ? "absolute bottom-full left-0 mb-2.5 z-40 w-[316px] rounded-[16px] bg-[var(--color-background-popover)] border border-[var(--color-border)] shadow-[var(--shadow-popover)] flex flex-col overflow-hidden"
          : "w-full rounded-[16px] bg-[var(--color-background-card)] border border-[var(--color-border)] flex flex-col overflow-hidden"
      }
    >
      {/* Top Search Bar */}
      <div className="p-2.5 pb-2 shrink-0">
        <div className="h-9 rounded-[10px] bg-[var(--color-background-muted)] border border-transparent focus-within:border-[var(--color-text-primary)] focus-within:bg-[var(--color-background-card)] px-2.5 flex items-center gap-2 transition-colors">
          <Search className="w-4 h-4 text-[var(--color-text-secondary)] shrink-0" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={isTh ? "ค้นหาอิโมจิ..." : "Search emoji"}
            aria-label={isTh ? "ค้นหาอิโมจิ" : "Search emoji"}
            className="flex-1 min-w-0 bg-transparent text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              aria-label={isTh ? "ล้างคำค้นหา" : "Clear search"}
              className="h-5 w-5 rounded-[6px] hover:bg-[var(--color-background-subtle)] text-[var(--color-text-secondary)] inline-flex items-center justify-center cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Scrollable Emoji Grid */}
      <div
        ref={scrollAreaRef}
        onScroll={handleScroll}
        className={`relative overflow-y-auto px-2.5 pb-2 space-y-3 ${
          isPopover ? "h-[236px]" : "h-[208px]"
        }`}
      >
        {filteredCategories.length === 0 ? (
          <div className="h-full flex items-center justify-center text-[13px] text-[var(--color-text-secondary)]">
            {isTh ? "ไม่พบอิโมจิที่ค้นหา" : "No emojis found"}
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <div
              key={cat.id}
              ref={(el) => {
                sectionRefs.current[cat.id] = el;
              }}
              className="space-y-1"
            >
              <p className="px-1 text-[12px] font-semibold text-[var(--color-text-secondary)]">
                {isTh ? cat.labelTh : cat.labelEn}
              </p>
              <div className="grid grid-cols-8 gap-0.5">
                {cat.emojis.map((item) => (
                  <button
                    key={`${cat.id}-${item.char}`}
                    type="button"
                    onClick={() => onSelect(item.char)}
                    className="h-9 w-full rounded-[8px] hover:bg-[var(--color-background-muted)] inline-flex items-center justify-center text-[22px] leading-none cursor-pointer transition-colors"
                  >
                    {item.char}
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Bottom 8-Category Icon Bar (Matches Instagram Standard) */}
      <div className="shrink-0 border-t border-[var(--color-border)] px-1.5 py-1.5 grid grid-cols-8 gap-0.5 bg-[var(--color-background-popover)]">
        {EMOJI_CATEGORIES.map((cat) => {
          const Icon = cat.Icon;
          const isActive = !query.trim() && activeCategoryId === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => handleJumpCategory(cat.id)}
              aria-label={isTh ? cat.labelTh : cat.labelEn}
              title={isTh ? cat.labelTh : cat.labelEn}
              className={`h-8 rounded-[8px] inline-flex items-center justify-center cursor-pointer transition-colors ${
                isActive
                  ? "bg-[var(--color-background-muted)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-background-muted)]/60"
              }`}
            >
              <Icon className="w-[17px] h-[17px]" strokeWidth={isActive ? 2.2 : 1.8} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
