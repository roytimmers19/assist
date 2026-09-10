import { sql } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { maakSchoon, testDb } from './opzet'
import { leesActieveSpelers, zoekSpelerBijGebruiker } from '@/lib/db/spelers'
import { spelers } from '@/lib/db/schema'

async function maakGebruiker(id: string, email: string) {
  await testDb.execute(
    sql`insert into "user" (id, name, email, email_verified, created_at, updated_at)
        values (${id}, ${email}, ${email}, true, now(), now())`,
  )
}

describe('spelers opzoeken', () => {
  beforeEach(async () => {
    await maakSchoon()
    await testDb.execute(sql`truncate table "user" cascade`)
  })

  it('vindt de speler die bij een gebruiker hoort', async () => {
    await maakGebruiker('g-1', 'bas@voorbeeld.nl')
    await testDb.insert(spelers).values({
      naam: 'Bas',
      email: 'bas@voorbeeld.nl',
      gebruikerId: 'g-1',
      accountStatus: 'actief',
      rol: 'leider',
    })

    const gevonden = await zoekSpelerBijGebruiker(testDb, 'g-1')
    expect(gevonden).toMatchObject({ naam: 'Bas', rol: 'leider', accountStatus: 'actief' })
  })

  it('geeft niets terug voor een gebruiker zonder speler', async () => {
    await maakGebruiker('g-2', 'vreemd@voorbeeld.nl')
    expect(await zoekSpelerBijGebruiker(testDb, 'g-2')).toBeNull()
  })

  it('laat spelers die op goedkeuring wachten buiten de actieve lijst', async () => {
    await testDb.insert(spelers).values([
      { naam: 'Bas', email: 'bas@voorbeeld.nl', accountStatus: 'actief', actief: true },
      { naam: 'Kes', email: 'kes@voorbeeld.nl', accountStatus: 'wacht_op_goedkeuring', actief: false },
      { naam: 'Oud', email: 'oud@voorbeeld.nl', accountStatus: 'actief', actief: false },
    ])

    const actieve = await leesActieveSpelers(testDb)
    expect(actieve.map((s) => s.naam)).toEqual(['Bas'])
  })

  it('sorteert de actieve spelers op naam', async () => {
    await testDb.insert(spelers).values([
      { naam: 'Youri', email: 'y@voorbeeld.nl', accountStatus: 'actief' },
      { naam: 'Anton', email: 'a@voorbeeld.nl', accountStatus: 'actief' },
    ])
    expect((await leesActieveSpelers(testDb)).map((s) => s.naam)).toEqual(['Anton', 'Youri'])
  })
})
