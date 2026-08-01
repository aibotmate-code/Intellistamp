import crypto from 'crypto'

export function generateServerToken(businessId: string): string {
  const secret = process.env.QR_SECRET_KEY
  if (!secret) throw new Error('QR_SECRET_KEY is not configured')

  const timestamp = Math.floor(Date.now() / 30000)
  // Short random nonce to ensure uniqueness even within the same window
  const nonce = crypto.randomBytes(4).toString('hex')
  const payload = `${businessId}:${timestamp}:${nonce}`
  
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
    const [tokenBizId, tokenTimestampStr, nonce] = payload.split(':')
    
    if (tokenBizId !== businessId) return false
    
    const tokenTimestamp = parseInt(tokenTimestampStr, 10)
    const currentWindow = Math.floor(Date.now() / 30000)

    // Allow current window and previous window (up to ~60s total validity)
    if (tokenTimestamp !== currentWindow && tokenTimestamp !== currentWindow - 1) {
      return false
    }

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
