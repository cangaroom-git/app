"use client";

import React from "react";
import { RoomLodge } from "@/data/rooms";

interface ResortMasterplanMapProps {
  rooms: RoomLodge[];
  roomStatusMap: Record<
    string,
    {
      state: "AVAILABLE" | "HELD" | "BOOKED" | "MAINTENANCE";
      capacityOk: boolean;
      effectiveNightlyPrice: number;
    }
  >;
  selectedRoomId: string;
  onSelectRoom: (room: RoomLodge) => void;
  onOpenBooking: (room: RoomLodge, tab: "booking" | "details") => void;
  checkInLabel?: string;
  nights?: number;
}

/**
 * Exact 1:1 pixel-matched coordinates on the 1000 x 560 canvas
 * measured directly from media_1792145746890_df19faeb.png:
 * - A1 (Top A-Frame): x = 520, y = 313 (resting right above horizontal walkway y = 356)
 * - A2 (Bottom A-Frame): x = 520, y = 399 (directly below A1 across horizontal walkway y = 356)
 * - Gazebo: x = 612, y = 338 (immediately right of A1's wooden deck, above zig-zag walkway)
 * - A3 (Suite Cabin S1): x = 678, y = 346 (right of Gazebo, above zig-zag walkway y = 398)
 * - A4 (Suite Cabin S2): x = 766, y = 378 (rightmost cabin at end of walkway, well inside lawn)
 */
const CANONICAL_CABIN_POSITIONS: Record<string, { cx: number; cy: number }> = {
  A1: { cx: 520, cy: 313 },
  A2: { cx: 520, cy: 399 },
  A3: { cx: 678, cy: 346 },
  A4: { cx: 766, cy: 378 },
};

export function ResortMasterplanMap({
  rooms,
  roomStatusMap,
  selectedRoomId,
  onSelectRoom,
  onOpenBooking,
}: ResortMasterplanMapProps) {
  const getStatusColor = (
    state?: "AVAILABLE" | "HELD" | "BOOKED" | "MAINTENANCE"
  ) => {
    switch (state) {
      case "AVAILABLE":
        return {
          dot: "#66C88B",
          badgeBg: "#1F513F",
          label: "ว่าง",
        };
      case "HELD":
        return {
          dot: "#F59E0B",
          badgeBg: "#B45309",
          label: "ล็อคชั่วคราว",
        };
      case "MAINTENANCE":
        return {
          dot: "#9F7AEA",
          badgeBg: "#6B21A8",
          label: "ปิดซ่อม",
        };
      default:
        return {
          dot: "#EA5B52",
          badgeBg: "#B91C1C",
          label: "เต็ม",
        };
    }
  };

  return (
    <div className="w-full select-none">
      <svg
        viewBox="0 0 1000 560"
        className="w-full h-auto block"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Mowed Lawn Stripe Pattern (Matches the vertical lawn stripes on the right half) */}
          <pattern
            id="lawnStripes"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
            patternTransform="rotate(4)"
          >
            <rect width="12" height="24" fill="#6F987B" />
            <rect x="12" width="12" height="24" fill="#678F73" />
          </pattern>

          {/* Soft Drop Shadow */}
          <filter
            id="mapShadow"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
          >
            <feDropShadow
              dx="0"
              dy="2.5"
              stdDeviation="2.5"
              floodColor="#16261C"
              floodOpacity="0.22"
            />
          </filter>

          {/* Detailed Layered Canopy Tree */}
          <g id="treeCanopyDark">
            <circle cx="0" cy="0" r="28" fill="#3B624B" opacity="0.92" />
            <circle cx="-5" cy="-4" r="22" fill="#487359" />
            <circle cx="6" cy="4" r="18" fill="#568568" />
            <circle cx="0" cy="0" r="10" fill="#68987A" />
          </g>

          {/* Detailed Tropical Palm Cluster */}
          <g id="treePalmCluster">
            <circle cx="0" cy="0" r="26" fill="#3E674F" opacity="0.88" />
            <path
              d="M -20,0 L 20,0 M 0,-20 L 0,20 M -15,-15 L 15,15 M -15,15 L 15,-15"
              stroke="#6A9B7C"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M -17,-7 L 17,7 M -7,-17 L 7,17"
              stroke="#8AB99A"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <circle cx="0" cy="0" r="4" fill="#A7D1B5" />
          </g>

          {/* Small Garden Shrub */}
          <g id="gardenShrub">
            <circle cx="0" cy="0" r="15" fill="#395E48" />
            <circle cx="-2" cy="-2" r="11" fill="#4B765C" />
            <circle cx="3" cy="2" r="7" fill="#608E72" />
          </g>

          {/* Top-Down Dark Sedan */}
          <g id="carDark">
            <rect
              x="-24"
              y="-11"
              width="48"
              height="22"
              rx="6"
              fill="#565C64"
              filter="url(#mapShadow)"
            />
            <rect
              x="-12"
              y="-8.5"
              width="25"
              height="17"
              rx="3"
              fill="#3A3F45"
            />
            <rect
              x="-7"
              y="-7"
              width="14"
              height="14"
              rx="2"
              fill="#727A84"
            />
          </g>

          {/* Top-Down White Sedan (Middle Car) */}
          <g id="carWhite">
            <rect
              x="-24"
              y="-11"
              width="48"
              height="22"
              rx="6"
              fill="#F8FAFC"
              stroke="#CBD5E1"
              strokeWidth="1"
              filter="url(#mapShadow)"
            />
            <rect
              x="-12"
              y="-8.5"
              width="25"
              height="17"
              rx="3"
              fill="#334155"
            />
            <rect
              x="-6"
              y="-7"
              width="14"
              height="14"
              rx="2"
              fill="#FFFFFF"
            />
          </g>
        </defs>

        {/* =================================================================
            1. OUTER RESORT LAND PLOT & PERIMETER ROAD (1000 x 560)
        ================================================================== */}
        {/* Outer Cream Perimeter Road Border */}
        <polygon
          points="365,32 964,194 924,496 252,516 145,556 26,205"
          fill="#ECF3EC"
          stroke="#E2ECE2"
          strokeWidth="2"
        />

        {/* Main Forest Land Plot */}
        <polygon
          points="368,42 952,202 912,486 258,506 155,548 42,208"
          fill="#557D65"
        />

        {/* Striped Mowed Lawn Zone on Center & Right */}
        <polygon
          points="415,175 930,212 898,472 395,488"
          fill="url(#lawnStripes)"
        />

        {/* =================================================================
            2. GRAVEL PARKING COURTYARD & DRIVEWAY ON THE LEFT
        ================================================================== */}
        <polygon
          points="192,188 338,154 382,356 285,422 256,550 214,550 232,372"
          fill="#DAD3C8"
        />

        {/* 3 Stacked Parked Cars (Dark, White, Dark — tilted -12deg) */}
        <use
          href="#carDark"
          transform="translate(280, 248) rotate(-12)"
        />
        <use
          href="#carWhite"
          transform="translate(284, 282) rotate(-12)"
        />
        <use
          href="#carDark"
          transform="translate(290, 316) rotate(-12)"
        />

        {/* Blue Teardrop Parking Pin (P) at (232, 332) */}
        <g
          transform="translate(232, 332) rotate(-25)"
          filter="url(#mapShadow)"
        >
          <path
            d="M 0,-24 C 13,-24 24,-13 24,0 C 24,11 12,24 0,34 C -12,24 -24,11 -24,0 C -24,-13 -13,-24 0,-24 Z"
            fill="#6EB4E8"
          />
          <circle cx="0" cy="-1" r="15" fill="#FFFFFF" />
          <text
            x="0"
            y="5"
            textAnchor="middle"
            fill="#141413"
            fontSize="17"
            fontWeight="900"
          >
            P
          </text>
        </g>

        {/* =================================================================
            3. STEPPING-STONE GARDEN WALKWAYS (Exact H-branch + Zig-zag)
            - Horizontal spine at y = 356 (right between A1 y=313 and A2 y=399!)
            - Vertical branch at x = 444 (just left of A1/A2 left edge x=472!)
            - Zig-zag wrapping under Gazebo (612, 338) and under A3 (678, 346) to A4 (766, 378)
        ================================================================== */}
        {/* Path Base */}
        <path
          d="M 392,356 L 582,356 L 594,392 L 626,376 L 668,398 L 734,390"
          stroke="#CFC4B4"
          strokeWidth="15"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Vertical Branch between Reception and A1/A2 */}
        <path
          d="M 444,282 L 444,418"
          stroke="#CFC4B4"
          strokeWidth="14"
          strokeLinecap="round"
          fill="none"
        />
        {/* Stepping Stone Dashes */}
        <path
          d="M 396,356 L 582,356 L 594,392 L 626,376 L 668,398 L 730,390"
          stroke="#DED6CA"
          strokeWidth="10"
          strokeDasharray="6 6"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M 444,286 L 444,414"
          stroke="#DED6CA"
          strokeWidth="9"
          strokeDasharray="6 6"
          strokeLinecap="round"
          fill="none"
        />

        {/* =================================================================
            4. CIRCULAR WOODEN GAZEBO PAVILION AT (612, 338)
        ================================================================== */}
        <g transform="translate(612, 338)" filter="url(#mapShadow)">
          <circle
            cx="0"
            cy="0"
            r="22"
            fill="#B5967D"
            stroke="#DFD2C5"
            strokeWidth="2"
          />
          <circle cx="0" cy="0" r="14" fill="#9D7D64" />
          <circle cx="0" cy="0" r="4.5" fill="#70533E" />
        </g>

        {/* =================================================================
            5. RECEPTION BUILDING ("ติดต่อสอบถาม") & LARGE RED PIN
        ================================================================== */}
        <g filter="url(#mapShadow)">
          {/* Upper-right angled wing */}
          <g transform="translate(392, 208) rotate(55)">
            <rect
              x="-26"
              y="-38"
              width="52"
              height="76"
              rx="3"
              fill="#9E7D65"
              stroke="#C8B19D"
              strokeWidth="1.5"
            />
            <line
              x1="0"
              y1="-36"
              x2="0"
              y2="36"
              stroke="#7A5D48"
              strokeWidth="2"
            />
          </g>
          {/* Main vertical-ish shingle wing */}
          <g transform="translate(364, 282) rotate(-10)">
            <rect
              x="-30"
              y="-68"
              width="60"
              height="136"
              rx="3"
              fill="#AC8A71"
              stroke="#D5C0AE"
              strokeWidth="1.5"
            />
            <line
              x1="0"
              y1="-66"
              x2="0"
              y2="66"
              stroke="#7A5D48"
              strokeWidth="2"
            />
          </g>
        </g>

        {/* White Banner "ติดต่อสอบถาม" rotated -33deg across Reception roof */}
        <g
          transform="translate(358, 254) rotate(-33)"
          filter="url(#mapShadow)"
        >
          <rect
            x="-64"
            y="-14"
            width="128"
            height="28"
            rx="4"
            fill="#FFFFFF"
            stroke="#CBD5E1"
            strokeWidth="1.2"
          />
          <text
            x="0"
            y="5"
            textAnchor="middle"
            fill="#334155"
            fontSize="13.5"
            fontWeight="800"
          >
            ติดต่อสอบถาม
          </text>
        </g>

        {/* Large Coral-Red Teardrop Pin at (324, 196) */}
        <g
          transform="translate(324, 196) rotate(-26)"
          filter="url(#mapShadow)"
        >
          <path
            d="M 0,-34 C 19,-34 34,-19 34,0 C 34,16 17,34 0,48 C -17,34 -34,16 -34,0 C -34,-19 -19,-34 0,-34 Z"
            fill="#E07A72"
          />
          <circle cx="0" cy="-2" r="12" fill="#B8524B" />
        </g>

        {/* =================================================================
            6. BOTANICAL TREES (Exact clusters from media_1792145746890_df19faeb.png)
        ================================================================== */}
        {/* Left Border & Parking Perimeter */}
        <use href="#treePalmCluster" transform="translate(82, 232)" />
        <use href="#treeCanopyDark" transform="translate(138, 195)" />
        <use href="#treeCanopyDark" transform="translate(192, 152)" />
        <use href="#treePalmCluster" transform="translate(262, 145)" />
        <use href="#treePalmCluster" transform="translate(318, 68)" />
        <use href="#treeCanopyDark" transform="translate(382, 75)" />

        <use href="#treeCanopyDark" transform="translate(135, 315)" />
        <use href="#treeCanopyDark" transform="translate(155, 392)" />
        <use href="#treePalmCluster" transform="translate(148, 468)" />
        <use href="#treeCanopyDark" transform="translate(182, 520)" />
        <use href="#treePalmCluster" transform="translate(308, 485)" />

        {/* Trees between Reception and A1/A2 */}
        <use href="#gardenShrub" transform="translate(322, 376)" />
        <use href="#treeCanopyDark" transform="translate(405, 435)" />
        <use href="#gardenShrub" transform="translate(422, 305)" />

        {/* Top Forest Canopy above A1, Gazebo, A3, A4 */}
        <use href="#treePalmCluster" transform="translate(448, 165)" />
        <use href="#treeCanopyDark" transform="translate(495, 132)" />
        <use href="#treeCanopyDark" transform="translate(528, 224)" />
        <use href="#treePalmCluster" transform="translate(585, 148)" />
        <use href="#treePalmCluster" transform="translate(652, 165)" />
        <use href="#treeCanopyDark" transform="translate(712, 198)" />
        <use href="#treePalmCluster" transform="translate(792, 212)" />
        <use href="#treeCanopyDark" transform="translate(865, 242)" />
        <use href="#gardenShrub" transform="translate(604, 278)" />
        <use href="#gardenShrub" transform="translate(655, 265)" />
        <use href="#gardenShrub" transform="translate(748, 282)" />

        {/* Right & Bottom-Right Trees */}
        <use href="#gardenShrub" transform="translate(842, 378)" />
        <use href="#treeCanopyDark" transform="translate(888, 452)" />
        <use href="#treePalmCluster" transform="translate(835, 448)" />
        <use href="#gardenShrub" transform="translate(718, 428)" />
        <use href="#treePalmCluster" transform="translate(565, 456)" />
        <use href="#treePalmCluster" transform="translate(495, 465)" />

        {/* =================================================================
            7. THE 4 INTERACTIVE CABINS (A1, A2, A3, A4 + dynamic rooms)
            - A1 (520, 313) & A2 (520, 399): Vertically aligned dark-roof A-Frames
            - A3 (678, 346) & A4 (766, 378): Staggered warm-brown Suite Cabins
        ================================================================== */}
        {rooms.map((room, index) => {
          const canonical = CANONICAL_CABIN_POSITIONS[room.code];
          const cx = canonical
            ? canonical.cx
            : Math.round((room.mapX / 100) * 1000);
          const cy = canonical
            ? canonical.cy
            : Math.round((room.mapY / 100) * 560);

          const st = roomStatusMap[room.id];
          const colorInfo = getStatusColor(st?.state);
          const isSelected = selectedRoomId === room.id;
          const isAFramePair =
            room.code === "A1" || room.code === "A2" || index < 2;

          const priceNum = (
            st?.effectiveNightlyPrice ?? room.basePriceThb
          ).toLocaleString();

          return (
            <g
              key={room.id}
              transform={`translate(${cx}, ${cy})`}
              onClick={() => {
                onSelectRoom(room);
                onOpenBooking(room, "details");
              }}
              className="cursor-pointer group"
            >
              {/* Selection White Halo Ring */}
              {isSelected && (
                <rect
                  x={isAFramePair ? "-52" : "-40"}
                  y={isAFramePair ? "-31" : "-36"}
                  width={isAFramePair ? "104" : "80"}
                  height={isAFramePair ? "62" : "72"}
                  rx="8"
                  fill="none"
                  stroke="#FFFFFF"
                  strokeWidth="3.5"
                />
              )}

              {isAFramePair ? (
                /* ---------------------------------------------------------
                   A1 & A2: DARK CHARCOAL A-FRAME ROOF + RIGHT WOODEN DECK
                ---------------------------------------------------------- */
                <g filter="url(#mapShadow)">
                  {/* Dark Charcoal Pitched Roof (Left 72x52) */}
                  <rect
                    x="-46"
                    y="-26"
                    width="72"
                    height="52"
                    rx="2"
                    fill="#4E4C4A"
                    stroke="#6E6B68"
                    strokeWidth="1"
                  />
                  {/* Horizontal Roof Ridge Line */}
                  <line
                    x1="-44"
                    y1="0"
                    x2="24"
                    y2="0"
                    stroke="#363432"
                    strokeWidth="2"
                  />

                  {/* Right Wooden Terrace Deck (22x52) */}
                  <rect
                    x="24"
                    y="-26"
                    width="22"
                    height="52"
                    rx="2"
                    fill="#C9A98D"
                    stroke="#DFC7B0"
                    strokeWidth="1"
                  />
                  {/* Outdoor Bathtub (Blue) on Terrace */}
                  <ellipse
                    cx="35"
                    cy="-14"
                    rx="5"
                    ry="7"
                    fill="#78C2F0"
                    stroke="#FFFFFF"
                    strokeWidth="1.2"
                  />

                  {/* Soft Rose-White Square Pad + Status Circle on Roof Center */}
                  <rect
                    x="-23"
                    y="-13"
                    width="26"
                    height="26"
                    rx="3"
                    fill="#F4DCE6"
                  />
                  <circle
                    cx="-10"
                    cy="0"
                    r="9"
                    fill={colorInfo.dot}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />

                  {/* Left-Side Angled Callout Tag (A1 / A2) */}
                  <g transform="translate(-62, 8) rotate(-35)">
                    <rect
                      x="-22"
                      y="-12"
                      width="44"
                      height="24"
                      rx="4"
                      fill={isSelected ? "#141413" : "#FFFFFF"}
                      stroke="#CBD5E1"
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="4.5"
                      textAnchor="middle"
                      fill={isSelected ? "#FFFFFF" : "#334155"}
                      fontSize="12.5"
                      fontWeight="800"
                    >
                      {room.code}
                    </text>
                  </g>
                </g>
              ) : (
                /* ---------------------------------------------------------
                   A3 & A4: WARM BROWN ROOF + RIGHT WOODEN DECK & UMBRELLA
                ---------------------------------------------------------- */
                <g filter="url(#mapShadow)">
                  {/* Warm Brown Pitched Roof (Left 46x60) */}
                  <rect
                    x="-34"
                    y="-30"
                    width="46"
                    height="60"
                    rx="2"
                    fill="#9E7356"
                    stroke="#B88E72"
                    strokeWidth="1"
                  />
                  {/* Vertical Roof Ridge Line */}
                  <line
                    x1="-11"
                    y1="-28"
                    x2="-11"
                    y2="28"
                    stroke="#7D583F"
                    strokeWidth="2"
                  />

                  {/* Right Wooden Terrace Deck (22x60) */}
                  <rect
                    x="12"
                    y="-30"
                    width="22"
                    height="60"
                    rx="2"
                    fill="#C9A98D"
                    stroke="#DFC7B0"
                    strokeWidth="1"
                  />
                  {/* Blue Outdoor Tub & White Umbrella at Bottom-Right */}
                  <rect
                    x="15"
                    y="6"
                    width="12"
                    height="18"
                    rx="2"
                    fill="#78C2F0"
                  />
                  <circle
                    cx="25"
                    cy="16"
                    r="6.5"
                    fill="#FFFFFF"
                    stroke="#CBD5E1"
                    strokeWidth="1"
                  />

                  {/* Cream Square Pad + Status Circle on Roof Center */}
                  <rect
                    x="-23"
                    y="-12"
                    width="24"
                    height="24"
                    rx="3"
                    fill="#F5E8D7"
                  />
                  <circle
                    cx="-11"
                    cy="0"
                    r="8.5"
                    fill={colorInfo.dot}
                    stroke="#FFFFFF"
                    strokeWidth="2"
                  />

                  {/* Leader Line pointing from Roof to Angled Top-Right Callout Tag */}
                  <line
                    x1="-11"
                    y1="-22"
                    x2="4"
                    y2="-38"
                    stroke="#CBD5E1"
                    strokeWidth="2"
                  />

                  {/* Angled Callout Tag Above Roof */}
                  <g transform="translate(22, -46) rotate(-32)">
                    <rect
                      x="-48"
                      y="-13"
                      width="96"
                      height="26"
                      rx="5"
                      fill={isSelected ? "#141413" : "#FFFFFF"}
                      stroke="#CBD5E1"
                      strokeWidth="1.2"
                    />
                    <text
                      x="0"
                      y="4.5"
                      textAnchor="middle"
                      fill={isSelected ? "#FFFFFF" : "#334155"}
                      fontSize="11.5"
                      fontWeight="800"
                    >
                      {room.code} · ฿{priceNum}
                    </text>
                  </g>
                </g>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
