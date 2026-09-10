import { drizzle } from 'drizzle-orm/postgres-js'
import { migrate } from 'drizzle-orm/postgres-js/migrator'
import postgres from 'postgres'
import { laadOmgeving } from '../lib/omgeving'

laadOmgeving()

/**
 * Migraties gaan over de directe verbinding, nooit over de pooler. PgBouncer
 * draait in transaction mode en ondersteunt geen sessie-toestand; dat gaat mis
 * met een foutmelding die niets over pooling zegt.
 */
const url = process.argv[2] ?? process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL
if (!url) throw new Error('Geef een verbindingsreeks mee of zet DATABASE_URL')

if (url.includes('-pooler.')) {
  throw new Error(
    'Dit is de gepoolde verbinding. Migreer over DATABASE_URL_UNPOOLED (hostnaam zonder -pooler).',
  )
}

const client = postgres(url, { max: 1 })
await migrate(drizzle(client), { migrationsFolder: './drizzle' })
await client.end()
console.log('Migraties uitgevoerd.')
