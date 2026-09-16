import { NextRequest } from "next/server"
import { getSupabase } from "./supabase"

const ALGO = { name: "HMAC", hash: "SHA-256" }

export type Role = "SUPER_ADMIN" | "ADMIN"

export interface SessionUser {
  pseudo: string
  role: Role
}

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "")
}

export async function hashPassword(password: string): Promise<string> {
  const data = new TextEncoder().encode(password)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

export function getSuperAdminPseudo(): string {
  return process.env.SUPER_ADMIN_PSEUDO || "super-admin"
}

export function isSuperAdminPassword(password: string): boolean {
  const secret = process.env.SUPER_ADMIN_PASSWORD
  return Boolean(secret) && password === secret
}

export async function verifyUser(pseudo: string, password: string): Promise<SessionUser | null> {
  try {
    const { data, error } = await getSupabase()
      .from("admins")
      .select("pseudo, password_hash, role")
      .eq("pseudo", pseudo)
      .maybeSingle()

    if (!error && data) {
      const hash = await hashPassword(password)
      if (data.password_hash === hash) {
        const role: Role = data.role === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN"
        return { pseudo: data.pseudo, role }
      }
      return null
    }
  } catch {}
  return null
}

export async function createSessionToken(pseudo: string, role: Role): Promise<string> {
  const payload = JSON.stringify({ u: pseudo, r: role, e: Date.now() + 24 * 60 * 60 * 1000 })
  const data = btoa(payload)

  const key = await crypto.subtle.importKey("raw", getSecret().buffer as ArrayBuffer, ALGO, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data))
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("")

  return `${data}.${hex}`
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const [data, hex] = token.split(".")
    if (!data || !hex) return null

    const key = await crypto.subtle.importKey("raw", getSecret().buffer as ArrayBuffer, ALGO, false, ["verify"])
    const sig = Uint8Array.from(hex.match(/.{1,2}/g)!.map((h) => parseInt(h, 16)))
    const valid = await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(data))
    if (!valid) return null

    const payload = JSON.parse(atob(data))
    if (payload.e < Date.now()) return null

    const role: Role = payload.r === "SUPER_ADMIN" ? "SUPER_ADMIN" : "ADMIN"
    return { pseudo: payload.u, role }
  } catch {
    return null
  }
}

export async function getSessionUser(request: NextRequest): Promise<SessionUser | null> {
  const session = request.cookies.get("session")?.value
  if (!session) return null
  return verifySessionToken(session)
}