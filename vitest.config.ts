import { defineConfig } from 'vitest/config'

// Pure simulation/scoring cores live in src/lib/sandbox and are unit-tested
// in a plain Node environment (no DOM). Canvas/audio/React shells are
// manually verified via `npm run build`.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/lib/sandbox/**/*.test.ts'],
  },
})
