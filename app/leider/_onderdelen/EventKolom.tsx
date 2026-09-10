import Link from 'next/link'
import { zetAanwezigheidAlsLeider } from '@/app/acties/leider'
import type { EventRij } from '@/lib/db/aanwezigheid'
import { maakAppBericht } from '@/lib/domein/appbericht'
import { afmeldGrens, isTeLaatAfgemeld } from '@/lib/domein/telaat'
import type { Stand } from '@/lib/domein/types'
import { eventTitel } from '@/lib/weergave/namen'
import {
  alsDagEnTijd,
  alsDagZonderTijd,
  alsKortMoment,
  alsKorteDag,
  alsTijd,
} from '@/lib/weergave/tijd'
import { KopieerKnop } from './KopieerKnop'

type Speler = { id: string; naam: string; rugnummer: number | null }

function Telling({ aantal, label }: { aantal: number; label: string }) {
  return (
    <div className="flex-1 rounded-xl bg-paneel-op px-3 py-2.5">
      <p className="uithangbord cijfers text-2xl">{aantal}</p>
      <p className="bovenkop mt-0.5 text-zacht">{label}</p>
    </div>
  )
}

function Groep({
  label,
  aantal,
  bijschrift,
  children,
}: {
  label: string
  aantal: number
  bijschrift?: string
  children: React.ReactNode
}) {
  if (aantal === 0) return null
  return (
    <div>
      <div className="flex items-center gap-3">
        <h3 className="bovenkop text-zacht">
          {label} <span className="cijfers text-tekst">{aantal}</span>
          {bijschrift && <span className="ml-2 text-weg-op">{bijschrift}</span>}
        </h3>
        <span className="h-px flex-1 bg-rand" />
      </div>
      <ul className="mt-1">{children}</ul>
    </div>
  )
}

/**
 * Eén event voor de leider. De volgorde is de vraag van zondagochtend:
 * wie is er niet, wie heeft bevestigd, en van wie weet ik het nog niet.
 * Rugnummers voorop, zoals op het opstellingsbriefje.
 */
export function EventKolom({
  event,
  stand,
  spelers,
  afwezig,
  diensten,
  opstellingStatus = null,
}: {
  event: EventRij
  stand: Stand[]
  spelers: Speler[]
  /** Langdurig weg op de dag van dit event; staat buiten de stand. */
  afwezig: Speler[]
  /** Namen, alleen om te tonen — bewerken gebeurt op het roosterscherm. */
  diensten: { materiaal: string[]; rijden: string[] }
  opstellingStatus?: 'concept' | 'gepubliceerd' | null
}) {
  const spelerVan = new Map(spelers.map((s) => [s.id, s]))
  const titel = eventTitel(event)

  // Alleen wie zich echt heeft afgemeld. Wie 'nee' staat zonder melding doet
  // dit soort event structureel niet; die hoort in zijn eigen groep en niet
  // hier, anders lijkt het elke week alsof er iemand afhaakt.
  const afgemeld = stand.filter((s) => s.status === 'nee' && s.bron !== 'aanname')
  const doetNietMee = stand.filter((s) => s.status === 'nee' && s.bron === 'aanname')
  const teLaatAantal = afgemeld.filter((s) =>
    isTeLaatAfgemeld(s.gezetOp ?? null, event.startOp),
  ).length
  const bevestigd = stand.filter((s) => s.status === 'ja' && s.bron !== 'aanname')
  const stil = stand.filter((s) => s.status === 'ja' && s.bron === 'aanname')

  const bericht = maakAppBericht({
    titel,
    wanneer: alsDagEnTijd(event.startOp),
    deadline: alsDagZonderTijd(afmeldGrens(event.startOp)),
    stilleNamen: stil.map((s) => spelerVan.get(s.spelerId)?.naam ?? '?'),
  })

  function Regel({ regel }: { regel: Stand }) {
    const speler = spelerVan.get(regel.spelerId)
    const weg = regel.status === 'nee'
    const teLaat = weg && isTeLaatAfgemeld(regel.gezetOp ?? null, event.startOp)

    return (
      <li className="flex items-center gap-3 border-b border-rand/60 py-2 last:border-b-0">
        <span
          className={`cijfers uithangbord w-7 shrink-0 text-right text-sm ${
            weg ? 'text-weg/70' : 'text-club-op/80'
          }`}
        >
          {speler?.rugnummer ?? '–'}
        </span>

        <span className="min-w-0 flex-1">
          <span className={`text-sm ${weg ? 'text-weg-op' : 'text-tekst'}`}>
            {speler?.naam ?? 'onbekend'}
          </span>
          {teLaat && (
            <span className="bovenkop ml-2 rounded-full bg-weg px-2 py-0.5 text-white">
              te laat
            </span>
          )}
          {regel.toelichting && (
            <span className="block text-xs text-zacht">{regel.toelichting}</span>
          )}
          {/* Eigen regel, en niet meer verstopt achter sm: op de telefoon is dit
              juist het scherm waar de leider naar kijkt. Wanneer iemand zich
              meldde bepaalt of het op tijd was. */}
          {regel.gezetOp && regel.bron !== 'aanname' && (
            <span className="cijfers block text-xs text-zacht/70">
              {weg ? 'afgemeld' : 'bevestigd'} {alsKortMoment(regel.gezetOp)}
              {regel.bron === 'leider' && ' · door jou gezet'}
            </span>
          )}
        </span>

        <form action={zetAanwezigheidAlsLeider} className="shrink-0">
          <input type="hidden" name="eventId" value={event.id} />
          <input type="hidden" name="spelerId" value={regel.spelerId} />
          <input type="hidden" name="status" value={weg ? 'ja' : 'nee'} />
          <button className="min-h-8 rounded-lg border border-rand px-2.5 text-xs text-zacht transition-colors hover:border-club-op/60 hover:text-tekst">
            {weg ? 'toch wel' : 'afmelden'}
          </button>
        </form>
      </li>
    )
  }

  return (
    <section className="flex flex-col gap-4 rounded-2xl border border-rand bg-paneel p-4">
      <div>
        <p className="bovenkop text-zacht">
          {alsKorteDag(event.startOp)} · {alsTijd(event.startOp)}
        </p>
        <h2 className="kopregel mt-1 flex flex-wrap items-center gap-2 text-lg">
          {titel}
          {event.status === 'afgelast' && (
            <span className="bovenkop rounded-full bg-weg/15 px-2.5 py-1 text-weg-op">afgelast</span>
          )}
        </h2>
      </div>

      {/* Twee tegels, geen drie: "nog stil" zit ín "komen" en samen zouden ze
          meer optellen dan je selectie groot is. De verdeling staat hieronder
          bij de groepskoppen. */}
      <div className="flex gap-2">
        <Telling aantal={bevestigd.length + stil.length} label="komen" />
        <Telling aantal={afgemeld.length} label="afgemeld" />
      </div>

      {event.type === 'wedstrijd' && (
        <Link
          href={`/leider/opstelling/${event.id}`}
          className="flex min-h-11 items-center justify-between rounded-xl border border-rand bg-paneel-op px-4 text-sm transition-colors hover:border-club-op/60"
        >
          <span className="kopregel">Opstelling</span>
          <span className="bovenkop text-zacht">
            {opstellingStatus === 'gepubliceerd'
              ? 'gepubliceerd'
              : opstellingStatus === 'concept'
                ? 'concept'
                : 'nog niet gemaakt'}
          </span>
        </Link>
      )}

      <KopieerKnop tekst={bericht} />

      <div className="flex flex-col gap-4">
        <Groep
          label="Afgemeld"
          aantal={afgemeld.length}
          bijschrift={teLaatAantal > 0 ? `${teLaatAantal} te laat` : undefined}
        >
          {afgemeld.map((regel) => (
            <Regel key={regel.spelerId} regel={regel} />
          ))}
        </Groep>
        <Groep label="Bevestigd" aantal={bevestigd.length}>
          {bevestigd.map((regel) => (
            <Regel key={regel.spelerId} regel={regel} />
          ))}
        </Groep>
        <Groep label="Nog stil" aantal={stil.length}>
          {stil.map((regel) => (
            <Regel key={regel.spelerId} regel={regel} />
          ))}
        </Groep>
        {/* Buiten de tellingen, maar niet onzichtbaar: anders zie je de
            selectie krimpen zonder te weten waarom. */}
        <Groep label="Langdurig afwezig" aantal={afwezig.length}>
          {afwezig.map((speler) => (
            <li key={speler.id} className="flex items-center gap-3 py-1.5 text-sm text-zacht">
              <span className="cijfers uithangbord w-7 text-right text-zacht/50">
                {speler.rugnummer ?? '–'}
              </span>
              {speler.naam}
            </li>
          ))}
        </Groep>

        <Groep
          label={event.type === 'training' ? 'Traint niet' : 'Speelt niet'}
          aantal={doetNietMee.length}
        >
          {doetNietMee.map((regel) => (
            <Regel key={regel.spelerId} regel={regel} />
          ))}
        </Groep>

        {(diensten.materiaal.length > 0 || diensten.rijden.length > 0) && (
          <div className="flex flex-col gap-0.5 border-t border-rand pt-3 text-sm text-zacht">
            {diensten.materiaal.length > 0 && (
              <p>
                <span className="bovenkop">Materiaal</span> {diensten.materiaal.join(' · ')}
              </p>
            )}
            {diensten.rijden.length > 0 && (
              <p>
                <span className="bovenkop">Rijden</span> {diensten.rijden.join(' · ')}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  )
}
