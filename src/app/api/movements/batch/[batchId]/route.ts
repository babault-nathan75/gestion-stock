import { NextRequest, NextResponse } from "next/server"
import { getSessionUser } from "@/lib/auth"
import { getSupabase } from "@/lib/supabase"

type MovementType = "entry" | "exit"

const MOVEMENT_TABLE: Record<MovementType, string> = {
  entry: "stock_entries",
  exit: "stock_exits",
}

async function revertBatch(
  db: ReturnType<typeof getSupabase>,
  table: string,
  batchId: string,
  stockMultiplier: number
) {
  const { data: rows, error } = await db
    .from(table)
    .select("product_id, quantity, warehouse")
    .eq("batch_id", batchId)

  if (error || !rows || rows.length === 0) return { count: 0 }

  const byProduct = new Map<string, number>()
  const byWarehouse = new Map<string, Map<string, number>>()

  for (const row of rows) {
    byProduct.set(row.product_id, (byProduct.get(row.product_id) || 0) + row.quantity)
    const wm = byWarehouse.get(row.product_id) || new Map<string, number>()
    wm.set(row.warehouse, (wm.get(row.warehouse) || 0) + row.quantity)
    byWarehouse.set(row.product_id, wm)
  }

  for (const [productId, qty] of byProduct) {
    const { data: prod } = await db
      .from("products")
      .select("quantity")
      .eq("id", productId)
      .maybeSingle()
    if (prod) {
      await db
        .from("products")
        .update({ quantity: Math.max(0, prod.quantity + stockMultiplier * qty) })
        .eq("id", productId)
    }
  }

  for (const [productId, wm] of byWarehouse) {
    for (const [warehouseName, qty] of wm) {
      const { data: stock } = await db
        .from("product_stock")
        .select("quantity")
        .eq("product_id", productId)
        .eq("warehouse", warehouseName)
        .maybeSingle()
      if (stock) {
        await db
          .from("product_stock")
          .update({ quantity: Math.max(0, stock.quantity + stockMultiplier * qty) })
          .eq("product_id", productId)
          .eq("warehouse", warehouseName)
      }
    }
  }

  const { error: deleteError } = await db.from(table).delete().eq("batch_id", batchId)
  if (deleteError) return { count: 0, error: deleteError.message }
  return { count: rows.length }
}

function normalizeType(value: string | null): MovementType | null {
  return value === "exit" ? "exit" : value === "entry" ? "entry" : null
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { batchId } = await params
  const type = normalizeType(req.nextUrl.searchParams.get("type"))
  if (!type) {
    return NextResponse.json({ error: "Type de mouvement manquant (entry|exit)" }, { status: 400 })
  }

  const db = getSupabase()
  const table = MOVEMENT_TABLE[type]
  const stockMultiplier = type === "entry" ? -1 : 1

  const result = await revertBatch(db, table, batchId, stockMultiplier)
  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 500 })
  }
  return NextResponse.json({ ok: true, deleted: result.count })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ batchId: string }> }) {
  const user = await getSessionUser(req)
  if (!user || user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Accès refusé" }, { status: 403 })
  }

  const { batchId } = await params
  const body = await req.json()
  const type = normalizeType(body.type)
  if (!type) {
    return NextResponse.json({ error: "Type de mouvement manquant (entry|exit)" }, { status: 400 })
  }
  if (!Array.isArray(body.lines) || body.lines.length === 0) {
    return NextResponse.json({ error: "Ajoutez au moins un produit" }, { status: 400 })
  }

  const db = getSupabase()
  const table = MOVEMENT_TABLE[type]
  const stockMultiplier = type === "entry" ? -1 : 1

  const revertResult = await revertBatch(db, table, batchId, stockMultiplier)
  if (revertResult.error) {
    return NextResponse.json({ error: revertResult.error }, { status: 500 })
  }

  const rows: Record<string, unknown>[] = []
  for (const line of body.lines) {
    let productId: string = line.product_id
    if (productId === "__new__") {
      const productName = String(line.product_name || "").trim()
      if (!productName) {
        return NextResponse.json({ error: "Nom de nouveau produit manquant" }, { status: 400 })
      }
      const { data: created, error: createError } = await db
        .from("products")
        .insert({
          name: productName,
          quantity: 0,
          price: parseFloat(line.unit_price) || 0,
        })
        .select("id")
        .single()
      if (createError || !created) {
        return NextResponse.json({ error: `Erreur création produit "${productName}"` }, { status: 500 })
      }
      productId = created.id
    }

    rows.push({
      batch_id: batchId,
      product_id: productId,
      quantity: parseInt(String(line.quantity)) || 0,
      unit_price: parseFloat(String(line.unit_price)) || 0,
      warehouse: body.warehouse || "Abidjan",
      date: body.date || new Date().toISOString().split("T")[0],
      notes: body.notes ? String(body.notes).trim() : null,
      created_by: user.pseudo,
      ...(type === "entry"
        ? { origin: String(body.origin || "").trim() }
        : { destination: String(body.destination || "").trim(), recipient: String(body.recipient || "").trim() }),
    })
  }

  const { error: insertError } = await db.from(table).insert(rows)
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, count: rows.length })
}