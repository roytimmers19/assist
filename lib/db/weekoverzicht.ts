import { and, asc, gte, lt } from 'drizzle-orm'
import type { EventRij } from './aanwezigheid'
import type { Db } from './client'
import { events } from './schema'

/** Afgelaste events blijven zichtbaar: de leider moet ze juist zien. */
export async function leesEventsInWeek(db: Db, van: Date, tot: Date): Promise<EventRij[]> {
  return db
    .select()
    .from(events)
    .where(and(gte(events.startOp, van), lt(events.startOp, tot)))
    .orderBy(asc(events.startOp))
}
