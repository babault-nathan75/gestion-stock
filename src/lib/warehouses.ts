import { getSupabase } from "./supabase"

export const FALLBACK_WAREHOUSES = ["Abidjan", "Sinfra"] as const

let cache: string[] | null = null

export async function getWarehouses(): Promise<string[]> {
  if (cache) return cache

  try {
    const { data, error } = await getSupabase()
      .from("warehouses")
      .select("name")
      .order("created_at", { ascending: true })

    if (error) throw error

    const names = (data || [])
      .map((w) => w.name)
      .filter((name): name is string => Boolean(name))

    cache = names.length > 0 ? names : [...FALLBACK_WAREHOUSES]
  } catch {
    cache = [...FALLBACK_WAREHOUSES]
  }

  return cache
}