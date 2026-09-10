# Assist

Aanwezigheid, wedstrijdschema en straks de boetes van **SV Voorbeeld 2 (zondag)**, op één plek.

Het wedstrijdschema komt automatisch binnen uit de agendafeed van voetbal.nl, spelers
melden zichzelf af, en de leider ziet in één blik wie er komt.

- Afspraken voor agents: [`AGENTS.md`](AGENTS.md)
- Specs per domein: [`specs/`](specs/)

## Aan de slag

```bash
npm install
cp .env.example .env.local          # en vul in wat hieronder staat
docker compose -f docker-compose.test.yml up -d
npm run db:migrate
npm run dev
```

### Skills voor agents

De skills van Better Auth en Neon staan niet in deze repository — het zijn
bestanden van derden en ze zijn op te halen. Het recept staat in
`skills-lock.json`:

```bash
npx skills experimental_install
```

Dat vult `.agents/skills/`. Claude Code leest `.claude/skills/`, dus daar horen
verwijzingen naartoe te staan; op Windows maak je die met
`mklink /J`. Let op: dit commando haalt de _huidige_ versie van elke skill op,
niet de versie waarvan de hash in `skills-lock.json` staat.

## Commando's

| Commando                               | Wat het doet                                                      |
| -------------------------------------- | ----------------------------------------------------------------- |
| `npm run dev`                          | Ontwikkelserver op `http://localhost:3000`                        |
| `npm run build`                        | Productiebuild, inclusief typecontrole                            |
| `npm test`                             | Alle tests                                                        |
| `npm run test:domein`                  | Alleen de pure laag — **geen database nodig**                     |
| `npm run test:db`                      | Databasetests — vereist de Postgres uit `docker-compose.test.yml` |
| `npm run db:generate`                  | Migratie genereren uit `lib/db/schema.ts`                         |
| `npm run db:migrate`                   | Migraties draaien tegen `DATABASE_URL`                            |
| `npm run seed -- "Naam" mail@adres.nl` | Instellingen en de eerste leider aanmaken                         |

## Lokaal rondklikken

De lokale databases heten nog `kleedkamer_test` en `kleedkamer_dev`. Die namen
staan los van de app en hernoemen kost een container opnieuw opzetten; ze
blijven dus zoals ze zijn.

De testdatabase en de database waar je zelf in rondkijkt moeten **niet dezelfde
zijn**. `npm test` maakt tabellen leeg, dus je zit halverwege zonder ploeg en
zonder inlog. Gebruik een tweede database in dezelfde container:

```bash
docker compose -f docker-compose.test.yml up -d
docker compose -f docker-compose.test.yml exec postgres psql -U kleedkamer -d postgres -c "create database kleedkamer_dev owner kleedkamer;"

export DEV_URL="postgres://kleedkamer:kleedkamer@localhost:54329/kleedkamer_dev"
npx tsx scripts/migreer.ts "$DEV_URL"
DATABASE_URL="$DEV_URL" npx tsx scripts/seed.ts "Jouw Naam" jij@lokaal.test
DATABASE_URL="$DEV_URL" npx tsx scripts/proef-import.ts   # het echte seizoen
DATABASE_URL="$DEV_URL" npm run dev
```

De deelplaat van de opstelling zit achter een leidersinlog en is dus niet even
op te vragen. Teken hem los met vaste voorbeeldgegevens:

```bash
npx tsx scripts/proef-plaat.tsx plaat.png 4-4-2
```

Het seedscript drukt een uitnodigingslink af; open die, maak een account aan en
je staat als leider binnen. `DATABASE_URL` op de opdrachtregel wint van
`.env.local`, dus productie blijft buiten schot.

## Omgevingsvariabelen

Staan in `.env.local` (lokaal) en in de projectinstellingen van Vercel (productie).
Nooit in de repository.

| Variabele                                   | Waar hij vandaan komt                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `DATABASE_URL`                              | De **gepoolde** verbindingsreeks van Neon. Komt uit `neon link` of `neon env pull`.                                |
| `DATABASE_URL_UNPOOLED`                     | Dezelfde database, maar **direct** (hostnaam zonder `-pooler`). Alleen voor migraties. Komt uit dezelfde opdracht. |
| `NEON_BRANCH`                               | De Neon-branch waaraan de werkmap gekoppeld is. Wordt door `neon link` gezet.                                      |
| `DATABASE_URL_TEST`                         | De lokale testdatabase. Standaardwaarde staat al in `.env.example`.                                                |
| `BETTER_AUTH_SECRET`                        | Zelf genereren: `openssl rand -base64 32`.                                                                         |
| `BETTER_AUTH_URL`                           | De basis-URL van de app, bijvoorbeeld `https://assist.example.nl`.                                                 |
| `NEXT_PUBLIC_BASIS_URL`                     | Dezelfde URL, maar dan zichtbaar in de browser.                                                                    |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud Console, OAuth-client. Omleidings-URI: `<basis-url>/api/auth/callback/google`.                        |
| `RESEND_API_KEY`                            | Resend-dashboard. Zonder deze sleutel worden mails lokaal alleen naar de console geschreven.                       |
| `MAIL_AFZENDER`                             | Het afzenderadres op je eigen domein, bijvoorbeeld `Assist <geen-antwoord@assist.example.nl>`.                     |
| `CRON_SECRET`                               | Zelf genereren: `openssl rand -base64 32`. Vercel stuurt hem mee bij de nachtelijke import.                        |

De ICS-URL staat bewust **niet** hier maar in de tabel `team_instelling`, zodat je hem
kunt aanpassen zonder opnieuw uit te rollen.

## Hoe het in elkaar zit

```text
lib/domein/    puur — geen database, geen netwerk, geen Next.js
lib/db/        de enige laag die de database aanraakt (Drizzle)
lib/auth/      Better Auth voor identiteit, plus rechten in eigen code
lib/import/    de feed ophalen en de import uitvoeren
app/           drie schermen plus de cron-endpoint
```

**De harde regel:** niets in `lib/domein` importeert uit `lib/db`, `lib/auth`, `next`
of een databasebibliotheek. Al het risico van dit project zit in die map — het parsen
van de feed, het koppelen van verzette events, de deadlineberekening — en die is
daardoor volledig te testen zonder dat er een database draait. Er staat een test in
`tests/domein/purity.test.ts` die faalt zodra iemand die regel breekt.

## Neon

De database draait op Neon, project `twilight-fire-12940474`, regio
`aws-us-east-2`, Postgres 18. De werkmap is eraan gekoppeld met `neon link`;
de koppeling staat in `.neon` en blijft buiten Git.

```bash
npx neon@latest auth                 # eenmalig inloggen
npx neon@latest link --project-id twilight-fire-12940474 -y
npx neon@latest env pull             # variabelen verversen in .env.local
```

**Gepoold of direct — dit is de valkuil.** Neon geeft twee verbindingsreeksen voor
dezelfde database. De app gebruikt de **gepoolde** (`DATABASE_URL`, hostnaam met
`-pooler`). Migraties, dumps en replicatie moeten over de **directe**
(`DATABASE_URL_UNPOOLED`), want de pooler draait in transaction mode en kent geen
sessie-toestand. Gaat dat mis, dan krijg je een foutmelding die niets over pooling
zegt — een tabel die "niet bestaat", of een schrijfactie die opeens read-only is.
`scripts/migreer.ts` kiest daarom zelf de directe verbinding en weigert botweg als je
hem de gepoolde voert.

De testdatabase in Docker draait bewust dezelfde hoofdversie als Neon, zodat de tests
niet op een andere Postgres draaien dan productie.

**Welke Neon-diensten deze app gebruikt:** alleen Lakebase Postgres. Geen Neon Auth
(we draaien Better Auth zelf), geen object storage, geen functions, geen AI gateway.

## Twee dingen die je moet weten

**De agendafeed liegt over trainingen.** Wedstrijden dragen een echt Sportlink-nummer
dat een verzetting overleeft. Trainingen dragen een UID die uit hun aanvangstijd is
afgeleid, dus die verandert zodra de training verschuift. Daarom worden trainingen op
weeknummer gekoppeld in plaats van op UID. Zonder dat zou een verplaatste training als
lege nieuwe regel binnenkomen terwijl de oude alle afmeldingen vasthoudt.

**De import verwijdert nooit.** Een event dat uit de feed verdwijnt wordt hooguit op
_afgelast_ gezet, en alleen als het nog in de toekomst ligt. Er zit bovendien een
noodrem op: gaat de feed leeg of wil de import meer dan de helft van je toekomstige
events afgelasten, dan wordt de hele run afgebroken en gelogd zonder één wijziging.
Zo'n plan betekent nooit dat er een half seizoen is afgelast — het betekent dat de bron
plat lag.

## Als je dit overneemt

Er hoort altijd een tweede persoon met leidersrechten te zijn, zodat het team niet
stilvalt als er iemand een weekend overslaat. De importstatus staat onderaan het
weekoverzicht, en springt naar boven zodra de nachtelijke import ergens tegenaan
liep.
