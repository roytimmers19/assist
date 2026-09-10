import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { duoVanWeek } from '@/lib/domein/dienstrooster'
import { laadSeizoen, SEIZOENBESTAND } from '@/scripts/_seizoen'

/** Het venster van precies dít papieren rooster. */
const VAN = '2026-08-01'
const TOT = '2027-07-31'

/**
 * Dit is een controle op óvertikfouten: het rooster is overgenomen van twee
 * foto's uit de groepsapp, met aantallen die aan dat ene seizoen vastzitten.
 * Die controle heeft dus alleen zin tegen de échte gegevens van seizoen
 * 2026-2027 — niet tegen het voorbeeldbestand (andere aantallen, ander
 * venster) en niet tegen een later seizoen (ook ander venster, ook andere
 * aantallen). Overslaan is dan eerlijker dan hem groen of rood laten staan
 * tegen gegevens die niets bewijzen.
 */
const erZijnGegevens = existsSync(SEIZOENBESTAND)

/**
 * Buiten het describe-blok laden, en met een lege terugval. Vitest voert de
 * callback van een overgeslagen suite tóch uit om de tests te verzamelen —
 * laadSeizoen() daarbinnen zou in CI dus alsnog gooien in plaats van over te
 * slaan. Op de lege waarden wordt niets beweerd: de suite draait daar niet.
 */
const {
  seizoen: SEIZOEN,
  materiaalduos: MATERIAALDUOS,
  rijdatums: RIJDATUMS,
  roepnamen: ROEPNAMEN,
  steekproef: STEEKPROEF,
} = erZijnGegevens
  ? laadSeizoen()
  : {
      seizoen: { van: '', tot: '' },
      materiaalduos: [],
      rijdatums: [],
      roepnamen: {},
      steekproef: { duoVanWeek: [], materiaalZonderRij: '', nogGeenLid: '' },
    }

const isDitSeizoen = SEIZOEN.van === VAN && SEIZOEN.tot === TOT
const rijbeurten = RIJDATUMS.flatMap((r) => [...r.rijders])

describe.skipIf(!isDitSeizoen)('het afschrift van seizoen 2026-2027', () => {
  it('heeft twaalf duo\'s met vierentwintig verschillende namen', () => {
    expect(MATERIAALDUOS).toHaveLength(12)
    expect(new Set(MATERIAALDUOS.flat()).size).toBe(24)
  })

  // De plekken waar de foto en de formule elkaar moeten raken. De weken en de
  // bijbehorende duo's staan in scripts/seizoen.json, niet hier: het zijn
  // geen verzonnen fixtures maar de steekproef tegen de foto's.
  it('komt uit op de weken die op de foto staan', () => {
    for (const { week, duo } of STEEKPROEF.duoVanWeek) {
      expect(duoVanWeek(week, MATERIAALDUOS), `week ${week}`).toEqual(duo)
    }
  })

  it('heeft twaalf rijdatums op volgorde, met vier rijders behalve 6 september', () => {
    expect(RIJDATUMS).toHaveLength(12)
    expect([...RIJDATUMS.map((r) => r.datum)].sort()).toEqual(RIJDATUMS.map((r) => r.datum))

    for (const rijdatum of RIJDATUMS) {
      const verwacht = rijdatum.datum === '2026-09-06' ? 0 : 4
      expect(rijdatum.rijders, rijdatum.datum).toHaveLength(verwacht)
    }
  })

  /**
   * De sterkste controle op een overtikfout: het rijschema is één rondgang
   * langs drieëntwintig man, die na de zesde wedstrijd opnieuw begint. Eén
   * verkeerd overgenomen naam breekt hem.
   */
  it('is een gesloten rondgang van drieëntwintig rijders', () => {
    expect(rijbeurten).toHaveLength(44)
    expect(new Set(rijbeurten.slice(0, 23)).size).toBe(23)
    expect(rijbeurten.slice(23)).toEqual(rijbeurten.slice(0, 21))
  })

  it('laat één materiaalspeler niet rijden, en dat is het rooster en geen omissie', () => {
    expect(rijbeurten).not.toContain(STEEKPROEF.materiaalZonderRij)
    expect(MATERIAALDUOS.flat()).toContain(STEEKPROEF.materiaalZonderRij)
  })

  // De vorige controle bewaakt dat elke roepnaam precies één spelersrij
  // vindt, maar niet het omgekeerde: zonder deze test zouden twee roepnamen
  // (bijvoorbeeld twee spelers met dezelfde voornaam) ongemerkt naar
  // dezelfde databasenaam kunnen wijzen, waarna ze hetzelfde spelers-id
  // delen en de omgekeerde kaart in scripts/rooster.ts samenklapt.
  it('wijst met geen twee roepnamen naar dezelfde spelersrij', () => {
    // Vierentwintig: drieëntwintig verschillende databasenamen plus de ene
    // `null` van de speler die nog geen lid is.
    expect(new Set(Object.values(ROEPNAMEN)).size).toBe(24)
  })

  it('kent elke naam uit beide tabellen', () => {
    for (const naam of [...MATERIAALDUOS.flat(), ...rijbeurten]) {
      expect(ROEPNAMEN, naam).toHaveProperty(naam)
    }
    expect(Object.keys(ROEPNAMEN)).toHaveLength(24)
  })

  // Wie geen rij heeft is een afspraak en geen ongeluk; zie scripts/rooster.ts.
  it('legt vast dat precies één speler nog geen lid is', () => {
    const zonderRij = Object.entries(ROEPNAMEN)
      .filter(([, databasenaam]) => databasenaam === null)
      .map(([roepnaam]) => roepnaam)

    expect(zonderRij).toEqual([STEEKPROEF.nogGeenLid])
  })
})
