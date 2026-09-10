import { eq, inArray } from 'drizzle-orm'
import { actueleStand } from '@/lib/domein/aanwezigheid'
import { selectieVoor } from '@/lib/domein/afwezigheid'
import { doetMee, standaardVoor } from '@/lib/domein/beschikbaarheid'
import {
  type OpgesteldePlek,
  type Opstellingweergave,
  kandidatenVoor,
  maakOpstellingWeergave,
} from '@/lib/domein/opstelling'
import type { Stand } from '@/lib/domein/types'
import { leesAfwezighedenTussen } from './afwezigheid'
import { leesMeldingen } from './aanwezigheid'
import type { Db } from './client'
import { events, opstellingPlekken, opstellingen } from './schema'
import { type SpelerRij, leesActieveSpelers, leesAlleSpelers } from './spelers'

export type OpstellingRij = typeof opstellingen.$inferSelect
export type PlekRij = typeof opstellingPlekken.$inferSelect
export type VolledigeOpstelling = { opstelling: OpstellingRij; plekken: PlekRij[] }

export type PlekInvoer = {
  slot: number | null
  spelerId?: string | null
  gastnaam?: string | null
  gastnummer?: number | null
}

export async function leesOpstelling(db: Db, eventId: string): Promise<VolledigeOpstelling | null> {
  const [opstelling] = await db.select().from(opstellingen).where(eq(opstellingen.eventId, eventId))
  if (!opstelling) return null

  const plekken = await db
    .select()
    .from(opstellingPlekken)
    .where(eq(opstellingPlekken.opstellingId, opstelling.id))

  return { opstelling, plekken }
}

/** Alleen de status, voor de kaartjes in het weekoverzicht. */
export async function leesOpstellingStatussen(
  db: Db,
  eventIds: string[],
): Promise<Map<string, 'concept' | 'gepubliceerd'>> {
  const uit = new Map<string, 'concept' | 'gepubliceerd'>()
  if (eventIds.length === 0) return uit

  const rijen = await db
    .select({ eventId: opstellingen.eventId, status: opstellingen.status })
    .from(opstellingen)
    .where(inArray(opstellingen.eventId, eventIds))

  for (const rij of rijen) uit.set(rij.eventId, rij.status)
  return uit
}

/**
 * Vervangt de hele opstelling in één transactie. Geen deelwijzigingen: de
 * leider levert het complete elftal aan en dat overschrijft wat er stond.
 * Wie het laatst publiceert wint — bewust, zie paragraaf 9 van het ontwerp.
 */
export async function bewaarOpstelling(
  db: Db,
  invoer: { eventId: string; formatie: string; plekken: PlekInvoer[]; publiceren: boolean },
): Promise<void> {
  await db.transaction(async (tx) => {
    const nu = new Date()

    const [opstelling] = await tx
      .insert(opstellingen)
      .values({
        eventId: invoer.eventId,
        formatie: invoer.formatie,
        status: invoer.publiceren ? 'gepubliceerd' : 'concept',
        gepubliceerdOp: invoer.publiceren ? nu : null,
        bijgewerktOp: nu,
      })
      .onConflictDoUpdate({
        target: opstellingen.eventId,
        set: {
          formatie: invoer.formatie,
          status: invoer.publiceren ? 'gepubliceerd' : 'concept',
          gepubliceerdOp: invoer.publiceren ? nu : null,
          bijgewerktOp: nu,
        },
      })
      .returning()

    await tx.delete(opstellingPlekken).where(eq(opstellingPlekken.opstellingId, opstelling.id))

    if (invoer.plekken.length > 0) {
      await tx.insert(opstellingPlekken).values(
        invoer.plekken.map((plek) => ({
          opstellingId: opstelling.id,
          slot: plek.slot,
          spelerId: plek.spelerId ?? null,
          gastnaam: plek.gastnaam ?? null,
          gastnummer: plek.gastnummer ?? null,
        })),
      )
    }
  })
}

export type OpstellingMetNamen = {
  /** Leeg als er voor dit event nog niets is klaargezet. */
  opstelling: OpstellingRij | null
  plekken: OpgesteldePlek[]
  weergave: Opstellingweergave
  /** Voor het bewerkscherm: wie komt er en wie niet, en waaruit te kiezen valt. */
  stand: Stand[]
  /**
   * Wie het bouwscherm mag aanbieden. Bewust niet 'actieve': wie dit soort
   * event structureel niet doet valt eruit, tenzij hij zich tóch heeft
   * aangemeld of al opgesteld staat. Zie `kandidatenVoor`.
   */
  kandidaten: SpelerRij[]
}

/**
 * De opstelling zoals hij getoond wordt: plekken, namen, rugnummers, bank en
 * waarschuwingen in één keer. Het spelersscherm, het leidersscherm en de
 * deelplaat lezen hier alle drie uit, zodat ze niet uit de pas kunnen lopen.
 */
export async function leesOpstellingWeergave(
  db: Db,
  eventId: string,
): Promise<OpstellingMetNamen> {
  const [event] = await db.select().from(events).where(eq(events.id, eventId))
  const moment = event?.startOp ?? new Date()

  const [bestaand, actieveSpelers, alle, meldingen, periodes] = await Promise.all([
    leesOpstelling(db, eventId),
    leesActieveSpelers(db),
    leesAlleSpelers(db),
    leesMeldingen(db, [eventId]),
    // Een venster van één dag rond het event: de bovengrens ligt erbuiten,
    // dus de dag zelf moet er met een dag extra in vallen.
    leesAfwezighedenTussen(db, moment, new Date(moment.getTime() + 24 * 60 * 60 * 1000)),
  ])

  // De selectie van díé dag: wie langdurig weg is hoort er niet bij, en valt
  // dus ook van de bank en in de waarschuwing.
  const inSelectie = new Set(
    selectieVoor(
      actieveSpelers.map((s) => s.id),
      periodes,
      moment,
    ),
  )
  const actieve = actieveSpelers.filter((s) => inSelectie.has(s.id))

  const soort = event?.type ?? 'wedstrijd'

  const stand = actueleStand(
    actieve.map((s) => ({ id: s.id, standaard: standaardVoor(s, soort) })),
    meldingen.get(eventId) ?? [],
  )

  // Uit álle spelers en niet alleen de actieve: wie op non-actief is gezet
  // terwijl hij opgesteld stond, hoort met zijn eigen naam te blijven staan.
  const naamVan = new Map(alle.map((s) => [s.id, s.weergavenaam ?? s.naam]))
  const nummerVan = new Map(alle.map((s) => [s.id, s.rugnummer]))

  const plekken: OpgesteldePlek[] = (bestaand?.plekken ?? []).map((p) => ({
    slot: p.slot,
    spelerId: p.spelerId,
    gastnaam: p.gastnaam,
    gastnummer: p.gastnummer,
  }))

  // Dezelfde regel als hierboven, één laag hoger: de standaard bepaalt wie er
  // ongevraagd bij zit, de melding en de opstelling winnen ervan.
  const magKiezen = new Set(
    kandidatenVoor(
      actieve.map((s) => ({ id: s.id, doetMee: doetMee(s, soort) })),
      stand,
      plekken,
    ),
  )
  const kandidaten = actieve.filter((s) => magKiezen.has(s.id))

  return {
    opstelling: bestaand?.opstelling ?? null,
    plekken,
    weergave: maakOpstellingWeergave({ stand, plekken, naamVan, nummerVan }),
    stand,
    kandidaten,
  }
}

/**
 * Terug naar concept: spelers zien hem niet meer, de leider kan verder
 * schuiven. De plekken blijven staan — je trekt een opstelling in om hem aan
 * te passen, niet om hem weg te gooien.
 *
 * Twee keer intrekken is geen fout; de knop hoort niet te straffen voor een
 * dubbele tik.
 */
export async function trekOpstellingIn(db: Db, eventId: string): Promise<void> {
  await db
    .update(opstellingen)
    .set({ status: 'concept', gepubliceerdOp: null, bijgewerktOp: new Date() })
    .where(eq(opstellingen.eventId, eventId))
}
