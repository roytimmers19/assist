import { sql } from 'drizzle-orm'
import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { afterAll, beforeAll } from 'vitest'
import * as schema from '@/lib/db/schema'
import { laadOmgeving } from '@/lib/omgeving'

laadOmgeving()

const url = process.env.DATABASE_URL_TEST
if (!url) {
  throw new Error(
    'DATABASE_URL_TEST ontbreekt — start docker compose -f docker-compose.test.yml up -d',
  )
}

// Better Auth pakt zijn database uit DATABASE_URL, niet uit de testvariabele.
// Zonder deze regel zou een databasetest op een werkplek waar .env.local naar
// productie wijst daar zomaar rijen aanmaken.
process.env.DATABASE_URL = url
process.env.BETTER_AUTH_SECRET ??= 'geheim-voor-de-tests'
process.env.BETTER_AUTH_URL ??= 'http://localhost:3000'

const client = postgres(url, { max: 1 })
export const testDb = drizzle(client, { schema })

beforeAll(async () => {
  await migrate(testDb, { migrationsFolder: './drizzle' })
})

afterAll(async () => {
  await client.end()
})

/** Leegt alle tabellen die per test schoon moeten zijn. */
export async function maakSchoon() {
  await testDb.execute(
    sql`truncate table dienst, opstelling_plek, opstelling, aanwezigheid, afwezigheid, import_run, uitnodiging, event, speler restart identity cascade`,
  )
}
