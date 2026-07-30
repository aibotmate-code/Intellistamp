/**
 * Validation utilities for the Tenant Co-Branding system.
 * Secure, zero-dependency helpers.
 */

/**
 * Validates a color hex string to ensure it is exactly in the format #RRGGBB.
 */
export function isValidHexColor(color: string | null | undefined): boolean {
  if (!color) return false
  return /^#[0-9A-Fa-f]{6}$/.test(color)
}

interface ImageHeaderResult {
  mime: 'image/png' | 'image/jpeg' | 'image/webp'
  width: number
  height: number
}

/**
 * Validates magic bytes and parses the image dimensions for PNG, JPEG, and WebP buffers.
 * Throws an error if the image is corrupt, has an invalid signature, or has extreme/zero dimensions.
 */
export function parseAndValidateImage(buffer: Buffer): ImageHeaderResult {
  if (!buffer || buffer.length < 12) {
    throw new Error('File is too small to be a valid image')
  }

  // 1. Check PNG Signature: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4E &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0D &&
    buffer[5] === 0x0A &&
    buffer[6] === 0x1A &&
    buffer[7] === 0x0A
  ) {
    if (buffer.length < 24) {
      throw new Error('Corrupt or incomplete PNG header')
    }
    // PNG width is at offset 16 (4 bytes, big-endian)
    // PNG height is at offset 20 (4 bytes, big-endian)
    const width = buffer.readUInt32BE(16)
    const height = buffer.readUInt32BE(20)

    if (width === 0 || height === 0) {
      throw new Error('PNG has zero dimensions')
    }
    if (width > 10000 || height > 10000) {
      throw new Error('PNG dimensions are excessively large')
    }

    return { mime: 'image/png', width, height }
  }

  // 2. Check JPEG Signature: FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    let offset = 2
    while (offset < buffer.length) {
      if (buffer[offset] !== 0xFF) {
        throw new Error('Corrupt JPEG format: invalid marker')
      }
      const marker = buffer[offset + 1]
      // End of Image (EOI) or Start of Scan (SOS)
      if (marker === 0xD9 || marker === 0xDA) {
        break
      }
      
      // Ensure we can read length (2 bytes at offset + 2)
      if (offset + 3 >= buffer.length) {
        throw new Error('Corrupt JPEG format: segment length out of bounds')
      }
      const length = buffer.readUInt16BE(offset + 2)
      
      // Check for SOF0, SOF1, SOF2 markers
      if (marker >= 0xC0 && marker <= 0xC3) {
        if (offset + 8 >= buffer.length) {
          throw new Error('Corrupt JPEG format: SOF segment too short')
        }
        // SOF structure: precision (1 byte), height (2 bytes), width (2 bytes)
        const height = buffer.readUInt16BE(offset + 5)
        const width = buffer.readUInt16BE(offset + 7)

        if (width === 0 || height === 0) {
          throw new Error('JPEG has zero dimensions')
        }
        if (width > 10000 || height > 10000) {
          throw new Error('JPEG dimensions are excessively large')
        }

        return { mime: 'image/jpeg', width, height }
      }
      offset += 2 + length
    }
    throw new Error('Invalid JPEG image: missing SOF segment')
  }

  // 3. Check WebP Signature: 'RIFF' at 0, 'WEBP' at 8
  const isRiff = buffer.toString('ascii', 0, 4) === 'RIFF'
  const isWebp = buffer.toString('ascii', 8, 12) === 'WEBP'
  if (isRiff && isWebp) {
    const typeHeader = buffer.toString('ascii', 12, 16)
    if (typeHeader === 'VP8 ') {
      if (buffer.length < 30) {
        throw new Error('Corrupt WebP VP8 header')
      }
      // Simple VP8 dimensions start at offset 26
      const width = buffer.readUInt16LE(26) & 0x3FFF
      const height = buffer.readUInt16LE(28) & 0x3FFF

      if (width === 0 || height === 0) {
        throw new Error('WebP has zero dimensions')
      }

      return { mime: 'image/webp', width, height }
    } else if (typeHeader === 'VP8L') {
      if (buffer.length < 25) {
        throw new Error('Corrupt WebP VP8L header')
      }
      // VP8L dimensions are stored in 28 bits starting at offset 21
      const val = buffer.readUInt32LE(21)
      const width = (val & 0x3FFF) + 1
      const height = ((val >> 14) & 0x3FFF) + 1

      return { mime: 'image/webp', width, height }
    } else if (typeHeader === 'VP8X') {
      if (buffer.length < 30) {
        throw new Error('Corrupt WebP VP8X header')
      }
      // VP8X dimensions are 24-bit values starting at offset 24 and 27
      const width = (buffer.readUInt32LE(24) & 0xFFFFFF) + 1
      const height = (buffer.readUInt32LE(27) & 0xFFFFFF) + 1

      if (width > 10000 || height > 10000) {
        throw new Error('WebP dimensions are excessively large')
      }

      return { mime: 'image/webp', width, height }
    }
    throw new Error('Unsupported or corrupt WebP chunk type')
  }

  throw new Error('Unsupported file signature (Only PNG, JPEG, and WebP are allowed)')
}
