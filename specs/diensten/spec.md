# Feature: diensten

Deze spec is nog niet af. Hij bevat op dit moment één guardrail, die anders
nergens zou staan. De rest van het domein wordt beschreven zodra een issue het
raakt.

## Contract

### Wat nooit mag breken

Het verdelen van diensten kent geen beschikbaarheidsgegevens als invoer. Wie
niet traint, niet speelt of geblesseerd is kan nog steeds rijden en materiaal
doen — meedoen op het veld is iets anders dan een taak eromheen.

Wat dit vandaag waarmaakt is de vorm van de code: `koppelRooster` in
`lib/domein/dienstrooster.ts` krijgt geen afwezigheidsgegevens binnen en kán er
dus niet op filteren. Dat is een sterke garantie, maar het is er een die je
per ongeluk kunt weggeven door er een parameter bij te zetten. Doe dat niet.
