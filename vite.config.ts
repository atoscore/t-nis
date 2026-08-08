import react from '@vitejs/plugin-react';
import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    // supabase/functions roda em Deno (Deno.test, imports https://), não Node —
    // tem sua própria suíte, rodada via `deno test` (ver README das functions).
    exclude: [...configDefaults.exclude, 'supabase/functions/**'],
  },
});
