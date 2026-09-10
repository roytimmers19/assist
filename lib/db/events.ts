import { eq, inArray } from 'drizzle-orm'
import { berekenDeadline } from '@/lib/domein/deadline'
import type { BestaandEvent, ImportPlan } from '@/lib/domein/types'
import type { Db } from './client'
import type { DeadlineUren } from './instellingen'
import { events } from './schema'

export async function laadEventsVoorImport(db: Db): Promise<BestaandEvent[]> {
  return db
    .select({
      id: events.id,
      icalUid: events.icalUid,
      type: events.type,
      startOp: events.startOp,
      status: events.status,
    })
    .from(events)
}

/** Voert het hele plan uit of niets. Eén transactie, geen halve import. */
export async function voerImportPlanUit(
  db: Db,
  plan: ImportPlan,
  deadlineUren: DeadlineUren,
  nu: Date,
): Promise<void> {
  await db.transaction(async (tx) => {
    for (const nieuw of plan.nieuw) {
      await tx.insert(events).values({
        type: nieuw.type,
        startOp: nieuw.startOp,
        eindOp: nieuw.eindOp,
        locatie: nieuw.locatie,
        tegenstander: nieuw.tegenstander,
        thuis: nieuw.thuis,
        icalUid: nieuw.icalUid,
        bron: 'ics',
        status: 'gepland',
        afmeldDeadline: berekenDeadline(nieuw.startOp, deadlineUren[nieuw.type]),
        laatstGezienInFeedOp: nu,
      })
    }

    for (const { id, event } of plan.bijwerken) {
      await tx
        .update(events)
        .set({
          type: event.type,
          startOp: event.startOp,
          eindOp: event.eindOp,
          locatie: event.locatie,
          tegenstander: event.tegenstander,
          thuis: event.thuis,
          icalUid: event.icalUid,
          status: 'gepland',
          afmeldDeadline: berekenDeadline(event.startOp, deadlineUren[event.type]),
          laatstGezienInFeedOp: nu,
        })
        .where(eq(events.id, id))
    }

    if (plan.afgelasten.length > 0) {
      await tx
        .update(events)
        .set({ status: 'afgelast' })
        .where(
          inArray(
            events.id,
            plan.afgelasten.map((a) => a.id),
          ),
        )
    }
  })
}
