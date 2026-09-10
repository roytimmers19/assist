import { eq } from 'drizzle-orm'
import { beforeEach, describe, expect, it } from 'vitest'
import { maakSchoon, testDb } from './opzet'
import { zetAanwezigheid } from '@/lib/db/aanwezigheid'
import { maakAfwezigheid } from '@/lib/db/afwezigheid'
import {
  bewaarOpstelling,
  leesOpstelling,
  leesOpstellingStatussen,
  leesOpstellingWeergave,
  trekOpstellingIn,
} from '@/lib/db/opstelling'
import { events, opstellingPlekken, opstellingen, spelers } from '@/lib/db/schema'

async function nieuwEvent(): Promise<string> {
  const [rij] = await testDb
    .insert(events)
    .values({
      type: 'wedstrijd',
      startOp: new Date('2026-09-06T07:30:00Z'),
      afmeldDeadline: new Date('2026-09-02T21:59:59Z'),
      tegenstander: 'Tegenstander 2',
      thuis: false,
    })
    .returning()
  return rij.id
}

async function nieuweSpeler(naam: string, email: string): Promise<string> {
  // Goedgekeurd én actief: alleen zo telt hij mee in de selectie, en dat is
  // precies wat de weergave gebruikt om te bepalen wie er komt.
  const [rij] = await testDb
    .insert(spelers)
    .values({ naam, email, accountStatus: 'actief' })
    .returning()
  return rij.id
}

describe('opstelling bewaren en lezen', () => {
  beforeEach(maakSchoon)

  it('geeft niets terug als er nog geen opstelling is', async () => {
    expect(await leesOpstelling(testDb, await nieuwEvent())).toBeNull()
  })

  it('bewaart een concept met spelers en gasten', async () => {
    const eventId = await nieuwEvent()
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')

    await bewaarOpstelling(testDb, {
      eventId,
      formatie: '4-3-3',
      plekken: [
        { slot: 0, spelerId: bas },
        { slot: 1, gastnaam: 'Sander', gastnummer: 12 },
        { slot: null, gastnaam: 'Youri', gastnummer: null },
      ],
      publiceren: false,
    })

    const gevonden = await leesOpstelling(testDb, eventId)
    expect(gevonden?.opstelling.formatie).toBe('4-3-3')
    expect(gevonden?.opstelling.status).toBe('concept')
    expect(gevonden?.opstelling.gepubliceerdOp).toBeNull()
    expect(gevonden?.plekken).toHaveLength(3)
  })

  it('vervangt bij opnieuw bewaren de hele opstelling', async () => {
    const eventId = await nieuwEvent()
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const kes = await nieuweSpeler('Kes', 'kes@voorbeeld.nl')

    await bewaarOpstelling(testDb, {
      eventId,
      formatie: '4-3-3',
      plekken: [{ slot: 0, spelerId: bas }],
      publiceren: false,
    })
    await bewaarOpstelling(testDb, {
      eventId,
      formatie: '4-4-2',
      plekken: [{ slot: 0, spelerId: kes }],
      publiceren: true,
    })

    const gevonden = await leesOpstelling(testDb, eventId)
    expect(gevonden?.opstelling.formatie).toBe('4-4-2')
    expect(gevonden?.opstelling.status).toBe('gepubliceerd')
    expect(gevonden?.opstelling.gepubliceerdOp).not.toBeNull()
    expect(gevonden?.plekken).toHaveLength(1)
    expect(gevonden?.plekken[0].spelerId).toBe(kes)
  })

  it('houdt het aan één opstelling per wedstrijd', async () => {
    const eventId = await nieuwEvent()
    await bewaarOpstelling(testDb, { eventId, formatie: '4-3-3', plekken: [], publiceren: false })
    await bewaarOpstelling(testDb, { eventId, formatie: '4-3-3', plekken: [], publiceren: false })

    expect(await testDb.select().from(opstellingen)).toHaveLength(1)
  })

  it('geeft per event de status terug voor het weekoverzicht', async () => {
    const eventId = await nieuwEvent()
    await bewaarOpstelling(testDb, { eventId, formatie: '4-3-3', plekken: [], publiceren: true })

    const statussen = await leesOpstellingStatussen(testDb, [
      eventId,
      '00000000-0000-0000-0000-000000000000',
    ])
    expect(statussen.get(eventId)).toBe('gepubliceerd')
    expect(statussen.size).toBe(1)
  })
})

describe('de databaseregels uit het ontwerp', () => {
  beforeEach(maakSchoon)

  async function opstellingMet(plek: Record<string, unknown>) {
    const eventId = await nieuwEvent()
    await bewaarOpstelling(testDb, { eventId, formatie: '4-3-3', plekken: [], publiceren: false })
    const gevonden = await leesOpstelling(testDb, eventId)
    return testDb.insert(opstellingPlekken).values({
      opstellingId: gevonden!.opstelling.id,
      ...plek,
    } as never)
  }

  it('weigert een plek zonder speler én zonder gast', async () => {
    await expect(opstellingMet({ slot: 0 })).rejects.toThrow()
  })

  it('weigert een plek met zowel een speler als een gast', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await expect(opstellingMet({ slot: 0, spelerId: bas, gastnaam: 'Sander' })).rejects.toThrow()
  })

  it('weigert een eigen speler op de bank', async () => {
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await expect(opstellingMet({ slot: null, spelerId: bas })).rejects.toThrow()
  })

  it('weigert een slot buiten het bereik', async () => {
    await expect(opstellingMet({ slot: 11, gastnaam: 'Sander' })).rejects.toThrow()
  })

  it('weigert twee spelers op hetzelfde slot', async () => {
    const eventId = await nieuwEvent()
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const kes = await nieuweSpeler('Kes', 'kes@voorbeeld.nl')
    await expect(
      bewaarOpstelling(testDb, {
        eventId,
        formatie: '4-3-3',
        plekken: [
          { slot: 0, spelerId: bas },
          { slot: 0, spelerId: kes },
        ],
        publiceren: false,
      }),
    ).rejects.toThrow()
  })

  it('weigert dezelfde speler twee keer', async () => {
    const eventId = await nieuwEvent()
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await expect(
      bewaarOpstelling(testDb, {
        eventId,
        formatie: '4-3-3',
        plekken: [
          { slot: 0, spelerId: bas },
          { slot: 1, spelerId: bas },
        ],
        publiceren: false,
      }),
    ).rejects.toThrow()
  })

  it('verwijdert de opstelling als het event verdwijnt', async () => {
    const eventId = await nieuwEvent()
    await bewaarOpstelling(testDb, { eventId, formatie: '4-3-3', plekken: [], publiceren: false })
    await testDb.delete(events).where(eq(events.id, eventId))

    expect(await testDb.select().from(opstellingen)).toHaveLength(0)
  })
})

describe('leesOpstellingWeergave', () => {
  beforeEach(maakSchoon)

  it('geeft een lege weergave als er nog geen opstelling is', async () => {
    const gelezen = await leesOpstellingWeergave(testDb, await nieuwEvent())

    expect(gelezen.opstelling).toBeNull()
    expect(gelezen.weergave.basis).toEqual([])
  })

  it('koppelt namen en rugnummers aan de opgeslagen plekken', async () => {
    const eventId = await nieuwEvent()
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await testDb.update(spelers).set({ rugnummer: 7 }).where(eq(spelers.id, bas))
    await nieuweSpeler('Cor', 'cor@voorbeeld.nl')

    await bewaarOpstelling(testDb, {
      eventId,
      formatie: '4-3-3',
      plekken: [{ slot: 0, spelerId: bas }],
      publiceren: true,
    })

    const gelezen = await leesOpstellingWeergave(testDb, eventId)
    expect(gelezen.opstelling?.status).toBe('gepubliceerd')
    expect(gelezen.weergave.basis).toEqual([
      { slot: 0, spelerId: bas, nummer: 7, naam: 'Bas', gast: false, gewaarschuwd: false },
    ])
    // Cor komt en staat niet opgesteld, dus die hoort op de bank.
    expect(gelezen.weergave.bank.map((r) => r.naam)).toEqual(['Cor'])
  })

  it('houdt een op non-actief gezette speler bij naam en waarschuwt over hem', async () => {
    const eventId = await nieuwEvent()
    const weg = await nieuweSpeler('Weggevallen', 'weg@voorbeeld.nl')

    await bewaarOpstelling(testDb, {
      eventId,
      formatie: '4-3-3',
      plekken: [{ slot: 0, spelerId: weg }],
      publiceren: false,
    })
    await testDb.update(spelers).set({ actief: false }).where(eq(spelers.id, weg))

    const gelezen = await leesOpstellingWeergave(testDb, eventId)
    expect(gelezen.weergave.basis[0]).toMatchObject({
      naam: 'Weggevallen',
      gewaarschuwd: true,
    })
  })
})

describe('de opstelling en langdurige afwezigheid', () => {
  beforeEach(maakSchoon)

  const periode = { van: '2026-09-01', terugOp: '2026-10-15', reden: 'Kruisband' }

  it('laat een langdurig afwezige speler weg van de bank', async () => {
    const eventId = await nieuwEvent() // start op 6 september 2026
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const cor = await nieuweSpeler('Cor', 'cor@voorbeeld.nl')

    await bewaarOpstelling(testDb, {
      eventId,
      formatie: '4-3-3',
      plekken: [{ slot: 0, spelerId: bas }],
      publiceren: true,
    })
    await maakAfwezigheid(testDb, { ...periode, spelerId: cor, gezetDoor: cor })

    const gelezen = await leesOpstellingWeergave(testDb, eventId)
    expect(gelezen.weergave.bank).toEqual([])
    expect(gelezen.kandidaten.map((s) => s.naam)).toEqual(['Bas'])
  })

  it('waarschuwt over een opgestelde speler die langdurig afwezig is', async () => {
    const eventId = await nieuwEvent()
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')

    await bewaarOpstelling(testDb, {
      eventId,
      formatie: '4-3-3',
      plekken: [{ slot: 0, spelerId: bas }],
      publiceren: true,
    })
    await maakAfwezigheid(testDb, { ...periode, spelerId: bas, gezetDoor: bas })

    const gelezen = await leesOpstellingWeergave(testDb, eventId)
    expect(gelezen.weergave.basis[0]).toMatchObject({ naam: 'Bas', gewaarschuwd: true })
  })

  it('laat hem gewoon meedoen zodra hij terug is', async () => {
    const eventId = await nieuwEvent()
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const cor = await nieuweSpeler('Cor', 'cor@voorbeeld.nl')

    await bewaarOpstelling(testDb, {
      eventId,
      formatie: '4-3-3',
      plekken: [{ slot: 0, spelerId: bas }],
      publiceren: true,
    })
    // Terug op 1 september, dus op 6 september hoort hij er weer bij.
    await maakAfwezigheid(testDb, {
      spelerId: cor,
      van: '2026-08-01',
      terugOp: '2026-09-01',
      reden: 'Vakantie',
      gezetDoor: cor,
    })

    const gelezen = await leesOpstellingWeergave(testDb, eventId)
    expect(gelezen.weergave.bank.map((r) => r.naam)).toEqual(['Cor'])
  })
})

describe('een opstelling intrekken', () => {
  beforeEach(maakSchoon)

  async function gepubliceerd() {
    const eventId = await nieuwEvent()
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await bewaarOpstelling(testDb, {
      eventId,
      formatie: '4-3-3',
      plekken: [{ slot: 0, spelerId: bas }],
      publiceren: true,
    })
    return eventId
  }

  // Je trekt hem in om hem aan te passen, niet om hem weg te gooien.
  it('zet de status terug op concept en laat de opstelling staan', async () => {
    const eventId = await gepubliceerd()

    await trekOpstellingIn(testDb, eventId)

    const gelezen = await leesOpstelling(testDb, eventId)
    expect(gelezen?.opstelling.status).toBe('concept')
    expect(gelezen?.opstelling.gepubliceerdOp).toBeNull()
    expect(gelezen?.plekken).toHaveLength(1)
  })

  it('laat het weekoverzicht hem als concept zien', async () => {
    const eventId = await gepubliceerd()
    await trekOpstellingIn(testDb, eventId)

    const statussen = await leesOpstellingStatussen(testDb, [eventId])
    expect(statussen.get(eventId)).toBe('concept')
  })

  it('is geen fout als hij al concept is', async () => {
    const eventId = await gepubliceerd()
    await trekOpstellingIn(testDb, eventId)

    await expect(trekOpstellingIn(testDb, eventId)).resolves.toBeUndefined()
  })
})

describe('de opstelling en standaardbeschikbaarheid', () => {
  beforeEach(maakSchoon)

  it('laat iemand die geen wedstrijden speelt weg van de bank', async () => {
    const eventId = await nieuwEvent() // een wedstrijd
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const cor = await nieuweSpeler('Cor', 'cor@voorbeeld.nl')
    await testDb.update(spelers).set({ doetWedstrijden: false }).where(eq(spelers.id, cor))

    await bewaarOpstelling(testDb, {
      eventId,
      formatie: '4-3-3',
      plekken: [{ slot: 0, spelerId: bas }],
      publiceren: true,
    })

    const gelezen = await leesOpstellingWeergave(testDb, eventId)
    expect(gelezen.weergave.bank).toEqual([])
  })

  // Trainingen uitzetten mag een wedstrijd niet raken.
  it('laat iemand die niet traint gewoon op de bank bij een wedstrijd', async () => {
    const eventId = await nieuwEvent()
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const cor = await nieuweSpeler('Cor', 'cor@voorbeeld.nl')
    await testDb.update(spelers).set({ doetTrainingen: false }).where(eq(spelers.id, cor))

    await bewaarOpstelling(testDb, {
      eventId,
      formatie: '4-3-3',
      plekken: [{ slot: 0, spelerId: bas }],
      publiceren: true,
    })

    const gelezen = await leesOpstellingWeergave(testDb, eventId)
    expect(gelezen.weergave.bank.map((r) => r.naam)).toEqual(['Cor'])
  })

  it('waarschuwt over een opgestelde speler die geen wedstrijden speelt', async () => {
    const eventId = await nieuwEvent()
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    await bewaarOpstelling(testDb, {
      eventId,
      formatie: '4-3-3',
      plekken: [{ slot: 0, spelerId: bas }],
      publiceren: true,
    })
    await testDb.update(spelers).set({ doetWedstrijden: false }).where(eq(spelers.id, bas))

    const gelezen = await leesOpstellingWeergave(testDb, eventId)
    expect(gelezen.weergave.basis[0]).toMatchObject({ naam: 'Bas', gewaarschuwd: true })
  })
})

describe('de keuzelijst van het bouwscherm', () => {
  beforeEach(maakSchoon)

  // Filters, geen sloten: een melding wint van een standaard. Wie zich voor
  // deze ene wedstrijd aanmeldt staat op de bank, dus hij hoort ook opstelbaar
  // te zijn — anders zegt het bouwscherm iets anders dan de gepubliceerde bank.
  it('biedt iemand die geen wedstrijden speelt tóch aan als hij zich heeft aangemeld', async () => {
    const eventId = await nieuwEvent()
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')
    const cor = await nieuweSpeler('Cor', 'cor@voorbeeld.nl')
    await testDb.update(spelers).set({ doetWedstrijden: false }).where(eq(spelers.id, cor))

    await zetAanwezigheid(testDb, {
      eventId,
      spelerId: cor,
      status: 'ja',
      bron: 'speler',
      toelichting: null,
      gezetDoorSpelerId: cor,
    })

    const gelezen = await leesOpstellingWeergave(testDb, eventId)
    expect(gelezen.kandidaten.map((s) => s.naam).sort()).toEqual(['Bas', 'Cor'])
  })

  // Anders valt hij uit de lijst waaruit het veld zijn namen haalt, en toont
  // het bouwscherm een vraagteken op de plek waar hij staat.
  it('houdt wie al opgesteld staat in de lijst nadat hij op speelt-niet is gezet', async () => {
    const eventId = await nieuwEvent()
    const bas = await nieuweSpeler('Bas', 'bas@voorbeeld.nl')

    await bewaarOpstelling(testDb, {
      eventId,
      formatie: '4-3-3',
      plekken: [{ slot: 0, spelerId: bas }],
      publiceren: true,
    })
    await testDb.update(spelers).set({ doetWedstrijden: false }).where(eq(spelers.id, bas))

    const gelezen = await leesOpstellingWeergave(testDb, eventId)
    expect(gelezen.kandidaten.map((s) => s.naam)).toEqual(['Bas'])
  })
})
