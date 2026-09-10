import { createHash, randomBytes } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'
import type { Db } from '@/lib/db/client'
import { leesTeamInstelling } from '@/lib/db/instellingen'
import { deurStaatOpen } from '@/lib/domein/toelating'
import { spelers, uitnodigingen } from '@/lib/db/schema'

const GELDIG_DAGEN = 7

function hash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

/** Geeft de ruwe token terug. Die is hierna nergens meer op te halen. */
export async function maakUitnodiging(db: Db, spelerId: string): Promise<string> {
  const token = randomBytes(32).toString('base64url')
  const verlooptOp = new Date(Date.now() + GELDIG_DAGEN * 24 * 60 * 60 * 1000)

  await db.insert(uitnodigingen).values({ spelerId, tokenHash: hash(token), verlooptOp })
  return token
}

export async function leesUitnodiging(db: Db, token: string): Promise<{ spelerId: string } | null> {
  const [rij] = await db
    .select({ spelerId: uitnodigingen.spelerId })
    .from(uitnodigingen)
    .where(
      and(
        eq(uitnodigingen.tokenHash, hash(token)),
        isNull(uitnodigingen.gebruiktOp),
        gt(uitnodigingen.verlooptOp, new Date()),
      ),
    )
  return rij ?? null
}

/**
 * Koppelt het zojuist aangemaakte account aan de uitgenodigde speler.
 * De koppeling loopt via de token en nadrukkelijk niet via het e-mailadres:
 * wie met Google inlogt onder een ander adres hoort nog steeds bij deze speler.
 */
export async function neemUitnodigingIn(db: Db, token: string, gebruikerId: string): Promise<void> {
  await db.transaction(async (tx) => {
    // Het innemen is zelf de vergrendeling. Eerst apart controleren en daarna
    // schrijven laat een gaatje open waar twee verzoeken allebei doorheen
    // passen; de laatste zou dan de koppeling van de eerste overschrijven en
    // dus de speler overnemen. Deze update raakt nul rijen zodra iemand anders
    // hem voor was.
    const [ingenomen] = await tx
      .update(uitnodigingen)
      .set({ gebruiktOp: new Date() })
      .where(
        and(
          eq(uitnodigingen.tokenHash, hash(token)),
          isNull(uitnodigingen.gebruiktOp),
          gt(uitnodigingen.verlooptOp, new Date()),
        ),
      )
      .returning({ spelerId: uitnodigingen.spelerId })

    if (!ingenomen) throw new Error('Deze uitnodiging werkt niet meer.')

    await tx
      .update(spelers)
      .set({ gebruikerId, accountStatus: 'actief', actief: true })
      .where(eq(spelers.id, ingenomen.spelerId))
  })
}

export async function meldZelfAan(
  db: Db,
  gebruikerId: string,
  email: string,
  naam: string,
  teamcode: string,
): Promise<'ok' | 'verkeerde_code'> {
  const instelling = await leesTeamInstelling(db)
  if (teamcode.trim().toUpperCase() !== instelling.teamcode.toUpperCase()) return 'verkeerde_code'

  const [bestaand] = await db.select().from(spelers).where(eq(spelers.email, email))

  if (bestaand) {
    // Geen tweede rij: het bestaande account wordt gekoppeld. Wie al binnen is
    // raakt daarbij niets kwijt — de aanmeldlink staat in de groepsapp en
    // iedereen kan er nog eens op tikken. Een leider die zichzelf zo op
    // wachten zet sluit zichzelf buiten zijn eigen team.
    const alBinnen = bestaand.accountStatus === 'actief'

    await db
      .update(spelers)
      .set({
        gebruikerId,
        accountStatus: alBinnen ? 'actief' : 'wacht_op_goedkeuring',
      })
      .where(eq(spelers.id, bestaand.id))
    return 'ok'
  }

  // Staat de deur open, dan hoeft de leider er niet meer aan te pas te komen.
  // Het moment van aanmelden telt; wie al wacht merkt van het openzetten niets.
  const direct = deurStaatOpen(instelling.automatischToelatenTot, new Date())

  await db.insert(spelers).values({
    naam,
    email,
    gebruikerId,
    rol: 'speler',
    accountStatus: direct ? 'actief' : 'wacht_op_goedkeuring',
    // Zonder open deur op inactief, zodat hij niet stilzwijgend op ja staat bij
    // al geplande events voordat de leider hem heeft gezien.
    actief: direct,
  })
  return 'ok'
}

export async function keurGoed(db: Db, spelerId: string): Promise<void> {
  await db
    .update(spelers)
    .set({ accountStatus: 'actief', actief: true })
    .where(eq(spelers.id, spelerId))
}
