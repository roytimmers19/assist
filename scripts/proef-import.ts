/**
 * Handmatige proef: haalt de echte feed op en importeert hem twee keer,
 * zodat je ziet dat een tweede import niets wijzigt. Niet nodig in productie —
 * daar doet de cron dit.
 *
 * Gebruik: npx tsx scripts/proef-import.ts
 */
import { maakDb } from '../lib/db/client'
import { leesTeamInstelling } from '../lib/db/instellingen'
import { haalFeedOp } from '../lib/import/ophalen'
import { voerImportUit } from '../lib/import/uitvoeren'
import { laadOmgeving } from '../lib/omgeving'

laadOmgeving()

const db = maakDb(process.env.DATABASE_URL!)
const { icsUrl, teamnaam } = await leesTeamInstelling(db)
console.log('bron :', icsUrl)
console.log('team :', teamnaam)

const feed = await haalFeedOp(icsUrl)
console.log('feed :', feed.length, 'tekens')
console.log('run 1:', JSON.stringify(await voerImportUit(db, feed, new Date())))
console.log('run 2:', JSON.stringify(await voerImportUit(db, feed, new Date())))

process.exit(0)
