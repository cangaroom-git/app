import { permanentRedirect } from "next/navigation";

export default function LegacyBoardRedirectPage() {
  permanentRedirect("/trip");
}
