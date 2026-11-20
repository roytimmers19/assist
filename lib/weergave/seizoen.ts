/** Een seizoen zoals een voetballer het zegt: 26/27. */
export function alsSeizoen(startjaar: number): string {
  const kort = (jaar: number) => String(jaar % 100).padStart(2, '0')
  return `${kort(startjaar)}/${kort(startjaar + 1)}`
}

/**
 * Het seizoen uit `?seizoen=2025`. Alles wat daar niet als een redelijk jaar
 * staat, wordt het huidige seizoen: een kapotte link is geen foutpagina waard.
 */
export function leesSeizoen(waarde: string | undefined, huidig: number): number {
  const jaar = Number(waarde)
  if (!Number.isInteger(jaar) || jaar < 2020 || jaar > huidig) return huidig
  return jaar
}
