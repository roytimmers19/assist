import { relations, sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core'
import { user } from './auth-schema'

export * from './auth-schema'

export const spelers = pgTable('speler', {
  id: uuid('id').primaryKey().defaultRandom(),
  /** Verwijst naar Better Auth `user.id`. Leeg zolang de uitnodiging openstaat. */
  gebruikerId: text('gebruiker_id')
    .unique()
    .references(() => user.id, { onDelete: 'set null' }),
  naam: text('naam').notNull(),
  weergavenaam: text('weergavenaam'),
  rugnummer: integer('rugnummer'),
  positie: text('positie', {
    enum: ['keeper', 'verdediger', 'middenvelder', 'aanvaller'],
  }),
  voorkeursvoet: text('voorkeursvoet', { enum: ['links', 'rechts', 'beide'] }),
  telefoon: text('telefoon'),
  email: text('email').notNull().unique(),
  rol: text('rol', { enum: ['speler', 'leider'] })
    .notNull()
    .default('speler'),
  /**
   * Mag alles wat een leider mag, maar staat in de ploeg als speler. Geen scherm
   * zet dit; de eigenaar doet het met de hand. Zie `specs/toegang/spec.md`.
   */
  beheerder: boolean('beheerder').notNull().default(false),
  accountStatus: text('account_status', {
    enum: ['uitgenodigd', 'wacht_op_goedkeuring', 'actief'],
  })
    .notNull()
    .default('uitgenodigd'),
  actief: boolean('actief').notNull().default(true),
  /**
   * Wat hij standaard doet. Wie op donderdag werkt of niet in Uden woont zet
   * trainingen uit; een leider die niet meespeelt zet beide uit. Standaard
   * waar, zodat alleen een uitzondering iets hoeft te zetten.
   */
  doetTrainingen: boolean('doet_trainingen').notNull().default(true),
  doetWedstrijden: boolean('doet_wedstrijden').notNull().default(true),
  /** Mag in de boetepot afrekenen en de vaste boetes beheren. Zie `specs/boetepot/spec.md`. */
  penningmeester: boolean('penningmeester').notNull().default(false),
  /** Mag in de boetepot boetes geven en intrekken. */
  boeteUitdeler: boolean('boete_uitdeler').notNull().default(false),
  aangemaaktOp: timestamp('aangemaakt_op', { withTimezone: true }).notNull().defaultNow(),
})

export const uitnodigingen = pgTable('uitnodiging', {
  id: uuid('id').primaryKey().defaultRandom(),
  spelerId: uuid('speler_id')
    .notNull()
    .references(() => spelers.id, { onDelete: 'cascade' }),
  tokenHash: text('token_hash').notNull().unique(),
  verlooptOp: timestamp('verloopt_op', { withTimezone: true }).notNull(),
  gebruiktOp: timestamp('gebruikt_op', { withTimezone: true }),
  aangemaaktOp: timestamp('aangemaakt_op', { withTimezone: true }).notNull().defaultNow(),
})

export const teamInstelling = pgTable('team_instelling', {
  id: smallint('id').primaryKey().default(1),
  teamnaam: text('teamnaam').notNull(),
  icsUrl: text('ics_url').notNull(),
  teamcode: text('teamcode').notNull(),
  /**
   * Tot wanneer wie zich met de teamcode meldt er direct in mag. Leeg is dicht,
   * en een verstreken tijdstip is vanzelf weer dicht — één veld, dus er kan
   * niets in tegenspraak raken.
   */
  automatischToelatenTot: timestamp('automatisch_toelaten_tot', { withTimezone: true }),
})

export const eventtypeInstelling = pgTable('eventtype_instelling', {
  type: text('type', { enum: ['training', 'wedstrijd'] }).primaryKey(),
  deadlineUrenVoorAanvang: integer('deadline_uren_voor_aanvang').notNull(),
})

export const events = pgTable(
  'event',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    type: text('type', { enum: ['training', 'wedstrijd'] }).notNull(),
    startOp: timestamp('start_op', { withTimezone: true }).notNull(),
    eindOp: timestamp('eind_op', { withTimezone: true }),
    locatie: text('locatie'),
    tegenstander: text('tegenstander'),
    thuis: boolean('thuis'),
    icalUid: text('ical_uid').unique(),
    bron: text('bron', { enum: ['ics', 'handmatig'] })
      .notNull()
      .default('ics'),
    status: text('status', { enum: ['gepland', 'afgelast'] })
      .notNull()
      .default('gepland'),
    afmeldDeadline: timestamp('afmeld_deadline', { withTimezone: true }).notNull(),
    laatstGezienInFeedOp: timestamp('laatst_gezien_in_feed_op', { withTimezone: true }),
  },
  (tabel) => [index('event_start_op_idx').on(tabel.startOp)],
)

export const aanwezigheid = pgTable(
  'aanwezigheid',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    spelerId: uuid('speler_id')
      .notNull()
      .references(() => spelers.id, { onDelete: 'cascade' }),
    status: text('status', { enum: ['ja', 'nee'] }).notNull(),
    bron: text('bron', { enum: ['speler', 'leider'] }).notNull(),
    toelichting: text('toelichting'),
    gezetOp: timestamp('gezet_op', { withTimezone: true }).notNull().defaultNow(),
    gezetDoorSpelerId: uuid('gezet_door_speler_id').references(() => spelers.id),
  },
  (tabel) => [
    index('aanwezigheid_event_speler_idx').on(tabel.eventId, tabel.spelerId, tabel.gezetOp),
  ],
)

export const importRuns = pgTable('import_run', {
  id: uuid('id').primaryKey().defaultRandom(),
  gestartOp: timestamp('gestart_op', { withTimezone: true }).notNull().defaultNow(),
  geeindigdOp: timestamp('geeindigd_op', { withTimezone: true }),
  status: text('status', { enum: ['ok', 'fout', 'afgebroken'] }).notNull(),
  aantalGelezen: integer('aantal_gelezen').notNull().default(0),
  aantalNieuw: integer('aantal_nieuw').notNull().default(0),
  aantalBijgewerkt: integer('aantal_bijgewerkt').notNull().default(0),
  aantalAfgelast: integer('aantal_afgelast').notNull().default(0),
  aantalOvergeslagen: integer('aantal_overgeslagen').notNull().default(0),
  melding: text('melding'),
})

export const aanwezigheidRelaties = relations(aanwezigheid, ({ one }) => ({
  event: one(events, { fields: [aanwezigheid.eventId], references: [events.id] }),
  speler: one(spelers, { fields: [aanwezigheid.spelerId], references: [spelers.id] }),
}))

export const opstellingen = pgTable('opstelling', {
  id: uuid('id').primaryKey().defaultRandom(),
  eventId: uuid('event_id')
    .notNull()
    .unique()
    .references(() => events.id, { onDelete: 'cascade' }),
  formatie: text('formatie').notNull(),
  status: text('status', { enum: ['concept', 'gepubliceerd'] })
    .notNull()
    .default('concept'),
  gepubliceerdOp: timestamp('gepubliceerd_op', { withTimezone: true }),
  aangemaaktOp: timestamp('aangemaakt_op', { withTimezone: true }).notNull().defaultNow(),
  bijgewerktOp: timestamp('bijgewerkt_op', { withTimezone: true }).notNull().defaultNow(),
})

export const opstellingPlekken = pgTable(
  'opstelling_plek',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    opstellingId: uuid('opstelling_id')
      .notNull()
      .references(() => opstellingen.id, { onDelete: 'cascade' }),
    /** Leeg betekent bank, en komt alleen bij gasten voor. */
    slot: smallint('slot'),
    spelerId: uuid('speler_id').references(() => spelers.id, { onDelete: 'cascade' }),
    gastnaam: text('gastnaam'),
    gastnummer: integer('gastnummer'),
  },
  (tabel) => [
    uniqueIndex('opstelling_slot_idx')
      .on(tabel.opstellingId, tabel.slot)
      .where(sql`${tabel.slot} is not null`),
    uniqueIndex('opstelling_speler_idx')
      .on(tabel.opstellingId, tabel.spelerId)
      .where(sql`${tabel.spelerId} is not null`),
    // Een plek draagt óf een speler óf een gast, nooit allebei en nooit geen van beide.
    check(
      'plek_heeft_een_identiteit',
      sql`(${tabel.spelerId} is not null) <> (${tabel.gastnaam} is not null)`,
    ),
    // Voor eigen spelers wordt de bank afgeleid; een bankrij is dus altijd een gast.
    check('bank_is_altijd_gast', sql`${tabel.slot} is not null or ${tabel.gastnaam} is not null`),
    check(
      'slot_binnen_bereik',
      sql`${tabel.slot} is null or (${tabel.slot} >= 0 and ${tabel.slot} <= 10)`,
    ),
  ],
)

export const afwezigheden = pgTable(
  'afwezigheid',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spelerId: uuid('speler_id')
      .notNull()
      .references(() => spelers.id, { onDelete: 'cascade' }),
    /** De eerste dag dat hij er niet is. */
    van: date('van').notNull(),
    /** De eerste dag dat hij er wéér is. Leeg is een open einde. */
    terugOp: date('terug_op'),
    reden: text('reden').notNull(),
    /** De speler zelf of een leider. Blijft leeg als die speler verdwijnt. */
    gezetDoor: uuid('gezet_door').references(() => spelers.id, { onDelete: 'set null' }),
    gezetOp: timestamp('gezet_op', { withTimezone: true }).notNull().defaultNow(),
    bijgewerktOp: timestamp('bijgewerkt_op', { withTimezone: true }).notNull().defaultNow(),
  },
  (tabel) => [
    index('afwezigheid_speler_idx').on(tabel.spelerId),
    // Een reden van alleen spaties is net zo onbruikbaar als een lege.
    check('reden_is_gevuld', sql`length(btrim(${tabel.reden})) > 0`),
    // Een periode van nul dagen bestaat niet.
    check('terug_na_van', sql`${tabel.terugOp} is null or ${tabel.terugOp} > ${tabel.van}`),
  ],
)

export const diensten = pgTable(
  'dienst',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: uuid('event_id')
      .notNull()
      .references(() => events.id, { onDelete: 'cascade' }),
    spelerId: uuid('speler_id')
      .notNull()
      .references(() => spelers.id, { onDelete: 'cascade' }),
    soort: text('soort', { enum: ['materiaal', 'rijden'] }).notNull(),
    toegewezenOp: timestamp('toegewezen_op', { withTimezone: true }).notNull().defaultNow(),
    /** De leider die hem zette. Blijft leeg als die speler verdwijnt. */
    toegewezenDoor: uuid('toegewezen_door').references(() => spelers.id, { onDelete: 'set null' }),
  },
  (tabel) => [
    // Twee keer dezelfde dienst bij hetzelfde event is dubbelop. Beide soorten
    // bij één event mag wél: bij een kleine selectie soms onvermijdelijk.
    uniqueIndex('dienst_event_speler_soort_idx').on(tabel.eventId, tabel.spelerId, tabel.soort),
    index('dienst_event_idx').on(tabel.eventId),
  ],
)

/**
 * De vaste boetes. Een soort wordt uitgezet, nooit gewist, zodat oude boetes
 * er nog naar kunnen wijzen. Per soort event hoort hooguit één soort bij te
 * laat afmelden, en één soort mag bij allebei horen. Het tijdstip is het
 * moment van koppelen: vanaf dan doet de app voorstellen, leeg is niet gekoppeld.
 */
export const boetesoorten = pgTable(
  'boetesoort',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    omschrijving: text('omschrijving').notNull(),
    bedragCent: integer('bedrag_cent').notNull(),
    actief: boolean('actief').notNull().default(true),
    /** Bij geven kies je een aantal, zoals twintig tegengoals: het bedrag is per stuk. */
    perStuk: boolean('per_stuk').notNull().default(false),
    teLaatWedstrijdOp: timestamp('te_laat_wedstrijd_op', { withTimezone: true }),
    teLaatTrainingOp: timestamp('te_laat_training_op', { withTimezone: true }),
  },
  (tabel) => [
    check('boetesoort_omschrijving_gevuld', sql`length(btrim(${tabel.omschrijving})) > 0`),
    check('boetesoort_bedrag_positief', sql`${tabel.bedragCent} > 0`),
    // Hooguit één gekoppelde soort per soort event: een unieke index op een vaste waarde.
    uniqueIndex('boetesoort_te_laat_wedstrijd_idx')
      .on(sql`(true)`)
      .where(sql`${tabel.teLaatWedstrijdOp} is not null`),
    uniqueIndex('boetesoort_te_laat_training_idx')
      .on(sql`(true)`)
      .where(sql`${tabel.teLaatTrainingOp} is not null`),
  ],
)

/**
 * Eén boete voor één speler. Hij onthoudt zijn eigen omschrijving en bedrag,
 * zodat een vaste boete die later duurder wordt hem niet verandert. Intrekken
 * en betalen zetten een tijdstip; een rij wordt nooit gewist.
 */
export const boetes = pgTable(
  'boete',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    spelerId: uuid('speler_id')
      .notNull()
      .references(() => spelers.id, { onDelete: 'cascade' }),
    omschrijving: text('omschrijving').notNull(),
    /** Het bedrag van de hele boete, dus al keer het aantal. */
    bedragCent: integer('bedrag_cent').notNull(),
    /** Hoe vaak, bij een vaste boete per stuk. Alleen voor de weergave: "20×". */
    aantal: integer('aantal').notNull().default(1),
    /** De dag waar de boete over gaat; die bepaalt het seizoen. */
    datum: date('datum').notNull(),
    eventId: uuid('event_id').references(() => events.id, { onDelete: 'set null' }),
    soortId: uuid('soort_id').references(() => boetesoorten.id, { onDelete: 'set null' }),
    aanleiding: text('aanleiding', { enum: ['te_laat_afgemeld'] }),
    /** 'gevallen' is een voorstel dat iemand liet vallen: het telt niet en komt niet terug. */
    status: text('status', { enum: ['telt', 'gevallen'] })
      .notNull()
      .default('telt'),
    gegevenOp: timestamp('gegeven_op', { withTimezone: true }).notNull().defaultNow(),
    gegevenDoor: uuid('gegeven_door').references(() => spelers.id, { onDelete: 'set null' }),
    ingetrokkenOp: timestamp('ingetrokken_op', { withTimezone: true }),
    ingetrokkenDoor: uuid('ingetrokken_door').references(() => spelers.id, {
      onDelete: 'set null',
    }),
    betaaldOp: timestamp('betaald_op', { withTimezone: true }),
    betaaldDoor: uuid('betaald_door').references(() => spelers.id, { onDelete: 'set null' }),
  },
  (tabel) => [
    check('boete_omschrijving_gevuld', sql`length(btrim(${tabel.omschrijving})) > 0`),
    check('boete_bedrag_positief', sql`${tabel.bedragCent} > 0`),
    check('boete_aantal_positief', sql`${tabel.aantal} > 0`),
    // Hooguit één boete voor te laat afmelden per speler per event, telt of
    // gevallen. Een ingetrokken boete telt niet mee: daarna mag er een nieuwe.
    uniqueIndex('boete_te_laat_idx')
      .on(tabel.eventId, tabel.spelerId)
      .where(sql`${tabel.aanleiding} = 'te_laat_afgemeld' and ${tabel.ingetrokkenOp} is null`),
    index('boete_speler_idx').on(tabel.spelerId),
    index('boete_datum_idx').on(tabel.datum),
  ],
)
