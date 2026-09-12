import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getSupabase } from "@/lib/supabase"

export async function GET(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { data, error } = await getSupabase()
    .from("warehouses")
    .select("id, name, created_at")
    .order("created_at", { ascending: true })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { name } = await req.json()
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Le nom de l'entrepôt est requis" }, { status: 400 })
  }

  const { error } = await getSupabase().from("warehouses").insert({ name: String(name).trim() })

  if (error?.code === "23505") {
    return NextResponse.json({ error: "Cet entrepôt existe déjà" }, { status: 409 })
  }
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}