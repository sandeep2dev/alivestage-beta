const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.warn('[supabase] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — server DB calls will fail');
}

const supabase = createClient(supabaseUrl || 'http://localhost', serviceRoleKey || 'missing', {
  auth: { autoRefreshToken: false, persistSession: false },
});

module.exports = { supabase };
