import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { db } from '@/lib/db/client'
import { zoekSpelerBijGebruiker } from '@/lib/db/spelers'
import { magAfrekenen, magBoetesGeven, magLeiden } from '@/lib/domein/rechten'
import { auth } from './auth'

export type HuidigeSpeler = {
  id: string
  naam: string
  /** Leider of beheerder. De rol zelf staat hier bewust niet. */
  magLeiden: boolean
  /** Boetes geven, intrekken en voorstellen afhandelen. */
  magBoetesGeven: boolean
  /** Afvinken wat betaald is en de vaste boetes beheren. */
  magAfrekenen: boolean
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
    magLeiden: magLeiden(speler),
    magBoetesGeven: magBoetesGeven(speler),
    magAfrekenen: magAfrekenen(speler),
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
  if (!speler.magLeiden) redirect('/')
  return speler
}

/** Voor de schermen en acties waar boetes gegeven worden. */
export async function vereisBoeteGever(): Promise<HuidigeSpeler> {
  const speler = await vereisSpeler()
  if (!speler.magBoetesGeven) redirect('/boetepot')
  return speler
}

/** Voor afrekenen en de vaste boetes. */
export async function vereisAfrekenaar(): Promise<HuidigeSpeler> {
  const speler = await vereisSpeler()
  if (!speler.magAfrekenen) redirect('/boetepot')
  return speler
}
