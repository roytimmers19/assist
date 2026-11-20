// De eenmalige overstap uit de oude boeteapp.
//
//   npx tsx scripts/boetepot-overstap.ts           kijkt alleen: wat zou er overgaan?
//   npx tsx scripts/boetepot-overstap.ts --echt    zet het echt over, in één keer
//
// Leest scripts/boetepot-overstap.json, dat Git negeert: er staan echte namen
// in. De vorm staat in scripts/boetepot-overstap.voorbeeld.json.
import { readFileSync } from 'node:fs'
import { leesBoetes, zetOverstapIn } from '../lib/db/boetepot'
import { leesAlleSpelers } from '../lib/db/spelers'
import { type Boete, huidigSeizoen, openstaandCent, ranglijst } from '../lib/domein/boetepot'
import { type OverstapInvoer, planOverstap } from '../lib/domein/overstap'
import { alsEuro } from '../lib/weergave/geld'
import { scriptDb } from './_db'

const echt = process.argv.includes('--echt')
const db = scriptDb()
const invoer = JSON.parse(readFileSync('scripts/boetepot-overstap.json', 'utf8')) as OverstapInvoer
const spelers = await leesAlleSpelers(db)
const plan = planOverstap(invoer, spelers)

if ('fouten' in plan) {
  console.error('Er gaat niets over. Dit klopt niet:')
  for (const fout of plan.fouten) console.error(`  - ${fout}`)
  process.exit(1)
}

// Laat zien wat de ranglijst en het afrekenen ermee worden, zodat je het met
// de oude app kunt vergelijken voordat er iets verandert.
const moment = new Date()
const alsBoetes: Boete[] = plan.rijen.map((r, i) => ({
  id: String(i),
  spelerId: r.spelerId,
  omschrijving: r.omschrijving,
  bedragCent: r.bedragCent,
  aantal: 1,
  datum: r.datum,
  eventId: null,
  status: 'telt',
  gegevenOp: moment,
  ingetrokkenOp: null,
  betaaldOp: r.betaald ? moment : null,
}))
const namen = spelers.map((s) => ({ id: s.id, naam: s.weergavenaam ?? s.naam }))
const { plekken } = ranglijst(alsBoetes, namen, huidigSeizoen(moment))

console.log(`${plan.rijen.length} boetes van ${new Set(plan.rijen.map((r) => r.spelerId)).size} spelers.\n`)
console.log('Ranglijst van dit seizoen:')
for (const p of plekken) console.log(`  ${String(p.plek).padStart(2)}. ${p.naam.padEnd(20)} ${alsEuro(p.totaalCent)}`)
console.log('\nMoet nog betalen:')
for (const s of namen) {
  const open = openstaandCent(s.id, alsBoetes)
  if (open > 0) console.log(`  ${s.naam.padEnd(24)} ${alsEuro(open)}`)
}

if (!echt) {
  console.log('\nDit was een proef; er is niets veranderd. Klopt het, draai dan opnieuw met --echt.')
  process.exit(0)
}

if ((await leesBoetes(db)).length > 0) {
  console.error('\nEr staan al boetes in de boetepot. De overstap draait alleen in een lege.')
  process.exit(1)
}
await zetOverstapIn(db, plan.rijen, moment)
console.log('\nOvergezet.')
process.exit(0)
