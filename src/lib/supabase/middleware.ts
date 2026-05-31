import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function updateSession(_request: NextRequest) {
  return NextResponse.next()
}
