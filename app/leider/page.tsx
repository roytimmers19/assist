import { DateTime } from 'luxon'
import Link from 'next/link'
import { Schil } from '@/app/_onderdelen/Schil'
import { vereisLeider } from '@/lib/auth/sessie'
import { leesMeldingen } from '@/lib/db/aanwezigheid'
import { leesAfwezighedenTussen } from '@/lib/db/afwezigheid'
import { db } from '@/lib/db/client'
import { leesDiensten } from '@/lib/db/diensten'
import { leesLaatsteImportRun } from '@/lib/db/importruns'
import { leesOpstellingStatussen } from '@/lib/db/opstelling'
import { leesActieveSpelers } from '@/lib/db/spelers'
import { leesEventsInWeek } from '@/lib/db/weekoverzicht'
import { actueleStand } from '@/lib/domein/aanwezigheid'
import { selectieVoor } from '@/lib/domein/afwezigheid'
import { standaardVoor } from '@/lib/domein/beschikbaarheid'
import { ZONE } from '@/lib/domein/tijd'
import { alsDagEnTijd } from '@/lib/weergave/tijd'
import { EventKolom } from './_onderdelen/EventKolom'

export const dynamic = 'force-dynamic'

export default async function Weekoverzicht({
  searchParams,
}: {
  searchParams: Promise<{ week?: string }>
}) {
  const leider = await vereisLeider()
  const { week } = await searchParams
  const verschuiving = Number(week ?? '0') || 0

  const begin = DateTime.now().setZone(ZONE).startOf('week').plus({ weeks: verschuiving })
  const eind = begin.plus({ weeks: 1 })

  const verbinding = db()
  const [eventsInWeek, spelersLijst, laatsteImport] = await Promise.all([
    leesEventsInWeek(verbinding, begin.toJSDate(), eind.toJSDate()),
    leesActieveSpelers(verbinding),
    leesLaatsteImportRun(verbinding),
  ])

  const meldingen = await leesMeldingen(
    verbinding,
    eventsInWeek.map((e) => e.id),
  )
  const opstellingStatussen = await leesOpstellingStatussen(
    verbinding,
    eventsInWeek.map((e) => e.id),
  )
  const periodes = await leesAfwezighedenTussen(verbinding, begin.toJSDate(), eind.toJSDate())
  const dienstenPerEvent = await leesDiensten(
    verbinding,
    eventsInWeek.map((e) => e.id),
  )
  const spelerIds = spelersLijst.map((s) => s.id)
  const spelers = spelersLijst.map((s) => ({
    id: s.id,
    naam: s.weergavenaam ?? s.naam,
    rugnummer: s.rugnummer,
  }))
  const naamVanSpeler = new Map(spelers.map((s) => [s.id, s.naam]))
  // Veilig op te zoeken: inSelectie is een deelverzameling van spelersLijst.
  const rijVan = new Map(spelersLijst.map((s) => [s.id, s]))

  const importFout = laatsteImport !== null && laatsteImport.status !== 'ok'

  // Onopvallend onderaan zolang het goed gaat; bovenaan zodra het misging.
  const importmelding = (
    <p
      className={`rounded-xl px-3 py-2 text-xs ${
        importFout ? 'bg-weg/15 text-weg-op' : 'text-zacht'
      }`}
    >
      {laatsteImport ? (
        <>
          Schema opgehaald {alsDagEnTijd(laatsteImport.gestartOp).toLowerCase()} ·{' '}
          {laatsteImport.aantalGelezen} events · {laatsteImport.aantalNieuw} nieuw,{' '}
          {laatsteImport.aantalBijgewerkt} bijgewerkt, {laatsteImport.aantalAfgelast} afgelast
          {laatsteImport.melding && <> · {laatsteImport.melding}</>}
        </>
      ) : (
        'Het schema is nog niet opgehaald.'
      )}
    </p>
  )

  return (
    <Schil naam={leider.naam} isLeider tab="week" breed>
      {importFout && importmelding}

      {/* Bewust geen vierde tabblad: dit scherm open je een paar keer per seizoen. */}
      <div className="flex justify-end">
        <Link
          href="/leider/diensten"
          className="bovenkop text-club-op underline-offset-4 hover:underline"
        >
          Dienstrooster
        </Link>
      </div>

      <nav className="flex items-center justify-between gap-2">
        <Link
          href={`/leider?week=${verschuiving - 1}`}
          className="min-h-9 rounded-lg border border-rand px-3 py-1.5 text-sm text-zacht transition-colors hover:border-club-op/60 hover:text-tekst"
        >
          ← Vorige
        </Link>
        <span className="kopregel text-center text-sm">
          {begin.setLocale('nl').toFormat('d LLL')} —{' '}
          {eind.minus({ days: 1 }).setLocale('nl').toFormat('d LLL')}
          {verschuiving === 0 && <span className="ml-2 text-zacht">deze week</span>}
        </span>
        <Link
          href={`/leider?week=${verschuiving + 1}`}
          className="min-h-9 rounded-lg border border-rand px-3 py-1.5 text-sm text-zacht transition-colors hover:border-club-op/60 hover:text-tekst"
        >
          Volgende →
        </Link>
      </nav>

      {eventsInWeek.length === 0 ? (
        <section className="rounded-2xl border border-rand bg-paneel p-6">
          <h2 className="kopregel text-lg">Deze week staat er niets gepland</h2>
          <p className="mt-2 text-sm text-zacht">Blader met de pijlen naar een andere week.</p>
        </section>
      ) : (
        <div className={`grid gap-4 ${eventsInWeek.length > 1 ? 'md:grid-cols-2' : 'max-w-xl'}`}>
          {eventsInWeek.map((event) => {
            // De selectie hangt aan de dag, dus die verschilt per event.
            const inSelectie = selectieVoor(spelerIds, periodes, event.startOp)
            const weg = new Set(spelerIds.filter((id) => !inSelectie.includes(id)))

            return (
              <EventKolom
                key={event.id}
                event={event}
                stand={actueleStand(
                  inSelectie.map((id) => ({
                    id,
                    standaard: standaardVoor(rijVan.get(id)!, event.type),
                  })),
                  meldingen.get(event.id) ?? [],
                )}
                spelers={spelers}
                afwezig={spelers.filter((s) => weg.has(s.id))}
                diensten={{
                  materiaal: (dienstenPerEvent.get(event.id) ?? [])
                    .filter((d) => d.soort === 'materiaal')
                    .map((d) => naamVanSpeler.get(d.spelerId) ?? 'onbekend'),
                  rijden: (dienstenPerEvent.get(event.id) ?? [])
                    .filter((d) => d.soort === 'rijden')
                    .map((d) => naamVanSpeler.get(d.spelerId) ?? 'onbekend'),
                }}
                opstellingStatus={opstellingStatussen.get(event.id) ?? null}
              />
            )
          })}
        </div>
      )}

      {!importFout && importmelding}
    </Schil>
  )
}
