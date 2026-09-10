import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sql } from 'drizzle-orm'
import { maakSchoon, testDb } from './opzet'
import { teamInstelling } from '@/lib/db/schema'

/** De route leest DATABASE_URL; in de test wijzen we die naar de testdatabase. */
process.env.DATABASE_URL = process.env.DATABASE_URL_TEST
process.env.CRON_SECRET = 'geheim-voor-de-test'

const { GET } = await import('@/app/api/cron/import/route')

function verzoek(header?: string) {
  return new Request('http://localhost/api/cron/import', {
    headers: header ? { authorization: header } : {},
  })
}

describe('GET /api/cron/import', () => {
  beforeEach(async () => {
    await maakSchoon()
    await testDb.execute(sql`truncate table team_instelling`)
    await testDb.insert(teamInstelling).values({
      id: 1,
      teamnaam: 'SV Voorbeeld 2 (zon)',
      icsUrl: 'http://voorbeeld.test/ical',
      teamcode: 'VB2',
    })
    vi.restoreAllMocks()
  })

  it('weigert een verzoek zonder geheim', async () => {
    const antwoord = await GET(verzoek())
    expect(antwoord.status).toBe(401)
  })

  it('weigert een verzoek met het verkeerde geheim', async () => {
    const antwoord = await GET(verzoek('Bearer fout'))
    expect(antwoord.status).toBe(401)
  })

  it('laat een verzoek met het juiste geheim door', async () => {
    // De feed halen we niet echt op tijdens de test.
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('BEGIN:VCALENDAR\r\nEND:VCALENDAR', { status: 200 }),
    )
    const antwoord = await GET(verzoek('Bearer geheim-voor-de-test'))
    expect(antwoord.status).toBe(200)
  })
})
