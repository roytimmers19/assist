'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { meldZelfAan, neemUitnodigingIn } from '@/lib/auth/uitnodiging'
import { db } from '@/lib/db/client'
import { zoekSpelerBijGebruiker } from '@/lib/db/spelers'
import { alsTekst } from '@/lib/weergave/formulier'

export async function rondUitnodigingAf(token: string) {
  const sessie = await auth.api.getSession({ headers: await headers() })
  if (!sessie?.user) redirect(`/inloggen?uitnodiging=${encodeURIComponent(token)}`)

  try {
    await neemUitnodigingIn(db(), token, sessie.user.id)
  } catch {
    // Twee keer tikken laat het tweede verzoek de inname verliezen. Wie al aan
    // een speler hangt is gewoon binnen; alleen wie dat niet is heeft echt een
    // dode link en hoort dat op de uitnodigingspagina te lezen.
    const speler = await zoekSpelerBijGebruiker(db(), sessie.user.id)
    if (!speler) redirect(`/uitnodiging/${token}`)
  }

  redirect('/')
}

export async function meldAan(formulier: FormData) {
  const sessie = await auth.api.getSession({ headers: await headers() })
  if (!sessie?.user) redirect('/inloggen')

  const teamcode = alsTekst(formulier, 'teamcode')
  const uitkomst = await meldZelfAan(
    db(),
    sessie.user.id,
    sessie.user.email,
    sessie.user.name || sessie.user.email,
    teamcode,
  )

  if (uitkomst === 'verkeerde_code') redirect('/aanmelden?fout=code')
  redirect('/wachten')
}
