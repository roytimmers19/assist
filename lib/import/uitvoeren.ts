import type { Db } from '@/lib/db/client'
import { laadEventsVoorImport, voerImportPlanUit } from '@/lib/db/events'
import { schrijfImportRun } from '@/lib/db/importruns'
import { leesDeadlineUren, leesTeamInstelling } from '@/lib/db/instellingen'
import { parseIcs } from '@/lib/domein/ics'
import { beoordeelNoodrem, maakImportPlan } from '@/lib/domein/reconcile'

export type ImportUitkomst = {
  status: 'ok' | 'afgebroken'
  gelezen: number
  nieuw: number
  bijgewerkt: number
  afgelast: number
  overgeslagen: number
  melding: string | null
}

export async function voerImportUit(db: Db, feedTekst: string, nu: Date): Promise<ImportUitkomst> {
  const gestartOp = new Date()
  const { teamnaam } = await leesTeamInstelling(db)

  const gelezen = parseIcs(feedTekst, teamnaam)
  const bestaand = await laadEventsVoorImport(db)
  const plan = maakImportPlan(bestaand, gelezen.events, nu)
  const noodrem = beoordeelNoodrem(plan, bestaand, nu)

  if (noodrem.rem) {
    await schrijfImportRun(db, {
      status: 'afgebroken',
      gestartOp,
      aantalGelezen: gelezen.events.length,
      aantalNieuw: 0,
      aantalBijgewerkt: 0,
      aantalAfgelast: 0,
      aantalOvergeslagen: gelezen.overgeslagen,
      melding: noodrem.reden,
    })

    return {
      status: 'afgebroken',
      gelezen: gelezen.events.length,
      nieuw: 0,
      bijgewerkt: 0,
      afgelast: 0,
      overgeslagen: gelezen.overgeslagen,
      melding: noodrem.reden,
    }
  }

  const deadlineUren = await leesDeadlineUren(db)
  await voerImportPlanUit(db, plan, deadlineUren, nu)

  const waarschuwing = gelezen.waarschuwingen.length > 0 ? gelezen.waarschuwingen.join(' · ') : null

  await schrijfImportRun(db, {
    status: 'ok',
    gestartOp,
    aantalGelezen: gelezen.events.length,
    aantalNieuw: plan.nieuw.length,
    aantalBijgewerkt: plan.bijwerken.length,
    aantalAfgelast: plan.afgelasten.length,
    aantalOvergeslagen: gelezen.overgeslagen,
    melding: waarschuwing,
  })

  return {
    status: 'ok',
    gelezen: gelezen.events.length,
    nieuw: plan.nieuw.length,
    bijgewerkt: plan.bijwerken.length,
    afgelast: plan.afgelasten.length,
    overgeslagen: gelezen.overgeslagen,
    melding: waarschuwing,
  }
}
