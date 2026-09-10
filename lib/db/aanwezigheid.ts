import { and, asc, desc, eq, gte, inArray } from 'drizzle-orm'
import type { Melding, Status } from '@/lib/domein/types'
import type { Db } from './client'
import { aanwezigheid, events } from './schema'

export type EventRij = typeof events.$inferSelect

export async function leesKomendeEvents(db: Db, vanaf: Date, aantal: number): Promise<EventRij[]> {
  return db
    .select()
    .from(events)
    .where(and(gte(events.startOp, vanaf), eq(events.status, 'gepland')))
    .orderBy(asc(events.startOp))
    .limit(aantal)
}

export async function leesMeldingen(db: Db, eventIds: string[]): Promise<Map<string, Melding[]>> {
  const uit = new Map<string, Melding[]>()
  if (eventIds.length === 0) return uit

  const rijen = await db
    .select()
    .from(aanwezigheid)
    .where(inArray(aanwezigheid.eventId, eventIds))
    .orderBy(asc(aanwezigheid.gezetOp))

  for (const rij of rijen) {
    const lijst = uit.get(rij.eventId) ?? []
    lijst.push({
      spelerId: rij.spelerId,
      status: rij.status,
      bron: rij.bron,
      toelichting: rij.toelichting,
      gezetOp: rij.gezetOp,
    })
    uit.set(rij.eventId, lijst)
  }
  return uit
}

export type ZetInvoer = {
  eventId: string
  spelerId: string
  status: Status
  bron: 'speler' | 'leider'
  toelichting: string | null
  gezetDoorSpelerId: string
}

/**
 * Voegt een melding toe. Append-only: er wordt nooit een rij gewijzigd.
 * Een klik die niets verandert levert ook geen rij op, zodat dubbelklikken
 * de historie niet vervuilt.
 */
export async function zetAanwezigheid(db: Db, invoer: ZetInvoer): Promise<void> {
  const [laatste] = await db
    .select()
    .from(aanwezigheid)
    .where(and(eq(aanwezigheid.eventId, invoer.eventId), eq(aanwezigheid.spelerId, invoer.spelerId)))
    .orderBy(desc(aanwezigheid.gezetOp))
    .limit(1)

  if (
    laatste &&
    laatste.status === invoer.status &&
    laatste.bron === invoer.bron &&
    (laatste.toelichting ?? null) === invoer.toelichting
  ) {
    return
  }

  await db.insert(aanwezigheid).values({
    eventId: invoer.eventId,
    spelerId: invoer.spelerId,
    status: invoer.status,
    bron: invoer.bron,
    toelichting: invoer.toelichting,
    gezetDoorSpelerId: invoer.gezetDoorSpelerId,
  })
}

/**
 * Alles wat nog komt: zonder bovengrens en **inclusief afgelaste events**.
 * Het roosterscherm vult een heel seizoen in één zitting, dus een limiet zou
 * stilletjes events afkappen — en het rooster blijft ook bij een afgelaste
 * wedstrijd aanpasbaar, dus die hoort erbij.
 *
 * Bewust naast leesKomendeEvents en niet in de plaats ervan: het scherm van
 * de speler wil afgelaste events juist níét zien.
 */
export async function leesKomendeAgenda(db: Db, vanaf: Date): Promise<EventRij[]> {
  return db.select().from(events).where(gte(events.startOp, vanaf)).orderBy(asc(events.startOp))
}
