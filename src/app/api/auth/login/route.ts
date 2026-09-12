import { NextRequest, NextResponse } from "next/server"
import { verifyUser, createSessionToken, isSuperAdminPassword, getSuperAdminPseudo, type Role } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { pseudo, password } = await req.json()

    if (!password || !String(password).trim()) {
      return NextResponse.json({ error: "Mot de passe requis" }, { status: 400 })
    }

    let user: { pseudo: string; role: Role } | null = null

    const trimmedPseudo = String(pseudo || "").trim()
    if (!trimmedPseudo) {
      // Connexion super-admin : mot de passe uniquement (pas de pseudo)
      if (isSuperAdminPassword(password)) {
        user = { pseudo: getSuperAdminPseudo(), role: "SUPER_ADMIN" }
      }
    } else {
      user = await verifyUser(trimmedPseudo, password)
    }

    if (!user) {
      return NextResponse.json({ error: "Pseudo ou mot de passe incorrect" }, { status: 401 })
    }

    const token = await createSessionToken(user.pseudo, user.role)
    const res = NextResponse.json({ ok: true, pseudo: user.pseudo, role: user.role })
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