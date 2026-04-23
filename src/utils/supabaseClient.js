
import { createClient } from '@supabase/supabase-js';

// Certifique-se de que essas variáveis de ambiente estejam definidas no seu .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
