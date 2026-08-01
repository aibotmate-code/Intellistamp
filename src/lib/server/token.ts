import crypto from 'crypto'

export function generateServerToken(businessId: string): string {
  const secret = process.env.QR_SECRET_KEY
  if (!secret) throw new Error('QR_SECRET_KEY is not configured')

  const issuedAt = Date.now()
  const expiresAt = issuedAt + 60000 // 60 seconds
  const nonce = crypto.randomBytes(8).toString('hex')
  const payload = `1:stamp:${businessId}:${issuedAt}:${expiresAt}:${nonce}`
  
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const signature = hmac.digest('hex').slice(0, 16)
  
  // Create a URL-safe base64 of the data to keep it compact
  const data = Buffer.from(payload).toString('base64url')
  return `${data}.${signature}`
}

export function validateServerToken(businessId: string, token: string): boolean {
  try {
    const secret = process.env.QR_SECRET_KEY
    if (!secret) {
      console.error('QR_SECRET_KEY is not configured')
      return false
    }

    const [dataB64, signature] = token.split('.')
    if (!dataB64 || !signature) return false

    const payload = Buffer.from(dataB64, 'base64url').toString('utf-8')
    const parts = payload.split(':')
    if (parts.length !== 6) return false
    
    const [version, purpose, tokenBizId, issuedAtStr, expiresAtStr, nonce] = parts
    
    // Explicit format checks
    if (version !== '1') return false
    if (purpose !== 'stamp') return false
    if (tokenBizId !== businessId) return false
    
    const issuedAt = parseInt(issuedAtStr, 10)
    const expiresAt = parseInt(expiresAtStr, 10)
    const now = Date.now()

    // Expiry checks
    if (isNaN(issuedAt) || isNaN(expiresAt)) return false
    if (expiresAt <= now) return false // Expired
    if (issuedAt > now + 5000) return false // Issued too far in the future
    if (expiresAt - issuedAt > 120000) return false // Expiry window longer than permitted max (2 mins)

    // Verify signature
    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload)
    const expectedSignature = hmac.digest('hex').slice(0, 16)
    
    // Constant time comparison
    return crypto.timingSafeEqual(
      Buffer.from(signature.padEnd(16, '0')),
      Buffer.from(expectedSignature.padEnd(16, '0'))
    )
  } catch (err) {
    return false
  }
}
