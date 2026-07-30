/* eslint-disable @typescript-eslint/no-explicit-any */
import { getAppOrigin } from '../origin'

describe('getAppOrigin', () => {
  const originalEnv = process.env.NEXT_PUBLIC_APP_URL
  const originalWindow = (global as any).window

  beforeEach(() => {
    jest.resetModules()
    delete process.env.NEXT_PUBLIC_APP_URL
    delete (global as any).window
  })

  afterAll(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalEnv
    ;(global as any).window = originalWindow
  })

  test('uses NEXT_PUBLIC_APP_URL when set to a valid HTTP URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://192.168.1.100:3000'
    expect(getAppOrigin()).toBe('http://192.168.1.100:3000')
  })

  test('uses NEXT_PUBLIC_APP_URL when set to a valid HTTPS URL', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://intellistamp.dev'
    expect(getAppOrigin()).toBe('https://intellistamp.dev')
  })

  test('normalizes NEXT_PUBLIC_APP_URL trailing slashes', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'https://intellistamp.dev///'
    expect(getAppOrigin()).toBe('https://intellistamp.dev')
  })

  test('ignores NEXT_PUBLIC_APP_URL if protocol is invalid (e.g. ftp: or custom:) and falls back', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'ftp://192.168.1.100'
    expect(getAppOrigin()).toBe('http://localhost:3000')
  })

  test('ignores NEXT_PUBLIC_APP_URL if URL is malformed and falls back', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'not-a-valid-url'
    expect(getAppOrigin()).toBe('http://localhost:3000')
  })

  test('falls back to window.location.origin when NEXT_PUBLIC_APP_URL is not set', () => {
    ;(global as any).window = {
      location: {
        origin: 'https://browser-location.local/'
      }
    }
    expect(getAppOrigin()).toBe('https://browser-location.local')
  })

  test('falls back to window.location.origin when NEXT_PUBLIC_APP_URL is invalid', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'malformed-url'
    ;(global as any).window = {
      location: {
        origin: 'http://192.168.29.203:3000'
      }
    }
    expect(getAppOrigin()).toBe('http://192.168.29.203:3000')
  })

  test('defaults to localhost:3000 when both are unavailable', () => {
    expect(getAppOrigin()).toBe('http://localhost:3000')
  })
})
