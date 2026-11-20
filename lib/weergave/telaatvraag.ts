import { alsEuro } from './geld'

/**
 * Wat een leider leest als hij na de afmeldgrens iemand af- of aanmeldt,
 * voordat het gebeurt. Het blijft zijn keuze: hij antwoordt met ja of nee.
 */
export function teLaatVraag(invoer: {
  naam: string
  naar: 'ja' | 'nee'
  /** Het bedrag van de vaste boete voor te laat afmelden, of niets zonder koppeling. */
  voorstelCent: number | null
}): string {
  const begin = 'De afmeldtermijn is voorbij.'
  if (invoer.naar === 'ja') {
    return `${begin} ${invoer.naam} toch weer aanmelden? Een openstaand boetevoorstel vervalt dan.`
  }
  const voorstel =
    invoer.voorstelCent === null
      ? ''
      : ` Er komt een boetevoorstel van ${alsEuro(invoer.voorstelCent)} om goed te keuren.`
  return `${begin} ${invoer.naam} toch afmelden?${voorstel}`
}
