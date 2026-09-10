import { eq } from 'drizzle-orm'
import type { Db } from './client'
import { eventtypeInstelling, teamInstelling } from './schema'

export async function leesTeamInstelling(db: Db) {
  const [rij] = await db.select().from(teamInstelling).where(eq(teamInstelling.id, 1))
  if (!rij) throw new Error('team_instelling ontbreekt — draai npm run seed')
  return {
    teamnaam: rij.teamnaam,
    icsUrl: rij.icsUrl,
    teamcode: rij.teamcode,
    automatischToelatenTot: rij.automatischToelatenTot,
  }
}

/** Leeg sluit de deur; een tijdstip in de toekomst zet hem open. */
export async function zetAutomatischToelaten(db: Db, tot: Date | null): Promise<void> {
  await db.update(teamInstelling).set({ automatischToelatenTot: tot }).where(eq(teamInstelling.id, 1))
}

export type DeadlineUren = Record<'training' | 'wedstrijd', number>

export async function leesDeadlineUren(db: Db): Promise<DeadlineUren> {
  const rijen = await db.select().from(eventtypeInstelling)
  const uit: DeadlineUren = { training: 24, wedstrijd: 48 }
  for (const rij of rijen) uit[rij.type] = rij.deadlineUrenVoorAanvang
  return uit
}
