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

### Bouw

- **Bestanden:** `lib/auth/auth.ts` (Better Auth-configuratie),
  `lib/auth/sessie.ts` (identiteit wordt rechten), `lib/auth/uitnodiging.ts`
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
    uitnodigingen, dus hij beheert die accounts toch al.

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
