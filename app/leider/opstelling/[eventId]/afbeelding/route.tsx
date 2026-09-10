import { eq } from 'drizzle-orm'
import { ImageResponse } from 'next/og'
import { huidigeSpeler } from '@/lib/auth/sessie'
import { db } from '@/lib/db/client'
import { leesOpstellingWeergave } from '@/lib/db/opstelling'
import { events } from '@/lib/db/schema'
import { STANDAARDFORMATIE, zoekFormatie } from '@/lib/domein/formaties'
import { eventTitel } from '@/lib/weergave/namen'
import { alsDagEnTijd } from '@/lib/weergave/tijd'
import { AFMETING, Veldplaat } from './plaat'

export const dynamic = 'force-dynamic'

export async function GET(_verzoek: Request, { params }: { params: Promise<{ eventId: string }> }) {
  // Geen redirect maar een status: dit wordt met fetch opgehaald en een
  // inlogpagina als antwoord zou stilletjes als kapotte afbeelding eindigen.
  const speler = await huidigeSpeler()
  if (!speler || speler.rol !== 'leider' || speler.accountStatus !== 'actief') {
    return new Response('Geen toegang', { status: 403 })
  }

  const { eventId } = await params
  const verbinding = db()

  const [event] = await verbinding.select().from(events).where(eq(events.id, eventId))
  if (!event || event.type !== 'wedstrijd') {
    return new Response('Niet gevonden', { status: 404 })
  }

  const { opstelling, weergave } = await leesOpstellingWeergave(verbinding, eventId)
  if (!opstelling || weergave.basis.length === 0) {
    return new Response('Er staat nog geen opstelling klaar', { status: 404 })
  }

  // Terugval op de standaardformatie: een plaat met de spelers op de goede
  // plek is beter dan geen plaat als er ooit een formatie uit de catalogus valt.
  const formatie = zoekFormatie(opstelling.formatie) ?? zoekFormatie(STANDAARDFORMATIE)
  if (!formatie) return new Response('Onbekende formatie', { status: 500 })

  return new ImageResponse(
    <Veldplaat
      titel={eventTitel(event)}
      wanneer={alsDagEnTijd(event.startOp)}
      formatie={formatie}
      weergave={weergave}
    />,
    AFMETING,
  )
}
