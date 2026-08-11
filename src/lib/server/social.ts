import { BusinessSocialLinks, PublicSocialLinks } from '@/types'

export const ALLOWED_INSTAGRAM_HOSTS = ['instagram.com', 'www.instagram.com']
export const ALLOWED_FACEBOOK_HOSTS = ['facebook.com', 'www.facebook.com', 'fb.com', 'www.fb.com']
export const ALLOWED_YOUTUBE_HOSTS = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com']
export const ALLOWED_X_HOSTS = ['x.com', 'www.x.com', 'twitter.com', 'www.twitter.com']
export const ALLOWED_GOOGLE_HOSTS = ['g.page', 'goo.gl', 'maps.app.goo.gl', 'google.com', 'www.google.com', 'search.google.com']

export function validateSocialUrl(url: string | null | undefined, allowedHosts: string[]): string | null {
  if (!url) return null
  
  try {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:') return null
    if (parsed.username || parsed.password) return null
    if (url.length > 500) return null // sensible length

    const hostname = parsed.hostname.toLowerCase()
    
    // Strict exact host checking. No suffix attacks.
    if (!allowedHosts.includes(hostname)) {
      return null
    }

    return parsed.toString()
  } catch (e) {
    return null
  }
}

export function validateWhatsAppNumber(numberStr: string | null | undefined): string | null {
  if (!numberStr) return null
  const digits = numberStr.replace(/\D/g, '')
  if (digits.length >= 10 && digits.length <= 15) {
    return digits
  }
  return null
}

export function buildWhatsAppUrl(number: string | null | undefined, message: string | null | undefined): string | null {
  if (!number) return null
  const url = new URL(`https://wa.me/${number}`)
  if (message && message.trim().length > 0) {
    url.searchParams.set('text', message.trim().substring(0, 200))
  }
  return url.toString()
}

export function mapPublicSocialLinks(links?: BusinessSocialLinks | null): PublicSocialLinks | null {
  if (!links) return null
  
  const google = validateSocialUrl(links.google_review_url, ALLOWED_GOOGLE_HOSTS)
  const instagram = validateSocialUrl(links.instagram_url, ALLOWED_INSTAGRAM_HOSTS)
  const facebook = validateSocialUrl(links.facebook_url, ALLOWED_FACEBOOK_HOSTS)
  const youtube = validateSocialUrl(links.youtube_url, ALLOWED_YOUTUBE_HOSTS)
  const x = validateSocialUrl(links.x_url, ALLOWED_X_HOSTS)
  
  const whatsappNum = validateWhatsAppNumber(links.whatsapp_number)
  const whatsappUrl = buildWhatsAppUrl(whatsappNum, links.whatsapp_message)

  // If no links are configured, return null to save payload size and avoid rendering empty state
  if (!google && !instagram && !facebook && !youtube && !x && !whatsappUrl) {
    return null
  }

  return {
    google_review_url: google,
    instagram_url: instagram,
    facebook_url: facebook,
    youtube_url: youtube,
    x_url: x,
    whatsapp_url: whatsappUrl
  }
}
