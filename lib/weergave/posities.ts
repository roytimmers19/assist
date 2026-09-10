export const POSITIES = ['keeper', 'verdediger', 'middenvelder', 'aanvaller'] as const

export type Positie = (typeof POSITIES)[number]

/** Leest een keuzelijstwaarde uit een formulier; alles wat niet klopt wordt leeg. */
export function alsPositie(waarde: unknown): Positie | null {
  return POSITIES.includes(waarde as Positie) ? (waarde as Positie) : null
}
