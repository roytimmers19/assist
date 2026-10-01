import { meldMijAan, meldMijAf } from '@/app/acties/aanwezigheid'
import type { EventRij } from '@/lib/db/aanwezigheid'
import type { Dienstsoort } from '@/lib/domein/diensten'
import type { Status } from '@/lib/domein/types'
import { eventTitel } from '@/lib/weergave/namen'
import { alsKorteDag, alsTijd } from '@/lib/weergave/tijd'
import { Knop } from './Knop'
import { Statusmerk } from './Statusmerk'

/**
 * Alles ná het eerstvolgende event, als regel. Vijf volle afmeldformulieren
 * onder elkaar leest niemand; tikken op de regel vouwt het formulier uit.
 * Bewust een <details>: werkt zonder JavaScript en met het toetsenbord.
 */
export function EventRegel({
  event,
  status,
  mijnDiensten = [],
}: {
  event: EventRij
  status: Status | 'afwezig'
  /** Wat hij zelf moet doen bij dit event. */
  mijnDiensten?: Dienstsoort[]
}) {
  const afwezig = status === 'afwezig'
  const meedoen = status === 'ja'

  return (
    <details className="group rounded-xl border border-rand bg-paneel open:border-club-op/45">
      <summary className="flex min-h-12 cursor-pointer list-none items-center gap-3 px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="cijfers w-[4.75rem] shrink-0 text-[11px] font-semibold tracking-[0.06em] whitespace-nowrap text-zacht uppercase">
          {alsKorteDag(event.startOp)}
        </span>
        <span className="kopregel flex-1 truncate text-sm">{eventTitel(event)}</span>
        <span className="cijfers text-sm text-zacht">{alsTijd(event.startOp)}</span>
        {/* Geen rood merk bij afwezig: dat zou 'afgemeld' betekenen, en dat is iets anders. */}
        {afwezig ? (
          <span className="text-sm text-zacht/60">—</span>
        ) : (
          <Statusmerk toestand={meedoen ? 'komt' : 'weg'} kaal />
        )}
      </summary>

      <div className="border-t border-rand px-4 py-4">
        {event.locatie && <p className="mb-3 text-sm text-zacht">{event.locatie}</p>}

        {mijnDiensten.length > 0 && (
          <p className="bovenkop mb-3 text-club-op">
            {mijnDiensten.includes('materiaal') && 'Jij hebt materiaaldienst'}
            {mijnDiensten.length === 2 && ' · '}
            {mijnDiensten.includes('rijden') && 'Jij rijdt'}
          </p>
        )}

        {afwezig ? (
          <p className="text-sm text-zacht">
            Je bent langdurig afwezig, dus je hoeft niets te doen.
          </p>
        ) : meedoen ? (
          <form action={meldMijAf} className="flex flex-col gap-2">
            <input type="hidden" name="eventId" value={event.id} />
            <input
              name="toelichting"
              placeholder="Waarom kun je niet?"
              required
              className="min-h-11 rounded-xl border border-rand bg-paneel-op px-4 text-sm placeholder:text-zacht/70"
            />
            <Knop toon="omlijnd">Ik kan niet</Knop>
          </form>
        ) : (
          <form action={meldMijAan}>
            <input type="hidden" name="eventId" value={event.id} />
            <Knop toon="komt">Ik kan toch</Knop>
          </form>
        )}
      </div>
    </details>
  )
}
