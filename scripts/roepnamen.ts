/**
 * Zet de weergavenaam van elke speler op zijn roepnaam uit het rooster, zodat
 * het scherm dezelfde namen gebruikt als het papier. Komen twee spelers met
 * dezelfde voornaam voor, dan staat in het roosterbestand hoe ze op papier uit
 * elkaar gehouden worden.
 */
import { spelers } from '../lib/db/schema'
import { wijzigSpeler } from '../lib/db/spelers'
import { bouwNamenkaart } from '../lib/domein/dienstrooster'
import { scriptDb } from './_db'
import { laadSeizoen } from './_seizoen'

const { roepnamen: ROEPNAMEN } = laadSeizoen()

const db = scriptDb()

const droog = process.argv.includes('--droog')
const alleSpelers = await db.select().from(spelers)

const { spelerIdVan, nogGeenLid, fouten } = bouwNamenkaart(ROEPNAMEN, alleSpelers)

if (fouten.length > 0) {
  console.error('Er klopt iets niet. Er is niets gewijzigd:')
  for (const fout of fouten) console.error(`  - ${fout}`)
  process.exit(1)
}

if (nogGeenLid.length > 0) {
  console.log(`Nog geen lid, dus overgeslagen: ${nogGeenLid.join(', ')}`)
}

const spelerVanId = new Map(alleSpelers.map((s) => [s.id, s]))

// `overschrijft` is apart bijgehouden zodat een bewust gezette weergavenaam
// die wordt teruggedraaid nooit hetzelfde oogt als een leeg veld dat voor het
// eerst wordt ingevuld — een leider moet dat verschil in de uitvoer zien.
const teZetten: {
  id: string
  naam: string
  roepnaam: string
  huidig: string | null
  overschrijft: boolean
}[] = []
for (const [roepnaam, id] of spelerIdVan) {
  const speler = spelerVanId.get(id)
  if (!speler) continue
  if (speler.weergavenaam === roepnaam) continue
  teZetten.push({
    id: speler.id,
    naam: speler.naam,
    roepnaam,
    huidig: speler.weergavenaam,
    overschrijft: speler.weergavenaam !== null,
  })
}

for (const regel of teZetten) {
  if (regel.overschrijft) {
    console.log(`${regel.naam}  overschrijft "${regel.huidig}" -> ${regel.roepnaam}`)
  } else {
    console.log(`${regel.naam}  (leeg) -> ${regel.roepnaam}`)
  }
}

const overschrijvingen = teZetten.filter((regel) => regel.overschrijft).length

if (droog) {
  console.log(
    `\nDroog gedraaid: ${teZetten.length} weergavenamen zouden gezet worden, waarvan ` +
      `${overschrijvingen} een bestaande naam overschrijven. Er is niets gewijzigd.`,
  )
  process.exit(0)
}

for (const regel of teZetten) {
  await wijzigSpeler(db, regel.id, { weergavenaam: regel.roepnaam })
}

console.log(
  `\n${teZetten.length} weergavenamen gezet, waarvan ${overschrijvingen} een bestaande naam ` +
    'overschreven.',
)
process.exit(0)
