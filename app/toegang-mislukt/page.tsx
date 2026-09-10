import Link from 'next/link'
import { Poort } from '@/app/_onderdelen/Poort'

export const dynamic = 'force-dynamic'

/**
 * Waar Better Auth zijn eigen Engelse foutpagina zou tonen. De code die hij
 * meegeeft zegt een speler niets; wat hij nodig heeft is de weg terug.
 */
function uitleg(code?: string): { titel: string; inleiding: string } {
  if (code === 'account_not_linked') {
    return {
      titel: 'Je hebt hier een wachtwoord',
      inleiding:
        'Dit e-mailadres is hier aangemaakt met een wachtwoord, niet met Google. Log in met dat wachtwoord — of vraag een nieuwe aan als je hem kwijt bent.',
    }
  }

  return {
    titel: 'Inloggen lukte niet',
    inleiding: 'Er ging iets mis bij het binnenkomen. Probeer het nog een keer.',
  }
}

export default async function ToegangMislukt({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const { error } = await searchParams
  const { titel, inleiding } = uitleg(error)

  return (
    <Poort
      titel={titel}
      inleiding={inleiding}
      voet={
        <Link href="/inloggen" className="text-club-op underline underline-offset-4">
          Terug naar inloggen
        </Link>
      }
    >
      {error === 'account_not_linked' && (
        <Link
          href="/wachtwoord-vergeten"
          className="kopregel min-h-11 rounded-xl border border-rand bg-paneel-op px-5 text-center text-sm leading-[2.75rem] text-tekst transition-colors hover:border-club-op/60"
        >
          Wachtwoord vergeten
        </Link>
      )}
    </Poort>
  )
}
