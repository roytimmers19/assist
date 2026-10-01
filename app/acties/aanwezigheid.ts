'use server'

import { revalidatePath } from 'next/cache'
import { vereisSpeler } from '@/lib/auth/sessie'
import { zetAanwezigheid } from '@/lib/db/aanwezigheid'
import { db } from '@/lib/db/client'
import { alsTekst, alsVerplichteTekst } from '@/lib/weergave/formulier'

/**
 * Het speler-id komt uit de sessie en nooit uit het formulier. Daarom kan een
 * speler hier per constructie alleen zichzelf af- of aanmelden.
 *
 * Een afmelding draagt een reden: de leider wil weten waarom iemand er niet is.
 * Het formulier vraagt er al om; dit is de controle die je niet kunt omzeilen.
 */
export async function meldMijAf(formulier: FormData) {
  const speler = await vereisSpeler()
  const eventId = alsTekst(formulier, 'eventId')
  const toelichting = alsVerplichteTekst(formulier, 'toelichting', 'Vul in waarom je niet kunt.')

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
