/**
 * De catalogus staat in code en niet in de database: het is geen instelling
 * die een leider zonder overleg moet kunnen veranderen.
 *
 * Slot 0 is in élke formatie de keeper en 1 tot en met 10 lopen van achter
 * naar voren. Daardoor haalt van formatie wisselen niemand van het veld: de
 * spelers houden hun slot en krijgen alleen een andere plek.
 *
 * x en y zijn percentages. y = 0 is het eigen doel, y = 100 dat van de
 * tegenstander; x = 0 is links.
 */
export type Veldplek = { slot: number; x: number; y: number; label: string }

export type Formatie = { sleutel: string; naam: string; plekken: Veldplek[] }

export const STANDAARDFORMATIE = '4-3-3'

/** Hulpje om een linie gelijkmatig over de breedte te verdelen. */
function linie(slotVanaf: number, y: number, labels: string[]): Veldplek[] {
  return labels.map((label, i) => ({
    slot: slotVanaf + i,
    x: Math.round(((i + 1) / (labels.length + 1)) * 100),
    y,
    label,
  }))
}

const KEEPER: Veldplek = { slot: 0, x: 50, y: 8, label: 'K' }

export const FORMATIES: Formatie[] = [
  {
    sleutel: '4-3-3',
    naam: '4-3-3',
    plekken: [
      KEEPER,
      ...linie(1, 28, ['LB', 'CV', 'CV', 'RB']),
      ...linie(5, 55, ['CM', 'CM', 'CM']),
      ...linie(8, 82, ['LA', 'SP', 'RA']),
    ],
  },
  {
    sleutel: '4-4-2',
    naam: '4-4-2',
    plekken: [
      KEEPER,
      ...linie(1, 28, ['LB', 'CV', 'CV', 'RB']),
      ...linie(5, 55, ['LM', 'CM', 'CM', 'RM']),
      ...linie(9, 82, ['SP', 'SP']),
    ],
  },
  {
    sleutel: '4-2-3-1',
    naam: '4-2-3-1',
    plekken: [
      KEEPER,
      ...linie(1, 26, ['LB', 'CV', 'CV', 'RB']),
      ...linie(5, 46, ['CM', 'CM']),
      ...linie(7, 68, ['LA', 'CM', 'RA']),
      ...linie(10, 86, ['SP']),
    ],
  },
  {
    sleutel: '3-5-2',
    naam: '3-5-2',
    plekken: [
      KEEPER,
      ...linie(1, 28, ['CV', 'CV', 'CV']),
      ...linie(4, 55, ['LM', 'CM', 'CM', 'CM', 'RM']),
      ...linie(9, 82, ['SP', 'SP']),
    ],
  },
]

export function zoekFormatie(sleutel: string): Formatie | null {
  return FORMATIES.find((f) => f.sleutel === sleutel) ?? null
}

/**
 * De afkortingen op het veld uitgeschreven, voor boven het keuzepaneel: daar
 * lees je liever "Linksback" dan "LB" of het slotnummer.
 */
const POSITIENAMEN: Record<string, string> = {
  K: 'Keeper',
  LB: 'Linksback',
  RB: 'Rechtsback',
  CV: 'Centrale verdediger',
  LM: 'Linkshalf',
  RM: 'Rechtshalf',
  CM: 'Middenvelder',
  LA: 'Linksbuiten',
  RA: 'Rechtsbuiten',
  SP: 'Spits',
}

export function positienaam(label: string): string {
  return POSITIENAMEN[label] ?? label
}
