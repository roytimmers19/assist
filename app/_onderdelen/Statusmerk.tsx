export type Toestand = 'komt' | 'stil' | 'weg'

const woorden: Record<Toestand, string> = {
  komt: 'Komt',
  stil: 'Nog stil',
  weg: 'Afgemeld',
}

const kleuren: Record<Toestand, string> = {
  komt: 'bg-komt/15 text-komt-op',
  stil: 'bg-paneel-op text-zacht',
  weg: 'bg-weg/15 text-weg-op',
}

const stippen: Record<Toestand, string> = {
  komt: 'bg-komt',
  stil: 'bg-zacht/60',
  weg: 'bg-weg',
}

/**
 * Eén woordenschat voor de drie toestanden, op elk scherm hetzelfde. Zonder
 * dat leert niemand het verschil tussen "komt" en "nog stil" te herkennen.
 */
export function Statusmerk({ toestand, kaal = false }: { toestand: Toestand; kaal?: boolean }) {
  if (kaal) {
    return (
      <span
        className={`inline-block size-2 shrink-0 rounded-full ${stippen[toestand]}`}
        role="img"
        aria-label={woorden[toestand]}
      />
    )
  }

  return (
    <span
      className={`bovenkop inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 ${kleuren[toestand]}`}
    >
      <span className={`size-1.5 rounded-full ${stippen[toestand]}`} aria-hidden />
      {woorden[toestand]}
    </span>
  )
}
