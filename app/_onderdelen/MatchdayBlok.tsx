import { meldMijAan, meldMijAf } from '@/app/acties/aanwezigheid'
import type { EventRij } from '@/lib/db/aanwezigheid'
import type { Dienstsoort } from '@/lib/domein/diensten'
import { afmeldGrens } from '@/lib/domein/telaat'
import type { Status } from '@/lib/domein/types'
import { schoonTegenstander } from '@/lib/weergave/namen'
import { alsDagEnTijd, alsDagZonderTijd, alsTijd } from '@/lib/weergave/tijd'
import { Knop } from './Knop'

/**
 * Het eerstvolgende event, als één blok. Wie meedoet ziet clubblauw; wie
 * afgemeld is ziet een donker blok met een rode rand; wie langdurig afwezig is
 * een donker blok met een gewone rand en geen knoppen. Je hoeft niet te lezen
 * om te weten waar je aan toe bent — dat is het hele punt van dit scherm.
 */
export function MatchdayBlok({
  event,
  status,
  terugOp = null,
  mijnDiensten = [],
}: {
  event: EventRij
  status: Status | 'afwezig'
  /** De dag dat hij er weer is; leeg bij een open einde. */
  terugOp?: Date | null
  /** Wat hij zelf moet doen bij dit event. Andermans dienst staat er niet. */
  mijnDiensten?: Dienstsoort[]
}) {
  const afwezig = status === 'afwezig'
  const isWedstrijd = event.type === 'wedstrijd'
  const kop = isWedstrijd ? (event.thuis ? 'Thuis' : 'Uit') : 'Training'
  const groot = isWedstrijd ? schoonTegenstander(event.tegenstander) : 'Training'
  const meedoen = status === 'ja'
  const grens = afmeldGrens(event.startOp)
  const deadlineVoorbij = grens.getTime() < Date.now()

  const dag = alsDagEnTijd(event.startOp).split(',')[0]

  return (
    <section
      className={`opkomen overflow-hidden rounded-2xl ${
        meedoen
          ? 'bg-club text-white shadow-lg shadow-club/25'
          : afwezig
            ? 'border border-rand bg-paneel text-tekst'
            : 'border border-weg/45 bg-paneel text-tekst'
      }`}
    >
      <div className="flex flex-col gap-5 p-5">
        <div>
          <p className={`bovenkop ${meedoen ? 'text-white/85' : 'text-zacht'}`}>{dag}</p>

          <p
            className={`bovenkop mt-3 ${
              meedoen ? 'text-white/75' : 'text-club-op'
            } ${isWedstrijd ? '' : 'sr-only'}`}
          >
            {kop}
          </p>

          <h2
            className={`uithangbord mt-1 text-[2.1rem] ${meedoen ? 'text-white' : 'text-tekst'}`}
          >
            {groot}
          </h2>

          <p className={`mt-2 text-sm ${meedoen ? 'text-white/85' : 'text-zacht'}`}>
            <span className="cijfers">{alsTijd(event.startOp)}</span>
            {event.locatie && (
              <span className="ml-2 border-l border-current/30 pl-2">{event.locatie}</span>
            )}
          </p>
        </div>

        <div className={`border-t pt-4 ${meedoen ? 'border-white/20' : 'border-rand'}`}>
          {afwezig ? (
            <>
              <p className="kopregel text-lg text-zacht">Je bent er niet bij</p>
              <p className="mt-1 text-sm text-zacht">
                {terugOp
                  ? `Je staat tot ${alsDagZonderTijd(terugOp)} uit de roulatie. Eerder terug? Pas het aan bij je gegevens.`
                  : 'Je staat voorlopig uit de roulatie. Weer beschikbaar? Zet het om bij je gegevens.'}
              </p>
            </>
          ) : meedoen ? (
            <>
              <p className="kopregel text-lg text-white">Je staat op de lijst</p>
              <p className="mt-1 text-sm text-white/85">
                {deadlineVoorbij
                  ? 'De afmeldtermijn is verstreken. Afmelden kan nog, maar laat het even weten in de app.'
                  : `Afmelden kan tot en met ${alsDagZonderTijd(grens)}.`}
              </p>

              <form action={meldMijAf} className="mt-4 flex flex-col gap-2">
                <input type="hidden" name="eventId" value={event.id} />
                <input
                  name="toelichting"
                  placeholder="Reden (mag je overslaan)"
                  className="min-h-11 rounded-xl border border-white/25 bg-white/10 px-4 text-sm text-white placeholder:text-white/65"
                />
                <Knop toon="opblauw">Ik kan niet</Knop>
              </form>
            </>
          ) : (
            <>
              <p className="kopregel text-lg text-weg-op">Je bent afgemeld</p>
              <p className="mt-1 text-sm text-zacht">
                Je staat niet op de lijst. Kun je toch, zet jezelf er dan weer bij.
              </p>

              <form action={meldMijAan} className="mt-4">
                <input type="hidden" name="eventId" value={event.id} />
                <Knop toon="komt">Ik kan toch</Knop>
              </form>
            </>
          )}

          {mijnDiensten.length > 0 && (
            <p
              className={`bovenkop mt-4 border-t pt-3 ${
                meedoen ? 'border-white/20 text-white/85' : 'border-rand text-club-op'
              }`}
            >
              {mijnDiensten.includes('materiaal') && 'Jij hebt materiaaldienst'}
              {mijnDiensten.length === 2 && ' · '}
              {mijnDiensten.includes('rijden') && 'Jij rijdt'}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
