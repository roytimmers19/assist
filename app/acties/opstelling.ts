'use server'

import { revalidatePath } from 'next/cache'
import { vereisLeider } from '@/lib/auth/sessie'
import { db } from '@/lib/db/client'
import { bewaarOpstelling, type PlekInvoer, trekOpstellingIn } from '@/lib/db/opstelling'
import { leesActieveSpelers } from '@/lib/db/spelers'
import { zoekFormatie } from '@/lib/domein/formaties'

/**
 * De hele opstelling in één keer. Er is bewust geen actie per plek: dat zou
 * een halve opstelling in de database kunnen achterlaten.
 */
export async function bewaarEnPubliceer(invoer: {
  eventId: string
  formatie: string
  plekken: PlekInvoer[]
  publiceren: boolean
}): Promise<void> {
  await vereisLeider()

  const formatie = zoekFormatie(invoer.formatie)
  if (!formatie) throw new Error('Onbekende formatie.')

  const geldigeSlots = new Set(formatie.plekken.map((p) => p.slot))
  const toegestaneSpelers = new Set((await leesActieveSpelers(db())).map((s) => s.id))

  const gezien = new Set<string>()

  for (const plek of invoer.plekken) {
    if (plek.slot !== null && !geldigeSlots.has(plek.slot)) {
      throw new Error('Die positie hoort niet bij deze formatie.')
    }

    const heeftSpeler = Boolean(plek.spelerId)
    const heeftGast = Boolean(plek.gastnaam?.trim())
    if (heeftSpeler === heeftGast) {
      throw new Error('Een positie draagt een speler of een gast, nooit allebei.')
    }

    if (heeftSpeler) {
      if (!toegestaneSpelers.has(plek.spelerId as string)) {
        throw new Error('Die speler hoort niet bij dit team.')
      }
      if (gezien.has(plek.spelerId as string)) {
        throw new Error('Die speler staat al opgesteld.')
      }
      gezien.add(plek.spelerId as string)
    }

    // Een eigen speler op de bank bestaat niet: die wordt afgeleid.
    if (plek.slot === null && heeftSpeler) {
      throw new Error('Alleen gasten kunnen los op de bank staan.')
    }
  }

  await bewaarOpstelling(db(), {
    eventId: invoer.eventId,
    formatie: invoer.formatie,
    plekken: invoer.plekken,
    publiceren: invoer.publiceren,
  })

  revalidatePath('/leider')
  revalidatePath(`/leider/opstelling/${invoer.eventId}`)
  revalidatePath('/')
}

/** Terug naar concept. De opstelling blijft staan; alleen niemand ziet hem nog. */
export async function trekIn(eventId: string): Promise<void> {
  await vereisLeider()
  await trekOpstellingIn(db(), eventId)

  revalidatePath('/leider')
  revalidatePath(`/leider/opstelling/${eventId}`)
  revalidatePath('/')
}
