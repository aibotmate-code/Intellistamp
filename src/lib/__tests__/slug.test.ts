import { generateSlug } from '../utils'

describe('generateSlug', () => {
  test('simple name: "Cafe Mocha" → "cafe-mocha"', () => {
    expect(generateSlug('Cafe Mocha')).toBe('cafe-mocha')
  })

  test('special chars: "Meow & Meow!" → "meow-meow"', () => {
    expect(generateSlug('Meow & Meow!')).toBe('meow-meow')
  })

  test('extra spaces: "Blue  Bluee" → "blue-bluee"', () => {
    expect(generateSlug('Blue  Bluee')).toBe('blue-bluee')
  })

  test('numbers: "Cafe 99" → "cafe-99"', () => {
    expect(generateSlug('Cafe 99')).toBe('cafe-99')
  })

  test('Hindi chars stripped: "Café राज" → "caf"', () => {
    expect(generateSlug('Café राज')).toBe('caf')
  })

  test('already lowercase: "salon" → "salon"', () => {
    expect(generateSlug('salon')).toBe('salon')
  })

  test('multiple hyphens collapsed: "a--b" → "a-b"', () => {
    expect(generateSlug('a--b')).toBe('a-b')
  })

  test('leading/trailing hyphens stripped', () => {
    expect(generateSlug('---test---')).toBe('test')
    expect(generateSlug('-hello-')).toBe('hello')
  })

  test('empty string returns empty string', () => {
    expect(generateSlug('')).toBe('')
  })

  test('only special chars returns empty string', () => {
    expect(generateSlug('!!!')).toBe('')
    expect(generateSlug('###')).toBe('')
  })
})
