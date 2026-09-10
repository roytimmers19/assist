import { DateTime } from 'luxon'
import { describe, expect, it } from 'vitest'
import { berekenDeadline } from '@/lib/domein/deadline'

const amsterdam = (iso: string) => DateTime.fromISO(iso, { zone: 'Europe/Amsterdam' }).toJSDate()
const alsWandklok = (d: Date) =>
  DateTime.fromJSDate(d).setZone('Europe/Amsterdam').toFormat('yyyy-MM-dd HH:mm')

describe('berekenDeadline', () => {
  it('legt de trainingsdeadline 24 uur voor aanvang', () => {
    // Training donderdag 3 september 18:30 → woensdag 2 september 18:30.
    expect(alsWandklok(berekenDeadline(amsterdam('2026-09-03T18:30'), 24))).toBe('2026-09-02 18:30')
  })

  it('legt de wedstrijddeadline 48 uur voor aanvang', () => {
    // Wedstrijd zondag 6 september 09:30 → vrijdag 4 september 09:30.
    expect(alsWandklok(berekenDeadline(amsterdam('2026-09-06T09:30'), 48))).toBe('2026-09-04 09:30')
  })

  it('trekt over de overgang naar wintertijd een absolute 48 uur af', () => {
    // In de nacht van zaterdag op zondag 25 oktober 2026 gaat de klok een uur terug.
    // Die zondag duurt 25 wandklokuren, dus 48 absolute uren eerder is 11:00, niet 10:00.
    expect(alsWandklok(berekenDeadline(amsterdam('2026-10-25T10:00'), 48))).toBe('2026-10-23 11:00')
  })

  it('trekt over de overgang naar zomertijd een absolute 48 uur af', () => {
    // In de nacht van zaterdag op zondag 28 maart 2027 gaat de klok een uur vooruit.
    expect(alsWandklok(berekenDeadline(amsterdam('2027-03-28T10:00'), 48))).toBe('2027-03-26 09:00')
  })
})
