import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/src/lib/auth/constants";
import { sessionCookieOptions } from "@/src/lib/auth/session";

export async function POST() {
  const response = NextResponse.json({ success: true });
  response.cookies.set(SESSION_COOKIE_NAME, "", sessionCookieOptions(0));
  return response;
}
