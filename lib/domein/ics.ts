import { DateTime } from 'luxon'
import { ZONE } from './tijd'
import type { EventType, GeparsedEvent, ParseResultaat } from './types'

/** ICS breekt lange regels af met een nieuwe regel die begint met spatie of tab. */
function ontvouw(tekst: string): string[] {
  const regels = tekst.replace(/\r\n/g, '\n').split('\n')
  const uit: string[] = []
  for (const regel of regels) {
    if ((regel.startsWith(' ') || regel.startsWith('\t')) && uit.length > 0) {
      uit[uit.length - 1] += regel.slice(1)
    } else {
      uit.push(regel)
    }
  }
  return uit
}

function ontsnap(waarde: string): string {
  return waarde
    .replace(/\\n/gi, '\n')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\')
}

type Eigenschap = { naam: string; parameters: Record<string, string>; waarde: string }

function leesEigenschap(regel: string): Eigenschap | null {
  const scheiding = regel.indexOf(':')
  if (scheiding === -1) return null
  const kop = regel.slice(0, scheiding)
  const waarde = regel.slice(scheiding + 1)
  const [naam, ...paramDelen] = kop.split(';')
  const parameters: Record<string, string> = {}
  for (const deel of paramDelen) {
    const isGelijk = deel.indexOf('=')
    if (isGelijk > 0) parameters[deel.slice(0, isGelijk).toUpperCase()] = deel.slice(isGelijk + 1)
  }
  return { naam: naam.toUpperCase(), parameters, waarde }
}

/** DTSTART;TZID=Europe/Amsterdam:20260830T100000 → absoluut tijdstip. */
function leesTijdstip(eigenschap: Eigenschap): Date | null {
  const ruw = eigenschap.waarde.trim()
  if (ruw.endsWith('Z')) {
    const dt = DateTime.fromFormat(ruw, "yyyyMMdd'T'HHmmss'Z'", { zone: 'utc' })
    return dt.isValid ? dt.toJSDate() : null
  }
  const zone = eigenschap.parameters.TZID ?? ZONE
  const dt = DateTime.fromFormat(ruw, "yyyyMMdd'T'HHmmss", { zone })
  return dt.isValid ? dt.toJSDate() : null
}

function bepaalType(categorie: string | undefined): EventType | null {
  if (!categorie) return null
  if (categorie.trim() === 'Training') return 'training'
  if (categorie.trim().startsWith('Wedstrijdprogramma')) return 'wedstrijd'
  return null
}

/** "A tegen B" → welke kant het eigen team is, en wie de tegenstander. */
function leesTegenstander(
  samenvatting: string,
  teamnaam: string,
): { tegenstander: string; thuis: boolean } | null {
  const delen = samenvatting.split(' tegen ')
  if (delen.length !== 2) return null
  const [links, rechts] = delen.map((d) => d.trim())
  if (links === teamnaam) return { tegenstander: rechts, thuis: true }
  if (rechts === teamnaam) return { tegenstander: links, thuis: false }
  return null
}

export function parseIcs(tekst: string, teamnaam: string): ParseResultaat {
  const events: GeparsedEvent[] = []
  const waarschuwingen: string[] = []
  let overgeslagen = 0

  let huidig: Eigenschap[] | null = null

  for (const regel of ontvouw(tekst)) {
    if (regel === 'BEGIN:VEVENT') {
      huidig = []
      continue
    }
    if (regel === 'END:VEVENT') {
      if (huidig) {
        const resultaat = maakEvent(huidig, teamnaam)
        if (resultaat.event) events.push(resultaat.event)
        else overgeslagen += 1
        waarschuwingen.push(...resultaat.waarschuwingen)
      }
      huidig = null
      continue
    }
    if (huidig === null) continue
    const eigenschap = leesEigenschap(regel)
    if (eigenschap) huidig.push(eigenschap)
  }

  return { events, overgeslagen, waarschuwingen }
}

function maakEvent(
  eigenschappen: Eigenschap[],
  teamnaam: string,
): { event: GeparsedEvent | null; waarschuwingen: string[] } {
  const waarschuwingen: string[] = []
  const zoek = (naam: string) => eigenschappen.find((e) => e.naam === naam)

  const type = bepaalType(zoek('CATEGORIES')?.waarde)
  const uid = zoek('UID')?.waarde?.trim()
  const startEigenschap = zoek('DTSTART')
  if (!type || !uid || !startEigenschap) return { event: null, waarschuwingen }

  const startOp = leesTijdstip(startEigenschap)
  if (!startOp) return { event: null, waarschuwingen }

  const eindEigenschap = zoek('DTEND')
  const eindOp = eindEigenschap ? leesTijdstip(eindEigenschap) : null

  const locatieRuw = zoek('LOCATION')?.waarde
  const locatie = locatieRuw ? ontsnap(locatieRuw).trim() || null : null

  let tegenstander: string | null = null
  let thuis: boolean | null = null

  if (type === 'wedstrijd') {
    const samenvatting = ontsnap(zoek('SUMMARY')?.waarde ?? '').trim()
    const gevonden = leesTegenstander(samenvatting, teamnaam)
    if (gevonden) {
      tegenstander = gevonden.tegenstander
      thuis = gevonden.thuis
    } else {
      waarschuwingen.push(`Tegenstander niet af te leiden uit: "${samenvatting}"`)
    }
  }

  return { event: { icalUid: uid, type, startOp, eindOp, locatie, tegenstander, thuis }, waarschuwingen }
}
