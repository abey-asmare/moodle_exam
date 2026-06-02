import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { token } = await req.json();

  // TODO: replace this with your real token validation logic
  const VALID_TOKEN = process.env.ACCESS_TOKEN!

  if (token !== VALID_TOKEN) {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  // Create a response that redirects the client to /examination
  const response = NextResponse.json({ success: true });

  // Set a secure, HTTP-only cookie containing the token
  response.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24, // 1 day
  });

  return response;
}
