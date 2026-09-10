import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/client'
import { zoekSpelerBijGebruiker } from '@/lib/db/spelers'
import { auth } from './auth'

export type HuidigeSpeler = {
  id: string
  naam: string
  rol: 'speler' | 'leider'
  accountStatus: 'uitgenodigd' | 'wacht_op_goedkeuring' | 'actief'
}

/**
 * Alleen de identiteit, zonder speler erbij. Nodig op de uitnodigings- en
 * aanmeldpagina: daar heeft iemand wél een account maar nog géén spelersrij.
 */
export async function huidigeGebruiker(): Promise<{ id: string; email: string } | null> {
  const sessie = await auth.api.getSession({ headers: await headers() })
  if (!sessie?.user) return null
  return { id: sessie.user.id, email: sessie.user.email }
}

/**
 * Zet identiteit om in rechten. Dit is de enige plek waar dat gebeurt; elke
 * serveractie en elke pagina begint hier. Het id komt altijd hiervandaan en
 * nooit uit het verzoek.
 */
export async function huidigeSpeler(): Promise<HuidigeSpeler | null> {
  const sessie = await auth.api.getSession({ headers: await headers() })
  if (!sessie?.user) return null

  const speler = await zoekSpelerBijGebruiker(db(), sessie.user.id)
  if (!speler) return null

  return {
    id: speler.id,
    naam: speler.weergavenaam ?? speler.naam,
    rol: speler.rol,
    accountStatus: speler.accountStatus,
  }
}

export async function vereisSpeler(): Promise<HuidigeSpeler> {
  const speler = await huidigeSpeler()
  if (!speler) redirect('/inloggen')
  if (speler.accountStatus !== 'actief') redirect('/wachten')
  return speler
}

export async function vereisLeider(): Promise<HuidigeSpeler> {
  const speler = await vereisSpeler()
  // Geen foutpagina maar terug naar het eigen scherm: een speler die hier
  // per ongeluk komt hoeft niet te weten dat deze pagina bestaat.
  if (speler.rol !== 'leider') redirect('/')
  return speler
}
