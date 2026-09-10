'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { vereisSpeler } from '@/lib/auth/sessie'
import { db } from '@/lib/db/client'
import { wijzigSpeler } from '@/lib/db/spelers'
import { alsTekstOfNiets, alsVinkje } from '@/lib/weergave/formulier'
import { alsPositie } from '@/lib/weergave/posities'

/**
 * Wat een speler over zichzelf mag zeggen. Het id komt uit de sessie en nooit
 * uit het formulier, en rugnummer en rol staan er bewust niet bij: dat is
 * teamadministratie en die blijft bij de leider.
 */
export async function bewerkMijnGegevens(formulier: FormData) {
  const speler = await vereisSpeler()

  await wijzigSpeler(db(), speler.id, {
    weergavenaam: alsTekstOfNiets(formulier, 'weergavenaam'),
    telefoon: alsTekstOfNiets(formulier, 'telefoon'),
    positie: alsPositie(formulier.get('positie')),
    doetTrainingen: alsVinkje(formulier, 'doetTrainingen'),
    doetWedstrijden: alsVinkje(formulier, 'doetWedstrijden'),
  })

  revalidatePath('/mij')
  revalidatePath('/leider')
  redirect('/mij?opgeslagen=1')
}
