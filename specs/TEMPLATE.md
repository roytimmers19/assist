# Feature: <naam van het domein>

## Blueprint

### Waarom dit bestaat

Eén of twee alinea's: welk probleem lost dit op, voor wie. Geen productbrief.

### Bouw

- **Bestanden:** `lib/domein/<x>.ts` (puur), `lib/db/<x>.ts` (leest en
  schrijft), `app/acties/<x>.ts` (serveractie)
- **Hangt af van:** ...
- **Wordt gebruikt door:** ...
- **Grenzen:** Stel ze positief. "Alle datums worden gerekend in
  `Europe/Amsterdam`" — niet "gebruik geen UTC".

## Contract

### Wanneer is het af

- [ ] Waarneembaar en na te meten. "Het weekoverzicht toont de stand binnen
      één laadbeurt" kun je controleren; "werkt goed" niet.

### Wat nooit mag breken

- Invarianten die elke latere wijziging overleven.

### Scenario's

Scenario's zijn geen draaiende tests — vitest kent geen Gherkin. Ze zeggen in
productaal wat goed is; een test bewijst het. Noem bij elk scenario de test
die erbij hoort.

```gherkin
Scenario: <beschrijvende naam>
  Gegeven <de toestand vooraf>
  En <nog een voorwaarde>
  Als <wat er gebeurt>
  Dan <wat je moet zien>
```

Bewezen door: `tests/domein/<x>.test.ts`
