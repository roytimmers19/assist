import Link from 'next/link'
import { bewaarVasteBoete, koppelTeLaatAfmelden, zetVasteBoeteActief } from '@/app/acties/boetepot'
import { Knop } from '@/app/_onderdelen/Knop'
import { Schil } from '@/app/_onderdelen/Schil'
import { vereisAfrekenaar } from '@/lib/auth/sessie'
import { leesBoetesoorten } from '@/lib/db/boetepot'
import { db } from '@/lib/db/client'
import { alsEuro } from '@/lib/weergave/geld'

export const dynamic = 'force-dynamic'

const veld = 'min-h-11 rounded-xl border border-rand bg-paneel-op px-4 text-sm placeholder:text-zacht/70'
const kleineKnop =
  'min-h-11 rounded-xl border border-rand px-3 text-xs text-zacht transition-colors hover:border-club-op/60 hover:text-tekst'

/** Een bedrag zoals het in een invulveld hoort te staan: 2,00 en niet € 2,00. */
function alsInvoer(cent: number): string {
  return (cent / 100).toFixed(2).replace('.', ',')
}

function foutmelding(fout?: string): string | null {
  if (fout === 'omschrijving') return 'Schrijf op waarvoor de boete is.'
  if (fout === 'bedrag') return 'Vul een bedrag in, zoals 1,50.'
  return null
}

export default async function VasteBoetes({
  searchParams,
}: {
  searchParams: Promise<{ fout?: string }>
}) {
  const speler = await vereisAfrekenaar()
  const melding = foutmelding((await searchParams).fout)
  const soorten = await leesBoetesoorten(db())
  const actief = soorten.filter((s) => s.actief)
  const uit = soorten.filter((s) => !s.actief)

  return (
    <Schil naam={speler.naam} isLeider={speler.magLeiden} tab="boetepot">
      <div>
        <Link href="/boetepot/afrekenen" className="text-sm text-club-op">
          ← Afrekenen
        </Link>
        <h1 className="uithangbord mt-2 text-[2.1rem]">Vaste boetes</h1>
      </div>

      {melding && (
        <p role="alert" className="rounded-xl bg-weg/15 px-3 py-2 text-sm text-weg-op">
          {melding}
        </p>
      )}

      <section className="rounded-2xl border border-rand bg-paneel p-4">
        <h2 className="bovenkop text-zacht">
          Op de lijst <span className="cijfers text-tekst">{actief.length}</span>
        </h2>
        <ul className="mt-2 flex flex-col">
          {actief.map((s) => (
            <li key={s.id} className="border-b border-rand/60 last:border-b-0">
              <details className="group">
                <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 py-2 [&::-webkit-details-marker]:hidden">
                  <span className="kopregel min-w-0 flex-1 truncate text-sm">{s.omschrijving}</span>
                  <span className="cijfers text-sm">{alsEuro(s.bedragCent)}</span>
                  <span className="bovenkop text-zacht group-open:text-club-op">bewerk</span>
                </summary>
                <div className="mb-3 flex flex-col gap-2 rounded-xl bg-paneel-op/50 p-3">
                  <form action={bewaarVasteBoete} className="flex flex-wrap gap-2">
                    <input type="hidden" name="soortId" value={s.id} />
                    <input
                      name="omschrijving"
                      defaultValue={s.omschrijving}
                      aria-label="Omschrijving"
                      className={`${veld} min-w-0 flex-1`}
                    />
                    <input
                      name="bedrag"
                      inputMode="decimal"
                      defaultValue={alsInvoer(s.bedragCent)}
                      aria-label="Bedrag in euro"
                      className={`${veld} cijfers w-24`}
                    />
                    <Knop toon="club" vol={false}>
                      Opslaan
                    </Knop>
                  </form>
                  <p className="text-xs text-zacht">
                    Een ander bedrag geldt voor nieuwe boetes. Boetes die al gegeven zijn, blijven wat ze
                    waren.
                  </p>
                  <form action={zetVasteBoeteActief}>
                    <input type="hidden" name="soortId" value={s.id} />
                    <button className={kleineKnop}>Haal van de lijst</button>
                  </form>
                </div>
              </details>
            </li>
          ))}
        </ul>

        <form action={bewaarVasteBoete} className="mt-3 flex flex-wrap gap-2 border-t border-rand pt-3">
          <input name="omschrijving" placeholder="Nieuwe boete" aria-label="Nieuwe boete" className={`${veld} min-w-0 flex-1`} />
          <input name="bedrag" inputMode="decimal" placeholder="€" aria-label="Bedrag in euro" className={`${veld} cijfers w-20`} />
          <Knop toon="club" vol={false}>
            Voeg toe
          </Knop>
        </form>

        {uit.length > 0 && (
          <div className="mt-3 border-t border-rand pt-3">
            <p className="bovenkop text-zacht">Van de lijst gehaald</p>
            <ul className="mt-1 flex flex-col">
              {uit.map((s) => (
                <li key={s.id} className="flex min-h-12 items-center gap-3">
                  <span className="min-w-0 flex-1 truncate text-sm text-zacht">{s.omschrijving}</span>
                  <span className="cijfers text-sm text-zacht">{alsEuro(s.bedragCent)}</span>
                  <form action={zetVasteBoeteActief}>
                    <input type="hidden" name="soortId" value={s.id} />
                    <input type="hidden" name="actief" value="ja" />
                    <button className={kleineKnop}>Zet terug</button>
                  </form>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-rand bg-paneel p-4">
        <h2 className="bovenkop text-zacht">Voorstel bij te laat afmelden</h2>
        <p className="mt-2 text-sm text-zacht">
          Meldt iemand zich na de afmeldgrens zelf af, dan zet de app deze boete klaar om te bevestigen.
          De app begint pas vanaf het moment dat je hier iets kiest.
        </p>
        <div className="mt-3 flex flex-col gap-3">
          {(['wedstrijd', 'training'] as const).map((type) => {
            const gekoppeld = actief.find((s) =>
              type === 'wedstrijd' ? s.teLaatWedstrijdOp : s.teLaatTrainingOp,
            )
            return (
              // De sleutel draagt de huidige keuze: na bewaren tekent React het
              // formulier opnieuw, anders zet hij het keuzeveld terug op wat er
              // bij het openen stond.
              <form
                key={`${type}-${gekoppeld?.id ?? 'geen'}`}
                action={koppelTeLaatAfmelden}
                className="flex flex-col gap-1"
              >
                <input type="hidden" name="type" value={type} />
                <label htmlFor={`koppel-${type}`} className="bovenkop text-zacht">
                  {type === 'wedstrijd' ? 'Wedstrijd' : 'Training'}
                </label>
                <div className="flex gap-2">
                  <select
                    id={`koppel-${type}`}
                    name="soortId"
                    defaultValue={gekoppeld?.id ?? ''}
                    className={`${veld} min-w-0 flex-1`}
                  >
                    <option value="">Geen voorstel</option>
                    {actief.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.omschrijving} · {alsEuro(s.bedragCent)}
                      </option>
                    ))}
                  </select>
                  <Knop toon="omlijnd" vol={false}>
                    Bewaar
                  </Knop>
                </div>
                {gekoppeld && (
                  <p className="text-xs text-zacht">
                    Kies je een andere, dan vervallen de voorstellen die nu nog openstaan.
                  </p>
                )}
              </form>
            )
          })}
        </div>
      </section>
    </Schil>
  )
}
