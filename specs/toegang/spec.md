# Feature: toegang

## Blueprint

### Waarom dit bestaat

Binnenkomen bestaat hier uit twee vragen die los van elkaar staan: wie ben je,
en hoor je bij deze ploeg. De eerste beantwoordt Better Auth — met Google of
met een e-mailadres en een wachtwoord. De tweede beantwoordt een spelersrij,
die je krijgt via een uitnodiging van de leider of door je zelf aan te melden
met de teamcode.

Wie zijn wachtwoord kwijt is valt vandaag tussen die twee vragen in. Hij is
niemand meer voor de app, terwijl zijn spelersrij er gewoon staat. Het antwoord
mag nooit zijn dat iemand met de hand in de productiedatabase gaat.

Daarna volgt een derde vraag: wat mag je. Een speler ziet zijn eigen scherm, een
leider ook de leidersschermen. Daarnaast is er de **beheerder**: een speler die
alles kan wat een leider kan, maar in de ploeg gewoon als speler staat. Dat is
voor de eigenaar, die de app beheert en wil kunnen helpen zonder als extra
leider in de ploeg te staan. Het recht staat alleen in de database. De eigenaar
zet het daar met de hand aan of uit: bij een kwijt wachtwoord is dat precies
wat niet mag, maar hier is het de bedoeling.

### Bouw

- **Bestanden:** `lib/auth/auth.ts` (Better Auth-configuratie),
  `lib/auth/sessie.ts` (identiteit wordt rechten), `lib/domein/rechten.ts`
  (puur: wie op de leidersschermen mag), `lib/auth/uitnodiging.ts`
  (token maken, innemen, zelf aanmelden), `lib/auth/herstel.ts` (een
  herstellink laten maken en opvangen), `app/acties/toetreden.ts`,
  `app/acties/toegang.ts`, `app/_onderdelen/Toegang.tsx`, en de schermen
  `app/inloggen`, `app/aanmelden`, `app/uitnodiging/[token]`,
  `app/nieuw-wachtwoord` en `app/toegang-mislukt`
- **Hangt af van:** `lib/mail/verstuur.ts` voor `mailWerkt` en `verstuurMail`,
  `lib/db/spelers.ts` en `lib/db/instellingen.ts`
- **Wordt gebruikt door:** elke pagina en elke serveractie, via `vereisSpeler`
  en `vereisLeider`
- **Grenzen:**
  - De identiteit komt uit de sessie. Wat het verzoek zelf meestuurt is geen
    identiteit.
  - Een uitnodiging koppelt op de token. Wie met Google onder een ander adres
    binnenkomt hoort nog steeds bij de speler die is uitgenodigd.
  - Better Auth beheert wachtwoorden en hersteltokens. Deze code verzint er
    geen eigen naast.
  - Alles wat een speler leest staat er in het Nederlands, ook wat Better Auth
    zelf zou tonen.
  - Een herstellink werkt voor wie hem heeft. Met mail is dat de speler zelf;
    zonder mail is dat de leider, en daarmee kan hij als die speler binnenkomen.
    Dat is bewust betaald: de leider voegt spelers toe, keurt ze goed en maakt
    uitnodigingen, dus hij beheert die accounts toch al. Voor een beheerder
    geldt hetzelfde: hij heeft precies de rechten van een leider, dus wie zo
    binnenkomt krijgt er niets bij.
  - Op de leidersschermen mag wie de rol leider heeft, en wie het
    beheerdersrecht heeft. `magLeiden` beslist dat, en het is de enige plek.
    Een pagina of actie vraagt de sessie of iemand mag leiden. Naar de rol
    kijkt hij niet zelf.
  - De rol en het beheerdersrecht staan los van elkaar. Het vakje "Leider" en
    het label "leider" laten alleen de rol zien. Een leider kan het
    beheerdersrecht niet zien, geven of afnemen. Dat de andere leiders niet
    weten wie het heeft, is een bewuste keuze van de eigenaar.

## Contract

### Wanneer is het af

- [x] Een speler met een wachtwoordaccount kiest een nieuw wachtwoord zonder
      dat iemand de database opent: zijn leider zet een herstellink klaar en
      stuurt die door.
- [x] Op `/inloggen` staat "Wachtwoord vergeten?", en die wijst ook de weg
      wanneer er geen mail verstuurd kan worden.
- [x] Wie met Google binnenkomt op een adres dat hier een wachtwoordaccount
      heeft, leest in het Nederlands wat er aan de hand is en wat hij kan doen.
- [x] De herstelweg werkt zonder Resend. De mailweg staat er wel: zodra
      `RESEND_API_KEY` en `MAIL_AFZENDER` gezet zijn, verschijnt het formulier
      op `/wachtwoord-vergeten` en gaat dezelfde link per mail. De knop van de
      leider blijft dan bestaan voor wie zijn mail niet vindt.
- [x] Een speler met het beheerdersrecht en de rol speler komt op elk
      leidersscherm en kan daar alles wat een leider kan. Dat geldt ook voor
      de afbeelding van de opstelling.
- [x] In het spelersoverzicht staat een beheerder zonder label "leider" en
      met het vakje "Leider" uit.
- [x] Bewerkt en bewaart een leider de rij van een beheerder, dan blijft het
      beheerdersrecht staan, ook als de leider het vakje "Leider" aan of uit
      zet.

### Wat nooit mag breken

- Het aanvraagformulier antwoordt altijd hetzelfde, of het ingevulde adres hier
  nu bekend is of niet. Wie op het inlogscherm staat mag er niet achter kunnen
  komen wie er in de ploeg zit.
- Een herstellink hoort bij één account en verloopt. Dat is werk van Better
  Auth; er komt geen eigen tokenmechaniek omheen.
- Een Google-aanmelding koppelt niet stilzwijgend aan een bestaand
  wachtwoordaccount. `accountLinking` blijft dicht zolang er geen apart besluit
  over ligt, want anders komt wie een Google-account met adres X beheert binnen
  op het lokale account met adres X.
- De leider ziet een herstellink bij de spelers waar hij betekenis heeft: die
  met een wachtwoord. Bij een Google-account is er geen wachtwoord om te
  herstellen.
- Een herstel sluit elke lopende sessie van dat account af. Een overname via
  een herstellink is daarmee niet tegengehouden, maar wel te merken: de speler
  vliegt eruit en moet opnieuw inloggen.
- Wie de rol speler heeft en geen beheerdersrecht, komt niet op een
  leidersscherm en kan geen leidersactie doen.
- Geen scherm en geen serveractie kan het beheerdersrecht zetten of afnemen.
  Wie het heeft, staat nergens in de code of de repository: de eigenaar zet
  het met de hand in de database.
- Het beheerdersrecht hoort bij de spelersrij. Verdwijnt de speler, dan
  verdwijnt het recht mee.
- De databasetests draaien nooit tegen iets anders dan de testdatabase.
  `tests/db/opzet.ts` zet `DATABASE_URL` gelijk aan `DATABASE_URL_TEST` voordat
  Better Auth geladen wordt, want die pakt zijn verbinding uit de eerste.

### Scenario's

```gherkin
Scenario: De leider zet een herstellink klaar
  Gegeven dat aap hier een account met een wachtwoord heeft
  Als de leider bij hem om een herstellink vraagt
  Dan krijgt hij een link die hij kan kopiëren en doorsturen
  En gaat er niets de deur uit
```

Bewezen door: `tests/db/herstel.test.ts`

```gherkin
Scenario: Met die link kiest de speler een nieuw wachtwoord
  Gegeven een herstellink voor noot
  Als hij er een nieuw wachtwoord mee kiest
  Dan komt hij daarmee binnen
  En werkt zijn oude wachtwoord niet meer
```

Bewezen door: `tests/db/herstel.test.ts`

```gherkin
Scenario: Een adres dat hier niet bestaat levert geen link
  Als er om een herstellink wordt gevraagd voor mies, die hier geen account heeft
  Dan komt er geen link
```

Bewezen door: `tests/db/herstel.test.ts`

```gherkin
Scenario: Een herstel sluit de oude sessies af
  Gegeven dat wim ergens ingelogd is
  Als zijn wachtwoord via een herstellink wordt gezet
  Dan is die sessie afgesloten
  En moet hij opnieuw inloggen
```

Bewezen door: `tests/db/herstel.test.ts`

```gherkin
Scenario: Bij een Google-account valt er niets te herstellen
  Gegeven dat wim alleen met Google binnenkomt
  Als de leider zijn spelers bekijkt
  Dan telt wim niet mee als iemand met een wachtwoord
```

Bewezen door: `tests/db/herstel.test.ts`

```gherkin
Scenario: Twee aanvragen die door elkaar lopen raken elkaars link niet kwijt
  Gegeven dat twee leiders tegelijk om een herstellink vragen
  Als beide aanvragen door elkaar heen lopen
  Dan krijgt elke leider de link die bij zijn eigen speler hoort
```

Bewezen door: `tests/domein/herstel.test.ts`

```gherkin
Scenario: Een beheerder mag leiden
  Gegeven dat aap de rol speler heeft en het beheerdersrecht
  Als de app bepaalt of aap op de leidersschermen mag
  Dan mag hij dat
```

Bewezen door: `tests/domein/rechten.test.ts`

```gherkin
Scenario: Een speler zonder het recht blijft buiten
  Gegeven dat noot de rol speler heeft en geen beheerdersrecht
  Als de app bepaalt of noot op de leidersschermen mag
  Dan mag hij dat niet
```

Bewezen door: `tests/domein/rechten.test.ts`

```gherkin
Scenario: De sessie kent het beheerdersrecht
  Gegeven dat aap het beheerdersrecht heeft
  Als zijn spelersrij bij zijn account wordt opgezocht
  Dan staat het beheerdersrecht erbij
```

Bewezen door: `tests/db/sessie.test.ts`

```gherkin
Scenario: Een leider bewerkt de rij van een beheerder
  Gegeven dat aap het beheerdersrecht heeft
  Als mies, een leider, zijn rij bewerkt en het vakje "Leider" aan en weer uit
  zet
  Dan heeft aap daarna nog steeds het beheerdersrecht
```

Bewezen door: `tests/db/spelersbeheer.test.ts`

```gherkin
Scenario: Verdwijnt de speler, dan verdwijnt het recht mee
  Gegeven dat aap het beheerdersrecht heeft
  Als zijn spelersrij verdwijnt
  Dan heeft niemand dat recht meer via die rij
```

Bewezen door: `tests/db/spelersbeheer.test.ts`

De drie scenario's hieronder zijn schermen, en deze repository test geen
schermen. Ze zijn met de hand nagelopen op een lege lokale database; staat er
ooit wel een schermtest, dan horen ze daar thuis.

```gherkin
Scenario: Voor andere leiders is een beheerder een gewone speler
  Gegeven dat aap de rol speler heeft en het beheerdersrecht
  Als mies, een leider, het spelersoverzicht bekijkt
  Dan staat aap er zonder label "leider"
  En staat het vakje "Leider" bij aap uit
```

Nagelopen met de hand.

```gherkin
Scenario: Een beheerder komt op de leidersschermen
  Gegeven dat aap de rol speler heeft en het beheerdersrecht
  Als hij de leidersschermen opent, ook de afbeelding van een opstelling
  Dan komt hij erop
  En ziet hij in de navigatie wat een leider ziet
```

Nagelopen met de hand.

```gherkin
Scenario: Het recht is nergens in de app te zetten
  Gegeven een leider in het spelersoverzicht
  Als hij de rij van een speler openklapt
  Dan staat er geen vakje of knop voor het beheerdersrecht
```

Nagelopen met de hand.

De twee scenario's hieronder zijn schermen, en deze repository test geen
schermen. Ze zijn met de hand nagelopen op een lege lokale database; staat er
ooit wel een schermtest, dan horen ze daar thuis.

```gherkin
Scenario: Zonder mail wijst het inlogscherm naar de leider
  Gegeven dat er niet gemaild kan worden
  Als noot op "Wachtwoord vergeten?" tikt
  Dan leest hij dat zijn leider een herstellink voor hem kan klaarzetten
  En krijgt hij geen formulier dat toch niets oplevert
```

Nagelopen met de hand.

```gherkin
Scenario: Google op een wachtwoordaccount loopt niet dood in het Engels
  Gegeven dat wim hier een account met een wachtwoord heeft
  Als hij met Google onder datzelfde adres probeert binnen te komen
  Dan leest hij "Je hebt hier een wachtwoord" met de weg terug
  En niet de Engelse foutpagina van Better Auth
```

Nagelopen met de hand.
