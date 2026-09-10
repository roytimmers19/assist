import Link from 'next/link'
import { rondUitnodigingAf } from '@/app/acties/toetreden'
import { Knop } from '@/app/_onderdelen/Knop'
import { Poort } from '@/app/_onderdelen/Poort'
import { Toegang } from '@/app/_onderdelen/Toegang'
import { huidigeGebruiker } from '@/lib/auth/sessie'
import { leesUitnodiging } from '@/lib/auth/uitnodiging'
import { db } from '@/lib/db/client'
import { APPNAAM } from '@/lib/weergave/namen'

export const dynamic = 'force-dynamic'

export default async function Uitnodiging({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params
  const geldig = await leesUitnodiging(db(), token)

  if (!geldig) {
    return (
      <Poort
        titel="Deze uitnodiging werkt niet meer"
        inleiding="Hij is al gebruikt of verlopen. Vraag je leider om een nieuwe, of ga verder met de teamcode uit de groepsapp."
        voet={
          <Link href="/aanmelden" className="text-club-op underline underline-offset-4">
            Aanmelden met de teamcode
          </Link>
        }
      />
    )
  }

  const gebruiker = await huidigeGebruiker()

  return (
    <Poort
      titel={`Welkom bij ${APPNAAM}`}
      inleiding={
        gebruiker
          ? `Je bent ingelogd als ${gebruiker.email}. Nog één tik en je staat in het team.`
          : 'Maak een account aan of log in met Google, dan zetten we je in het team.'
      }
    >
      {gebruiker ? (
        <form action={rondUitnodigingAf.bind(null, token)}>
          <Knop toon="club">Zet mij in het team</Knop>
        </form>
      ) : (
        /* Terug naar deze pagina, zodat de uitnodiging daarna alsnog wordt ingenomen. */
        <Toegang naarwaar={`/uitnodiging/${token}`} nieuw />
      )}
    </Poort>
  )
}
