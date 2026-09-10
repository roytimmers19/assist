'use server'

import { revalidatePath } from 'next/cache'
import { vereisSpeler } from '@/lib/auth/sessie'
import { zetAanwezigheid } from '@/lib/db/aanwezigheid'
import { db } from '@/lib/db/client'
import { alsTekst, alsTekstOfNiets } from '@/lib/weergave/formulier'

/**
 * Het speler-id komt uit de sessie en nooit uit het formulier. Daarom kan een
 * speler hier per constructie alleen zichzelf af- of aanmelden.
 */
export async function meldMijAf(formulier: FormData) {
  const speler = await vereisSpeler()
  const eventId = alsTekst(formulier, 'eventId')
  const toelichting = alsTekstOfNiets(formulier, 'toelichting')

  await zetAanwezigheid(db(), {
    eventId,
    spelerId: speler.id,
    status: 'nee',
    bron: 'speler',
    toelichting,
    gezetDoorSpelerId: speler.id,
  })
  revalidatePath('/')
}

export async function meldMijAan(formulier: FormData) {
  const speler = await vereisSpeler()
  const eventId = alsTekst(formulier, 'eventId')

  await zetAanwezigheid(db(), {
    eventId,
    spelerId: speler.id,
    status: 'ja',
    bron: 'speler',
    toelichting: null,
    gezetDoorSpelerId: speler.id,
  })
  revalidatePath('/')
}
