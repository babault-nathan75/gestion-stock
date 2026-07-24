const ALGO = { name: "HMAC", hash: "SHA-256" }

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.AUTH_SECRET || "")
}

function getUsers(): Record<string, string> {
  const raw = process.env.AUTH_USERS || ""
  const users: Record<string, string> = {}
  for (const part of raw.split(",")) {
    const [pseudo, password] = part.split(":")
    if (pseudo && password) users[pseudo.trim()] = password.trim()
  }
  return users
}

export async function verifyUser(pseudo: string, password: string): Promise<boolean> {
  const users = getUsers()
  return users[pseudo] === password
}

export async function createSessionToken(pseudo: string): Promise<string> {
  const payload = JSON.stringify({ u: pseudo, e: Date.now() + 24 * 60 * 60 * 1000 })
  const data = btoa(payload)

  const key = await crypto.subtle.importKey("raw", getSecret().buffer as ArrayBuffer, ALGO, false, ["sign"])
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data))
  const hex = Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("")

  return `${data}.${hex}`
}

export async function verifySessionToken(token: string): Promise<string | null> {
  try {
    const [data, hex] = token.split(".")
    if (!data || !hex) return null

    const key = await crypto.subtle.importKey("raw", getSecret().buffer as ArrayBuffer, ALGO, false, ["verify"])
    const sig = Uint8Array.from(hex.match(/.{1,2}/g)!.map((h) => parseInt(h, 16)))
    const valid = await crypto.subtle.verify("HMAC", key, sig, new TextEncoder().encode(data))
    if (!valid) return null

    const payload = JSON.parse(atob(data))
    if (payload.e < Date.now()) return null

    return payload.u
  } catch {
    return null
  }
}
