import { headers } from 'next/headers'
import {
  beeindigAfwezigheidAlsLeider,
  zetAfwezigheidAlsLeider,
} from '@/app/acties/afwezigheid'
import {
  bewerkSpeler,
  keurAanmeldingGoed,
  stuurUitnodigingOpnieuw,
  sluitDeur,
  voegSpelerToe,
  wisselActief,
  zetDeurOpen,
} from '@/app/acties/spelers'
import { Knop } from '@/app/_onderdelen/Knop'
import { Schil } from '@/app/_onderdelen/Schil'
import { KopieerKnop } from '@/app/leider/_onderdelen/KopieerKnop'
import { vereisLeider } from '@/lib/auth/sessie'
import { leesLopendeAfwezigheden } from '@/lib/db/afwezigheid'
import { db } from '@/lib/db/client'
import { leesTeamInstelling } from '@/lib/db/instellingen'
import { mailWerkt } from '@/lib/mail/verstuur'
import { deurStaatOpen } from '@/lib/domein/toelating'
import { leesAlleSpelers } from '@/lib/db/spelers'
import { dagVan } from '@/lib/domein/afwezigheid'
import { APPNAAM } from '@/lib/weergave/namen'
import { POSITIES } from '@/lib/weergave/posities'
import { alsDagZonderTijd, alsKortMoment } from '@/lib/weergave/tijd'

export const dynamic = 'force-dynamic'

const veld =
  'min-h-11 rounded-xl border border-rand bg-paneel-op px-4 text-sm placeholder:text-zacht/70'
const kleineKnop =
  'min-h-8 rounded-lg border border-rand px-2.5 text-xs text-zacht transition-colors hover:border-club-op/60 hover:text-tekst'

function foutmelding(fout?: string, nr?: string): string | null {
  if (fout === 'nummer') return 'Een rugnummer moet een heel getal tussen 1 en 99 zijn.'
  if (fout === 'bezet') return `Rugnummer ${nr} is al van een andere speler.`
  if (fout === 'jezelf')
    return 'Je kunt je eigen leidersrol niet afnemen. Maak eerst iemand anders leider.'
  return null
}

export default async function Spelersbeheer({
  searchParams,
}: {
  searchParams: Promise<{ fout?: string; nr?: string }>
}) {
  const leider = await vereisLeider()
  const { fout, nr } = await searchParams
  const verbinding = db()
  const [alle, instelling] = await Promise.all([
    leesAlleSpelers(verbinding),
    leesTeamInstelling(verbinding),
  ])

  const wachtend = alle.filter((s) => s.accountStatus === 'wacht_op_goedkeuring')
  const rest = alle.filter((s) => s.accountStatus !== 'wacht_op_goedkeuring')
  const melding = foutmelding(fout, nr)

  // Uit het verzoek zelf, zodat de link klopt op welk adres de leider ook zit;
  // de omgevingsvariabele is de terugval.
  const host = (await headers()).get('host')
  const basis = host
    ? `${host.startsWith('localhost') ? 'http' : 'https'}://${host}`
    : (process.env.NEXT_PUBLIC_BASIS_URL ?? '')

  const aanmeldlink = `${basis}/aanmelden?code=${encodeURIComponent(instelling.teamcode)}`
  // Alleen over afmelden. De opstelling en het dienstrooster ontdekken ze
  // vanzelf; hier leiden ze af van het enige wat je van iemand vraagt.
  const aanmeldbericht = [
    `Mannen, ik houd de aanwezigheid bij in ${APPNAAM} — dan hoef ik niet meer door de groepsapp te scrollen om te tellen wie er zondag is.`,
    '',
    aanmeldlink,
    '',
    'Maak een account aan (met Google kan ook), de teamcode staat al ingevuld. Ik zet je er daarna bij.',
    '',
    'Hoe het werkt: je staat altijd op aanwezig. Kun je een keer niet, geef het dan in de app aan. Meer hoef je niet te doen.',
  ].join('\n')

  const zonderNummer = rest.filter((s) => s.actief && s.rugnummer === null).length

  const deurOpen = deurStaatOpen(instelling.automatischToelatenTot, new Date())

  const vandaag = dagVan(new Date())
  // Mét sleutel: de knop 'Weer beschikbaar' heeft het id van de rij nodig.
  const afwezigNu = new Map(
    (await leesLopendeAfwezigheden(db(), new Date())).map((p) => [p.spelerId, p]),
  )

  return (
    <Schil naam={leider.naam} isLeider tab="spelers" breed>
      {melding && (
        <p role="alert" className="rounded-xl bg-weg/15 px-3 py-2 text-sm text-weg-op">
          {melding}
        </p>
      )}

      {wachtend.length > 0 && (
        <section className="rounded-2xl border border-club-op/50 bg-club/10 p-4">
          <h2 className="bovenkop text-club-op">
            Wacht op jou <span className="cijfers text-tekst">{wachtend.length}</span>
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {wachtend.map((speler) => (
              <li key={speler.id} className="flex flex-wrap items-center justify-between gap-2">
                <span className="min-w-0">
                  <span className="kopregel block text-sm">{speler.naam}</span>
                  <span className="block truncate text-xs text-zacht">{speler.email}</span>
                </span>
                <form action={keurAanmeldingGoed}>
                  <input type="hidden" name="spelerId" value={speler.id} />
                  <Knop toon="club" vol={false}>
                    In het team
                  </Knop>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl border border-rand bg-paneel p-4">
        <h2 className="bovenkop text-zacht">Zelf aanmelden</h2>
        <p className="mt-2 text-sm text-zacht">
          Plak dit bericht in de groepsapp. De code zit in de link, dus wie erop tikt hoeft hem
          niet over te typen. Ze komen daarna hierboven te staan en wachten op jouw goedkeuring.
        </p>
        <p className="uithangbord cijfers mt-3 text-3xl text-club-op">{instelling.teamcode}</p>
        <div className="mt-3">
          <KopieerKnop label="Kopieer het aanmeldbericht" tekst={aanmeldbericht} />
        </div>

        {/* Dat je ziet dát hij openstaat is het halve punt: een schakelaar
            waarvan je dat niet ziet, laat je aanstaan. */}
        <div className="mt-3 border-t border-rand pt-3">
          {deurOpen ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-komt-op">
                Deur staat open tot{' '}
                {alsKortMoment(instelling.automatischToelatenTot as Date)} — wie zich meldt
                komt er direct in.
              </p>
              <form action={sluitDeur}>
                <button className={kleineKnop}>Nu sluiten</button>
              </form>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm text-zacht">
                Iedereen die zich meldt wacht nu op jouw goedkeuring.
              </p>
              <form action={zetDeurOpen}>
                <button className={kleineKnop}>Zet de deur 24 uur open</button>
              </form>
            </div>
          )}
        </div>
      </section>

      {!mailWerkt() && (
        <p className="text-sm text-zacht">
          Spelers toevoegen per mail staat uit zolang er geen mailsleutel is. Gebruik het
          aanmeldbericht hierboven — dat werkt zonder mail.
        </p>
      )}

      {mailWerkt() && (
      <section className="rounded-2xl border border-rand bg-paneel p-4">
        <h2 className="bovenkop text-zacht">Speler toevoegen</h2>
        <form action={voegSpelerToe} className="mt-3 flex flex-wrap gap-2">
          <input name="naam" required placeholder="Naam" className={`${veld} flex-1`} />
          <input
            name="email"
            type="email"
            required
            placeholder="E-mail"
            className={`${veld} flex-1`}
          />
          <input
            name="rugnummer"
            type="number"
            min={1}
            max={99}
            placeholder="Nr"
            className={`${veld} w-20`}
          />
          <Knop toon="club" vol={false}>
            Toevoegen en uitnodigen
          </Knop>
        </form>
      </section>
      )}

      <section className="rounded-2xl border border-rand bg-paneel p-4">
        <h2 className="bovenkop text-zacht">
          Team <span className="cijfers text-tekst">{rest.length}</span>
        </h2>
        {zonderNummer > 0 && (
          <p className="mt-2 text-xs text-zacht">
            <span className="cijfers text-tekst">{zonderNummer}</span>
            {zonderNummer === 1 ? ' speler heeft' : ' spelers hebben'} nog geen rugnummer. Tik op
            een naam om het in te vullen.
          </p>
        )}

        {afwezigNu.size > 0 && (
          <p className="mt-1 text-sm text-zacht">
            <span className="cijfers text-tekst">{afwezigNu.size}</span> langdurig afwezig, dus
            buiten de selectie.
          </p>
        )}

        <ul className="mt-2 flex flex-col">
          {rest.map((speler) => {
            const weg = afwezigNu.get(speler.id) ?? null

            return (
            <li key={speler.id} className="border-b border-rand/60 last:border-b-0">
              <details className="group">
                <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 py-2.5 [&::-webkit-details-marker]:hidden">
                  <span
                    className={`cijfers uithangbord w-7 shrink-0 text-right text-sm ${
                      speler.actief ? 'text-club-op/80' : 'text-zacht/40'
                    }`}
                  >
                    {speler.rugnummer ?? '–'}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={`kopregel block truncate text-sm ${
                        speler.actief ? 'text-tekst' : 'text-zacht/60'
                      }`}
                    >
                      {speler.weergavenaam ?? speler.naam}
                      {speler.rol === 'leider' && (
                        <span className="bovenkop ml-2 rounded-full bg-paneel-op px-2 py-0.5 text-zacht">
                          leider
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-xs text-zacht">
                      {speler.email}
                      {speler.telefoon && ` · ${speler.telefoon}`}
                      {speler.positie && ` · ${speler.positie}`}
                      {speler.accountStatus === 'uitgenodigd' && ' · uitnodiging staat open'}
                      {!speler.actief && ' · niet actief'}
                      {/* De enige plek waar je terugziet dat iemand zichzelf
                          onzichtbaar heeft gemaakt. */}
                      {!speler.doetTrainingen && ' · traint niet'}
                      {!speler.doetWedstrijden && ' · speelt niet'}
                      {weg &&
                        (weg.terugOp
                          ? ` · terug ${alsDagZonderTijd(new Date(weg.terugOp))}`
                          : ' · langdurig afwezig')}
                    </span>
                  </span>

                  <span className="bovenkop shrink-0 text-zacht group-open:text-club-op">
                    bewerk
                  </span>
                </summary>

                <div className="flex flex-col gap-3 rounded-xl bg-paneel-op/50 p-3">
                  <form action={bewerkSpeler} className="flex flex-wrap items-end gap-2">
                    <input type="hidden" name="spelerId" value={speler.id} />

                    <label className="flex flex-1 flex-col gap-1">
                      <span className="bovenkop text-zacht">Naam in de app</span>
                      <input
                        name="weergavenaam"
                        defaultValue={speler.weergavenaam ?? ''}
                        placeholder={speler.naam}
                        className={veld}
                      />
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="bovenkop text-zacht">Nr</span>
                      <input
                        name="rugnummer"
                        type="number"
                        min={1}
                        max={99}
                        defaultValue={speler.rugnummer ?? ''}
                        className={`${veld} w-20`}
                      />
                    </label>

                    <label className="flex flex-col gap-1">
                      <span className="bovenkop text-zacht">Positie</span>
                      <select
                        name="positie"
                        defaultValue={speler.positie ?? ''}
                        className={`${veld} w-40`}
                      >
                        <option value="">Onbekend</option>
                        {POSITIES.map((positie) => (
                          <option key={positie} value={positie}>
                            {positie.charAt(0).toUpperCase() + positie.slice(1)}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex min-h-11 items-center gap-2 text-sm text-zacht">
                      <input
                        type="checkbox"
                        name="rol"
                        value="leider"
                        defaultChecked={speler.rol === 'leider'}
                        className="size-4 accent-club"
                      />
                      Leider
                    </label>

                    <label className="flex min-h-11 items-center gap-2 text-sm text-zacht">
                      <input
                        type="checkbox"
                        name="doetTrainingen"
                        value="ja"
                        defaultChecked={speler.doetTrainingen}
                        className="size-4 accent-club"
                      />
                      Traint
                    </label>

                    <label className="flex min-h-11 items-center gap-2 text-sm text-zacht">
                      <input
                        type="checkbox"
                        name="doetWedstrijden"
                        value="ja"
                        defaultChecked={speler.doetWedstrijden}
                        className="size-4 accent-club"
                      />
                      Speelt
                    </label>

                    <Knop toon="club" vol={false}>
                      Opslaan
                    </Knop>
                  </form>

                  {weg ? (
                    <div className="flex flex-col gap-2 border-t border-rand pt-3">
                      <p className="text-sm text-zacht">
                        Langdurig afwezig — {weg.reden}
                      </p>
                      <form action={beeindigAfwezigheidAlsLeider}>
                        <input type="hidden" name="id" value={weg.id} />
                        <button className={kleineKnop}>Weer beschikbaar</button>
                      </form>
                    </div>
                  ) : (
                    <form
                      action={zetAfwezigheidAlsLeider}
                      className="flex flex-wrap items-end gap-2 border-t border-rand pt-3"
                    >
                      <input type="hidden" name="spelerId" value={speler.id} />
                      <label className="flex flex-col gap-1">
                        <span className="bovenkop text-zacht">Weg vanaf</span>
                        <input
                          type="date"
                          name="van"
                          defaultValue={vandaag}
                          className={`${veld} w-40`}
                        />
                      </label>
                      <label className="flex flex-col gap-1">
                        <span className="bovenkop text-zacht">Terug op</span>
                        <input type="date" name="terugOp" className={`${veld} w-40`} />
                      </label>
                      <label className="flex flex-1 flex-col gap-1">
                        <span className="bovenkop text-zacht">Waarom</span>
                        <input
                          name="reden"
                          required
                          placeholder="Kruisband, geopereerd 12 september"
                          className={veld}
                        />
                      </label>
                      <button className={kleineKnop}>Langdurig afwezig melden</button>
                    </form>
                  )}

                  <div className="flex flex-wrap gap-2">
                    {speler.accountStatus === 'uitgenodigd' && (
                      <form action={stuurUitnodigingOpnieuw}>
                        <input type="hidden" name="spelerId" value={speler.id} />
                        <input type="hidden" name="email" value={speler.email} />
                        <input type="hidden" name="naam" value={speler.naam} />
                        <button className={kleineKnop}>Opnieuw uitnodigen</button>
                      </form>
                    )}
                    <form action={wisselActief}>
                      <input type="hidden" name="spelerId" value={speler.id} />
                      <input type="hidden" name="actief" value={speler.actief ? 'nee' : 'ja'} />
                      <button className={kleineKnop}>
                        {speler.actief ? 'Op non-actief zetten' : 'Weer actief maken'}
                      </button>
                    </form>
                  </div>
                </div>
              </details>
            </li>
            )
          })}
        </ul>
      </section>
    </Schil>
  )
}
