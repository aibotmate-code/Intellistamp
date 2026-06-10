export function generateOTP(): string {
  if (process.env.NODE_ENV === 'development') {
    return '1234'
  }
  return Math.floor(1000 + Math.random() * 9000).toString()
}
