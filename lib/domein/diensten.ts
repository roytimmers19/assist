export type Dienstsoort = 'materiaal' | 'rijden'

const SOORTEN: Dienstsoort[] = ['materiaal', 'rijden']

export type Toewijzing = { eventId: string; spelerId: string; soort: Dienstsoort }

/** Wat het verdelen van een event moet weten. Bewust geen hele eventrij. */
export type DienstEvent = {
  id: string
  type: 'training' | 'wedstrijd'
  thuis: boolean | null
  afgelast: boolean
}

/** Streefgetallen, geen wetten: meer mag, minder is zichtbaar maar niet fout. */
const MATERIAAL_PER_EVENT = 2
const RIJDERS_PER_UITWEDSTRIJD = 4

/**
 * Bij een thuiswedstrijd rijdt niemand ergens heen. Is niet bekend of het
 * thuis of uit is — `thuis` is nullbaar — dan wordt er niet geraden.
 *
 * Of het event is afgelast doet hier niet ter zake: een afgelaste uitwedstrijd
 * blijft een uitwedstrijd, en het rooster blijft aanpasbaar. Alleen het
 * verdelen slaat afgelaste events over.
 */
export function magRijdienst(event: DienstEvent): boolean {
  return event.type === 'wedstrijd' && event.thuis === false
}

export function aantalNodig(event: DienstEvent, soort: Dienstsoort): number {
  if (soort === 'rijden') return magRijdienst(event) ? RIJDERS_PER_UITWEDSTRIJD : 0
  return MATERIAAL_PER_EVENT
}

/**
 * Deelt de toerbeurt uit over de komende events. Geeft alléén de nieuwe
 * toewijzingen terug: er wordt nooit iets overschreven of weggehaald, zodat
 * de leider hier zonder angst nog eens op kan drukken nadat hij correcties
 * heeft aangebracht.
 *
 * Elk soort heeft zijn eigen wijzer door dezelfde spelerslijst. Eén gedeelde
 * wijzer zou materiaal- en rijdienst door elkaar schuiven en de verdeling
 * scheeftrekken.
 */
export function verdeelDiensten(invoer: {
  spelerIds: string[]
  events: DienstEvent[]
  bestaand: Toewijzing[]
}): Toewijzing[] {
  const nieuw: Toewijzing[] = []
  if (invoer.spelerIds.length === 0) return nieuw

  const wijzer: Record<Dienstsoort, number> = { materiaal: 0, rijden: 0 }

  const sleutel = (eventId: string, soort: Dienstsoort) => `${eventId}:${soort}`
  const bezet = new Map<string, Set<string>>()
  for (const t of invoer.bestaand) {
    const s = sleutel(t.eventId, t.soort)
    const set = bezet.get(s) ?? new Set<string>()
    set.add(t.spelerId)
    bezet.set(s, set)
  }

  for (const event of invoer.events) {
    // Een afgelast event vult zichzelf niet; met de hand aanpassen mag wel.
    if (event.afgelast) continue

    for (const soort of SOORTEN) {
      const s = sleutel(event.id, soort)
      const staat = bezet.get(s) ?? new Set<string>()
      bezet.set(s, staat)

      let tekort = aantalNodig(event, soort) - staat.size
      // De teller loopt hoogstens één ronde langs de selectie: zijn er minder
      // spelers dan plekken, dan wordt het gedeeltelijk gevuld in plaats van
      // dat de lus vastloopt.
      let pogingen = 0

      while (tekort > 0 && pogingen < invoer.spelerIds.length) {
        const kandidaat = invoer.spelerIds[wijzer[soort] % invoer.spelerIds.length]
        wijzer[soort] += 1
        pogingen += 1

        // Wie hier al stond verliest wel zijn beurt: hij doet deze dienst al.
        if (staat.has(kandidaat)) continue

        staat.add(kandidaat)
        nieuw.push({ eventId: event.id, spelerId: kandidaat, soort })
        tekort -= 1
      }
    }
  }

  return nieuw
}
