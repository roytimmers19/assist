/**
 * Zet het rij- en materiaalrooster van seizoen 2026-2027
 * (`scripts/seizoen.json`) op de agenda-events in de database.
 *
 * `npm run rooster -- --droog` drukt af wat er zou gebeuren en schrijft
 * niets. `npm run rooster` schrijft. Wijkt de agenda af van het papier — een
 * rijdatum zonder wedstrijd, met meerdere wedstrijden, of met een
 * thuiswedstrijd — dan stopt het script en wordt er niets weggeschreven, ook
 * niet het deel dat wél klopt: bij een agenda die afwijkt van het papier wil
 * je eerst weten waarom voordat er iets in de database komt.
 */
import { asc } from 'drizzle-orm'
import { bewaarToewijzingen } from '../lib/db/diensten'
import { events, spelers } from '../lib/db/schema'
import { dagVan } from '../lib/domein/afwezigheid'
import { bouwNamenkaart, koppelRooster } from '../lib/domein/dienstrooster'
import { eventTitel } from '../lib/weergave/namen'
import { scriptDb } from './_db'
import { laadSeizoen } from './_seizoen'

const {
  seizoen: SEIZOEN,
  materiaalduos: MATERIAALDUOS,
  rijdatums: RIJDATUMS,
  roepnamen: ROEPNAMEN,
} = laadSeizoen()

const db = scriptDb()

const droog = process.argv.includes('--droog')

const [agenda, alleSpelers] = await Promise.all([
  db.select().from(events).orderBy(asc(events.startOp)),
  db.select().from(spelers),
])

const { spelerIdVan, nogGeenLid, fouten: naamfouten } = bouwNamenkaart(ROEPNAMEN, alleSpelers)

const { toewijzingen, overgeslagen, fouten } = koppelRooster({
  events: agenda.map((e) => ({
    id: e.id,
    type: e.type,
    thuis: e.thuis,
    startOp: e.startOp,
    afgelast: e.status === 'afgelast',
  })),
  duos: MATERIAALDUOS,
  rijdatums: RIJDATUMS,
  spelerIdVan,
  seizoen: SEIZOEN,
})

const alleFouten = [...naamfouten, ...fouten]
if (alleFouten.length > 0) {
  console.error('Er klopt iets niet. Er is niets weggeschreven:')
  for (const fout of alleFouten) console.error(`  - ${fout}`)
  process.exit(1)
}

// Terug van spelersrij naar roepnaam, zodat de afdruk naast de foto te leggen is.
const roepnaamVan = new Map([...spelerIdVan].map(([roepnaam, id]) => [id, roepnaam]))

const perEvent = new Map<string, { materiaal: string[]; rijden: string[] }>()
for (const t of toewijzingen) {
  const regel = perEvent.get(t.eventId) ?? { materiaal: [], rijden: [] }
  regel[t.soort].push(roepnaamVan.get(t.spelerId) ?? '?')
  perEvent.set(t.eventId, regel)
}

for (const event of agenda) {
  const regel = perEvent.get(event.id)
  if (!regel) continue
  const rijdeel = regel.rijden.length > 0 ? `   rijden: ${regel.rijden.join(', ')}` : ''
  console.log(
    `${dagVan(event.startOp)}  ${eventTitel(event).padEnd(34)}` +
      `materiaal: ${regel.materiaal.join(', ').padEnd(22)}${rijdeel}`,
  )
}

if (nogGeenLid.length > 0) {
  console.log(`\nNog geen lid, dus overgeslagen: ${nogGeenLid.join(', ')}`)
}

const zonderNaam = overgeslagen.filter((o) => o.reden === 'onbekende-naam')
const zonderWeek = overgeslagen.filter((o) => o.reden === 'week-staat-niet-op-het-rooster')
const buitenSeizoen = overgeslagen.filter((o) => o.reden === 'buiten-het-seizoen')
console.log(`Plekken die daardoor leeg blijven: ${zonderNaam.length}`)
console.log(`Events in een week die niet op het rooster staat: ${zonderWeek.length}`)
console.log(`Events buiten het seizoen: ${buitenSeizoen.length}`)

if (droog) {
  console.log(`\nDroog gedraaid: ${toewijzingen.length} toewijzingen, er is niets weggeschreven.`)
  process.exit(0)
}

const nieuw = await bewaarToewijzingen(db, toewijzingen, null)
console.log(`\n${nieuw} nieuw weggeschreven, ${toewijzingen.length - nieuw} stonden er al.`)
process.exit(0)
