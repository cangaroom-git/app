import { getProvinceById } from "@/data/thailandProvinces";
import { haversineDistanceKm } from "@/lib/geo/nearbyPlacesTypes";

/**
 * Approximate geographic centroids for Thailand's 77 provinces (matched to THAILAND_77_PROVINCES ids).
 * Used to center the Host Pin Picker when a province is selected and to warn when a pin falls far outside the chosen province.
 */
export const THAILAND_PROVINCE_CENTROIDS: Record<
  string,
  { lat: number; lng: number }
> = {
  // North
  "chiang-mai": { lat: 18.7883, lng: 98.9853 },
  nan: { lat: 18.7756, lng: 100.773 },
  "chiang-rai": { lat: 19.9105, lng: 99.8406 },
  "mae-hong-son": { lat: 19.302, lng: 97.9654 },
  phrae: { lat: 18.1446, lng: 100.1403 },
  phayao: { lat: 19.1665, lng: 99.902 },
  lampang: { lat: 18.2888, lng: 99.4909 },
  lamphun: { lat: 18.5745, lng: 99.0087 },
  uttaradit: { lat: 17.6201, lng: 100.0993 },

  // Central
  bangkok: { lat: 13.7563, lng: 100.5018 },
  phetchabun: { lat: 16.419, lng: 101.1591 },
  "phra-nakhon-si-ayutthaya": { lat: 14.3532, lng: 100.5689 },
  "nakhon-nayok": { lat: 14.2069, lng: 101.2131 },
  saraburi: { lat: 14.5289, lng: 100.9101 },
  nonthaburi: { lat: 13.8621, lng: 100.5144 },
  "pathum-thani": { lat: 14.0208, lng: 100.525 },
  "samut-prakan": { lat: 13.5991, lng: 100.5998 },
  "samut-sakhon": { lat: 13.5475, lng: 100.2744 },
  "samut-songkhram": { lat: 13.4098, lng: 100.0023 },
  "nakhon-pathom": { lat: 13.8199, lng: 100.0622 },
  "suphan-buri": { lat: 14.4745, lng: 100.1177 },
  "ang-thong": { lat: 14.5896, lng: 100.455 },
  "sing-buri": { lat: 14.8936, lng: 100.3967 },
  "lop-buri": { lat: 14.7995, lng: 100.6534 },
  "chai-nat": { lat: 15.1852, lng: 100.1251 },
  "uthai-thani": { lat: 15.3835, lng: 100.0246 },
  "nakhon-sawan": { lat: 15.7047, lng: 100.1372 },
  phichit: { lat: 16.4419, lng: 100.3488 },
  phitsanulok: { lat: 16.8211, lng: 100.2659 },
  sukhothai: { lat: 17.0056, lng: 99.8264 },
  "kamphaeng-phet": { lat: 16.4828, lng: 99.5227 },

  // East
  "chon-buri": { lat: 13.3611, lng: 100.9847 },
  rayong: { lat: 12.6814, lng: 101.2816 },
  trat: { lat: 12.2428, lng: 102.5175 },
  chanthaburi: { lat: 12.6114, lng: 102.1039 },
  chachoengsao: { lat: 13.6904, lng: 101.0779 },
  "prachin-buri": { lat: 14.0509, lng: 101.3717 },
  "sa-kaeo": { lat: 13.824, lng: 102.0646 },

  // West
  "prachuap-khiri-khan": { lat: 11.8124, lng: 99.7973 },
  phetchaburi: { lat: 13.1119, lng: 99.9398 },
  kanchanaburi: { lat: 14.0228, lng: 99.5328 },
  ratchaburi: { lat: 13.5283, lng: 99.8134 },
  tak: { lat: 16.884, lng: 99.1258 },

  // Northeast
  "nakhon-ratchasima": { lat: 14.9799, lng: 102.0978 },
  loei: { lat: 17.486, lng: 101.7223 },
  "khon-kaen": { lat: 16.4322, lng: 102.8236 },
  "udon-thani": { lat: 17.4138, lng: 102.7872 },
  "ubon-ratchathani": { lat: 15.2287, lng: 104.8564 },
  "buri-ram": { lat: 14.993, lng: 103.1029 },
  surin: { lat: 14.8829, lng: 103.4937 },
  "si-sa-ket": { lat: 15.1186, lng: 104.322 },
  chaiyaphum: { lat: 15.8068, lng: 102.0315 },
  "nong-khai": { lat: 17.8783, lng: 102.742 },
  "bueng-kan": { lat: 18.3609, lng: 103.6464 },
  "nakhon-phanom": { lat: 17.392, lng: 104.7695 },
  "sakon-nakhon": { lat: 17.1546, lng: 104.1348 },
  mukdahan: { lat: 16.5436, lng: 104.7209 },
  kalasin: { lat: 16.4314, lng: 103.5059 },
  "maha-sarakham": { lat: 16.1851, lng: 103.3026 },
  "roi-et": { lat: 16.0538, lng: 103.652 },
  yasothon: { lat: 15.7926, lng: 104.1453 },
  "amnat-charoen": { lat: 15.8657, lng: 104.6258 },
  "nong-bua-lam-phu": { lat: 17.2218, lng: 102.426 },

  // South
  phuket: { lat: 7.8804, lng: 98.3923 },
  krabi: { lat: 8.0863, lng: 98.9063 },
  "surat-thani": { lat: 9.1382, lng: 99.3217 },
  "phang-nga": { lat: 8.4501, lng: 98.5255 },
  songkhla: { lat: 7.1898, lng: 100.5954 },
  trang: { lat: 7.5594, lng: 99.6114 },
  satun: { lat: 6.6238, lng: 100.0674 },
  chumphon: { lat: 10.493, lng: 99.18 },
  ranong: { lat: 9.9658, lng: 98.6348 },
  "nakhon-si-thammarat": { lat: 8.4304, lng: 99.9631 },
  phatthalung: { lat: 7.6167, lng: 100.074 },
  pattani: { lat: 6.8695, lng: 101.2505 },
  yala: { lat: 6.5411, lng: 101.2804 },
  narathiwat: { lat: 6.4255, lng: 101.8253 },
};

export function getProvinceCenter(provinceId?: string | null): {
  lat: number;
  lng: number;
} {
  if (provinceId && THAILAND_PROVINCE_CENTROIDS[provinceId]) {
    return THAILAND_PROVINCE_CENTROIDS[provinceId];
  }
  return { lat: 13.7563, lng: 100.5018 };
}

export interface PinValidationResult {
  status: "ok" | "warning" | "outside_thailand";
  messageTh: string | null;
  messageEn: string | null;
  distanceFromProvinceKm?: number;
}

export function validateThailandPin(
  lat: number | null,
  lng: number | null,
  provinceId?: string | null
): PinValidationResult {
  if (
    typeof lat !== "number" ||
    typeof lng !== "number" ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  ) {
    return { status: "ok", messageTh: null, messageEn: null };
  }

  // Thailand outer geographic bounding box
  const inThailand =
    lat >= 5.5 && lat <= 20.65 && lng >= 97.2 && lng <= 105.8;
  if (!inThailand) {
    return {
      status: "outside_thailand",
      messageTh:
        "หมุดที่ปักอยู่นอกเขตประเทศไทย กรุณาตรวจสอบลิงก์หรือเลื่อนหมุดกลับมาที่ตำแหน่งที่พักจริง",
      messageEn:
        "Pin is outside Thailand. Please drag the pin to your actual property location.",
    };
  }

  if (provinceId && THAILAND_PROVINCE_CENTROIDS[provinceId]) {
    const center = THAILAND_PROVINCE_CENTROIDS[provinceId];
    const dist = Math.round(
      haversineDistanceKm(lat, lng, center.lat, center.lng)
    );
    // Large elongated provinces (e.g. Chiang Mai, Prachuap, Surat/Samui, Tak) span up to ~150km from center
    if (dist > 155) {
      const prov = getProvinceById(provinceId);
      const provNameTh = prov ? prov.nameTh.split("(")[0].trim() : provinceId;
      const provNameEn = prov ? prov.nameEn : provinceId;
      return {
        status: "warning",
        distanceFromProvinceKm: dist,
        messageTh: `หมุดอยู่ห่างจากใจกลาง จ.${provNameTh} ประมาณ ${dist} กม. กรุณาเช็กว่าเลือกจังหวัดตรงกับจุดปักหมุด`,
        messageEn: `Pin is ~${dist} km from ${provNameEn}. Please verify your selected province matches this pin.`,
      };
    }
  }

  return { status: "ok", messageTh: null, messageEn: null };
}

