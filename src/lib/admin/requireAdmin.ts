import { NextResponse } from "next/server";
import { redirect } from "next/navigation";
import { getServerSessionUser, type ServerAuthUser } from "@/lib/auth/session";

export async function requireSuperAdminPage(): Promise<ServerAuthUser> {
  const user = await getServerSessionUser();
  if (!user) {
    redirect("/login?callbackUrl=/admin");
  }
  if (user.role !== "SUPER_ADMIN") {
    redirect("/");
  }
  return user;
}

export async function requireSuperAdminApi(): Promise<
  { user: ServerAuthUser } | { error: NextResponse }
> {
  const user = await getServerSessionUser();
  if (!user) {
    return {
      error: NextResponse.json(
        { error: "กรุณาเข้าสู่ระบบ" },
        { status: 401 }
      ),
    };
  }
  if (user.role !== "SUPER_ADMIN") {
    return {
      error: NextResponse.json(
        { error: "เฉพาะผู้ดูแลระบบ (Admin) เท่านั้น" },
        { status: 403 }
      ),
    };
  }
  return { user };
}
