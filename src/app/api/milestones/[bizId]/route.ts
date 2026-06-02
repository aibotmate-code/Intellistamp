import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bizId: string }> }
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const { bizId } = await params

    const { data, error } = await supabase
      .from('milestones')
      .select('*')
      .eq('business_id', bizId)
      .eq('is_active', true)
      .order('visit_number', { ascending: true })

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch milestones.' }, { status: 500 })
    }

    return NextResponse.json({ milestones: data ?? [] })
  } catch {
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
