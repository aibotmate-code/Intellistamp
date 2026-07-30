export function getAppOrigin(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL

  if (envUrl) {
    try {
      const parsed = new URL(envUrl)
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        // Remove trailing slashes from the origin/href
        return `${parsed.protocol}//${parsed.host}`
      }
    } catch {
      // Invalid URL syntax, fall back safely
    }
  }

  // Fall back to window.location.origin in the browser
  if (typeof window !== 'undefined' && window.location) {
    try {
      const parsedBrowser = new URL(window.location.origin)
      if (parsedBrowser.protocol === 'http:' || parsedBrowser.protocol === 'https:') {
        return `${parsedBrowser.protocol}//${parsedBrowser.host}`
      }
    } catch {
      // If parsing fails for any reason, return standard origin without trailing slash
      return window.location.origin.replace(/\/+$/, '')
    }
  }

  return 'http://localhost:3000'
}
