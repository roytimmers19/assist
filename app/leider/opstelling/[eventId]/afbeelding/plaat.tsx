import type { Formatie } from '@/lib/domein/formaties'
import type { Basisregel, Opstellingweergave, Weergaveregel } from '@/lib/domein/opstelling'

/*
 * De plaat die de leider in de groepsapp gooit. Bewust een eigen tekening en
 * niet het React-veld: deze plaat wordt door Satori getekend en dat kent maar
 * een deel van CSS. De namen en nummers komen wél uit dezelfde bron als het
 * scherm, dus inhoudelijk kan er niets uit de pas lopen.
 *
 * Hoogte 3:2 staand — dat is de verhouding van een telefoonschermafbeelding
 * en wordt in een groepsapp niet bijgesneden.
 */
const BREED = 1080
const HOOG = 1620

export const AFMETING = { width: BREED, height: HOOG }
const RAND = 48
const VELD_BREED = BREED - RAND * 2
const VELD_HOOG = 1180

const GROND = '#0a0f1a'
const LIJN = 'rgba(255,255,255,0.14)'
const TEKST = '#eef2f9'
const ZACHT = '#93a0b8'
const CLUB = '#3e63ae'
const WEG = '#d94b49'
const GRAS = '#16291f'
const OMLIJNING = '#26324a'

/**
 * Onder de onderste linie moet ruimte overblijven: de naam hangt ónder de
 * penning en een keeper met een lange naam liep anders het veld uit.
 */
const ONDERMARGE = 44

/** Ruimste breedte van een spelersblokje; namen mogen over twee regels. */
const BLOK_MAX = 190
const PENNING = 76

/**
 * Hoe breed een naam mag zijn hangt af van hoeveel man er in die linie staan:
 * bij vijf middenvelders is er per man minder plek dan bij drie. Zonder deze
 * berekening lopen de namen in een 3-5-2 over elkaar heen.
 */
function blokbreedtes(formatie: Formatie): Map<number, number> {
  const perLinie = new Map<number, number>()
  for (const plek of formatie.plekken) perLinie.set(plek.y, (perLinie.get(plek.y) ?? 0) + 1)

  const uit = new Map<number, number>()
  for (const plek of formatie.plekken) {
    const naast = perLinie.get(plek.y) ?? 1
    uit.set(plek.slot, Math.min(BLOK_MAX, VELD_BREED / (naast + 1) - 14))
  }
  return uit
}

function Speler({
  regel,
  label,
  breedte,
}: {
  regel: Basisregel | null
  label: string
  breedte: number
}) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: breedte,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: PENNING,
          height: PENNING,
          borderRadius: PENNING,
          fontSize: 34,
          fontWeight: 700,
          // Zelfde volgorde als op het scherm — leeg, gewaarschuwd, bezet —
          // zodat wie de plaat deelt hetzelfde ziet als wie hem bouwt.
          ...(!regel
            ? { border: `2px dashed ${ZACHT}`, color: ZACHT }
            : regel.gewaarschuwd
              ? { backgroundColor: WEG, color: '#ffffff' }
              : { backgroundColor: CLUB, color: '#ffffff' }),
        }}
      >
        {regel ? (regel.nummer === null ? '–' : String(regel.nummer)) : label}
      </div>

      {regel && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginTop: 10,
            fontSize: 24,
            lineHeight: 1.2,
            color: TEKST,
            textAlign: 'center',
          }}
        >
          {regel.gast ? `${regel.naam} (gast)` : regel.naam}
        </div>
      )}
    </div>
  )
}

function bankregel(bank: Weergaveregel[]): string {
  return bank
    .map((r) => `${r.nummer ?? '–'} ${r.naam}${r.gast ? ' (gast)' : ''}`)
    .join('   ·   ')
}

/**
 * De hele plaat als één element. Los van de route zodat er een script naast
 * kan draaien dat hem naar een bestand tekent om hem te kunnen bekijken.
 */
export function Veldplaat({
  titel,
  wanneer,
  formatie,
  weergave,
}: {
  titel: string
  wanneer: string
  formatie: Formatie
  weergave: Opstellingweergave
}) {
  const bezet = new Map(weergave.basis.map((r) => [r.slot, r]))
  const breedtes = blokbreedtes(formatie)

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: BREED,
        height: HOOG,
        padding: RAND,
        backgroundColor: GROND,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 26, color: ZACHT, letterSpacing: 2 }}>
            {wanneer.toUpperCase()}
          </div>
          <div
            style={{ display: 'flex', marginTop: 8, fontSize: 52, fontWeight: 700, color: TEKST }}
          >
            {titel}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 8,
            padding: '10px 20px',
            borderRadius: 999,
            backgroundColor: CLUB,
            fontSize: 30,
            fontWeight: 700,
            color: '#ffffff',
          }}
        >
          {formatie.naam}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          position: 'relative',
          width: VELD_BREED,
          height: VELD_HOOG,
          marginTop: 24,
          borderRadius: 28,
          border: `2px solid ${OMLIJNING}`,
          backgroundColor: GRAS,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: VELD_HOOG / 2,
            width: VELD_BREED,
            height: 2,
            backgroundColor: LIJN,
          }}
        />
        <div
          style={{
            position: 'absolute',
            left: VELD_BREED / 2 - 90,
            top: VELD_HOOG / 2 - 90,
            width: 180,
            height: 180,
            borderRadius: 180,
            border: `2px solid ${LIJN}`,
          }}
        />

        {formatie.plekken.map((plek) => (
          <div
            key={plek.slot}
            style={{
              display: 'flex',
              position: 'absolute',
              left: (plek.x / 100) * VELD_BREED - (breedtes.get(plek.slot) ?? BLOK_MAX) / 2,
              top:
                VELD_HOOG -
                ONDERMARGE -
                (plek.y / 100) * (VELD_HOOG - ONDERMARGE) -
                PENNING / 2,
            }}
          >
            <Speler
              regel={bezet.get(plek.slot) ?? null}
              label={plek.label}
              breedte={breedtes.get(plek.slot) ?? BLOK_MAX}
            />
          </div>
        ))}
      </div>

      {weergave.bank.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', marginTop: 24 }}>
          <div style={{ display: 'flex', fontSize: 24, color: ZACHT, letterSpacing: 3 }}>BANK</div>
          <div
            style={{ display: 'flex', marginTop: 8, fontSize: 26, color: TEKST, lineHeight: 1.4 }}
          >
            {bankregel(weergave.bank)}
          </div>
        </div>
      )}
    </div>
  )
}
