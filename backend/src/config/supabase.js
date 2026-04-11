const { createClient } = require('@supabase/supabase-js');

// As chaves no formato sb_secret_* exigem o header global apikey
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: { persistSession: false },
    global: {
      headers: {
        apikey: process.env.SUPABASE_SERVICE_KEY,
      },
    },
  }
);

module.exports = supabase;
