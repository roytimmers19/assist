/**
 * Wie op de leidersschermen mag: een leider, en een beheerder. Een beheerder
 * houdt de rol speler, zodat hij in de ploeg niet als leider te zien is. Het
 * recht zet de eigenaar met de hand in de database.
 *
 * Dit is de enige plek die dat beslist. Een pagina of actie vraagt het de
 * sessie en kijkt zelf niet naar de rol.
 */
export function magLeiden(speler: { rol: 'speler' | 'leider'; beheerder: boolean }): boolean {
  return speler.rol === 'leider' || speler.beheerder
}
