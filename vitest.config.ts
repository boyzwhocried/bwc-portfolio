import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

// Pure cores (sandbox sims, the music obsession engine) live under src/lib
// and are unit-tested in a plain Node environment (no DOM). Canvas/audio/React
// shells are manually verified via `npm run build`. The verse bank curator's
// pure line-picker lives in scripts/verse (node-runnable .mjs) and is tested too.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lib/**/*.test.ts', 'scripts/verse/**/*.test.mjs', 'supabase/functions/_shared/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
})
