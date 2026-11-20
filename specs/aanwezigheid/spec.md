# Feature: aanwezigheid

Deze spec beschrijft de kern van het domein: hoe een melding de stand bepaalt,
wat een speler en een leider daarbij moeten invullen, en tot wanneer afmelden
op tijd is. Langdurige afwezigheid is een eigen domein.

## Blueprint

### Waarom dit bestaat

De leider wil per training en wedstrijd weten wie er komt, en de speler wil in
één tik kunnen zeggen dat hij niet kan. Wie niets zegt komt gewoon; alleen
afwijken kost moeite. Komt iemand niet, dan wil de leider weten waarom — dat
bepaalt of hij moet bellen, schuiven of niets hoeft te doen.

### Bouw

- **Bestanden:** `lib/domein/aanwezigheid.ts` (puur: de stand uit de
  meldingen), `lib/db/aanwezigheid.ts` (leest en schrijft meldingen),
  `app/acties/aanwezigheid.ts` (de speler meldt zichzelf),
  `app/acties/leider.ts` (de leider zet een ander)
- **Hangt af van:** events uit de agendafeed, spelers met hun standaard per
  soort event
- **Wordt gebruikt door:** het beginscherm (`MatchdayBlok`, `EventRegel`), het
  leiderscherm (`EventKolom`), de opstelling
- **Grenzen:**
  - Een melding is een rij in `aanwezigheid` met status, bron en een
    toelichting. De tabel groeit alleen; een rij wordt nooit gewijzigd.
  - Het speler-id van een eigen melding komt uit de sessie. Een speler kan
    daardoor per constructie alleen zichzelf melden.
  - De toelichting heet in het scherm _reden_. Verplicht is hij alleen bij
    afmelden door de speler zelf; dat dwingen de actie en het formulier af, niet
    de database.
  - Een melding onthoudt wie hem zette. Het leiderscherm toont "door jou gezet"
    aan wie het zelf deed, en anders de naam: "door Stijn gezet". Dat geldt ook
    als de beheerder hem zette; de eigenaar koos daarvoor. Is niet meer te
    achterhalen wie het was, dan staat er "door een leider gezet".
  - De afmeldgrens (`lib/domein/telaat.ts`) is voorlopig een vaste weekdag om
    23:59:59 in `Europe/Amsterdam`: de dinsdag vóór een wedstrijd en de
    woensdag vóór een training. Eén functie bepaalt hem voor alles wat hem
    toont of gebruikt: de tekst op het beginscherm, het app-bericht van de
    leider, het stempel "te laat" en de voorgestelde boete in de boetepot
    (`specs/boetepot/spec.md`). Of de `afmeld_deadline` per event, in uren uit
    `eventtype_instelling`, dit ooit overneemt, is een eigen besluit; de
    boetepot volgt gewoon wat deze functie zegt.
  - Te laat afmelden is een stempel, geen slot: afmelden blijft altijd kunnen.
  - Meldt een leider iemand na de afmeldgrens af of weer aan, dan vraagt het
    weekoverzicht eerst om bevestiging met ja of nee. Bij afmelden noemt de
    vraag het boetevoorstel alleen als dat er dan echt komt; bij weer aanmelden
    alleen als er een openstaat dat dan vervalt (`specs/boetepot/spec.md`).

## Contract

### Wanneer is het af

- [ ] Een speler kan zich niet afmelden zonder reden: het formulier op het
      beginscherm laat "Ik kan niet" pas toe met een ingevulde reden, en de
      serveractie weigert een reden die leeg is of alleen uit spaties bestaat.
- [ ] Een leider kan een speler op "nee" zetten zonder reden.

### Wat nooit mag breken

- De laatste melding per speler bepaalt de stand. Zonder melding geldt zijn
  standaard voor dat soort event, met bron _aanname_ — en die bron bestaat
  nooit als rij.
- Dezelfde melding twee keer achter elkaar levert één rij op, zodat dubbelklikken
  de historie niet vervuilt.
- Een afmelding van een speler draagt altijd een reden die meer is dan spaties.
  Oudere afmeldingen en afmeldingen door een leider mogen zonder.
- Aanmelden vraagt nooit om een reden.
- Een leider leest nooit "door jou gezet" bij een melding die iemand anders
  zette.
- De afmeldgrens valt altijd vóór de aanvang van het event. Valt de grensdag
  van dezelfde week erna, dan telt die van de week ervoor.
- De afmeldgrens is een wandkloktijd: dinsdag 23:59 blijft dinsdag 23:59 over
  een zomer-wintertijdovergang heen.

### Scenario's

```gherkin
Scenario: de laatste melding wint
  Gegeven een speler die zich afmeldt, aanmeldt en weer afmeldt
  Als de stand wordt bepaald
  Dan staat hij op nee
  En zijn alle drie meldingen bewaard
```

Bewezen door: `tests/domein/aanwezigheid.test.ts`,
`tests/db/aanwezigheid.test.ts`

```gherkin
Scenario: wie niets zegt volgt zijn standaard
  Gegeven een speler die voor wedstrijden standaard "nee" heeft
  En die zich nergens voor heeft gemeld
  Als de stand voor een wedstrijd wordt bepaald
  Dan staat hij op nee met bron aanname
```

Bewezen door: `tests/domein/aanwezigheid.test.ts`

```gherkin
Scenario: afmelden zonder reden
  Gegeven een speler die op de lijst staat
  Als hij "Ik kan niet" kiest zonder reden, of met alleen spaties
  Dan wordt er niets vastgelegd
  En hoort hij dat hij moet invullen waarom hij niet kan
```

Bewezen door: `tests/domein/formulier.test.ts`

```gherkin
Scenario: afmelden met reden
  Gegeven een speler die op de lijst staat
  Als hij "Ik kan niet" kiest met als reden "rug"
  Dan staat hij op nee
  En ziet de leider "rug" bij zijn naam
```

Bewezen door: `tests/db/aanwezigheid.test.ts`

```gherkin
Scenario: de leider zet iemand af zonder reden
  Gegeven een leider in het leiderscherm
  Als hij een speler op nee zet zonder iets in te vullen
  Dan staat die speler op nee met bron leider
```

Nog niet bewezen: de leideractie draait alleen met een sessie, en daar is geen
test voor.

```gherkin
Scenario: wie het zelf zette leest "door jou gezet"
  Gegeven dat mies, een leider, noot op nee zette
  Als mies het leiderscherm bekijkt
  Dan staat er bij noot "door jou gezet"
```

Bewezen door: `tests/domein/aanwezigheid.test.ts`

```gherkin
Scenario: een andere leider leest wie het zette
  Gegeven dat aap, een beheerder of een leider, noot op nee zette
  Als mies, een andere leider, het leiderscherm bekijkt
  Dan staat er bij noot "door aap gezet"
```

Bewezen door: `tests/domein/aanwezigheid.test.ts`

```gherkin
Scenario: voor een zondagwedstrijd afmelden kan tot en met dinsdag
  Gegeven een wedstrijd op zondag
  Als een speler zich dinsdagavond afmeldt
  Dan is hij op tijd
  Maar meldt hij zich woensdag af, dan staat er "te laat" bij zijn naam
```

Bewezen door: `tests/domein/telaat.test.ts`

```gherkin
Scenario: voor een donderdagtraining afmelden kan tot en met woensdag
  Gegeven een training op donderdag
  Als een speler zich woensdagavond afmeldt
  Dan is hij op tijd
  Maar meldt hij zich donderdag af, dan staat er "te laat" bij zijn naam
```

Bewezen door: `tests/domein/telaat.test.ts`
