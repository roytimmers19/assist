import { and, asc, eq, gte, inArray, isNotNull, isNull } from 'drizzle-orm'
import { DateTime } from 'luxon'
import type { Boete } from '@/lib/domein/boetepot'
import { dagVan } from '@/lib/domein/afwezigheid'
import type { OverstapRij } from '@/lib/domein/overstap'
import { ZONE } from '@/lib/domein/tijd'
import type { EventType } from '@/lib/domein/types'
import type { Koppeling, Voorstel, VoorstelInvoer } from '@/lib/domein/voorstellen'
import { leesMeldingen } from './aanwezigheid'
import type { Db } from './client'
import { aanwezigheid, boetes, boetesoorten, events } from './schema'
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
    aantal: r.aantal,
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
  /** Het bedrag van de hele boete, dus al keer het aantal. */
  bedragCent: number
  /** Standaard 1. */
  aantal?: number
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
      aantal: invoer.aantal ?? 1,
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
 * Alles wat een voorstel nodig heeft.
 */
export async function leesVoorstelInvoer(db: Db): Promise<VoorstelInvoer> {
  const koppelingen: Koppeling[] = []
  for (const s of await leesBoetesoorten(db)) {
    if (!s.actief) continue
    const vast = { soortId: s.id, omschrijving: s.omschrijving, bedragCent: s.bedragCent }
    if (s.teLaatWedstrijdOp) koppelingen.push({ type: 'wedstrijd', ...vast, gekoppeldOp: s.teLaatWedstrijdOp })
    if (s.teLaatTrainingOp) koppelingen.push({ type: 'training', ...vast, gekoppeldOp: s.teLaatTrainingOp })
  }

  const leeg: VoorstelInvoer = {
    events: [],
    spelers: [],
    meldingen: new Map(),
    koppelingen,
    afgehandeld: new Set(),
  }
  if (koppelingen.length === 0) return leeg

  // Alleen events met een melding van ná de vroegste koppeling: daarvoor kan
  // geen voorstel zijn. Het gaat om wanneer iemand werd afgemeld, niet om
  // wanneer het event was, dus ook een training van gisteren telt mee.
  const vanaf = new Date(Math.min(...koppelingen.map((k) => k.gekoppeldOp.getTime())))
  const recent = await db
    .selectDistinct({ eventId: aanwezigheid.eventId })
    .from(aanwezigheid)
    .where(gte(aanwezigheid.gezetOp, vanaf))
  if (recent.length === 0) return leeg

  const eventRijen = await db
    .select()
    .from(events)
    .where(
      and(
        inArray(
          events.id,
          recent.map((r) => r.eventId),
        ),
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
  invoer: { id?: string; omschrijving: string; bedragCent: number; perStuk?: boolean },
): Promise<string> {
  const perStuk = invoer.perStuk ?? false
  if (invoer.id) {
    await db
      .update(boetesoorten)
      .set({ omschrijving: invoer.omschrijving, bedragCent: invoer.bedragCent, perStuk })
      .where(eq(boetesoorten.id, invoer.id))
    return invoer.id
  }
  const [rij] = await db
    .insert(boetesoorten)
    .values({ omschrijving: invoer.omschrijving, bedragCent: invoer.bedragCent, perStuk })
    .returning({ id: boetesoorten.id })
  return rij.id
}

/**
 * Gaat een vaste boete van de lijst, dan gaat ook zijn koppeling aan te laat
 * afmelden weg. Anders zou terugzetten voorstellen opleveren over alles wat er
 * in de tussentijd gebeurde.
 */
export async function zetSoortActief(db: Db, id: string, actief: boolean): Promise<void> {
  await db
    .update(boetesoorten)
    .set(actief ? { actief } : { actief, teLaatWedstrijdOp: null, teLaatTrainingOp: null })
    .where(eq(boetesoorten.id, id))
}

function koppelkolom(type: EventType) {
  return type === 'wedstrijd' ? boetesoorten.teLaatWedstrijdOp : boetesoorten.teLaatTrainingOp
}

/**
 * Welke vaste boete de app voorstelt bij te laat afmelden voor dit soort
 * event. Vanaf het moment van koppelen komen er voorstellen; dezelfde keuze
 * nog eens bewaren verschuift dat moment niet.
 */
export async function koppelTeLaat(db: Db, type: EventType, soortId: string | null): Promise<void> {
  const kolom = koppelkolom(type)
  const veld = type === 'wedstrijd' ? 'teLaatWedstrijdOp' : 'teLaatTrainingOp'

  await db.transaction(async (tx) => {
    const [huidig] = await tx.select().from(boetesoorten).where(isNotNull(kolom))
    if (huidig?.id === soortId) return

    if (huidig) {
      await tx.update(boetesoorten).set({ [veld]: null }).where(eq(boetesoorten.id, huidig.id))
    }
    if (soortId) {
      await tx
        .update(boetesoorten)
        .set({ [veld]: new Date() })
        .where(and(eq(boetesoorten.id, soortId), eq(boetesoorten.actief, true)))
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
