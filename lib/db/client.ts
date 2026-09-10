import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schema'

/**
 * Eén driver voor zowel Neon als de lokale testdatabase. De HTTP-driver van
 * Neon valt af: die kan geen transactie met meerdere statements, en de
 * agenda-import moet er juist één zijn.
 */
export function maakDb(verbindingsreeks: string) {
  const client = postgres(verbindingsreeks, { max: 5 })
  return drizzle(client, { schema })
}

export type Db = ReturnType<typeof maakDb>

let gedeeld: Db | null = null

export function db(): Db {
  if (!gedeeld) {
    const url = process.env.DATABASE_URL
    if (!url) throw new Error('DATABASE_URL ontbreekt')
    gedeeld = maakDb(url)
  }
  return gedeeld
}
