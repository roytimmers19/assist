# Assist

Handigheidjes voor een voetbalteam: aanwezigheid, opstelling en dienstrooster
op één plek.

**Voor spelers** — in één blik zien wanneer je moet spelen, trainen of dienst
hebt, en of je jezelf al hebt aangemeld.

**Voor leiders** — datzelfde overzicht, plus een opstelling maken met de
spelers die er die dag zijn.

Vandaag draait er één ploeg op: een zondagteam van ongeveer achttien man. Dat
is de maat waarop we ontwerpen — geen platform voor duizend clubs. Maar het
blijft niet bij dit team, dus: **de ploeg hoort in de database, niet in de
code.** Een teamnaam, een speler of een rooster die je hardgecodeerd tegenkomt
is een bug. Vandaag staat de teamnaam nog op zes bekende plekken hardgecodeerd;
dat loshalen is werk voor later, geen aanleiding om het er terloops bij te
doen.

De app groeit als een verzameling losse handigheidjes, niet als één groot
systeem. Aanwezigheid, opstelling en dienstrooster staan er; een boetepot komt
erbij. Een nieuwe module hoort te werken zonder dat de rest verbouwd wordt.

## Deze repository wordt openbaar

De echte ploeg staat in `scripts/seizoen.json`, genegeerd door Git — en een
naam daaruit hoort nergens anders, ook niet als voorbeeld. **Fixtures, tests
en voorbeeldbestanden krijgen verzonnen namen**, zoals `aap`, `noot`, `mies`
en `wim`.

## Waar we op leunen als iets niet vastligt

- **De app rekent, de mens beslist.** Waar de app iets kan uitrekenen dat over
  mensen gaat, laat hij de keuze aan wie verantwoordelijk is.
- **Bouw filters, geen sloten.** Een uitsluiting die iemand een keuze ontneemt
  is bijna altijd verkeerd. Laat zien wat er speelt; kiezen doet hij zelf.
- **Nederlands** — namen, commentaar, schermteksten, commitberichten, tests.

## Toolchain

| Wat          | Commando                                                     |
| ------------ | ------------------------------------------------------------ |
| Tests        | `npm test` — `npm run test:domein` heeft geen database nodig |
| Typecontrole | `npx tsc --noEmit`                                           |
| Dode code    | `npm run dood`                                               |
| Migratie     | `npm run db:migrate`                                         |

## Werkwijze

Eén issue, één PR, één commit op `master`. De PR begint als concept met alleen
het ontwerp; pas na akkoord komt er code in. Verandert gedrag, dan verandert
`specs/<domein>/spec.md` mee in dezelfde PR. Heeft het domein nog geen spec,
dan schrijf je die in diezelfde conceptfase, vóór de code, en de eigenaar
keurt hem daar goed.

## Vraag eerst

- Vóór een migratie tegen de productiedatabase
- Zodra de spec iets niet dekt en je zou moeten gokken
