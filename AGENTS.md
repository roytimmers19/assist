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

Eén issue, één PR. Elk issue loopt langs vier poorten, en bij elke poort
beslist de eigenaar. Wat ertussen gebeurt doet een agent: een eigen baan als
die er al is, anders een agent in een sessie met de eigenaar.

| Stap      | Wie                 | Wat er gebeurt                                                             | Poort: de eigenaar                             |
| --------- | ------------------- | -------------------------------------------------------------------------- | ---------------------------------------------- |
| Verfijnen | agent in een sessie | Werking en uitstraling onder de kop _Verfijning_ in het issue              | label `oppakken`, of sluiten als _not planned_ |
| Ontwerpen | agent in een sessie | Concept-PR naar `staging`: de spec in de diff, het bouwplan in de PR-tekst | label `bouwen` op de PR                        |
| Bouwen    | agent in een sessie | Tests en code volgens het bouwplan; `Poorten` controleert                  | squash naar `staging`                          |
| Uitrollen | agent in een sessie | Wat het op `staging` uithoudt, in één PR van `staging` naar `master`       | merge-commit naar `master`                     |

Met het label `criticus` leest de criticus een PR mee, in welke stap ook. Zijn
oordeel adviseert; tegenhouden doet alleen `Poorten`.

Verandert gedrag, dan verandert `specs/<domein>/spec.md` mee in dezelfde PR.
Heeft het domein nog geen spec, dan schrijft de ontwerpstap hem, vóór de code.
Ook een bugfix begint met een ontwerp zodra hij iets nieuws vastlegt: een
gedeelde functie of een kernregel.

In de repository staat wat blijft gelden: `AGENTS.md`, de specs, en de
instructies van de agents in `.github/agenten/`. Een bouwplan staat in de
PR-tekst, een verslag nergens. Wat in de repository staat wordt gelezen als
geldende afspraak, en een afgesloten plan is dat niet.

`staging` is de testomgeving op <https://teamassist-staging.vercel.app>, tegen
een kopie van de productiedatabase — wat daar staat is dus nog niet van het
team. `master` is <https://teamassist.vercel.app>: de app die de ploeg
openslaat. Een issue gaat pas dicht als zijn werk op `master` staat. Een
werk-PR schrijft `Sluit #N`: dat legt de herkomst vast, maar sluit niets. De
uitrol-PR noemt `Closes #N` voor elk issue dat meegaat, en dan sluit GitHub het
bij de merge naar `master`.

## Vraag eerst

- Vóór een migratie tegen de productiedatabase
- Zodra de spec iets niet dekt en je zou moeten gokken
