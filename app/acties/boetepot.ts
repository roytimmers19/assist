'use server'

import { eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { vereisAfrekenaar, vereisBoeteGever } from '@/lib/auth/sessie'
import {
  bevestigVoorstel,
  bewaarBoetesoort,
  geefBoetes,
  koppelTeLaat,
  laatVoorstelVallen,
  leesBoetesoorten,
  leesVoorstelInvoer,
  maakBetaaldOngedaan,
  trekBoeteIn,
  zetBetaald,
  zetSoortActief,
} from '@/lib/db/boetepot'
import { db } from '@/lib/db/client'
import { events } from '@/lib/db/schema'
import { dagVan } from '@/lib/domein/afwezigheid'
import { voorstellen } from '@/lib/domein/voorstellen'
import { leesBoeteKeuze } from '@/lib/weergave/boeteformulier'
import { alsTekst, alsVinkje } from '@/lib/weergave/formulier'
import { alsCenten } from '@/lib/weergave/geld'

/** Een boete verandert de ranglijst, de lijst, het afrekenen en een beginscherm. */
function ververs() {
  revalidatePath('/')
  revalidatePath('/boetepot', 'layout')
}

export async function geefBoete(formulier: FormData) {
  const gever = await vereisBoeteGever()
  const verbinding = db()

  const spelerIds = formulier.getAll('spelerId').map(String).filter(Boolean)
  if (spelerIds.length === 0) redirect('/boetepot/geven?fout=wie')

  const keuze = leesBoeteKeuze(
    {
      soort: alsTekst(formulier, 'soort'),
      omschrijving: alsTekst(formulier, 'omschrijving'),
      bedrag: alsTekst(formulier, 'bedrag'),
    },
    await leesBoetesoorten(verbinding),
  )
  if ('fout' in keuze) redirect(`/boetepot/geven?fout=${keuze.fout}`)

  // Hoort hij bij een event, dan is dat de dag van de boete; anders vandaag.
  const eventId = alsTekst(formulier, 'eventId') || null
  let datum = dagVan(new Date())
  if (eventId) {
    const [event] = await verbinding.select().from(events).where(eq(events.id, eventId))
    if (!event) redirect('/boetepot/geven?fout=event')
    datum = dagVan(event.startOp)
  }

  await geefBoetes(verbinding, { spelerIds, ...keuze, datum, eventId, door: gever.id })
  ververs()
  redirect('/boetepot/boetes')
}

export async function trekBoeteInAlsGever(formulier: FormData) {
  const gever = await vereisBoeteGever()
  await trekBoeteIn(db(), alsTekst(formulier, 'boeteId'), gever.id)
  ververs()
}

/**
 * Het voorstel wordt opnieuw uitgerekend in plaats van uit het verzoek
 * gelezen: zo kan niemand een ander bedrag meesturen, en een voorstel dat
 * intussen verviel, wordt niets.
 */
async function zoekVoorstel(formulier: FormData) {
  const eventId = alsTekst(formulier, 'eventId')
  const spelerId = alsTekst(formulier, 'spelerId')
  const alle = voorstellen(await leesVoorstelInvoer(db()))
  return alle.find((v) => v.eventId === eventId && v.spelerId === spelerId) ?? null
}

export async function bevestigVoorstelAlsGever(formulier: FormData) {
  const gever = await vereisBoeteGever()
  const voorstel = await zoekVoorstel(formulier)
  if (voorstel) await bevestigVoorstel(db(), voorstel, gever.id)
  ververs()
}

export async function laatVoorstelVallenAlsGever(formulier: FormData) {
  const gever = await vereisBoeteGever()
  const voorstel = await zoekVoorstel(formulier)
  if (voorstel) await laatVoorstelVallen(db(), voorstel, gever.id)
  ververs()
}

export async function zetBetaaldAlsAfrekenaar(formulier: FormData) {
  const afrekenaar = await vereisAfrekenaar()
  const spelerId = alsTekst(formulier, 'spelerId')
  const moment = await zetBetaald(db(), spelerId, afrekenaar.id)
  ververs()
  // Zo weet het scherm welke regel net is afgevinkt en "Ongedaan maken" toont.
  redirect(`/boetepot/afrekenen?net=${spelerId}&op=${moment.toISOString()}`)
}

export async function maakBetaaldOngedaanAlsAfrekenaar(formulier: FormData) {
  await vereisAfrekenaar()
  const op = new Date(alsTekst(formulier, 'betaaldOp'))
  if (Number.isNaN(op.getTime())) throw new Error('Onbekend moment van afvinken.')
  await maakBetaaldOngedaan(db(), alsTekst(formulier, 'spelerId'), op)
  ververs()
  redirect('/boetepot/afrekenen')
}

export async function bewaarVasteBoete(formulier: FormData) {
  await vereisAfrekenaar()
  const omschrijving = alsTekst(formulier, 'omschrijving').trim()
  const bedragCent = alsCenten(alsTekst(formulier, 'bedrag'))
  if (!omschrijving) redirect('/boetepot/vaste-boetes?fout=omschrijving')
  if (bedragCent === null) redirect('/boetepot/vaste-boetes?fout=bedrag')

  await bewaarBoetesoort(db(), {
    id: alsTekst(formulier, 'soortId') || undefined,
    omschrijving,
    bedragCent,
  })
  ververs()
}

export async function zetVasteBoeteActief(formulier: FormData) {
  await vereisAfrekenaar()
  await zetSoortActief(db(), alsTekst(formulier, 'soortId'), alsVinkje(formulier, 'actief'))
  ververs()
}

export async function koppelTeLaatAfmelden(formulier: FormData) {
  await vereisAfrekenaar()
  const type = alsTekst(formulier, 'type')
  if (type !== 'training' && type !== 'wedstrijd') throw new Error('Onbekend soort event.')
  await koppelTeLaat(db(), type, alsTekst(formulier, 'soortId') || null)
  ververs()
}
