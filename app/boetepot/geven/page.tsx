import { and, asc, eq, gte, lte } from 'drizzle-orm'
import Link from 'next/link'
import { Schil } from '@/app/_onderdelen/Schil'
import { vereisBoeteGever } from '@/lib/auth/sessie'
import { leesBoetes, leesBoetesoorten } from '@/lib/db/boetepot'
import { db } from '@/lib/db/client'
import { events } from '@/lib/db/schema'
import { leesActieveSpelers } from '@/lib/db/spelers'
import { huidigSeizoen, opPopulariteit } from '@/lib/domein/boetepot'
import { eventTitel } from '@/lib/weergave/namen'
import { alsKorteDag } from '@/lib/weergave/tijd'
import { GeefFormulier } from './_onderdelen/GeefFormulier'

export const dynamic = 'force-dynamic'

const TWEE_WEKEN = 14 * 24 * 60 * 60 * 1000
const HALVE_DAG = 12 * 60 * 60 * 1000

function foutmelding(fout?: string): string | null {
  if (fout === 'wie') return 'Kies wie de boete krijgt.'
  if (fout === 'soort') return 'Kies waarvoor de boete is.'
  if (fout === 'omschrijving') return 'Schrijf op waarvoor de boete is.'
  if (fout === 'bedrag') return 'Vul een bedrag in, zoals 1,50.'
  if (fout === 'aantal') return 'Kies een aantal tussen 1 en 99.'
  if (fout === 'event') return 'Die training of wedstrijd bestaat niet meer. Kies een andere.'
  return null
}

export default async function BoeteGeven({
  searchParams,
}: {
  searchParams: Promise<{ fout?: string }>
}) {
  const speler = await vereisBoeteGever()
  const melding = foutmelding((await searchParams).fout)
  const verbinding = db()
  const nu = Date.now()

  const [spelers, soorten, boetes, recent] = await Promise.all([
    leesActieveSpelers(verbinding),
    leesBoetesoorten(verbinding),
    leesBoetes(verbinding),
    verbinding
      .select()
      .from(events)
      .where(
        and(
          gte(events.startOp, new Date(nu - TWEE_WEKEN)),
          lte(events.startOp, new Date(nu + HALVE_DAG)),
          eq(events.status, 'gepland'),
        ),
      )
      .orderBy(asc(events.startOp)),
  ])

  // Op rugnummer, zoals op het wedstrijdformulier; wie geen nummer heeft achteraan.
  const opNummer = spelers
    .map((s) => ({ id: s.id, naam: s.weergavenaam ?? s.naam, rugnummer: s.rugnummer }))
    .sort(
      (a, b) => (a.rugnummer ?? 999) - (b.rugnummer ?? 999) || a.naam.localeCompare(b.naam, 'nl'),
    )

  return (
    <Schil naam={speler.naam} isLeider={speler.magLeiden} tab="boetepot">
      <div>
        <Link href="/boetepot/boetes" className="text-sm text-club-op">
          ← Boetes
        </Link>
        <h1 className="uithangbord mt-2 text-[2.1rem]">Boete geven</h1>
      </div>

      {melding && (
        <p role="alert" className="rounded-xl bg-weg/15 px-3 py-2 text-sm text-weg-op">
          {melding}
        </p>
      )}

      <GeefFormulier
        spelers={opNummer}
        soorten={opPopulariteit(
          soorten.filter((s) => s.actief),
          boetes,
          huidigSeizoen(new Date()),
        ).map((s) => ({
          id: s.id,
          omschrijving: s.omschrijving,
          bedragCent: s.bedragCent,
          perStuk: s.perStuk,
        }))}
        events={recent
          .reverse()
          .map((e) => ({ id: e.id, label: `${eventTitel(e)}, ${alsKorteDag(e.startOp)}` }))}
      />
    </Schil>
  )
}
