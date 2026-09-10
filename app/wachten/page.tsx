import { redirect } from 'next/navigation'
import { Poort } from '@/app/_onderdelen/Poort'
import { UitlogKnop } from '@/app/_onderdelen/UitlogKnop'
import { huidigeSpeler } from '@/lib/auth/sessie'

// Zonder dit werd de pagina één keer gebouwd en daarna aan iedereen getoond,
// ook aan wie allang is goedgekeurd.
export const dynamic = 'force-dynamic'

export default async function Wachten() {
  const speler = await huidigeSpeler()

  if (!speler) redirect('/inloggen')
  // Goedgekeurd terwijl je op dit scherm stond: vernieuwen brengt je binnen.
  if (speler.accountStatus === 'actief') redirect('/')

  return (
    <Poort
      titel="Je staat in de wacht"
      inleiding="Je leider ziet je aanmelding staan en zet je erbij. Vernieuw deze pagina zodra hij het heeft gedaan, dan sta je meteen binnen."
      voet={
        <>
          Verkeerde account gebruikt? <UitlogKnop />
        </>
      }
    />
  )
}
