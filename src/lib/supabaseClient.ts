import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/database';

/*
 * Aceita tanto o ambiente do Vite (variáveis VITE_*, expostas ao browser)
 * quanto Node (testes e scripts), sem depender dos tipos de vite/client.
 */
type EnvSource = Record<string, string | undefined>;

const viteEnv: EnvSource = (import.meta as unknown as { env?: EnvSource }).env ?? {};
const nodeEnv: EnvSource = typeof process !== 'undefined' ? process.env : {};

const supabaseUrl = viteEnv.VITE_SUPABASE_URL ?? nodeEnv.SUPABASE_URL;
const supabaseAnonKey = viteEnv.VITE_SUPABASE_ANON_KEY ?? nodeEnv.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (ou SUPABASE_URL e SUPABASE_ANON_KEY no Node) — veja .env.example.'
  );
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);
