import Link from 'next/link'
import { APPNAAM } from '@/lib/weergave/namen'

/** Het merk is een rugnummer: het meest herkenbare teken uit dit wereldje. */
export function Merk() {
  return (
    <span className="uithangbord grid size-7 shrink-0 place-items-center rounded-md bg-club text-[13px] text-white">
      2
    </span>
  )
}

type Tab = 'mij' | 'week' | 'spelers' | 'profiel'

type Tabblad = { tab: Tab; naar: string; label: string }

const EIGEN: Tabblad = { tab: 'mij', naar: '/', label: 'Mijn week' }
const PROFIEL: Tabblad = { tab: 'profiel', naar: '/mij', label: 'Mijn gegevens' }

/**
 * Een speler zag helemaal geen balk en moest op zijn eigen naam tikken om bij
 * zijn gegevens te komen. Dat verzin je niet zelf, dus hij krijgt nu ook twee
 * plekken om tussen te wisselen. Bij de leider blijft de naam die weg, anders
 * worden het er vier op een telefoonbreedte.
 */
function tabbladenVoor(isLeider: boolean): Tabblad[] {
  if (!isLeider) return [EIGEN, PROFIEL]
  return [
    EIGEN,
    { tab: 'week', naar: '/leider', label: 'Weekoverzicht' },
    { tab: 'spelers', naar: '/leider/spelers', label: 'Spelers' },
  ]
}

/**
 * De vaste schil om elk ingelogd scherm: merk, wie je bent, en de plekken waar
 * je tussen wisselt. De actieve tab komt van de pagina zelf, zodat dit een
 * servercomponent kan blijven.
 */
export function Schil({
  naam,
  isLeider,
  tab,
  breed = false,
  children,
}: {
  naam: string
  isLeider: boolean
  tab: Tab
  breed?: boolean
  children: React.ReactNode
}) {
  const binnen = breed ? 'mx-auto w-full max-w-5xl px-4' : 'mx-auto w-full max-w-md px-4'

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-rand/70 bg-grond/85 backdrop-blur-md">
        <div className={`${binnen} flex h-14 items-center justify-between gap-3`}>
          <Link href="/" className="flex items-center gap-2.5">
            <Merk />
            <span className="bovenkop text-tekst">{APPNAAM}</span>
          </Link>
          <Link
            href="/mij"
            aria-current={tab === 'profiel' ? 'page' : undefined}
            className={`truncate text-sm transition-colors hover:text-tekst ${
              tab === 'profiel' ? 'text-tekst' : 'text-zacht'
            }`}
          >
            {naam}
          </Link>
        </div>

        <nav className={`${binnen} -mb-px flex gap-5 overflow-x-auto`}>
          {tabbladenVoor(isLeider).map((blad) => {
            const actief = blad.tab === tab
            return (
              <Link
                key={blad.tab}
                href={blad.naar}
                aria-current={actief ? 'page' : undefined}
                className={`whitespace-nowrap border-b-2 pb-2.5 text-sm transition-colors ${
                  actief ? 'border-club-op text-tekst' : 'border-transparent text-zacht hover:text-tekst'
                }`}
              >
                {blad.label}
              </Link>
            )
          })}
        </nav>
      </header>

      <main className={`${binnen} flex flex-col gap-6 py-6`}>{children}</main>
    </div>
  )
}
