const { createClient } = require('@supabase/supabase-js');

// Centraliza a conexão com o Supabase para que os controladores usem a mesma instância.
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('SUPABASE_URL e SUPABASE_KEY devem ser definidos nas variáveis de ambiente.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

module.exports = supabase;