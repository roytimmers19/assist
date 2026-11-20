import { beforeEach, describe, expect, it } from 'vitest'
import { boetes, boetesoorten, events, spelers } from '@/lib/db/schema'
import { maakSchoon, testDb } from './opzet'

async function nieuweSpeler(naam: string): Promise<string> {
  const [rij] = await testDb
    .insert(spelers)
    .values({ naam, email: `${naam}@voorbeeld.nl`, accountStatus: 'actief' })
    .returning()
  return rij.id
}

async function nieuwEvent(): Promise<string> {
  const [rij] = await testDb
    .insert(events)
    .values({
      type: 'wedstrijd',
      startOp: new Date('2026-11-22T13:00:00Z'),
      afmeldDeadline: new Date('2026-11-17T22:59:59Z'),
    })
    .returning()
  return rij.id
}

describe('het schema van de boetepot', () => {
  beforeEach(maakSchoon)

  it('geeft een speler standaard geen rechten in de boetepot', async () => {
    const id = await nieuweSpeler('aap')
    const [rij] = await testDb.select().from(spelers)
    expect(rij.id).toBe(id)
    expect(rij.penningmeester).toBe(false)
    expect(rij.boeteUitdeler).toBe(false)
  })

  it('bewaart een boete die meetelt en nog open staat', async () => {
    const aap = await nieuweSpeler('aap')
    const [rij] = await testDb
      .insert(boetes)
      .values({ spelerId: aap, omschrijving: 'Gele kaart', bedragCent: 500, datum: '2026-11-08' })
      .returning()
    expect(rij.status).toBe('telt')
    expect(rij.betaaldOp).toBeNull()
    expect(rij.ingetrokkenOp).toBeNull()
  })

  it('weigert een boete van nul euro', async () => {
    const aap = await nieuweSpeler('aap')
    await expect(
      testDb
        .insert(boetes)
        .values({ spelerId: aap, omschrijving: 'Niets', bedragCent: 0, datum: '2026-11-08' }),
    ).rejects.toThrow()
  })

  it('weigert een boete zonder omschrijving', async () => {
    const aap = await nieuweSpeler('aap')
    await expect(
      testDb
        .insert(boetes)
        .values({ spelerId: aap, omschrijving: '   ', bedragCent: 200, datum: '2026-11-08' }),
    ).rejects.toThrow()
  })

  it('weigert een tweede te-laat-boete voor dezelfde speler bij hetzelfde event', async () => {
    const aap = await nieuweSpeler('aap')
    const eventId = await nieuwEvent()
    const boete = {
      spelerId: aap,
      eventId,
      omschrijving: 'Te laat afgemeld',
      bedragCent: 500,
      datum: '2026-11-18',
      aanleiding: 'te_laat_afgemeld' as const,
    }
    await testDb.insert(boetes).values(boete)
    await expect(testDb.insert(boetes).values(boete)).rejects.toThrow()
  })

  it('staat twee gewone boetes voor dezelfde speler bij hetzelfde event toe', async () => {
    const aap = await nieuweSpeler('aap')
    const eventId = await nieuwEvent()
    const boete = { spelerId: aap, eventId, omschrijving: 'Gele kaart', bedragCent: 500, datum: '2026-11-22' }
    await testDb.insert(boetes).values(boete)
    await testDb.insert(boetes).values(boete)
    expect(await testDb.select().from(boetes)).toHaveLength(2)
  })

  it('weigert een vaste boete van nul euro en twee koppelingen voor hetzelfde soort event', async () => {
    await expect(
      testDb.insert(boetesoorten).values({ omschrijving: 'Niets', bedragCent: 0 }),
    ).rejects.toThrow()

    await testDb
      .insert(boetesoorten)
      .values({ omschrijving: 'Te laat afgemeld', bedragCent: 500, teLaatVoor: 'wedstrijd' })
    await expect(
      testDb
        .insert(boetesoorten)
        .values({ omschrijving: 'Ook te laat', bedragCent: 300, teLaatVoor: 'wedstrijd' }),
    ).rejects.toThrow()
  })
})
