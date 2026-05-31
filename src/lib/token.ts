export function generateToken(bizId: string, offset: number = 0): string {
  const window = Math.floor(Date.now() / 30000) + offset
  const raw = `${bizId}-IS2024-${window}`
  let hash = 0
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) - hash + raw.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36).toUpperCase().slice(0, 6).padEnd(6, '0')
}

export function validateToken(bizId: string, token: string): boolean {
  const current = generateToken(bizId, 0)
  const previous = generateToken(bizId, -1)
  return token === current || token === previous
}

export function getSecondsUntilRotation(): number {
  return 30 - (Math.floor(Date.now() / 1000) % 30)
}
