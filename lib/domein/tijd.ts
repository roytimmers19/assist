/**
 * De tijdzone van de club. Stond zes keer los gedeclareerd en een zevende keer
 * los ingetypt in het weekoverzicht; één plek, zodat een verhuizing of een
 * tweede team niet betekent dat je er zes vergeet.
 *
 * Hij hoort in de pure laag omdat de domeinregels zelf in wandkloktijd zijn
 * geschreven: "woensdag 23:59" moet woensdag blijven over een zomer-winter-
 * tijdovergang heen.
 */
export const ZONE = 'Europe/Amsterdam'
