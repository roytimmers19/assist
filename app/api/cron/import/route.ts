import { db } from '@/lib/db/client'
import { schrijfImportRun } from '@/lib/db/importruns'
import { leesTeamInstelling } from '@/lib/db/instellingen'
import { haalFeedOp } from '@/lib/import/ophalen'
import { voerImportUit } from '@/lib/import/uitvoeren'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function GET(verzoek: Request) {
  const geheim = process.env.CRON_SECRET
  if (!geheim) return Response.json({ fout: 'CRON_SECRET ontbreekt' }, { status: 500 })

  if (verzoek.headers.get('authorization') !== `Bearer ${geheim}`) {
    return Response.json({ fout: 'Geen toegang' }, { status: 401 })
  }

  const verbinding = db()
  const gestartOp = new Date()

  try {
    const { icsUrl } = await leesTeamInstelling(verbinding)
    const feed = await haalFeedOp(icsUrl)
    const uitkomst = await voerImportUit(verbinding, feed, new Date())
    return Response.json(uitkomst)
  } catch (fout) {
    const melding = fout instanceof Error ? fout.message : 'Onbekende fout'
    await schrijfImportRun(verbinding, {
      status: 'fout',
      gestartOp,
      aantalGelezen: 0,
      aantalNieuw: 0,
      aantalBijgewerkt: 0,
      aantalAfgelast: 0,
      aantalOvergeslagen: 0,
      melding,
    })
    // 200, niet 500: de run is netjes gelogd en Vercel hoeft niet opnieuw te proberen.
    return Response.json({ status: 'fout', melding })
  }
}
