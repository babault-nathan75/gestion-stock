import { NextRequest, NextResponse } from "next/server"
import { verifyUser, createSessionToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { pseudo, password } = await req.json()

    if (!pseudo || !password) {
      return NextResponse.json({ error: "Identifiants requis" }, { status: 400 })
    }

    const valid = await verifyUser(pseudo, password)
    if (!valid) {
      return NextResponse.json({ error: "Pseudo ou mot de passe incorrect" }, { status: 401 })
    }

    const token = await createSessionToken(pseudo)
    const res = NextResponse.json({ ok: true, pseudo })
    res.cookies.set("session", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      path: "/",
      maxAge: 24 * 60 * 60,
    })
    return res
  } catch {
    return NextResponse.json({ error: "Erreur serveur" }, { status: 500 })
  }
}
