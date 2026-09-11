'use server'

import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth/auth'
import { vereisLeider } from '@/lib/auth/sessie'
import { vraagHerstellink } from '@/lib/auth/wachtwoord'
import { db } from '@/lib/db/client'
import { leesSpeler } from '@/lib/db/spelers'
import { alsTekst } from '@/lib/weergave/formulier'

/**
 * De speler vraagt zelf om een herstellink. Die gaat per mail de deur uit, en
 * het antwoord op dit scherm is altijd hetzelfde — of het adres hier nu bekend
 * is of niet. Wie voor de deur staat hoort niet te kunnen aflezen wie er in de
 * ploeg zit.
 */
export async function stuurHerstelmail(formulier: FormData) {
  const email = alsTekst(formulier, 'email').trim().toLowerCase()

  await auth.api.requestPasswordReset({
    body: { email, redirectTo: `${process.env.BETTER_AUTH_URL}/nieuw-wachtwoord` },
  })

  redirect('/wachtwoord-vergeten?verstuurd=ja')
}

/**
 * De leider zet een herstellink klaar om zelf door te sturen. Dit is de weg
 * zolang er niet gemaild kan worden, en daarna blijft hij bestaan voor wie
 * zijn mail niet vindt.
 */
export async function haalHerstellink(spelerId: string): Promise<string | null> {
  await vereisLeider()

  const speler = await leesSpeler(db(), spelerId)
  if (!speler) return null

  return vraagHerstellink(speler.email)
}
