import bcryptjs from 'bcryptjs'

const ROUNDS = 10

export function hashPin(pin: string): Promise<string> {
  return bcryptjs.hash(pin, ROUNDS)
}

export async function verifyPin(
  pin: string,
  hash: string | null | undefined
): Promise<boolean> {
  if (!hash) return false
  return bcryptjs.compare(pin, hash)
}
