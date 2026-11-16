import { createNeonAuth } from "@neon/auth/next/server";

export const auth = createNeonAuth({
  baseUrl:
    process.env.NEON_AUTH_BASE_URL ||
    "https://ep-rough-mouse-a17rfddf.neonauth.ap-southeast-1.aws.neon.tech/neondb/auth",
  cookies: {
    secret:
      process.env.NEON_AUTH_COOKIE_SECRET ||
      "cangaroom-fallback-session-cookie-secret-32chars",
  },
});

