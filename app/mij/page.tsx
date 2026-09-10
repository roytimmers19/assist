import {
  beeindigMijnAfwezigheid,
  wijzigMijnAfwezigheid,
  zetMijnAfwezigheid,
} from '@/app/acties/afwezigheid'
import { bewerkMijnGegevens } from '@/app/acties/profiel'
import { Knop } from '@/app/_onderdelen/Knop'
import { Schil } from '@/app/_onderdelen/Schil'
import { UitlogKnop } from '@/app/_onderdelen/UitlogKnop'
import { vereisSpeler } from '@/lib/auth/sessie'
import { leesAfwezighedenVanSpeler } from '@/lib/db/afwezigheid'
import { db } from '@/lib/db/client'
import { leesSpeler } from '@/lib/db/spelers'
import { dagVan } from '@/lib/domein/afwezigheid'
import { POSITIES } from '@/lib/weergave/posities'
import { alsDagZonderTijd } from '@/lib/weergave/tijd'

export const dynamic = 'force-dynamic'

const veld =
  'min-h-11 w-full rounded-xl border border-rand bg-paneel-op px-4 text-sm placeholder:text-zacht/70'

export default async function MijnGegevens({
  searchParams,
}: {
  searchParams: Promise<{ opgeslagen?: string }>
}) {
  const sessie = await vereisSpeler()
  const { opgeslagen } = await searchParams
  const speler = await leesSpeler(db(), sessie.id)
  if (!speler) return null

  const periodes = await leesAfwezighedenVanSpeler(db(), sessie.id)
  const vandaag = dagVan(new Date())
  // De eerste die nog niet voorbij is: dat is de lopende, of anders de eerste
  // die nog moet beginnen.
  const lopend = periodes.find((p) => p.terugOp === null || p.terugOp > vandaag) ?? null

  return (
    <Schil naam={sessie.naam} isLeider={sessie.rol === 'leider'} tab="profiel">
      <div>
        <h1 className="uithangbord text-[2rem]">Mijn gegevens</h1>
        <p className="mt-2 text-sm text-zacht">
          Zo sta je in de app. Je rugnummer wordt door de leider bijgehouden.
        </p>
      </div>

      {opgeslagen && (
        <p role="status" className="rounded-xl bg-komt/15 px-3 py-2 text-sm text-komt-op">
          Opgeslagen.
        </p>
      )}

      <form action={bewerkMijnGegevens} className="flex flex-col gap-5">
        <label className="flex flex-col gap-2">
          <span className="bovenkop text-zacht">Naam in de app</span>
          <input
            name="weergavenaam"
            defaultValue={speler.weergavenaam ?? ''}
            placeholder={speler.naam}
            className={veld}
          />
          <span className="text-xs text-zacht">
            Laat leeg om {speler.naam} te blijven. Handig als er twee Roys in het team zitten.
          </span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="bovenkop text-zacht">Telefoon</span>
          <input
            name="telefoon"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            defaultValue={speler.telefoon ?? ''}
            placeholder="06…"
            className={veld}
          />
          <span className="text-xs text-zacht">Alleen zichtbaar voor je leider.</span>
        </label>

        <label className="flex flex-col gap-2">
          <span className="bovenkop text-zacht">Positie</span>
          <select name="positie" defaultValue={speler.positie ?? ''} className={veld}>
            <option value="">Zeg ik liever niet</option>
            {POSITIES.map((positie) => (
              <option key={positie} value={positie}>
                {positie.charAt(0).toUpperCase() + positie.slice(1)}
              </option>
            ))}
          </select>
        </label>

        <div className="rounded-xl border border-rand bg-paneel p-4 text-sm text-zacht">
          <p>
            <span className="text-tekst">{speler.email}</span> — hiermee log je in.
          </p>
          <p className="mt-1">
            Rugnummer{' '}
            <span className="cijfers text-tekst">{speler.rugnummer ?? 'nog niet toegekend'}</span>
          </p>
        </div>

        <fieldset className="flex flex-col gap-2 rounded-xl border border-rand p-4">
          <legend className="bovenkop px-1 text-zacht">Waar doe je aan mee?</legend>

          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="doetTrainingen"
              value="ja"
              defaultChecked={speler.doetTrainingen}
              className="size-4 accent-club"
            />
            Ik train mee
          </label>

          <label className="flex min-h-11 items-center gap-3 text-sm">
            <input
              type="checkbox"
              name="doetWedstrijden"
              value="ja"
              defaultChecked={speler.doetWedstrijden}
              className="size-4 accent-club"
            />
            Ik speel wedstrijden
          </label>

          <span className="text-xs text-zacht">
            Haal je er een weg, dan word je daar niet meer voor gevraagd. Kun je een keer tóch,
            dan meld je je gewoon voor die ene aan.
          </span>
        </fieldset>

        <Knop toon="club">Opslaan</Knop>
      </form>

      <section className="flex flex-col gap-3 rounded-2xl border border-rand bg-paneel p-4">
        <h2 className="bovenkop text-zacht">Langer weg?</h2>

        {lopend ? (
          <>
            <p className="text-sm">
              Je doet niet mee vanaf {alsDagZonderTijd(new Date(lopend.van))}
              {lopend.terugOp
                ? ` tot ${alsDagZonderTijd(new Date(lopend.terugOp))}`
                : ', voorlopig zonder einddatum'}
              . <span className="text-zacht">{lopend.reden}</span>
            </p>

            <form action={wijzigMijnAfwezigheid} className="flex flex-col gap-3">
              <input type="hidden" name="id" value={lopend.id} />
              <div className="flex gap-2">
                <label className="flex flex-1 flex-col gap-2">
                  <span className="bovenkop text-zacht">Vanaf</span>
                  <input type="date" name="van" defaultValue={lopend.van} className={veld} />
                </label>
                <label className="flex flex-1 flex-col gap-2">
                  <span className="bovenkop text-zacht">Terug op</span>
                  <input
                    type="date"
                    name="terugOp"
                    defaultValue={lopend.terugOp ?? ''}
                    className={veld}
                  />
                </label>
              </div>
              <input name="reden" defaultValue={lopend.reden} required className={veld} />
              <Knop toon="omlijnd">Wijzigen</Knop>
            </form>

            <form action={beeindigMijnAfwezigheid}>
              <input type="hidden" name="id" value={lopend.id} />
              <Knop toon="komt">Ik ben er weer</Knop>
            </form>
          </>
        ) : (
          <form action={zetMijnAfwezigheid} className="flex flex-col gap-3">
            <p className="text-sm text-zacht">
              Ben je langer uit de roulatie — geblesseerd, ziek, een tijd weg — zet het hier één
              keer vast. Je wordt dan niet meer gevraagd of je erbij bent.
            </p>
            <div className="flex gap-2">
              <label className="flex flex-1 flex-col gap-2">
                <span className="bovenkop text-zacht">Vanaf</span>
                <input type="date" name="van" defaultValue={vandaag} className={veld} />
              </label>
              <label className="flex flex-1 flex-col gap-2">
                <span className="bovenkop text-zacht">Terug op</span>
                <input type="date" name="terugOp" className={veld} />
              </label>
            </div>
            <label className="flex flex-col gap-2">
              <span className="bovenkop text-zacht">Waarom</span>
              <input
                name="reden"
                required
                placeholder="Kruisband, geopereerd 12 september"
                className={veld}
              />
              <span className="text-xs text-zacht">
                Laat de terugkeerdatum leeg als je het nog niet weet.
              </span>
            </label>
            <Knop toon="omlijnd">Zet het vast</Knop>
          </form>
        )}
      </section>

      <UitlogKnop toon="rand" />
    </Schil>
  )
}
