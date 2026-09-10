'use server'

import { revalidatePath } from 'next/cache'
import { vereisLeider } from '@/lib/auth/sessie'
import { zetAanwezigheid } from '@/lib/db/aanwezigheid'
import { db } from '@/lib/db/client'
import { alsTekst, alsTekstOfNiets } from '@/lib/weergave/formulier'

/** Voor de speler die tóch belt. Wordt vastgelegd als door de leider gezet. */
export async function zetAanwezigheidAlsLeider(formulier: FormData) {
  const leider = await vereisLeider()
  const eventId = alsTekst(formulier, 'eventId')
  const spelerId = alsTekst(formulier, 'spelerId')
  const status = formulier.get('status') === 'ja' ? 'ja' : 'nee'
  const toelichting = alsTekstOfNiets(formulier, 'toelichting')

  await zetAanwezigheid(db(), {
    eventId,
    spelerId,
    status,
    bron: 'leider',
    toelichting,
    gezetDoorSpelerId: leider.id,
  })
  revalidatePath('/leider')
}
