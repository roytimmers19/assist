/**
 * Haalt de agendafeed op. Bewust apart van de pure laag: dit is het enige
 * stuk van de import dat het netwerk aanraakt.
 */
export async function haalFeedOp(url: string): Promise<string> {
  const antwoord = await fetch(url, {
    headers: { accept: 'text/calendar' },
    signal: AbortSignal.timeout(30_000),
    cache: 'no-store',
  })

  if (!antwoord.ok) {
    throw new Error(`Agendabron gaf status ${antwoord.status}`)
  }

  return await antwoord.text()
}
