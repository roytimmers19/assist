import Link from 'next/link'
import { NieuwWachtwoord } from '@/app/_onderdelen/NieuwWachtwoord'
import { Poort } from '@/app/_onderdelen/Poort'

export const dynamic = 'force-dynamic'

export default async function NieuwWachtwoordPagina({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>
}) {
  const { token, error } = await searchParams

  // Better Auth stuurt een verlopen of al gebruikte link hierheen zonder token.
  if (!token || error) {
    return (
      <Poort
        titel="Deze link werkt niet meer"
        inleiding="Een herstellink is een uur geldig en gaat één keer mee. Vraag om een nieuwe."
        voet={
          <Link href="/wachtwoord-vergeten" className="text-club-op underline underline-offset-4">
            Nieuwe link aanvragen
          </Link>
        }
      />
    )
  }

  return (
    <Poort titel="Nieuw wachtwoord" inleiding="Kies er een die je onthoudt. Daarna log je ermee in.">
      <NieuwWachtwoord token={token} />
    </Poort>
  )
}
