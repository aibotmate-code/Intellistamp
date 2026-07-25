import bcryptjs from 'bcryptjs'

const ROUNDS = 10

export function hashPin(pin: string): Promise<string> {
  return bcryptjs.hash(pin, ROUNDS)
}

export async function verifyPin(
  pin: string,
  hash: string | null | undefined,
  plaintextFallback: string
): Promise<boolean> {
  if (hash) return bcryptjs.compare(pin, hash)
  // Timing-safe plaintext fallback for rows that predate PIN hashing
  if (pin.length !== plaintextFallback.length) return false
  let diff = 0
  for (let i = 0; i < pin.length; i++) diff |= pin.charCodeAt(i) ^ plaintextFallback.charCodeAt(i)
  return diff === 0
}
