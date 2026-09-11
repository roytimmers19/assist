import Link from 'next/link'
import { stuurHerstelmail } from '@/app/acties/toegang'
import { Knop } from '@/app/_onderdelen/Knop'
import { Poort } from '@/app/_onderdelen/Poort'
import { mailWerkt } from '@/lib/mail/verstuur'

export const dynamic = 'force-dynamic'

const terug = (
  <Link href="/inloggen" className="text-club-op underline underline-offset-4">
    Terug naar inloggen
  </Link>
)

export default async function WachtwoordVergeten({
  searchParams,
}: {
  searchParams: Promise<{ verstuurd?: string }>
}) {
  const { verstuurd } = await searchParams

  // Kan er niet gemaild worden, dan is een formulier een lege belofte: je vult
  // je adres in en er komt nooit iets. Dan liever meteen de weg die wél werkt.
  if (!mailWerkt()) {
    return (
      <Poort
        titel="Wachtwoord vergeten"
        inleiding="Je leider kan een herstellink voor je klaarzetten en die naar je doorsturen. Vraag er even om in de groepsapp."
        voet={terug}
      >
        <p className="text-sm text-zacht">
          Log je normaal met Google in, dan heb je hier geen wachtwoord en kun je gewoon op
          &laquo;Doorgaan met Google&raquo; tikken.
        </p>
      </Poort>
    )
  }

  if (verstuurd) {
    return (
      <Poort
        titel="Kijk in je mail"
        inleiding="Staat dit adres bij ons bekend, dan ligt er nu een link om een nieuw wachtwoord te kiezen. Hij is een uur geldig."
        voet={terug}
      />
    )
  }

  return (
    <Poort
      titel="Wachtwoord vergeten"
      inleiding="Vul je e-mailadres in, dan sturen we je een link om een nieuw wachtwoord te kiezen."
      voet={terug}
    >
      <form action={stuurHerstelmail} className="flex flex-col gap-3">
        <input
          type="email"
          name="email"
          required
          placeholder="je@voorbeeld.nl"
          autoComplete="email"
          className="min-h-11 rounded-xl border border-rand bg-paneel px-4 text-sm placeholder:text-zacht/70"
        />
        <Knop toon="club">Stuur me een link</Knop>
      </form>
    </Poort>
  )
}
