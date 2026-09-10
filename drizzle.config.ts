import { defineConfig } from 'drizzle-kit'
import { laadOmgeving } from './lib/omgeving'

laadOmgeving()

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  // Direct, niet gepoold: drizzle-kit doet schemawerk en dat verdraagt geen
  // PgBouncer in transaction mode.
  dbCredentials: {
    url:
      process.env.DATABASE_URL_UNPOOLED ??
      process.env.DATABASE_URL ??
      process.env.DATABASE_URL_TEST ??
      '',
  },
})
