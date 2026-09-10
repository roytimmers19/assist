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
