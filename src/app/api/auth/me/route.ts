import { NextRequest, NextResponse } from "next/server"
import { verifySessionToken } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = req.cookies.get("session")?.value
  if (!session) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const pseudo = await verifySessionToken(session)
  if (!pseudo) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  return NextResponse.json({ authenticated: true, pseudo })
}
