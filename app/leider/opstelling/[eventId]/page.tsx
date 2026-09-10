import { eq } from 'drizzle-orm'
import { notFound } from 'next/navigation'
import { Knop } from '@/app/_onderdelen/Knop'
import { Schil } from '@/app/_onderdelen/Schil'
import { trekIn } from '@/app/acties/opstelling'
import { DeelPlaatKnop } from '@/app/leider/_onderdelen/DeelPlaatKnop'
import { vereisLeider } from '@/lib/auth/sessie'
import { db } from '@/lib/db/client'
import { leesOpstellingWeergave } from '@/lib/db/opstelling'
import { events } from '@/lib/db/schema'
import { STANDAARDFORMATIE } from '@/lib/domein/formaties'
import { bepaalAanwezigen } from '@/lib/domein/opstelling'
import { eventTitel } from '@/lib/weergave/namen'
import { alsDagEnTijd } from '@/lib/weergave/tijd'
import { Veldbewerker, type Bezetting } from './_onderdelen/Veldbewerker'

export const dynamic = 'force-dynamic'

export default async function Opstellingsscherm({
  params,
}: {
  params: Promise<{ eventId: string }>
}) {
  const leider = await vereisLeider()
  const { eventId } = await params
  const verbinding = db()

  const [event] = await verbinding.select().from(events).where(eq(events.id, eventId))
  if (!event || event.type !== 'wedstrijd') notFound()

  const gelezen = await leesOpstellingWeergave(verbinding, eventId)
  const { plekken, weergave, stand, kandidaten } = gelezen
  const komt = bepaalAanwezigen(stand)
  const formatie = gelezen.opstelling?.formatie ?? STANDAARDFORMATIE

  // Met een lus in plaats van Object.fromEntries: die geeft een sleuteltype
  // string terug en dat past niet op Record<number, Bezetting>.
  const beginVeld: Record<number, Bezetting> = {}
  for (const plek of plekken) {
    if (plek.slot === null) continue
    beginVeld[plek.slot] = {
      spelerId: plek.spelerId,
      gastnaam: plek.gastnaam,
      gastnummer: plek.gastnummer,
    }
  }
  const beginGasten = plekken
    .filter((p) => p.slot === null)
    .map((p) => ({ spelerId: null, gastnaam: p.gastnaam, gastnummer: p.gastnummer }))

  const gewaarschuwd = weergave.basis.filter((r) => r.gewaarschuwd)

  const bestandsnaam = `opstelling-${eventTitel(event)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')}.png`

  return (
    <Schil naam={leider.naam} isLeider tab="week">
      <div>
        <p className="bovenkop text-zacht">{alsDagEnTijd(event.startOp)}</p>
        <h1 className="uithangbord mt-1 text-2xl">{eventTitel(event)}</h1>
      </div>

      {/* Zonder deze regel zegt dit scherm nergens of je aan een concept of aan
          iets werkt dat het team al ziet. */}
      {gelezen.opstelling && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rand bg-paneel px-4 py-3">
          {gelezen.opstelling.status === 'gepubliceerd' ? (
            <p className="text-sm">
              <span className="bovenkop text-komt-op">Gepubliceerd</span>{' '}
              <span className="text-zacht">— iedereen ziet hem</span>
            </p>
          ) : (
            <p className="text-sm">
              <span className="bovenkop text-zacht">Concept</span>{' '}
              <span className="text-zacht">— alleen jij ziet hem</span>
            </p>
          )}

          {gelezen.opstelling.status === 'gepubliceerd' && (
            <form action={trekIn.bind(null, eventId)}>
              <Knop toon="omlijnd" vol={false}>
                Intrekken
              </Knop>
            </form>
          )}
        </div>
      )}

      {gewaarschuwd.length > 0 && (
        <p role="alert" className="rounded-xl bg-weg/15 px-3 py-2 text-sm text-weg-op">
          {gewaarschuwd.map((r) => r.naam).join(', ')} staat opgesteld maar is er niet bij. Zet er
          iemand anders neer.
        </p>
      )}

      <Veldbewerker
        eventId={eventId}
        gewaarschuwd={gewaarschuwd.map((r) => r.spelerId as string)}
        beginFormatie={formatie}
        beginVeld={beginVeld}
        beginGasten={beginGasten}
        kandidaten={kandidaten.map((s) => ({
          id: s.id,
          naam: s.weergavenaam ?? s.naam,
          rugnummer: s.rugnummer,
          komt: komt.has(s.id),
        }))}
      />

      {plekken.length > 0 && (
        <DeelPlaatKnop
          bron={`/leider/opstelling/${eventId}/afbeelding`}
          bestandsnaam={bestandsnaam}
          titel={eventTitel(event)}
        />
      )}
    </Schil>
  )
}
