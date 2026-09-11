import { AsyncLocalStorage } from 'node:async_hooks'

type Opvang = { link: string | null }

const opvang = new AsyncLocalStorage<Opvang>()

/**
 * Voert `werk` uit met een opvang aan en geeft terug welke herstellink daarbij
 * werd aangeboden.
 *
 * Better Auth reikt de herstellink alleen aan zijn eigen `sendResetPassword`
 * aan, nooit aan wie de aanvraag deed. Dit is de weg om hem tóch bij de leider
 * te krijgen zonder hem te versturen. Een gedeelde variabele zou hier volstaan
 * tot twee leiders tegelijk op de knop drukken; de opvang hoort dus bij de
 * aanroep en niet bij de module.
 */
export async function vangHerstellink(werk: () => Promise<void>): Promise<string | null> {
  const doos: Opvang = { link: null }
  await opvang.run(doos, werk)
  return doos.link
}

/**
 * Staat er een opvang klaar, dan gaat de link daarheen en hoeft hij niet de
 * deur uit. Zo niet, dan is dit een gewone aanvraag van de speler zelf en moet
 * de aanroeper mailen.
 */
export function biedHerstellinkAan(link: string): boolean {
  const doos = opvang.getStore()
  if (!doos) return false
  doos.link = link
  return true
}
