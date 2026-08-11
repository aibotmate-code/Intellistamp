module.paths.push('c:/Users/XRIG/OneDrive/Desktop/Intellistamp/node_modules');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envContent = fs.readFileSync('c:/Users/XRIG/OneDrive/Desktop/Intellistamp/.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim().replace(/(^['"]|['"]$)/g, '');
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !anonKey || !serviceKey) {
  console.error("Missing environment variables in .env.local");
  process.exit(1);
}

const supabaseService = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
const supabaseAnon = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });

async function run() {
  console.log("=== Verifying business_social_links table ===");

  // 1. Check table existence
  const { data, error } = await supabaseService.from('business_social_links').select('*').limit(1);
  if (error && error.code === 'PGRST205') {
    console.error("✗ Table business_social_links does not exist! Migration has not been applied.");
    return;
  } else if (error) {
    console.error("✗ Error querying table:", error);
    return;
  } else {
    console.log("✓ Table exists.");
  }

  // 2. Test RLS lockdown
  const { data: anonData, error: anonError } = await supabaseAnon.from('business_social_links').select('*').limit(1);
  if (anonError) {
    console.log("✓ Anonymous read blocked successfully (Error: " + anonError.message + ")");
  } else if (anonData && anonData.length > 0) {
    console.error("✗ Anonymous read FAILED: Allowed direct public select!");
  } else {
    console.log("✓ Anonymous read returned empty (blocked by RLS).");
  }
}

run().catch(console.error);
