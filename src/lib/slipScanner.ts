export async function scanSlipQrFromFile(file: File): Promise<{
  qrFound: boolean;
  qrPayload: string;
}> {
  try {
    const win = window as unknown as {
      BarcodeDetector?: new (opts: { formats: string[] }) => {
        detect: (source: ImageBitmap) => Promise<{ rawValue?: string }[]>;
      };
    };
    if (win.BarcodeDetector) {
      const detector = new win.BarcodeDetector({ formats: ["qr_code"] });
      const bitmap = await createImageBitmap(file);
      const results = await detector.detect(bitmap);
      if (results.length > 0 && results[0].rawValue) {
        return {
          qrFound: true,
          qrPayload: results[0].rawValue,
        };
      }
    }
  } catch {
    // Fallback to deterministic file fingerprint below for non-BarcodeDetector browsers
  }

  const hashSeed = `${file.name}-${file.size}-${file.lastModified}`;
  let hash = 0;
  for (let i = 0; i < hashSeed.length; i++) {
    hash = (hash << 5) - hash + hashSeed.charCodeAt(i);
    hash |= 0;
  }
  const refCode = `CGR-SLIP-${Math.abs(hash)}-${file.size}`;
  return {
    qrFound: false,
    qrPayload: refCode,
  };
}

export async function uploadMediaFile(
  file: File,
  folder: "rooms" | "coupons" | "addons" | "pins" | "slips" | "logos" | "reviews"
): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", folder);

  const res = await fetch("/api/media/upload", {
    method: "POST",
    body: formData,
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.url) {
    throw new Error(payload.error || "อัปโหลดไฟล์ไม่สำเร็จ");
  }
  return String(payload.url);
}

