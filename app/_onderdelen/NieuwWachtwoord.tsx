'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { resetPassword } from '@/lib/auth/client'
import { Knop } from './Knop'

/** Het laatste stukje van de herstelweg: een nieuw wachtwoord kiezen. */
export function NieuwWachtwoord({ token }: { token: string }) {
  const router = useRouter()
  const [wachtwoord, setWachtwoord] = useState('')
  const [fout, setFout] = useState<string | null>(null)
  const [bezig, setBezig] = useState(false)

  async function verstuur(gebeurtenis: React.FormEvent) {
    gebeurtenis.preventDefault()
    setBezig(true)
    setFout(null)

    const { error } = await resetPassword({ newPassword: wachtwoord, token })

    if (error) {
      setFout('Deze link werkt niet meer. Vraag om een nieuwe.')
      setBezig(false)
      return
    }

    router.push('/inloggen?hersteld=ja')
    router.refresh()
  }

  return (
    <form onSubmit={verstuur} className="flex flex-col gap-3">
      <input
        type="password"
        required
        minLength={8}
        value={wachtwoord}
        onChange={(e) => setWachtwoord(e.target.value)}
        placeholder="Nieuw wachtwoord (min. 8 tekens)"
        autoComplete="new-password"
        className="min-h-11 rounded-xl border border-rand bg-paneel px-4 text-sm placeholder:text-zacht/70"
      />
      {fout && (
        <p role="alert" className="text-sm text-weg-op">
          {fout}
        </p>
      )}
      <Knop type="submit" toon="club" disabled={bezig} className="disabled:opacity-50">
        Dit wordt mijn wachtwoord
      </Knop>
    </form>
  )
}
