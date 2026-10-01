# Feature: aanwezigheid

Deze spec beschrijft de kern van het domein: hoe een melding de stand bepaalt,
en wat een speler en een leider daarbij moeten invullen. De afmeldtermijn en
het te laat afmelden (`lib/domein/telaat.ts`) worden beschreven zodra een issue
ze raakt. Langdurige afwezigheid is een eigen domein.

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
