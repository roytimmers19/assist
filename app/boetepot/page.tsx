import Link from 'next/link'
import { Schil } from '@/app/_onderdelen/Schil'
import { vereisSpeler } from '@/lib/auth/sessie'
import { leesBoetes } from '@/lib/db/boetepot'
import { db } from '@/lib/db/client'
import { leesActieveSpelers, leesAlleSpelers } from '@/lib/db/spelers'
import { huidigSeizoen, potCent, ranglijst, seizoenVan, telt } from '@/lib/domein/boetepot'
import { alsEuro } from '@/lib/weergave/geld'
import { alsSeizoen, leesSeizoen } from '@/lib/weergave/seizoen'
import { Onderdelen } from './_onderdelen/Onderdelen'

export const dynamic = 'force-dynamic'

function opsomming(namen: string[]): string {
  if (namen.length <= 1) return namen.join('')
  return `${namen.slice(0, -1).join(', ')} en ${namen.at(-1)}`
}

export default async function Ranglijst({
  searchParams,
}: {
  searchParams: Promise<{ seizoen?: string }>
}) {
  const speler = await vereisSpeler()
  const verbinding = db()
  const [boetes, actieve, alle] = await Promise.all([
    leesBoetes(verbinding),
    leesActieveSpelers(verbinding),
    leesAlleSpelers(verbinding),
  ])

  const huidig = huidigSeizoen(new Date())
  const seizoen = leesSeizoen((await searchParams).seizoen, huidig)
  const seizoenen = [...new Set([huidig, ...boetes.filter(telt).map((b) => seizoenVan(b.datum))])]
    .filter((s) => s <= huidig)
    .sort((a, b) => b - a)

  // Wie de ploeg verliet maar dat seizoen boetes had, staat er wel tussen.
  const metBoete = new Set(
    boetes.filter((b) => telt(b) && seizoenVan(b.datum) === seizoen).map((b) => b.spelerId),
  )
  const naam = (s: (typeof alle)[number]) => s.weergavenaam ?? s.naam
  const ploeg = alle
    .filter((s) => metBoete.has(s.id) || actieve.some((a) => a.id === s.id))
    .map((s) => ({ id: s.id, naam: naam(s) }))

  const { plekken, schoon } = ranglijst(boetes, ploeg, seizoen)
  const koploper = plekken[0]?.totaalCent ?? 0
  const top = plekken.filter((p) => p.uitgelicht)
  const rest = plekken.filter((p) => !p.uitgelicht)

  return (
    <Schil naam={speler.naam} isLeider={speler.magLeiden} tab="boetepot">
      <Onderdelen actief="ranglijst" magAfrekenen={speler.magAfrekenen} />

      <section className="opkomen rounded-2xl bg-club p-5 text-white shadow-lg shadow-club/25">
        <div className="flex items-center justify-between gap-3">
          <h1 className="bovenkop text-white/85">In de pot</h1>
          {seizoenen.length > 1 ? (
            <details className="relative">
              <summary className="bovenkop flex min-h-8 cursor-pointer list-none items-center rounded-full border border-white/30 bg-white/10 px-2.5 [&::-webkit-details-marker]:hidden">
                Seizoen {alsSeizoen(seizoen)} ▾
              </summary>
              <ul className="absolute right-0 z-10 mt-2 flex min-w-32 flex-col rounded-xl border border-rand bg-paneel p-1 shadow-lg">
                {seizoenen.map((s) => (
                  <li key={s}>
                    <Link
                      href={s === huidig ? '/boetepot' : `/boetepot?seizoen=${s}`}
                      className={`flex min-h-11 items-center rounded-lg px-3 text-sm ${
                        s === seizoen ? 'bg-paneel-op text-tekst' : 'text-zacht'
                      }`}
                    >
                      Seizoen {alsSeizoen(s)}
                    </Link>
                  </li>
                ))}
              </ul>
            </details>
          ) : (
            <span className="bovenkop rounded-full border border-white/30 bg-white/10 px-2.5 py-1">
              Seizoen {alsSeizoen(seizoen)}
            </span>
          )}
        </div>
        <p className="uithangbord cijfers mt-4 text-[3.4rem]">{alsEuro(potCent(boetes, seizoen))}</p>
        <p className="mt-3 text-sm text-white/85">
          {seizoen === huidig ? 'Sinds 1 juli bij elkaar geboet' : `Bij elkaar geboet in ${alsSeizoen(seizoen)}`}
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="bovenkop text-zacht">Potspekkers</h2>

        {plekken.length === 0 && (
          <p className="rounded-xl border border-rand bg-paneel px-4 py-3 text-sm text-zacht">
            Nog niemand heeft dit seizoen een boete. Dat blijft vast niet lang zo.
          </p>
        )}

        {top.length > 0 && (
          <ol className="flex flex-col gap-1.5">
            {top.map((p) => {
              const ikZelf = p.spelerId === speler.id
              return (
                <li
                  key={p.spelerId}
                  className={`flex min-h-14 items-center gap-3 rounded-xl border px-3 py-2.5 ${
                    p.plek === 1 ? 'border-kaart/35 bg-kaart/[0.07]' : 'border-rand bg-paneel'
                  }`}
                >
                  <span className="uithangbord cijfers w-7 text-center text-2xl text-kaart">{p.plek}</span>
                  <span className="min-w-0 flex-1">
                    <span className={`kopregel block truncate text-base ${ikZelf ? 'text-komt-op' : ''}`}>
                      {p.naam}
                      {ikZelf && <span className="bovenkop ml-2 text-komt-op/80">jij</span>}
                    </span>
                    <span
                      className={`mt-1.5 block h-1.5 rounded-full ${p.plek === 1 ? 'bg-kaart' : 'bg-kaart/70'}`}
                      style={{ width: `${Math.max(4, (p.totaalCent / koploper) * 100)}%` }}
                      aria-hidden
                    />
                  </span>
                  <span className="uithangbord cijfers shrink-0 whitespace-nowrap text-right text-lg">
                    {alsEuro(p.totaalCent)}
                  </span>
                </li>
              )
            })}
          </ol>
        )}

        {rest.length > 0 && (
          <ol className="mt-1 flex flex-col">
            {rest.map((p) => {
              const ikZelf = p.spelerId === speler.id
              return (
                <li
                  key={p.spelerId}
                  className={`flex min-h-11 items-center gap-3 border-b border-rand/60 px-3 py-2 last:border-b-0 ${
                    ikZelf ? 'rounded-lg bg-komt/10' : ''
                  }`}
                >
                  <span
                    className={`uithangbord cijfers w-7 text-center text-sm ${
                      ikZelf ? 'text-komt-op' : 'text-club-op/80'
                    }`}
                  >
                    {p.plek}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block truncate text-sm ${ikZelf ? 'text-komt-op' : ''}`}>
                      {p.naam}
                      {ikZelf && <span className="bovenkop ml-2 text-komt-op/80">jij</span>}
                    </span>
                    <span
                      className={`mt-1 block h-1 rounded-full ${ikZelf ? 'bg-komt-op/50' : 'bg-zacht/35'}`}
                      style={{ width: `${Math.max(3, (p.totaalCent / koploper) * 100)}%` }}
                      aria-hidden
                    />
                  </span>
                  <span
                    className={`cijfers w-20 shrink-0 whitespace-nowrap text-right text-sm ${
                      ikZelf ? 'text-komt-op' : ''
                    }`}
                  >
                    {alsEuro(p.totaalCent)}
                  </span>
                </li>
              )
            })}
          </ol>
        )}

        {schoon.length > 0 && (
          <div className="mt-3 rounded-xl border border-dashed border-rand px-4 py-3">
            <p className="bovenkop text-komt-op">
              Nog schoon <span className="cijfers text-tekst">{schoon.length}</span>
            </p>
            <p className="mt-1.5 text-sm text-zacht">
              {opsomming(schoon)} {schoon.length === 1 ? 'staat' : 'staan'} op {alsEuro(0)}
            </p>
          </div>
        )}
      </section>
    </Schil>
  )
}
