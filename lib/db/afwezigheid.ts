import { and, desc, eq, gt, isNull, lt, lte, or } from 'drizzle-orm'
import { type Afwezigheid, dagVan } from '@/lib/domein/afwezigheid'
import type { Db } from './client'
import { afwezigheden } from './schema'

export type AfwezigheidRij = typeof afwezigheden.$inferSelect

/**
 * Alle periodes die het venster [van, tot) raken. Bewust een venster en niet
 * "alles wat nu loopt": het weekoverzicht kan naar een week in het verleden
 * bladeren, en daar hoort de selectie van tóén bij.
 */
export async function leesAfwezighedenTussen(
  db: Db,
  van: Date,
  tot: Date,
): Promise<Afwezigheid[]> {
  const eersteDag = dagVan(van)
  const laatsteDag = dagVan(tot)

  return db
    .select({
      spelerId: afwezigheden.spelerId,
      van: afwezigheden.van,
      terugOp: afwezigheden.terugOp,
    })
    .from(afwezigheden)
    .where(
      and(
        lt(afwezigheden.van, laatsteDag),
        or(isNull(afwezigheden.terugOp), gt(afwezigheden.terugOp, eersteDag)),
      ),
    )
}

/**
 * De periodes die op dit moment lopen, mét sleutel. `leesAfwezighedenTussen`
 * geeft het pure begrip terug en dat draagt bewust geen databasesleutel; de
 * schermen die een periode kunnen beëindigen hebben die wél nodig.
 */
export async function leesLopendeAfwezigheden(
  db: Db,
  moment: Date,
): Promise<AfwezigheidRij[]> {
  const dag = dagVan(moment)
  return db
    .select()
    .from(afwezigheden)
    .where(
      and(
        lte(afwezigheden.van, dag),
        or(isNull(afwezigheden.terugOp), gt(afwezigheden.terugOp, dag)),
      ),
    )
}

/** Alles wat er ooit voor deze speler is vastgelegd, nieuwste eerst. */
export async function leesAfwezighedenVanSpeler(
  db: Db,
  spelerId: string,
): Promise<AfwezigheidRij[]> {
  return db
    .select()
    .from(afwezigheden)
    .where(eq(afwezigheden.spelerId, spelerId))
    .orderBy(desc(afwezigheden.van))
}

const OVERLAPBEPERKING = 'afwezigheid_niet_overlappend'

/**
 * Drizzle verpakt de databasefout in een eigen fout met de query als tekst, dus
 * de naam van de beperking zit een laag dieper dan je zou verwachten.
 */
function isOverlapfout(fout: unknown): boolean {
  let laag: unknown = fout
  while (laag instanceof Error) {
    const naam = (laag as Error & { constraint_name?: string }).constraint_name
    if (naam === OVERLAPBEPERKING || laag.message.includes(OVERLAPBEPERKING)) return true
    laag = laag.cause
  }
  return false
}

export async function maakAfwezigheid(
  db: Db,
  invoer: {
    spelerId: string
    van: string
    terugOp: string | null
    reden: string
    gezetDoor: string
  },
): Promise<AfwezigheidRij> {
  try {
    const [rij] = await db.insert(afwezigheden).values(invoer).returning()
    return rij
  } catch (fout) {
    // De uitsluitingsbeperking is een prima vangnet maar een slechte melding.
    if (isOverlapfout(fout)) throw new Error('Er loopt al een periode over die dagen.')
    throw fout
  }
}

/**
 * `alleenVanSpeler` is de rechtencontrole: gevuld beperkt hij de wijziging tot
 * de eigen periode. Als voorwaarde in de update en niet als losse controle
 * ervoor, zodat er tussen kijken en schrijven niets kan gebeuren.
 */
export async function wijzigAfwezigheid(
  db: Db,
  invoer: {
    id: string
    van: string
    terugOp: string | null
    reden: string
    alleenVanSpeler: string | null
  },
): Promise<void> {
  const geraakt = await db
    .update(afwezigheden)
    .set({
      van: invoer.van,
      terugOp: invoer.terugOp,
      reden: invoer.reden,
      bijgewerktOp: new Date(),
    })
    .where(
      invoer.alleenVanSpeler === null
        ? eq(afwezigheden.id, invoer.id)
        : and(
            eq(afwezigheden.id, invoer.id),
            eq(afwezigheden.spelerId, invoer.alleenVanSpeler),
          ),
    )
    .returning({ id: afwezigheden.id })

  if (geraakt.length === 0) throw new Error('Deze periode kun je niet aanpassen.')
}

/**
 * Per direct terug. Een periode die vandaag of later begint wordt verwijderd
 * in plaats van afgesloten: hij zou anders nul dagen lang worden en dat weigert
 * de database — en er valt ook niets te bewaren van iets wat nooit begon.
 */
export async function beeindigAfwezigheid(
  db: Db,
  invoer: { id: string; vandaag: string; alleenVanSpeler: string | null },
): Promise<void> {
  const [bestaand] = await db.select().from(afwezigheden).where(eq(afwezigheden.id, invoer.id))

  if (!bestaand) throw new Error('Deze periode bestaat niet meer.')
  if (invoer.alleenVanSpeler !== null && bestaand.spelerId !== invoer.alleenVanSpeler) {
    throw new Error('Deze periode kun je niet aanpassen.')
  }

  if (bestaand.van >= invoer.vandaag) {
    await db.delete(afwezigheden).where(eq(afwezigheden.id, invoer.id))
    return
  }

  await wijzigAfwezigheid(db, {
    id: invoer.id,
    van: bestaand.van,
    terugOp: invoer.vandaag,
    reden: bestaand.reden,
    alleenVanSpeler: invoer.alleenVanSpeler,
  })
}
