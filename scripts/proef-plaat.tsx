import { writeFileSync } from 'node:fs'
import { ImageResponse } from 'next/og'
import { AFMETING, Veldplaat } from '@/app/leider/opstelling/[eventId]/afbeelding/plaat'
import { zoekFormatie } from '@/lib/domein/formaties'
import type { Basisregel, Weergaveregel } from '@/lib/domein/opstelling'

function veld(
  slot: number,
  nummer: number | null,
  naam: string,
  gast = false,
  gewaarschuwd = false,
): Basisregel {
  return { slot, spelerId: gast ? null : `s${slot}`, nummer, naam, gast, gewaarschuwd }
}
function bank(nummer: number | null, naam: string, gast = false): Weergaveregel {
  return { slot: null, spelerId: gast ? null : naam, nummer, naam, gast, gewaarschuwd: false }
}

const weergave = {
  basis: [
    veld(0, 1, 'Bas Vermeer'),
    veld(1, 2, 'Kes de Groot'),
    veld(2, 3, 'Jeroen Bakker'),
    veld(3, 4, 'Sander Kramer'),
    veld(4, 5, 'Niels van Dijk'),
    veld(5, 21, 'Wout van Uden', true),
    veld(6, 6, 'Milan Hendriks'),
    veld(7, 8, 'Ruben Jansen'),
    veld(8, 9, 'Lars Kuipers', false, true),
    veld(9, 10, 'Thijs Peters'),
    veld(10, 11, 'Mark Verhoeven'),
  ],
  bank: [
    bank(7, 'Daan Smit'),
    bank(17, 'Joost Mulder'),
    bank(12, 'Fedde Dekker'),
    bank(14, 'Loek Brouwer'),
    bank(null, 'Senn Wissel', true),
  ],
}

const plaat = new ImageResponse(
  <Veldplaat
    titel="Uit tegen Tegenstander 2"
    wanneer="Zondag 6 september, 09:30"
    formatie={zoekFormatie(process.argv[3] ?? '4-4-2')!}
    weergave={weergave}
  />,
  AFMETING,
)

writeFileSync(process.argv[2], Buffer.from(await plaat.arrayBuffer()))
console.log('geschreven naar', process.argv[2])
