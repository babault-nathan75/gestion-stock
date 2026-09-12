import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getSupabase } from "@/lib/supabase"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { id } = await params
  const { name } = await req.json()
  if (!name || !String(name).trim()) {
    return NextResponse.json({ error: "Le nom de l'entrepôt est requis" }, { status: 400 })
  }
  const newName = String(name).trim()

  const db = getSupabase()

  const { data: current, error: getError } = await db
    .from("warehouses")
    .select("name")
    .eq("id", id)
    .maybeSingle()

  if (getError) {
    return NextResponse.json({ error: getError.message }, { status: 500 })
  }
  if (!current) {
    return NextResponse.json({ error: "Entrepôt introuvable" }, { status: 404 })
  }
  if (current.name === newName) {
    return NextResponse.json({ ok: true })
  }

  const { error: updateError } = await db.from("warehouses").update({ name: newName }).eq("id", id)
  if (updateError?.code === "23505") {
    return NextResponse.json({ error: "Cet entrepôt existe déjà" }, { status: 409 })
  }
  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  // Répercuter le renommage sur toutes les références
  const refTables = ["stock_entries", "stock_exits", "product_stock"] as const
  for (const table of refTables) {
    const { error } = await db
      .from(table)
      .update({ warehouse: newName })
      .eq("warehouse", current.name)
    if (error) {
      return NextResponse.json({ error: `Échec renommage sur ${table}: ${error.message}` }, { status: 500 })
    }
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

  const { data: warehouse, error: getError } = await db
    .from("warehouses")
    .select("name")
    .eq("id", id)
    .maybeSingle()

  if (getError) {
    return NextResponse.json({ error: getError.message }, { status: 500 })
  }
  if (!warehouse) {
    return NextResponse.json({ error: "Entrepôt introuvable" }, { status: 404 })
  }

  const checks = await Promise.all([
    db.from("product_stock").select("product_id", { count: "exact", head: true }).eq("warehouse", warehouse.name),
    db.from("stock_entries").select("id", { count: "exact", head: true }).eq("warehouse", warehouse.name),
    db.from("stock_exits").select("id", { count: "exact", head: true }).eq("warehouse", warehouse.name),
  ])

  const hasData = checks.some((c) => (c.count ?? 0) > 0)
  if (hasData) {
    return NextResponse.json(
      { error: "Impossible de supprimer : des stocks/mouvements sont liés à cet entrepôt" },
      { status: 409 }
    )
  }

  const { error } = await db.from("warehouses").delete().eq("id", id)
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}