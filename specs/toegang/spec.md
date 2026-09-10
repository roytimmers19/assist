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
  - De identiteit komt uit de sessie. Een id uit het verzoek is geen identiteit.
  - Een uitnodiging koppelt op de token. Wie met Google onder een ander adres
    binnenkomt hoort nog steeds bij de speler die is uitgenodigd.
  - Better Auth beheert wachtwoorden en hersteltokens. Deze code verzint er
    geen eigen naast.
  - Alles wat een speler leest staat er in het Nederlands, ook wat Better Auth
    zelf zou tonen.

## Contract

### Wanneer is het af

- [ ] Een speler met een wachtwoordaccount kiest een nieuw wachtwoord zonder
      dat iemand de database opent — via een link per mail, of via een link die
      zijn leider voor hem klaarzet en doorstuurt.
- [ ] Op `/inloggen` staat "Wachtwoord vergeten?", en die wijst ook de weg
      wanneer er geen mail verstuurd kan worden.
- [ ] Wie met Google binnenkomt op een adres dat hier een wachtwoordaccount
      heeft, leest in het Nederlands wat er aan de hand is en wat hij kan doen.
      Vandaag eindigt hij op de Engelse foutpagina van Better Auth met de code
      `account_not_linked`.
- [ ] De herstelweg werkt zonder Resend. Komt er later een afzenderdomein, dan
      verstuurt dezelfde weg de link per mail zonder dat de knop van de leider
      verdwijnt.

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

### Scenario's

```gherkin
Scenario: De speler vraagt zelf een nieuw wachtwoord aan
  Gegeven dat er gemaild kan worden
  En dat aap hier een account met een wachtwoord heeft
  Als hij op het inlogscherm om een herstellink vraagt
  Dan krijgt hij een mail met een link
  En kiest hij daarmee een nieuw wachtwoord
```

Bewezen door: `tests/db/herstel.test.ts`

```gherkin
Scenario: Zonder mail wijst het inlogscherm naar de leider
  Gegeven dat er niet gemaild kan worden
  Als noot op het inlogscherm om een herstellink vraagt
  Dan leest hij dat zijn leider er een voor hem kan klaarzetten
  En blijft het formulier zelf achterwege
```

Bewezen door: `tests/db/herstel.test.ts`

```gherkin
Scenario: De leider zet een herstellink klaar
  Gegeven dat mies hier een account met een wachtwoord heeft
  Als de leider bij haar om een herstellink vraagt
  Dan krijgt hij een link die hij kan kopiëren en doorsturen
  En kiest mies daarmee een nieuw wachtwoord
```

Bewezen door: `tests/db/herstel.test.ts`

```gherkin
Scenario: Het formulier verraadt niet wie er in de ploeg zit
  Gegeven dat er gemaild kan worden
  Als iemand een adres invult dat hier niet bestaat
  Dan leest hij hetzelfde antwoord als wanneer het wel had bestaan
```

Bewezen door: `tests/db/herstel.test.ts`

```gherkin
Scenario: Google op een wachtwoordaccount loopt niet dood in het Engels
  Gegeven dat wim hier een account met een wachtwoord heeft
  Als hij met Google onder datzelfde adres probeert binnen te komen
  Dan leest hij in het Nederlands dat hij hier een wachtwoord heeft
  En kan hij daar meteen om een herstellink vragen
```

Bewezen door: `tests/db/herstel.test.ts`
