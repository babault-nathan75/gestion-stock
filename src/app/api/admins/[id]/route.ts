import { NextRequest, NextResponse } from "next/server"
import { getSessionUser, hashPassword, type Role } from "@/lib/auth"
import { getSupabase } from "@/lib/supabase"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { id } = await params
  const { pseudo, password, role, warehouse } = await req.json()
  const db = getSupabase()

  const update: Record<string, unknown> = {}
  if (pseudo !== undefined) {
    if (!String(pseudo).trim()) {
      return NextResponse.json({ error: "Le pseudo est requis" }, { status: 400 })
    }
    update.pseudo = String(pseudo).trim()
  }
  if (password !== undefined && String(password).length > 0) {
    if (String(password).length < 6) {
      return NextResponse.json({ error: "Le mot de passe doit contenir au moins 6 caractères" }, { status: 400 })
    }
    update.password_hash = await hashPassword(String(password))
  }
  if (role !== undefined) {
    const finalRole: Role = role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN"
    update.role = finalRole
  }
  if (warehouse !== undefined) {
    update.warehouse = warehouse || null
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ ok: true })
  }

  const { error } = await db.from("admins").update(update).eq("id", id)
  if (error?.code === "23505") {
    return NextResponse.json({ error: "Ce pseudo existe déjà" }, { status: 409 })
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { id } = await params
  const db = getSupabase()

  const { data: target, error: getError } = await db
    .from("admins")
    .select("pseudo")
    .eq("id", id)
    .maybeSingle()

  if (getError) {
    return NextResponse.json({ error: getError.message }, { status: 500 })
  }
  if (!target) {
    return NextResponse.json({ error: "Compte introuvable" }, { status: 404 })
  }
  if (target.pseudo === user.pseudo) {
    return NextResponse.json({ error: "Impossible de supprimer votre propre compte" }, { status: 409 })
  }

  const { error } = await db.from("admins").delete().eq("id", id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}