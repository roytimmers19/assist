/**
 * Automatisch toelaten is één tijdstip en geen aan-uitveld: leeg is dicht, een
 * tijdstip in de toekomst is open, en een verstreken tijdstip is vanzelf weer
 * dicht. Zo kan er niets in tegenspraak raken en hoeft er niets opgeruimd te
 * worden — en blijft de deur nooit per ongeluk openstaan.
 *
 * Precies óp de vervaltijd is hij dicht. Een deur die op zijn eigen sluitmoment
 * nog opengaat laat er net één binnen die je niet verwachtte.
 */
export function deurStaatOpen(tot: Date | null, nu: Date): boolean {
  if (!tot) return false
  return tot.getTime() > nu.getTime()
}

/** Hoe lang de deur openstaat als de leider hem opent. */
const OPEN_UREN = 24

export function sluitmomentVanaf(nu: Date): Date {
  return new Date(nu.getTime() + OPEN_UREN * 60 * 60 * 1000)
}
