import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ ok: false, authenticated: false });
  }

  return NextResponse.json({
    ok: true,
    authenticated: true,
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
      role: session.user.role,
      memberId: session.user.memberId,
      programName: session.user.programName,
    },
  });
}
