import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Wie er op een dag bij hoort wordt op één plek bepaald: selectieVoor. Voert
 * een bestand de kale spelerslijst aan actueleStand, dan tellen langdurig
 * afwezigen mee. Dat is stil: elk scherm blijft werken, alleen de telling
 * klopt niet. Vandaar deze test in plaats van een regel in AGENTS.md.
 */

/** Het bestand dat actueleStand definieert noemt hem uiteraard zelf. */
const EIGENAAR = join('lib', 'domein', 'aanwezigheid.ts')

function bestandenOnder(map: string): string[] {
  const uit: string[] = []
  for (const item of readdirSync(map, { withFileTypes: true })) {
    const pad = join(map, item.name)
    if (item.isDirectory()) uit.push(...bestandenOnder(pad))
    else if (pad.endsWith('.ts') || pad.endsWith('.tsx')) uit.push(pad)
  }
  return uit
}

/** Haalt de geïmporteerde namen uit een import-statement. */
function leesPakketNamen(regel: string): string[] {
  const match = regel.match(/import\s*\{([^}]*)\}\s*from/)
  if (!match) return []
  return match[1]
    .split(',')
    .map((n) => n.trim())
    .filter((n) => n.length > 0)
}

describe('de naad blijft op één plek', () => {
  it('laat geen bestand actueleStand gebruiken zonder selectieVoor', () => {
    const wortel = process.cwd()
    const overtredingen: string[] = []

    for (const pad of [
      ...bestandenOnder(join(wortel, 'app')),
      ...bestandenOnder(join(wortel, 'lib')),
    ]) {
      if (pad.endsWith(EIGENAAR)) continue

      const inhoud = readFileSync(pad, 'utf8')
      let importeertActueleStand = false
      let importeertSelectieVoor = false

      for (const regel of inhoud.split('\n')) {
        const namen = leesPakketNamen(regel)
        if (namen.some((n) => n === 'actueleStand')) importeertActueleStand = true
        if (namen.some((n) => n === 'selectieVoor')) importeertSelectieVoor = true
      }

      if (importeertActueleStand && !importeertSelectieVoor) {
        overtredingen.push(pad.slice(wortel.length + 1).replaceAll('\\', '/'))
      }
    }

    expect(overtredingen).toEqual([])
  })
})
