import { and, eq, inArray } from 'drizzle-orm'
import { type Dienstsoort, type Toewijzing, magRijdienst } from '@/lib/domein/diensten'
import type { EventRij } from './aanwezigheid'
import type { Db } from './client'
import { diensten } from './schema'

export type DienstRij = typeof diensten.$inferSelect

export async function leesDiensten(db: Db, eventIds: string[]): Promise<Map<string, DienstRij[]>> {
  const uit = new Map<string, DienstRij[]>()
  if (eventIds.length === 0) return uit

  const rijen = await db.select().from(diensten).where(inArray(diensten.eventId, eventIds))
  for (const rij of rijen) {
    const lijst = uit.get(rij.eventId) ?? []
    lijst.push(rij)
    uit.set(rij.eventId, lijst)
  }
  return uit
}

/** Twee keer dezelfde naam aantikken is geen fout, alleen niets nieuws. */
export async function wijsDienstToe(
  db: Db,
  invoer: { eventId: string; spelerId: string; soort: Dienstsoort; toegewezenDoor: string },
): Promise<void> {
  await db.insert(diensten).values(invoer).onConflictDoNothing()
}

export async function haalDienstWeg(
  db: Db,
  invoer: { eventId: string; spelerId: string; soort: Dienstsoort },
): Promise<void> {
  await db
    .delete(diensten)
    .where(
      and(
        eq(diensten.eventId, invoer.eventId),
        eq(diensten.spelerId, invoer.spelerId),
        eq(diensten.soort, invoer.soort),
      ),
    )
}

/** Het resultaat van het verdelen of van het seizoensrooster, in één keer
 *  weggeschreven. `toegewezenDoor` is leeg als het van papier komt. */
export async function bewaarToewijzingen(
  db: Db,
  toewijzingen: Toewijzing[],
  toegewezenDoor: string | null,
): Promise<number> {
  if (toewijzingen.length === 0) return 0

  const rijen = await db
    .insert(diensten)
    .values(toewijzingen.map((t) => ({ ...t, toegewezenDoor })))
    .onConflictDoNothing()
    .returning({ id: diensten.id })

  return rijen.length
}

/**
 * De enige regel die niet in de database past: hij heeft de eventrij ernaast
 * nodig. Als check-constraint zou dit een trigger worden en dat is zwaarder dan
 * het probleem, dus staat hij hier — één plek, en testbaar zonder sessie.
 *
 * Een afgelast event wordt bewust níét geweigerd: het rooster blijft altijd
 * aanpasbaar.
 */
export function controleerDienst(event: EventRij, soort: Dienstsoort): void {
  const dienstEvent = {
    id: event.id,
    type: event.type,
    thuis: event.thuis,
    afgelast: event.status === 'afgelast',
  }
  if (soort === 'rijden' && !magRijdienst(dienstEvent)) {
    throw new Error('Bij een thuiswedstrijd rijdt niemand ergens heen.')
  }
}
