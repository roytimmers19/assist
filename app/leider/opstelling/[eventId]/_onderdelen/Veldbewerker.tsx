'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { bewaarEnPubliceer } from '@/app/acties/opstelling'
import { Knop } from '@/app/_onderdelen/Knop'
import { Veldgrond } from '@/app/_onderdelen/Veld'
import { FORMATIES, positienaam, zoekFormatie } from '@/lib/domein/formaties'

export type Kandidaat = { id: string; naam: string; rugnummer: number | null; komt: boolean }

export type Bezetting = {
  spelerId: string | null
  gastnaam: string | null
  gastnummer: number | null
}

/**
 * Het enige clientonderdeel van dit project met echte toestand. Reden: een
 * opstelling maken is schuiven en herzien, en bij elke tik een serverronde
 * maakt precies dat traag. Publiceren schrijft het geheel in één keer weg.
 */
export function Veldbewerker({
  eventId,
  kandidaten,
  gewaarschuwd,
  beginFormatie,
  beginVeld,
  beginGasten,
}: {
  eventId: string
  kandidaten: Kandidaat[]
  /** Spelers die opgesteld staan maar er niet bij zijn; komt van de server. */
  gewaarschuwd: string[]
  beginFormatie: string
  beginVeld: Record<number, Bezetting>
  beginGasten: Bezetting[]
}) {
  const router = useRouter()
  const [formatie, setFormatie] = useState(beginFormatie)
  const [veld, setVeld] = useState<Record<number, Bezetting>>(beginVeld)
  const [gasten, setGasten] = useState<Bezetting[]>(beginGasten)
  const [openSlot, setOpenSlot] = useState<number | null>(null)
  const [gastnaam, setGastnaam] = useState('')
  const [bankGastnaam, setBankGastnaam] = useState('')
  const [bezig, setBezig] = useState(false)
  const [fout, setFout] = useState<string | null>(null)
  const paneel = useRef<HTMLElement>(null)

  // Het veld vult op een telefoon bijna het hele scherm, dus het keuzepaneel
  // eronder viel buiten beeld: tikken leek daardoor niets te doen. 'nearest'
  // en niet 'center', zodat er zo veel mogelijk veld in beeld blijft en je de
  // ring om de plek die je vult nog kunt zien.
  useEffect(() => {
    if (openSlot !== null) paneel.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [openSlot])

  const opstelling = zoekFormatie(formatie)!
  const gewaarschuwdeSpelers = new Set(gewaarschuwd)
  const bezetteSpelers = new Set(
    Object.values(veld)
      .map((b) => b.spelerId)
      .filter((id): id is string => id !== null),
  )

  // "Komen" is een filter en geen slot: wie zich heeft afgemeld staat onderaan,
  // apart en gemarkeerd, want soms belt iemand je dat hij toch kan.
  const beschikbaar = kandidaten.filter((k) => !bezetteSpelers.has(k.id))
  const beschikbaarKomt = beschikbaar.filter((k) => k.komt)
  const beschikbaarAfgemeld = beschikbaar.filter((k) => !k.komt)

  function zetOpSlot(slot: number, bezetting: Bezetting | null) {
    setVeld((huidig) => {
      const volgend = { ...huidig }
      if (bezetting === null) delete volgend[slot]
      else volgend[slot] = bezetting
      return volgend
    })
    setOpenSlot(null)
    setGastnaam('')
  }

  async function publiceer() {
    setBezig(true)
    setFout(null)
    try {
      await bewaarEnPubliceer({
        eventId,
        formatie,
        plekken: [
          ...Object.entries(veld).map(([slot, b]) => ({
            slot: Number(slot),
            spelerId: b.spelerId,
            gastnaam: b.gastnaam,
            gastnummer: b.gastnummer,
          })),
          ...gasten.map((g) => ({ slot: null, gastnaam: g.gastnaam, gastnummer: g.gastnummer })),
        ],
        publiceren: true,
      })
      router.refresh()
    } catch (reden) {
      setFout(reden instanceof Error ? reden.message : 'Opslaan lukte niet.')
    } finally {
      setBezig(false)
    }
  }

  const gevuld = Object.keys(veld).length

  return (
    <div className="flex flex-col gap-4">
      <label className="flex flex-col gap-2">
        <span className="bovenkop text-zacht">Formatie</span>
        <select
          value={formatie}
          onChange={(e) => setFormatie(e.target.value)}
          className="min-h-11 rounded-xl border border-rand bg-paneel-op px-4 text-sm"
        >
          {FORMATIES.map((f) => (
            <option key={f.sleutel} value={f.sleutel}>
              {f.naam}
            </option>
          ))}
        </select>
      </label>

      <Veldgrond>
        {opstelling.plekken.map((plek) => {
          const bezetting = veld[plek.slot]
          const naam = bezetting
            ? (bezetting.gastnaam ?? kandidaten.find((k) => k.id === bezetting.spelerId)?.naam ?? '?')
            : null
          const nummer = bezetting
            ? (bezetting.gastnummer ??
              kandidaten.find((k) => k.id === bezetting.spelerId)?.rugnummer ??
              null)
            : null

          return (
            <button
              key={plek.slot}
              type="button"
              onClick={() => setOpenSlot(plek.slot)}
              className="absolute flex w-20 -translate-x-1/2 translate-y-1/2 flex-col items-center gap-1"
              style={{ left: `${plek.x}%`, bottom: `${plek.y}%` }}
            >
              <span
                // Zelfde volgorde als in Veld.tsx — leeg, gewaarschuwd, bezet —
                // zodat het bouwscherm en het spelersscherm dezelfde taal spreken.
                className={`uithangbord cijfers grid size-9 place-items-center rounded-full text-sm ${
                  !bezetting
                    ? 'border border-dashed border-white/30 text-zacht'
                    : bezetting.spelerId !== null && gewaarschuwdeSpelers.has(bezetting.spelerId)
                      ? 'bg-weg text-white'
                      : 'bg-club text-white'
                } ${
                  // Zo zie je welke plek je aan het vullen bent, ook als het
                  // paneel eronder net buiten beeld staat.
                  openSlot === plek.slot ? 'ring-2 ring-club-op' : ''
                }`}
              >
                {bezetting ? (nummer ?? '–') : plek.label}
              </span>
              {naam && <span className="w-full truncate text-center text-[11px]">{naam}</span>}
            </button>
          )
        })}
      </Veldgrond>

      {openSlot !== null && (
        <section
          ref={paneel}
          className="flex flex-col gap-3 rounded-2xl border border-club-op/50 bg-paneel p-4"
        >
          <h2 className="bovenkop text-club-op">
            {positienaam(opstelling.plekken.find((p) => p.slot === openSlot)?.label ?? '')}
          </h2>

          {veld[openSlot] && (
            <Knop toon="omlijnd" onClick={() => zetOpSlot(openSlot, null)}>
              Positie leegmaken
            </Knop>
          )}

          <ul className="flex flex-col">
            {beschikbaarKomt.map((kandidaat) => (
              <li key={kandidaat.id}>
                <button
                  type="button"
                  onClick={() =>
                    zetOpSlot(openSlot, {
                      spelerId: kandidaat.id,
                      gastnaam: null,
                      gastnummer: null,
                    })
                  }
                  className="flex min-h-11 w-full items-center gap-3 border-b border-rand/60 text-left text-sm"
                >
                  <span className="cijfers uithangbord w-7 text-right text-club-op/80">
                    {kandidaat.rugnummer ?? '–'}
                  </span>
                  {kandidaat.naam}
                </button>
              </li>
            ))}

            {beschikbaarAfgemeld.length > 0 && (
              <>
                <li className="bovenkop px-0 pt-3 pb-1 text-weg-op">Afgemeld</li>
                {beschikbaarAfgemeld.map((kandidaat) => (
                  <li key={kandidaat.id}>
                    <button
                      type="button"
                      onClick={() =>
                        zetOpSlot(openSlot, {
                          spelerId: kandidaat.id,
                          gastnaam: null,
                          gastnummer: null,
                        })
                      }
                      className="flex min-h-11 w-full items-center gap-3 border-b border-rand/60 text-left text-sm text-weg-op"
                    >
                      <span className="cijfers uithangbord w-7 text-right">
                        {kandidaat.rugnummer ?? '–'}
                      </span>
                      {kandidaat.naam}
                    </button>
                  </li>
                ))}
              </>
            )}
          </ul>

          <div className="flex gap-2">
            <input
              value={gastnaam}
              onChange={(e) => setGastnaam(e.target.value)}
              placeholder="Naam van een gast"
              className="min-h-11 flex-1 rounded-xl border border-rand bg-paneel-op px-4 text-sm placeholder:text-zacht/70"
            />
            <Knop
              toon="club"
              vol={false}
              onClick={() =>
                gastnaam.trim() &&
                zetOpSlot(openSlot, {
                  spelerId: null,
                  gastnaam: gastnaam.trim(),
                  gastnummer: null,
                })
              }
            >
              Zet neer
            </Knop>
          </div>

          <button
            type="button"
            onClick={() => setOpenSlot(null)}
            className="min-h-11 px-2 text-left text-sm text-zacht underline underline-offset-4"
          >
            Sluiten
          </button>
        </section>
      )}

      <section className="rounded-2xl border border-rand bg-paneel p-4">
        <h2 className="bovenkop text-zacht">Bank</h2>
        <ul className="mt-2 flex flex-col text-sm">
          {/* Afgeleid: wie komt en geen positie op het veld heeft. Niets om te beheren. */}
          {beschikbaarKomt.map((kandidaat) => (
            <li key={kandidaat.id} className="flex items-center gap-3 py-1.5">
              <span className="cijfers uithangbord w-7 text-right text-club-op/80">
                {kandidaat.rugnummer ?? '–'}
              </span>
              {kandidaat.naam}
            </li>
          ))}

          {gasten.map((gast, i) => (
            <li key={`${gast.gastnaam}-${i}`} className="flex items-center justify-between py-1.5">
              <span className="flex items-center gap-3">
                <span className="cijfers uithangbord w-7 text-right text-zacht/50">–</span>
                {gast.gastnaam} <span className="text-zacht">(gast)</span>
              </span>
              <button
                type="button"
                onClick={() => setGasten(gasten.filter((_, j) => j !== i))}
                className="min-h-11 px-2 text-xs text-zacht underline"
              >
                weghalen
              </button>
            </li>
          ))}
        </ul>
        <div className="mt-2 flex gap-2">
          <input
            value={bankGastnaam}
            onChange={(e) => setBankGastnaam(e.target.value)}
            placeholder="Naam van een gast"
            className="min-h-11 flex-1 rounded-xl border border-rand bg-paneel-op px-4 text-sm placeholder:text-zacht/70"
          />
          <Knop
            toon="omlijnd"
            vol={false}
            onClick={() => {
              const naam = bankGastnaam.trim()
              if (!naam) return
              setGasten([...gasten, { spelerId: null, gastnaam: naam, gastnummer: null }])
              setBankGastnaam('')
            }}
          >
            Op de bank
          </Knop>
        </div>
      </section>

      {fout && (
        <p role="alert" className="rounded-xl bg-weg/15 px-3 py-2 text-sm text-weg-op">
          {fout}
        </p>
      )}

      <Knop toon="club" onClick={publiceer} disabled={bezig} className="disabled:opacity-50">
        {bezig ? 'Bezig…' : `Publiceren — ${gevuld} van 11 gevuld`}
      </Knop>
    </div>
  )
}
