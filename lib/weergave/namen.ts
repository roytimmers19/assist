/**
 * De naam van de app, op één plek. Stond eerder als losse tekst in twaalf
 * bestanden verspreid; een volgende naamswijziging is nu deze regel.
 */
export const APPNAAM = 'Assist'

/**
 * De bond levert tegenstanders met de dagsoort erachter: "Tegenstander 1 (zon)".
 * Binnen een zondagteam zegt dat niets, dus het gaat eruit. Alleen precies
 * die drie afkortingen, zodat een clubnaam mét haakjes ongemoeid blijft.
 */
export function zonderDagsoort(naam: string): string {
  return naam.replace(/\s*\((zon|zat|vri)\)\s*$/i, '').trim()
}

export function schoonTegenstander(naam: string | null): string {
  if (!naam) return 'onbekende tegenstander'
  return zonderDagsoort(naam)
}

type TitelBron = {
  type: 'training' | 'wedstrijd'
  thuis: boolean | null
  tegenstander: string | null
}

/** "Training" of "Thuis tegen Tegenstander 1". */
export function eventTitel(event: TitelBron): string {
  if (event.type === 'training') return 'Training'
  return `${event.thuis ? 'Thuis' : 'Uit'} tegen ${schoonTegenstander(event.tegenstander)}`
}
