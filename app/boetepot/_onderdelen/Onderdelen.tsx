import Link from 'next/link'

type Onderdeel = 'ranglijst' | 'boetes' | 'afrekenen'

const ALLE: { onderdeel: Onderdeel; naar: string; label: string }[] = [
  { onderdeel: 'ranglijst', naar: '/boetepot', label: 'Ranglijst' },
  { onderdeel: 'boetes', naar: '/boetepot/boetes', label: 'Boetes' },
  { onderdeel: 'afrekenen', naar: '/boetepot/afrekenen', label: 'Afrekenen' },
]

/**
 * De keuze binnen de boetepot. Hooguit drie: meer past niet op een telefoon,
 * en wat zelden nodig is, zoals de vaste boetes, zit achter een link.
 */
export function Onderdelen({ actief, magAfrekenen }: { actief: Onderdeel; magAfrekenen: boolean }) {
  const zichtbaar = ALLE.filter((o) => o.onderdeel !== 'afrekenen' || magAfrekenen)

  return (
    <nav
      aria-label="Boetepot"
      className={`grid gap-1 rounded-xl border border-rand bg-paneel p-1 ${
        zichtbaar.length === 3 ? 'grid-cols-3' : 'grid-cols-2'
      }`}
    >
      {zichtbaar.map((o) => (
        <Link
          key={o.onderdeel}
          href={o.naar}
          aria-current={o.onderdeel === actief ? 'page' : undefined}
          className={`kopregel grid min-h-11 place-items-center rounded-lg text-sm transition-colors ${
            o.onderdeel === actief ? 'bg-paneel-op text-tekst' : 'text-zacht hover:text-tekst'
          }`}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  )
}
