import { DateTime } from 'luxon'
import { dagVan } from './afwezigheid'
import { type Dienstsoort, type Toewijzing, magRijdienst } from './diensten'
import { ZONE } from './tijd'

/** Twee man die één week materiaaldienst hebben, met hun roepnaam. */
export type Weekduo = readonly [string, string]

/** Eén regel uit het rijschema: de dag, en wie er die dag rijden. */
export type Rijdatum = { datum: string; rijders: readonly string[] }

/**
 * Het venster waar een afschrift over gaat, als ISO-dagen. Een event
 * daarbuiten hoort bij een ander seizoen en krijgt niets van dít papier —
 * zonder venster stapelt de eventtabel seizoenen op elkaar, en een event van
 * volgend jaar zou zomaar in dezelfde ISO-week vallen als vandaag.
 */
export type Seizoen = { van: string; tot: string }

/** Wat het koppelen van een event moet weten. Bewust geen hele eventrij. */
export type RoosterEvent = {
  id: string
  type: 'training' | 'wedstrijd'
  thuis: boolean | null
  startOp: Date
  /**
   * Nodig om een enkele afgelasting (die volgens het papier zijn rijders
   * houdt) te onderscheiden van een afgelasting náást een inhaalduel (waar
   * juist het inhaalduel de wedstrijd van die dag is).
   */
  afgelast: boolean
}

/**
 * Wat er bewust niet is toegewezen. Dit is iets anders dan een fout: een naam
 * die nog geen lid is en een week die niet op het papier staat zijn allebei
 * afgesproken gaten.
 */
export type Overgeslagen =
  | { reden: 'onbekende-naam'; roepnaam: string; eventId: string; soort: Dienstsoort }
  | { reden: 'week-staat-niet-op-het-rooster'; week: number; eventId: string }
  | { reden: 'buiten-het-seizoen'; eventId: string }

/**
 * Het ISO-weeknummer in Amsterdamse wandkloktijd. Nooit met UTC-dagen: een
 * event vroeg op maandag valt in UTC nog op zondag en zou dan een week te
 * vroeg vallen.
 */
export function isoWeekVan(startOp: Date): { jaar: number; week: number } {
  const dt = DateTime.fromJSDate(startOp).setZone(ZONE)
  return { jaar: dt.weekYear, week: dt.weekNumber }
}

/**
 * Het papieren rooster telt tweeënvijftig weken, maar dat is één korte rij die
 * rondgaat. Week 53 — die bestaat in een jaar als 2026 — staat er niet op en
 * krijgt dus niets.
 */
export function duoVanWeek(week: number, duos: readonly Weekduo[]): Weekduo | null {
  if (duos.length === 0) return null
  if (week < 1 || week > 52) return null
  return duos[(week - 1) % duos.length]
}

/** Wat er van het koppelen van roepnaam naar spelers-id overblijft. */
export type Namenkaart = {
  spelerIdVan: Map<string, string>
  nogGeenLid: string[]
  fouten: string[]
}

/**
 * Legt de roepnamen van het afschrift naast de echte spelersrijen. Een
 * databasenaam van `null` betekent dat de roepnaam met zoveel woorden nog
 * geen lid is: die hoort bij `nogGeenLid` en is geen fout. Elke andere
 * roepnaam moet precies één spelersrij vinden — geen of meerdere treffers
 * betekent dat iemand is hernoemd of dubbel staat, en dat is een fout die
 * niet stilzwijgend voorbij mag gaan.
 *
 * Verzamelt alle fouten in plaats van bij de eerste te stoppen: wat ermee
 * gebeurt is aan de aanroeper.
 */
export function bouwNamenkaart(
  roepnamen: Record<string, string | null>,
  spelers: readonly { id: string; naam: string }[],
): Namenkaart {
  const spelerIdVan = new Map<string, string>()
  const nogGeenLid: string[] = []
  const fouten: string[] = []

  for (const [roepnaam, databasenaam] of Object.entries(roepnamen)) {
    if (databasenaam === null) {
      nogGeenLid.push(roepnaam)
      continue
    }
    const treffers = spelers.filter((s) => s.naam.trim() === databasenaam.trim())
    if (treffers.length !== 1) {
      fouten.push(
        `${roepnaam}: ${treffers.length} spelers met de naam "${databasenaam}", verwacht er één.`,
      )
      continue
    }
    spelerIdVan.set(roepnaam, treffers[0].id)
  }

  return { spelerIdVan, nogGeenLid, fouten }
}

/**
 * Legt het afschrift van het papier op de agenda. Geeft toewijzingen terug in
 * de vorm die `bewaarToewijzingen` al aanneemt.
 *
 * Het verschil tussen `overgeslagen` en `fouten` is het hart hiervan.
 * Overgeslagen is afgesproken en gaat gewoon door. Een fout betekent dat de
 * agenda afwijkt van het papier, en dan moet er niets geschreven worden maar
 * iemand kijken.
 */
export function koppelRooster(invoer: {
  events: RoosterEvent[]
  duos: readonly Weekduo[]
  rijdatums: readonly Rijdatum[]
  spelerIdVan: Map<string, string>
  seizoen: Seizoen
}): { toewijzingen: Toewijzing[]; overgeslagen: Overgeslagen[]; fouten: string[] } {
  const toewijzingen: Toewijzing[] = []
  const overgeslagen: Overgeslagen[] = []
  const fouten: string[] = []

  function zet(eventId: string, roepnaam: string, soort: Dienstsoort) {
    const spelerId = invoer.spelerIdVan.get(roepnaam)
    if (spelerId === undefined) {
      overgeslagen.push({ reden: 'onbekende-naam', roepnaam, eventId, soort })
      return
    }
    toewijzingen.push({ eventId, spelerId, soort })
  }

  // ISO-dagen vergelijken op tekst zoals ze op datum vergelijken, dus dit is
  // geen datumrekenwerk. Een event buiten dit venster hoort bij een ander
  // seizoen en is overgeslagen, geen fout.
  const events: RoosterEvent[] = []
  for (const event of invoer.events) {
    const dag = dagVan(event.startOp)
    if (dag < invoer.seizoen.van || dag > invoer.seizoen.tot) {
      overgeslagen.push({ reden: 'buiten-het-seizoen', eventId: event.id })
      continue
    }
    events.push(event)
  }

  for (const event of events) {
    const { week } = isoWeekVan(event.startOp)
    const duo = duoVanWeek(week, invoer.duos)
    if (duo === null) {
      overgeslagen.push({ reden: 'week-staat-niet-op-het-rooster', week, eventId: event.id })
      continue
    }
    for (const roepnaam of duo) zet(event.id, roepnaam, 'materiaal')
  }

  for (const rijdatum of invoer.rijdatums) {
    let kandidaten = events.filter(
      (e) => e.type === 'wedstrijd' && dagVan(e.startOp) === rijdatum.datum,
    )

    // Een afgelaste wedstrijd houdt volgens het papier zijn rijders — behalve
    // als er een inhaalduel naast staat. Pas dan telt de afgelasting mee bij
    // het kiezen van de wedstrijd van die dag; staat er precies één op de
    // datum, afgelast of niet, dan is dat de wedstrijd van het rijschema.
    if (kandidaten.length > 1) {
      kandidaten = kandidaten.filter((e) => !e.afgelast)
    }

    if (kandidaten.length === 0) {
      fouten.push(
        `Het rijschema noemt ${rijdatum.datum}, maar op die dag staat geen wedstrijd in de agenda. ` +
          'Is de wedstrijd verzet, trek dan de datum in scripts/seizoen.json bij; is hij ' +
          'vervallen zonder vervanger, haal dan de regel daar weg.',
      )
      continue
    }
    if (kandidaten.length > 1) {
      fouten.push(
        `Op ${rijdatum.datum} staan ${kandidaten.length} wedstrijden; het rijschema rekent op ` +
          'één. Kijk of de agenda een dubbele regel heeft, of pas de datum in ' +
          'scripts/seizoen.json aan.',
      )
      continue
    }

    const event = kandidaten[0]
    if (!magRijdienst(event)) {
      fouten.push(
        `De wedstrijd op ${rijdatum.datum} is geen uitwedstrijd; daar rijdt niemand heen. Is de ` +
          'wedstrijd inmiddels verzet, pas dan de datum in scripts/seizoen.json aan.',
      )
      continue
    }

    for (const roepnaam of rijdatum.rijders) zet(event.id, roepnaam, 'rijden')
  }

  return { toewijzingen, overgeslagen, fouten }
}
