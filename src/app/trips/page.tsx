import { permanentRedirect } from "next/navigation";

export default function LegacyTripsRedirectPage() {
  permanentRedirect("/bookings");
}
