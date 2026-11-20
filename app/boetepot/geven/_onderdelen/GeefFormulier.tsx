'use client'

import { useState } from 'react'
import { geefBoete } from '@/app/acties/boetepot'
import { alsCenten, alsEuro } from '@/lib/weergave/geld'

type Speler = { id: string; naam: string; rugnummer: number | null }
type Soort = { id: string; omschrijving: string; bedragCent: number; perStuk: boolean }
type Event = { id: string; label: string }

const veld =
  'min-h-11 rounded-xl border border-rand bg-grond px-4 text-sm placeholder:text-zacht/70'

/**
 * Wie, waarvoor, waarbij: van boven naar beneden, zoals je het zou zeggen.
 * De knop zegt precies wat er gebeurt, dus die rekent mee terwijl je kiest.
 */
export function GeefFormulier({
  spelers,
  soorten,
  events,
}: {
  spelers: Speler[]
  soorten: Soort[]
  events: Event[]
}) {
  const [gekozen, setGekozen] = useState<Set<string>>(new Set())
  const [soort, setSoort] = useState<string>(soorten[0]?.id ?? 'anders')
  const [bedrag, setBedrag] = useState('')
  const [stuks, setStuks] = useState(1)

  const gekozenSoort = soorten.find((s) => s.id === soort)
  const bedragCent =
    soort === 'anders'
      ? alsCenten(bedrag)
      : gekozenSoort
        ? gekozenSoort.bedragCent * (gekozenSoort.perStuk ? stuks : 1)
        : null
  const aantal = gekozen.size
  const knoptekst =
    aantal === 0
      ? 'Kies eerst wie'
      : `Geef ${aantal === 1 ? '1 speler' : `${aantal} spelers`}${bedragCent ? ` ${alsEuro(bedragCent)}` : ''}`

  function wissel(id: string) {
    const nieuw = new Set(gekozen)
    if (nieuw.has(id)) nieuw.delete(id)
    else nieuw.add(id)
    setGekozen(nieuw)
  }

  return (
    <form action={geefBoete} className="flex flex-col gap-6">
      <section className="rounded-2xl border border-rand bg-paneel p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="bovenkop text-zacht">
            Aan wie <span className="cijfers text-tekst">{aantal}</span>
          </h2>
          <span className="flex gap-1">
            <button
              type="button"
              onClick={() => setGekozen(new Set(spelers.map((s) => s.id)))}
              className="min-h-8 rounded-lg px-2 text-xs text-club-op"
            >
              Iedereen
            </button>
            <button
              type="button"
              onClick={() => setGekozen(new Set())}
              className="min-h-8 rounded-lg px-2 text-xs text-club-op"
            >
              Wis
            </button>
          </span>
        </div>
        <ul className="mt-2 flex flex-col">
          {spelers.map((s) => {
            const aan = gekozen.has(s.id)
            return (
              <li key={s.id} className="border-b border-rand/60 last:border-b-0">
                <label className="flex min-h-12 cursor-pointer items-center gap-3 py-2">
                  <span className="uithangbord cijfers w-7 shrink-0 text-right text-sm text-club-op/80">
                    {s.rugnummer ?? '–'}
                  </span>
                  <span
                    className={`kopregel flex-1 truncate text-sm ${aan ? 'text-tekst' : 'text-zacht'}`}
                  >
                    {s.naam}
                  </span>
                  <input
                    type="checkbox"
                    name="spelerId"
                    value={s.id}
                    checked={aan}
                    onChange={() => wissel(s.id)}
                    className="size-6 shrink-0 accent-club"
                  />
                </label>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="rounded-2xl border border-rand bg-paneel p-4">
        <h2 className="bovenkop text-zacht">Waarvoor</h2>
        <div className="mt-3 flex flex-col gap-2">
          {soorten.map((s) => {
            const aan = soort === s.id
            return (
              <div
                key={s.id}
                className={`rounded-xl ${
                  aan ? 'border-2 border-club-op bg-club/15' : 'border border-rand bg-paneel-op'
                }`}
              >
                <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3 px-4">
                  <input
                    type="radio"
                    name="soort"
                    value={s.id}
                    checked={aan}
                    onChange={() => {
                      setSoort(s.id)
                      setStuks(1)
                    }}
                    className="sr-only"
                  />
                  <span className={`text-sm ${aan ? 'kopregel' : ''}`}>{s.omschrijving}</span>
                  <span className={`cijfers text-sm ${aan ? '' : 'text-zacht'}`}>
                    {alsEuro(s.bedragCent)}
                    {s.perStuk && <span className="text-zacht"> per stuk</span>}
                  </span>
                </label>
                {aan && s.perStuk && (
                  <div className="flex items-center gap-3 border-t border-club-op/30 px-4 py-3">
                    <span className="text-sm text-zacht">Aantal</span>
                    <button
                      type="button"
                      aria-label="Eén minder"
                      onClick={() => setStuks(Math.max(1, stuks - 1))}
                      className="kopregel grid size-11 place-items-center rounded-xl border border-rand bg-grond text-lg"
                    >
                      −
                    </button>
                    <input
                      name="aantal"
                      inputMode="numeric"
                      aria-label="Aantal"
                      value={stuks}
                      onChange={(e) => {
                        const n = Number(e.target.value.replace(/\D/g, ''))
                        setStuks(Math.min(99, Math.max(1, n || 1)))
                      }}
                      className="uithangbord cijfers w-14 rounded-xl border border-rand bg-grond py-2 text-center text-lg"
                    />
                    <button
                      type="button"
                      aria-label="Eén meer"
                      onClick={() => setStuks(Math.min(99, stuks + 1))}
                      className="kopregel grid size-11 place-items-center rounded-xl border border-rand bg-grond text-lg"
                    >
                      +
                    </button>
                    <span className="cijfers ml-auto text-sm">{alsEuro(s.bedragCent * stuks)}</span>
                  </div>
                )}
              </div>
            )
          })}

          <div
            className={`flex flex-col gap-2 rounded-xl p-3 ${
              soort === 'anders'
                ? 'border-2 border-club-op bg-club/15'
                : 'border border-dashed border-rand'
            }`}
          >
            <label className="flex min-h-8 cursor-pointer items-center text-sm">
              <input
                type="radio"
                name="soort"
                value="anders"
                checked={soort === 'anders'}
                onChange={() => setSoort('anders')}
                className="sr-only"
              />
              <span className={soort === 'anders' ? 'kopregel' : 'text-zacht'}>Iets anders…</span>
            </label>
            {soort === 'anders' && (
              <div className="flex gap-2">
                <input
                  name="omschrijving"
                  required
                  placeholder="Waarvoor?"
                  aria-label="Omschrijving"
                  className={`${veld} min-w-0 flex-1`}
                />
                <label className={`${veld} flex w-28 items-center gap-1 px-3`}>
                  <span className="text-zacht">€</span>
                  <input
                    name="bedrag"
                    required
                    inputMode="decimal"
                    placeholder="0,00"
                    aria-label="Bedrag in euro"
                    value={bedrag}
                    onChange={(e) => setBedrag(e.target.value)}
                    className="cijfers w-full bg-transparent outline-none"
                  />
                </label>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-rand bg-paneel p-4">
        <label className="flex flex-col gap-3">
          <span className="bovenkop text-zacht">
            Hoort bij <span className="font-normal normal-case tracking-normal">(mag leeg)</span>
          </span>
          <select name="eventId" defaultValue="" className={`${veld} bg-paneel-op`}>
            <option value="">Nergens bij</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <button
        disabled={aantal === 0}
        className="kopregel min-h-11 rounded-xl bg-club px-5 text-sm text-white transition-colors hover:bg-club/90 disabled:bg-paneel-op disabled:text-zacht"
      >
        {knoptekst}
      </button>
    </form>
  )
}
