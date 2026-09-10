export type Toon = 'club' | 'komt' | 'weg' | 'omlijnd' | 'opblauw'

const tonen: Record<Toon, string> = {
  club: 'bg-club text-white hover:bg-club/90',
  komt: 'bg-komt text-grond hover:bg-komt/90',
  weg: 'bg-weg text-white hover:bg-weg/90',
  omlijnd: 'border border-rand bg-paneel-op text-tekst hover:border-club-op/60',
  // Op het blauwe blok: doorzichtig wit, zodat de knop niet met de grond vecht.
  opblauw: 'border border-white/30 bg-white/10 text-white hover:bg-white/20',
}

/**
 * Alle knoppen zijn minstens 44px hoog: dit wordt met een duim bediend,
 * vaak staand naast een veld.
 */
export function Knop({
  toon = 'club',
  vol = true,
  className = '',
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { toon?: Toon; vol?: boolean }) {
  return (
    <button
      {...rest}
      className={`kopregel min-h-11 rounded-xl px-5 text-sm transition-colors ${
        vol ? 'w-full' : ''
      } ${tonen[toon]} ${className}`}
    />
  )
}
