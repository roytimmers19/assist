import { and, asc, eq } from 'drizzle-orm'
import type { Db } from './client'
import { spelers } from './schema'

export type SpelerRij = typeof spelers.$inferSelect

export async function zoekSpelerBijGebruiker(db: Db, gebruikerId: string): Promise<SpelerRij | null> {
  const [rij] = await db.select().from(spelers).where(eq(spelers.gebruikerId, gebruikerId))
  return rij ?? null
}

export async function leesSpeler(db: Db, id: string): Promise<SpelerRij | null> {
  const [rij] = await db.select().from(spelers).where(eq(spelers.id, id))
  return rij ?? null
}

/** Wie er dit seizoen meespeelt: goedgekeurd én actief. */
export async function leesActieveSpelers(db: Db): Promise<SpelerRij[]> {
  return db
    .select()
    .from(spelers)
    .where(and(eq(spelers.actief, true), eq(spelers.accountStatus, 'actief')))
    .orderBy(asc(spelers.naam))
}

export async function leesAlleSpelers(db: Db): Promise<SpelerRij[]> {
  return db.select().from(spelers).orderBy(asc(spelers.naam))
}

export type NieuweSpeler = {
  naam: string
  email: string
  rugnummer?: number | null
  positie?: 'keeper' | 'verdediger' | 'middenvelder' | 'aanvaller' | null
  telefoon?: string | null
}

export async function maakSpeler(db: Db, invoer: NieuweSpeler): Promise<SpelerRij> {
  const [rij] = await db
    .insert(spelers)
    .values({
      naam: invoer.naam,
      email: invoer.email,
      rugnummer: invoer.rugnummer ?? null,
      positie: invoer.positie ?? null,
      telefoon: invoer.telefoon ?? null,
      rol: 'speler',
      accountStatus: 'uitgenodigd',
      actief: true,
    })
    .returning()
  return rij
}

/**
 * Wie dit rugnummer bezet houdt, of niets. Alleen actieve spelers tellen: wie
 * eruit ligt blokkeert geen nummer meer, terwijl zijn rij blijft bestaan omdat
 * de historie eraan hangt.
 */
export async function zoekSpelerOpRugnummer(db: Db, rugnummer: number): Promise<SpelerRij | null> {
  const [rij] = await db
    .select()
    .from(spelers)
    .where(and(eq(spelers.rugnummer, rugnummer), eq(spelers.actief, true)))
  return rij ?? null
}

export async function wijzigSpeler(
  db: Db,
  id: string,
  velden: Partial<
    Pick<
      SpelerRij,
      | 'naam'
      | 'weergavenaam'
      | 'rugnummer'
      | 'positie'
      | 'telefoon'
      | 'rol'
      | 'doetTrainingen'
      | 'doetWedstrijden'
    >
  >,
): Promise<void> {
  await db.update(spelers).set(velden).where(eq(spelers.id, id))
}

export async function zetActief(db: Db, id: string, actief: boolean): Promise<void> {
  await db.update(spelers).set({ actief }).where(eq(spelers.id, id))
}
