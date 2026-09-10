'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { vereisLeider, vereisSpeler } from '@/lib/auth/sessie'
import { beeindigAfwezigheid, maakAfwezigheid, wijzigAfwezigheid } from '@/lib/db/afwezigheid'
import { db } from '@/lib/db/client'
import { dagVan } from '@/lib/domein/afwezigheid'
import { alsTekst } from '@/lib/weergave/formulier'

/** Leest een datumveld uit een formulier; alles wat geen ISO-dag is wordt leeg. */
function alsDag(waarde: unknown): string | null {
  const tekst = String(waarde ?? '').trim()
  return /^\d{4}-\d{2}-\d{2}$/.test(tekst) ? tekst : null
}

function vereisReden(waarde: unknown): string {
  const reden = String(waarde ?? '').trim()
  if (reden === '') throw new Error('Vul in waarom je er niet bent.')
  return reden
}

/** Een afwezigheid verandert de selectie, en die wordt op vier schermen gelezen. */
function ververs() {
  revalidatePath('/')
  revalidatePath('/mij')
  revalidatePath('/leider')
  revalidatePath('/leider/spelers')
}

export async function zetMijnAfwezigheid(formulier: FormData) {
  const speler = await vereisSpeler()
  const van = alsDag(formulier.get('van')) ?? dagVan(new Date())

  await maakAfwezigheid(db(), {
    spelerId: speler.id,
    van,
    terugOp: alsDag(formulier.get('terugOp')),
    reden: vereisReden(formulier.get('reden')),
    gezetDoor: speler.id,
  })

  ververs()
  redirect('/mij?opgeslagen=1')
}

export async function wijzigMijnAfwezigheid(formulier: FormData) {
  const speler = await vereisSpeler()
  const van = alsDag(formulier.get('van'))
  if (!van) throw new Error('Vul in vanaf wanneer je er niet bent.')

  await wijzigAfwezigheid(db(), {
    id: alsTekst(formulier, 'id'),
    van,
    terugOp: alsDag(formulier.get('terugOp')),
    reden: vereisReden(formulier.get('reden')),
    alleenVanSpeler: speler.id,
  })

  ververs()
  redirect('/mij?opgeslagen=1')
}

export async function beeindigMijnAfwezigheid(formulier: FormData) {
  const speler = await vereisSpeler()

  await beeindigAfwezigheid(db(), {
    id: alsTekst(formulier, 'id'),
    vandaag: dagVan(new Date()),
    alleenVanSpeler: speler.id,
  })

  ververs()
  redirect('/mij?opgeslagen=1')
}

export async function zetAfwezigheidAlsLeider(formulier: FormData) {
  const leider = await vereisLeider()
  const van = alsDag(formulier.get('van')) ?? dagVan(new Date())

  await maakAfwezigheid(db(), {
    spelerId: alsTekst(formulier, 'spelerId'),
    van,
    terugOp: alsDag(formulier.get('terugOp')),
    reden: vereisReden(formulier.get('reden')),
    gezetDoor: leider.id,
  })

  ververs()
}

export async function beeindigAfwezigheidAlsLeider(formulier: FormData) {
  await vereisLeider()

  await beeindigAfwezigheid(db(), {
    id: alsTekst(formulier, 'id'),
    vandaag: dagVan(new Date()),
    // De leider mag bij iedereen; de rechtencontrole zat in vereisLeider.
    alleenVanSpeler: null,
  })

  ververs()
}
