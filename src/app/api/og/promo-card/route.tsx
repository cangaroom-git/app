import { ImageResponse } from "next/og";

export const runtime = "edge";

const CATEGORY_THEME: Record<
  string,
  { bg: string; labelTh: string; labelEn: string }
> = {
  STAY: { bg: "#5369A6", labelTh: "ที่พัก & โรงแรม", labelEn: "STAYS" },
  CAFE: { bg: "#D47E35", labelTh: "คาเฟ่", labelEn: "CAFES" },
  RESTAURANT: { bg: "#C6566E", labelTh: "ร้านอาหาร & บาร์", labelEn: "DINING & BARS" },
  BAR: { bg: "#C6566E", labelTh: "บาร์ & รูฟท็อป", labelEn: "BARS" },
  WELLNESS: { bg: "#3A8D9A", labelTh: "สปา & เวลเนส", labelEn: "WELLNESS" },
  ATTRACTION: { bg: "#529D48", labelTh: "กิจกรรม & ที่เที่ยว", labelEn: "ACTIVITIES" },
};

/**
 * Dynamic Branded 1:1 Promo Card Image Generator (next/og ImageResponse)
 * Solves copyright-free visual automation for text-only, credit-card, and affiliate promo deals.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const headline = (searchParams.get("headline") || "ส่วนลดพิเศษเที่ยวไทย").slice(0, 48);
  const brand = (searchParams.get("brand") || "Nondii Partner").slice(0, 42);
  const categoryKey = (searchParams.get("category") || "STAY").toUpperCase();
  const scope = (searchParams.get("scope") || "ทั่วประเทศ · ออนไลน์").slice(0, 36);
  const dates = (searchParams.get("dates") || "").slice(0, 32);
  const code = (searchParams.get("code") || "").slice(0, 22);

  const theme = CATEGORY_THEME[categoryKey] ?? {
    bg: "#1E78D6",
    labelTh: "โปรเที่ยวไทย",
    labelEn: "TRAVEL DEAL",
  };

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          backgroundColor: theme.bg,
          padding: "56px",
          fontFamily: "sans-serif",
        }}
      >
        {/* Top Brand Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              backgroundColor: "rgba(255,255,255,0.18)",
              color: "#ffffff",
              borderRadius: "999px",
              padding: "12px 26px",
              fontSize: "24px",
              fontWeight: 700,
              letterSpacing: "0.02em",
            }}
          >
            {theme.labelEn}
          </div>
          <div
            style={{
              display: "flex",
              color: "rgba(255,255,255,0.88)",
              fontSize: "26px",
              fontWeight: 700,
              letterSpacing: "-0.02em",
            }}
          >
            nondii
          </div>
        </div>

        {/* Center Crisp White Ticket Surface */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            backgroundColor: "#ffffff",
            borderRadius: "40px",
            padding: "52px 48px",
            minHeight: "480px",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div
              style={{
                display: "flex",
                fontSize: "28px",
                fontWeight: 700,
                color: theme.bg,
              }}
            >
              {brand}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: headline.length > 22 ? "54px" : "66px",
                fontWeight: 800,
                color: "#182334",
                lineHeight: 1.12,
                letterSpacing: "-0.03em",
              }}
            >
              {headline}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "16px",
              borderTop: "2px solid #e3ebf4",
              paddingTop: "28px",
            }}
          >
            {code ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    backgroundColor: "#f3f7fc",
                    color: "#182334",
                    borderRadius: "999px",
                    padding: "12px 26px",
                    fontSize: "26px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                  }}
                >
                  {code}
                </div>
                {dates ? (
                  <div
                    style={{
                      display: "flex",
                      fontSize: "22px",
                      fontWeight: 600,
                      color: "#5c6b80",
                    }}
                  >
                    {dates}
                  </div>
                ) : null}
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    fontSize: "24px",
                    fontWeight: 600,
                    color: "#5c6b80",
                  }}
                >
                  {scope}
                </div>
                {dates ? (
                  <div
                    style={{
                      display: "flex",
                      fontSize: "22px",
                      fontWeight: 600,
                      color: theme.bg,
                    }}
                  >
                    {dates}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Footer Scope Line */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            color: "rgba(255,255,255,0.9)",
            fontSize: "22px",
            fontWeight: 600,
          }}
        >
          <span>{scope}</span>
          <span>nondii.com</span>
        </div>
      </div>
    ),
    {
      width: 800,
      height: 800,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=604800",
      },
    }
  );
}
