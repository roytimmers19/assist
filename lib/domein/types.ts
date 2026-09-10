export type EventType = 'training' | 'wedstrijd'

/** Eén event zoals het uit de agendafeed komt, al genormaliseerd. */
export type GeparsedEvent = {
  icalUid: string
  type: EventType
  startOp: Date
  eindOp: Date | null
  locatie: string | null
  tegenstander: string | null
  thuis: boolean | null
}

export type ParseResultaat = {
  events: GeparsedEvent[]
  /** Events met een onbekende CATEGORIES; geteld, niet geraden. */
  overgeslagen: number
  waarschuwingen: string[]
}

/** Wat de database al weet, teruggebracht tot wat het koppelen nodig heeft. */
export type BestaandEvent = {
  id: string
  icalUid: string | null
  type: EventType
  startOp: Date
  status: 'gepland' | 'afgelast'
}

export type ImportPlan = {
  nieuw: GeparsedEvent[]
  bijwerken: { id: string; event: GeparsedEvent }[]
  afgelasten: { id: string }[]
}

export type Noodrem = { rem: false } | { rem: true; reden: string }

export type Status = 'ja' | 'nee'

/** 'aanname' bestaat nooit als rij in de database; het volgt uit het ontbreken ervan. */
export type Bron = 'aanname' | 'speler' | 'leider'

export type Melding = {
  spelerId: string
  status: Status
  bron: 'speler' | 'leider'
  toelichting: string | null
  gezetOp: Date
}

export type Stand = {
  spelerId: string
  status: Status
  bron: Bron
  toelichting: string | null
  gezetOp: Date | null
}
