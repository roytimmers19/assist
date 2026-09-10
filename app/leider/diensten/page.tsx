import { Knop } from '@/app/_onderdelen/Knop'
import { Schil } from '@/app/_onderdelen/Schil'
import {
  haalDienstWegAlsLeider,
  verdeelSeizoen,
  wijsDienstToeAlsLeider,
} from '@/app/acties/diensten'
import { vereisLeider } from '@/lib/auth/sessie'
import { leesKomendeAgenda } from '@/lib/db/aanwezigheid'
import { db } from '@/lib/db/client'
import { leesDiensten } from '@/lib/db/diensten'
import { leesActieveSpelers } from '@/lib/db/spelers'
import { type Dienstsoort, aantalNodig, magRijdienst } from '@/lib/domein/diensten'
import { eventTitel } from '@/lib/weergave/namen'
import { alsDagEnTijd } from '@/lib/weergave/tijd'

export const dynamic = 'force-dynamic'

export default async function Dienstrooster() {
  const leider = await vereisLeider()
  const verbinding = db()

  const [komend, selectie] = await Promise.all([
    leesKomendeAgenda(verbinding, new Date()),
    leesActieveSpelers(verbinding),
  ])
  const perEvent = await leesDiensten(
    verbinding,
    komend.map((e) => e.id),
  )
  const naamVan = new Map(selectie.map((s) => [s.id, s.weergavenaam ?? s.naam]))

  return (
    <Schil naam={leider.naam} isLeider tab="week" breed>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="uithangbord text-[2rem]">Dienstrooster</h1>
          <p className="mt-1 text-sm text-zacht">
            Twee man materiaaldienst bij elk event, vier rijders bij elke uitwedstrijd.
          </p>
        </div>
        <form action={verdeelSeizoen}>
          <Knop toon="omlijnd" vol={false}>
            Verdeel het seizoen
          </Knop>
        </form>
      </div>

      <p className="text-xs text-zacht">
        Het rooster van dit seizoen komt van het papieren schema. Verdelen vult alleen lege plekken
        en laat staan wat er staat — maar wie het zo invult, staat niet op het papier.
      </p>

      <ul className="flex flex-col gap-3">
        {komend.map((event) => {
          const dienstEvent = {
            id: event.id,
            type: event.type,
            thuis: event.thuis,
            afgelast: event.status === 'afgelast',
          }
          const rijen = perEvent.get(event.id) ?? []
          const soorten: Dienstsoort[] = magRijdienst(dienstEvent)
            ? ['materiaal', 'rijden']
            : ['materiaal']

          return (
            <li key={event.id} className="rounded-2xl border border-rand bg-paneel p-4">
              <p className="bovenkop text-zacht">{alsDagEnTijd(event.startOp)}</p>
              <h2 className="kopregel mt-0.5 text-base">
                {eventTitel(event)}
                {/* Wel tonen en wel aanpasbaar: het rooster gaat nooit op slot. */}
                {event.status === 'afgelast' && (
                  <span className="bovenkop ml-2 rounded-full bg-weg/15 px-2.5 py-1 text-weg-op">
                    afgelast
                  </span>
                )}
              </h2>

              <div className="mt-3 flex flex-col gap-3">
                {soorten.map((soort) => {
                  const staan = rijen.filter((r) => r.soort === soort)
                  const nodig = aantalNodig(dienstEvent, soort)
                  const compleet = staan.length >= nodig
                  const vrij = selectie.filter((s) => !staan.some((r) => r.spelerId === s.id))

                  return (
                    <div key={soort}>
                      <p className="bovenkop text-zacht">
                        {soort === 'materiaal' ? 'Materiaaldienst' : 'Rijden'}{' '}
                        <span className={compleet ? 'text-komt-op' : 'text-weg-op'}>
                          {staan.length} van de {nodig}
                        </span>
                      </p>

                      <ul className="mt-1 flex flex-wrap gap-2">
                        {staan.map((rij) => (
                          <li key={rij.id}>
                            <form action={haalDienstWegAlsLeider}>
                              <input type="hidden" name="eventId" value={event.id} />
                              <input type="hidden" name="spelerId" value={rij.spelerId} />
                              <input type="hidden" name="soort" value={soort} />
                              <button className="min-h-11 rounded-full border border-rand bg-paneel-op px-3 text-sm">
                                {naamVan.get(rij.spelerId) ?? 'onbekend'}{' '}
                                <span className="text-zacht">×</span>
                              </button>
                            </form>
                          </li>
                        ))}
                      </ul>

                      <details className="mt-1">
                        <summary className="min-h-11 cursor-pointer list-none py-2 text-sm text-club-op [&::-webkit-details-marker]:hidden">
                          Iemand erbij
                        </summary>
                        <ul className="flex flex-wrap gap-2">
                          {vrij.map((speler) => (
                            <li key={speler.id}>
                              <form action={wijsDienstToeAlsLeider}>
                                <input type="hidden" name="eventId" value={event.id} />
                                <input type="hidden" name="spelerId" value={speler.id} />
                                <input type="hidden" name="soort" value={soort} />
                                <button className="min-h-11 rounded-full border border-rand px-3 text-sm text-zacht">
                                  {speler.weergavenaam ?? speler.naam}
                                </button>
                              </form>
                            </li>
                          ))}
                        </ul>
                      </details>
                    </div>
                  )
                })}
              </div>
            </li>
          )
        })}
      </ul>
    </Schil>
  )
}
