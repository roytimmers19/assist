'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { vereisLeider } from '@/lib/auth/sessie'
import { leesKomendeAgenda } from '@/lib/db/aanwezigheid'
import { db } from '@/lib/db/client'
import {
  bewaarToewijzingen,
  controleerDienst,
  haalDienstWeg,
  leesDiensten,
  wijsDienstToe,
} from '@/lib/db/diensten'
import { events } from '@/lib/db/schema'
import { leesActieveSpelers } from '@/lib/db/spelers'
import { type Dienstsoort, verdeelDiensten } from '@/lib/domein/diensten'
import { alsTekst } from '@/lib/weergave/formulier'

function alsSoort(waarde: unknown): Dienstsoort {
  const tekst = String(waarde ?? '')
  if (tekst !== 'materiaal' && tekst !== 'rijden') throw new Error('Onbekende dienst.')
  return tekst
}

/** Een dienst verandert wat er op drie schermen staat. */
function ververs() {
  revalidatePath('/')
  revalidatePath('/leider')
  revalidatePath('/leider/diensten')
}

export async function wijsDienstToeAlsLeider(formulier: FormData) {
  const leider = await vereisLeider()
  const eventId = alsTekst(formulier, 'eventId')
  const soort = alsSoort(formulier.get('soort'))

  const [event] = await db().select().from(events).where(eq(events.id, eventId))
  if (!event) throw new Error('Dit event bestaat niet meer.')
  controleerDienst(event, soort)

  await wijsDienstToe(db(), {
    eventId,
    spelerId: alsTekst(formulier, 'spelerId'),
    soort,
    toegewezenDoor: leider.id,
  })

  ververs()
}

export async function haalDienstWegAlsLeider(formulier: FormData) {
  await vereisLeider()

  await haalDienstWeg(db(), {
    eventId: alsTekst(formulier, 'eventId'),
    spelerId: alsTekst(formulier, 'spelerId'),
    soort: alsSoort(formulier.get('soort')),
  })

  ververs()
}

/**
 * Vult de lege plekken van het hele seizoen. Raakt niets aan wat er al staat,
 * dus er kan zonder gevolgen nog eens op gedrukt worden.
 */
export async function verdeelSeizoen() {
  const leider = await vereisLeider()
  const verbinding = db()

  const [komend, selectie] = await Promise.all([
    leesKomendeAgenda(verbinding, new Date()),
    leesActieveSpelers(verbinding),
  ])
  const bestaandPerEvent = await leesDiensten(
    verbinding,
    komend.map((e) => e.id),
  )

  const nieuw = verdeelDiensten({
    spelerIds: selectie.map((s) => s.id),
    events: komend.map((e) => ({
      id: e.id,
      type: e.type,
      thuis: e.thuis,
      afgelast: e.status === 'afgelast',
    })),
    bestaand: [...bestaandPerEvent.values()].flat().map((r) => ({
      eventId: r.eventId,
      spelerId: r.spelerId,
      soort: r.soort,
    })),
  })

  await bewaarToewijzingen(verbinding, nieuw, leider.id)
  ververs()
}
