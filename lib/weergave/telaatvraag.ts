import { alsEuro } from './geld'

/**
 * Wat een leider leest als hij na de afmeldgrens iemand af- of aanmeldt,
 * voordat het gebeurt. Het blijft zijn keuze: hij antwoordt met ja of nee.
 */
export function teLaatVraag(invoer: {
  naam: string
  naar: 'ja' | 'nee'
  /**
   * Bij afmelden: het voorstel dat daarna klaarstaat. Bij weer aanmelden: het
   * voorstel dat nu openstaat en dan vervalt. Niets als er geen is.
   */
  voorstelCent: number | null
}): string {
  const begin = 'De afmeldtermijn is voorbij.'
  if (invoer.naar === 'ja') {
    const vervalt = invoer.voorstelCent === null ? '' : ' Zijn openstaande boetevoorstel vervalt dan.'
    return `${begin} ${invoer.naam} toch weer aanmelden?${vervalt}`
  }
  const voorstel =
    invoer.voorstelCent === null
      ? ''
      : ` Er komt een boetevoorstel van ${alsEuro(invoer.voorstelCent)} om goed te keuren.`
  return `${begin} ${invoer.naam} toch afmelden?${voorstel}`
}
