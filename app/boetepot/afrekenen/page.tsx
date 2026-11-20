import Link from 'next/link'
import { maakBetaaldOngedaanAlsAfrekenaar, zetBetaaldAlsAfrekenaar } from '@/app/acties/boetepot'
import { Schil } from '@/app/_onderdelen/Schil'
import { vereisAfrekenaar } from '@/lib/auth/sessie'
import { leesBoetes } from '@/lib/db/boetepot'
import { db } from '@/lib/db/client'
import { leesAlleSpelers } from '@/lib/db/spelers'
import { afrekenlijst } from '@/lib/domein/boetepot'
import { dagVan } from '@/lib/domein/afwezigheid'
import { alsEuro } from '@/lib/weergave/geld'
import { alsKorteDag } from '@/lib/weergave/tijd'
import { Onderdelen } from '../_onderdelen/Onderdelen'

export const dynamic = 'force-dynamic'

const kleineKnop =
  'min-h-11 rounded-xl border border-rand bg-paneel-op px-3 text-sm text-tekst transition-colors hover:border-club-op/60'

function OngedaanMaken({ spelerId, betaaldOp }: { spelerId: string; betaaldOp: Date }) {
  return (
    <form action={maakBetaaldOngedaanAlsAfrekenaar}>
      <input type="hidden" name="spelerId" value={spelerId} />
      <input type="hidden" name="betaaldOp" value={betaaldOp.toISOString()} />
      <button className={kleineKnop}>Ongedaan maken</button>
    </form>
  )
}

export default async function Afrekenen({
  searchParams,
}: {
  searchParams: Promise<{ net?: string; op?: string }>
}) {
  const speler = await vereisAfrekenaar()
  const { net, op } = await searchParams
  const verbinding = db()
  const [boetes, spelers] = await Promise.all([leesBoetes(verbinding), leesAlleSpelers(verbinding)])

  const lijst = afrekenlijst(
    boetes,
    spelers.map((s) => ({ id: s.id, naam: s.weergavenaam ?? s.naam })),
  )
  const samen = lijst.open.reduce((som, r) => som + r.openCent, 0)

  // Wie net is afgevinkt, blijft bovenaan staan met "Ongedaan maken", tot je
  // het scherm verlaat. Zo hoef je niet te zoeken om een vergissing terug te draaien.
  const netAfgevinkt = lijst.afgerekend.find(
    (r) => r.spelerId === net && op && r.laatstBetaaldOp.toISOString() === op,
  )
  const afgerekend = lijst.afgerekend.filter((r) => r !== netAfgevinkt)
  const vandaag = dagVan(new Date())

  return (
    <Schil naam={speler.naam} isLeider={speler.magLeiden} tab="boetepot">
      <Onderdelen actief="afrekenen" magAfrekenen />

      <section className="rounded-2xl border border-rand bg-paneel p-4">
        <div className="flex items-baseline justify-between gap-3">
          <h1 className="bovenkop text-zacht">
            Moet nog betalen <span className="cijfers text-tekst">{lijst.open.length}</span>
          </h1>
          {samen > 0 && (
            <p className="cijfers text-sm text-zacht">
              samen <span className="kopregel text-tekst">{alsEuro(samen)}</span>
            </p>
          )}
        </div>

        {lijst.open.length === 0 && !netAfgevinkt && (
          <p className="mt-2 text-sm text-zacht">Iedereen heeft betaald. Mooi zo.</p>
        )}

        <ul className="mt-2 flex flex-col">
          {netAfgevinkt && (
            <li className="-mx-2 flex min-h-14 items-center gap-3 rounded-lg border-b border-rand/60 bg-komt/10 px-2 py-2">
              <span className="kopregel min-w-0 flex-1 truncate text-sm">
                {netAfgevinkt.naam} <span className="text-komt-op">✓ betaald</span>
              </span>
              <OngedaanMaken spelerId={netAfgevinkt.spelerId} betaaldOp={netAfgevinkt.laatstBetaaldOp} />
            </li>
          )}
          {lijst.open.map((r) => (
            <li key={r.spelerId} className="flex min-h-14 items-center gap-3 border-b border-rand/60 py-2 last:border-b-0">
              <span className="kopregel min-w-0 flex-1 truncate text-sm">{r.naam}</span>
              <span className="uithangbord cijfers whitespace-nowrap text-lg">{alsEuro(r.openCent)}</span>
              <form action={zetBetaaldAlsAfrekenaar}>
                <input type="hidden" name="spelerId" value={r.spelerId} />
                <button className="kopregel min-h-11 rounded-xl bg-komt px-4 text-sm text-grond transition-colors hover:bg-komt/90">
                  Betaald
                </button>
              </form>
            </li>
          ))}
        </ul>
      </section>

      {afgerekend.length > 0 && (
        <details className="group rounded-xl border border-rand bg-paneel">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between px-4 [&::-webkit-details-marker]:hidden">
            <span className="bovenkop text-zacht">
              Afgerekend <span className="cijfers text-tekst">{afgerekend.length}</span>
            </span>
            <span className="bovenkop text-zacht group-open:text-club-op">toon</span>
          </summary>
          <ul className="flex flex-col border-t border-rand px-4">
            {afgerekend.map((r) => (
              <li key={r.spelerId} className="flex min-h-14 items-center gap-3 border-b border-rand/60 py-2 last:border-b-0">
                <span className="text-komt-op" aria-hidden>
                  ✓
                </span>
                <span className="min-w-0 flex-1 truncate text-sm">{r.naam}</span>
                <span className="text-xs text-zacht">
                  {dagVan(r.laatstBetaaldOp) === vandaag ? 'vandaag' : alsKorteDag(r.laatstBetaaldOp)}
                </span>
                <OngedaanMaken spelerId={r.spelerId} betaaldOp={r.laatstBetaaldOp} />
              </li>
            ))}
          </ul>
        </details>
      )}

      <Link href="/boetepot/vaste-boetes" className="text-sm text-club-op">
        Vaste boetes en voorstellen instellen
      </Link>
    </Schil>
  )
}
