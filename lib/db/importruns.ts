import { desc } from 'drizzle-orm'
import type { Db } from './client'
import { importRuns } from './schema'

export type ImportRunGegevens = {
  status: 'ok' | 'fout' | 'afgebroken'
  gestartOp: Date
  aantalGelezen: number
  aantalNieuw: number
  aantalBijgewerkt: number
  aantalAfgelast: number
  aantalOvergeslagen: number
  melding: string | null
}

export async function schrijfImportRun(db: Db, gegevens: ImportRunGegevens) {
  await db.insert(importRuns).values({ ...gegevens, geeindigdOp: new Date() })
}

export async function leesLaatsteImportRun(db: Db) {
  const [rij] = await db.select().from(importRuns).orderBy(desc(importRuns.gestartOp)).limit(1)
  return rij ?? null
}
