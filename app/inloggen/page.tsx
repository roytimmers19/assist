import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Poort } from '@/app/_onderdelen/Poort'
import { Toegang } from '@/app/_onderdelen/Toegang'
import { huidigeGebruiker, huidigeSpeler } from '@/lib/auth/sessie'

export const dynamic = 'force-dynamic'

export default async function Inloggen({
  searchParams,
}: {
  searchParams: Promise<{ uitnodiging?: string; hersteld?: string }>
}) {
  const { uitnodiging, hersteld } = await searchParams

  // Kwam iemand hier vanaf een uitnodiging, dan gaat hij daarna terug, zodat
  // die alsnog wordt ingenomen in plaats van te verdwijnen.
  const naarwaar = uitnodiging ? `/uitnodiging/${uitnodiging}` : '/'

  // Wie al ingelogd is hoort hier geen formulier te zien. Dat is dezelfde
  // blinde vlek als /wachten en /aanmelden hadden: een pagina die niet keek
  // naar wie ervoor stond.
  if (await huidigeGebruiker()) {
    if (uitnodiging) redirect(naarwaar)

    const speler = await huidigeSpeler()
    // Ingelogd maar nog geen spelersrij: die moet zich eerst aanmelden.
    if (!speler) redirect('/aanmelden')
    redirect(speler.accountStatus === 'actief' ? '/' : '/wachten')
  }

  return (
    <Poort
      titel="Inloggen"
      inleiding={
        hersteld
          ? 'Je wachtwoord is gewijzigd. Log ermee in.'
          : 'De aanwezigheid van SV Voorbeeld 2, op één plek.'
      }
      voet={
        <div className="flex flex-col gap-2">
          <Link href="/wachtwoord-vergeten" className="text-club-op underline underline-offset-4">
            Wachtwoord vergeten?
          </Link>
          {!uitnodiging && (
            <span>
              Nog niet in het team?{' '}
              <Link href="/aanmelden" className="text-club-op underline underline-offset-4">
                Aanmelden met de teamcode
              </Link>
            </span>
          )}
        </div>
      }
    >
      <Toegang naarwaar={naarwaar} />
    </Poort>
  )
}
