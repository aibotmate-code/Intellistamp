import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ukbsbtlsjrotwnbephbh.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseKey) {
  console.error("No supabase key found")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log("Looking up business 'intellistamp-staging-demo'...")
  const { data: business, error: bizError } = await supabase
    .from('businesses')
    .select('*')
    .eq('slug', 'intellistamp-staging-demo')
    .single()

  if (bizError) {
    console.error("Error finding business:", bizError)
    process.exit(1)
  }
  
  console.log("Business ID:", business.id)
  
  // Find or create synthetic customer
  const syntheticPhone = '+447000000001'
  let { data: customer, error: custError } = await supabase
    .from('customers')
    .select('*')
    .eq('business_id', business.id)
    .eq('phone', syntheticPhone)
    .single()
    
  if (!customer) {
    console.log("Creating synthetic customer...")
    const res = await supabase
      .from('customers')
      .insert({
        business_id: business.id,
        phone: syntheticPhone,
        name: 'Synthetic Test User',
        stamps_collected: 0,
        cards_redeemed: 0
      })
      .select()
      .single()
      
    if (res.error) {
      console.error("Error creating customer:", res.error)
      process.exit(1)
    }
    customer = res.data
  }
  
  console.log("Customer state:")
  console.log("ID:", customer.id)
  console.log("Phone:", customer.phone)
  console.log("Stamps:", customer.stamps_collected)
  console.log("Rewards:", customer.cards_redeemed)
  console.log("Token:", customer.customer_token)
}

run().catch(console.error)
