import crypto from 'crypto'

export function generateAccessGrant(customerId: string, businessId: string): string {
  const secret = process.env.ACCESS_GRANT_SECRET
  if (!secret) throw new Error('ACCESS_GRANT_SECRET is not configured')

  const issuedAt = Date.now()
  const expiresAt = issuedAt + 5 * 60 * 1000 // 5 minutes
  const nonce = crypto.randomBytes(8).toString('hex')
  
  // 1:access:view_card:<customerId>:<businessId>:<issuedAt>:<expiresAt>:<nonce>
  const payload = `1:access:view_card:${customerId}:${businessId}:${issuedAt}:${expiresAt}:${nonce}`
  
  const hmac = crypto.createHmac('sha256', secret)
  hmac.update(payload)
  const signature = hmac.digest('hex').slice(0, 32)
  
  const data = Buffer.from(payload).toString('base64url')
  return `${data}.${signature}`
}

export function validateAccessGrant(token: string, businessId: string): string | null {
  try {
    const secret = process.env.ACCESS_GRANT_SECRET
    if (!secret) return null

    const [dataB64, signature] = token.split('.')
    if (!dataB64 || !signature) return null

    const payload = Buffer.from(dataB64, 'base64url').toString('utf-8')
    const parts = payload.split(':')
    if (parts.length !== 8) return null
    
    const [version, purpose, scope, customerId, tokenBizId, issuedAtStr, expiresAtStr, nonce] = parts
    
    if (version !== '1' || purpose !== 'access' || scope !== 'view_card' || tokenBizId !== businessId) return null
    
    // UUID basic format validation
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuidRegex.test(customerId) || !uuidRegex.test(businessId)) return null

    const issuedAt = parseInt(issuedAtStr, 10)
    const expiresAt = parseInt(expiresAtStr, 10)
    const now = Date.now()

    if (isNaN(issuedAt) || isNaN(expiresAt)) return null
    if (expiresAt <= now) return null
    if (issuedAt > now + 5000) return null // allow 5s clock skew
    if (expiresAt - issuedAt > 300000) return null // max 5 mins

    const hmac = crypto.createHmac('sha256', secret)
    hmac.update(payload)
    const expectedSignature = hmac.digest('hex').slice(0, 32)
    
    if (crypto.timingSafeEqual(
      Buffer.from(signature.padEnd(32, '0')),
      Buffer.from(expectedSignature.padEnd(32, '0'))
    )) {
      return customerId
    }
    return null
  } catch {
    return null
  }
}
