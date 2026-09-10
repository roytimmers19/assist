import { maakUitnodiging } from '../lib/auth/uitnodiging'
import { spelers, teamInstelling } from '../lib/db/schema'
import { scriptDb } from './_db'

const db = scriptDb()

const [naam, email] = process.argv.slice(2)
if (!naam || !email) {
  throw new Error('Gebruik: npm run seed -- "Jouw Naam" jij@voorbeeld.nl')
}

await db
  .insert(teamInstelling)
  .values({
    id: 1,
    teamnaam: 'SV Voorbeeld 2 (zon)',
    icsUrl: 'http://www.svvoorbeeld.nl/agenda.ics',
    teamcode: 'VB2-2627',
  })
  .onConflictDoNothing()

const [leider] = await db
  .insert(spelers)
  .values({ naam, email, rol: 'leider', accountStatus: 'uitgenodigd', actief: true })
  .onConflictDoNothing()
  .returning()

if (leider) {
  const token = await maakUitnodiging(db, leider.id)
  console.log(`Uitnodiging voor ${naam}:`)
  console.log(`${process.env.BETTER_AUTH_URL}/uitnodiging/${token}`)
} else {
  console.log('Er stond al een speler met dat e-mailadres; niets aangemaakt.')
}

process.exit(0)
