# Feature: boetepot

Deze spec beschrijft de boetepot: boetes geven en intrekken, de ranglijst, wat
er in de pot zit en wie al betaald heeft. Ook de voorgestelde boete bij te laat
afmelden en de eenmalige overstap uit de oude boeteapp staan hier.

## Blueprint

### Waarom dit bestaat

Het team hield zijn boetes bij in een losse app. De ploeg wil één app, en
eenvoud gaat boven alles. Assist houdt daarom alleen bij wie welke boete kreeg
en of hij al betaald heeft. Het geld zelf blijft buiten de app: de
penningmeester stuurt op een moment dat hem uitkomt een bericht rond, buiten
Assist om. Als het binnen is, vinkt hij af.

Het leukste stuk is de ranglijst: wie dit seizoen het meest in de pot heeft
gestopt. Daarnaast weet Assist al wie zich te laat afmeldt, dus die boete hoeft
niemand meer zelf bij te houden. De app stelt hem voor; een mens beslist.

### Bouw

- **Bestanden:**
  - `lib/domein/boetepot.ts` (puur): seizoen, ranglijst, pot, openstaand per
    speler en nieuwe boetes voor het beginscherm
  - `lib/domein/voorstellen.ts` (puur): welke late afmeldingen een voorstel
    opleveren
  - `lib/domein/overstap.ts` (puur): het overzicht uit de oude app omzetten in
    rijen
  - `lib/domein/rechten.ts`: `magBoetesGeven` en `magAfrekenen`, naast
    `magLeiden`
  - `lib/weergave/geld.ts`: een bedrag lezen uit een formulier en tonen in
    euro's
  - `lib/db/boetepot.ts`: leest en schrijft boetes en de boetelijst
  - `app/acties/boetepot.ts`: de serveracties
  - `app/boetepot/`: de schermen, elk op een eigen pagina
  - `scripts/boetepot-overstap.ts`: de eenmalige overstap
- **Hangt af van:** spelers en hun rechten (`specs/toegang/spec.md`), de
  meldingen, de standaard per soort event en de afmeldgrens
  (`specs/aanwezigheid/spec.md`), en events uit de agendafeed
- **Wordt gebruikt door:** het beginscherm (een nieuwe boete), het
  spelersoverzicht (de twee vinkjes)
- **Grenzen:**
  - Bedragen zijn hele centen, altijd groter dan nul. Een euroteken en een
    komma zijn er alleen in het scherm.
  - Datums en het seizoen rekenen in `Europe/Amsterdam`. Een seizoen begint op
    1 juli. Een boete hoort bij het seizoen van zijn datum.
  - Assist kent geen rekeningnummer, geen betaallink en geen saldo. Een boete
    is betaald of niet; dat is alles wat de app over geld weet.
  - Een boete wordt **ingetrokken**, nooit gewist. Intrekken zet een tijdstip
    en wie het deed; de rij blijft staan en telt nergens meer mee.
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
  - Wie mag wat beslissen `magBoetesGeven` en `magAfrekenen` in
    `lib/domein/rechten.ts`. Een pagina of actie vraagt het de sessie en kijkt
    zelf niet naar de vinkjes.
  - Elk scherm van de boetepot is een eigen pagina. Bovenaan staan de
    onderdelen waar je tussen wisselt; je ziet alleen de onderdelen die je mag
    gebruiken.
  - Het overzicht uit de oude app bevat echte namen. Het staat in
    `scripts/boetepot-overstap.json`, dat Git negeert, en nergens anders.

## Contract

### Wanneer is het af

- [ ] Een tab **Boetepot** staat voor iedereen in de ploeg in de balk. Hij
      opent op de **ranglijst**: bovenaan wat er dit seizoen in de pot zit,
      daaronder elke actieve speler met zijn totaalbedrag aan boetes van dit
      seizoen, het hoogste bovenaan, de top drie uitgelicht. Er staat geen
      aantal bij. Een vorig seizoen is op te vragen.
- [ ] Het onderdeel **Boetes** toont alle boetes van het seizoen: wie,
      waarvoor, hoeveel en wanneer. Ingetrokken boetes staan doorgestreept. Wie
      boetes mag geven ziet hier bovenaan de voorstellen, met "Bevestigen" en
      "Laten vallen", en een knop naar **Boete geven**.
- [ ] **Boete geven** is een eigen scherm: een of meer spelers, een soort uit de
      boetelijst of een eigen omschrijving met bedrag, en eventueel de training
      of wedstrijd waar hij bij hoort.
- [ ] Het onderdeel **Afrekenen** toont per speler wat hij nog open heeft. Met
      "Betaald" staan al zijn openstaande boetes op betaald; met "Ongedaan
      maken" draait de afrekenaar dat terug.
- [ ] Het onderdeel **Boetelijst** toont de soorten met hun bedrag, en welke
      soort hoort bij te laat afmelden voor een training en voor een wedstrijd.
- [ ] In het spelersoverzicht zet een leider per speler de vinkjes
      "Penningmeester" en "Boete-uitdeler".
- [ ] Een nieuwe boete staat zeven dagen op het beginscherm van wie hem kreeg.
- [ ] `scripts/boetepot-overstap.ts` zet het overzicht uit de oude app in één
      keer over. Daarna komen de ranglijst en wat er nog open staat overeen met
      de oude app.

### Wat nooit mag breken

- **Wie mag wat.**
  - Boetes geven, intrekken, en voorstellen bevestigen of laten vallen: een
    leider, de beheerder, een penningmeester of een boete-uitdeler.
  - Afvinken wat betaald is, dat terugdraaien en de boetelijst beheren: een
    leider, de beheerder of een penningmeester.
  - Een gewone speler kan geen van beide, ook niet met een verzoek dat hij met
    de hand stuurt.
- De pot van een seizoen is de som van de boetes van dat seizoen die
  meetellen, betaald of niet.
- Wat iemand nog open heeft is de som van zijn boetes die meetellen en niet
  betaald zijn, over alle seizoenen. Dat is nooit minder dan nul.
- Een ingetrokken boete en een voorstel dat niemand bevestigde, tellen nergens
  mee: niet in de ranglijst, niet in de pot en niet in wat iemand open heeft.
- Wat iemand open heeft ziet alleen wie mag afrekenen. Een speler ziet de
  ranglijst en de boetes, niet wie wat betaald heeft.
- Een speler vinkt nooit zelf een betaling af.
- "Betaald" raakt alleen de boetes die op dat moment openstaan. Een boete die
  daarna komt, staat gewoon open.
- **Een voorstel voor te laat afmelden** komt er alleen als alles hiervan
  waar is:
  - De speler stond op het moment van de afmeldgrens op "ja", door een melding
    of door zijn standaard.
  - Hij staat nu op "nee", en die "nee" begon met een afmelding die hij ná de
    grens zelf deed.
  - Die afmelding kwam ná het moment dat de soort voor te laat afmelden aan
    dat soort event werd gekoppeld.
  - Het event is niet afgelast.
- Stond een speler op het moment van de afmeldgrens al op "nee", dan levert
  niets wat hij daarna doet een voorstel op. Wie per ongeluk op "ik kom" tikt en
  zich daarna weer afmeldt, krijgt dus geen boete voorgesteld.
- Voor dezelfde speler bij hetzelfde event bestaat hooguit één boete voor te
  laat afmelden. Een voorstel dat bevestigd is of is gevallen, komt niet terug.
- De boetepot werkt nooit met terugwerkende kracht: een afmelding van vóór de
  koppeling levert geen voorstel op.
- De overstap schrijft alles of niets. Hij draait niet als er al boetes in de
  database staan.

### Scenario's

```gherkin
Scenario: de ranglijst toont elke speler met zijn totaalbedrag, het hoogste bovenaan
  Gegeven dat aap €30, noot €20 en mies €10 aan boetes heeft dit seizoen
  En wim geen boetes heeft
  Als iemand de tab Boetepot opent
  Dan staat er: aap €30, noot €20, mies €10, wim €0
  En zijn aap, noot en mies uitgelicht
  En staat er bij niemand een aantal
```

Bewezen door: `tests/domein/boetepot.test.ts`

```gherkin
Scenario: bij een gelijk bedrag delen spelers een plek
  Gegeven dat aap en noot allebei €20 hebben en mies €10
  Als de ranglijst wordt getoond
  Dan staan aap en noot allebei op plek 1, op naam gesorteerd
  En staat mies op plek 3
```

Bewezen door: `tests/domein/boetepot.test.ts`

```gherkin
Scenario: wie op €0 staat wordt niet uitgelicht
  Gegeven dat alleen aap dit seizoen een boete heeft
  Als de ranglijst wordt getoond
  Dan is alleen aap uitgelicht
```

Bewezen door: `tests/domein/boetepot.test.ts`

```gherkin
Scenario: de pot is alles wat dit seizoen aan boetes is gegeven
  Gegeven boetes van €30, €20 en €10 dit seizoen, waarvan €20 betaald
  En een ingetrokken boete van €5
  Als de pot wordt getoond
  Dan staat er €60
```

Bewezen door: `tests/domein/boetepot.test.ts`

```gherkin
Scenario: ingetrokken en voorgestelde boetes tellen niet mee
  Gegeven dat aap een ingetrokken boete van €10 heeft
  En een voorgestelde boete van €5 die nog niemand bevestigde
  Als de ranglijst, de pot en wat aap open heeft worden bepaald
  Dan telt geen van beide mee
```

Bewezen door: `tests/domein/boetepot.test.ts`

```gherkin
Scenario: het seizoen begint op 1 juli
  Gegeven een boete voor aap op 30 juni en een op 1 juli, geen van beide betaald
  Als de ranglijst van het seizoen dat op 1 juli begint wordt getoond
  Dan telt alleen die van 1 juli
  Maar staan ze allebei open bij het afrekenen
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
  Dan staat hij doorgestreept bij de boetes
  En tellen de ranglijst, de pot en wat aap open heeft hem niet meer mee
```

Bewezen door: `tests/db/boetepot.test.ts`

```gherkin
Scenario: de penningmeester vinkt af wat betaald is
  Gegeven dat aap twee boetes van samen €12 open heeft
  Als de penningmeester bij aap op "Betaald" tikt
  Dan heeft aap niets meer open
  En staat aap nog steeds met €12 op de ranglijst
  En blijft de pot gelijk
```

Bewezen door: `tests/db/boetepot.test.ts`

```gherkin
Scenario: een boete na het afvinken staat gewoon open
  Gegeven dat de penningmeester aap gisteren op "Betaald" zette
  Als aap vandaag een boete van €2 krijgt
  Dan heeft aap €2 open
```

Bewezen door: `tests/db/boetepot.test.ts`

```gherkin
Scenario: per ongeluk afgevinkt
  Gegeven dat de penningmeester noot op "Betaald" zette
  Als hij bij noot op "Ongedaan maken" tikt
  Dan staan de boetes die hij afvinkte weer open
```

Bewezen door: `tests/db/boetepot.test.ts`

```gherkin
Scenario: een speler ziet niet wie wat betaald heeft
  Gegeven dat aap €12 open heeft en noot alles betaald heeft
  Als wim, een gewone speler, de boetepot bekijkt
  Dan ziet hij de ranglijst en de boetes
  Maar ziet hij nergens wat aap of noot open heeft of betaalde
  En ziet hij het onderdeel Afrekenen niet
```

Bewezen door: met de hand nalopen; zie het bouwplan

```gherkin
Scenario: te laat afmelden levert een voorstel op
  Gegeven dat de soort "te laat afgemeld" aan wedstrijden is gekoppeld
  En aap op dinsdagavond voor een zondagwedstrijd op "ja" staat
  Als aap zich woensdag zelf afmeldt
  Dan staat er een voorgestelde boete voor aap klaar met het bedrag van die soort
  En telt die nog nergens mee
```

Bewezen door: `tests/domein/voorstellen.test.ts`

```gherkin
Scenario: wie standaard komt en te laat afmeldt krijgt ook een voorstel
  Gegeven dat aap zich nergens voor heeft gemeld en standaard voor wedstrijden komt
  Als aap zich woensdag afmeldt voor een zondagwedstrijd
  Dan staat er een voorstel voor aap
```

Bewezen door: `tests/domein/voorstellen.test.ts`

```gherkin
Scenario: per ongeluk op "ik kom" en weer afmelden is geen voorstel
  Gegeven dat aap zich maandag afmeldt voor een zondagwedstrijd
  Als hij woensdag per ongeluk op "ik kom" tikt
  En zich meteen daarna weer afmeldt
  Dan staat er geen voorstel voor aap
```

Bewezen door: `tests/domein/voorstellen.test.ts`

```gherkin
Scenario: op tijd afgemeld en later de reden aanpassen is geen voorstel
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
  Gegeven dat noot op dinsdagavond op "ja" staat
  Als mies, een leider, noot woensdag op nee zet
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
  En komt het voor dat event niet terug
```

Bewezen door: `tests/db/boetepot.test.ts`

```gherkin
Scenario: wie mag wat
  Gegeven mies als leider, aap als boete-uitdeler, noot als penningmeester en wim als gewone speler
  Dan mag mies boetes geven en afrekenen
  En mag aap boetes geven, maar niet afrekenen
  En mag noot boetes geven en afrekenen
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
  Gegeven het overzicht uit de oude app met de boetes van dit seizoen en welke betaald zijn
  Als de overstap draait
  Dan staan alle boetes erin met wie, waarvoor, bedrag en datum
  En komen de ranglijst en wat er nog open staat overeen met de oude app
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
