'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { signIn, signUp } from '@/lib/auth/client'
import { Knop } from './Knop'

const veld =
  'min-h-11 rounded-xl border border-rand bg-paneel px-4 text-sm placeholder:text-zacht/70'

/**
 * Binnenkomen: met Google, met een bestaand wachtwoord, of door er een aan te
 * maken. Dit onderdeel staat op elke pagina waar iemand nog geen sessie heeft —
 * inloggen, een uitnodiging aannemen, en aanmelden met de teamcode — want wie
 * uitgenodigd wordt heeft per definitie nog geen account.
 */
export function Toegang({ naarwaar, nieuw = false }: { naarwaar: string; nieuw?: boolean }) {
  const router = useRouter()
  const [maakAccount, setMaakAccount] = useState(nieuw)
  const [naam, setNaam] = useState('')
  const [email, setEmail] = useState('')
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)

  async function verstuur(gebeurtenis: React.FormEvent) {
    gebeurtenis.preventDefault()
    setBezig(true)
    setFout(null)

    const { error } = maakAccount
      ? await signUp.email({ name: naam || email, email, password: wachtwoord })
      : await signIn.email({ email, password: wachtwoord })

    if (error) {
      setFout(
        maakAccount
          ? (error.message ?? 'Dit account aanmaken lukte niet.')
          : 'Dat e-mailadres en wachtwoord horen niet bij elkaar.',
      )
      setBezig(false)
      return
    }

    router.push(naarwaar)
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-5">
      <Knop
        type="button"
        toon="omlijnd"
        onClick={() => signIn.social({ provider: 'google', callbackURL: naarwaar })}
      >
        Doorgaan met Google
      </Knop>

      <div className="flex items-center gap-3 text-xs text-zacht">
        <span className="h-px flex-1 bg-rand" />
        {maakAccount ? 'of kies een wachtwoord' : 'of met je wachtwoord'}
        <span className="h-px flex-1 bg-rand" />
      </div>

      <form onSubmit={verstuur} className="flex flex-col gap-3">
        {maakAccount && (
          <input
            value={naam}
            onChange={(e) => setNaam(e.target.value)}
            placeholder="Je naam"
            autoComplete="name"
            className={veld}
          />
        )}
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="je@voorbeeld.nl"
          autoComplete="email"
          className={veld}
        />
        <input
          type="password"
          required
          minLength={8}
          value={wachtwoord}
          onChange={(e) => setWachtwoord(e.target.value)}
          placeholder={maakAccount ? 'Nieuw wachtwoord (min. 8 tekens)' : 'Wachtwoord'}
          autoComplete={maakAccount ? 'new-password' : 'current-password'}
          className={veld}
        />
        {fout && (
          <p role="alert" className="text-sm text-weg-op">
            {fout}
          </p>
        )}
        <Knop type="submit" toon="club" disabled={bezig} className="disabled:opacity-50">
          {maakAccount ? 'Account aanmaken' : 'Inloggen'}
        </Knop>
      </form>

      <button
        type="button"
        onClick={() => {
          setMaakAccount(!maakAccount)
          setFout(null)
        }}
        className="text-sm text-zacht underline underline-offset-4 transition-colors hover:text-tekst"
      >
        {maakAccount ? 'Ik heb al een account' : 'Ik moet nog een account maken'}
      </button>
    </div>
  )
}
