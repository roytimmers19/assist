import { and, asc, eq, gte, inArray, isNull } from 'drizzle-orm'
import { DateTime } from 'luxon'
import type { Boete } from '@/lib/domein/boetepot'
import { dagVan } from '@/lib/domein/afwezigheid'
import type { OverstapRij } from '@/lib/domein/overstap'
import { ZONE } from '@/lib/domein/tijd'
import type { EventType } from '@/lib/domein/types'
import type { Koppeling, Voorstel, VoorstelInvoer } from '@/lib/domein/voorstellen'
import { leesMeldingen } from './aanwezigheid'
import type { Db } from './client'
import { boetes, boetesoorten, events } from './schema'
import { leesActieveSpelers } from './spelers'

export type BoetesoortRij = typeof boetesoorten.$inferSelect

/** Alle boetes. Voor een ploeg van achttien man goedkoper dan een slimme query. */
export async function leesBoetes(db: Db): Promise<Boete[]> {
  const rijen = await db.select().from(boetes).orderBy(asc(boetes.gegevenOp))
  return rijen.map((r) => ({
    id: r.id,
    spelerId: r.spelerId,
    omschrijving: r.omschrijving,
    bedragCent: r.bedragCent,
    datum: r.datum,
    eventId: r.eventId,
    status: r.status,
    gegevenOp: r.gegevenOp,
    ingetrokkenOp: r.ingetrokkenOp,
    betaaldOp: r.betaaldOp,
  }))
}

/** De vaste boetes, op bedrag. */
export async function leesBoetesoorten(db: Db): Promise<BoetesoortRij[]> {
  return db
    .select()
    .from(boetesoorten)
    .orderBy(asc(boetesoorten.bedragCent), asc(boetesoorten.omschrijving))
}

export type NieuweBoetes = {
  spelerIds: string[]
  omschrijving: string
  bedragCent: number
  datum: string
  eventId: string | null
  soortId: string | null
  door: string
}

/** Eén boete per gekozen speler, in één keer: ze krijgen hetzelfde moment van geven. */
export async function geefBoetes(db: Db, invoer: NieuweBoetes): Promise<void> {
  if (invoer.spelerIds.length === 0) return
  await db.insert(boetes).values(
    invoer.spelerIds.map((spelerId) => ({
      spelerId,
      omschrijving: invoer.omschrijving,
      bedragCent: invoer.bedragCent,
      datum: invoer.datum,
      eventId: invoer.eventId,
      soortId: invoer.soortId,
      gegevenDoor: invoer.door,
    })),
  )
}

/** Intrekken zet een tijdstip. De rij blijft staan, zodat niets stilletjes verdwijnt. */
export async function trekBoeteIn(db: Db, id: string, door: string): Promise<void> {
  await db
    .update(boetes)
    .set({ ingetrokkenOp: new Date(), ingetrokkenDoor: door })
    .where(and(eq(boetes.id, id), isNull(boetes.ingetrokkenOp)))
}

function teLaatRij(voorstel: Voorstel, door: string) {
  return {
    spelerId: voorstel.spelerId,
    eventId: voorstel.eventId,
    soortId: voorstel.soortId,
    omschrijving: voorstel.omschrijving,
    bedragCent: voorstel.bedragCent,
    datum: dagVan(voorstel.afgemeldOp),
    aanleiding: 'te_laat_afgemeld' as const,
    gegevenDoor: door,
  }
}

/** Twee keer bevestigen levert één boete op: de unieke index vangt de tweede. */
export async function bevestigVoorstel(db: Db, voorstel: Voorstel, door: string): Promise<void> {
  await db.insert(boetes).values(teLaatRij(voorstel, door)).onConflictDoNothing()
}

/** Een gevallen voorstel blijft als rij bestaan, zodat het niet terugkomt. */
export async function laatVoorstelVallen(db: Db, voorstel: Voorstel, door: string): Promise<void> {
  await db
    .insert(boetes)
    .values({ ...teLaatRij(voorstel, door), status: 'gevallen' })
    .onConflictDoNothing()
}

/**
 * Alles wat een voorstel nodig heeft. Alleen events vanaf de vroegste
 * koppeling: daarvoor kan er geen voorstel zijn.
 */
export async function leesVoorstelInvoer(db: Db): Promise<VoorstelInvoer> {
  const gekoppeld = (await leesBoetesoorten(db)).filter(
    (s) => s.actief && s.teLaatVoor && s.teLaatGekoppeldOp,
  )
  const koppelingen: Koppeling[] = gekoppeld.map((s) => ({
    type: s.teLaatVoor as EventType,
    soortId: s.id,
    omschrijving: s.omschrijving,
    bedragCent: s.bedragCent,
    gekoppeldOp: s.teLaatGekoppeldOp!,
  }))

  const leeg: VoorstelInvoer = {
    events: [],
    spelers: [],
    meldingen: new Map(),
    koppelingen,
    afgehandeld: new Set(),
  }
  if (koppelingen.length === 0) return leeg

  const vanaf = new Date(Math.min(...koppelingen.map((k) => k.gekoppeldOp.getTime())))
  const eventRijen = await db
    .select()
    .from(events)
    .where(
      and(
        gte(events.startOp, vanaf),
        inArray(
          events.type,
          koppelingen.map((k) => k.type),
        ),
      ),
    )

  const [meldingen, spelerRijen, teLaat] = await Promise.all([
    leesMeldingen(
      db,
      eventRijen.map((e) => e.id),
    ),
    leesActieveSpelers(db),
    db
      .select({ eventId: boetes.eventId, spelerId: boetes.spelerId })
      .from(boetes)
      .where(eq(boetes.aanleiding, 'te_laat_afgemeld')),
  ])

  return {
    events: eventRijen.map((e) => ({ id: e.id, type: e.type, startOp: e.startOp, status: e.status })),
    spelers: spelerRijen.map((s) => ({
      id: s.id,
      doetTrainingen: s.doetTrainingen,
      doetWedstrijden: s.doetWedstrijden,
    })),
    meldingen,
    koppelingen,
    afgehandeld: new Set(teLaat.map((r) => `${r.eventId}:${r.spelerId}`)),
  }
}

/**
 * Zet alle boetes van een speler die nu open staan op betaald, en geeft het
 * moment terug. Dat moment is waarmee "Ongedaan maken" precies deze keer
 * terugdraait.
 */
export async function zetBetaald(db: Db, spelerId: string, door: string): Promise<Date> {
  const moment = new Date()
  await db
    .update(boetes)
    .set({ betaaldOp: moment, betaaldDoor: door })
    .where(
      and(
        eq(boetes.spelerId, spelerId),
        eq(boetes.status, 'telt'),
        isNull(boetes.ingetrokkenOp),
        isNull(boetes.betaaldOp),
      ),
    )
  return moment
}

export async function maakBetaaldOngedaan(db: Db, spelerId: string, betaaldOp: Date): Promise<void> {
  await db
    .update(boetes)
    .set({ betaaldOp: null, betaaldDoor: null })
    .where(and(eq(boetes.spelerId, spelerId), eq(boetes.betaaldOp, betaaldOp)))
}

/** Een nieuwe vaste boete, of met `id` een bestaande aanpassen. Geeft het id terug. */
export async function bewaarBoetesoort(
  db: Db,
  invoer: { id?: string; omschrijving: string; bedragCent: number },
): Promise<string> {
  if (invoer.id) {
    await db
      .update(boetesoorten)
      .set({ omschrijving: invoer.omschrijving, bedragCent: invoer.bedragCent })
      .where(eq(boetesoorten.id, invoer.id))
    return invoer.id
  }
  const [rij] = await db
    .insert(boetesoorten)
    .values({ omschrijving: invoer.omschrijving, bedragCent: invoer.bedragCent })
    .returning({ id: boetesoorten.id })
  return rij.id
}

export async function zetSoortActief(db: Db, id: string, actief: boolean): Promise<void> {
  await db.update(boetesoorten).set({ actief }).where(eq(boetesoorten.id, id))
}

/**
 * Welke vaste boete de app voorstelt bij te laat afmelden voor dit soort
 * event. Vanaf het moment van koppelen komen er voorstellen; dezelfde keuze
 * nog eens bewaren verschuift dat moment niet.
 */
export async function koppelTeLaat(db: Db, type: EventType, soortId: string | null): Promise<void> {
  await db.transaction(async (tx) => {
    const [huidig] = await tx.select().from(boetesoorten).where(eq(boetesoorten.teLaatVoor, type))
    if (huidig?.id === soortId) return

    if (huidig) {
      await tx
        .update(boetesoorten)
        .set({ teLaatVoor: null, teLaatGekoppeldOp: null })
        .where(eq(boetesoorten.id, huidig.id))
    }
    if (soortId) {
      await tx
        .update(boetesoorten)
        .set({ teLaatVoor: type, teLaatGekoppeldOp: new Date() })
        .where(eq(boetesoorten.id, soortId))
    }
  })
}

/**
 * De eenmalige overstap uit de oude boeteapp: alles in één transactie, en
 * alleen in een lege boetepot. Een overgezette boete heet gegeven op zijn
 * eigen dag, zodat het beginscherm niet ineens een seizoen aan boetes als
 * nieuw toont.
 */
export async function zetOverstapIn(db: Db, rijen: OverstapRij[], moment: Date): Promise<void> {
  await db.transaction(async (tx) => {
    const [bestaand] = await tx.select({ id: boetes.id }).from(boetes).limit(1)
    if (bestaand) throw new Error('Er staan al boetes in de boetepot; de overstap draait alleen in een lege.')
    if (rijen.length === 0) return

    await tx.insert(boetes).values(
      rijen.map((r) => ({
        spelerId: r.spelerId,
        omschrijving: r.omschrijving,
        bedragCent: r.bedragCent,
        datum: r.datum,
        gegevenOp: DateTime.fromISO(r.datum, { zone: ZONE }).set({ hour: 12 }).toJSDate(),
        betaaldOp: r.betaald ? moment : null,
      })),
    )
  })
}
