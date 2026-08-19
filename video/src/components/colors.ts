// Design tokens mirroring the real IntelliStamp globals.css OKLCH palette.
// These are sRGB approximations suitable for video rendering.

export const C = {
  bg:           '#09090b',  // zinc-950 — page background
  surface:      '#18181b',  // zinc-900 — card / panel
  elevated:     '#27272a',  // zinc-800 — raised element inside card
  border:       '#3f3f46',  // zinc-700
  borderStrong: '#52525b',  // zinc-600

  text:         '#fafafa',  // zinc-50
  textMuted:    '#a1a1aa',  // zinc-400
  textDim:      '#52525b',  // zinc-600

  gold:         '#eab308',  // oklch(0.72 0.18 55) ≈ yellow-500
  goldBg:       '#1c1a09',
  goldBorder:   '#713f12',

  green:        '#4ade80',  // oklch(0.65 0.16 145) ≈ green-400
  greenBg:      '#052e16',

  purple:       '#a78bfa',  // oklch(0.65 0.16 280) ≈ violet-400
  purpleBg:     '#1e1b4b',

  red:          '#f87171',  // oklch(0.65 0.16 25) ≈ red-400
  white:        '#ffffff',
  black:        '#000000',
} as const
