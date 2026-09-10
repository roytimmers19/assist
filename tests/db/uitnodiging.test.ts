import { createHash } from 'node:crypto'
import { eq, sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { maakSchoon, testDb } from './opzet'
import {
  keurGoed,
  leesUitnodiging,
  maakUitnodiging,
  meldZelfAan,
  neemUitnodigingIn,
} from '@/lib/auth/uitnodiging'
import { spelers, teamInstelling, uitnodigingen } from '@/lib/db/schema'

async function maakGebruiker(id: string, email: string) {
  await testDb.execute(
    sql`insert into "user" (id, name, email, email_verified, created_at, updated_at)
        values (${id}, ${email}, ${email}, true, now(), now())`,
  )
}

async function nieuweSpeler(naam: string, email: string) {
  const [rij] = await testDb.insert(spelers).values({ naam, email }).returning()
  return rij
}

async function schoneOpzet() {
  await maakSchoon()
  await testDb.execute(sql`truncate table "user" cascade`)
  await testDb.execute(sql`truncate table team_instelling`)
  await testDb.insert(teamInstelling).values({
    id: 1,
    teamnaam: 'SV Voorbeeld 2 (zon)',
    icsUrl: 'http://voorbeeld.test/ical',
    teamcode: 'VB2-2627',
  })
}

describe('uitnodigingen', () => {
  beforeEach(schoneOpzet)

  it('bewaart alleen de hash van de token, nooit de token zelf', async () => {
    const speler = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const token = await maakUitnodiging(testDb, speler.id)

    const [rij] = await testDb.select().from(uitnodigingen)
    expect(rij.tokenHash).not.toBe(token)
    expect(rij.tokenHash).toBe(createHash('sha256').update(token).digest('hex'))
  })

  it('koppelt op de token en niet op het e-mailadres', async () => {
    const speler = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const token = await maakUitnodiging(testDb, speler.id)
    // De speler logt in met Google onder een heel ander adres.
    await maakGebruiker('g-1', 'iets.anders@gmail.com')

    await neemUitnodigingIn(testDb, token, 'g-1')

    const [naderhand] = await testDb.select().from(spelers).where(eq(spelers.id, speler.id))
    expect(naderhand.gebruikerId).toBe('g-1')
    expect(naderhand.accountStatus).toBe('actief')
  })

  it('weigert een uitnodiging die al gebruikt is', async () => {
    const speler = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const token = await maakUitnodiging(testDb, speler.id)
    await maakGebruiker('g-1', 'bas@voorbeeld.nl')
    await neemUitnodigingIn(testDb, token, 'g-1')

    expect(await leesUitnodiging(testDb, token)).toBeNull()
  })

  it('laat maar een van twee gelijktijdige innames slagen', async () => {
    // De link is de identiteit: wie hem inneemt wordt deze speler. Als twee
    // verzoeken allebei de controle passeren voordat een van beide schrijft,
    // overschrijft de laatste de koppeling van de eerste.
    const speler = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const token = await maakUitnodiging(testDb, speler.id)
    await maakGebruiker('g-1', 'bas@voorbeeld.nl')
    await maakGebruiker('g-2', 'indringer@voorbeeld.nl')

    const uitkomsten = await Promise.allSettled([
      neemUitnodigingIn(testDb, token, 'g-1'),
      neemUitnodigingIn(testDb, token, 'g-2'),
    ])

    expect(uitkomsten.filter((u) => u.status === 'fulfilled')).toHaveLength(1)

    const [naderhand] = await testDb.select().from(spelers).where(eq(spelers.id, speler.id))
    const winnaar = uitkomsten[0].status === 'fulfilled' ? 'g-1' : 'g-2'
    expect(naderhand.gebruikerId).toBe(winnaar)
  })

  it('weigert een verlopen uitnodiging', async () => {
    const speler = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const token = await maakUitnodiging(testDb, speler.id)
    await testDb
      .update(uitnodigingen)
      .set({ verlooptOp: new Date(Date.now() - 1000) })
      .where(eq(uitnodigingen.spelerId, speler.id))

    expect(await leesUitnodiging(testDb, token)).toBeNull()
  })

  it('weigert een onbekende token', async () => {
    expect(await leesUitnodiging(testDb, 'bestaat-niet')).toBeNull()
  })
})

describe('zelfaanmelden', () => {
  beforeEach(schoneOpzet)

  it('weigert een verkeerde teamcode', async () => {
    await maakGebruiker('g-1', 'nieuw@voorbeeld.nl')
    expect(await meldZelfAan(testDb, 'g-1', 'nieuw@voorbeeld.nl', 'Nieuw', 'FOUT')).toBe('verkeerde_code')
    expect(await testDb.select().from(spelers)).toHaveLength(0)
  })

  it('zet een nieuwe aanmelding op wachten en op inactief', async () => {
    await maakGebruiker('g-1', 'nieuw@voorbeeld.nl')
    expect(await meldZelfAan(testDb, 'g-1', 'nieuw@voorbeeld.nl', 'Nieuw', 'VB2-2627')).toBe('ok')

    const [rij] = await testDb.select().from(spelers)
    expect(rij).toMatchObject({ accountStatus: 'wacht_op_goedkeuring', actief: false, rol: 'speler' })
  })

  it('maakt geen tweede speler als het e-mailadres al bekend is', async () => {
    await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await maakGebruiker('g-1', 'bas@voorbeeld.nl')

    expect(await meldZelfAan(testDb, 'g-1', 'bas@voorbeeld.nl', 'Bas', 'VB2-2627')).toBe('ok')

    const rijen = await testDb.select().from(spelers)
    expect(rijen).toHaveLength(1)
    expect(rijen[0].gebruikerId).toBe('g-1')
    expect(rijen[0].accountStatus).toBe('wacht_op_goedkeuring')
  })

  // Wie al binnen is mag door de aanmeldlink niets kwijtraken. Die link staat
  // in de groepsapp, dus iedereen kan er nog eens op tikken — en een leider die
  // zichzelf zo degradeert sluit zichzelf buiten.
  it('laat een speler die al actief is met rust', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await testDb
      .update(spelers)
      .set({ accountStatus: 'actief', actief: true, rol: 'leider' })
      .where(eq(spelers.id, bas.id))
    await maakGebruiker('g-1', 'bas@voorbeeld.nl')

    expect(await meldZelfAan(testDb, 'g-1', 'bas@voorbeeld.nl', 'Bas', 'VB2-2627')).toBe('ok')

    const [rij] = await testDb.select().from(spelers)
    expect(rij.accountStatus).toBe('actief')
    expect(rij.actief).toBe(true)
    expect(rij.rol).toBe('leider')
    expect(rij.gebruikerId).toBe('g-1')
  })

  it('maakt een goedgekeurde speler actief', async () => {
    await maakGebruiker('g-1', 'nieuw@voorbeeld.nl')
    await meldZelfAan(testDb, 'g-1', 'nieuw@voorbeeld.nl', 'Nieuw', 'VB2-2627')
    const [rij] = await testDb.select().from(spelers)

    await keurGoed(testDb, rij.id)

    const [naderhand] = await testDb.select().from(spelers).where(eq(spelers.id, rij.id))
    expect(naderhand).toMatchObject({ accountStatus: 'actief', actief: true })
  })
})

describe('automatisch toelaten', () => {
  beforeEach(schoneOpzet)

  async function zetDeur(tot: Date | null) {
    await testDb.update(teamInstelling).set({ automatischToelatenTot: tot }).where(eq(teamInstelling.id, 1))
  }

  it('laat een nieuwe speler direct binnen als de deur openstaat', async () => {
    await zetDeur(new Date(Date.now() + 60 * 60 * 1000))
    await maakGebruiker('g-1', 'nieuw@voorbeeld.nl')

    await meldZelfAan(testDb, 'g-1', 'nieuw@voorbeeld.nl', 'Nieuw', 'VB2-2627')

    const [rij] = await testDb.select().from(spelers)
    expect(rij).toMatchObject({ accountStatus: 'actief', actief: true })
  })

  it('laat hem wachten als de deur dicht is', async () => {
    await maakGebruiker('g-1', 'nieuw@voorbeeld.nl')

    await meldZelfAan(testDb, 'g-1', 'nieuw@voorbeeld.nl', 'Nieuw', 'VB2-2627')

    const [rij] = await testDb.select().from(spelers)
    expect(rij.accountStatus).toBe('wacht_op_goedkeuring')
  })

  it('laat hem wachten als het openzetten verlopen is', async () => {
    await zetDeur(new Date(Date.now() - 60 * 1000))
    await maakGebruiker('g-1', 'nieuw@voorbeeld.nl')

    await meldZelfAan(testDb, 'g-1', 'nieuw@voorbeeld.nl', 'Nieuw', 'VB2-2627')

    const [rij] = await testDb.select().from(spelers)
    expect(rij.accountStatus).toBe('wacht_op_goedkeuring')
  })

  // Een schakelaar omzetten mag niemand binnenlaten die je nog niet had gezien.
  it('laat wie al wacht gewoon wachten', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await testDb
      .update(spelers)
      .set({ accountStatus: 'wacht_op_goedkeuring' })
      .where(eq(spelers.id, bas.id))

    await zetDeur(new Date(Date.now() + 60 * 60 * 1000))

    const [rij] = await testDb.select().from(spelers).where(eq(spelers.id, bas.id))
    expect(rij.accountStatus).toBe('wacht_op_goedkeuring')
  })

  // De fout van gisteravond mag niet langs deze weg terugkomen.
  it('degradeert een bestaand actief lid ook met een open deur niet', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await testDb
      .update(spelers)
      .set({ accountStatus: 'actief', actief: true, rol: 'leider' })
      .where(eq(spelers.id, bas.id))
    await maakGebruiker('g-1', 'bas@voorbeeld.nl')
    await zetDeur(new Date(Date.now() + 60 * 60 * 1000))

    await meldZelfAan(testDb, 'g-1', 'bas@voorbeeld.nl', 'Bas', 'VB2-2627')

    const [rij] = await testDb.select().from(spelers)
    expect(rij).toMatchObject({ accountStatus: 'actief', actief: true, rol: 'leider' })
  })
})
