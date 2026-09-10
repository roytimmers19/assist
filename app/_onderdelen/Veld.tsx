import { zoekFormatie } from '@/lib/domein/formaties'
import type { Basisregel } from '@/lib/domein/opstelling'

/** De ondergrond van het veld. Gedeeld met het bewerkscherm. */
export function Veldgrond({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-rand bg-komt/10"
      style={{ aspectRatio: '2 / 3' }}
    >
      {/* Middenlijn en cirkel: genoeg om het als veld te lezen, niet meer. */}
      <div className="absolute inset-x-0 top-1/2 h-px bg-white/15" aria-hidden />
      <div
        className="absolute left-1/2 top-1/2 size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/15"
        aria-hidden
      />
      {children}
    </div>
  )
}

/** Alleen tonen. Het bewerken zit in Veldbewerker en niet hier. */
export function Veld({
  formatie,
  plekken,
  uitgelichtSpelerId = null,
}: {
  formatie: string
  plekken: Basisregel[]
  uitgelichtSpelerId?: string | null
}) {
  const opstelling = zoekFormatie(formatie)
  if (!opstelling) return null

  const bezet = new Map(plekken.map((p) => [p.slot, p]))

  return (
    <Veldgrond>
      {opstelling.plekken.map((plek) => {
        const speler = bezet.get(plek.slot)
        const uitgelicht = speler?.spelerId !== null && speler?.spelerId === uitgelichtSpelerId

        return (
          <div
            key={plek.slot}
            className="absolute flex w-20 -translate-x-1/2 translate-y-1/2 flex-col items-center gap-1"
            style={{ left: `${plek.x}%`, bottom: `${plek.y}%` }}
          >
            <span
              className={`uithangbord cijfers grid size-9 place-items-center rounded-full text-sm ${
                !speler
                  ? 'border border-dashed border-white/30 text-zacht'
                  : speler.gewaarschuwd
                    ? 'bg-weg text-white'
                    : uitgelicht
                      ? 'bg-komt text-grond ring-2 ring-komt-op'
                      : 'bg-club text-white'
              }`}
            >
              {speler ? (speler.nummer ?? '–') : plek.label}
            </span>

            {speler && (
              <span
                className={`w-full truncate text-center text-[11px] ${
                  uitgelicht ? 'text-komt-op' : 'text-tekst'
                }`}
              >
                {speler.naam}
                {speler.gast && <span className="text-zacht"> (gast)</span>}
              </span>
            )}
          </div>
        )
      })}
    </Veldgrond>
  )
}
