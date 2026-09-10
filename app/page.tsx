import { EventRegel } from '@/app/_onderdelen/EventRegel'
import { MatchdayBlok } from '@/app/_onderdelen/MatchdayBlok'
import { Schil } from '@/app/_onderdelen/Schil'
import { Veld } from '@/app/_onderdelen/Veld'
import { vereisSpeler } from '@/lib/auth/sessie'
import { leesKomendeEvents, leesMeldingen } from '@/lib/db/aanwezigheid'
import { leesAfwezighedenTussen } from '@/lib/db/afwezigheid'
import { db } from '@/lib/db/client'
import { leesDiensten } from '@/lib/db/diensten'
import { leesOpstellingWeergave } from '@/lib/db/opstelling'
import { leesSpeler } from '@/lib/db/spelers'
import { actueleStand } from '@/lib/domein/aanwezigheid'
import { isAfwezigOp, selectieVoor } from '@/lib/domein/afwezigheid'
import { standaardVoor } from '@/lib/domein/beschikbaarheid'
import type { Dienstsoort } from '@/lib/domein/diensten'
import type { Status } from '@/lib/domein/types'

export const dynamic = 'force-dynamic'

export default async function Startpagina() {
  const speler = await vereisSpeler()
  const verbinding = db()

  // vereisSpeler heeft de rij al gevonden, dus deze kan niet leeg zijn; de
  // controle staat er zodat TypeScript het ook weet.
  const mij = await leesSpeler(verbinding, speler.id)
  if (!mij) return null

  const komend = await leesKomendeEvents(verbinding, new Date(), 6)
  const meldingen = await leesMeldingen(
    verbinding,
    komend.map((e) => e.id),
  )

  // Het venster van alle getoonde events: één keer lezen is genoeg.
  const periodes =
    komend.length > 0
      ? await leesAfwezighedenTussen(
          verbinding,
          komend[0].startOp,
          new Date(komend[komend.length - 1].startOp.getTime() + 24 * 60 * 60 * 1000),
        )
      : []
  const mijnPeriodes = periodes.filter((p) => p.spelerId === speler.id)

  const dienstenPerEvent = await leesDiensten(
    verbinding,
    komend.map((e) => e.id),
  )
  // Alleen die van hemzelf: andermans dienst maakt zijn scherm langer zonder
  // een vraag te beantwoorden.
  const mijnDiensten = new Map<string, Dienstsoort[]>(
    komend.map((e) => [
      e.id,
      (dienstenPerEvent.get(e.id) ?? [])
        .filter((d) => d.spelerId === speler.id)
        .map((d) => d.soort),
    ]),
  )

  const standPerEvent = new Map<string, Status | 'afwezig'>(
    komend.map((e) => [
      e.id,
      selectieVoor([speler.id], mijnPeriodes, e.startOp).length === 0
        ? 'afwezig'
        : actueleStand(
            [{ id: speler.id, standaard: standaardVoor(mij, e.type) }],
            meldingen.get(e.id) ?? [],
          )[0].status,
    ]),
  )

  const [eerste, ...rest] = komend

  const lopend = eerste
    ? (mijnPeriodes.find((p) => isAfwezigOp(p, eerste.startOp)) ?? null)
    : null

  const gelezen =
    eerste && eerste.type === 'wedstrijd'
      ? await leesOpstellingWeergave(verbinding, eerste.id)
      : null
  // Alleen een gepubliceerde opstelling van het eerstvolgende event. Is er
  // niets, dan is er geen sectie — geen leeg veld, geen "nog niet bekend".
  const publiek =
    gelezen?.opstelling?.status === 'gepubliceerd'
      ? { formatie: gelezen.opstelling.formatie, weergave: gelezen.weergave }
      : null

  return (
    <Schil naam={speler.naam} isLeider={speler.rol === 'leider'} tab="mij">
      {!eerste && (
        <section className="rounded-2xl border border-rand bg-paneel p-6">
          <h2 className="kopregel text-lg">Nog niets gepland</h2>
          <p className="mt-2 text-sm text-zacht">
            Zodra het schema van de club binnenkomt, staat je eerstvolgende wedstrijd hier.
          </p>
        </section>
      )}

      {eerste && (
        <MatchdayBlok
          event={eerste}
          status={standPerEvent.get(eerste.id)!}
          terugOp={lopend?.terugOp ? new Date(lopend.terugOp) : null}
          mijnDiensten={mijnDiensten.get(eerste.id) ?? []}
        />
      )}

      {publiek && (
        <section className="flex flex-col gap-3">
          <h2 className="bovenkop text-zacht">
            Opstelling <span className="text-tekst">{publiek.formatie}</span>
          </h2>
          <Veld
            formatie={publiek.formatie}
            plekken={publiek.weergave.basis}
            uitgelichtSpelerId={speler.id}
          />
          {publiek.weergave.bank.length > 0 && (
            <p className="text-sm text-zacht">
              <span className="bovenkop">Bank</span>{' '}
              {publiek.weergave.bank.map((regel, i) => (
                <span key={regel.spelerId ?? `gast-${i}`}>
                  {i > 0 && ' · '}
                  {/* Ook op de bank moet je jezelf meteen zien staan. */}
                  <span className={regel.spelerId === speler.id ? 'text-komt-op' : undefined}>
                    {regel.naam}
                    {regel.gast && ' (gast)'}
                  </span>
                </span>
              ))}
            </p>
          )}
        </section>
      )}

      {rest.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="bovenkop text-zacht">Daarna</h2>
          {rest.map((event) => (
            <EventRegel
              key={event.id}
              event={event}
              status={standPerEvent.get(event.id)!}
              mijnDiensten={mijnDiensten.get(event.id) ?? []}
            />
          ))}
        </section>
      )}
    </Schil>
  )
}
