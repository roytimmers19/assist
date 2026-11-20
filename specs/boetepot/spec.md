# Feature: boetepot

Deze spec beschrijft de boetepot: boetes geven en intrekken, de ranglijst, wat
iemand nog moet betalen en wat er in de pot zit. Ook de voorgestelde boete bij
te laat afmelden en de eenmalige overstap uit de oude boeteapp staan hier.

## Blueprint

### Waarom dit bestaat

Het team hield zijn boetes bij in een losse app. Die liet betalingen via zichzelf
lopen, hield daar een percentage van in en betaalde pas later uit. De ploeg wil
één app, en eenvoud gaat boven alles. Daarom houdt Assist de stand bij, maar
raakt het geld zelf niet aan: een speler maakt over naar de teamrekening, en de
penningmeester boekt wat er binnenkwam.

Het leukste stuk is de ranglijst: wie dit seizoen het meest in de pot heeft
gestopt. Daarnaast weet Assist al wie zich te laat afmeldt, dus die boete hoeft
niemand meer zelf bij te houden. De app stelt hem voor; een mens beslist.

### Bouw

- **Bestanden:**
  - `lib/domein/boetepot.ts` (puur): seizoen, ranglijst, openstaand bedrag,
    stand van de pot en nieuwe boetes voor het beginscherm
  - `lib/weergave/geld.ts`: een bedrag lezen uit een formulier en tonen in
    euro's
  - `lib/domein/voorstellen.ts` (puur): welke late afmeldingen een voorstel
    opleveren
  - `lib/domein/overstap.ts` (puur): het overzicht uit de oude app omzetten in
    rijen
  - `lib/domein/rechten.ts`: `magBoetesGeven` en `magPotBeheren`, naast
    `magLeiden`
  - `lib/db/boetepot.ts`: leest en schrijft boetes, boekingen en de boetelijst
  - `app/acties/boetepot.ts`: de serveracties
  - `app/boetepot/page.tsx`, `app/boetepot/beheer/page.tsx`: de schermen
  - `scripts/boetepot-overstap.ts`: de eenmalige overstap
- **Hangt af van:** spelers en hun rechten (`specs/toegang/spec.md`), de
  meldingen en de afmeldgrens (`specs/aanwezigheid/spec.md`), events uit de
  agendafeed, en `team_instelling` voor het rekeningnummer
- **Wordt gebruikt door:** het beginscherm (een nieuwe boete), het
  spelersoverzicht (de twee vinkjes)
- **Grenzen:**
  - Bedragen zijn hele centen, altijd groter dan nul. Een euroteken en een
    komma zijn er alleen in het scherm.
  - Datums en het seizoen rekenen in `Europe/Amsterdam`. Een seizoen begint op
    1 juli. Een boete hoort bij het seizoen van zijn datum.
  - Er gaat geen geld door Assist. Er is geen betaalkoppeling en geen
    betaallink; het scherm toont alleen het rekeningnummer en de naam.
  - Een boete, betaling, uitgave of beginbedrag wordt **ingetrokken**, nooit
    gewist of gewijzigd. Intrekken zet een tijdstip en wie het deed; de rij
    blijft staan en telt nergens meer mee.
  - Een boete onthoudt zijn eigen omschrijving en bedrag. Verandert een soort
    in de boetelijst later van bedrag, dan blijven bestaande boetes wat ze
    waren.
  - Een soort uit de boetelijst verdwijnt niet maar wordt uitgezet, zodat oude
    boetes er nog naar kunnen wijzen.
  - Een voorstel bestaat niet als rij. Het volgt uit de meldingen, de
    afmeldgrens en de boetelijst, op het moment dat iemand kijkt. Bevestigen
    maakt er een boete van; laten vallen legt vast dat het voorstel niet meer
    terugkomt. Daardoor vervalt een voorstel vanzelf als de speler zich weer
    aanmeldt, en hoeft de aanwezigheid niets van de boetepot te weten.
  - De afmeldgrens komt uit `afmeldGrens` in `lib/domein/telaat.ts`, dezelfde
    functie die het stempel "te laat" zet. Verandert die regel, dan verandert
    het voorstel mee.
  - Het rekeningnummer en de naam staan in `team_instelling`. De ploeg hoort in
    de database, niet in de code.
  - Wie mag wat beslissen `magBoetesGeven` en `magPotBeheren` in
    `lib/domein/rechten.ts`. Een pagina of actie vraagt het de sessie en kijkt
    zelf niet naar de vinkjes.
  - Het overzicht uit de oude app bevat echte namen. Het staat in
    `scripts/boetepot-overstap.json`, dat Git negeert, en nergens anders.

## Contract

### Wanneer is het af

- [ ] Een tab **Boetepot** staat voor iedereen in de ploeg in de balk.
      Bovenaan staat de ranglijst van dit seizoen: één regel per speler met
      zijn naam en het totaalbedrag aan boetes, het hoogste bovenaan, en de
      top drie uitgelicht. Er staat geen aantal bij.
- [ ] Onder de ranglijst staan wat er in de pot zit, je eigen openstaande
      bedrag met het rekeningnummer en de naam, en alle boetes van dit
      seizoen: wie, waarvoor, hoeveel en wanneer. Ingetrokken boetes staan
      doorgestreept. Een vorig seizoen is op te vragen.
- [ ] Wie boetes mag geven, geeft in één formulier een boete aan een of meer
      spelers: met een soort uit de boetelijst, of met een eigen omschrijving en
      bedrag, en eventueel bij een training of wedstrijd.
- [ ] Voorgestelde boetes voor te laat afmelden staan apart, met "Bevestigen" en
      "Laten vallen".
- [ ] Wie de pot beheert boekt op `/boetepot/beheer` een betaling (het
      openstaande bedrag staat al ingevuld), een uitgave, het beginbedrag, en
      trekt een boeking in. Daar staan ook de boetelijst en het rekeningnummer,
      en per speler wat hij nog open heeft.
- [ ] In het spelersoverzicht zet een leider per speler de vinkjes
      "Penningmeester" en "Boete-uitdeler".
- [ ] Een nieuwe boete staat zeven dagen op het beginscherm van wie hem kreeg.
- [ ] `scripts/boetepot-overstap.ts` zet het overzicht uit de oude app in één
      keer over. Daarna komen de ranglijst en de pot overeen met die in de oude
      app.

### Wat nooit mag breken

- **Wie mag wat.**
  - Boetes geven, intrekken, en voorstellen bevestigen of laten vallen: een
    leider, de beheerder, een penningmeester of een boete-uitdeler.
  - Betalingen, uitgaven en het beginbedrag boeken en intrekken, de boetelijst
    beheren en het rekeningnummer zetten: een leider, de beheerder of een
    penningmeester.
  - Een gewone speler kan geen van beide, ook niet met een verzoek dat hij met
    de hand stuurt.
- Wat iemand nog moet betalen is de som van zijn boetes die meetellen, min de
  som van zijn betalingen, over alle seizoenen. Valt dat onder nul, dan heeft
  hij een tegoed.
- De pot is de som van alle betalingen en beginbedragen, min de som van alle
  uitgaven.
- Een ingetrokken boeking of boete en een voorstel dat niemand bevestigde,
  tellen nergens mee: niet in de ranglijst, niet in het openstaande bedrag en
  niet in de pot.
- Een speler ziet wat anderen aan boetes kregen, maar niet wat zij nog open
  hebben of betaalden. Alleen wie de pot beheert ziet dat.
- Een speler vinkt nooit zelf een betaling af.
- Voor dezelfde speler bij hetzelfde event bestaat hooguit één boete voor te
  laat afmelden. Een voorstel dat bevestigd is of is gevallen, komt niet terug.
- Een voorstel volgt alleen uit een afmelding door de speler zelf. Een
  afmelding door een leider en een standaard "nee" leveren nooit een voorstel
  op.
- Een voorstel gaat alleen over afmeldingen ná het moment dat de soort voor te
  laat afmelden aan dat soort event werd gekoppeld. De boetepot werkt nooit
  met terugwerkende kracht.
- De overstap schrijft alles of niets. Hij draait niet als er al boetes in de
  database staan.

### Scenario's

```gherkin
Scenario: de ranglijst toont het totaalbedrag per speler, het hoogste bovenaan
  Gegeven dat aap €30, noot €20 en mies €10 aan boetes heeft dit seizoen
  Als iemand de tab Boetepot opent
  Dan staat bovenaan: aap €30, noot €20, mies €10
  En zijn die drie uitgelicht
  En staat er bij niemand een aantal
```

Bewezen door: `tests/domein/boetepot.test.ts`

```gherkin
Scenario: wie dit seizoen geen boete heeft staat niet op de ranglijst
  Gegeven dat wim dit seizoen geen boete heeft
  Als de ranglijst wordt getoond
  Dan staat wim er niet op
```

Bewezen door: `tests/domein/boetepot.test.ts`

```gherkin
Scenario: bij een gelijk bedrag delen spelers een plek
  Gegeven dat aap en noot allebei €20 hebben en mies €10
  Als de ranglijst wordt getoond
  Dan staan aap en noot allebei op plek 1, op naam gesorteerd
  En staat mies op plek 3
  En zijn alle drie uitgelicht
```

Bewezen door: `tests/domein/boetepot.test.ts`

```gherkin
Scenario: ingetrokken en voorgestelde boetes tellen niet mee
  Gegeven dat aap een ingetrokken boete van €10 heeft
  En een voorgestelde boete van €5 die nog niemand bevestigde
  Als de ranglijst, zijn openstaande bedrag en de pot worden bepaald
  Dan telt geen van beide mee
```

Bewezen door: `tests/domein/boetepot.test.ts`

```gherkin
Scenario: het seizoen begint op 1 juli
  Gegeven een boete voor aap op 30 juni en een op 1 juli
  Als de ranglijst van het seizoen dat op 1 juli begint wordt getoond
  Dan telt alleen die van 1 juli
  Maar blijven beide meetellen in wat aap nog moet betalen
```

Bewezen door: `tests/domein/boetepot.test.ts`

```gherkin
Scenario: een boete-uitdeler geeft twee spelers tegelijk een boete uit de lijst
  Gegeven dat mies boete-uitdeler is
  En de boetelijst een soort "te laat op training" van €2 heeft
  Als mies aap en noot kiest en die soort
  Dan hebben aap en noot allebei een boete "te laat op training" van €2
```

Bewezen door: `tests/db/boetepot.test.ts`

```gherkin
Scenario: een eigen boete zonder soort
  Gegeven dat mies boetes mag geven
  Als zij voor wim "bal over het hek" en €1,50 typt, zonder soort
  Dan heeft wim een boete "bal over het hek" van €1,50
```

Bewezen door: `tests/db/boetepot.test.ts`

```gherkin
Scenario: een soort die duurder wordt verandert geen oude boetes
  Gegeven dat aap een boete van €2 kreeg met de soort "te laat op training"
  Als die soort €3 gaat kosten
  Dan blijft aaps boete €2
```

Bewezen door: `tests/db/boetepot.test.ts`

```gherkin
Scenario: een boete intrekken
  Gegeven een boete van €10 voor aap
  Als een boete-uitdeler hem intrekt
  Dan staat hij doorgestreept in het overzicht
  En tellen de ranglijst, aaps openstaande bedrag en de pot hem niet meer mee
```

Bewezen door: `tests/db/boetepot.test.ts`

```gherkin
Scenario: de penningmeester boekt een betaling
  Gegeven dat aap €12 open heeft
  Als de penningmeester bij aap "betaald" kiest
  Dan staat het bedrag al op €12
  En heeft aap daarna niets meer open
  En is de pot €12 gestegen
```

Bewezen door: `tests/domein/boetepot.test.ts`, `tests/db/boetepot.test.ts`

```gherkin
Scenario: een deel betalen
  Gegeven dat noot €20 open heeft
  Als de penningmeester boekt dat noot €8 betaalde
  Dan heeft noot nog €12 open
```

Bewezen door: `tests/domein/boetepot.test.ts`

```gherkin
Scenario: te veel betalen wordt een tegoed
  Gegeven dat noot €5 open heeft
  Als de penningmeester boekt dat noot €10 betaalde
  Dan heeft noot €5 tegoed
```

Bewezen door: `tests/domein/boetepot.test.ts`

```gherkin
Scenario: een uitgave en het beginbedrag
  Gegeven een beginbedrag van €50 en betalingen van €30
  Als de penningmeester een uitgave van €20 boekt met omschrijving "BBQ"
  Dan staat de pot op €60
```

Bewezen door: `tests/domein/boetepot.test.ts`

```gherkin
Scenario: een verkeerde betaling wordt ingetrokken
  Gegeven een betaling van aap van €12
  Als de penningmeester die intrekt
  Dan heeft aap weer €12 meer open
  En is de pot €12 gezakt
```

Bewezen door: `tests/db/boetepot.test.ts`

```gherkin
Scenario: een speler ziet zijn eigen bedrag, maar niet dat van een ander
  Gegeven dat aap €12 open heeft en noot €4
  Als aap de tab Boetepot opent
  Dan ziet hij €12, het rekeningnummer en de naam
  Maar ziet hij nergens noots €4
  En is er geen knop om zelf iets af te vinken
```

Bewezen door: met de hand nalopen; zie het bouwplan

```gherkin
Scenario: te laat afmelden levert een voorstel op
  Gegeven dat de soort "te laat afgemeld" aan wedstrijden is gekoppeld
  Als aap zich woensdag zelf afmeldt voor een zondagwedstrijd
  Dan staat er een voorgestelde boete voor aap klaar met het bedrag van die soort
  En telt die nog nergens mee
```

Bewezen door: `tests/domein/voorstellen.test.ts`

```gherkin
Scenario: op tijd afmelden en later de reden aanpassen is geen voorstel
  Gegeven dat aap zich maandag afmeldt voor een zondagwedstrijd
  Als hij zich woensdag opnieuw afmeldt met een andere reden
  Dan staat er geen voorstel voor aap
```

Bewezen door: `tests/domein/voorstellen.test.ts`

```gherkin
Scenario: weer aanmelden laat het voorstel vervallen
  Gegeven een voorstel voor aap om een late afmelding
  Als aap zich weer aanmeldt voor dat event
  Dan is het voorstel weg
```

Bewezen door: `tests/domein/voorstellen.test.ts`

```gherkin
Scenario: een afmelding door een leider geeft geen voorstel
  Gegeven dat mies, een leider, noot na de afmeldgrens op nee zet
  Als de voorstellen worden bepaald
  Dan staat er geen voorstel voor noot
```

Bewezen door: `tests/domein/voorstellen.test.ts`

```gherkin
Scenario: zonder gekoppelde soort geen voorstel
  Gegeven dat er geen soort aan trainingen is gekoppeld
  Als noot zich te laat afmeldt voor een training
  Dan komt er geen voorstel
```

Bewezen door: `tests/domein/voorstellen.test.ts`

```gherkin
Scenario: geen voorstellen met terugwerkende kracht
  Gegeven dat wim zich te laat afmeldde vóór de soort aan wedstrijden werd gekoppeld
  Als de voorstellen worden bepaald
  Dan staat er geen voorstel voor wim
```

Bewezen door: `tests/domein/voorstellen.test.ts`

```gherkin
Scenario: een afgelast event geeft geen voorstel
  Gegeven dat aap zich te laat afmeldde voor een wedstrijd die daarna werd afgelast
  Als de voorstellen worden bepaald
  Dan staat er geen voorstel voor aap
```

Bewezen door: `tests/domein/voorstellen.test.ts`

```gherkin
Scenario: bevestigen maakt er een boete van
  Gegeven een voorstel voor aap
  Als een boete-uitdeler het bevestigt
  Dan heeft aap een boete die meetelt, gedateerd op de dag van zijn afmelding
  En komt het voorstel niet terug
```

Bewezen door: `tests/db/boetepot.test.ts`

```gherkin
Scenario: laten vallen is voorgoed
  Gegeven een voorstel voor aap
  Als een leider het laat vallen
  Dan telt het nergens mee
  En komt het niet terug, ook niet als aap zich daarna nog eens afmeldt
```

Bewezen door: `tests/db/boetepot.test.ts`

```gherkin
Scenario: wie mag wat
  Gegeven mies als leider, aap als boete-uitdeler, noot als penningmeester en wim als gewone speler
  Dan mag mies boetes geven en de pot beheren
  En mag aap boetes geven, maar de pot niet beheren
  En mag noot boetes geven en de pot beheren
  En mag wim geen van beide
```

Bewezen door: `tests/domein/rechten.test.ts`

```gherkin
Scenario: een nieuwe boete staat een week op het beginscherm
  Gegeven dat noot gisteren een boete kreeg
  Als noot zijn beginscherm opent
  Dan ziet hij die boete
  Maar acht dagen nadat hij hem kreeg niet meer
  En een ingetrokken boete ziet hij niet
```

Bewezen door: `tests/domein/boetepot.test.ts`

```gherkin
Scenario: de overstap uit de oude app
  Gegeven het overzicht uit de oude app met boetes, betalingen, uitgaven en de stand van de pot
  Als de overstap draait
  Dan staan alle boetes erin met wie, waarvoor, bedrag en datum
  En komt de ranglijst overeen met die in de oude app
  En komt de pot uit op de stand uit het overzicht
```

Bewezen door: `tests/domein/overstap.test.ts`

```gherkin
Scenario: een onbekende naam stopt de overstap
  Gegeven een overzicht met een naam die bij geen speler hoort
  Als de overstap draait
  Dan schrijft hij niets
  En noemt hij de naam die hij niet kon plaatsen
```

Bewezen door: `tests/domein/overstap.test.ts`
