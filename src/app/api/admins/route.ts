import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hashPassword, type Role } from "@/lib/auth"
import { getSupabase } from "@/lib/supabase"

async function requireSuperAdmin(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "SUPER_ADMIN") return null
  return user
}

export async function GET(req: NextRequest) {
  const user = await requireSuperAdmin(req)
  if (!user) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { data, error } = await getSupabase()
    .from("admins")
    .select("id, pseudo, role, created_by, created_at")
    .order("created_at", { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const user = await requireSuperAdmin(req)
  if (!user) {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { pseudo, password, role } = await req.json()

  if (!pseudo || !String(pseudo).trim()) {
    return NextResponse.json({ error: "Le pseudo est requis" }, { status: 400 })
  }
  if (!password || String(password).length < 8) {
    return NextResponse.json({ error: "Le mot de passe doit contenir au moins 8 caractères" }, { status: 400 })
  }

  const finalRole: Role = role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN"
  const hash = await hashPassword(String(password))

  const { error } = await getSupabase().from("admins").insert({
    pseudo: String(pseudo).trim(),
    password_hash: hash,
    role: finalRole,
    created_by: user.pseudo,
  })

  if (error?.code === "23505") {
    return NextResponse.json({ error: "Ce pseudo existe déjà" }, { status: 409 })
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}