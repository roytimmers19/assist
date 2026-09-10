import { redirect } from 'next/navigation'
import { meldAan } from '@/app/acties/toetreden'
import { Knop } from '@/app/_onderdelen/Knop'
import { Poort } from '@/app/_onderdelen/Poort'
import { Toegang } from '@/app/_onderdelen/Toegang'
import { huidigeGebruiker, huidigeSpeler } from '@/lib/auth/sessie'
import { db } from '@/lib/db/client'
import { leesTeamInstelling } from '@/lib/db/instellingen'
import { zonderDagsoort } from '@/lib/weergave/namen'

export const dynamic = 'force-dynamic'

export default async function Aanmelden({
  searchParams,
}: {
  searchParams: Promise<{ fout?: string; code?: string }>
}) {
  const { fout, code } = await searchParams
  const [gebruiker, instelling] = await Promise.all([huidigeGebruiker(), leesTeamInstelling(db())])
  const team = zonderDagsoort(instelling.teamnaam)

  // Deze link staat in de groepsapp, dus wie al lid is tikt er vroeg of laat
  // nog eens op. Dan hoort hij het formulier niet te zien maar gewoon binnen
  // te komen; aanmelden heeft voor hem niets meer te betekenen.
  const speler = gebruiker ? await huidigeSpeler() : null
  if (speler?.accountStatus === 'actief') redirect('/')
  if (speler?.accountStatus === 'wacht_op_goedkeuring') redirect('/wachten')

  // De code reist mee door het inloggen heen, zodat hij daarna nog ingevuld staat.
  const terug = code ? `/aanmelden?code=${encodeURIComponent(code)}` : '/aanmelden'

  if (!gebruiker) {
    return (
      <Poort
        titel={`Bij ${team}`}
        inleiding="Maak eerst een account aan, of log in met Google. Daarna sta je met één tik in de ploeg."
      >
        <Toegang naarwaar={terug} nieuw />
      </Poort>
    )
  }

  return (
    <Poort
      titel={`Bij ${team}`}
      inleiding={
        code
          ? 'De teamcode staat al ingevuld. Tik op Aanmelden, dan zet je leider je erbij.'
          : 'Vul de teamcode in die je leider in de groepsapp heeft gezet.'
      }
    >
      <form action={meldAan} className="flex flex-col gap-3">
        <input
          name="teamcode"
          required
          defaultValue={code ?? ''}
          autoCapitalize="characters"
          placeholder="VB2-XXXX"
          className="uithangbord cijfers min-h-14 rounded-xl border border-rand bg-paneel px-4 text-center text-xl uppercase placeholder:font-sans placeholder:text-base placeholder:font-normal placeholder:tracking-normal placeholder:text-zacht/60"
        />
        {fout === 'code' && (
          <p role="alert" className="text-sm text-weg-op">
            Die teamcode klopt niet. Kijk hem na in de groepsapp.
          </p>
        )}
        <Knop toon="club">Aanmelden</Knop>
      </form>
    </Poort>
  )
}
