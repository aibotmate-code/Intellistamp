import { isValidHexColor, parseAndValidateImage } from '../validation'

describe('isValidHexColor', () => {
  test('valid 6-character hex colors pass', () => {
    expect(isValidHexColor('#FFFFFF')).toBe(true)
    expect(isValidHexColor('#000000')).toBe(true)
    expect(isValidHexColor('#aBcDeF')).toBe(true)
    expect(isValidHexColor('#123456')).toBe(true)
  })

  test('invalid formats fail', () => {
    expect(isValidHexColor(null)).toBe(false)
    expect(isValidHexColor(undefined)).toBe(false)
    expect(isValidHexColor('')).toBe(false)
    expect(isValidHexColor('FFFFFF')).toBe(false)
    expect(isValidHexColor('#FFF')).toBe(false)
    expect(isValidHexColor('#GGGGGG')).toBe(false)
    expect(isValidHexColor('#1234567')).toBe(false)
    expect(isValidHexColor('#12345')).toBe(false)
  })
})

describe('parseAndValidateImage', () => {
  test('valid PNG header parses successfully', () => {
    const pngHeader = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
      0x00, 0x00, 0x00, 0x0D, // IHDR chunk length
      0x49, 0x48, 0x44, 0x52, // IHDR header
      0x00, 0x00, 0x00, 0x64, // width = 100
      0x00, 0x00, 0x00, 0x64, // height = 100
      0x08, 0x02, 0x00, 0x00, 0x00 // other fields
    ])
    const res = parseAndValidateImage(pngHeader)
    expect(res.mime).toBe('image/png')
    expect(res.width).toBe(100)
    expect(res.height).toBe(100)
  })

  test('valid JPEG header parses successfully', () => {
    const jpegHeader = Buffer.from([
      0xFF, 0xD8, 0xFF, // signature and SOI marker
      0xC0, // SOF0 marker
      0x00, 0x0B, // segment length = 11
      0x08, // precision = 8
      0x00, 0x64, // height = 100
      0x00, 0x64, // width = 100
      0x03, // number of components
      0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01
    ])
    const res = parseAndValidateImage(jpegHeader)
    expect(res.mime).toBe('image/jpeg')
    expect(res.width).toBe(100)
    expect(res.height).toBe(100)
  })

  test('valid WebP VP8X header parses successfully', () => {
    const webpHeader = Buffer.alloc(32)
    webpHeader.write('RIFF', 0, 'ascii')
    webpHeader.write('WEBP', 8, 'ascii')
    webpHeader.write('VP8X', 12, 'ascii')
    webpHeader.writeUInt32LE(99, 24) // width - 1 = 99 -> width = 100
    webpHeader.writeUInt32LE(99, 27) // height - 1 = 99 -> height = 100

    const res = parseAndValidateImage(webpHeader)
    expect(res.mime).toBe('image/webp')
    expect(res.width).toBe(100)
    expect(res.height).toBe(100)
  })

  test('throws for corrupt or extremely small buffer', () => {
    expect(() => parseAndValidateImage(Buffer.from([0, 1, 2]))).toThrow('File is too small')
  })

  test('throws for unsupported file signatures', () => {
    const badHeader = Buffer.alloc(20)
    badHeader.write('GIF89a', 0, 'ascii')
    expect(() => parseAndValidateImage(badHeader)).toThrow('Unsupported file signature')
  })

  test('throws for PNG with zero dimensions', () => {
    const badPng = Buffer.from([
      0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
      0x00, 0x00, 0x00, 0x0D,
      0x49, 0x48, 0x44, 0x52,
      0x00, 0x00, 0x00, 0x00, // width = 0
      0x00, 0x00, 0x00, 0x00, // height = 0
      0x08, 0x02, 0x00, 0x00, 0x00
    ])
    expect(() => parseAndValidateImage(badPng)).toThrow('zero dimensions')
  })
})
