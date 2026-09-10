/**
 * Een selectievakje stuurt niets mee als het uit staat — er is geen 'nee', er
 * is alleen afwezigheid. Dat maakt dit de gevaarlijkste regel in een formulier:
 * lees je hem verkeerd, dan zet elke keer opslaan alles stilletjes op uit,
 * zonder foutmelding en zonder dat iemand het merkt.
 *
 * Daarom staat hij hier en niet los in elke actie: één plek, met een test erop.
 */
export function alsVinkje(formulier: FormData, naam: string): boolean {
  return formulier.get(naam) === 'ja'
}

/**
 * Een formulierveld als tekst. Stond twintig keer als
 * `String(formulier.get(x) ?? '')` uitgeschreven.
 *
 * Trimt bewust niet: dat is een keuze van de aanroeper. Een id dat door een
 * trim gaat is een id dat stilletjes kan veranderen.
 */
export function alsTekst(formulier: FormData, naam: string): string {
  return String(formulier.get(naam) ?? '')
}

/**
 * Een vrij tekstveld dat leeg mag zijn. Een ontbrekend veld en een veld met
 * alleen spaties betekenen hetzelfde: niets ingevuld. Dat wordt niets en geen
 * lege tekst, zodat de database dat verschil niet hoeft te kennen.
 */
export function alsTekstOfNiets(formulier: FormData, naam: string): string | null {
  return alsTekst(formulier, naam).trim() || null
}
