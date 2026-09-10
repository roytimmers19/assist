import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { maakSchoon, testDb } from './opzet'
import {
  leesAlleSpelers,
  maakSpeler,
  wijzigSpeler,
  zetActief,
  zoekSpelerOpRugnummer,
} from '@/lib/db/spelers'
import { spelers } from '@/lib/db/schema'

describe('spelersbeheer', () => {
  beforeEach(async () => {
    await maakSchoon()
  })

  // Standaard waar, zodat alleen wie een uitzondering is iets hoeft te zetten.
  it('laat een nieuwe speler standaard overal aan meedoen', async () => {
    const speler = await maakSpeler(testDb, { naam: 'Bas', email: 'bas@voorbeeld.nl' })

    expect(speler.doetTrainingen).toBe(true)
    expect(speler.doetWedstrijden).toBe(true)
  })

  it('zet de twee vinkjes los van elkaar', async () => {
    const speler = await maakSpeler(testDb, { naam: 'Bas', email: 'bas@voorbeeld.nl' })

    await wijzigSpeler(testDb, speler.id, { doetTrainingen: false })

    const [na] = await testDb.select().from(spelers).where(eq(spelers.id, speler.id))
    expect(na.doetTrainingen).toBe(false)
    expect(na.doetWedstrijden).toBe(true)
  })

  it('maakt een nieuwe speler aan als uitgenodigd', async () => {
    const speler = await maakSpeler(testDb, {
      naam: 'Bas',
      email: 'bas@voorbeeld.nl',
      rugnummer: 7,
      positie: 'middenvelder',
      telefoon: '0612345678',
    })
    expect(speler).toMatchObject({ accountStatus: 'uitgenodigd', rol: 'speler', actief: true })
  })

  it('wijzigt naam en rugnummer', async () => {
    const speler = await maakSpeler(testDb, { naam: 'Bas', email: 'bas@voorbeeld.nl' })
    await wijzigSpeler(testDb, speler.id, { weergavenaam: 'Basje', rugnummer: 10 })

    const [naderhand] = await testDb.select().from(spelers).where(eq(spelers.id, speler.id))
    expect(naderhand).toMatchObject({ weergavenaam: 'Basje', rugnummer: 10 })
  })

  it('zet een speler op inactief zonder hem te verwijderen', async () => {
    const speler = await maakSpeler(testDb, { naam: 'Bas', email: 'bas@voorbeeld.nl' })
    await zetActief(testDb, speler.id, false)

    const alle = await leesAlleSpelers(testDb)
    expect(alle).toHaveLength(1)
    expect(alle[0].actief).toBe(false)
  })

  it('vindt de speler die een rugnummer bezet houdt', async () => {
    const bas = await maakSpeler(testDb, { naam: 'Bas', email: 'bas@voorbeeld.nl', rugnummer: 7 })

    expect((await zoekSpelerOpRugnummer(testDb, 7))?.id).toBe(bas.id)
    expect(await zoekSpelerOpRugnummer(testDb, 8)).toBeNull()
  })

  it('houdt het nummer van een niet-actieve speler niet bezet', async () => {
    // Wie eruit ligt blokkeert geen nummer meer; de rij blijft wel bestaan
    // omdat de historie er nog aan hangt.
    const bas = await maakSpeler(testDb, { naam: 'Bas', email: 'bas@voorbeeld.nl', rugnummer: 7 })
    await zetActief(testDb, bas.id, false)

    expect(await zoekSpelerOpRugnummer(testDb, 7)).toBeNull()
  })
})
