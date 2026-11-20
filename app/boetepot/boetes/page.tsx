import { inArray } from 'drizzle-orm'
import { DateTime } from 'luxon'
import Link from 'next/link'
import {
  bevestigVoorstelAlsGever,
  laatVoorstelVallenAlsGever,
  trekBoeteInAlsGever,
} from '@/app/acties/boetepot'
import { Knop } from '@/app/_onderdelen/Knop'
import { Schil } from '@/app/_onderdelen/Schil'
import { vereisSpeler } from '@/lib/auth/sessie'
import { leesBoetes, leesVoorstelInvoer } from '@/lib/db/boetepot'
import { db } from '@/lib/db/client'
import { events } from '@/lib/db/schema'
import { leesAlleSpelers } from '@/lib/db/spelers'
import { type Boete, huidigSeizoen, seizoenVan } from '@/lib/domein/boetepot'
import { voorstellen } from '@/lib/domein/voorstellen'
import { alsEuro } from '@/lib/weergave/geld'
import { eventTitel } from '@/lib/weergave/namen'
import { alsDagZonderTijd } from '@/lib/weergave/tijd'
import { Onderdelen } from '../_onderdelen/Onderdelen'

export const dynamic = 'force-dynamic'

const kleineKnop =
  'min-h-11 rounded-xl border border-rand px-3 text-xs text-zacht transition-colors hover:border-club-op/60 hover:text-tekst'

/** Boetes die in één keer aan meerdere spelers werden gegeven, staan op één regel. */
function groepeer(boetes: Boete[]): Boete[][] {
  const groepen = new Map<string, Boete[]>()
  for (const b of boetes) {
    const sleutel = [b.omschrijving, b.bedragCent, b.datum, b.gegevenOp.getTime(), b.ingetrokkenOp !== null].join('|')
    groepen.set(sleutel, [...(groepen.get(sleutel) ?? []), b])
  }
  return [...groepen.values()]
}

function korteDag(datum: string): string {
  return DateTime.fromISO(datum, { locale: 'nl' }).toFormat('ccc d LLL')
}

function maand(datum: string): string {
  return DateTime.fromISO(datum, { locale: 'nl' }).toFormat('LLLL yyyy')
}

export default async function Boetes() {
  const speler = await vereisSpeler()
  const verbinding = db()
  const [boetes, spelers] = await Promise.all([leesBoetes(verbinding), leesAlleSpelers(verbinding)])
  const naamVan = new Map(spelers.map((s) => [s.id, s.weergavenaam ?? s.naam]))

  const voorgesteld = speler.magBoetesGeven ? voorstellen(await leesVoorstelInvoer(verbinding)) : []
  const eventRijen =
    voorgesteld.length > 0
      ? await verbinding
          .select()
          .from(events)
          .where(inArray(events.id, voorgesteld.map((v) => v.eventId)))
      : []
  const eventVan = new Map(eventRijen.map((e) => [e.id, e]))

  const seizoen = huidigSeizoen(new Date())
  const ditSeizoen = boetes
    .filter((b) => b.status === 'telt' && seizoenVan(b.datum) === seizoen)
    .sort((a, b) => b.datum.localeCompare(a.datum) || b.gegevenOp.getTime() - a.gegevenOp.getTime())

  const perMaand = new Map<string, Boete[][]>()
  for (const groep of groepeer(ditSeizoen)) {
    const kop = maand(groep[0].datum)
    perMaand.set(kop, [...(perMaand.get(kop) ?? []), groep])
  }

  return (
    <Schil naam={speler.naam} isLeider={speler.magLeiden} tab="boetepot">
      <Onderdelen actief="boetes" magAfrekenen={speler.magAfrekenen} />

      {voorgesteld.length > 0 && (
        <section className="rounded-2xl border border-club-op/50 bg-club/10 p-4">
          <h2 className="bovenkop text-club-op">
            Voorgesteld <span className="cijfers text-tekst">{voorgesteld.length}</span>
          </h2>
          <ul className="mt-3 flex flex-col gap-5">
            {voorgesteld.map((v) => {
              const event = eventVan.get(v.eventId)
              return (
                <li key={`${v.eventId}:${v.spelerId}`}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="kopregel text-base">{naamVan.get(v.spelerId)}</p>
                    <p className="uithangbord cijfers text-lg">{alsEuro(v.bedragCent)}</p>
                  </div>
                  <p className="mt-1 text-sm text-zacht">
                    {v.omschrijving}
                    {event && (
                      <>
                        {' '}
                        voor {alsDagZonderTijd(event.startOp)}, {eventTitel(event)}
                      </>
                    )}
                  </p>
                  <p className="mt-0.5 text-sm text-zacht">
                    Afgemeld op {alsDagZonderTijd(v.afgemeldOp)}
                    {v.reden && <>: “{v.reden}”</>}
                  </p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <form action={bevestigVoorstelAlsGever}>
                      <input type="hidden" name="eventId" value={v.eventId} />
                      <input type="hidden" name="spelerId" value={v.spelerId} />
                      <Knop toon="club">Bevestigen</Knop>
                    </form>
                    <form action={laatVoorstelVallenAlsGever}>
                      <input type="hidden" name="eventId" value={v.eventId} />
                      <input type="hidden" name="spelerId" value={v.spelerId} />
                      <Knop toon="omlijnd">Laten vallen</Knop>
                    </form>
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      {speler.magBoetesGeven && (
        <Link
          href="/boetepot/geven"
          className="kopregel grid min-h-11 place-items-center rounded-xl bg-club text-sm text-white transition-colors hover:bg-club/90"
        >
          Boete geven
        </Link>
      )}

      {perMaand.size === 0 && (
        <p className="rounded-xl border border-rand bg-paneel px-4 py-3 text-sm text-zacht">
          Er zijn dit seizoen nog geen boetes gegeven.
        </p>
      )}

      {[...perMaand.entries()].map(([kop, groepen]) => (
        <section key={kop} className="flex flex-col gap-2">
          <h2 className="bovenkop text-zacht">{kop}</h2>
          <ul className="flex flex-col">
            {groepen.map((groep) => {
              const eerste = groep[0]
              const ingetrokken = eerste.ingetrokkenOp !== null
              const namen = groep.map((b) => naamVan.get(b.spelerId) ?? '?').join(', ')
              const regel = (
                <>
                  <span
                    className={`cijfers w-[4.75rem] shrink-0 whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.06em] ${
                      ingetrokken ? 'text-zacht/60' : 'text-zacht'
                    }`}
                  >
                    {korteDag(eerste.datum)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className={`kopregel block truncate text-sm ${ingetrokken ? 'text-zacht line-through' : ''}`}
                    >
                      {namen}
                    </span>
                    <span className="block truncate text-xs text-zacht">
                      {eerste.omschrijving}
                      {groep.length > 1 && ' · elk'}
                      {ingetrokken && ' · ingetrokken'}
                    </span>
                  </span>
                  <span className={`cijfers text-sm ${ingetrokken ? 'text-zacht line-through' : ''}`}>
                    {alsEuro(eerste.bedragCent)}
                  </span>
                </>
              )

              return (
                <li key={eerste.id} className="border-b border-rand/60 last:border-b-0">
                  {speler.magBoetesGeven && !ingetrokken ? (
                    <details className="group">
                      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 py-2.5 [&::-webkit-details-marker]:hidden">
                        {regel}
                      </summary>
                      <div className="mb-3 flex flex-wrap gap-2 rounded-xl bg-paneel-op/50 p-3">
                        {groep.map((b) => (
                          <form key={b.id} action={trekBoeteInAlsGever}>
                            <input type="hidden" name="boeteId" value={b.id} />
                            <button className={kleineKnop}>
                              {groep.length > 1 ? `Trek in bij ${naamVan.get(b.spelerId)}` : 'Trek deze boete in'}
                            </button>
                          </form>
                        ))}
                      </div>
                    </details>
                  ) : (
                    <div className="flex min-h-12 items-center gap-3 py-2.5">{regel}</div>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </Schil>
  )
}
