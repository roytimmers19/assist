const euro = new Intl.NumberFormat('nl-NL', { style: 'currency', currency: 'EUR' })

/** Een boete van meer dan duizend euro is een tikfout, geen boete. */
const MAXIMUM = 100_000

/** Een bedrag in centen op de Nederlandse manier: `€ 1,50`. */
export function alsEuro(cent: number): string {
  return euro.format(cent / 100)
}

/**
 * Een bedrag zoals iemand het intypt, in centen. Het toetsenbord geeft een
 * komma, een plakbord soms een punt: allebei goed. Leeg, nul, negatief, meer
 * dan twee cijfers achter de komma of meer dan duizend euro geeft niets, zodat
 * de aanroeper kan zeggen wat er mis is.
 */
export function alsCenten(tekst: string): number | null {
  const schoon = tekst.replace('€', '').trim()
  const deel = /^(\d+)(?:[.,](\d{1,2}))?$/.exec(schoon)
  if (!deel) return null

  const cent = Number(deel[1]) * 100 + Number((deel[2] ?? '').padEnd(2, '0'))
  return cent > 0 && cent <= MAXIMUM ? cent : null
}
